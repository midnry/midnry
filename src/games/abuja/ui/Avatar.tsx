import { useMemo } from "react";
import { characterSvg, cropBox, fullLook, svgDataUri, type Crop, type LifeStage, type Look, type Pose, type View } from "../systems/character";
import type { Looks } from "../systems/types";
import { isPaintedId } from "../systems/painted";

/** The player as drawn in the game: the whole person, or a close-up crop. */
export function Avatar({
  looks,
  size = 96,
  crop = "full",
  view = "front",
  adult = false,
  stage,
  pose,
}: {
  looks: Looks | Look;
  size?: number;
  crop?: Crop;
  view?: View;
  adult?: boolean;
  stage?: LifeStage;
  pose?: Pose;
}) {
  const look = useMemo(() => fullLook(looks), [looks]);
  const painted = (looks as Looks).painted;
  const body = stage ?? adult;
  const src = useMemo(() => svgDataUri(characterSvg(look, { crop, view, adult, stage, pose })), [look, crop, view, adult, stage, pose]);
  const box = cropBox(look, body, crop);
  // A grown-up in a hand-painted outfit: the painting, framed like the drawn version.
  if (isPaintedId(painted)) {
    const h = Math.round((size * box.h) / box.w);
    const src = `/abuja/people/${painted}-${view === "back" ? "back" : view === "side" ? "side" : "front"}.png`;
    return (
      <span className="relative inline-block overflow-hidden select-none" style={{ width: size, height: h }} aria-hidden>
        <img src={src} alt="" draggable={false} className="absolute left-1/2 max-w-none -translate-x-1/2" style={crop === "full" ? { top: 0, height: h } : { top: Math.round(size * 0.04), height: Math.round(size * (crop === "head" ? 4.6 : 2.4)) }} />
      </span>
    );
  }
  return <img src={src} width={size} height={Math.round((size * box.h) / box.w)} alt="" aria-hidden draggable={false} className="select-none" />;
}
