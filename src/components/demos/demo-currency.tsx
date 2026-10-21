import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { CURRENCIES, guessCurrency, isCurrency, type CurrencyCode } from "@/lib/format";
import { cn } from "@/components/ui";

/**
 * The currency the Invoice and Ledger samples are shown in.
 *
 * The server always renders naira. Once the page runs in the browser it
 * switches to the visitor's saved choice, or else a guess from the browser's
 * own time zone and language (no lookup, no network call), or else naira.
 * Amounts are not converted: each currency has its own sample numbers.
 */

const STORAGE_KEY = "midnry:demo-currency";
const SERVER_CURRENCY: CurrencyCode = "NGN";

/** Local formatting for each currency, so amounts look the way they do there. */
const LOCALE: Record<CurrencyCode, string> = {
  NGN: "en",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
  GHS: "en-GH",
  KES: "en-KE",
  ZAR: "en-ZA",
  CAD: "en-CA",
  INR: "en-IN",
};

/** How the currency is named in labels for screen readers ("Rate in naira"). */
const NAME: Record<CurrencyCode, string> = {
  NGN: "naira",
  USD: "US dollars",
  GBP: "pounds",
  EUR: "euros",
  GHS: "cedis",
  KES: "Kenyan shillings",
  ZAR: "rand",
  CAD: "Canadian dollars",
  INR: "rupees",
};

const formatters = new Map<CurrencyCode, Intl.NumberFormat>();
function formatter(currency: CurrencyCode): Intl.NumberFormat {
  let found = formatters.get(currency);
  if (!found) {
    found = new Intl.NumberFormat(LOCALE[currency], { style: "currency", currency, currencyDisplay: "narrowSymbol" });
    formatters.set(currency, found);
  }
  return found;
}

export type Money = {
  code: CurrencyCode;
  /** "naira", "pounds", … for labels. */
  name: string;
  /** "₦", "£", … for column headings and placeholders. */
  symbol: string;
  /** An amount in whole units, formatted the local way. */
  format: (value: number) => string;
};

const monies = new Map<CurrencyCode, Money>();
export function moneyFor(code: CurrencyCode): Money {
  let money = monies.get(code);
  if (!money) {
    const symbol = formatter(code).formatToParts(0).find((part) => part.type === "currency")?.value ?? code;
    money = {
      code,
      name: NAME[code],
      symbol,
      format: (value) => (Number.isFinite(value) ? formatter(code).format(value) : "—"),
    };
    monies.set(code, money);
  }
  return money;
}

// ---------------------------------------------------------------------------
// Sample data, one set per currency. Prices are typical for each place, not
// exchange-rate conversions of the naira set.

export type InvoiceSample = {
  from: string;
  client: string;
  taxPercent: string;
  lines: { description: string; qty: string; rate: string }[];
};

export type LedgerSample = {
  /** Amounts in whole units. */
  entries: { label: string; amount: number; category: string; daysAgo: number }[];
  budget: number;
  /** A round amount for the "Enter an amount like …" hint. */
  example: string;
};

type Sample = { invoice: InvoiceSample; ledger: LedgerSample };

function invoice(place: string, client: string, taxPercent: string, design: number, cards: number, delivery: number, city: string): InvoiceSample {
  return {
    from: `Tola Studio\n${place}`,
    client,
    taxPercent,
    lines: [
      { description: "Logo design", qty: "1", rate: String(design) },
      { description: "Business cards (box of 100)", qty: "2", rate: String(cards) },
      { description: `Delivery in ${city}`, qty: "1", rate: String(delivery) },
    ],
  };
}

function ledger(
  words: { food: string; transit: string; power: string; data: string },
  amounts: [food: number, transit: number, power: number, data: number, lunch: number, pharmacy: number],
  budget: number,
  example: string,
): LedgerSample {
  const [food, transit, power, data, lunch, pharmacy] = amounts;
  return {
    entries: [
      { label: words.food, amount: food, category: "Food", daysAgo: 0 },
      { label: words.transit, amount: transit, category: "Transit", daysAgo: 1 },
      { label: words.power, amount: power, category: "Bills", daysAgo: 2 },
      { label: words.data, amount: data, category: "Bills", daysAgo: 4 },
      { label: "Lunch with friends", amount: lunch, category: "Fun", daysAgo: 5 },
      { label: "Pharmacy", amount: pharmacy, category: "Health", daysAgo: 7 },
    ],
    budget,
    example,
  };
}

const MARKET = "Groceries at the market";

