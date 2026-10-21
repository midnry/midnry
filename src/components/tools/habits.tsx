import { useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, cn, TextInput } from "@/components/ui";
import { nid, SaveMark, todayISO, ToolStatus } from "@/components/tools/shared";

type Habit = { id: string; name: string; done: string[] };
type HabitsDoc = { habits: Habit[] };

const FALLBACK: HabitsDoc = { habits: [] };

function asHabits(value: unknown): Habit[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (habit): habit is Habit =>
        !!habit &&
        typeof habit === "object" &&
        typeof (habit as Habit).id === "string" &&
        typeof (habit as Habit).name === "string" &&
        Array.isArray((habit as Habit).done),
    )
    .slice(0, 8)
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      done: habit.done.filter((day): day is string => typeof day === "string"),
    }));
}

function streak(done: string[], today: string): number {
  const days = new Set(done);
  let cursor = new Date(`${today}T12:00:00`);
  if (!days.has(today)) cursor = addDays(cursor, -1);
  let count = 0;
  while (days.has(todayISO(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function weekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** Remind's Habits view (a Pass feature), formerly the Habits app. It keeps the "habits" document. */
export function HabitsPanel() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("habits", FALLBACK);
  const habits = asHabits(data.habits);
  const [name, setName] = useState("");
  const [cursor, setCursor] = useState(() => weekStart(new Date()));
  const days = Array.from({ length: 7 }, (_, index) => addDays(cursor, index));
  const current = weekStart(new Date()).getTime() === cursor.getTime();
  const today = todayISO();

  function commit(next: Habit[]) {
    setData({ habits: next });
  }

  return (
    <div className="mt-4" data-remind-panel="habits">
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">
              {format(days[0], "MMM d")} – {format(days[6], "MMM d")}
            </p>
            <SaveMark state={saveState} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button tone="quiet" onClick={() => setCursor((date) => addDays(date, -7))}>
              Previous
            </Button>
            <Button tone="quiet" disabled={current} onClick={() => setCursor(weekStart(new Date()))}>
              This week
            </Button>
            <Button tone="quiet" onClick={() => setCursor((date) => addDays(date, 7))}>
              Next
            </Button>
          </div>
        </div>

        {habits.length === 0 ? (
          <p className="text-sm text-muted">Add up to eight habits. Checks stay on the day you mark them.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl border-collapse text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-3 font-medium">Habit</th>
                  {days.map((day) => {
                    const iso = todayISO(day);
                    return (
                      <th
                        key={iso}
                        className={cn("px-1 py-2 text-center font-medium", iso === today && "text-ink")}
                      >
                        {format(day, "EEE")}
                        <span className="mt-0.5 block tabular-nums">{format(day, "d")}</span>
                      </th>
                    );
                  })}
                  <th className="py-2 pl-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => (
                  <tr key={habit.id} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <TextInput
                        value={habit.name}
                        aria-label="Habit name"
                        maxLength={40}
                        onChange={(event) =>
                          commit(
                            habits.map((item) =>
                              item.id === habit.id ? { ...item, name: event.target.value } : item,
                            ),
                          )
                        }
                      />
                      <span className="mt-1 block text-xs text-muted">
                        {days.filter((day) => habit.done.includes(todayISO(day))).length}/7 this week
                        {streak(habit.done, today) > 1 ? ` · ${streak(habit.done, today)}-day streak` : ""}
                      </span>
                    </td>
                    {days.map((day) => {
                      const iso = todayISO(day);
                      const on = habit.done.includes(iso);
                      return (
                        <td key={iso} className="px-1 py-2 text-center">
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-label={`${habit.name || "Habit"} on ${format(day, "EEEE MMM d")}`}
                            onClick={() =>
                              commit(
                                habits.map((item) => {
                                  if (item.id !== habit.id) return item;
                                  const done = on
                                    ? item.done.filter((value) => value !== iso)
                                    : [...item.done, iso];
                                  return { ...item, done };
                                }),
                              )
                            }
                            className={cn(
                              "inline-flex size-11 items-center justify-center rounded-full border",
                              on ? "border-pine bg-pine text-paper" : "border-line bg-card text-muted",
                            )}
                          >
                            <span className={cn("size-2 rounded-full", on ? "bg-paper" : "bg-line")} />
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-2 pl-2">
                      <Button
                        tone="quiet"
                        onClick={() => commit(habits.filter((item) => item.id !== habit.id))}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form
          className="mt-6 flex max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = name.trim();
            if (!next || habits.length >= 8) return;
            commit([...habits, { id: nid(), name: next, done: [] }]);
            setName("");
          }}
        >
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New habit"
            aria-label="New habit"
            maxLength={40}
            disabled={habits.length >= 8}
          />
          <Button type="submit" tone="primary" disabled={habits.length >= 8 || !name.trim()}>
            Add
          </Button>
        </form>
        <p className="mt-2 text-sm text-muted">{habits.length} of 8</p>
      </ToolStatus>
    </div>
  );
}

/**
 * Today's habits, shown next to Remind's Today view: one tap ticks today.
 * Nothing shows until there is at least one habit.
 */
export function TodayHabits({ onOpen }: { onOpen: () => void }) {
  const { data, setData, ready, loadError, blocked } = useAppDoc("habits", FALLBACK);
  const habits = asHabits(data.habits);
  const today = todayISO();
  if (!ready || loadError || blocked || habits.length === 0) return null;
  const doneCount = habits.filter((habit) => habit.done.includes(today)).length;
  return (
    <section className="mt-4 rounded-2xl bg-card p-4 shadow-line" aria-label="Today's habits" data-today-habits>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">
          Today's habits <span className="text-muted">· {doneCount} of {habits.length}</span>
        </h3>
        <button type="button" onClick={onOpen} className="min-h-9 text-sm text-muted underline underline-offset-2 hover:text-ink">
          Open Habits
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {habits.map((habit) => {
          const on = habit.done.includes(today);
          return (
            <button
              key={habit.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setData({
                  habits: habits.map((item) =>
                    item.id !== habit.id ? item : { ...item, done: on ? item.done.filter((day) => day !== today) : [...item.done, today] },
                  ),
                })
              }
              className={cn(
                "inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border px-3 text-sm",
                on ? "border-pine bg-pine text-paper" : "border-line bg-paper text-ink hover:border-pine",
              )}
            >
              <span aria-hidden>{on ? "✓" : "○"}</span>
              <span className="min-w-0 truncate">{habit.name || "Habit"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
