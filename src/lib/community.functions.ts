import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getApp, isGenre, type GenreId } from "@/lib/catalog";
import { passIsOpen, PASS_PRICE_CENTS } from "@/lib/access";
import { cutCents, MAX_APPS_PER_OWNER, MAX_HTML_CHARS, poolCents } from "@/lib/revenue";

export type PublishedApp = {
  slug: string;
  name: string;
  blurb: string;
  genre: GenreId;
};

export type MineApp = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  genre: GenreId;
  html: string;
  draftStatus: "pending" | "rejected" | "clean";
  reviewNote: string | null;
  live: boolean;
};

export type PendingApp = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  genre: GenreId;
  live: boolean;
  ownerName: string;
  ownerEmail: string;
  updatedAt: string;
};

export type OpenResult =
  | { state: "missing" }
  | { state: "locked"; name: string; blurb: string }
  | {
      state: "ready";
      name: string;
      blurb: string;
      genre: GenreId;
      html: string;
      unpublished: boolean;
      pendingUpdate: boolean;
    };

type SubmissionRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  blurb: string;
  genre: string;
  html: string;
  draft_status: string;
  review_note: string | null;
  published_name: string | null;
  published_blurb: string | null;
  published_genre: string | null;
  published_html: string | null;
};

function asIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function asStatus(value: string): MineApp["draftStatus"] {
  if (value === "rejected" || value === "clean") return value;
  return "pending";
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readIsAdmin(userId: string): Promise<boolean> {
  const sql = await getSql();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    const users = await sql<{ email: string | null }>`select email from "user" where id = ${userId}`;
    if (users[0]?.email?.trim().toLowerCase() === adminEmail) return true;
  }
  const seat = await sql<{ user_id: string }>`select user_id from admin_seat where id = 1`;
  if (seat[0]?.user_id === userId) return true;
  if (seat[0]) return false;
  await sql`
    insert into admin_seat (id, user_id)
    select 1, ${userId}
    where not exists (select 1 from admin_seat)
      and exists (
        select 1 from "account"
        where "userId" = ${userId} and "providerId" = 'grok-gate'
      )
  `;
  const next = await sql<{ user_id: string }>`select user_id from admin_seat where id = 1`;
  return next[0]?.user_id === userId;
}

async function requireAdmin(userId: string): Promise<void> {
  if (!(await readIsAdmin(userId))) throw new Error("Only the admin can do that.");
}

async function viewerHasPass(userId: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{
    status: string;
    current_period_end: unknown;
    paystack_subscription_code: string | null;
    paystack_reference: string | null;
  }>`
    select status, current_period_end, paystack_subscription_code, paystack_reference
    from subscriptions
    where user_id = ${userId}
  `;
  const row = rows[0];
  if (!row?.paystack_subscription_code && !row?.paystack_reference) return false;
  return passIsOpen(row.status, asIso(row.current_period_end));
}

function slugBase(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return base.length >= 3 ? base : "app";
}

