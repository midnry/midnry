import { canOpenApp } from "@/lib/access";

/**
 * Remind's Pass views. Board, Pulse and Habits used to be separate Pass apps;
 * they now live inside Remind (which stays free) and keep reading the same
 * saved documents, under their old slugs, so nobody's cards, rounds or ticks
 * are lost. The server checks the Pass for those documents too (see
 * src/lib/merged-docs.ts and the gate in src/lib/cove.functions.ts).
 */
export type PassViewKind = "board" | "focus" | "habits";

export const PASS_VIEWS: Record<PassViewKind, { name: string; doc: string; what: string }> = {
  board: {
    // Called "Card board" on screen so it isn't mixed up with the List / Board / Month layout of your tasks.
    // The ?view=board link and the saved "board" document keep their old names.
    name: "Card board",
    doc: "board",
    what: "A separate board of cards, not linked to your tasks: three columns you move cards across, from to do to done. Rename the columns to suit the work.",
  },
  focus: {
    name: "Focus",
    doc: "pulse",
    what: "A focus timer: twenty-five minutes on, five off. Start a round from any task.",
  },
  habits: {
    name: "Habits",
    doc: "habits",
    what: "Up to eight habits, ticked day by day, with today’s habits right next to Today.",
  },
};

export const PASS_VIEW_KINDS = Object.keys(PASS_VIEWS) as PassViewKind[];

export function isPassView(value: unknown): value is PassViewKind {
  return typeof value === "string" && Object.hasOwn(PASS_VIEWS, value);
}

/** The same rule as every Pass app on the site: the Pass, or an admin. */
export function passViewsOpen(hasPass: boolean, isAdmin = false): boolean {
  return canOpenApp({ tier: "pass" }, hasPass, isAdmin);
}

/** Views a link can open with ?view= on /apps/tasks. */
export const LINKABLE_VIEWS = ["today", "upcoming", "inbox", "done", "stats", "settings", ...PASS_VIEW_KINDS] as const;
export type LinkableView = (typeof LINKABLE_VIEWS)[number];

export function linkableView(value: unknown): LinkableView | undefined {
  return typeof value === "string" && (LINKABLE_VIEWS as readonly string[]).includes(value) ? (value as LinkableView) : undefined;
}

/** `?view=` for /apps/$slug and /discover/$slug: a short lowercase word, or nothing. */
export function viewParam(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-z][a-z-]{0,23}$/.test(value) ? value : undefined;
}

/**
 * `?add=` on /apps/tasks: text to put in Remind's add box (from "Add to Remind"
 * in Bills, Visits and Shifts). One line, at most 300 characters (the box's own
 * limit), or nothing. It only fills the box; the person still presses Add.
 */
export function addParam(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  return text || undefined;
}
