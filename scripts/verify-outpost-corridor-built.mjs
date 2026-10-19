/** Exercise the packaged Render output locally; never publishes or migrates. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createWriteStream, copyFileSync, mkdirSync, existsSync } from "node:fs";
mkdirSync(".output/server/_libs", { recursive: true });
// Local empty-database QA only. Nitro does not copy the PGLite runtime files
// into this sandbox's build; these copies are not source/deployment changes.
for (const file of ["pglite.data", "pglite.wasm", "initdb.wasm"])
  copyFileSync("node_modules/@electric-sql/pglite/dist/" + file, ".output/server/_libs/" + file);
const log = createWriteStream("/tmp/outpost-corridor-built-server.log");
const server = spawn(process.execPath, [".output/server/index.mjs"], {
  env: { ...process.env, DATABASE_URL: "", NITRO_PORT: "8093", NITRO_HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.pipe(log);
server.stderr.pipe(log);
const base = "http://127.0.0.1:8093";
const screenshotRoot='/workspace/screenshots/outpost-'+(process.env.OUTPOST_GRAPHICS_PASS||'corridor');
const run = (args, name) =>
  new Promise((resolve, reject) => {
    const stream = createWriteStream("/tmp/outpost-corridor-built-" + name + ".log");
    const helper = "./node_modules/.cache/outpost-qa-chromium.mjs";
    const runtime = existsSync(helper) ? ["--import", helper] : [];
    const child = spawn(process.execPath, [...runtime, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(stream);
    child.stderr.pipe(stream);
    child.on("error", reject);
    child.on("exit", (code) => {
      stream.end();
      console.log(`${name}: ${code === 0 ? "passed" : "failed"}`);
      code === 0 ? resolve() : reject(Error(`${name} failed (${code})`));
    });
  });
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(base + "/games/outpost-zero.html", {
        signal: AbortSignal.timeout(1500),
      });
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(ready, "Packaged server failed to start");
  for (const file of [
    "outpost-military.js",
    "outpost-asset-cache.js",
    "outpost-asset-manifest.js",
  ]) {
    const response = await fetch(base + "/games/" + file);
    assert.ok(response.ok);
    assert.match(response.headers.get("cache-control") || "", /no-cache/);
  }
  await run(["scripts/check-outpost-corridor.mjs", base, "built"], "gameplay");
  await run(["scripts/check-outpost-interactables.mjs", base, "built"], "interactables");
  const smoke = existsSync("node_modules/.cache/outpost-browser-smoke.mjs")
    ? "node_modules/.cache/outpost-browser-smoke.mjs"
    : "scripts/browser-smoke.mjs";
  await run(
    [
      smoke,
      base,
      screenshotRoot+"/site-built.png",
      "--baseline",
      screenshotRoot+"/site-dev.json",
    ],
    "site",
  );
} finally {
  server.kill("SIGTERM");
  log.end();
}
