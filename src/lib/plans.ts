import { APPS, type AppDef, type AppTier } from "@/lib/catalog";
import { PASS_PRICE_LABEL } from "@/lib/access";

/**
 * The one description of who can open what, used everywhere on the site.
 * Derived from the catalogue (`tier`) and the access rule in `canOpenApp`:
 * a free app opens for anyone signed in; a Pass app, and every app people add
 * after review, opens with Midnry Pass. Remind also has Pass-only features.
 * Billing (verified in paystack.server.ts / billing.functions.ts): $5 USD a
 * month through Paystack, renews monthly, and canceling stops the renewal
 * while access stays until the end of the month already paid.
 */
export const FREE_LABEL = "Free with an account";
export const PASS_LABEL = "Included with Midnry Pass";
export const PASS_PRICE_LINE = `${PASS_PRICE_LABEL} a month`;
export const BILLING_FACTS = [
  `${PASS_PRICE_LABEL} (US dollars) a month, charged to a card through Paystack.`,
  "Renews each month until you cancel.",
  "Cancel any time: access stays until the end of the month you already paid for.",
] as const;

export const FREE_APPS: readonly AppDef[] = APPS.filter((app) => app.tier === "free");
export const PASS_APPS: readonly AppDef[] = APPS.filter((app) => app.tier === "pass");

export function accessLabel(tier: AppTier): string {
  return tier === "free" ? FREE_LABEL : PASS_LABEL;
}

/** Pass-only features inside apps that are otherwise free. */
export const PASS_FEATURES: Record<string, string> = {
  tasks: "shared projects, assigning tasks, file attachments, a calendar link, a Board, a Focus timer and Habits",
};

/** One sentence that explains the two plans, with real numbers. */
export const PLAN_SUMMARY = `${FREE_APPS.length} apps are free with an account. Midnry Pass, ${PASS_PRICE_LINE}, adds ${PASS_APPS.length} more tools, extra features in Remind, and apps other makers add after review.`;

/**
 * What the Pass adds outside the apps. Checked against the game:
 * public/games/outpost-finishes.js lists "Midnry Signal" (id "signal") as the
 * one finish of kind "pass", and outpost-store.js unlocks it while the account
 * has Midnry Pass. Finishes are cosmetic and never change a weapon.
 */
export const PASS_EXTRAS = {
  outpostFinish: {
    name: "Midnry Signal",
    game: "Outpost Zero",
    look: "black-and-gold",
    colors: ["#111214", "#d9a441"],
    line: "Midnry Signal, a black-and-gold weapon finish in Outpost Zero",
  },
} as const;
