// The whole recovery flow of one open app document (src/lib/doc-session.ts),
// run in Node with a memory store, fake timers and a scripted server:
//  - "Refresh now" reloads only once the copy is stored; a browser that will
//    not store it keeps the page open and the document, and Refresh anyway is
//    explicit;
//  - leaving the tool while a save is pending keeps a copy first, and a late
//    conflict, failure or refresh after navigation keeps it with its reason;
//  - a late success clears the copy it kept, and only that copy;
//  - reopening offers the copy back, restores it, and clears it once saved;
//  - copies are isolated by account and by app.
// Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const R = await jiti.import("../src/lib/doc-recovery.ts");
const { DocSession } = await jiti.import("../src/lib/doc-session.ts");

const settle = async (n = 4) => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => setImmediate(resolve));
};

function memoryBackend() {
  const map = new Map();
  return {
    map,
    get: async (key) => map.get(key),
    put: async (key, value) => void map.set(key, structuredClone(value)),
    delete: async (key) => void map.delete(key),
  };
}

/** A scripted server: one row per (owner, slug) with a revision, like app_documents. */
function server() {
  const rows = new Map();
  const key = (owner, slug) => `${owner}:${slug}`;
  return {
    rows,
    seed(owner, slug, payload, revision = 1) {
      rows.set(key(owner, slug), { payload, revision });
    },
    get(owner, slug) {
      return rows.get(key(owner, slug)) ?? { payload: null, revision: 0 };
    },
    load(owner, slug) {
      return async () => ({ ok: true, ...this.get(owner, slug), owner });
    },
    /** A revision-checked save; `gate` can delay, fail or refuse each request. */
    save(owner, slug, gate = async () => null) {
      return async (payload, baseRevision) => {
        const forced = await gate(payload, baseRevision);
        if (forced instanceof Error) throw forced;
        if (forced) return forced;
        const row = this.get(owner, slug);
        if (row.revision !== baseRevision) return { ok: false, error: "conflict", revision: row.revision };
        const next = { payload, revision: row.revision + 1 };
        rows.set(key(owner, slug), next);
        return { ok: true, revision: next.revision };
      };
    },
  };
}

function harness({ owner = "user-a", slug = "ledger", backend = memoryBackend(), srv = server(), gate, store, limit = 10_000 } = {}) {
  const timers = [];
  const log = { data: [], states: [], events: [], loaded: null, reloads: 0 };
  const session = new DocSession({
    slug,
    limit,
    store: store ?? new R.RecoveryStore(backend),
    fallback: () => ({ entries: [] }),
    load: srv.load(owner, slug),
    save: srv.save(owner, slug, gate),
    onData: (value) => log.data.push(value),
    onLoaded: (status) => (log.loaded = status),
    onSaveState: (state) => log.states.push(state),
    notify: (event) => log.events.push(event),
    reload: () => (log.reloads += 1),
    setTimer: (fn, ms) => {
      const timer = { fn, ms, live: true };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer) => {
      if (timer) timer.live = false;
    },
    debounceMs: 350,
    copyDebounceMs: 400,
  });
  const runTimers = () => {
    for (const timer of timers.splice(0)) if (timer.live) timer.fn();
  };
  const copy = () => backend.map.get(R.recoveryKey(owner, slug)) ?? null;
  const issue = (kind) => R.docIssues.get().find((item) => item.slug === slug && (!kind || item.kind === kind)) ?? null;
  return { session, timers, runTimers, log, backend, srv, copy, issue, owner, slug };
}

test.afterEach(() => {
  for (const item of R.docIssues.get()) R.docIssues.clear(item.slug);
});

// ── 1. "Refresh now" and a browser that will not store the copy ─────────────

