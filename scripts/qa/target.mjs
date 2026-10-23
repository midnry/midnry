// Which server the browser QA scripts talk to, and how to recognise its
// server-function requests.
//
//   QA_BASE    the site (default http://127.0.0.1:8080)
//   QA_TARGET  "dev" (default): the Vite dev server (sh scripts/qa/dev-up.sh), where
//              scripts may import /src/... in the page to seed documents;
//              "build": a production build (npm start on .output), where they
//              must seed and read through the app's own screens instead.
//
// Dev server-function URLs are base64 of a readable id ("…saveDoc…"); a
// production build uses hashes, listed in .output/server/_ssr/ssr.mjs.
import { existsSync, readFileSync } from "node:fs";

export const BASE = (process.env.QA_BASE || "http://127.0.0.1:8080").replace(/\/$/, "");
export const BUILD = process.env.QA_TARGET === "build";
export const TARGET = BUILD ? "production build" : "dev server";

let manifest = null;
function hashesFor(name) {
  if (manifest == null) {
    const file = ".output/server/_ssr/ssr.mjs";
    manifest = existsSync(file) ? readFileSync(file, "utf8") : "";
  }
  const out = [];
  const re = new RegExp(`"([0-9a-f]{64})":\\s*\\{\\s*functionName:\\s*"${name}_createServerFn_handler"`, "g");
  for (const match of manifest.matchAll(re)) out.push(match[1]);
  return out;
}

/** True when this request calls the named server function (e.g. "saveDoc"). */
export function isServerFn(request, name) {
  let last = "";
  try {
    last = new URL(request.url()).pathname.split("/").pop() || "";
  } catch {
    return false;
  }
  if (BUILD) return hashesFor(name).includes(last);
  try {
    return Buffer.from(last, "base64url").toString("utf8").includes(name);
  } catch {
    return false;
  }
}

/** Commit and environment line for result records. */
export function describeTarget() {
  return { base: BASE, target: TARGET };
}
