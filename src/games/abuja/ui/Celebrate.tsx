import { useEffect } from "react";
import { closeCelebration } from "../systems/engine";
import type { Tone } from "../systems/milestones";
import { sound } from "../systems/sound";
import type { GameState } from "../systems/types";
import { GAME_FONT, btnPrimary } from "./theme";

// A big moment, full screen: a glow in the moment's colour, the icon, a line
// of story and a little confetti. One at a time; tap to carry on.

const GLOW: Record<Tone, string> = {
  gold: "#f5b83d",
  love: "#f472b6",
  family: "#fb923c",
  work: "#60a5fa",
  travel: "#38bdf8",
};
const CONFETTI = ["#f5b83d", "#4ade80", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa"];

export function CelebrationCard({ state }: { state: GameState }) {
  const c = state.celebrations?.[0];
  useEffect(() => {
    if (!c) return;
    sound.play("chime");
    const t = window.setTimeout(() => sound.play(c.tone === "gold" || c.tone === "work" ? "cash" : "notify"), 260);
    return () => window.clearTimeout(t);
  }, [c?.id]);
  if (!c) return null;
  const glow = GLOW[c.tone];
  const left = (state.celebrations?.length ?? 1) - 1;
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70 p-4 backdrop-blur-sm"
      style={{ fontFamily: GAME_FONT }}
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 42%, ${glow}55, transparent 60%)` }} />
      <div aria-hidden className="celebrate-confetti pointer-events-none absolute inset-0">
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              background: CONFETTI[i % CONFETTI.length],
              animationDelay: `${(i % 7) * 0.12}s`,
              animationDuration: `${2.4 + (i % 5) * 0.35}s`,
              transform: `rotate(${i * 29}deg)`,
            }}
          />
        ))}
      </div>
      <div className="celebrate-pop relative w-full max-w-sm rounded-3xl border border-white/15 bg-[#0e1626]/95 p-6 text-center text-slate-100 shadow-2xl">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full text-6xl" style={{ background: `${glow}22`, boxShadow: `0 0 60px ${glow}66` }}>
          <span aria-hidden>{c.icon}</span>
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-balance" style={{ color: glow }}>
          {c.title}
        </h2>
        <p className="mt-3 text-base text-pretty text-slate-200">{c.text}</p>
        <button type="button" className={`${btnPrimary} mt-6 min-h-12 w-full text-base`} onClick={() => closeCelebration()} autoFocus>
          {left ? `Next (${left} more)` : "Carry on"}
        </button>
      </div>
    </div>
  );
}
