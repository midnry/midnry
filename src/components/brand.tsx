import { INVERSE, LOCKUP_ART, LOGO_ART, SYMBOL_PATH, SYMBOL_SMALL_PATH } from "@/components/brand-art";

/**
 * The Midnry logo, drawn inline so it follows the colour mode (light, evening, dark).
 * The art comes from scripts/brand/build-logo.mjs (src/components/brand-art.ts).
 *
 * - variant "full": symbol, wordmark and tagline. "compact": symbol and wordmark. "symbol": the tiles alone.
 * - tone "color": brand blue + ink, from the mode's tokens (lighter in dark mode).
 *   "mono": one colour, currentColor. "inverse": light art for a dark surface in any mode.
 * - height is in CSS pixels; width follows, and both are set on the <svg>, so nothing shifts as the page loads.
 *
 * Decorative by default (aria-hidden), for use inside a link that carries the name.
 * Pass `label` when the logo stands alone and should be read out.
 */
export type BrandVariant = "full" | "compact" | "symbol";
export type BrandTone = "color" | "mono" | "inverse";

const ART = {
  full: LOCKUP_ART,
  compact: LOGO_ART,
} as const;

function colours(tone: BrandTone) {
  if (tone === "mono") return { symbol: "currentColor", word: "currentColor", tag: "currentColor" };
  if (tone === "inverse") return INVERSE;
  return { symbol: "var(--color-brand)", word: "var(--color-ink)", tag: "var(--color-ink-soft)" };
}

export function brandLogoWidth(variant: BrandVariant, height: number): number {
  if (variant === "symbol") return height;
  const art = ART[variant];
  return Math.round((height * art.width) / art.height);
}

export function BrandLogo({
  variant = "compact",
  tone = "color",
  height = 32,
  label,
  className,
}: {
  variant?: BrandVariant;
  tone?: BrandTone;
  height?: number;
  label?: string;
  className?: string;
}) {
  const c = colours(tone);
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const, focusable: "false" as const };

  if (variant === "symbol") {
    // Below about 24 px the wider-gap cut keeps the four tiles apart.
    const d = height <= 24 ? SYMBOL_SMALL_PATH : SYMBOL_PATH;
    return (
      <svg viewBox="0 0 100 100" width={height} height={height} className={className} {...a11y}>
        <path fill={c.symbol} d={d} />
      </svg>
    );
  }

  const art = ART[variant];
  return (
    <svg viewBox={`0 0 ${art.width} ${art.height}`} width={brandLogoWidth(variant, height)} height={height} className={className} {...a11y}>
      <path transform={`translate(0 ${art.symbolY})`} fill={c.symbol} d={SYMBOL_PATH} />
      <path fill={c.word} d={art.word} />
      {"tag" in art ? <path fill={c.tag} d={art.tag} /> : null}
    </svg>
  );
}
