export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDollars(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export const CURRENCIES = [
  { code: "NGN", label: "₦ Naira" },
  { code: "USD", label: "$ US dollar" },
  { code: "GBP", label: "£ Pound" },
  { code: "EUR", label: "€ Euro" },
  { code: "GHS", label: "₵ Cedi" },
  { code: "KES", label: "KSh Kenyan shilling" },
  { code: "ZAR", label: "R Rand" },
  { code: "CAD", label: "$ Canadian dollar" },
  { code: "INR", label: "₹ Rupee" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function isCurrency(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((item) => item.code === value);
}

const REGION_CURRENCY: Record<string, CurrencyCode> = {
  NG: "NGN", US: "USD", GB: "GBP", GH: "GHS", KE: "KES", ZA: "ZAR", CA: "CAD", IN: "INR",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR", BE: "EUR", AT: "EUR", FI: "EUR",
};

/** The visitor's likely currency, from their time zone or browser language. */
export function guessCurrency(): CurrencyCode {
  if (typeof navigator === "undefined") return "USD";
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone === "Africa/Lagos") return "NGN";
    if (zone === "Africa/Accra") return "GHS";
    if (zone === "Africa/Nairobi") return "KES";
    if (zone === "Africa/Johannesburg") return "ZAR";
    if (zone === "Europe/London") return "GBP";
    if (zone === "Asia/Kolkata" || zone === "Asia/Calcutta") return "INR";
  } catch {
    /* fall through to the language */
  }
  const region = (navigator.language.split("-")[1] ?? "").toUpperCase();
  return REGION_CURRENCY[region] ?? "USD";
}

export function formatMoney(value: number, currency: CurrencyCode): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(value);
}

export function formatCents(cents: number, currency: CurrencyCode): string {
  return formatMoney(cents / 100, currency);
}
