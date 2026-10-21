import type { LedgerEntry } from "@/lib/ledger";

/**
 * Apps merged into another app (Phase 2, approved by the owner), and the rules
 * for bringing their saved documents across.
 *
 * Nothing here deletes or changes an old document. The old app's document stays
 * in app_documents under its old slug; the receiving app reads it (read-only,
 * see merged-docs.functions.ts) and COPIES what the person chooses to bring in.
 *
 * Tier rule: if any app in a merge was on Midnry Pass, the combined app is Pass;
 * if all were free, it stays free. `tiers` records what each app was before the
 * merge so the rule can be tested against the catalogue.
 */

export type Tier = "free" | "pass";

export type Merge = {
  into: string;
  /** Tier of every app in the merge before it, the receiving app included. */
  tiers: Record<string, Tier>;
  /** Old slugs whose saved documents the receiving app can read. */
  reads: readonly string[];
};

export const MERGES: readonly Merge[] = [
  { into: "ledger", tiers: { ledger: "pass", budget: "free", pocket: "free" }, reads: ["budget", "pocket"] },
  { into: "service-terms", tiers: { "service-terms": "free", "client-terms": "free" }, reads: ["client-terms"] },
  { into: "catalog", tiers: { catalog: "free", "price-list": "free" }, reads: ["price-list"] },
  { into: "farm-sales", tiers: { "farm-sales": "free", produce: "free" }, reads: ["produce"] },
  // QR menu never saved anything (it made a code from a link each time), so there is nothing to read.
  { into: "menu", tiers: { menu: "free", "qr-menu": "free" }, reads: [] },
];

export function mergedTier(merge: Merge): Tier {
  return Object.values(merge.tiers).includes("pass") ? "pass" : "free";
}

/** Old slugs whose documents may be read (never written) by their owner. */
export const READABLE_OLD_DOCS: ReadonlySet<string> = new Set(MERGES.flatMap((merge) => merge.reads));

/** The tier an old slug's app had before its merge, if it was part of one of these merges. */
export function oldDocTier(slug: string): Tier | undefined {
  for (const merge of MERGES) if (merge.into !== slug && Object.hasOwn(merge.tiers, slug)) return merge.tiers[slug];
  return undefined;
}

export function isReadableOldDoc(slug: unknown): slug is string {
  return typeof slug === "string" && READABLE_OLD_DOCS.has(slug);
}

export type Row = Record<string, string>;

/** The rows of a saved tracker document ({ rows: [...] }), whatever else it holds. */
export function rowsOf(payload: string | null | undefined): Row[] {
  if (!payload) return [];
  try {
    const doc = JSON.parse(payload) as { rows?: unknown };
    if (!doc || !Array.isArray(doc.rows)) return [];
    return doc.rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row))
      .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value == null ? "" : String(value)])))
      .filter((row) => Object.values(row).some((value) => value.trim()));
  } catch {
    return [];
  }
}

