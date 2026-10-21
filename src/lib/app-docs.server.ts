/**
 * Reading and writing one saved app document (table app_documents), with a
 * revision number for compare-and-set saves.
 *
 * A save may say which revision it was based on (`baseRevision`). It is
 * written only if the stored row is still at that revision; otherwise the save
 * is refused as a conflict and nothing is overwritten. A save without a base
 * revision (an older client) overwrites as before, and still bumps the
 * revision so other tabs notice it.
 *
 * Kept free of server-function wiring so tests can run it against PGLite.
 */

export interface SqlQuery {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export type StoredDoc = { payload: string | null; revision: number };

export type WriteResult = { ok: true; revision: number } | { ok: false; error: "conflict"; revision: number };

export async function readDoc(sql: SqlQuery, userId: string, slug: string): Promise<StoredDoc> {
  const rows = await sql.query<{ payload: string; revision: number }>(
    `select payload, revision from app_documents where user_id = $1 and app_id = $2`,
    [userId, slug],
  );
  if (!rows[0]) return { payload: null, revision: 0 };
  return { payload: rows[0].payload, revision: Number(rows[0].revision) || 0 };
}

export async function writeDoc(
  sql: SqlQuery,
  userId: string,
  slug: string,
  payload: string,
  baseRevision?: number,
): Promise<WriteResult> {
  if (baseRevision === undefined) {
    const rows = await sql.query<{ revision: number }>(
      `insert into app_documents (user_id, app_id, payload, updated_at, revision)
       values ($1, $2, $3, now(), 1)
       on conflict (user_id, app_id) do update
       set payload = excluded.payload, updated_at = now(), revision = app_documents.revision + 1
       returning revision`,
      [userId, slug, payload],
    );
    return { ok: true, revision: Number(rows[0].revision) };
  }
  const updated = await sql.query<{ revision: number }>(
    `update app_documents
     set payload = $3, updated_at = now(), revision = revision + 1
     where user_id = $1 and app_id = $2 and revision = $4
     returning revision`,
    [userId, slug, payload, baseRevision],
  );
  if (updated[0]) return { ok: true, revision: Number(updated[0].revision) };
  if (baseRevision === 0) {
    const inserted = await sql.query<{ revision: number }>(
      `insert into app_documents (user_id, app_id, payload, updated_at, revision)
       values ($1, $2, $3, now(), 1)
       on conflict (user_id, app_id) do nothing
       returning revision`,
      [userId, slug, payload],
    );
    if (inserted[0]) return { ok: true, revision: Number(inserted[0].revision) };
  }
  const current = await readDoc(sql, userId, slug);
  return { ok: false, error: "conflict", revision: current.revision };
}
