import type { TagId } from "@/lib/sections";

// Built-in apps whose tags differ from their genre section's default
// (see defaultTagOf). Every other built-in app gets its section's tag.
export const TAG_OVERRIDES: Record<string, readonly TagId[]> = {
  cycle: ["everyday"],
  scratch: ["professionals", "students", "everyday"],
  tasks: ["professionals", "students", "everyday"],
  split: ["everyday"],
  ledger: ["business", "professionals", "everyday"],
  invoice: ["business", "professionals"],
  study: ["students", "professionals"],
  planner: ["business", "professionals"],
  apply: ["professionals", "students"],
  compressor: ["professionals", "everyday"],
  units: ["students", "everyday"],
  write: ["business", "professionals", "students", "everyday"],
  paye: ["business", "professionals"],
  reconcile: ["business", "professionals"],
  statements: ["business", "students"],
  breakeven: ["business", "students"],
  "service-terms": ["business", "professionals"],
};

/**
 * Built-in apps that help anyone and do not belong to one subject. Their
 * catalogue genre is only where they were first filed (Remind under
 * Developers, Cycle under Medicine & Nursing, Split under Accountants), so
 * browsing lists them by their tags instead of under that one subject, and
 * never labels them with it.
 */
export const GENERAL_APPS: ReadonlySet<string> = new Set([
  "tasks",
  "scratch",
  "split",
  "ledger",
  "cycle",
  "apply",
]);

/**
 * Other subject shelves (section ids in src/lib/sections.ts) an app is listed
 * on besides its own genre, because it holds that subject's tools. The Study
 * space (filed under Sciences) took in the anatomy, case and law drills,
 * citations, lab notes, formulas and the quiz maker, so it shows on those
 * subjects' shelves too.
 */
export const FIELD_TAGS: Record<string, readonly string[]> = {
  study: ["medicine", "engineering", "law", "arts", "teaching"],
  // The Writing studio (filed under Sales & Marketing) holds the AI writing modes those shelves had:
  // Case brief, Explain and Bugs, Outline and Digest, Lesson and Remarks, SOAP notes, README,
  // Contract and Letters, Captions, and Listing.
  write: ["law", "computing", "arts", "teaching", "clinic", "developers", "practice", "beauty", "sellers"],
};
