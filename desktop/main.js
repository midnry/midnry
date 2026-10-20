/** Outpost Zero desktop shell (Windows, macOS, Linux).
 *
 * The window plays the live game from www.midnry.com, so online rooms, the
 * daily board and every game update work exactly as on the website; the
 * game's own cache worker keeps its ~50 MB of models and textures on disk
 * after the first launch. The shell adds what a browser tab cannot: a
 * borderless full-screen window, no browser chrome, the dedicated GPU, and
 * the game's "Exit" button closing the app.
 *
 * OUTPOST_URL overrides the site, e.g. a local dev server for testing. */
const { app, BrowserWindow, Menu, shell, session, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const SITE = new URL(process.env.OUTPOST_URL || "https://www.midnry.com");
const GAME = new URL("/games/outpost-zero.html?renderer=military&desktop=1", SITE);
const GAME_PATH = GAME.pathname;

// Prefer the dedicated GPU on laptops and keep older GPUs eligible for WebGL.
app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.setAppUserModelId("com.midnry.outpostzero");
// Sign-in providers such as Google refuse pages that announce an embedded
// app, so the window presents itself as the Chrome it is built on.
app.userAgentFallback = app.userAgentFallback.replace(/ (Electron|outpost-zero-desktop|Outpost Zero)\/\S+/g, "");

if (!app.requestSingleInstanceLock()) app.quit();

const settingsFile = () => path.join(app.getPath("userData"), "window.json");
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
  } catch {
    return { fullscreen: true };
  }
}
function saveSettings(win) {
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify({ fullscreen: win.isFullScreen() }));
  } catch {
    // A read-only profile only loses the remembered window mode.
  }
}

/** Same-origin pages other than the game (the site's home page after "Exit",
 * account pages…) are not part of the desktop app. */
const isGame = (url) => {
  try {
    const u = new URL(url);
    return u.origin === SITE.origin && u.pathname === GAME_PATH;
  } catch {
    return false;
  }
};
const isLocal = (url) => url.startsWith("file:");
/** Pages of the site's sign-in flow, which the game sends players through. */
const isSignIn = (url) => {
  try {
    const u = new URL(url);
    return u.origin === SITE.origin && (u.pathname === "/login" || u.pathname.startsWith("/api/auth/"));
  } catch {
    return false;
  }
};

let win = null;

function createWindow() {
  const settings = readSettings();
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: "Outpost Zero",
    backgroundColor: "#101419",
    autoHideMenuBar: true,
    fullscreen: settings.fullscreen !== false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // A game must keep its timers running when the window is behind another.
      backgroundThrottling: false,
    },
  });
  win.once("ready-to-show", () => win.show());
  win.on("enter-full-screen", () => saveSettings(win));
  win.on("leave-full-screen", () => saveSettings(win));
  win.on("page-title-updated", (event) => event.preventDefault());

  const contents = win.webContents;
  // Sign-in happens in this window: the site's login page and, from there,
  // the sign-in provider's pages. Once back on the site, anything but the
  // game returns to the game. From the game itself, Exit (the site's home)
  // closes the app and other links open in the browser.
  contents.on("will-navigate", (event, url) => {
    if (isGame(url) || isLocal(url) || isSignIn(url)) return;
    const u = new URL(url);
    const fromGame = isGame(contents.getURL());
    if (u.origin !== SITE.origin && !fromGame && /^https:$/.test(u.protocol)) return;
    event.preventDefault();
    if (u.origin === SITE.origin && !fromGame) win.loadURL(GAME.href);
    else if (u.origin === SITE.origin && u.pathname === "/") app.quit();
    else if (/^https?:$/.test(u.protocol)) shell.openExternal(url);
  });
  // After signing in the site shows its own game page (or app list): this
  // window plays the game directly instead.
  const backToGame = (_event, url) => {
    const u = new URL(url);
    if (u.origin === SITE.origin && !isGame(url) && !isSignIn(url)) win.loadURL(GAME.href);
  };
  contents.on("did-navigate", backToGame);
  contents.on("did-navigate-in-page", backToGame);
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  contents.on("did-fail-load", (_event, code, _description, url, isMainFrame) => {
    // -3 is a navigation the page itself aborted, not a failure.
    if (!isMainFrame || code === -3 || !isGame(url)) return;
    win.loadFile(path.join(__dirname, "offline.html"));
  });
  // F11 / Alt+Enter toggle full screen on every platform (Ctrl+Cmd+F on macOS too).
  contents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11" || (input.alt && input.key === "Enter")) {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
  });
  win.loadURL(GAME.href);
}

app.on("second-instance", () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  // Only what the game uses: voice chat, full screen, mouse capture, copying room codes.
  const allowed = new Set(["media", "fullscreen", "pointerLock", "clipboard-sanitized-write"]);
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    const origin = details.requestingUrl ? new URL(details.requestingUrl).origin : "";
    callback(allowed.has(permission) && origin === SITE.origin);
  });
  ipcMain.on("outpost:retry", () => win?.loadURL(GAME.href));
  ipcMain.on("outpost:fullscreen", () => win?.setFullScreen(!win.isFullScreen()));
  ipcMain.on("outpost:quit", () => app.quit());
  // macOS keeps a minimal app menu (Quit, Copy/Paste, full screen); others get none.
  Menu.setApplicationMenu(
    process.platform === "darwin"
      ? Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "windowMenu" }])
      : null,
  );
  createWindow();
});

// Closing the game window quits the app, macOS included: there is no
// document model to keep alive.
app.on("window-all-closed", () => app.quit());
