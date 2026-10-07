import { useMemo } from "react";
import { characterSvg, cropBox, fullLook, svgDataUri, type Crop, type LifeStage, type Look, type Pose, type View } from "../systems/character";
import type { Looks } from "../systems/types";

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
  const body = stage ?? adult;
  const src = useMemo(() => svgDataUri(characterSvg(look, { crop, view, adult, stage, pose })), [look, crop, view, adult, stage, pose]);
  const box = cropBox(look, body, crop);
  return <img src={src} width={size} height={Math.round((size * box.h) / box.w)} alt="" aria-hidden draggable={false} className="select-none" />;
}
