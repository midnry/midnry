import { getSql } from "@/lib/db";
import { OutpostError } from "./rooms.server";

// Outpost Zero player stats. The game requires sign-in; each finished match
// of a signed-in player is stored once (keyed by its round id). The numbers
// come from the player's own game, so they are range-checked and capped
// here; they serve the owner's stats page, not a ranking.

const ROUND = /^[A-Za-z0-9.-]{8,64}$/;
const WORD = /^[a-z][a-z0-9-]{0,23}$/;
const PER_DAY = 300;

const int = (value: unknown, lo: number, hi: number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < lo || n > hi) throw new OutpostError("Match not recorded.");
  return Math.round(n);
};
const word = (value: unknown) => {
  if (typeof value !== "string" || !WORD.test(value)) throw new OutpostError("Match not recorded.");
  return value;
};

/** The signed-in player's display name for the game's welcome line. */
export async function playerName(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ name: string | null }>`select name from "user" where id = ${userId}`;
  return rows[0]?.name?.trim().slice(0, 40) || "Operator";
}

export async function recordMatch(userId: string, match: Record<string, unknown>) {
  if (typeof match.id !== "string" || !ROUND.test(match.id)) throw new OutpostError("Match not recorded.");
  const row = {
    round: match.id,
    mode: word(match.mode),
    map: word(match.map),
    online: match.online === true,
    platform: match.platform === "desktop" ? "desktop" : "web",
    won: match.won === true,
    kills: int(match.kills, 0, 200),
    damage: int(match.damage, 0, 100000),
    seconds: int(match.seconds, 0, 6 * 3600),
    placement: int(match.placement, 1, 64),
    role: match.role == null ? null : word(match.role),
  };
  const sql = await getSql();
  const today = await sql<{ n: number }>`select count(*)::int as n from outpost_match
    where user_id = ${userId} and created_at > now() - interval '1 day'`;
  if (Number(today[0]?.n ?? 0) >= PER_DAY) throw new OutpostError("Too many matches today.", 429);
  await sql`insert into outpost_match
    (user_id, round_id, mode, map, online, platform, won, kills, damage, seconds, placement, role)
    values (${userId}, ${row.round}, ${row.mode}, ${row.map}, ${row.online}, ${row.platform}, ${row.won},
      ${row.kills}, ${row.damage}, ${row.seconds}, ${row.placement}, ${row.role})
    on conflict (user_id, round_id) do nothing`;
  return { ok: true };
}

export type OutpostStats = {
  players7: number;
  players30: number;
  matches7: number;
  matches30: number;
  hours30: number;
  modes: { mode: string; matches: number; players: number; winRate: number }[];
  platforms: { platform: string; matches: number; players: number }[];
  daily: { day: string; matches: number; players: number }[];
  players: {
    name: string;
    email: string;
    matches: number;
    wins: number;
    kills: number;
    hours: number;
    last: string;
  }[];
};

/** Owner's view: who plays, how much, which modes and devices (last 30 days). */
export async function outpostStats(): Promise<OutpostStats> {
  const sql = await getSql();
  const totals = await sql<{ p7: number; p30: number; m7: number; m30: number; s30: number }>`
    select
      count(distinct case when created_at > now() - interval '7 days' then user_id end)::int as p7,
      count(distinct user_id)::int as p30,
      count(case when created_at > now() - interval '7 days' then 1 end)::int as m7,
      count(*)::int as m30,
      coalesce(sum(seconds), 0)::int as s30
    from outpost_match where created_at > now() - interval '30 days'`;
  const modes = await sql<{ mode: string; matches: number; players: number; wins: number }>`
    select mode, count(*)::int as matches, count(distinct user_id)::int as players,
      count(case when won then 1 end)::int as wins
    from outpost_match where created_at > now() - interval '30 days'
    group by mode order by matches desc`;
  const platforms = await sql<{ platform: string; matches: number; players: number }>`
    select platform, count(*)::int as matches, count(distinct user_id)::int as players
    from outpost_match where created_at > now() - interval '30 days'
    group by platform order by matches desc`;
  const days = await sql<{ day: string; matches: number; players: number }>`
    select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as matches,
      count(distinct user_id)::int as players
    from outpost_match where created_at > now() - interval '30 days'
    group by 1`;
  const players = await sql<{
    name: string;
    email: string;
    matches: number;
    wins: number;
    kills: number;
    seconds: number;
    last: unknown;
  }>`
    select u.name, u.email, count(*)::int as matches, count(case when m.won then 1 end)::int as wins,
      sum(m.kills)::int as kills, sum(m.seconds)::int as seconds, max(m.created_at) as last
    from outpost_match m join "user" u on u.id = m.user_id
    group by u.id, u.name, u.email
    order by max(m.created_at) desc
    limit 200`;
  const perDay = new Map(days.map((d) => [d.day, d]));
  const now = Date.now();
  const hours = (s: number) => Math.round((Number(s) / 3600) * 10) / 10;
  return {
    players7: Number(totals[0]?.p7 ?? 0),
    players30: Number(totals[0]?.p30 ?? 0),
    matches7: Number(totals[0]?.m7 ?? 0),
    matches30: Number(totals[0]?.m30 ?? 0),
    hours30: hours(totals[0]?.s30 ?? 0),
    modes: modes.map((m) => ({
      mode: m.mode,
      matches: Number(m.matches),
      players: Number(m.players),
      winRate: Number(m.matches) ? Math.round((Number(m.wins) / Number(m.matches)) * 100) : 0,
    })),
    platforms: platforms.map((p) => ({ platform: p.platform, matches: Number(p.matches), players: Number(p.players) })),
    daily: Array.from({ length: 30 }, (_, i) => {
      const day = new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10);
      return { day, matches: Number(perDay.get(day)?.matches ?? 0), players: Number(perDay.get(day)?.players ?? 0) };
    }),
    players: players.map((p) => ({
      name: p.name,
      email: p.email,
      matches: Number(p.matches),
      wins: Number(p.wins),
      kills: Number(p.kills),
      hours: hours(p.seconds),
      last: p.last instanceof Date ? p.last.toISOString() : String(p.last ?? ""),
    })),
  };
}
