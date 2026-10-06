import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { getApp } from "@/lib/catalog";
import { readIsAdmin } from "@/lib/community.functions";

/** Slugs counted in usage that are not desk apps. */
const EXTRA_SLUGS: Record<string, string> = { "abuja-hustle": "Abuja Hustle (game)" };

export const recordUse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((slug: string) => {
    if (typeof slug !== "string" || !(getApp(slug) || EXTRA_SLUGS[slug])) throw new Error("Unknown app");
    return slug;
  })
  .handler(async ({ context, data: slug }) => {
    const sql = await getSql();
    const today = new Date().toISOString().slice(0, 10);
    await sql`
      insert into catalog_uses (slug, user_id, used_on)
      values (${slug}, ${context.userId}, ${today})
      on conflict do nothing
    `;
    return { ok: true as const };
  });

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  joined: string;
  signIn: string;
  lastActive: string | null;
  appsUsed: number;
  hasPass: boolean;
};

export type AdminApp = { slug: string; name: string; users: number; opens: number };

export type AdminStats = {
  totals: { users: number; new7: number; new30: number; active7: number; active30: number; passes: number };
  signups: { day: string; count: number }[];
  users: AdminUser[];
  apps30: AdminApp[];
  appsAll: AdminApp[];
};

function signInLabel(providers: string | null): string {
  const list = (providers ?? "").split(",").filter(Boolean);
  const labels = list.map((id) =>
    /google/.test(id) ? "Google" : id === "credential" ? "Email" : /x$|twitter/.test(id) ? "X" : id.startsWith("grok") ? "Grok" : id,
  );
  return [...new Set(labels)].join(", ") || "Email";
}

function appName(slug: string): string {
  return getApp(slug)?.name ?? EXTRA_SLUGS[slug] ?? slug;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

export const adminStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminStats> => {
    if (!(await readIsAdmin(context.userId))) throw new Error("Only the admin can see stats.");
    const sql = await getSql();

    const users = await sql<{
      id: string;
      name: string;
      email: string;
      created: unknown;
      providers: string | null;
      last_active: unknown;
      apps_used: number | string;
      status: string | null;
      period_end: unknown;
    }>`
      select
        u.id, u.name, u.email, u."createdAt" as created,
        (select string_agg(distinct a."providerId", ',') from "account" a where a."userId" = u.id) as providers,
        (select max(c.used_on) from catalog_uses c where c.user_id = u.id) as last_active,
        (select count(distinct c.slug) from catalog_uses c where c.user_id = u.id) as apps_used,
        s.status, s.current_period_end as period_end
      from "user" u
      left join subscriptions s on s.user_id = u.id
      order by u."createdAt" desc
      limit 5000
    `;

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const list: AdminUser[] = users.map((row) => {
      const end = row.period_end ? Date.parse(iso(row.period_end)) : 0;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        joined: iso(row.created),
        signIn: signInLabel(row.providers),
        lastActive: row.last_active ? iso(row.last_active).slice(0, 10) : null,
        appsUsed: Number(row.apps_used ?? 0),
        hasPass: (row.status === "active" || row.status === "canceled") && end > now,
      };
    });

    const since = (days: number) => new Date(now - days * day).toISOString().slice(0, 10);
    const active = await sql<{ d7: number | string; d30: number | string }>`
      select
        count(distinct case when used_on >= ${since(7)} then user_id end) as d7,
        count(distinct case when used_on >= ${since(30)} then user_id end) as d30
      from catalog_uses
    `;

    const top = async (from: string | null) => {
      const rows = from
        ? await sql<{ slug: string; users: number | string; opens: number | string }>`
            select slug, count(distinct user_id) as users, count(*) as opens
            from catalog_uses where used_on >= ${from}
            group by slug order by count(distinct user_id) desc, count(*) desc limit 25
          `
        : await sql<{ slug: string; users: number | string; opens: number | string }>`
            select slug, count(distinct user_id) as users, count(*) as opens
            from catalog_uses
            group by slug order by count(distinct user_id) desc, count(*) desc limit 25
          `;
      return rows.map((row) => ({ slug: row.slug, name: appName(row.slug), users: Number(row.users), opens: Number(row.opens) }));
    };

    // Sign-ups per day for the last 30 days, with empty days filled in.
    const counts = new Map<string, number>();
    for (const user of list) {
      const key = user.joined.slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const signups = Array.from({ length: 30 }, (_, index) => {
      const key = new Date(now - (29 - index) * day).toISOString().slice(0, 10);
      return { day: key, count: counts.get(key) ?? 0 };
    });

    const joinedWithin = (days: number) => list.filter((user) => Date.parse(user.joined) >= now - days * day).length;
    return {
      totals: {
        users: list.length,
        new7: joinedWithin(7),
        new30: joinedWithin(30),
        active7: Number(active[0]?.d7 ?? 0),
        active30: Number(active[0]?.d30 ?? 0),
        passes: list.filter((user) => user.hasPass).length,
      },
      signups,
      users: list,
      apps30: await top(since(30)),
      appsAll: await top(null),
    };
  });
