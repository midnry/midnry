import { useMemo } from "react";
import { characterSvg, dims, frameFor, fullLook, svgDataUri, type Crop, type Look, type View } from "../systems/character";
import type { Looks } from "../systems/types";

/** The player as drawn in the game: the whole person, or a close-up crop. */
export function Avatar({
  looks,
  size = 96,
  crop = "full",
  view = "front",
  adult = false,
}: {
  looks: Looks | Look;
  size?: number;
  crop?: Crop;
  view?: View;
  adult?: boolean;
}) {
  const look = useMemo(() => fullLook(looks), [looks]);
  const src = useMemo(() => svgDataUri(characterSvg(look, { crop, view, adult })), [look, crop, view, adult]);
  const f = frameFor(look, adult);
  const d = dims(look, adult);
  const ratio = { full: (f.hipY + d.legH + 10) / 120, head: 1, top: Math.max(64, f.hem - f.top + 24) / ((f.sh + 22) * 2), legs: 52 / 68 }[crop];
  return <img src={src} width={size} height={Math.round(size * ratio)} alt="" aria-hidden draggable={false} className="select-none" />;
}
