import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getApp, isGenre, type GenreId } from "@/lib/catalog";

export type SpotApp = {
  slug: string;
  name: string;
  blurb: string;
  genre: GenreId;
  tier: "free" | "pass";
};

export type TrendingApp = SpotApp & { uses: number };

function asSlug(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9-]{3,40}$/.test(value)) {
    throw new Error("Unknown app");
  }
  return value;
}

async function resolveApp(slug: string): Promise<SpotApp | null> {
  const built = getApp(slug);
  if (built) {
    return {
      slug: built.slug,
      name: built.name,
      blurb: built.blurb,
      genre: built.genre,
      tier: built.tier,
    };
  }
  const sql = await getSql();
  const rows = await sql<{ slug: string; name: string; blurb: string; genre: string }>`
    select slug, published_name as name, published_blurb as blurb, published_genre as genre
    from submissions
    where slug = ${slug} and published_html is not null
  `;
  const row = rows[0];
  if (!row || !isGenre(row.genre)) return null;
  return { slug: row.slug, name: row.name, blurb: row.blurb, genre: row.genre, tier: "pass" };
}

export const listTrending = createServerFn({ method: "GET" }).handler(async (): Promise<TrendingApp[]> => {
  const sql = await getSql();
  const rows = await sql<{ slug: string; uses: number }>`
    select slug, sum(uses)::int as uses
    from (
      select slug, count(*) as uses
      from catalog_uses
      where used_on >= current_date - 30
      group by slug
      union all
      select s.slug, count(*) as uses
      from app_uses u
      join submissions s on s.id = u.app_id
      where s.published_html is not null
        and u.used_on >= current_date - 30
      group by s.slug
    ) counted
    group by slug
    order by uses desc, slug
    limit 6
  `;
  const apps: TrendingApp[] = [];
  for (const row of rows) {
    const uses = Number(row.uses);
    if (!Number.isFinite(uses) || uses < 1) continue;
    const app = await resolveApp(row.slug);
    if (app) apps.push({ ...app, uses });
  }
  return apps;
});

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SpotApp[]> => {
    const sql = await getSql();
    const rows = await sql<{ slug: string }>`
      select slug from app_favorites
      where user_id = ${context.userId}
      order by created_at desc
    `;
    const apps: SpotApp[] = [];
    for (const row of rows) {
      const app = await resolveApp(row.slug);
      if (app) apps.push(app);
    }
    return apps;
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .validator(asSlug)
  .middleware([authMiddleware])
  .handler(async ({ context, data: slug }): Promise<{ saved: boolean; app: SpotApp | null }> => {
    const app = await resolveApp(slug);
    if (!app) throw new Error("Unknown app");
    const sql = await getSql();
    const existing = await sql<{ slug: string }>`
      select slug from app_favorites where user_id = ${context.userId} and slug = ${slug}
    `;
    if (existing[0]) {
      await sql`delete from app_favorites where user_id = ${context.userId} and slug = ${slug}`;
      return { saved: false, app };
    }
    await sql`
      insert into app_favorites (user_id, slug)
      values (${context.userId}, ${slug})
      on conflict do nothing
    `;
    return { saved: true, app };
  });
