import { build } from "vite";
// Static-page renderer: bundle Three.js locally, with no CDN/runtime dependency.
await build({
  configFile: false,
  publicDir: false,
  logLevel: "warn",
  build: {
    target: "es2022",
    outDir: "public/games",
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: "scripts/outpost-military/renderer.js",
      formats: ["es"],
      fileName: () => "outpost-military.js",
    },
    rollupOptions: { output: { codeSplitting: false } },
  },
});