test("refresh now: reloads only after the copy is stored, and offers the copy back after the reload", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 3);
  const h = harness({ srv, gate: async () => ({ ok: false, error: "refresh_required", revision: 3 }) });
  await h.session.open();
  h.session.change({ entries: ["saved", "typed on an outdated page"] });
  h.runTimers();
  await settle();
  assert.equal(h.log.states.at(-1), "refresh");
  const refresh = h.issue("refresh");
  assert.ok(refresh, "the refresh panel is open");
  assert.equal(h.copy()?.reason, "refresh", "the copy is kept when the save is refused");
  assert.equal(await refresh.refresh(), "reloading");
  assert.equal(h.log.reloads, 1, "the page reloads once the copy is stored");
  assert.equal(h.session.beforeUnload(), false, "leaving on purpose: no 'leave page?' prompt");
  // After the reload: a fresh session for the same account and app offers it.
  const next = harness({ srv, backend: h.backend });
  await next.session.open();
  const offer = next.issue("recovered");
  assert.ok(offer, "the kept copy is offered back after the refresh");
  assert.equal(offer.mine(), JSON.stringify({ entries: ["saved", "typed on an outdated page"] }));
  await offer.useSaved();
  assert.equal(next.copy(), null, "discarding clears it");
});

test("refresh now: when storing the copy fails, the page is not reloaded and the document stays open", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 3);
  let allowWrites = true;
  const backend = memoryBackend();
  const flaky = {
    get: backend.get,
    put: async (key, value) => {
      if (!allowWrites) throw new Error("QuotaExceededError");
      return backend.put(key, value);
    },
    delete: backend.delete,
  };
  const h = harness({ srv, backend, store: new R.RecoveryStore(flaky), gate: async () => ({ ok: false, error: "refresh_required", revision: 3 }) });
  await h.session.open();
  allowWrites = false;
  const mine = { entries: ["saved", "typed while storage is blocked"] };
  h.session.change(mine);
  h.runTimers();
  await settle();
  const refresh = h.issue("refresh");
  assert.ok(refresh);
  assert.equal(h.copy(), null, "nothing could be stored");
  assert.equal(await refresh.refresh(), "not-stored", "Refresh now reports that no copy was kept");
  assert.equal(h.log.reloads, 0, "and does not reload");
  assert.deepEqual(h.session.data, mine, "the open document is untouched");
  assert.equal(refresh.mine(), JSON.stringify(mine), "Copy / Download still give my version");
  assert.ok(h.issue("refresh"), "the panel stays for the person to decide");
  assert.equal(h.session.beforeUnload(), true, "the browser's own reload still asks first");
  // Storage comes back: Refresh now works again.
  allowWrites = true;
  assert.equal(await refresh.refresh(), "reloading");
  assert.equal(h.copy()?.reason, "refresh");
  assert.equal(h.log.reloads, 1);
});

test("refresh now: a store that accepts the write but cannot read it back counts as not stored; Refresh anyway is explicit", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 3);
  const backend = memoryBackend();
  const writeOnly = { get: async () => undefined, put: backend.put, delete: backend.delete };
  const h = harness({ srv, backend, store: new R.RecoveryStore(writeOnly), gate: async () => ({ ok: false, error: "refresh_required", revision: 3 }) });
  await h.session.open();
  h.session.change({ entries: ["saved", "more"] });
  h.runTimers();
  await settle();
  const refresh = h.issue("refresh");
  assert.equal(await refresh.refresh(), "not-stored");
  assert.equal(h.log.reloads, 0);
  refresh.refreshAnyway();
  assert.equal(h.log.reloads, 1, "refreshing without a copy is a separate, explicit choice");
  assert.equal(h.session.beforeUnload(), false);
});

// ── 2. Leaving the tool while a save is pending ─────────────────────────────

test("navigation during the pause: a pending copy is kept, and a late conflict keeps it with its reason", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 3);
  let release;
  const held = new Promise((resolve) => (release = resolve));
  const h = harness({ srv, gate: () => held });
  await h.session.open();
  h.session.change({ entries: ["saved", "typed then left at once"] });
  assert.equal(h.timers.filter((t) => t.live).length, 1, "the save is still waiting for the pause");
  h.session.close();
  await settle();
  assert.equal(h.copy()?.reason, "pending", "a copy is kept before the tool closes");
  assert.ok(h.copy().payload.includes("typed then left at once"));
  // Meanwhile another tab saves a newer version, so the request conflicts when it lands.
  srv.seed("user-a", "ledger", '{"entries":["saved","from another tab"]}', 4);
  release(null);
  await settle();
  const copy = h.copy();
  assert.equal(copy.reason, "conflict", "the late conflict is recorded on the copy");
  assert.ok(copy.payload.includes("typed then left at once"), "with my version");
  assert.equal(srv.get("user-a", "ledger").payload, '{"entries":["saved","from another tab"]}', "nothing was overwritten");
  assert.equal(h.issue(), null, "no panel is shown on the page that was left");
  // Coming back to the app offers it.
  const next = harness({ srv, backend: h.backend });
  await next.session.open();
  const offer = next.issue("recovered");
  assert.ok(offer, "the unsaved change is offered when the app opens again");
  assert.ok(offer.mine().includes("typed then left at once"));
  await offer.keepMine();
  next.runTimers();
  await settle();
  assert.ok(srv.get("user-a", "ledger").payload.includes("typed then left at once"), "restoring saves it over the latest revision");
  assert.equal(srv.get("user-a", "ledger").revision, 5);
  assert.equal(next.copy(), null, "and the copy is cleared once saved");
});

