import { HAIR_COLOR } from "../systems/art";
import type { Looks } from "../systems/types";

/** The MC drawn with shapes. Swap for a sprite later without changing callers. */
export function Avatar({ looks, size = 96 }: { looks: Looks; size?: number }) {
  const hair = looks.hair;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <ellipse cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,0.25)" />
      <path d="M22 92 Q22 58 50 58 Q78 58 78 92 Z" fill={looks.outfit} />
      <circle cx="50" cy="38" r="20" fill={looks.skin} />
      {hair === "afro" ? <circle cx="50" cy="28" r="22" fill={HAIR_COLOR} /> : null}
      {hair === "afro" ? <circle cx="50" cy="40" r="17" fill={looks.skin} /> : null}
      {hair === "lowcut" ? <path d="M30 34 Q50 12 70 34 Q60 24 50 24 Q40 24 30 34 Z" fill={HAIR_COLOR} /> : null}
      {hair === "cornrows" ? <path d="M30 34 Q50 10 70 34" stroke={HAIR_COLOR} strokeWidth="8" fill="none" strokeDasharray="4 3" /> : null}
      {hair === "braids" ? (
        <g fill={HAIR_COLOR}>
          <path d="M28 36 Q50 8 72 36 Q62 22 50 22 Q38 22 28 36 Z" />
          <rect x="26" y="34" width="6" height="30" rx="3" />
          <rect x="68" y="34" width="6" height="30" rx="3" />
        </g>
      ) : null}
      {hair === "bun" ? (
        <g fill={HAIR_COLOR}>
          <path d="M30 34 Q50 12 70 34 Q60 22 50 22 Q40 22 30 34 Z" />
          <circle cx="50" cy="14" r="8" />
        </g>
      ) : null}
      <circle cx="43" cy="40" r="2.2" fill="#1a1210" />
      <circle cx="57" cy="40" r="2.2" fill="#1a1210" />
      <path d="M44 48 Q50 52 56 48" stroke="#1a1210" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
