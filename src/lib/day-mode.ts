// The site's colour mode. If the device is set to dark, the site is dark.
// Otherwise it follows the time of day: light 7am–4pm, evening 4pm–7pm and
// dark 7pm–7am. `src/styles.css` holds the colours for each mode.

export type DayMode = "light" | "evening" | "dark";

export function modeFor(hour: number, deviceDark: boolean): DayMode {
  if (deviceDark) return "dark";
  if (hour >= 7 && hour < 16) return "light";
  if (hour >= 16 && hour < 19) return "evening";
  return "dark";
}

/** The browser-bar colour for each mode. */
export const MODE_THEME: Record<DayMode, string> = { light: "#f4f7fb", evening: "#f7ede2", dark: "#0b1220" };

/** Runs in <head> before the first paint, so the page never flashes the wrong mode. Keep in step with modeFor. */
export const MODE_SCRIPT = `(function(){try{var h=new Date().getHours();var d=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.mode=d?"dark":h>=7&&h<16?"light":h>=16&&h<19?"evening":"dark";}catch(e){}})();`;
