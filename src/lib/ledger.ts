import { DOC_WARN_SHARE, docLimit } from "@/lib/doc-limits";

/** Ledger's data rules, kept apart from the page so they can be tested. */

export type LedgerEntry = {
  id: string;
  label: string;
  cents: number;
  category: string;
  date: string;
};

/** Every well-formed saved entry, in saved order. Nothing is capped. */
export function asEntries(value: unknown): LedgerEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is LedgerEntry =>
      !!entry &&
      typeof entry === "object" &&
      typeof (entry as LedgerEntry).id === "string" &&
      typeof (entry as LedgerEntry).label === "string" &&
      typeof (entry as LedgerEntry).cents === "number" &&
      typeof (entry as LedgerEntry).category === "string" &&
      typeof (entry as LedgerEntry).date === "string",
  );
}

function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** All entries as CSV, one row each, under a header row. */
export function ledgerCsv(entries: LedgerEntry[]): string {
  const rows = [["Date", "What", "Category", "Amount"], ...entries.map((entry) => [entry.date, entry.label, entry.category, (entry.cents / 100).toFixed(2)])];
  return rows.map((row) => row.map(cell).join(",")).join("\n");
}

export type LedgerRoom = { size: number; limit: number; full: boolean; nearlyFull: boolean };

/** How much of the saved-document limit a ledger document uses. */
export function ledgerRoom(doc: object): LedgerRoom {
  const size = JSON.stringify(doc).length;
  const limit = docLimit("ledger");
  return { size, limit, full: size > limit, nearlyFull: size > limit * DOC_WARN_SHARE };
}
