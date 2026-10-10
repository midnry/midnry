// Which look the game is drawn in: the comic look (bold outlines, rich colour)
// or the classic painted one. Kept apart from the scenes so the menus can read
// and change it without loading the game engine. Remembered on this device.

const LOOK_KEY = "abuja-hustle.look";

/** The comic look is on unless the player (or a test) has switched to the classic one. */
export function comicOn(): boolean {
  try {
    return localStorage.getItem(LOOK_KEY) !== "classic";
  } catch {
    return true;
  }
}

let on: boolean | null = null;

/** The current choice, read once and then kept in memory. */
export const lookIsComic = () => (on ??= comicOn());

export function setComicLook(next: boolean) {
  on = next;
  try {
    if (next) localStorage.removeItem(LOOK_KEY);
    else localStorage.setItem(LOOK_KEY, "classic");
  } catch {
    // Private mode: the switch still works for this visit.
  }
}