test("navigation with a save in flight: a late network failure keeps the copy through the retries after close", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 1);
  let fail = true;
  const h = harness({ srv, gate: async () => (fail ? new Error("offline") : null) });
  await h.session.open();
  h.session.change({ entries: ["saved", "typed offline"] });
  h.runTimers();
  h.session.close();
  await settle();
  assert.equal(h.copy()?.reason, "retrying", "the failed request after close keeps the copy with its reason");
  // The closed saver retries a few times, then gives up; the copy stays.
  for (let i = 0; i < 5; i += 1) {
    h.runTimers();
    await settle();
  }
  assert.equal(h.timers.filter((t) => t.live).length, 0, "no retries are left");
  assert.ok(h.copy()?.payload.includes("typed offline"), "the copy survives the exhausted retries");
  assert.equal(h.log.states.at(-1), "saving", "nothing is shown to the closed page");
  fail = false;
  const next = harness({ srv, backend: h.backend });
  await next.session.open();
  assert.ok(next.issue("recovered"), "reopening offers it");
});

test("navigation with a save in flight: a late refresh_required keeps the copy", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 2);
  let release;
  const held = new Promise((resolve) => (release = resolve));
  const h = harness({ srv, gate: () => held });
  await h.session.open();
  h.session.change({ entries: ["saved", "outdated page"] });
  h.runTimers();
  h.session.close();
  await settle();
  assert.equal(h.copy()?.reason, "pending");
  release({ ok: false, error: "refresh_required", revision: 2 });
  await settle();
  assert.equal(h.copy()?.reason, "refresh");
});

test("navigation during the pause: a late success clears the pending copy, so nothing is offered", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 3);
  let release;
  const held = new Promise((resolve) => (release = resolve));
  const h = harness({ srv, gate: () => held });
  await h.session.open();
  h.session.change({ entries: ["saved", "typed then left"] });
  h.session.close();
  await settle();
  assert.equal(h.copy()?.reason, "pending");
  release(null);
  await settle();
  assert.equal(srv.get("user-a", "ledger").revision, 4, "the save landed after the tool closed");
  assert.equal(h.copy(), null, "the pending copy is cleared");
  const next = harness({ srv, backend: h.backend });
  await next.session.open();
  assert.equal(next.issue(), null, "nothing is offered");
});

test("a late success clears only its own copy, not one a newer page kept for a save that did fail", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 3);
  let release;
  const held = new Promise((resolve) => (release = resolve));
  const old = harness({ srv, gate: () => held });
  await old.session.open();
  old.session.change({ entries: ["saved", "from the old page"] });
  old.session.close();
  await settle();
  assert.equal(old.copy()?.reason, "pending");
  // The person reopens the app at once; its save fails, so it keeps its own copy.
  const fresh = harness({ srv, backend: old.backend, gate: async () => new Error("offline") });
  await fresh.session.open();
  assert.equal(fresh.issue("recovered")?.kind, "recovered", "the old page's pending copy is on offer");
  await fresh.issue("recovered").useSaved();
  fresh.session.change({ entries: ["saved", "from the new page"] });
  fresh.runTimers();
  await settle();
  assert.ok(fresh.copy()?.payload.includes("from the new page"));
  // Now the old request lands.
  release(null);
  await settle();
  assert.ok(fresh.copy()?.payload.includes("from the new page"), "the newer page's copy is left alone");
});

