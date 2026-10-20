/** The few desktop controls the game and the offline page may call. */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("midnryDesktop", {
  platform: process.platform,
  retry: () => ipcRenderer.send("outpost:retry"),
  toggleFullscreen: () => ipcRenderer.send("outpost:fullscreen"),
  quit: () => ipcRenderer.send("outpost:quit"),
});
