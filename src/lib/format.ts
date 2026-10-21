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

/** Countries (ISO 3166 region codes) whose currency is in the list above. */
const EURO_REGIONS = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];
const REGION_CURRENCY: Record<string, CurrencyCode> = {
  NG: "NGN", US: "USD", GB: "GBP", GH: "GHS", KE: "KES", ZA: "ZAR", CA: "CAD", IN: "INR",
  ...Object.fromEntries(EURO_REGIONS.map((region) => [region, "EUR" as const])),
};

/** IANA time zones in euro-area countries. */
const EURO_ZONES = new Set(
  [
    "Amsterdam", "Athens", "Berlin", "Bratislava", "Brussels", "Busingen", "Dublin", "Helsinki", "Lisbon", "Ljubljana", "Luxembourg",
    "Madrid", "Malta", "Mariehamn", "Monaco", "Paris", "Riga", "Rome", "San_Marino", "Tallinn", "Vatican", "Vienna", "Vilnius", "Zagreb",
  ].map((city) => `Europe/${city}`).concat(["Atlantic/Azores", "Atlantic/Canary", "Atlantic/Madeira", "Africa/Ceuta", "Asia/Nicosia", "Asia/Famagusta", "Europe/Nicosia", "Europe/Andorra"]),
);

/** IANA time zones in Canada (everything else under America/ counts as US dollars). */
const CANADA_ZONES = new Set(
  [
    "Toronto", "Montreal", "Vancouver", "Edmonton", "Calgary", "Winnipeg", "Regina", "Swift_Current", "Halifax", "Glace_Bay", "Moncton",
    "Goose_Bay", "St_Johns", "Whitehorse", "Dawson", "Dawson_Creek", "Fort_Nelson", "Creston", "Yellowknife", "Inuvik", "Cambridge_Bay",
    "Rankin_Inlet", "Resolute", "Iqaluit", "Nipigon", "Thunder_Bay", "Rainy_River", "Atikokan", "Blanc-Sablon", "Pangnirtung",
  ].map((city) => `America/${city}`).concat(["Canada/Atlantic", "Canada/Central", "Canada/Eastern", "Canada/Mountain", "Canada/Newfoundland", "Canada/Pacific", "Canada/Saskatchewan", "Canada/Yukon"]),
);

const ZONE_CURRENCY: Record<string, CurrencyCode> = {
  "Africa/Lagos": "NGN",
  "Africa/Accra": "GHS",
  "Africa/Nairobi": "KES",
  "Africa/Johannesburg": "ZAR",
  "Europe/London": "GBP",
  "Europe/Belfast": "GBP",
  "Europe/Jersey": "GBP",
  "Europe/Guernsey": "GBP",
  "Europe/Isle_of_Man": "GBP",
  GB: "GBP",
  "Asia/Kolkata": "INR",
  "Asia/Calcutta": "INR",
};

/** The currency a time zone points to, or null when it says nothing useful. */
export function currencyFromZone(zone: string | undefined): CurrencyCode | null {
  if (!zone) return null;
  if (ZONE_CURRENCY[zone]) return ZONE_CURRENCY[zone];
  if (EURO_ZONES.has(zone)) return "EUR";
  if (CANADA_ZONES.has(zone)) return "CAD";
  if (zone.startsWith("America/") || zone.startsWith("US/")) return "USD";
  return null;
}

/** The currency of a language tag's region ("en-GB" → GBP), or null. */
export function currencyFromLanguage(language: string | undefined): CurrencyCode | null {
  if (!language) return null;
  const region = language.split(/[-_]/).slice(1).find((part) => /^[A-Za-z]{2}$/.test(part));
  return region ? (REGION_CURRENCY[region.toUpperCase()] ?? null) : null;
}

/**
 * The visitor's likely currency, read only from the browser itself: the time
 * zone first, then the region in the browser language, then `fallback`.
 * Nothing is looked up over the network.
 */
export function guessCurrency(fallback: CurrencyCode = "USD"): CurrencyCode {
  if (typeof navigator === "undefined") return fallback;
  let zone: string | undefined;
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* fall through to the language */
  }
  return currencyFromZone(zone) ?? currencyFromLanguage(navigator.language) ?? fallback;
}

export function formatMoney(value: number, currency: CurrencyCode): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(value);
}

export function formatCents(cents: number, currency: CurrencyCode): string {
  return formatMoney(cents / 100, currency);
}