// ── 3. Leaving the page (reload, closed tab) and recovery on reopen ────────

test("pagehide with a save pending keeps a pending copy; it is offered back unless the keepalive save landed", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 3);
  let lands = false;
  const h = harness({ srv, gate: async () => (lands ? null : new Promise(() => {})) });
  await h.session.open();
  h.session.change({ entries: ["saved", "typed before closing the tab"] });
  assert.equal(h.session.beforeUnload(), true, "the browser asks before leaving");
  h.session.pageHide();
  await settle();
  assert.equal(h.copy()?.reason, "pending");
  // The keepalive request never landed: the next open offers the copy.
  const next = harness({ srv, backend: h.backend });
  await next.session.open();
  assert.ok(next.issue("recovered"), "offered back after the reload");
  await next.issue("recovered").useSaved();
  // Same again, but this time the keepalive save lands: nothing is offered.
  lands = true;
  const h2 = harness({ srv, backend: h.backend });
  await h2.session.open();
  h2.session.change({ entries: ["saved", "typed before closing, saved after all"] });
  h2.session.pageHide();
  await settle();
  assert.equal(srv.get("user-a", "ledger").payload, '{"entries":["saved","typed before closing, saved after all"]}');
  const again = harness({ srv, backend: h.backend });
  await again.session.open();
  assert.equal(again.issue(), null, "a copy equal to what was saved is dropped quietly");
  assert.equal(again.copy(), null);
});

test("reload recovery: a copy from a failed save is offered, restored over the latest revision, and cleared once saved", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 1);
  const h = harness({ srv, gate: async () => new Error("offline") });
  await h.session.open();
  h.session.change({ entries: ["saved", "typed offline"] });
  h.runTimers();
  await settle();
  assert.equal(h.log.states.at(-1), "retrying");
  assert.deepEqual(h.log.events, ["retrying"]);
  assert.equal(h.copy()?.reason, "retrying");
  h.session.change({ entries: ["saved", "typed offline", "and more"] });
  h.runTimers();
  await settle();
  assert.ok(h.copy().payload.includes("and more"), "the copy follows further typing");
  // Reload while still offline, then another device saves a newer version.
  srv.seed("user-a", "ledger", '{"entries":["saved","from my phone"]}', 2);
  const next = harness({ srv, backend: h.backend });
  await next.session.open();
  const offer = next.issue("recovered");
  assert.ok(offer);
  assert.ok(offer.savedAt > 0);
  assert.deepEqual(await offer.loadSaved(), { payload: '{"entries":["saved","from my phone"]}', revision: 2 });
  await offer.keepMine();
  assert.deepEqual(next.log.data.at(-1), { entries: ["saved", "typed offline", "and more"] }, "the page shows my version");
  next.runTimers();
  await settle();
  assert.equal(next.log.states.at(-1), "saved");
  assert.equal(srv.get("user-a", "ledger").revision, 3);
  assert.equal(next.copy(), null, "cleared once saved");
});

// ── 4. Successful-save cleanup ──────────────────────────────────────────────

test("successful save after a problem clears the copy; a copy for an unrelated version is left", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 1);
  let fail = true;
  const h = harness({ srv, gate: async () => (fail ? new Error("offline") : null) });
  await h.session.open();
  h.session.change({ entries: ["saved", "offline edit"] });
  h.runTimers();
  await settle();
  assert.equal(h.copy()?.reason, "retrying");
  fail = false;
  h.runTimers();
  await settle();
  assert.equal(h.log.states.at(-1), "saved");
  assert.ok(h.log.events.includes("saved-after-retry"));
  assert.equal(h.copy(), null, "the copy is cleared");
  assert.equal(srv.get("user-a", "ledger").revision, 2);
  // A later save never touches a copy it did not keep.
  h.backend.map.set(R.recoveryKey("user-a", "ledger"), { v: 1, owner: "user-a", slug: "ledger", payload: '{"entries":["someone else’s unsaved copy"]}', baseRevision: 1, reason: "conflict", savedAt: 1 });
  h.session.change({ entries: ["saved", "offline edit", "online edit"] });
  h.runTimers();
  await settle();
  assert.equal(h.log.states.at(-1), "saved");
  assert.ok(h.copy()?.payload.includes("someone else"), "left for the next open");
});

