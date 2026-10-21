/** Board's data rules, kept apart from the page so they can be tested. */

export type BoardCard = { id: string; title: string };
export type BoardColumn = { id: string; title: string; cards: BoardCard[] };

/** The one limit: cards per column. Adding and moving both respect it. */
export const MAX_CARDS_PER_COLUMN = 40;

export const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: "todo", title: "To do", cards: [] },
  { id: "doing", title: "Doing", cards: [] },
  { id: "done", title: "Done", cards: [] },
];

/**
 * The saved columns, with every well-formed card kept. A column saved with
 * more than the limit keeps all its cards; it only refuses new ones.
 */
export function asColumns(value: unknown): BoardColumn[] {
  if (!Array.isArray(value) || value.length !== 3) return DEFAULT_COLUMNS;
  const columns = value.map((column) => {
    if (!column || typeof column !== "object") return null;
    const raw = column as Partial<BoardColumn>;
    if (typeof raw.id !== "string" || typeof raw.title !== "string" || !Array.isArray(raw.cards)) return null;
    const cards = raw.cards.filter(
      (card): card is BoardCard => !!card && typeof card.id === "string" && typeof card.title === "string",
    );
    return { id: raw.id, title: raw.title, cards };
  });
  if (columns.some((column) => column == null)) return DEFAULT_COLUMNS;
  return columns as BoardColumn[];
}

export function fullMessage(column: BoardColumn): string {
  return `“${column.title.trim() || "This column"}” is full (${MAX_CARDS_PER_COLUMN} cards). Move or remove a card there first.`;
}

export type BoardChange = { ok: true; columns: BoardColumn[] } | { ok: false; column: string; message: string };

export function addCard(columns: BoardColumn[], index: number, card: BoardCard): BoardChange {
  const column = columns[index];
  if (!column) return { ok: false, column: "", message: "That column was not found." };
  if (column.cards.length >= MAX_CARDS_PER_COLUMN) return { ok: false, column: column.id, message: fullMessage(column) };
  return { ok: true, columns: columns.map((col, i) => (i === index ? { ...col, cards: [...col.cards, card] } : col)) };
}

export function moveCard(columns: BoardColumn[], from: number, cardId: string, direction: -1 | 1): BoardChange {
  const to = from + direction;
  const card = columns[from]?.cards.find((item) => item.id === cardId);
  if (!card || to < 0 || to >= columns.length) return { ok: false, column: columns[from]?.id ?? "", message: "That card cannot move there." };
  if (columns[to].cards.length >= MAX_CARDS_PER_COLUMN) return { ok: false, column: columns[from].id, message: fullMessage(columns[to]) };
  return {
    ok: true,
    columns: columns.map((column, index) => {
      if (index === from) return { ...column, cards: column.cards.filter((item) => item.id !== cardId) };
      if (index === to) return { ...column, cards: [...column.cards, card] };
      return column;
    }),
  };
}
