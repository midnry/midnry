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
  // Neither saved a document; kept so old usage rows keep a name in the stats and old links stay valid.
  "rumor-check": { tier: "free", name: "Scam check: Claims checklist (was Claims)" },
  clauses: { tier: "free", name: "Agreement: Starting clauses (was Clauses)" },
  // The study apps, now the Study space (free). Only Lab and Quiz ever saved a document; the Study
  // space copies those in once (src/lib/study.ts) and only reads them. Never remove these.
  anatomy: { tier: "free", name: "Study space: Anatomy deck (was Anatomy)" },
  "clinic-quiz": { tier: "free", name: "Study space: Cases (was Cases)" },
  "law-drill": { tier: "free", name: "Study space: Drill (was Drill)" },
  "quiz-maker": { tier: "free", name: "Study space: Practice (was Quiz)" },
  "lab-notes": { tier: "free", name: "Study space: Lab write-ups (was Lab)" },
  citations: { tier: "free", name: "Study space: References (was Citations)" },
  "legal-cite": { tier: "free", name: "Study space: References, law (was Cite)" },
  "formula-sheet": { tier: "free", name: "Study space: Formula sheet (was Formulas)" },
  // The AI writing apps, now modes of the Writing studio (free). The studio copies each one's saved
  // boxes in once (src/lib/studio.server.ts); the old documents are only read. Never remove these.
  "cold-email": { tier: "free", name: "Writing studio: Outreach (was Outreach)" },
  "ad-copy": { tier: "free", name: "Writing studio: Ads (was Ads)" },
  captions: { tier: "free", name: "Writing studio: Captions (was Captions)" },
  listing: { tier: "free", name: "Writing studio: Listing (was Listing)" },
  letters: { tier: "free", name: "Writing studio: Letters (was Letters)" },
  lesson: { tier: "free", name: "Writing studio: Lesson (was Lesson)" },
  remarks: { tier: "free", name: "Writing studio: Remarks (was Remarks)" },
  outliner: { tier: "free", name: "Writing studio: Outline (was Outline)" },
  digest: { tier: "free", name: "Writing studio: Digest (was Digest)" },
  explainer: { tier: "free", name: "Writing studio: Explain (was Explain)" },
  "bug-scan": { tier: "free", name: "Writing studio: Bugs (was Bugs)" },
  "case-brief": { tier: "free", name: "Writing studio: Case brief (was Case brief)" },
  "contract-scan": { tier: "free", name: "Writing studio: Contract (was Contract)" },
  "soap-note": { tier: "free", name: "Writing studio: SOAP notes (was Notes)" },
  readme: { tier: "free", name: "Writing studio: README (was README)" },
};

export function mergedDoc(slug: string): { tier: AppTier; name: string } | undefined {
  return Object.hasOwn(MERGED_DOCS, slug) ? MERGED_DOCS[slug] : undefined;
}

/** The access a saved document needs: its app's tier, or the merged app's. */
export function docTier(slug: string): AppTier | undefined {
  return getApp(slug)?.tier ?? mergedDoc(slug)?.tier;
}