// ── 5. Isolation by account and app ────────────────────────────────────────

test("copies are isolated by account and by app", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["a"]}', 1);
  srv.seed("user-b", "ledger", '{"entries":["b"]}', 1);
  srv.seed("user-a", "invoice", '{"entries":["inv"]}', 1);
  const backend = memoryBackend();
  const a = harness({ srv, backend, gate: async () => new Error("offline") });
  await a.session.open();
  a.session.change({ entries: ["a", "user a’s unsaved ledger"] });
  a.runTimers();
  await settle();
  assert.equal(a.copy()?.owner, "user-a");
  // The same browser, another account (signed out and in as someone else): nothing offered.
  const b = harness({ srv, backend, owner: "user-b" });
  await b.session.open();
  assert.equal(b.issue(), null, "another account is never offered this copy");
  assert.deepEqual(b.log.data.at(-1), { entries: ["b"] });
  // The same account, another app: nothing offered.
  const inv = harness({ srv, backend, slug: "invoice" });
  await inv.session.open();
  assert.equal(inv.issue(), null, "another app is never offered this copy");
  // A record under the right key but for another owner is ignored, not offered.
  backend.map.set(R.recoveryKey("user-b", "ledger"), { ...a.copy(), owner: "user-a" });
  const b2 = harness({ srv, backend, owner: "user-b" });
  await b2.session.open();
  assert.equal(b2.issue(), null);
  // The owner comes back: offered.
  const a2 = harness({ srv, backend });
  await a2.session.open();
  assert.ok(a2.issue("recovered"));
  assert.ok([...backend.map.keys()].every((key) => /^midnry-recovery:v1:user-[ab]:(ledger|invoice)$/.test(key)));
});

test("no copy is ever written before the account is known, or when the app is locked", async () => {
  const backend = memoryBackend();
  const h = harness({ backend });
  h.session.change({ entries: ["typed before the load finished"] });
  h.session.pageHide();
  h.session.close();
  await settle();
  assert.equal(backend.map.size, 0, "no owner, no copy (nothing is written under an empty key)");
  const locked = new DocSession({
    slug: "ledger",
    limit: 1000,
    store: new R.RecoveryStore(backend),
    fallback: () => ({}),
    load: async () => ({ ok: false, error: "locked" }),
    save: async () => ({ ok: false, error: "locked" }),
    onData: () => {},
    onLoaded: (status) => assert.deepEqual(status, { blocked: true, loadError: false }),
    onSaveState: () => {},
    reload: () => {},
  });
  await locked.open();
  assert.equal(backend.map.size, 0);
});

// ── 6. Leaving inside the app when this browser cannot keep a copy ──────────

test("leaving with an unsaved change asks first only when no copy can be kept", async () => {
  const srv = server();
  srv.seed("user-a", "ledger", '{"entries":["saved"]}', 1);
  // Storage works: a pending change never blocks navigation (the copy is kept instead).
  const fine = harness({ srv, gate: () => new Promise(() => {}) });
  await fine.session.open();
  await settle();
  fine.session.change({ entries: ["saved", "pending"] });
  assert.equal(fine.session.mustConfirmLeave(), false, "storage works: no question, a copy is kept");
  assert.equal(fine.backend.map.has(R.recoveryKey("user-a", "__probe__")), false, "the probe record is removed");

  // Storage blocked (private mode, full disk): ask before leaving with an unsaved change.
  const throwing = { get: async () => undefined, put: async () => { throw new Error("QuotaExceededError"); }, delete: async () => {} };
  let fail = true;
  const blocked = harness({ srv, store: new R.RecoveryStore(throwing), gate: async () => (fail ? new Error("offline") : null) });
  await blocked.session.open();
  await settle();
  assert.equal(blocked.session.mustConfirmLeave(), false, "nothing unsaved: no question");
  blocked.session.change({ entries: ["saved", "typed with storage blocked"] });
  assert.equal(blocked.session.mustConfirmLeave(), true, "unsaved during the pause: ask");
  blocked.runTimers();
  await settle();
  assert.equal(blocked.log.states.at(-1), "retrying");
  assert.equal(blocked.session.mustConfirmLeave(), true, "still unsaved while retrying: ask");
  fail = false;
  blocked.runTimers();
  await settle();
  assert.equal(blocked.log.states.at(-1), "saved");
  assert.equal(blocked.session.mustConfirmLeave(), false, "saved: no question");
});

