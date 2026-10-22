/**
 * Writing studio storage: drafts (table writing_drafts, one row per draft)
 * and the studio's settings document (app_documents, app id "write").
 *
 * Takes the SQL runner as an argument (no import of "@/lib/db") so
 * scripts/studio.test.mjs runs the same statements against PGLite with the
 * real migrations. The old writing apps' documents are only ever read here.
 */
import { readDoc, writeDoc, type SqlQuery } from "@/lib/app-docs.server";
import {
  MODE_SLUGS,
  STUDIO_SLUG,
  draftTitle,
  parseDraft,
  parseSettings,
  planImport,
  type Draft,
  type DraftSummary,
  type StudioSettings,
} from "@/lib/studio";

type Row = { id: string; mode: string; title: string; payload: string; revision: number; updated_at: string | Date };

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function summary(row: Omit<Row, "payload"> & { by?: string | null }): DraftSummary {
  return {
    id: row.id,
    mode: row.mode,
    title: row.title,
    by: row.by === "ai" || row.by === "quick" ? row.by : null,
    updatedAt: iso(row.updated_at),
    revision: Number(row.revision) || 0,
  };
}

/** Every draft's list row, newest first. */
export async function draftIndex(sql: SqlQuery, userId: string): Promise<DraftSummary[]> {
  const rows = await sql.query<Omit<Row, "payload"> & { by: string | null }>(
    `select id, mode, title, revision, updated_at, (payload::json ->> 'by') as by
     from writing_drafts where user_id = $1 order by updated_at desc, id`,
    [userId],
  );
  return rows.map(summary);
}

export async function countDrafts(sql: SqlQuery, userId: string, mode: string): Promise<number> {
  const rows = await sql.query<{ n: number }>(`select count(*)::int as n from writing_drafts where user_id = $1 and mode = $2`, [userId, mode]);
  return Number(rows[0]?.n ?? 0);
}

export async function readDraft(sql: SqlQuery, userId: string, id: string): Promise<{ draft: Draft; revision: number } | null> {
  const rows = await sql.query<Row>(`select id, mode, title, payload, revision, updated_at from writing_drafts where user_id = $1 and id = $2`, [userId, id]);
  const row = rows[0];
  if (!row) return null;
  return { draft: parseDraft(row.payload, { id: row.id, mode: row.mode, updatedAt: iso(row.updated_at) }), revision: Number(row.revision) || 0 };
}

export type SaveDraftResult =
  | { ok: true; revision: number; summary: DraftSummary }
  | { ok: false; error: "full"; cap: number; count: number }
  | { ok: false; error: "conflict"; revision: number }
  | { ok: false; error: "gone" };

/**
 * Saves one draft. A new draft (no row yet, baseRevision 0) is refused when
 * its mode already holds `cap` drafts: nothing is ever dropped to make room.
 * An existing draft is written only if it is still at `baseRevision`.
 */
