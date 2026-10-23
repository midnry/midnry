import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { readAccount } from "@/lib/account.server";
import { readIsAdmin } from "@/lib/community.functions";
import { aiDailyLimit, aiDay } from "@/lib/ai-allowance";
import {
  cleanDraft,
  cleanStyle,
  historyCap,
  studioExtrasOpen,
  EMPTY_STYLE,
  TITLE_MAX,
  PIECE_MAX,
  PIECES_MAX,
  type Allowance,
  type Draft,
  type DraftSummary,
  type HouseStyle,
} from "@/lib/studio";
import type { SaveDraftResult } from "@/lib/studio.server";

/**
 * Writing studio server functions. Every one is for the signed-in person's own
 * drafts only. Pass extras are checked here, on the server, where the data is
 * saved: the history cap (free vs Pass), the house style, and the Word file.
 */

async function who(userId: string) {
  const isAdmin = await readIsAdmin(userId);
  const hasPass = isAdmin || (await readAccount(userId)).hasPass;
  return { isAdmin, hasPass, extras: studioExtrasOpen(hasPass, isAdmin) };
}

async function allowance(userId: string, person: { isAdmin: boolean; hasPass: boolean }): Promise<Allowance> {
  const { aiConfigured } = await import("@/lib/ai-write.server");
  const ai = aiConfigured();
  const limit = aiDailyLimit(process.env, { admin: person.isAdmin, hasPass: person.hasPass });
  if (!ai || limit === null) return { ai, limit, left: limit, hasPass: person.hasPass };
  const sql = await getSql();
  const rows = await sql<{ count: number }>`select count from ai_writes where user_id = ${userId} and used_on = ${aiDay()}`;
  return { ai, limit, left: Math.max(0, limit - Number(rows[0]?.count ?? 0)), hasPass: person.hasPass };
}

export type StudioState = {
  drafts: DraftSummary[];
  /** How many drafts were brought in from the old apps, until the notice is dismissed. */
  broughtIn: number;
  style: HouseStyle;
  soapHistory: boolean;
  hasPass: boolean;
  isAdmin: boolean;
  /** Pass extras open: longer history, Word download, house style. */
  extras: boolean;
  allowance: Allowance;
};

/** Opens the studio: brings old documents in (once), then lists the drafts. */
export const openStudio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<StudioState> => {
    const store = await import("@/lib/studio.server");
    const sql = await getSql();
    await store.importOldDocs(sql, context.userId);
    const [drafts, { settings }, person] = await Promise.all([store.draftIndex(sql, context.userId), store.readSettings(sql, context.userId), who(context.userId)]);
    return {
      drafts,
      broughtIn: settings.notice,
      // The saved style is only sent back while the Pass is open; it stays saved either way.
      style: person.extras ? settings.style : EMPTY_STYLE,
      soapHistory: settings.soapHistory,
      hasPass: person.hasPass,
      isAdmin: person.isAdmin,
      extras: person.extras,
      allowance: await allowance(context.userId, person),
    };
  });

export const studioAllowance = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Allowance> => allowance(context.userId, await who(context.userId)));

const ID = /^[A-Za-z0-9-]{6,64}$/;

export const loadDraft = createServerFn({ method: "GET" })
  .validator((id: string) => {
    if (typeof id !== "string" || !ID.test(id)) throw new Error("Unknown draft");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }): Promise<{ ok: true; draft: Draft; revision: number } | { ok: false }> => {
    const { readDraft } = await import("@/lib/studio.server");
    const found = await readDraft(await getSql(), context.userId, id);
    return found ? { ok: true, ...found } : { ok: false };
  });

export type SaveResult = SaveDraftResult | { ok: false; error: "too_large" | "invalid" };

export const saveDraft = createServerFn({ method: "POST" })
  .validator((input: { draft: unknown; baseRevision: number }) => {
    const base = input?.baseRevision;
    if (typeof base !== "number" || !Number.isInteger(base) || base < 0) throw new Error("Invalid revision");
    // Refuse anything far past one draft's limit before parsing it further.
    if (JSON.stringify(input?.draft ?? null).length > 400_000) throw new Error("Draft is too large");
    return { draft: input.draft, baseRevision: base };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<SaveResult> => {
    const cleaned = cleanDraft(data.draft);
    if (!cleaned.ok) return cleaned;
    const store = await import("@/lib/studio.server");
    const sql = await getSql();
    const [person, { settings }] = await Promise.all([who(context.userId), store.readSettings(sql, context.userId)]);
    const cap = historyCap(cleaned.draft.mode, { hasPass: person.hasPass, isAdmin: person.isAdmin, soapHistory: settings.soapHistory });
    return store.saveDraft(sql, context.userId, { ...cleaned.draft, updatedAt: new Date().toISOString() }, { cap, baseRevision: data.baseRevision });
  });

export const removeDraft = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (typeof id !== "string" || !ID.test(id)) throw new Error("Unknown draft");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const { deleteDraft } = await import("@/lib/studio.server");
    return { ok: await deleteDraft(await getSql(), context.userId, id) };
  });

/** Saves the house style (Pass only), whether SOAP notes keep a history, and dismisses the "brought in" notice. */
export const saveStudioSettings = createServerFn({ method: "POST" })
  .validator((input: { style?: unknown; soapHistory?: unknown; dismissNotice?: unknown }) => ({
    style: input?.style === undefined ? undefined : cleanStyle(input.style),
    soapHistory: typeof input?.soapHistory === "boolean" ? input.soapHistory : undefined,
    dismissNotice: input?.dismissNotice === true,
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ ok: true; style: HouseStyle; soapHistory: boolean } | { ok: false; error: "pass" }> => {
    const person = await who(context.userId);
    if (data.style !== undefined && !person.extras) return { ok: false, error: "pass" };
    const { updateSettings } = await import("@/lib/studio.server");
    const next = await updateSettings(await getSql(), context.userId, (current) => ({
      ...current,
      ...(data.style !== undefined ? { style: data.style } : {}),
      ...(data.soapHistory !== undefined ? { soapHistory: data.soapHistory } : {}),
      ...(data.dismissNotice ? { notice: 0 } : {}),
    }));
    return { ok: true, style: person.extras ? next.style : EMPTY_STYLE, soapHistory: next.soapHistory };
  });

/** A Word (.docx) file of the draft on screen. Pass extra, checked here. */
export const draftDocx = createServerFn({ method: "POST" })
  .validator((input: { title: unknown; pieces: unknown }) => {
    const title = typeof input?.title === "string" ? input.title.slice(0, TITLE_MAX) : "";
    const pieces = Array.isArray(input?.pieces)
      ? input.pieces
          .slice(0, PIECES_MAX)
          .filter((piece): piece is { title: string; text: string } => !!piece && typeof piece.title === "string" && typeof piece.text === "string")
          .map((piece) => ({ title: piece.title.slice(0, 60), text: piece.text.slice(0, PIECE_MAX) }))
      : [];
    return { title, pieces };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ ok: true; base64: string } | { ok: false; error: "pass" | "empty" }> => {
    const person = await who(context.userId);
    if (!person.extras) return { ok: false, error: "pass" };
    if (!data.pieces.some((piece) => piece.text.trim())) return { ok: false, error: "empty" };
    const { buildDocx } = await import("@/lib/studio-docx");
    const bytes = buildDocx({ title: data.title, pieces: data.pieces });
    return { ok: true, base64: Buffer.from(bytes).toString("base64") };
  });