export const SAMPLES: Record<CurrencyCode, Sample> = {
  NGN: {
    invoice: invoice("Wuse 2, Abuja", "Ada's Kitchen, Garki, Abuja", "7.5", 150000, 12500, 5000, "Abuja"),
    ledger: ledger({ food: MARKET, transit: "Bus and keke fares", power: "Electricity token", data: "Data bundle" }, [18500, 6000, 15000, 5500, 9000, 4200], 100000, "2500"),
  },
  USD: {
    invoice: invoice("Brooklyn, NY", "Ada's Kitchen, Queens, NY", "8", 900, 45, 25, "New York"),
    ledger: ledger({ food: "Groceries", transit: "Subway and bus fares", power: "Electric bill", data: "Phone plan" }, [180, 60, 120, 45, 85, 30], 1000, "25"),
  },
  GBP: {
    invoice: invoice("Peckham, London", "Ada's Kitchen, Brixton, London", "20", 750, 40, 20, "London"),
    ledger: ledger({ food: "Groceries", transit: "Bus and Tube fares", power: "Electricity bill", data: "Phone plan" }, [140, 55, 95, 30, 70, 25], 800, "20"),
  },
  EUR: {
    invoice: invoice("Portobello, Dublin", "Ada's Kitchen, Rathmines, Dublin", "23", 800, 45, 20, "Dublin"),
    ledger: ledger({ food: "Groceries", transit: "Bus and tram fares", power: "Electricity bill", data: "Phone plan" }, [150, 50, 90, 35, 75, 28], 800, "20"),
  },
  GHS: {
    invoice: invoice("Osu, Accra", "Ada's Kitchen, East Legon, Accra", "15", 3500, 250, 100, "Accra"),
    ledger: ledger({ food: MARKET, transit: "Trotro fares", power: "Prepaid electricity", data: "Data bundle" }, [650, 200, 350, 120, 300, 150], 3000, "50"),
  },
  KES: {
    invoice: invoice("Westlands, Nairobi", "Ada's Kitchen, Kilimani, Nairobi", "16", 45000, 3500, 1500, "Nairobi"),
    ledger: ledger({ food: MARKET, transit: "Matatu fares", power: "Electricity tokens", data: "Data bundle" }, [6500, 2500, 4000, 1500, 3000, 1200], 35000, "500"),
  },
  ZAR: {
    invoice: invoice("Braamfontein, Johannesburg", "Ada's Kitchen, Melville, Johannesburg", "15", 9500, 650, 300, "Johannesburg"),
    ledger: ledger({ food: "Groceries", transit: "Taxi fares", power: "Prepaid electricity", data: "Data bundle" }, [2200, 900, 1500, 450, 800, 350], 12000, "150"),
  },
  CAD: {
    invoice: invoice("Leslieville, Toronto", "Ada's Kitchen, Roncesvalles, Toronto", "13", 1100, 55, 30, "Toronto"),
    ledger: ledger({ food: "Groceries", transit: "TTC fares", power: "Hydro bill", data: "Phone plan" }, [220, 75, 130, 55, 95, 35], 1200, "30"),
  },
  INR: {
    invoice: invoice("Bandra, Mumbai", "Ada's Kitchen, Andheri, Mumbai", "18", 25000, 1200, 500, "Mumbai"),
    ledger: ledger({ food: "Groceries at the mandi", transit: "Metro and auto fares", power: "Electricity bill", data: "Mobile recharge" }, [4500, 1500, 2800, 600, 1800, 900], 25000, "500"),
  },
};

// ---------------------------------------------------------------------------

type CurrencyState = { currency: CurrencyCode; setCurrency: (code: CurrencyCode) => void };

const CurrencyContext = createContext<CurrencyState>({ currency: SERVER_CURRENCY, setCurrency: () => {} });

function readSaved(): CurrencyCode | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isCurrency(saved) ? saved : null;
  } catch {
    return null;
  }
}

/** Holds the demo currency for one demo frame (homepage tabs or a product page). */
export function DemoCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setState] = useState<CurrencyCode>(SERVER_CURRENCY);

  // After mount: the saved choice, else the browser's own hint, else naira.
  useEffect(() => {
    setState(readSaved() ?? guessCurrency(SERVER_CURRENCY));
  }, []);

  function setCurrency(code: CurrencyCode) {
    setState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* private mode or storage blocked: the choice lasts for this page only */
    }
  }

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useDemoCurrency(): CurrencyState {
  return useContext(CurrencyContext);
}

/** A small native picker, labelled "Currency". */
export function DemoCurrencyPicker({ className, hidden = false }: { className?: string; hidden?: boolean }) {
  const id = useId();
  const { currency, setCurrency } = useDemoCurrency();
  return (
    // Hidden on a tab without amounts. On wide screens it keeps its space so the
    // header does not jump between tabs; on phones it frees the row.
    <div className={cn("flex items-center gap-2", hidden && "max-lg:hidden lg:invisible", className)} aria-hidden={hidden || undefined}>
      <label htmlFor={id} className="text-sm font-medium text-ink-soft">
        Currency
      </label>
      <select
        id={id}
        value={currency}
        onChange={(event) => {
          if (isCurrency(event.target.value)) setCurrency(event.target.value);
        }}
        className="h-11 rounded-full border border-line bg-card pr-8 pl-3.5 text-sm text-ink outline-none focus-visible:border-pine focus-visible:ring-3 focus-visible:ring-pine/25"
      >
        {CURRENCIES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label} ({item.code})
          </option>
        ))}
      </select>
    </div>
  );
}
