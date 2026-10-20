export type Finish = {
  id: string;
  name: string;
  kind: "xp" | "premium" | "pass";
  xp?: number;
  price?: number;
  pattern: string;
  colors: string[];
  glow?: boolean;
  blurb?: string;
};
export const FINISHES: Finish[];
export function finishOf(id: string): Finish;
export function naira(kobo: number): string;
export function drawFinish(
  ctx: CanvasRenderingContext2D,
  size: number,
  finish: Finish | string,
  layer?: "base" | "glow",
): void;
