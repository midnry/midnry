import type { AppDef } from "@/lib/catalog";

/** Short, plain-words pitches for the apps people reach for most. Others use their blurb. */
export const PITCHES: Record<string, string> = {
  tasks: "Reminders in plain words. Type “pay rent every 25th” and it just works.",
  apply: "Tailor your CV for each job in seconds, then apply on LinkedIn.",
  cycle: "A simple period tracker. Know when your next period should start.",
  ledger: "Log what you spend and see where the month went, by category.",
  invoice: "A clean invoice with line items and tax, ready to print or send.",
  split: "Split any bill fairly in seconds, tip included.",
  scratch: "A quick notepad that saves itself to your account.",
  pulse: "A focus timer that keeps you working in short, calm bursts.",
  board: "A simple board to move your work from to-do to done.",
  habits: "Build better habits, one tick a day.",
  planner: "A year of social media posts, planned around the holidays your customers keep.",
  glyph: "Make messy JSON readable, or find exactly where it broke.",
  contrast: "Check two colours are easy to read together.",
  compressor: "Shrink a video right on your device, no upload needed.",
};

export function pitchFor(app: AppDef): string {
  return PITCHES[app.slug] ?? app.blurb;
}
