import { addDays, parseIso, weekStart } from "@/lib/remind/dates";
import { LEVELS, dailyStreak, levelOf, longestDailyStreak, weekTotal, weeklyStreak, type Stats } from "@/lib/remind/stats";
import { cn } from "@/components/ui";

type Bar = { key: string; label: string; full: string; value: number; current: boolean };

/** Single-series bars: one hue, rounded tops, a goal line, a hover value and a table for screen readers. */
function Bars({ title, bars, goal, unit }: { title: string; bars: Bar[]; goal: number; unit: string }) {
  const max = Math.max(goal, ...bars.map((bar) => bar.value), 1);
  const goalTop = 100 - (goal / max) * 100;
  return (
    <figure className="min-w-0 rounded-2xl bg-card p-5 shadow-line">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-muted">
          Goal {goal} {unit}
        </span>
      </figcaption>
      <div className="relative mt-4 h-36" aria-hidden>
        <div className="absolute inset-x-0 border-t border-dashed border-muted/60" style={{ top: `${goalTop}%` }} />
        <div className="flex h-full items-end gap-0.5">
          {bars.map((bar) => (
            <div key={bar.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
              <div
                className={cn("w-full max-w-10 rounded-t", bar.value >= goal ? "bg-pine" : "bg-pine/45")}
                style={{ height: `${(bar.value / max) * 100}%`, minHeight: bar.value ? 4 : 0 }}
              />
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-paper group-hover:block">
                {bar.full}: {bar.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-0.5 text-center text-xs text-muted" aria-hidden>
        {bars.map((bar) => (
          <span key={bar.key} className={cn("min-w-0 flex-1 truncate", bar.current && "font-medium text-ink")}>
            {bar.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>When</th>
            <th>Tasks done</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.key}>
              <td>{bar.full}</td>
              <td>{bar.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-line">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums tracking-tight">{value}</p>
      {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
    </div>
  );
}

export function Productivity({ stats, today, onGoals }: { stats: Stats; today: string; onGoals: (daily: number, weekly: number) => void }) {
  const level = levelOf(stats.points);
  const todayCount = stats.days[today] ?? 0;
  const thisWeek = weekTotal(stats, today);
  const daily = dailyStreak(stats, today);
  const weekly = weeklyStreak(stats, today);

  const days: Bar[] = Array.from({ length: 7 }, (_, index) => {
    const iso = addDays(today, index - 6);
    const date = parseIso(iso);
    return {
      key: iso,
      label: index === 6 ? "Today" : date.toLocaleDateString("en", { weekday: "short" }),
      full: date.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" }),
      value: stats.days[iso] ?? 0,
      current: index === 6,
    };
  });
  const weeks: Bar[] = Array.from({ length: 8 }, (_, index) => {
    const start = addDays(weekStart(today), (index - 7) * 7);
    const date = parseIso(start);
    return {
      key: start,
      label: index === 7 ? "This wk" : date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      full: `Week of ${date.toLocaleDateString("en", { month: "long", day: "numeric" })}`,
      value: weekTotal(stats, start),
      current: index === 7,
    };
  });

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-2xl bg-pine p-5 text-paper">
        <p className="text-sm opacity-80">Midnry Points</p>
        <p className="mt-1 font-display text-5xl tabular-nums tracking-tight">{stats.points.toLocaleString()}</p>
        <p className="mt-2 font-medium">Level: {level.name}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper/25" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress * 100)} aria-label="Progress to the next level">
          <div className="h-full rounded-full bg-paper" style={{ width: `${level.progress * 100}%` }} />
        </div>
        <p className="mt-2 text-sm opacity-80">
          {level.next === null
            ? "Top level reached."
            : `${(level.next - stats.points).toLocaleString()} points to ${LEVELS[level.index + 1].name}.`}{" "}
          Finish tasks to earn points: P1 = 4, P2 = 3, P3 = 2, P4 = 1, plus 5 for hitting your daily goal.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Done today" value={`${todayCount}/${stats.dailyGoal}`} note={todayCount >= stats.dailyGoal ? "Goal met 🎉" : "Daily goal"} />
        <Tile label="This week" value={`${thisWeek}/${stats.weeklyGoal}`} note={thisWeek >= stats.weeklyGoal ? "Goal met 🎉" : "Weekly goal"} />
        <Tile label="Daily streak" value={`${daily} ${daily === 1 ? "day" : "days"}`} note={`Best: ${longestDailyStreak(stats)}`} />
        <Tile label="Weekly streak" value={`${weekly} ${weekly === 1 ? "week" : "weeks"}`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Bars title="Tasks done, last 7 days" bars={days} goal={stats.dailyGoal} unit="a day" />
        <Bars title="Tasks done, last 8 weeks" bars={weeks} goal={stats.weeklyGoal} unit="a week" />
      </div>

      <section className="rounded-2xl bg-card p-5 shadow-line">
        <h3 className="font-medium">Goals</h3>
        <p className="mt-1 text-sm text-muted">A streak grows each day (or week) you reach your goal.</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Tasks a day</span>
            <input
              type="number"
              min={1}
              max={50}
              value={stats.dailyGoal}
              onChange={(event) => onGoals(Number(event.target.value), stats.weeklyGoal)}
              className="h-11 w-24 rounded-lg border border-line bg-paper px-3"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Tasks a week</span>
            <input
              type="number"
              min={1}
              max={300}
              value={stats.weeklyGoal}
              onChange={(event) => onGoals(stats.dailyGoal, Number(event.target.value))}
              className="h-11 w-24 rounded-lg border border-line bg-paper px-3"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
