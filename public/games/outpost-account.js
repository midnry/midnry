/** Outpost Zero needs a Midnry account after one free match: the owner tracks
 * who plays and how. `requireSignIn()` asks the site who is signed in; a
 * signed-out visitor may finish one match, then a sign-in screen covers the
 * game, with buttons to the site's login page that come back here.
 * `recordMatch()` stores a finished match on the account; the free match is
 * kept on this device and filed once the player has signed in.
 * The server decides who is signed in (401 otherwise), and every match is
 * filed under the verified session, never an id from this page. The free-match
 * count lives on this device only: the screen guides players, the stats
 * themselves can only come from signed-in sessions. */
const ENDPOINT = "/api/games/outpost-stats";
const desktop = () => !!window.midnryDesktop;
const GUEST = "midnry-outpost-guest";
const FREE_MATCHES = 1;

const CSS = `
.oz-gate { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; padding: 24px;
  background: linear-gradient(90deg, rgba(10,13,17,.94) 0%, rgba(10,13,17,.78) 55%, rgba(10,13,17,.55) 100%),
    url("loading/lz-keyart.webp") center / cover no-repeat, #101419;
  color: #fff4dc; font: 16px/1.5 var(--mf-body, system-ui, sans-serif); }
.oz-gate[hidden] { display: none; }
.oz-gate > div { width: min(440px, 100%); }
.oz-gate small { display: block; font: 600 13px/1 var(--mf-display, sans-serif); letter-spacing: .28em; color: #f2b544; }
.oz-gate h2 { margin: 12px 0 8px; font: 700 clamp(40px, 9vw, 64px)/.95 var(--mf-display, sans-serif); letter-spacing: .01em; text-transform: uppercase; }
.oz-gate p { margin: 0 0 24px; color: #d6cdb8; }
.oz-gate .oz-actions { display: grid; gap: 10px; }
.oz-gate button { cursor: pointer; min-height: 52px; border: 0; border-radius: 4px; font: 700 20px/1 var(--mf-display, sans-serif);
  letter-spacing: .08em; text-transform: uppercase; background: #f2b544; color: #101419; }
.oz-gate button.oz-quiet { background: rgba(255,244,220,.08); color: #fff4dc; box-shadow: inset 0 0 0 1px rgba(255,244,220,.28); }
.oz-gate button:focus-visible { outline: 3px solid #fff4dc; outline-offset: 3px; }
`;

/** Who is signed in: { name } / null when nobody / throws when unreachable. */
async function whoAmI() {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "me" }),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`status ${response.status}`);
  const me = await response.json();
  return me?.signedOut ? null : me;
}

/** Where login returns to: the game page, with its room code. (The desktop
 * app sends any site page back to its own game window.) */
function returnPath() {
  const room = new URLSearchParams(location.search).get("room");
  return `/games/outpost-zero${room ? `?room=${encodeURIComponent(room)}` : ""}`;
}

/** This device's signed-out play: { played, pending (the free match) }. */
function guest() {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST) || "{}");
    return { played: Number(value.played) || 0, pending: value.pending || null };
  } catch {
    return { played: 0, pending: null };
  }
}
function saveGuest(value) {
  try {
    if (value) localStorage.setItem(GUEST, JSON.stringify(value));
    else localStorage.removeItem(GUEST);
  } catch {
    // Private mode: the free match simply isn't kept.
  }
}

let root = null;
let el = null;
let signedIn = null;

function gate() {
  if (el) return el;
  const style = document.createElement("style");
  style.textContent = CSS;
  el = document.createElement("section");
  el.className = "oz-gate";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "oz-gate-title");
  el.innerHTML = `<div><small>OUTPOST ZERO</small><h2 id="oz-gate-title"></h2><p></p><div class="oz-actions"></div></div>`;
  document.head.append(style);
  document.body.append(el);
  return el;
}

function show(title, copy, buttons) {
  gate();
  if (root) root.inert = true;
  // Free the mouse and stop the game loop's input while the screen is up.
  if (document.pointerLockElement) document.exitPointerLock();
  el.querySelector("h2").textContent = title;
  el.querySelector("p").textContent = copy;
  const actions = el.querySelector(".oz-actions");
  actions.replaceChildren(
    ...buttons.map(([label, action, quiet]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (quiet) button.className = "oz-quiet";
      button.addEventListener("click", action);
      return button;
    }),
  );
  el.hidden = false;
  actions.querySelector("button")?.focus();
}

function hide() {
  if (el) el.hidden = true;
  if (root) root.inert = false;
}

const login = (intent) => {
  const url = `/login?next=${encodeURIComponent(returnPath())}${intent === "register" ? "&intent=register" : ""}`;
  // The website runs the game in a same-origin frame: sign in on the whole page.
  (window.top || window).location.assign(url);
};

function askToSignIn() {
  const free = guest().pending;
  show(
    free ? "Sign in to keep playing" : "Sign in to play",
    free
      ? "That was your free match. Create a free account or sign in to keep playing. We'll add that match to your stats."
      : "Your Midnry account saves your matches and stats on every device.",
    [
      [free ? "Create account" : "Sign in", () => login(free ? "register" : "sign-in")],
      [free ? "I have an account" : "Create account", () => login(free ? "sign-in" : "register"), true],
    ],
  );
}

function send(match) {
  return fetch(ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "record", match }),
  });
}

/** Check the account once at start. Signed in: play, and file a free match
 * played before signing in. Signed out: play the free match, or sign in. */
export function requireSignIn(gameRoot) {
  root = gameRoot;
  const check = async () => {
    try {
      const me = await whoAmI();
      signedIn = !!me;
      if (me) {
        hide();
        const { pending } = guest();
        if (pending) send(pending).then((r) => r.ok && saveGuest(null), () => {});
        else saveGuest(null);
      } else if (guest().played >= FREE_MATCHES) askToSignIn();
      else hide();
    } catch {
      show("Can't reach Midnry", "Outpost Zero checks your account before you play. Check your connection and try again.", [
        ["Try again", check],
      ]);
    }
  };
  return check();
}

/** Store a finished match on the player's account. Fire and forget: a lost
 * request only loses one row of stats, never the player's round. A
 * signed-out player's match is their free one: kept here, and the sign-in
 * screen follows once they have seen the result. */
export function recordMatch(summary) {
  const match = { ...summary, platform: desktop() ? "desktop" : "web" };
  const asGuest = () => {
    signedIn = false;
    const state = guest();
    saveGuest({ played: state.played + 1, pending: state.pending || match });
    if (state.played + 1 >= FREE_MATCHES) setTimeout(askToSignIn, 6000);
  };
  if (signedIn === false) return asGuest();
  try {
    send(match).then((response) => response.status === 401 && asGuest(), () => {});
  } catch {
    // Old browsers without keepalive still play.
  }
}
