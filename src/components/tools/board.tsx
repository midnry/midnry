import { useState, type FormEvent } from "react";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextInput } from "@/components/ui";
import { nid, SaveMark, ToolStatus } from "@/components/tools/shared";
import { addCard as addTo, asColumns, DEFAULT_COLUMNS, MAX_CARDS_PER_COLUMN, moveCard, type BoardColumn } from "@/lib/board";

type Column = BoardColumn;
type BoardDoc = { columns: Column[] };

const FALLBACK: BoardDoc = { columns: DEFAULT_COLUMNS };

/** Remind's Board view (a Pass feature). It keeps the "board" document Board saved before it moved into Remind. */
export function BoardPanel() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("board", FALLBACK);
  const columns = asColumns(data.columns);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // A refused add or move, shown under the column it came from.
  const [notice, setNotice] = useState<{ column: string; message: string } | null>(null);

  function commit(next: Column[]) {
    setData({ columns: next });
  }

  function addCard(index: number, event: FormEvent) {
    event.preventDefault();
    const column = columns[index];
    const title = (drafts[column.id] ?? "").trim();
    if (!title) return;
    const result = addTo(columns, index, { id: nid(), title });
    if (!result.ok) {
      setNotice({ column: result.column, message: result.message });
      return;
    }
    setNotice(null);
    setDrafts((prev) => ({ ...prev, [column.id]: "" }));
    commit(result.columns);
  }

  function move(from: number, cardId: string, direction: -1 | 1) {
    const result = moveCard(columns, from, cardId, direction);
    if (!result.ok) {
      setNotice({ column: result.column, message: result.message });
      return;
    }
    setNotice(null);
    commit(result.columns);
  }

  function remove(index: number, cardId: string) {
    setNotice(null);
    commit(
      columns.map((col, i) => (i === index ? { ...col, cards: col.cards.filter((item) => item.id !== cardId) } : col)),
    );
  }

  return (
    <div className="mt-4" data-remind-panel="board">
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="mb-3">
          <SaveMark state={saveState} />
        </div>
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
                      <Button tone="quiet" onClick={() => remove(index, card.id)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {notice?.column === column.id ? (
                <p role="alert" className="mt-3 text-sm font-medium text-fail">
                  {notice.message}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted">
                {column.cards.length > MAX_CARDS_PER_COLUMN
                  ? `${column.cards.length} cards, over the limit of ${MAX_CARDS_PER_COLUMN}. All are kept; new cards go in another column.`
                  : `${column.cards.length} of ${MAX_CARDS_PER_COLUMN} cards`}
              </p>
              <form onSubmit={(event) => addCard(index, event)} className="mt-2 flex gap-2">
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
    </div>
  );
}
