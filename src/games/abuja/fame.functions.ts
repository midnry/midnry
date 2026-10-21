import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

// The Hall of Fame: finished lives that signed-in players chose to share.
// Only the in-game name, the ending and the numbers are public. Lives of a
// closed account are hidden at once and deleted with the account after 30 days.

const ENDINGS = new Set(["freedom", "grass", "jail", "ninefive", "broke", "japa", "cut"]);
const PER_DAY = 30;
// Reaching ₦25m ends a life ("Financial Freedom"), so even with a lucky last
// trade or an inheritance no real life finishes anywhere near these limits.
// Anything beyond them was edited, and is turned away.
const MAX_WORTH = 100_000_000;
const MIN_WORTH = -50_000_000;

export type FameRow = { name: string; ending: string; netWorth: number; age: number; generation: number; background: string };
export type LifeInput = { key: string; name: string; ending: string; netWorth: number; age: number; generation: number; background: string };

const clean = (text: string, max: number) => text.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max);
const int = (n: unknown, lo: number, hi: number) => (Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(Number(n)))) : lo);

export const submitLife = createServerFn({ method: "POST" })
  .validator((input: LifeInput): LifeInput => {
    const name = clean(String(input?.name ?? ""), 24);
    const key = clean(String(input?.key ?? ""), 120);
    const ending = String(input?.ending ?? "");
    if (!name || !key || !ENDINGS.has(ending)) throw new Error("That life can't be shared.");
    const worth = Number(input?.netWorth);
    const age = Number(input?.age);
    if (!Number.isFinite(worth) || worth > MAX_WORTH || worth < MIN_WORTH) throw new Error("That life can't be shared.");
    if (!Number.isFinite(age) || age < 5 || age > 120) throw new Error("That life can't be shared.");
    // The rich endings only happen to grown-ups.
    if ((ending === "freedom" || ending === "grass" || ending === "japa") && age < 18) throw new Error("That life can't be shared.");
    return {
      key,
      name,
      ending,
      netWorth: int(input.netWorth, MIN_WORTH, MAX_WORTH),
      age: int(input.age, 0, 120),
      generation: int(input.generation, 1, 50),
      background: input.background === "lapo" ? "lapo" : "average",
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const recent = await sql<{ n: number }>`
      select count(*)::int as n from abuja_lives where user_id = ${context.userId} and created_at > now() - interval '1 day'
    `;
    if (Number(recent[0]?.n ?? 0) >= PER_DAY) return { ok: false as const, reason: "limit" as const };
    await sql`
      insert into abuja_lives (user_id, life_key, name, ending, net_worth, age, generation, background)
      values (${context.userId}, ${data.key}, ${data.name}, ${data.ending}, ${data.netWorth}, ${data.age}, ${data.generation}, ${data.background})
      on conflict (user_id, life_key) do nothing
    `;
    const above = await sql<{ n: number }>`select count(*)::int as n from abuja_lives l where net_worth > ${data.netWorth} and not exists (select 1 from account_closure c where c.user_id = l.user_id)`;
    return { ok: true as const, rank: Number(above[0]?.n ?? 0) + 1 };
  });

export const topLives = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  type Row = { name: string; ending: string; net_worth: string | number; age: number; generation: number; background: string };
  const map = (r: Row): FameRow => ({ name: r.name, ending: r.ending, netWorth: Number(r.net_worth), age: r.age, generation: r.generation, background: r.background });
  const richest = await sql<Row>`select name, ending, net_worth, age, generation, background from abuja_lives l where not exists (select 1 from account_closure c where c.user_id = l.user_id) order by net_worth desc, created_at asc limit 20`;
  const dynasties = await sql<Row>`select name, ending, net_worth, age, generation, background from abuja_lives l where generation > 1 and not exists (select 1 from account_closure c where c.user_id = l.user_id) order by generation desc, net_worth desc limit 10`;
  const recent = await sql<Row>`select name, ending, net_worth, age, generation, background from abuja_lives l where not exists (select 1 from account_closure c where c.user_id = l.user_id) order by created_at desc limit 10`;
  return { richest: richest.map(map), dynasties: dynasties.map(map), recent: recent.map(map) };
});
