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

// How on-screen messages leave: they stay until tapped (the default, so
// nobody misses a line), or hide on their own after enough time to read them.
const MSG_KEY = "abuja-hustle.messages";
let autoHide: boolean | null = null;

export function messagesAutoHide(): boolean {
  if (autoHide != null) return autoHide;
  try {
    autoHide = localStorage.getItem(MSG_KEY) === "auto";
  } catch {
    autoHide = false;
  }
  return autoHide;
}

export function setMessagesAutoHide(next: boolean) {
  autoHide = next;
  try {
    if (next) localStorage.setItem(MSG_KEY, "auto");
    else localStorage.removeItem(MSG_KEY);
  } catch {
    // Private mode: the choice still works for this visit.
  }
}

/** Reading time for a message when it hides itself: about 4 words a second, at least 6 seconds. */
export const readingMs = (text: string) => Math.max(6000, Math.min(20000, text.split(/\s+/).length * 260 + 2500));
