import type { AppDef } from "@/lib/catalog";

export const PASS_PRICE_CENTS = 500;
export const PASS_PRICE_LABEL = "$5";

export type AccountStatus = "active" | "canceled" | "inactive";

export type AccountState = {
  hasPass: boolean;
  status: AccountStatus;
  currentPeriodEnd: string | null;
  priceCents: number;
};

export function emptyAccount(): AccountState {
  return {
    hasPass: false,
    status: "inactive",
    currentPeriodEnd: null,
    priceCents: PASS_PRICE_CENTS,
  };
}

export function passIsOpen(
  status: string,
  periodEndIso: string | null,
  now = Date.now(),
): boolean {
  if (status !== "active" && status !== "canceled") return false;
  if (!periodEndIso) return false;
  const end = Date.parse(periodEndIso);
  return !Number.isNaN(end) && end > now;
}

export function canOpenApp(app: AppDef, hasPass: boolean): boolean {
  return app.tier === "free" || hasPass;
}
