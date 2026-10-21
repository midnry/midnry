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
};

export function aliasOf(slug: string): AppAlias | undefined {
  return Object.hasOwn(APP_ALIASES, slug) ? APP_ALIASES[slug] : undefined;
}

/** The old slugs that now lead to `slug`. */
export function aliasesTo(slug: string): string[] {
  return Object.keys(APP_ALIASES).filter((old) => APP_ALIASES[old].to === slug);
}