async function uniqueSlug(name: string): Promise<string> {
  const sql = await getSql();
  let candidate = slugBase(name);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const takenCatalog = Boolean(getApp(candidate));
    const taken = await sql<{ slug: string }>`select slug from submissions where slug = ${candidate}`;
    if (!takenCatalog && !taken[0]) return candidate;
    candidate = `${slugBase(name)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw new Error("Could not name this app. Try a different title.");
}

function parseDraft(input: unknown): { id?: string; name: string; blurb: string; genre: GenreId; html: string } {
  if (!input || typeof input !== "object") throw new Error("Invalid app");
  const raw = input as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const blurb = typeof raw.blurb === "string" ? raw.blurb.trim() : "";
  const genre = typeof raw.genre === "string" ? raw.genre : "";
  const html = typeof raw.html === "string" ? raw.html : "";
  const id = typeof raw.id === "string" ? raw.id : undefined;
  if (name.length < 2 || name.length > 48) throw new Error("Give it a name, 2–48 characters.");
  if (blurb.length < 8 || blurb.length > 200) throw new Error("Add a one-sentence description.");
  if (!isGenre(genre)) throw new Error("Pick a genre.");
  if (html.trim().length < 16 || html.length > MAX_HTML_CHARS) {
    throw new Error("Upload one HTML file, under 80KB.");
  }
  if (!html.includes("<") || html.includes("\0")) throw new Error("That file does not look like HTML.");
  if (id && !/^[0-9a-f-]{16,40}$/i.test(id)) throw new Error("Unknown app.");
  return { id, name, blurb, genre, html };
}

export const getRole = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return { isAdmin: await readIsAdmin(context.userId) };
  });

export const listPublished = createServerFn({ method: "GET" }).handler(async (): Promise<PublishedApp[]> => {
  const sql = await getSql();
  const rows = await sql<{ slug: string; name: string; blurb: string; genre: string }>`
    select slug, published_name as name, published_blurb as blurb, published_genre as genre
    from submissions
    where published_html is not null
    order by published_name
  `;
  return rows.filter((row): row is PublishedApp => isGenre(row.genre));
});

export const peekApp = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    if (typeof slug !== "string" || slug.length > 64) throw new Error("Unknown app");
    return slug;
  })
  .handler(async ({ data: slug }): Promise<PublishedApp | null> => {
    const sql = await getSql();
    const rows = await sql<{ slug: string; name: string; blurb: string; genre: string }>`
      select slug, published_name as name, published_blurb as blurb, published_genre as genre
      from submissions
      where slug = ${slug} and published_html is not null
    `;
    const row = rows[0];
    if (!row || !isGenre(row.genre)) return null;
    return { slug: row.slug, name: row.name, blurb: row.blurb, genre: row.genre };
  });

export const openApp = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    if (typeof slug !== "string" || slug.length > 64) throw new Error("Unknown app");
    return slug;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: slug }): Promise<OpenResult> => {
    const sql = await getSql();
    const rows = await sql<SubmissionRow>`
      select id, owner_id, slug, name, blurb, genre, html, draft_status, review_note,
             published_name, published_blurb, published_genre, published_html
      from submissions
      where slug = ${slug}
    `;
    const row = rows[0];
    if (!row) return { state: "missing" };
    const isOwner = row.owner_id === context.userId;
    const isAdmin = await readIsAdmin(context.userId);
    const published = Boolean(row.published_html && row.published_name && isGenre(row.published_genre ?? ""));
    if (!published && !isOwner && !isAdmin) return { state: "missing" };
    if (published && !isOwner && !isAdmin) {
      if (!(await viewerHasPass(context.userId))) {
        return { state: "locked", name: row.published_name ?? row.name, blurb: row.published_blurb ?? row.blurb };
      }
      await sql`
        insert into app_uses (app_id, user_id, used_on)
        values (${row.id}, ${context.userId}, ${todayUTC()})
        on conflict do nothing
      `;
      return {
        state: "ready",
        name: row.published_name ?? row.name,
        blurb: row.published_blurb ?? row.blurb,
        genre: row.published_genre as GenreId,
        html: row.published_html ?? "",
        unpublished: false,
        pendingUpdate: false,
      };
    }
    const showDraft = !published || (isOwner && row.draft_status === "pending");
    const rawGenre = showDraft ? row.genre : (row.published_genre ?? "");
    if (!isGenre(rawGenre)) return { state: "missing" };
    return {
      state: "ready",
      name: showDraft ? row.name : (row.published_name ?? row.name),
      blurb: showDraft ? row.blurb : (row.published_blurb ?? row.blurb),
      genre: rawGenre,
      html: showDraft ? row.html : (row.published_html ?? ""),
      unpublished: !published,
      pendingUpdate: published && isOwner && row.draft_status === "pending",
    };
  });

export const listMine = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MineApp[]> => {
    const sql = await getSql();
    const rows = await sql<SubmissionRow>`
      select id, owner_id, slug, name, blurb, genre, html, draft_status, review_note,
             published_name, published_blurb, published_genre, published_html
      from submissions
      where owner_id = ${context.userId}
      order by updated_at desc
    `;
    return rows
      .filter((row) => isGenre(row.genre))
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        blurb: row.blurb,
        genre: row.genre as GenreId,
        html: row.html,
        draftStatus: asStatus(row.draft_status),
        reviewNote: row.review_note,
        live: Boolean(row.published_html),
      }));
  });

export const saveSubmission = createServerFn({ method: "POST" })
  .validator(parseDraft)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.id) {
      const rows = await sql<{ id: string }>`
        select id from submissions where id = ${data.id} and owner_id = ${context.userId}
      `;
      if (!rows[0]) return { ok: false as const, error: "That app is not yours." };
      await sql`
        update submissions
        set name = ${data.name},
            blurb = ${data.blurb},
            genre = ${data.genre},
            html = ${data.html},
            draft_status = 'pending',
            review_note = null,
            updated_at = now()
        where id = ${data.id} and owner_id = ${context.userId}
      `;
      return { ok: true as const, id: data.id };
    }
    const countRows = await sql<{ n: number }>`
      select count(*) as n from submissions where owner_id = ${context.userId}
    `;
    if (Number(countRows[0]?.n ?? 0) >= MAX_APPS_PER_OWNER) {
      return { ok: false as const, error: "Twelve apps is the limit." };
    }
    const id = crypto.randomUUID();
    const slug = await uniqueSlug(data.name);
    await sql`
      insert into submissions (id, owner_id, slug, name, blurb, genre, html, draft_status, updated_at)
      values (${id}, ${context.userId}, ${slug}, ${data.name}, ${data.blurb}, ${data.genre}, ${data.html}, 'pending', now())
    `;
    return { ok: true as const, id };
  });

const ADMIN_APP_LIMIT = 40;

export const publishOwnApp = createServerFn({ method: "POST" })
  .validator(parseDraft)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    if (data.id) {
      const rows = await sql<{ slug: string }>`
        update submissions
        set name = ${data.name},
            blurb = ${data.blurb},
            genre = ${data.genre},
            html = ${data.html},
            published_name = ${data.name},
            published_blurb = ${data.blurb},
            published_genre = ${data.genre},
            published_html = ${data.html},
            draft_status = 'clean',
            review_note = null,
            updated_at = now()
        where id = ${data.id} and owner_id = ${context.userId}
        returning slug
      `;
      if (!rows[0]) return { ok: false as const, error: "That app is not yours." };
      return { ok: true as const, id: data.id, slug: rows[0].slug };
    }
    const countRows = await sql<{ n: number }>`
      select count(*) as n from submissions where owner_id = ${context.userId}
    `;
    if (Number(countRows[0]?.n ?? 0) >= ADMIN_APP_LIMIT) {
      return { ok: false as const, error: "Forty of your own apps is the limit." };
    }
    const id = crypto.randomUUID();
    const slug = await uniqueSlug(data.name);
    await sql`
      insert into submissions (
        id, owner_id, slug, name, blurb, genre, html, draft_status,
        published_name, published_blurb, published_genre, published_html, updated_at
      ) values (
        ${id}, ${context.userId}, ${slug}, ${data.name}, ${data.blurb}, ${data.genre}, ${data.html}, 'clean',
        ${data.name}, ${data.blurb}, ${data.genre}, ${data.html}, now()
      )
    `;
    return { ok: true as const, id, slug };
  });

export const getEarnings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const subs = await sql<{ n: number }>`
      select count(*) as n from subscriptions
      where status in ('active', 'canceled')
        and current_period_end > now()
        and (paystack_subscription_code is not null or paystack_reference is not null)
    `;
    const activePasses = Number(subs[0]?.n ?? 0);
    const pool = poolCents(activePasses, PASS_PRICE_CENTS);
    const useRows = await sql<{ app_id: string; uses: number }>`
      select u.app_id, count(*) as uses
      from app_uses u
      join submissions s on s.id = u.app_id
      where s.published_html is not null
        and u.used_on >= date_trunc('month', now())::date
      group by u.app_id
    `;
    const totalUses = useRows.reduce((sum, row) => sum + Number(row.uses), 0);
    const mine = await sql<{ id: string; name: string }>`
      select id, coalesce(published_name, name) as name
      from submissions
      where owner_id = ${context.userId} and published_html is not null
      order by published_name
    `;
    const byId = new Map(useRows.map((row) => [row.app_id, Number(row.uses)]));
    const apps = mine.map((app) => {
      const uses = byId.get(app.id) ?? 0;
      return { id: app.id, name: app.name, uses, cents: cutCents(pool, uses, totalUses) };
    });
    return {
      activePasses,
      poolCents: pool,
      totalUses,
      cents: apps.reduce((sum, app) => sum + app.cents, 0),
      apps,
    };
  });

export const listPending = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PendingApp[]> => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      slug: string;
      name: string;
      blurb: string;
      genre: string;
      live: boolean;
      owner_name: string | null;
      owner_email: string | null;
      updated_at: unknown;
    }>`
      select s.id, s.slug, s.name, s.blurb, s.genre,
             (s.published_html is not null) as live,
             u.name as owner_name, u.email as owner_email, s.updated_at
      from submissions s
      left join "user" u on u.id = s.owner_id
      where s.draft_status = 'pending'
      order by s.updated_at asc
    `;
    return rows
      .filter((row) => isGenre(row.genre))
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        blurb: row.blurb,
        genre: row.genre as GenreId,
      live: row.live === true,
        ownerName: row.owner_name || "Member",
        ownerEmail: row.owner_email || "",
        updatedAt: asIso(row.updated_at) ?? "",
      }));
  });

export const loadDraft = createServerFn({ method: "GET" })
  .validator((id: string) => {
    if (typeof id !== "string" || !/^[0-9a-f-]{16,40}$/i.test(id)) throw new Error("Unknown app");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{ name: string; html: string }>`
      select name, html from submissions where id = ${id}
    `;
    const row = rows[0];
    if (!row) return null;
    return { name: row.name, html: row.html };
  });

export const decideSubmission = createServerFn({ method: "POST" })
  .validator((input: { id: string; decision: "approve" | "reject"; note?: string }) => {
    if (!input || typeof input.id !== "string" || !/^[0-9a-f-]{16,40}$/i.test(input.id)) {
      throw new Error("Unknown app");
    }
    if (input.decision !== "approve" && input.decision !== "reject") throw new Error("Unknown decision");
    const note = typeof input.note === "string" ? input.note.trim().slice(0, 280) : "";
    return { id: input.id, decision: input.decision, note };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    if (data.decision === "approve") {
      const rows = await sql<{ id: string }>`
        update submissions
        set published_name = name,
            published_blurb = blurb,
            published_genre = genre,
            published_html = html,
            draft_status = 'clean',
            review_note = null,
            updated_at = now()
        where id = ${data.id} and draft_status = 'pending'
        returning id
      `;
      if (!rows[0]) return { ok: false as const, error: "Nothing is waiting on that app." };
      return { ok: true as const };
    }
    const rows = await sql<{ id: string }>`
      update submissions
      set draft_status = 'rejected',
          review_note = ${data.note || "Not ready for the desk."},
          updated_at = now()
      where id = ${data.id} and draft_status = 'pending'
      returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "Nothing is waiting on that app." };
    return { ok: true as const };
  });
