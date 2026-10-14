import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";
// @ts-expect-error Development adapter shares the native production socket hooks.
import { outpostSocketPlugin } from "./scripts/outpost-socket-dev.mjs";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/**
 * Live-preview OAuth popup — handled HERE so the agent never has to create a
 * `/auth/popup` route (and cannot break it by scaffolding a React page that
 * paints the full app shell in the popup).
 *
 * `signIn` (client.ts) opens `/auth/popup?providerId=…` in a top-level window.
 * This middleware runs before TanStack Start, calls `handleAuthPopupRequest`,
 * and returns the 302 / completion HTML. Deployed apps do not use the popup
 * (full-page OAuth redirect), so `apply: "serve"` is enough.
 */
function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      // Register immediately (not in a returned post-hook) so we run BEFORE
      // TanStack Start / the SPA HTML fallback. A model-authored
      // `src/routes/auth/popup.tsx` React page must never win this path.
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          // Ensure Host is the public preview host so Better Auth's dynamic
          // baseURL / redirect_uri match the popup origin.
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          // Preserve multiple Set-Cookie headers (OAuth state + session).
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    pgliteBootstrapPlugin(),
    outpostSocketPlugin(),
    // Before tanstackStart so /auth/popup never falls through to the SPA.
    authPopupPlugin(),
    // Dev-only /__app-env, read by scripts/check-auth-invariant.mjs.
    appEnvPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            // Render sets NITRO_PRESET=render. Everything else stays on the
            // Vercel output this workspace already deploys.
            preset: process.env.NITRO_PRESET === "render" ? "render-com" : "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
            features: { websocket: process.env.NITRO_PRESET === "render" },
            routes: {
              "/api/games/outpost/socket": "./src/routes/api/games/-outpost-socket.server.ts",
            },
            // Returning players must revalidate game code and art after each release.
            routeRules: {
              // Revalidate stable game filenames so releases refresh for returning players.
              ...Object.fromEntries(
                [
                  "outpost-zero.html",
                  "outpost-sim.js",
                  "outpost-protocol.js",
                  "outpost-protocol-combat.js",
                  "outpost-protocol-map.js",
                  "outpost-protocol-ui.js",
                  "outpost-task-games.js",
                  "outpost-task-ui.js",
                  "outpost-mission-progress.js",
                  "outpost-frame-diagnostics.js",
                  "outpost-protocol-focus.js",
                  "outpost-navigation.js",
                  "outpost-practice.js",
                  "outpost-protocol-ai.js",
                  "outpost-variety.js",
                  "outpost-realtime.js",
                  "outpost-spatial-audio.js",
                  "outpost-voice.js",
                  "outpost-voice-worklet.js",
                  "outpost-spectator.js",
                  "outpost-death.js",
                  "outpost-death-ui.js",
                  "outpost-connection.js",
                  "outpost-asset-cache.js",
                  "outpost-cache-worker.js",
                  "outpost-asset-manifest.js",
                  "outpost-compatibility.js",
                  "outpost-content.js",
                  "outpost-academy.js",
                  "outpost-art.js",
                  "outpost-characters.js",
                  "outpost-weapons.js",
                  "outpost-environment.js",
                  "outpost-military.js",
                  "outpost-retention.js",
                  "outpost-ui.js",
                  "outpost-look.js",
                  "outpost-skins.js",
                  "outpost-progression.js",
                ].map((file) => [`/games/${file}`, { headers: { "cache-control": "no-cache" } }]),
              ),
              "/games/outfits/**": { headers: { "cache-control": "no-cache" } },
              "/games/arsenal/**": { headers: { "cache-control": "no-cache" } },
              "/games/loading/**": { headers: { "cache-control": "no-cache" } },
              "/games/characters/**": { headers: { "cache-control": "no-cache" } },
              "/games/weapons/**": { headers: { "cache-control": "no-cache" } },
              "/games/military/**": { headers: { "cache-control": "no-cache" } },
              "/games/environment/**": { headers: { "cache-control": "no-cache" } },
              "/abuja/**": {
                headers: {
                  "cache-control": "public, max-age=86400, stale-while-revalidate=2592000",
                },
              },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
