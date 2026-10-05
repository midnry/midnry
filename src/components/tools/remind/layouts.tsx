import { useState } from "react";
import { isoOf, prettyDate, prettyTime } from "@/lib/remind/dates";
import { occurrences } from "@/lib/remind/recur";
import type { Priority } from "@/lib/remind/model";
import { Button, cn } from "@/components/ui";
import { PRIORITY_STYLE, type Item, type ItemPatch } from "./items";

export function Board({
  items,
  sections,
  today,
  onToggle,
  onOpen,
  onMove,
}: {
  items: Item[];
  /** Sections of the project being shown, or null to group by priority. */
  sections: { id: string; name: string }[] | null;
  today: string;
  onToggle: (item: Item) => void;
  onOpen: (key: string) => void;
  onMove: (item: Item, change: ItemPatch) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const bySection = Boolean(sections && sections.length);
  const columns = bySection
    ? [{ id: "", name: "No section" }, ...(sections ?? [])]
    : ([1, 2, 3, 4] as const).map((priority) => ({ id: String(priority), name: `Priority ${priority}` }));

  return (
    <div className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
      {columns.map((column) => {
        const cards = items.filter((item) => (bySection ? item.sectionId === column.id : String(item.priority) === column.id));
        return (
          <section
            key={column.id || "none"}
            className="w-72 shrink-0 snap-start rounded-2xl bg-paper-2 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const item = items.find((entry) => entry.key === dragging);
              setDragging(null);
              if (!item) return;
              if (bySection) onMove(item, { sectionId: column.id });
              else onMove(item, { priority: Number(column.id) as Priority });
            }}
          >
            <h3 className="flex items-center justify-between px-1 text-sm font-medium">
              {column.name}
              <span className="text-xs text-muted">{cards.length}</span>
            </h3>
            <ul className="mt-2 flex min-h-12 flex-col gap-2">
              {cards.map((item) => (
                <li
                  key={item.key}
                  draggable
                  onDragStart={() => setDragging(item.key)}
                  className={cn("rounded-xl border-l-4 bg-card p-3 shadow-line", PRIORITY_STYLE[item.priority].ring)}
                >
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 size-4 accent-pine" checked={item.done} onChange={() => onToggle(item)} aria-label={`Complete ${item.title}`} />
                    <button type="button" onClick={() => onOpen(item.key)} className="min-w-0 text-left text-sm">
                      <span className="block break-words">{item.title}</span>
                      {item.due ? (
                        <span className={cn("mt-1 block text-xs", item.due < today ? "text-fail" : "text-muted")}>
                          {prettyDate(item.due, today)}
                          {item.time ? ` ${prettyTime(item.time)}` : ""}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function shiftMonth(cursor: string, delta: number): string {
  const [year, month] = cursor.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function Month({ items, today, onOpen }: { items: Item[]; today: string; onOpen: (key: string) => void }) {
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [year, month] = cursor.split("-").map(Number);
  const first = new Date(year, (month || 1) - 1, 1);
  const start = new Date(first);
  const weekday = start.getDay();
  start.setDate(1 - (weekday === 0 ? 6 : weekday - 1));
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return isoOf(date);
  });
  const from = days[0];
  const to = days[days.length - 1];
  const byDay = new Map<string, Item[]>();
  for (const item of items) {
    if (item.done || !item.due) continue;
    for (const iso of occurrences(item.due, item.recur, from, to, 42)) {
      byDay.set(iso, [...(byDay.get(iso) ?? []), item]);
    }
  }
  const label = first.toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button tone="quiet" onClick={() => setCursor(shiftMonth(cursor, -1))} aria-label="Previous month">
          ←
        </Button>
        <p className="font-medium">{label}</p>
        <Button tone="quiet" onClick={() => setCursor(shiftMonth(cursor, 1))} aria-label="Next month">
          →
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <div key={index} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((iso) => {
          const inMonth = iso.slice(0, 7) === cursor;
          const list = byDay.get(iso) ?? [];
          return (
            <div key={iso} className={cn("min-h-16 min-w-0 rounded-lg bg-card p-1 shadow-line sm:min-h-24", !inMonth && "opacity-40", iso === today && "ring-2 ring-pine")}>
              <p className="text-xs text-muted">{Number(iso.slice(8))}</p>
              {list.slice(0, 3).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onOpen(item.key)}
                  className={cn("mt-0.5 block w-full truncate rounded border-l-2 bg-paper-2 px-1 text-left text-[11px] sm:text-xs", PRIORITY_STYLE[item.priority].ring)}
                >
                  {item.title}
                </button>
              ))}
              {list.length > 3 ? <p className="text-[11px] text-muted">+{list.length - 3}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