/** The values of a saved template document ({ values: {...} }). */
export function valuesOf(payload: string | null | undefined): Row {
  if (!payload) return {};
  try {
    const doc = JSON.parse(payload) as { values?: unknown };
    if (!doc || !doc.values || typeof doc.values !== "object" || Array.isArray(doc.values)) return {};
    return Object.fromEntries(
      Object.entries(doc.values as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string" && value.trim())
        .map(([key, value]) => [key, value as string]),
    );
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------- Ledger

/** "income" / "cost" as Budget and Pocket saved them (free text; matched like they showed it). */
export function sideOf(row: Row): "in" | "out" | null {
  if (/income/i.test(row.side || "")) return "in";
  if (/cost/i.test(row.side || "")) return "out";
  return null;
}

/** An old Budget/Pocket amount ("1,200.50", "₦500") in cents, or null. */
export function amountCents(raw: string | undefined): number | null {
  const cleaned = (raw ?? "").trim().replace(/[$₦£€₵₹,\s]|KSh/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const cents = Math.round(Math.abs(Number(cleaned)) * 100);
  return Number.isFinite(cents) ? cents : null;
}

export type MoneySource = "budget" | "pocket";

export type LedgerImport = {
  /** New entries to add, already marked with where they came from. */
  entries: LedgerEntry[];
  /** Rows already brought in before (matched by their mark), left alone. */
  already: number;
  /** Rows with no readable amount; they stay in the old document only. */
  skipped: number;
};

/**
 * Copies of the old Budget or Pocket rows as Ledger entries. Each copy is
 * marked `from: "<source>#<row number>"` so running the import again adds
 * nothing twice. Old rows had no date, so copies are dated `today`; rows with
 * no side are counted as money out, as Ledger has always done.
 */
export function ledgerImport(source: MoneySource, rows: Row[], existing: LedgerEntry[], today: string, makeId: () => string): LedgerImport {
  const seen = new Set(existing.map((entry) => entry.from).filter(Boolean));
  const entries: LedgerEntry[] = [];
  let already = 0;
  let skipped = 0;
  rows.forEach((row, index) => {
    const from = `${source}#${index}`;
    if (seen.has(from)) {
      already += 1;
      return;
    }
    const cents = amountCents(row.amount);
    if (cents == null) {
      skipped += 1;
      return;
    }
    const label = (row.name || "").trim() || (source === "budget" ? "Budget line" : "Pocket line");
    const entry: LedgerEntry = { id: makeId(), label: label.slice(0, 80), cents, category: "Other", date: today, from };
    if (sideOf(row) === "in") entry.flow = "in";
    entries.push(entry);
  });
  return { entries, already, skipped };
}

/** Rows still waiting to be brought in (not yet copied, with an amount). */
export function ledgerPending(source: MoneySource, rows: Row[], existing: LedgerEntry[]): number {
  return ledgerImport(source, rows, existing, "2000-01-01", () => "x").entries.length;
}

// ---------------------------------------------------------------- Kit apps

/** How one old kit document is brought into its new app. */
export type KitImport = {
  from: string;
  /** The old app's name, as people knew it. */
  name: string;
  /** Tracker rows go to the main list, or to a view's list. Template values fill empty fields. */
  into: { rows: true } | { view: string } | { values: true };
  /** Old field id → new field id, where they differ. */
  rename?: Record<string, string>;
};

export const KIT_IMPORTS: Record<string, readonly KitImport[]> = {
  "service-terms": [{ from: "client-terms", name: "Terms", into: { values: true }, rename: { job: "work" } }],
  catalog: [{ from: "price-list", name: "Prices", into: { rows: true }, rename: { item: "name" } }],
  "farm-sales": [{ from: "produce", name: "Crop prices", into: { view: "prices" } }],
};

function renamed(row: Row, rename: Record<string, string> = {}): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [rename[key] ?? key, value]));
}

/** Tracker documents: { rows, views: { [id]: rows }, imported: { [from]: date } }. */
export type TrackerDoc = { rows?: Row[]; views?: Record<string, Row[]>; imported?: Record<string, string>; [key: string]: unknown };
/** Template documents: { values, imported }. */
export type TemplateDoc = { values?: Row; imported?: Record<string, string>; [key: string]: unknown };

/** A copy of the tracker document with the old rows appended. The old document is not touched. */
export function importTrackerRows(doc: TrackerDoc, spec: KitImport, oldRows: Row[], today: string): TrackerDoc {
  const copies = oldRows.map((row) => renamed(row, spec.rename));
  const imported = { ...(doc.imported ?? {}), [spec.from]: today };
  if ("view" in spec.into) {
    const id = spec.into.view;
    const views = { ...(doc.views ?? {}) };
    views[id] = [...(Array.isArray(views[id]) ? views[id] : []), ...copies];
    return { ...doc, views, imported };
  }
  return { ...doc, rows: [...(Array.isArray(doc.rows) ? doc.rows : []), ...copies], imported };
}

export type TemplateImport = { doc: TemplateDoc; filled: string[]; kept: { field: string; old: string }[] };

/**
 * Old values fill the fields that are empty. A field that already has a
 * different value keeps it; the old value is reported back (and stays saved in
 * the old document) so nothing is lost.
 */
export function importTemplateValues(doc: TemplateDoc, spec: KitImport, oldValues: Row, today: string): TemplateImport {
  const values: Row = { ...(doc.values ?? {}) };
  const filled: string[] = [];
  const kept: { field: string; old: string }[] = [];
  for (const [key, value] of Object.entries(renamed(oldValues, spec.rename))) {
    if (!value.trim()) continue;
    if (!values[key]?.trim()) {
      values[key] = value;
      filled.push(key);
    } else if (values[key].trim() !== value.trim()) {
      kept.push({ field: key, old: value });
    }
  }
  return { doc: { ...doc, values, imported: { ...(doc.imported ?? {}), [spec.from]: today } }, filled, kept };
}

/** CSV of tracker-style rows, under the given columns. */
export function rowsCsv(columns: { id: string; label: string }[], rows: Row[]): string {
  const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return [columns.map((column) => cell(column.label)).join(","), ...rows.map((row) => columns.map((column) => cell(row[column.id] ?? "")).join(","))].join("\n");
}
