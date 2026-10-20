import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useRole } from "@/components/role";
import { adminStats, type AdminApp, type AdminStats } from "@/lib/admin.functions";
import { Button, Skeleton, TextInput, cn } from "@/components/ui";
import { gameStats, type GameStats } from "@/games/abuja/play.functions";
import { outpostAdminStats, outpostAdminSales, type OutpostStats, type StoreSales } from "@/games/outpost/stats.functions";
import { finishOf, money } from "../../public/games/outpost-finishes.js";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Stats — Midnry" }, { name: "robots", content: "noindex" }] }),
  component: StatsPage,
});

function StatsPage() {
  const { user, isPending } = useCurrentUserState();
  const { isAdmin, ready } = useRole();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId || !isAdmin) return;
    let cancel = false;
    adminStats()
      .then((next) => !cancel && setStats(next))
      .catch((caught: unknown) => !cancel && setError(caught instanceof Error ? caught.message : "Could not load stats."));
    return () => {
      cancel = true;
    };
  }, [userId, isAdmin]);

  if (isPending || (user && !ready)) {
    return (
      <Shell>
        <Skeleton className="h-10 w-40" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  if (!isAdmin) {
    return (
      <Shell>
        <p className="text-muted">Only the admin can see site stats.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">Stats</h1>
      <p className="mt-2 text-muted">Who joined, who is active, and which apps people use. Visible only to you.</p>
      {error ? <p className="mt-6 text-fail">{error}</p> : null}
      {!stats && !error ? <Skeleton className="mt-8 h-64 w-full" /> : null}
      {stats ? (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Tile label="Total users" value={stats.totals.users} />
            <Tile label="Joined, last 7 days" value={stats.totals.new7} />
            <Tile label="Joined, last 30 days" value={stats.totals.new30} />
            <Tile label="Active, last 7 days" value={stats.totals.active7} />
            <Tile label="Active, last 30 days" value={stats.totals.active30} />
            <Tile label="Midnry Pass" value={stats.totals.passes} />
          </dl>
          <Signups data={stats.signups} />
          <TopApps last30={stats.apps30} all={stats.appsAll} />
          <Users stats={stats} />
          <OutpostSection />
          <GameSection />
        </>
      ) : null}
    </Shell>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-line">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-display text-3xl tabular-nums">{value.toLocaleString("en")}</dd>
    </div>
  );
}

function Signups({ data }: { data: AdminStats["signups"] }) {
  const max = Math.max(1, ...data.map((item) => item.count));
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover != null ? data[hover] : null;
  return (
    <section className="mt-10 rounded-2xl bg-card p-5 shadow-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl">Sign-ups per day</h2>
        <p className="text-sm text-muted tabular-nums">
          {shown ? `${prettyDay(shown.day)}: ${shown.count} ${shown.count === 1 ? "sign-up" : "sign-ups"}` : `${total} in the last 30 days`}
        </p>
      </div>
      <div className="mt-4 flex h-40 items-end gap-[2px] border-b border-line" role="img" aria-label={`Sign-ups per day for the last 30 days, ${total} in total`}>
        {data.map((item, index) => (
          <div
            key={item.day}
            className="flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(index)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            aria-label={`${prettyDay(item.day)}: ${item.count}`}
          >
            <div
              className={cn("w-full rounded-t-[4px] bg-pine transition-opacity", hover != null && hover !== index && "opacity-40")}
              style={{ height: item.count ? `${Math.max(4, (item.count / max) * 100)}%` : "2px", opacity: item.count ? undefined : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{prettyDay(data[0]!.day)}</span>
        <span>Today</span>
      </div>
    </section>
  );
}

function TopApps({ last30, all }: { last30: AdminApp[]; all: AdminApp[] }) {
  const [range, setRange] = useState<"30" | "all">("30");
  const list = range === "30" ? last30 : all;
  const max = Math.max(1, ...list.map((item) => item.users));
  return (
    <section className="mt-6 rounded-2xl bg-card p-5 shadow-line">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Most used apps</h2>
        <div className="flex gap-1 rounded-full bg-paper p-1" role="group" aria-label="Time range">
          {(["30", "all"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={range === item}
              onClick={() => setRange(item)}
              className={cn("min-h-9 rounded-full px-4 text-sm", range === item ? "bg-card font-medium shadow-line" : "text-muted")}
            >
              {item === "30" ? "Last 30 days" : "All time"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">Ranked by how many people opened each app. A person counts once per app per day.</p>
      {list.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No app use recorded yet.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {list.map((item, index) => (
            <li key={item.slug} className="grid grid-cols-[1.5rem_minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[1.5rem_12rem_1fr_auto]">
              <span className="text-muted tabular-nums">{index + 1}</span>
              <Link to="/apps/$slug" params={{ slug: item.slug }} className="truncate hover:underline">
                {item.name}
              </Link>
              <div className="h-3 rounded-full bg-paper-2">
                <div className="h-full rounded-full bg-pine" style={{ width: `${(item.users / max) * 100}%` }} />
              </div>
              <span className="text-right tabular-nums">
                {item.users} {item.users === 1 ? "person" : "people"}
                <span className="text-muted"> · {item.opens} opens</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Users({ stats }: { stats: AdminStats }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = useMemo(
    () => stats.users.filter((user) => !needle || `${user.name} ${user.email}`.toLowerCase().includes(needle)),
    [stats.users, needle],
  );

  function exportCsv() {
    const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const rows = [
      ["Name", "Email", "Signed in with", "Joined", "Last active", "Apps used", "Midnry Pass"],
      ...stats.users.map((user) => [user.name, user.email, user.signIn, user.joined.slice(0, 10), user.lastActive ?? "", String(user.appsUsed), user.hasPass ? "Yes" : "No"]),
    ];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(cell).join(",")).join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `midnry-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="mt-6 rounded-2xl bg-card p-5 shadow-line">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Users</h2>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <TextInput className="w-full sm:w-64" placeholder="Search name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button tone="quiet" onClick={exportCsv}>
            Download CSV
          </Button>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        {shown.length === stats.users.length ? `${stats.users.length} people, newest first.` : `${shown.length} of ${stats.users.length} match.`}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Email</th>
              <th className="py-2 pr-3 font-medium">Signed in with</th>
              <th className="py-2 pr-3 font-medium">Joined</th>
              <th className="py-2 pr-3 font-medium">Last active</th>
              <th className="py-2 pr-3 text-right font-medium">Apps used</th>
              <th className="py-2 font-medium">Pass</th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 500).map((user) => (
              <tr key={user.id} className="border-b border-line/60">
                <td className="py-2 pr-3 font-medium">{user.name}</td>
                <td className="py-2 pr-3 break-all">{user.email}</td>
                <td className="py-2 pr-3">{user.signIn}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{prettyDay(user.joined.slice(0, 10))}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{user.lastActive ? prettyDay(user.lastActive) : "—"}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{user.appsUsed}</td>
                <td className="py-2">{user.hasPass ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length > 500 ? <p className="mt-2 text-xs text-muted">Showing the first 500. Download the CSV for everyone.</p> : null}
      </div>
    </section>
  );
}

function prettyDay(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? day : date.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

const CHAPTER_NAMES: Record<string, string> = { primary: "Primary school", secondary: "Secondary school", university: "University", nysc: "NYSC", adult: "Adult life" };
const ENDING_NAMES: Record<string, string> = { freedom: "Financial Freedom", grass: "Grass to Grace", jail: "Jailed", ninefive: "Stuck in a 9-5", broke: "Broke", japa: "Japa", cut: "Life Cut Short" };

const MODE_NAMES: Record<string, string> = { protocol: "Blackout Protocol", signal: "Last Signal", duo: "Duo" };
const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

/** Outpost Zero: signed-in players, matches per day, modes, devices and each player's record. */
function OutpostSection() {
  const [data, setData] = useState<OutpostStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [sales, setSales] = useState<StoreSales | null>(null);
  useEffect(() => {
    let cancel = false;
    outpostAdminSales()
      .then((next) => !cancel && setSales(next))
      .catch(() => {});
    outpostAdminStats()
      .then((next) => !cancel && setData(next))
      .catch((caught: unknown) => !cancel && setError(caught instanceof Error ? caught.message : "Could not load Outpost Zero stats."));
    return () => {
      cancel = true;
    };
  }, []);
  if (error) return <p className="mt-10 text-fail">{error}</p>;
  if (!data) return <Skeleton className="mt-10 h-64 w-full" />;
  const max = Math.max(1, ...data.daily.map((d) => d.matches));
  const shown = hover != null ? data.daily[hover] : null;
  return (
    <section className="mt-10" aria-labelledby="outpost-stats">
      <h2 id="outpost-stats" className="font-display text-3xl tracking-tight">
        Outpost Zero
      </h2>
      <p className="mt-1 text-sm text-muted">Signed-in players, last 30 days. Training and practice rounds are not counted.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Players, 7 days" value={data.players7} />
        <Tile label="Players, 30 days" value={data.players30} />
        <Tile label="Matches, 7 days" value={data.matches7} />
        <Tile label="Matches, 30 days" value={data.matches30} />
        <Tile label="Hours played, 30 days" value={data.hours30} />
      </dl>
      <div className="mt-6 rounded-2xl bg-card p-5 shadow-line">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-2xl">Matches per day</h3>
          <p className="text-sm text-muted tabular-nums">
            {shown ? `${prettyDay(shown.day)}: ${count(shown.matches, "match", "matches")} · ${count(shown.players, "player")}` : `${data.matches30} in the last 30 days`}
          </p>
        </div>
        <div className="mt-4 flex h-32 items-end gap-[2px] border-b border-line" role="img" aria-label={`Outpost Zero matches per day, ${data.matches30} in 30 days`}>
          {data.daily.map((d, index) => (
            <div
              key={d.day}
              className="flex h-full flex-1 items-end"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(index)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`${prettyDay(d.day)}: ${d.matches} matches`}
            >
              <div
                className={cn("w-full rounded-t-[4px] bg-pine transition-opacity", hover != null && hover !== index && "opacity-40")}
                style={{ height: d.matches ? `${Math.max(4, (d.matches / max) * 100)}%` : "2px", opacity: d.matches ? undefined : 0.25 }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-line">
          <h3 className="font-display text-2xl">Modes</h3>
          {data.modes.length ? (
            <ul className="mt-3 divide-y divide-line">
              {data.modes.map((m) => (
                <li key={m.mode} className="flex justify-between gap-3 py-2 text-sm">
                  <span>{MODE_NAMES[m.mode] ?? m.mode}</span>
                  <span className="text-muted tabular-nums">
                    {count(m.matches, "match", "matches")} · {count(m.players, "player")} · {m.winRate}% won
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No matches yet.</p>
          )}
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-line">
          <h3 className="font-display text-2xl">Played on</h3>
          {data.platforms.length ? (
            <ul className="mt-3 divide-y divide-line">
              {data.platforms.map((p) => (
                <li key={p.platform} className="flex justify-between gap-3 py-2 text-sm">
                  <span>{p.platform === "desktop" ? "Desktop app" : "Website"}</span>
                  <span className="text-muted tabular-nums">
                    {count(p.matches, "match", "matches")} · {count(p.players, "player")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No matches yet.</p>
          )}
        </div>
      </div>
      {sales ? (
        <div className="mt-6 rounded-2xl bg-card p-5 shadow-line">
          <h3 className="font-display text-2xl">Store</h3>
          <p className="mt-1 text-sm text-muted tabular-nums">
            Last 30 days: {sales.revenue30.length ? sales.revenue30.map((r) => money(r.amount, r.currency)).join(" + ") : "nothing yet"} from {count(sales.sales30, "sale")} to {count(sales.buyers30, "buyer")} (before Paystack fees).
          </p>
          {sales.items.length ? (
            <ul className="mt-3 divide-y divide-line">
              {sales.items.map((i) => (
                <li key={i.item} className="flex justify-between gap-3 py-2 text-sm">
                  <span>{finishOf(i.item).name}</span>
                  <span className="text-muted tabular-nums">
                    {count(i.sales, "sale")} · {i.revenue.map((r) => money(r.amount, r.currency)).join(" + ")} all time
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No sales yet.</p>
          )}
        </div>
      ) : null}
      <div className="mt-6 rounded-2xl bg-card p-5 shadow-line">
        <h3 className="font-display text-2xl">Players</h3>
        {data.players.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 font-normal">Player</th>
                  <th className="py-2 text-right font-normal">Matches</th>
                  <th className="py-2 text-right font-normal">Wins</th>
                  <th className="py-2 text-right font-normal">Kills</th>
                  <th className="py-2 text-right font-normal">Hours</th>
                  <th className="py-2 text-right font-normal">Last played</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.players.map((p) => (
                  <tr key={p.email}>
                    <td className="py-2">
                      <span className="block">{p.name}</span>
                      <span className="block text-xs text-muted">{p.email}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{p.matches}</td>
                    <td className="py-2 text-right tabular-nums">{p.wins}</td>
                    <td className="py-2 text-right tabular-nums">{p.kills}</td>
                    <td className="py-2 text-right tabular-nums">{p.hours}</td>
                    <td className="py-2 text-right tabular-nums">{p.last ? prettyDay(p.last.slice(0, 10)) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No signed-in players yet.</p>
        )}
      </div>
    </section>
  );
}

/** Abuja Hustle: how far lives get, endings, loading time, and what players tell us. */
function GameSection() {
  const [data, setData] = useState<GameStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    gameStats()
      .then((next) => !cancel && setData(next))
      .catch((caught: unknown) => !cancel && setError(caught instanceof Error ? caught.message : "Could not load game stats."));
    return () => {
      cancel = true;
    };
  }, []);
  if (error) return <p className="mt-10 text-fail">{error}</p>;
  if (!data) return <Skeleton className="mt-10 h-64 w-full" />;
  const funnel = [...data.chapters.map((c) => ({ label: CHAPTER_NAMES[c.label] ?? c.label, players: c.players })), ...data.adultDays.map((d) => ({ label: `Adult day ${d.label}`, players: d.players }))];
  const top = Math.max(1, ...funnel.map((f) => f.players));
  const sec = (ms: number | null) => (ms == null ? "–" : `${(ms / 1000).toFixed(1)} s`);
  return (
    <section className="mt-10" aria-labelledby="game-stats">
      <h2 id="game-stats" className="font-display text-3xl tracking-tight">
        Abuja Hustle
      </h2>
      <p className="mt-1 text-sm text-muted">Last 30 days. Anonymous: one random id per device, nothing personal.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Players (devices)" value={data.players30} />
        <Tile label="New lives started" value={data.starts30} />
        <div className="rounded-2xl bg-card p-4 shadow-line">
          <dt className="text-sm text-muted">Continue, typical load</dt>
          <dd className="mt-1 font-display text-3xl tabular-nums">{sec(data.load.median)}</dd>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-line">
          <dt className="text-sm text-muted">Slowest 10% load</dt>
          <dd className="mt-1 font-display text-3xl tabular-nums">{sec(data.load.p90)}</dd>
        </div>
      </dl>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-line">
          <h3 className="font-display text-2xl">How far players get</h3>
          <ol className="mt-3 grid gap-2">
            {funnel.map((f) => (
              <li key={f.label} className="grid grid-cols-[8.5rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate text-muted">{f.label}</span>
                <span className="h-3 overflow-hidden rounded-full bg-paper-2">
                  <span className="block h-full rounded-full bg-pine" style={{ width: `${(f.players / top) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{f.players}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-line">
          <h3 className="font-display text-2xl">Endings</h3>
          {data.endings.length ? (
            <ul className="mt-3 divide-y divide-line">
              {data.endings.map((e) => (
                <li key={e.label} className="flex justify-between py-2 text-sm">
                  <span>{ENDING_NAMES[e.label] ?? e.label}</span>
                  <span className="tabular-nums">{e.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No finished lives yet.</p>
          )}
        </div>
      </div>
      <div className="mt-6 rounded-2xl bg-card p-5 shadow-line">
        <h3 className="font-display text-2xl">Player feedback</h3>
        {data.feedback.length ? (
          <ul className="mt-3 divide-y divide-line">
            {data.feedback.map((f) => (
              <FeedbackRow key={f.id} item={f} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No feedback yet. It arrives from the game's pause menu.</p>
        )}
      </div>
    </section>
  );
}

function FeedbackRow({ item }: { item: GameStats["feedback"][number] }) {
  const [open, setOpen] = useState(false);
  let ctx: Record<string, unknown> = {};
  try {
    ctx = JSON.parse(item.context) as Record<string, unknown>;
  } catch {
    ctx = {};
  }
  const where = [ctx.chapter === "adult" || !ctx.chapter ? null : CHAPTER_NAMES[String(ctx.chapter)], ctx.day != null ? `day ${ctx.day}` : null, ctx.goal ? `goal: ${ctx.goal}` : null, ctx.screen ? String(ctx.screen) : null].filter(Boolean).join(" · ");
  return (
    <li className="py-3 text-sm">
      <p className="text-pretty">{item.message}</p>
      <p className="mt-1 text-xs text-muted">
        {new Date(item.created).toLocaleString()} · {item.user ?? "not signed in"}
        {where ? ` · ${where}` : ""}
      </p>
      <button type="button" className="mt-1 min-h-9 text-xs underline underline-offset-4" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Hide game details" : "Game details"}
      </button>
      {open ? <pre className="mt-1 overflow-x-auto rounded-lg bg-paper-2 p-2 text-xs">{JSON.stringify(ctx, null, 2)}</pre> : null}
    </li>
  );
}
