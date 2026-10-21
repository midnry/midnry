import { getApp, type AppTier } from "@/lib/catalog";

/**
 * Saved documents of apps that were merged into another app (see
 * src/lib/app-aliases.ts). The app left the catalogue, but its document in
 * app_documents is still read and saved, under its old slug, by the app that
 * holds it now. `tier` is the access that document needs; `name` labels old
 * usage rows in the admin's stats.
 */
export const MERGED_DOCS: Record<string, { tier: AppTier; name: string }> = {
  board: { tier: "pass", name: "Remind: Board (was Board)" },
  pulse: { tier: "pass", name: "Remind: Focus (was Pulse)" },
  habits: { tier: "pass", name: "Remind: Habits (was Habits)" },
  // Invoice (free) copies these in once; the old documents are only read.
  quote: { tier: "free", name: "Invoice: Quotes (was Quote)" },
  proposal: { tier: "free", name: "Invoice: Proposals (was Proposal)" },
  // Free apps merged elsewhere (src/lib/merges.ts). Their old documents stay free to read and
  // export, even Budget and Pocket inside Ledger (Pass); the receiving app only copies from them.
  budget: { tier: "free", name: "Ledger: Budget (was Budget)" },
  pocket: { tier: "free", name: "Ledger: Pocket (was Pocket)" },
  "client-terms": { tier: "free", name: "Agreement (was Terms)" },
  "price-list": { tier: "free", name: "Catalog (was Prices)" },
  produce: { tier: "free", name: "Farm sales: Price log (was Crop prices)" },
  "qr-menu": { tier: "free", name: "Menu: QR code (was QR menu)" },
};

export function mergedDoc(slug: string): { tier: AppTier; name: string } | undefined {
  return Object.hasOwn(MERGED_DOCS, slug) ? MERGED_DOCS[slug] : undefined;
}

/** The access a saved document needs: its app's tier, or the merged app's. */
export function docTier(slug: string): AppTier | undefined {
  return getApp(slug)?.tier ?? mergedDoc(slug)?.tier;
}
