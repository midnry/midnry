import { useState, type FormEvent } from "react";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextInput } from "@/components/ui";
import { nid, ToolFrame, ToolStatus } from "@/components/tools/shared";

type Card = { id: string; title: string };
type Column = { id: string; title: string; cards: Card[] };
type BoardDoc = { columns: Column[] };

const FALLBACK: BoardDoc = {
  columns: [
    { id: "todo", title: "To do", cards: [] },
    { id: "doing", title: "Doing", cards: [] },
    { id: "done", title: "Done", cards: [] },
  ],
};

function asColumns(value: unknown): Column[] {
  if (!Array.isArray(value) || value.length !== 3) return FALLBACK.columns;
  const columns = value.map((column) => {
    if (!column || typeof column !== "object") return null;
    const raw = column as Partial<Column>;
    if (typeof raw.id !== "string" || typeof raw.title !== "string" || !Array.isArray(raw.cards)) return null;
    const cards = raw.cards
      .filter(
        (card): card is Card =>
          !!card && typeof card.id === "string" && typeof card.title === "string",
      )
      .slice(0, 40);
    return { id: raw.id, title: raw.title, cards };
  });
  if (columns.some((column) => column == null)) return FALLBACK.columns;
  return columns as Column[];
}

export function BoardTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("board", FALLBACK);
  const columns = asColumns(data.columns);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function commit(next: Column[]) {
    setData({ columns: next });
  }

  function addCard(index: number, event: FormEvent) {
    event.preventDefault();
    const column = columns[index];
    const title = (drafts[column.id] ?? "").trim();
    if (!title) return;
    const total = columns.reduce((sum, col) => sum + col.cards.length, 0);
    if (total >= 80) return;
    const next = columns.map((col, i) =>
      i === index ? { ...col, cards: [...col.cards, { id: nid(), title }] } : col,
    );
    setDrafts((prev) => ({ ...prev, [column.id]: "" }));
    commit(next);
  }

  function move(from: number, cardId: string, direction: -1 | 1) {
    const to = from + direction;
    if (to < 0 || to >= columns.length) return;
    const card = columns[from].cards.find((item) => item.id === cardId);
    if (!card) return;
    commit(
      columns.map((column, index) => {
        if (index === from) return { ...column, cards: column.cards.filter((item) => item.id !== cardId) };
        if (index === to) return { ...column, cards: [...column.cards, card] };
        return column;
      }),
    );
  }

  return (
    <ToolFrame slug="board" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((column, index) => (
            <section key={column.id} className="rounded-3xl bg-card p-4 shadow-line sm:p-5">
              <TextInput
                value={column.title}
                aria-label={`Column ${index + 1} name`}
                maxLength={32}
                onChange={(event) =>
                  commit(
                    columns.map((col, i) => (i === index ? { ...col, title: event.target.value } : col)),
                  )
                }
              />
              <ul className="mt-3 space-y-3">
                {column.cards.map((card) => (
                  <li key={card.id} className="rounded-2xl bg-paper p-3">
                    <TextInput
                      value={card.title}
                      aria-label="Card"
                      maxLength={140}
                      onChange={(event) =>
                        commit(
                          columns.map((col, i) =>
                            i === index
                              ? {
                                  ...col,
                                  cards: col.cards.map((item) =>
                                    item.id === card.id ? { ...item, title: event.target.value } : item,
                                  ),
                                }
                              : col,
                          ),
                        )
                      }
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button tone="quiet" disabled={index === 0} onClick={() => move(index, card.id, -1)}>
                        Left
                      </Button>
                      <Button
                        tone="quiet"
                        disabled={index === columns.length - 1}
                        onClick={() => move(index, card.id, 1)}
                      >
                        Right
                      </Button>
                      <Button
                        tone="quiet"
                        onClick={() =>
                          commit(
                            columns.map((col, i) =>
                              i === index
                                ? { ...col, cards: col.cards.filter((item) => item.id !== card.id) }
                                : col,
                            ),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <form onSubmit={(event) => addCard(index, event)} className="mt-3 flex gap-2">
                <TextInput
                  value={drafts[column.id] ?? ""}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [column.id]: event.target.value }))}
                  placeholder="New card"
                  aria-label={`Add a card to ${column.title || "column"}`}
                  maxLength={140}
                />
                <Button type="submit" tone="primary">
                  Add
                </Button>
              </form>
            </section>
          ))}
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
