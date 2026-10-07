// Shared with the loading screen: midnight navy, warm cream, gold, and mint.
export const btn =
  "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";
export const btnPrimary = `${btn} abuja-game__primary`;
export const btnGhost = `${btn} abuja-game__ghost`;
export const panel = "rounded-2xl border border-white/10 abuja-game__panel shadow-2xl backdrop-blur";

// ── In-game interface: one look for the HUD, buttons, prompts and the stick ──

/** The game's rounded typeface (loaded on the game page), for the HUD and map labels. */
export const GAME_FONT = '"Nunito", "Outfit", system-ui, sans-serif';
/** Frosted navy glass: the surface every in-game control sits on. */
export const glass = "border border-white/10 abuja-game__glass shadow-[0_8px_24px_rgba(4,8,20,0.38)] backdrop-blur-md";
/** Square icon buttons: pause, zoom, map, night. */
export const iconBtn = `${glass} flex size-11 items-center justify-center rounded-xl text-slate-50 transition hover:bg-[#1e2740]/90 active:scale-95`;
/** The big square action buttons: Ride, Phone, Drive. */
export const actionBtn = "flex size-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl text-[13px] font-extrabold shadow-[0_8px_24px_rgba(4,8,20,0.38)] transition active:scale-95";
