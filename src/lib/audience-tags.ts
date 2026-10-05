import type { TagId } from "@/lib/sections";

// Built-in apps whose tags differ from their genre section's default
// (see defaultTagOf). Every other built-in app gets its section's tag.
export const TAG_OVERRIDES: Record<string, readonly TagId[]> = {
  cycle: ["everyday"],
  scratch: ["professionals", "students", "everyday"],
  pulse: ["professionals", "students", "everyday"],
  tasks: ["professionals", "students", "everyday"],
  habits: ["students", "everyday"],
  split: ["everyday"],
  ledger: ["business", "professionals", "everyday"],
  board: ["professionals", "students"],
  invoice: ["business", "professionals"],
  planner: ["business", "professionals"],
  apply: ["professionals", "students"],
  compressor: ["professionals", "everyday"],
  units: ["students", "everyday"],
  "qr-menu": ["business", "everyday"],
  budget: ["professionals", "everyday"],
  letters: ["professionals", "everyday"],
  paye: ["business", "professionals"],
  reconcile: ["business", "professionals"],
  statements: ["business", "students"],
  breakeven: ["business", "students"],
  "cold-email": ["business", "professionals"],
  "ad-copy": ["business", "professionals"],
  proposal: ["business", "professionals"],
  quote: ["business", "professionals"],
  "service-terms": ["business", "professionals"],
  "client-terms": ["business", "professionals"],
  digest: ["professionals", "students"],
};

// Sub-filters for later (e.g. "law", "retail", "teachers"). Empty for now.
export const FIELD_TAGS: Record<string, readonly string[]> = {};
