/** Outpost Zero requires a Midnry account: the owner tracks who plays and how.
 * `requireSignIn()` asks the site who is signed in and, when nobody is, covers
 * the game with a sign-in screen whose buttons go to the site's login page and
 * come back here. `recordMatch()` stores a finished match on the account.
 * The server decides: it answers 401 for a signed-out visitor, and every match
 * is filed under the verified session, never an id from this page. */
const ENDPOINT = "/api/games/outpost-stats";
const desktop = () => !!window.midnryDesktop;

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
  return response.json();
}

/** Where login returns to: the game page, with its room code. (The desktop
 * app sends any site page back to its own game window.) */
function returnPath() {
  const room = new URLSearchParams(location.search).get("room");
  return `/games/outpost-zero${room ? `?room=${encodeURIComponent(room)}` : ""}`;
}

function gate() {
  const style = document.createElement("style");
  style.textContent = CSS;
  const el = document.createElement("section");
  el.className = "oz-gate";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "oz-gate-title");
  el.innerHTML = `<div><small>OUTPOST ZERO</small><h2 id="oz-gate-title"></h2><p></p><div class="oz-actions"></div></div>`;
  document.head.append(style);
  document.body.append(el);
  return el;
}

function show(el, title, copy, buttons) {
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

const login = (intent) => {
  const url = `/login?next=${encodeURIComponent(returnPath())}${intent === "register" ? "&intent=register" : ""}`;
  // The website runs the game in a same-origin frame: sign in on the whole page.
  (window.top || window).location.assign(url);
};

/** Resolves with the signed-in player once there is one. The game behind the
 * screen keeps loading (and caching its assets) but cannot be reached. */
export function requireSignIn(root) {
  let el = null;
  return new Promise((resolve) => {
    const check = async () => {
      try {
        const me = await whoAmI();
        if (me) {
          if (el) el.hidden = true;
          if (root) root.inert = false;
          return resolve(me);
        }
        el ||= gate();
        if (root) root.inert = true;
        show(el, "Sign in to play", "Your Midnry account saves your matches and stats on every device.", [
          ["Sign in", () => login("sign-in")],
          ["Create account", () => login("register"), true],
        ]);
      } catch {
        el ||= gate();
        if (root) root.inert = true;
        show(el, "Can't reach Midnry", "Outpost Zero checks your account before you play. Check your connection and try again.", [
          ["Try again", check],
        ]);
      }
    };
    check();
  });
}

/** Store a finished match on the player's account. Fire and forget: a lost
 * request only loses one row of stats, never the player's round. */
export function recordMatch(match) {
  try {
    fetch(ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "record", match: { ...match, platform: desktop() ? "desktop" : "web" } }),
    }).catch(() => {});
  } catch {
    // Old browsers without keepalive still play.
  }
}