test("the storage probe is per account and never offered as an app's copy", async () => {
  const backend = memoryBackend();
  const store = new R.RecoveryStore(backend);
  assert.equal(await store.canKeep("user-a"), true);
  assert.equal(await store.canKeep(""), false, "no account, no probe");
  assert.equal(backend.map.size, 0, "nothing is left behind");
  assert.equal(await new R.RecoveryStore(null).canKeep("user-a"), false);
  const readBackFails = { get: async () => undefined, put: backend.put, delete: backend.delete };
  assert.equal(await new R.RecoveryStore(readBackFails).canKeep("user-a"), false, "a write that can't be read back doesn't count");
});

// ── 7. Another account signs in on this browser while a save is waiting ─────

test("a page opened for one account never saves into another: the server refuses, the copy stays with the first account", async () => {
  const srv = server();
  srv.seed("user-a", "ice-card", '{"values":{"name":"A saved"}}', 1);
  srv.seed("user-b", "ice-card", '{"values":{"name":"B saved"}}', 1);
  let signedIn = "user-a";
  let offline = true;
  const sent = [];
  // Like saveDoc: the session decides where it lands; a named owner that differs is refused.
  const save = async (payload, baseRevision, keepalive, owner) => {
    sent.push(owner);
    if (offline) throw new Error("offline");
    if (owner !== signedIn) return { ok: false, error: "wrong_account" };
    return srv.save(signedIn, "ice-card")(payload, baseRevision);
  };
  const backend = memoryBackend();
  const timers = [];
  const log = { states: [], events: [] };
  const session = new DocSession({
    slug: "ice-card",
    limit: 10_000,
    store: new R.RecoveryStore(backend),
    fallback: () => ({ values: {} }),
    load: srv.load("user-a", "ice-card"),
    save,
    onData: () => {},
    onLoaded: () => {},
    onSaveState: (state) => log.states.push(state),
    notify: (event) => log.events.push(event),
    reload: () => {},
    setTimer: (fn) => {
      const timer = { fn, live: true };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer) => timer && (timer.live = false),
  });
  const run = () => {
    for (const timer of timers.splice(0)) if (timer.live) timer.fn();
  };
  await session.open();
  session.change({ values: { name: "A's private note" } });
  run();
  await settle();
  assert.equal(log.states.at(-1), "retrying");
  // B signs in on the same browser; A's tab is still open and the network comes back.
  signedIn = "user-b";
  offline = false;
  run();
  await settle();
  assert.ok(sent.every((owner) => owner === "user-a"), "every save names the account the page was opened for");
  assert.equal(log.states.at(-1), "account");
  assert.ok(log.events.includes("account-changed"));
  assert.equal(srv.get("user-b", "ice-card").payload, '{"values":{"name":"B saved"}}', "nothing was written into B's card");
  assert.equal(srv.get("user-a", "ice-card").payload, '{"values":{"name":"A saved"}}', "nor into A's while B is signed in");
  const copy = backend.map.get(R.recoveryKey("user-a", "ice-card"));
  assert.equal(copy?.reason, "account");
  assert.ok(copy.payload.includes("A's private note"), "kept for A");
  assert.equal(backend.map.has(R.recoveryKey("user-b", "ice-card")), false, "never kept for B");
  const issue = R.docIssues.get().find((item) => item.slug === "ice-card");
  assert.equal(issue?.kind, "account", "the panel explains it");
  // Saving stops for good on this page: further typing is kept, never sent.
  const before = sent.length;
  session.change({ values: { name: "more" } });
  run();
  await settle();
  assert.equal(sent.length, before, "no further saves from this page");
  // A signs in again later: offered back.
  signedIn = "user-a";
  const again = harness({ srv, backend, slug: "ice-card" });
  await again.session.open();
  assert.equal(again.issue("recovered")?.kind, "recovered");
});
