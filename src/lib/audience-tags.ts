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
  planner: ["business", "professionals"],
  apply: ["professionals", "students"],
  compressor: ["professionals", "everyday"],
  units: ["students", "everyday"],
  letters: ["professionals", "everyday"],
  paye: ["business", "professionals"],
  reconcile: ["business", "professionals"],
  statements: ["business", "students"],
  breakeven: ["business", "students"],
  "cold-email": ["business", "professionals"],
  "ad-copy": ["business", "professionals"],
  "service-terms": ["business", "professionals"],
  digest: ["professionals", "students"],
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

// Sub-filters for later (e.g. "law", "retail", "teachers"). Empty for now.
export const FIELD_TAGS: Record<string, readonly string[]> = {};
