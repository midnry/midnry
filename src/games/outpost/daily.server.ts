import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";
import { dailyKey, dailyScore } from "../../../public/games/outpost-shifts.js";
import { displayName, OutpostError } from "./rooms.server";

// Daily case leaderboard. Players are anonymous: a random device token,
// stored only as a hash, keeps one best score per device per UTC day. The
// score is recomputed here from the run's numbers, never taken from the client.

const TOKEN = /^[a-f0-9]{32}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SEATS = 5;
const PATIENTS = 4;
const TOP = 20;

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const int = (value: unknown, lo: number, hi: number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < lo || n > hi) throw new OutpostError("That score can't be shared.");
  return Math.round(n);
};

/** Today, or yesterday for a case finished just after midnight UTC. */
function dayOf(value: unknown) {
  const now = Date.now(),
    today = dailyKey(new Date(now)),
    yesterday = dailyKey(new Date(now - 86400000));
  if (typeof value !== "string" || !DAY.test(value) || (value !== today && value !== yesterday))
    throw new OutpostError("That daily case has closed.");
  return value;
}

const rateState = globalThis as typeof globalThis & {
  __outpostDailyRate?: Map<string, { count: number; until: number }>;
};
function limit(clientKey: string) {
  const rates = (rateState.__outpostDailyRate ??= new Map()),
    now = Date.now(),
    key = sha(clientKey),
    rate = rates.get(key);
  if (rate && rate.until > now && rate.count >= 30)
    throw new OutpostError("Too many scores. Try again later.", 429);
  rates.set(key, {
    count: rate && rate.until > now ? rate.count + 1 : 1,
    until: rate && rate.until > now ? rate.until : now + 3600000,
  });
  for (const [k, v] of rates) if (v.until < now) rates.delete(k);
}

type Row = { name: string; score: number; won: boolean; seconds: number; player: string };

async function board(day: string, player: string | null) {
  const sql = await getSql();
  const rows = await sql<Row>`select name, score, won, seconds, player from outpost_daily
    where day = ${day} order by score desc, seconds asc, updated_at asc limit ${TOP}`;
  const total = await sql<{ n: number }>`select count(*)::int as n from outpost_daily where day = ${day}`;
  let you: { rank: number; score: number } | null = null;
  if (player) {
    const mine = await sql<Row>`select name, score, won, seconds, player from outpost_daily where day = ${day} and player = ${player}`;
    if (mine[0]) {
      const above = await sql<{ n: number }>`select count(*)::int as n from outpost_daily
        where day = ${day} and (score > ${mine[0].score} or (score = ${mine[0].score} and seconds < ${mine[0].seconds}))`;
      you = { rank: Number(above[0]?.n ?? 0) + 1, score: mine[0].score };
    }
  }
  return {
    day,
    total: Number(total[0]?.n ?? 0),
    // Ties on score and time share a rank (1, 2, 2, 4).
    top: rows.map((row, i) => ({
      rank: rows.findIndex((r) => r.score === row.score && r.seconds === row.seconds) + 1,
      name: row.name,
      score: row.score,
      won: row.won,
      seconds: row.seconds,
      you: row.player === player,
    })),
    you,
  };
}

export async function dailyAction(body: Record<string, unknown>, clientKey: string) {
  const day = dayOf(body.day);
  const player = typeof body.token === "string" && TOKEN.test(body.token) ? sha(body.token) : null;
  if (body.op === "board") return board(day, player);
  if (body.op !== "submit") throw new OutpostError("Invalid request.");
  if (!player) throw new OutpostError("That score can't be shared.");
  limit(clientKey);
  const won = body.won === true,
    seconds = int(body.seconds, 20, 3600),
    correctVotes = int(body.correctVotes ?? 0, 0, 4),
    crewAlive = int(body.crewAlive ?? 0, 0, SEATS),
    rescued = int(body.rescued ?? 0, 0, PATIENTS);
  const score = dailyScore({ won, seconds, correctVotes, crewAlive, rescued }),
    name = displayName(body.name, "Operator");
  const sql = await getSql();
  await sql`insert into outpost_daily (day, player, name, score, won, seconds)
    values (${day}, ${player}, ${name}, ${score}, ${won}, ${seconds})
    on conflict (day, player) do update set
      name = excluded.name,
      score = excluded.score,
      won = excluded.won,
      seconds = excluded.seconds,
      updated_at = now()
    where excluded.score > outpost_daily.score
      or (excluded.score = outpost_daily.score and excluded.seconds < outpost_daily.seconds)`;
  return { ...(await board(day, player)), score };
}
