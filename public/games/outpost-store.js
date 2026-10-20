/** Outpost Zero store, game side: which premium finishes this account owns,
 * buying one through Paystack, and confirming the payment on return.
 * The server owns prices and ownership; this only asks and remembers the
 * answer on the device so the gun is painted before the reply arrives. */
import { CURRENCIES, defaultCurrency } from "./outpost-finishes.js";

const ENDPOINT = "/api/games/outpost-store";
const CACHE = "midnry-outpost-store";
const CURRENCY = "midnry-outpost-currency";

async function call(body) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "The store is unavailable. Try again shortly.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export class OutpostStore {
  constructor(onChange) {
    this.onChange = onChange;
    this.owned = new Set();
    this.pass = false;
    this.ready = false;
    this.signedIn = null;
    this.message = "";
    // Naira or dollars: remembered once chosen, else guessed from time zone.
    try {
      const saved = localStorage.getItem(CURRENCY);
      this.currency = CURRENCIES.includes(saved) ? saved : defaultCurrency();
    } catch {
      this.currency = defaultCurrency();
    }
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE) || "{}");
      this.owned = new Set(Array.isArray(cached.owned) ? cached.owned : []);
      this.pass = cached.pass === true;
    } catch {
      // No cache: the server answer fills it in.
    }
  }
  apply(state) {
    if (state.signedIn === false) {
      // Keep the device cache: the account may sign back in on this device.
      this.signedIn = false;
      this.onChange?.();
      return;
    }
    this.owned = new Set(state.owned || []);
    this.pass = state.pass === true;
    this.ready = state.ready === true;
    this.signedIn = true;
    try {
      localStorage.setItem(CACHE, JSON.stringify({ owned: [...this.owned], pass: this.pass }));
    } catch {
      // Private mode: ownership is simply asked again next time.
    }
    this.onChange?.();
  }
  async refresh() {
    try {
      this.apply(await call({ op: "state" }));
    } catch (error) {
      if (error.status === 401) {
        this.signedIn = false;
        this.onChange?.();
      }
    }
  }
  /** Back from Paystack: the page URL carries ?purchase=<reference>. */
  async confirmFromUrl() {
    const url = new URL(location.href),
      reference = url.searchParams.get("purchase");
    if (!reference) return;
    url.searchParams.delete("purchase");
    history.replaceState(history.state, "", url);
    this.message = "Confirming your purchase…";
    this.onChange?.();
    try {
      const state = await call({ op: "confirm", reference });
      this.message = "Purchase complete. Your new finish is ready in the Locker.";
      this.justBought = state.item;
      this.apply(state);
    } catch (error) {
      this.message = `${error.message} If you were charged, it will appear within a few minutes.`;
      this.onChange?.();
      // The webhook may still settle it; ask again shortly.
      setTimeout(() => this.refresh(), 20000);
    }
  }
  setCurrency(currency) {
    if (!CURRENCIES.includes(currency)) return;
    this.currency = currency;
    try {
      localStorage.setItem(CURRENCY, currency);
    } catch {
      // Remembered for this visit only.
    }
    this.onChange?.();
  }
  async buy(item) {
    this.message = "Opening secure checkout…";
    this.onChange?.();
    try {
      const result = await call({ op: "buy", item, currency: this.currency });
      if (result.already) {
        this.message = "You already own that finish.";
        await this.refresh();
        return;
      }
      // The website runs the game in a frame: check out on the whole page.
      (window.top || window).location.assign(result.url);
    } catch (error) {
      this.message = error.message;
      this.onChange?.();
    }
  }
  owns(finish) {
    return finish.kind === "premium" ? this.owned.has(finish.id) : finish.kind === "pass" ? this.pass : true;
  }
}
