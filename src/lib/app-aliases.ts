/**
 * Apps that were merged into another app. Old links (/apps/<old>, /discover/<old>)
 * redirect to the app that now holds them; `view` opens the right part of it.
 * Saved data stays where it is: the receiving app reads the old documents.
 */
export type AppAlias = { to: string; view?: string };

export const APP_ALIASES: Record<string, AppAlias> = {
  // Board, Pulse and Habits are Pass views inside Remind (free); same saved documents.
  board: { to: "tasks", view: "board" },
  pulse: { to: "tasks", view: "focus" },
  habits: { to: "tasks", view: "habits" },
  // Budget and Pocket are views inside Ledger (Pass); old entries are read and copied in (src/lib/merges.ts).
  budget: { to: "ledger", view: "budget" },
  pocket: { to: "ledger", view: "pocket" },
  // Free merges: the receiving app stays free and offers to copy the old entries in.
  "client-terms": { to: "service-terms" },
  "price-list": { to: "catalog" },
  produce: { to: "farm-sales", view: "prices" },
  "qr-menu": { to: "menu", view: "qr" },
  // Quote and Proposal live inside Invoice (free); their saved documents are copied in once (src/lib/client-work.ts).
  quote: { to: "invoice", view: "quotes" },
  proposal: { to: "invoice", view: "proposals" },
  // Eight study apps live in the Study space (free); Lab and Quiz documents are copied in once (src/lib/study.ts).
  anatomy: { to: "study", view: "cards" },
  "clinic-quiz": { to: "study", view: "practice" },
  "law-drill": { to: "study", view: "practice" },
  "quiz-maker": { to: "study", view: "practice" },
  "lab-notes": { to: "study", view: "notes" },
  citations: { to: "study", view: "references" },
  "legal-cite": { to: "study", view: "law" },
  "formula-sheet": { to: "study", view: "formulas" },
  // The AI writing apps are modes of the Writing studio (free); their saved boxes are copied in once (src/lib/studio.ts).
  "cold-email": { to: "write", view: "outreach" },
  "ad-copy": { to: "write", view: "ads" },
  captions: { to: "write", view: "captions" },
  listing: { to: "write", view: "listing" },
  letters: { to: "write", view: "letters" },
  lesson: { to: "write", view: "lesson" },
  remarks: { to: "write", view: "remarks" },
  outliner: { to: "write", view: "outline" },
  digest: { to: "write", view: "digest" },
  explainer: { to: "write", view: "explain" },
  "bug-scan": { to: "write", view: "bugs" },
  "case-brief": { to: "write", view: "case-brief" },
  "contract-scan": { to: "write", view: "contract" },
  "soap-note": { to: "write", view: "soap" },
  readme: { to: "write", view: "readme" },
};

export function aliasOf(slug: string): AppAlias | undefined {
  return Object.hasOwn(APP_ALIASES, slug) ? APP_ALIASES[slug] : undefined;
}

/** The old slugs that now lead to `slug`. */
export function aliasesTo(slug: string): string[] {
  return Object.keys(APP_ALIASES).filter((old) => APP_ALIASES[old].to === slug);
}
