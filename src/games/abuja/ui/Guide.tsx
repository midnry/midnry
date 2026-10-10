import { setGuide } from "../systems/engine";
import { GAME_FONT, glass } from "./theme";

// A few short tips for a brand-new life: walking, following the story and
// talking in the first chapter; then the phone, rides and a first naira when
// you reach Abuja as an adult. Each tip clears itself once you've done it.

/** The steps, in order. 3 waits for adult life in the city; 7 is the end. */
export const GUIDE = {
  walk: 0,
  story: 1,
  talk: 2,
  waitCity: 3,
  phone: 4,
  ride: 5,
  earn: 6,
  done: 7,
} as const;

const TIPS: Record<number, { title: string; text: (touch: boolean) => string }> = {
  0: { title: "Walk around", text: (touch) => (touch ? "Drag the joystick to walk. (You can switch to tap-to-move in the pause menu.)" : "Use WASD or the arrow keys to walk. Or click where you want to go.") },
  1: { title: "Follow your story", text: () => "Tap the blue “Go to” banner at the top to walk to your next goal, then tap the button at the bottom to see what happens." },
  2: { title: "Talk to people", text: (touch) => `Walk up to someone and tap “Talk”${touch ? "" : " (or press E)"}. People remember how you treat them.` },
  4: { title: "Your phone", text: () => "Tap Phone. Jobs, your bank, rides, news and missions all live there." },
  5: { title: "Get around Abuja", text: () => "Tap Ride to cross the city by okada, keke, taxi or bus." },
  6: { title: "Make your first money", text: () => "Tap the gold Mission banner, or open Jobs on your phone, and earn your first ₦1,000." },
};

export function GuideTip({ step }: { step: number }) {
  const tip = TIPS[step];
  if (!tip) return null;
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const total = 3;
  const n = step < GUIDE.waitCity ? step + 1 : step - GUIDE.phone + 1;
  return (
    <div
      className={`${glass} absolute bottom-56 left-1/2 z-20 w-[min(92vw,24rem)] -translate-x-1/2 rounded-2xl border-amber-300/40 p-3 text-left sm:bottom-28`}
      style={{ fontFamily: GAME_FONT }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-slate-950">{n}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-wide text-amber-300 uppercase">
            Tip {n} of {total}
          </p>
          <p className="font-extrabold">{tip.title}</p>
          <p className="mt-0.5 text-sm text-pretty text-slate-300">{tip.text(Boolean(touch))}</p>
        </div>
      </div>
      <button type="button" className="mt-2 min-h-9 w-full rounded-lg text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200" onClick={() => setGuide(GUIDE.done)}>
        Skip tips
      </button>
    </div>
  );
}