export async function saveDraft(sql: SqlQuery, userId: string, draft: Draft, opts: { cap: number; baseRevision: number }): Promise<SaveDraftResult> {
  const title = draftTitle(draft);
  const payload = JSON.stringify(draft);
  const now = new Date().toISOString();
  if (opts.baseRevision === 0) {
    const existing = await sql.query<{ revision: number }>(`select revision from writing_drafts where user_id = $1 and id = $2`, [userId, draft.id]);
    if (existing[0]) return { ok: false, error: "conflict", revision: Number(existing[0].revision) };
    const count = await countDrafts(sql, userId, draft.mode);
    if (count >= opts.cap) return { ok: false, error: "full", cap: opts.cap, count };
    const inserted = await sql.query<{ revision: number }>(
      `insert into writing_drafts (user_id, id, mode, title, payload, revision, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 1, $6, $6)
       on conflict (user_id, id) do nothing
       returning revision`,
      [userId, draft.id, draft.mode, title, payload, now],
    );
    if (!inserted[0]) {
      const current = await sql.query<{ revision: number }>(`select revision from writing_drafts where user_id = $1 and id = $2`, [userId, draft.id]);
      return { ok: false, error: "conflict", revision: Number(current[0]?.revision ?? 0) };
    }
    return { ok: true, revision: 1, summary: summary({ id: draft.id, mode: draft.mode, title, revision: 1, updated_at: now, by: draft.by }) };
  }
  const updated = await sql.query<{ revision: number }>(
    `update writing_drafts set title = $3, payload = $4, revision = revision + 1, updated_at = $6
     where user_id = $1 and id = $2 and revision = $5 and mode = $7
     returning revision`,
    [userId, draft.id, title, payload, opts.baseRevision, now, draft.mode],
  );
  if (updated[0]) {
    const revision = Number(updated[0].revision);
    return { ok: true, revision, summary: summary({ id: draft.id, mode: draft.mode, title, revision, updated_at: now, by: draft.by }) };
  }
  const current = await sql.query<{ revision: number }>(`select revision from writing_drafts where user_id = $1 and id = $2`, [userId, draft.id]);
  if (!current[0]) return { ok: false, error: "gone" };
  return { ok: false, error: "conflict", revision: Number(current[0].revision) };
}

export async function deleteDraft(sql: SqlQuery, userId: string, id: string): Promise<boolean> {
  const rows = await sql.query<{ id: string }>(`delete from writing_drafts where user_id = $1 and id = $2 returning id`, [userId, id]);
  return rows.length > 0;
}

export async function readSettings(sql: SqlQuery, userId: string): Promise<{ settings: StudioSettings; revision: number }> {
  const doc = await readDoc(sql, userId, STUDIO_SLUG);
  return { settings: parseSettings(doc.payload), revision: doc.revision };
}

/** Changes the settings with compare-and-set, retrying a few times if another tab saved in between. */
export async function updateSettings(sql: SqlQuery, userId: string, change: (settings: StudioSettings) => StudioSettings): Promise<StudioSettings> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { settings, revision } = await readSettings(sql, userId);
    const next = change(settings);
    const result = await writeDoc(sql, userId, STUDIO_SLUG, JSON.stringify(next), revision);
    if (result.ok) return next;
  }
  throw new Error("Could not save the studio settings. Try again.");
}

/**
 * Brings the old writing apps' saved boxes in, once: each old document with
 * something in it becomes a draft "<Mode> (brought in)". Old documents are
 * read only. A draft copied in before is never added again (fixed id, and
 * the slug is marked in the settings), even if the person deleted it since.
 * Copies are not counted against the history cap: at most one per mode.
 */
export async function importOldDocs(sql: SqlQuery, userId: string, now = new Date().toISOString()): Promise<number> {
  const { settings } = await readSettings(sql, userId);
  const waiting = MODE_SLUGS.filter((slug) => !Object.hasOwn(settings.imported, slug));
  if (waiting.length === 0) return 0;
  const rows = await sql.query<{ app_id: string; payload: string }>(
    `select app_id, payload from app_documents where user_id = $1 and app_id = any($2::text[])`,
    [userId, waiting],
  );
  const payloads: Record<string, string | null> = Object.fromEntries(waiting.map((slug) => [slug, rows.find((row) => row.app_id === slug)?.payload ?? null]));
  const plan = planImport(payloads, settings.imported, now);
  let added = 0;
  for (const draft of plan.drafts) {
    const inserted = await sql.query<{ id: string }>(
      `insert into writing_drafts (user_id, id, mode, title, payload, revision, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 1, $6, $6)
       on conflict (user_id, id) do nothing
       returning id`,
      [userId, draft.id, draft.mode, draftTitle(draft), JSON.stringify(draft), now],
    );
    added += inserted.length;
  }
  await updateSettings(sql, userId, (current) => ({
    ...current,
    imported: { ...current.imported, ...Object.fromEntries(plan.done.map((slug) => [slug, now])) },
    // Shown until the person dismisses it, so a reload (or a second tab) doesn't lose the message.
    notice: current.notice + added,
  }));
  return added;
}
