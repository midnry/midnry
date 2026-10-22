import type { AppDef } from "@/lib/catalog";

/** Short, plain-words pitches for the apps people reach for most. Others use their blurb. */
export const PITCHES: Record<string, string> = {
  tasks: "Reminders in plain words. Type “pay rent every 25th” and it just works.",
  apply: "Paste a job advert, see what your CV covers and what it’s missing, then apply on LinkedIn.",
  cycle: "A simple period tracker. Know when your next period should start.",
  ledger: "Log what you spend and see where the month went, with Budget and simple Pocket views.",
  invoice: "Invoices, quotes and proposals for client work: numbered, searchable, ready to print.",
  split: "Split any bill fairly in seconds, tip included.",
  scratch: "A quick notepad that saves itself to your account.",
  planner: "A year of social media posts, planned around the holidays your customers keep.",
  glyph: "The full JSON workbench: a collapsible tree, the path of any value, minify, sorted keys and big files.",
  "json-fmt": "A simple free JSON check: format it, or see the exact line and column where it breaks.",  contrast: "Check two colours are easy to read together.",
  compressor: "Shrink a video right on your device, no upload needed.",
};

export function pitchFor(app: AppDef): string {
  return PITCHES[app.slug] ?? app.blurb;
}
