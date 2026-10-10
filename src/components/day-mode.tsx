import { useEffect } from "react";
import { MODE_THEME, modeFor } from "@/lib/day-mode";

/** Keeps the site's mode in step with the clock and the device setting; changes fade over two seconds. */
export function DayModeSync() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const mode = modeFor(new Date().getHours(), media.matches);
      if (root.dataset.mode !== mode) root.dataset.mode = mode;
      // The game sets its own browser-bar colour.
      if (!location.pathname.startsWith("/games/")) {
        const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
        if (meta && meta.content !== MODE_THEME[mode]) meta.content = MODE_THEME[mode];
      }
    };
    sync();
    // Turn the fade on only after the first paint.
    const frame = requestAnimationFrame(() => root.classList.add("mode-ease"));
    const timer = window.setInterval(sync, 30_000);
    const onVisible = () => document.visibilityState === "visible" && sync();
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
