export type Finish = {
  id: string;
  name: string;
  kind: "xp" | "premium" | "pass";
  xp?: number;
  price?: { NGN: number; USD: number };
  pattern: string;
  colors: string[];
  glow?: boolean;
  blurb?: string;
};
export const FINISHES: Finish[];
export function finishOf(id: string): Finish;
export const CURRENCIES: ("NGN" | "USD")[];
export function money(amount: number, currency?: string): string;
export function naira(kobo: number): string;
export function defaultCurrency(): "NGN" | "USD";
export function drawFinish(
  ctx: CanvasRenderingContext2D,
  size: number,
  finish: Finish | string,
  layer?: "base" | "glow",
): void;
