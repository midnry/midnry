import { useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, cn, TextInput } from "@/components/ui";
import { nid, todayISO, ToolFrame, ToolStatus } from "@/components/tools/shared";

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

export function HabitsTool() {
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
    <ToolFrame slug="habits" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium">
            {format(days[0], "MMM d")} – {format(days[6], "MMM d")}
          </p>
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
    </ToolFrame>
  );
}
