/**
 * Study space share links (table study_shares, migrations/0025): a read-only
 * copy of one deck or quiz behind a random, unguessable token.
 *
 *  - Making or updating a link needs Midnry Pass (or an admin). The caller
 *    decides `canShare` on the server from the verified account; the client is
 *    never trusted for it.
 *  - Opening a link needs a signed-in viewer, nothing else. It returns the
 *    copy only: never the owner's id, name or email.
 *  - Only the owner can list or turn off their links; every query is scoped by
 *    the owner's verified id. Turning a link off deletes its row.
 *  - A closed account's links stop opening straight away; the purge deletes
 *    them with the account (src/lib/retention.ts).
 *
 * Kept free of server-function wiring so scripts/study.test.mjs can run it
 * against PGLite with the real migrations.
 */
import type { SqlQuery } from "@/lib/app-docs.server";
import { MAX_SHARES, SHARE_MAX_CHARS, cleanShared, isShareToken, newShareToken, type ShareKind, type SharedItem } from "@/lib/study";

export type ShareInfo = { token: string; kind: ShareKind; itemId: string; title: string; createdAt: string; updatedAt: string };

export type CreateShareResult =
  | { ok: true; token: string; updated: boolean }
  | { ok: false; error: "pass" | "limit" | "too_large" | "invalid"; message: string };

export type OpenShareResult =
  | { ok: true; shared: SharedItem; mine: boolean }
  | { ok: false; error: "sign-in" | "not-found" };

const PASS_MESSAGE = "Sharing a deck or quiz needs Midnry Pass.";

/**
 * Makes a link for one of your decks or quizzes, or, when that item already
 * has a link, updates the copy behind it (the link stays the same).
 */
export async function createShare(
  sql: SqlQuery,
  ownerId: string,
  canShare: boolean,
  kind: unknown,
  item: unknown,
  makeToken: () => string = newShareToken,
): Promise<CreateShareResult> {
  if (!ownerId) throw new Error("Sign in first");
  if (!canShare) return { ok: false, error: "pass", message: PASS_MESSAGE };
  let shared: SharedItem;
  try {
    shared = cleanShared(kind, item);
  } catch (error) {
    return { ok: false, error: "invalid", message: error instanceof Error ? error.message : "Nothing to share." };
  }
  const payload = JSON.stringify(shared.item);
  if (payload.length > SHARE_MAX_CHARS) return { ok: false, error: "too_large", message: "This is too large to share. Split it into smaller sets." };

  const updated = await sql.query<{ token: string }>(
    `update study_shares set title = $4, payload = $5, updated_at = now()
      where owner_id = $1 and kind = $2 and item_id = $3
      returning token`,
    [ownerId, shared.kind, shared.item.id, shared.item.title, payload],
  );
  if (updated[0]) return { ok: true, token: updated[0].token, updated: true };

  const count = await sql.query<{ n: number }>(`select count(*)::int as n from study_shares where owner_id = $1`, [ownerId]);
  if (Number(count[0]?.n ?? 0) >= MAX_SHARES) {
    return { ok: false, error: "limit", message: `You have ${MAX_SHARES} share links. Turn one off to make another.` };
  }
  const token = makeToken();
  if (!isShareToken(token)) throw new Error("Bad share token");
  const inserted = await sql.query<{ token: string }>(
    `insert into study_shares (token, owner_id, kind, item_id, title, payload)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (owner_id, kind, item_id) do update set title = excluded.title, payload = excluded.payload, updated_at = now()
     returning token`,
    [token, ownerId, shared.kind, shared.item.id, shared.item.title, payload],
  );
  return { ok: true, token: inserted[0].token, updated: inserted[0].token !== token };
}

/** Your own links, newest first. */
export async function listShares(sql: SqlQuery, ownerId: string): Promise<ShareInfo[]> {
  const rows = await sql.query<{ token: string; kind: string; item_id: string; title: string; created_at: unknown; updated_at: unknown }>(
    `select token, kind, item_id, title, created_at, updated_at from study_shares where owner_id = $1 order by created_at desc, token`,
    [ownerId],
  );
  const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : String(value ?? ""));
  return rows.map((row) => ({
    token: row.token,
    kind: row.kind === "quiz" ? "quiz" : "deck",
    itemId: row.item_id,
    title: row.title,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }));
}

/** Turns one of your links off. False when it isn't yours or is already off. */
export async function revokeShare(sql: SqlQuery, ownerId: string, token: unknown): Promise<boolean> {
  if (!ownerId || !isShareToken(token)) return false;
  const rows = await sql.query<{ token: string }>(`delete from study_shares where token = $1 and owner_id = $2 returning token`, [token, ownerId]);
  return rows.length > 0;
}

/** Opens a link for a signed-in viewer. */
export async function openShare(sql: SqlQuery, viewerId: string | null | undefined, token: unknown): Promise<OpenShareResult> {
  if (!viewerId) return { ok: false, error: "sign-in" };
  if (!isShareToken(token)) return { ok: false, error: "not-found" };
  const rows = await sql.query<{ kind: string; payload: string; owner_id: string }>(
    `select s.kind, s.payload, s.owner_id from study_shares s
      where s.token = $1
        and not exists (select 1 from account_closure c where c.user_id = s.owner_id)`,
    [token],
  );
  const row = rows[0];
  if (!row) return { ok: false, error: "not-found" };
  try {
    return { ok: true, shared: cleanShared(row.kind, JSON.parse(row.payload)), mine: row.owner_id === viewerId };
  } catch {
    return { ok: false, error: "not-found" };
  }
}
