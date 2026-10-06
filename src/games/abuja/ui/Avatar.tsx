import { useMemo } from "react";
import { characterSvg, fullLook, svgDataUri, type Look } from "../systems/character";
import type { Looks } from "../systems/types";

const RATIO = { full: 176 / 120, head: 1, top: 64 / 96, legs: 52 / 68 };

/** The player as drawn in the game: the whole person, or a close-up crop. */
export function Avatar({
  looks,
  size = 96,
  view = "full",
  side = "front",
}: {
  looks: Looks | Look;
  size?: number;
  view?: keyof typeof RATIO;
  side?: "front" | "back";
}) {
  const src = useMemo(() => svgDataUri(characterSvg(fullLook(looks), view, side)), [looks, view, side]);
  return <img src={src} width={size} height={Math.round(size * RATIO[view])} alt="" aria-hidden draggable={false} className="select-none" />;
}
