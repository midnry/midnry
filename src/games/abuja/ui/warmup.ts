import type { GameState } from "../systems/types";

// While the title screen is up: fetch the game engine and the images your
// saved life opens on, a few at a time and at low priority, so Continue
// starts from the cache instead of waiting on hundreds of downloads.

let started = false;

export async function warmUp(state: GameState | null) {
  if (started || !state || state.ending || typeof window === "undefined") return;
  started = true;
  // Respect data-saver mode and very slow connections.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return;
  try {
    const { startupUrls } = await import("../scenes/WorldScene");
    const urls = startupUrls(state);
    let next = 0;
    const worker = async () => {
      while (next < urls.length) {
        const url = urls[next++]!;
        await fetch(url, { priority: "low" } as RequestInit).catch(() => {});
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  } catch {
    // Warming up is only a head start; the game loads normally either way.
  }
}
