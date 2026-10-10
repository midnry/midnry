import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

// Abuja Hustle: the feedback button and anonymous play counts. Neither needs
// an account; feedback from a signed-in player is linked to them so we can
// follow up. Play events carry only a random per-device id, never a name.

/** Signed in or not: the user id when there is one. */
const maybeUser = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    assertSameSiteRequest();
    let userId: string | null = null;
    try {
      const { requireUserId } = await import("@/lib/auth/verify.server");
      userId = await requireUserId(context.bearerToken);
    } catch {
      userId = null;
    }
    return next({ context: { userId } });
  });

const clean = (text: unknown, max: number) => String(text ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
const deviceOk = (d: string) => /^[a-z0-9-]{8,64}$/i.test(d);

export const sendFeedback = createServerFn({ method: "POST" })
  .validator((input: { device: string; message: string; context: Record<string, unknown> }) => {
    const device = clean(input?.device, 64);
    const message = clean(input?.message, 2000);
    if (!deviceOk(device) || message.length < 3) throw new Error("Write a little more, then send.");
    const context = JSON.stringify(input?.context ?? {}).slice(0, 4000);
    return { device, message, context };
  })
  .middleware([maybeUser])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const recent = await sql<{ n: number }>`select count(*)::int as n from abuja_feedback where device = ${data.device} and created_at > now() - interval '1 day'`;
    if (Number(recent[0]?.n ?? 0) >= 20) return { ok: false as const };
    await sql`insert into abuja_feedback (user_id, device, message, context) values (${context.userId}, ${data.device}, ${data.message}, ${data.context})`;
    return { ok: true as const };
  });

const KINDS = new Set(["start", "continue", "chapter", "adult_day", "ending", "load"]);
export type PlayEvent = { kind: string; label?: string; num?: number };

export const logPlay = createServerFn({ method: "POST" })
  .validator((input: { device: string; events: PlayEvent[] }) => {
    const device = clean(input?.device, 64);
    if (!deviceOk(device)) throw new Error("Bad device id.");
    const events = (Array.isArray(input?.events) ? input.events : [])
      .slice(0, 30)
      .filter((e) => KINDS.has(String(e?.kind)))
      .map((e) => ({ kind: String(e.kind), label: clean(e.label, 60), num: Number.isFinite(e.num) ? Math.max(-1e9, Math.min(1e9, Number(e.num))) : null }));
    return { device, events };
  })
  .handler(async ({ data }) => {
    if (!data.events.length) return { ok: true as const };
    const sql = await getSql();
    const recent = await sql<{ n: number }>`select count(*)::int as n from abuja_play where device = ${data.device} and created_at > now() - interval '1 day'`;
    if (Number(recent[0]?.n ?? 0) > 600) return { ok: false as const };
    for (const e of data.events) {
      await sql`insert into abuja_play (device, kind, label, num) values (${data.device}, ${e.kind}, ${e.label}, ${e.num})`;
    }
    return { ok: true as const };
  });

export type GameStats = {
  players30: number;
  starts30: number;
  chapters: { label: string; players: number }[];
  adultDays: { label: string; players: number }[];
  endings: { label: string; count: number }[];
  load: { median: number | null; p90: number | null; samples: number };
  feedback: { id: number; message: string; context: string; created: string; user: string | null }[];
};

/** For the admin's Stats page: the last 30 days of play, and the latest feedback. */
export const gameStats = createServerFn({ method: "GET" })
  .middleware([maybeUser])
  .handler(async ({ context }): Promise<GameStats> => {
    if (!context.userId) throw new Error("Sign in first.");
    const { readIsAdmin } = await import("@/lib/community.functions");
    if (!(await readIsAdmin(context.userId))) throw new Error("Only the admin can see game stats.");
    const sql = await getSql();
    const since = "30 days";
    const players = await sql<{ n: number }>`select count(distinct device)::int as n from abuja_play where created_at > now() - ${since}::interval`;
    const starts = await sql<{ n: number }>`select count(*)::int as n from abuja_play where kind = 'start' and created_at > now() - ${since}::interval`;
    const chapters = await sql<{ label: string; players: number }>`select label, count(distinct device)::int as players from abuja_play where kind = 'chapter' and created_at > now() - ${since}::interval group by label`;
    const adultDays = await sql<{ label: string; players: number }>`select label, count(distinct device)::int as players from abuja_play where kind = 'adult_day' and created_at > now() - ${since}::interval group by label`;
    const endings = await sql<{ label: string; count: number }>`select label, count(*)::int as count from abuja_play where kind = 'ending' and created_at > now() - ${since}::interval group by label order by count desc`;
    const loads = await sql<{ num: number }>`select num from abuja_play where kind = 'load' and num is not null and created_at > now() - ${since}::interval order by num`;
    const nums = loads.map((r) => Number(r.num));
    const pick = (q: number) => (nums.length ? Math.round(nums[Math.min(nums.length - 1, Math.floor(q * nums.length))]!) : null);
    const feedback = await sql<{ id: number; message: string; context: string; created_at: unknown; name: string | null }>`
      select f.id, f.message, f.context, f.created_at, u.name from abuja_feedback f left join "user" u on u.id = f.user_id order by f.created_at desc limit 50
    `;
    const order = ["primary", "secondary", "university", "nysc", "adult"];
    return {
      players30: Number(players[0]?.n ?? 0),
      starts30: Number(starts[0]?.n ?? 0),
      chapters: order.map((label) => ({ label, players: Number(chapters.find((c) => c.label === label)?.players ?? 0) })),
      adultDays: ["1", "7", "28", "56", "112"].map((label) => ({ label, players: Number(adultDays.find((c) => c.label === label)?.players ?? 0) })),
      endings: endings.map((e) => ({ label: e.label, count: Number(e.count) })),
      load: { median: pick(0.5), p90: pick(0.9), samples: nums.length },
      feedback: feedback.map((f) => ({ id: Number(f.id), message: f.message, context: f.context, created: String(f.created_at), user: f.name })),
    };
  });
