// Save-conflict recovery: the browser-only recovery copy (src/lib/doc-recovery.ts)
// and the explicit resolution steps on the save loop (src/lib/doc-saver.ts):
// keep mine (overwrite on the latest revision), use the saved one (adopt),
// and the refresh-required stop. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const R = await jiti.import("../src/lib/doc-recovery.ts");
const S = await jiti.import("../src/lib/doc-saver.ts");

function memoryBackend() {
  const map = new Map();
  return {
    map,
    get: async (key) => map.get(key),
    put: async (key, value) => void map.set(key, structuredClone(value)),
    delete: async (key) => void map.delete(key),
  };
}
const throwing = {
  get: async () => {
    throw new Error("blocked");
  },
  put: async () => {
    throw new Error("quota");
  },
  delete: async () => {
    throw new Error("blocked");
  },
};

test("recovery store: keeps one copy per account and app, and clears it", async () => {
  const backend = memoryBackend();
  let now = 1_000;
  const store = new R.RecoveryStore(backend, () => now);
  assert.equal(await store.save("user-a", "ledger", '{"entries":[1]}', 4, "conflict"), true);
  assert.equal(await store.save("user-b", "ledger", '{"entries":[2]}', 1, "retrying"), true);
  now = 2_000;
  assert.equal(await store.save("user-a", "ledger", '{"entries":[1,2]}', 4, "conflict"), true);
  const a = await store.read("user-a", "ledger");
  assert.deepEqual(a, { v: 1, owner: "user-a", slug: "ledger", payload: '{"entries":[1,2]}', baseRevision: 4, reason: "conflict", savedAt: 2_000 });
  assert.equal((await store.read("user-b", "ledger")).payload, '{"entries":[2]}', "another account's copy is separate");
  assert.equal(await store.read("user-a", "invoice"), null, "and another app's");
  assert.ok([...backend.map.keys()].every((key) => key.startsWith("midnry-recovery:v1:")));
  await store.clear("user-a", "ledger");
  assert.equal(await store.read("user-a", "ledger"), null);
  assert.ok(await store.read("user-b", "ledger"), "clearing one copy leaves the other");
});

test("recovery store: a blocked or broken store never throws", async () => {
  const store = new R.RecoveryStore(throwing);
  assert.equal(await store.save("u", "ledger", "{}", 0, "retrying"), false);
  assert.equal(await store.read("u", "ledger"), null);
  await store.clear("u", "ledger");
  const none = new R.RecoveryStore(null);
  assert.equal(await none.save("u", "ledger", "{}", 0, "retrying"), false);
  assert.equal(await none.read("u", "ledger"), null);
  // No owner (not loaded yet): nothing is stored under an empty key.
  const backend = memoryBackend();
  assert.equal(await new R.RecoveryStore(backend).save("", "ledger", "{}", 0, "retrying"), false);
  assert.equal(backend.map.size, 0);
});

test("recovery store: a copy with the wrong shape or for someone else is ignored", async () => {
  const backend = memoryBackend();
  const store = new R.RecoveryStore(backend);
  backend.map.set(R.recoveryKey("u", "ledger"), { v: 1, owner: "someone-else", slug: "ledger", payload: "{}", baseRevision: 0, reason: "conflict", savedAt: 1 });
  assert.equal(await store.read("u", "ledger"), null);
  backend.map.set(R.recoveryKey("u", "ledger"), "garbage");
  assert.equal(await store.read("u", "ledger"), null);
});

test("on load: offer a different copy, quietly drop one that was saved after all or is too old", () => {
  const record = { v: 1, owner: "u", slug: "ledger", payload: '{"a":1,"b":[2]}', baseRevision: 3, reason: "retrying", savedAt: 10_000 };
  assert.equal(R.decideOnLoad(null, '{"a":1}', 10_001), "none");
  assert.equal(R.decideOnLoad(record, '{"a":0}', 10_001), "offer");
  assert.equal(R.decideOnLoad(record, null, 10_001), "offer", "nothing saved yet: offer it");
  assert.equal(R.decideOnLoad(record, '{"a":1,"b":[2]}', 10_001), "discard", "the last save went through");
  assert.equal(R.decideOnLoad(record, '{ "a": 1, "b": [ 2 ] }', 10_001), "discard", "formatting doesn't matter");
  assert.equal(R.decideOnLoad(record, '{"a":0}', 10_000 + R.MAX_AGE_MS + 1), "discard", "too old");
});

test("download name and pretty text for my version", () => {
  assert.equal(R.downloadName("ledger", new Date(2026, 9, 22, 14, 5)), "midnry-ledger-my-version-2026-10-22-1405.json");
  assert.equal(R.downloadName("../x y", new Date(2026, 0, 2, 3, 4), "txt"), "midnry-xy-my-version-2026-01-02-0304.txt");
  assert.equal(R.prettyPayload('{"a":[1]}'), '{\n  "a": [\n    1\n  ]\n}');
  assert.equal(R.prettyPayload("not json"), "not json");
});

test("open issues: one per app, tucked away and reopened", () => {
  const seen = [];
  const off = R.docIssues.subscribe(() => seen.push(R.docIssues.get().length));
  const base = { mine: () => "{}", loadSaved: async () => ({ payload: null, revision: 0 }) };
  R.docIssues.set({ ...base, slug: "ledger", kind: "conflict", open: true });
  R.docIssues.set({ ...base, slug: "ledger", kind: "refresh", open: true });
  assert.equal(R.docIssues.get().length, 1, "a newer issue for the same app replaces the old");
  R.docIssues.open("ledger", false);
  assert.equal(R.docIssues.get()[0].open, false);
  R.docIssues.open("ledger");
  assert.equal(R.docIssues.get()[0].open, true);
  R.docIssues.clear("ledger", "conflict");
  assert.equal(R.docIssues.has("ledger"), true, "clearing another kind leaves it");
  R.docIssues.clear("ledger");
  assert.equal(R.docIssues.has("ledger"), false);
  off();
  assert.ok(seen.length >= 5);
});

// ── resolution on the save loop ─────────────────────────────────────────────

function harness(responses) {
  const timers = [];
  const states = [];
  const events = [];
  const sent = [];
  const saver = new S.DocSaver({
    limit: 10_000,
    save: (payload, base) => {
      sent.push({ payload, base });
      const next = responses.shift();
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    },
    onState: (state) => states.push(state),
    onEvent: (event) => events.push(event),
    setTimer: (fn, ms) => {
      const timer = { fn, ms, live: true };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer) => {
      if (timer) timer.live = false;
    },
  });
  const runTimers = () => {
    for (const timer of timers.splice(0)) if (timer.live) timer.fn();
  };
  return { saver, states, events, sent, runTimers };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

async function conflicted(responses) {
  const h = harness([{ ok: false, error: "conflict", revision: 7 }, ...responses]);
  h.saver.start(5);
  h.saver.change({ mine: 1 });
  h.runTimers();
  await settle();
  assert.equal(h.states.at(-1), "conflict");
  return h;
}

test("resolve: nothing is sent after a conflict until the person chooses", async () => {
  const h = await conflicted([]);
  h.saver.change({ mine: 2 });
  h.runTimers();
  h.saver.flush();
  await settle();
  assert.equal(h.sent.length, 1, "no silent overwrite");
  assert.deepEqual(h.saver.unsaved, { mine: 2 }, "my latest version is kept");
});

test("resolve: keep my version saves it on the latest revision, explicitly", async () => {
  const h = await conflicted([{ ok: true, revision: 9 }]);
  h.saver.change({ mine: 2 });
  h.saver.overwrite(8);
  await settle();
  assert.deepEqual(h.sent.at(-1), { payload: '{"mine":2}', base: 8 }, "based on the latest revision");
  assert.equal(h.states.at(-1), "saved");
  assert.equal(h.saver.revision, 9);
  assert.equal(h.saver.unsaved, null);
});

test("resolve: keeping mine conflicts again if yet another save landed first", async () => {
  const h = await conflicted([{ ok: false, error: "conflict", revision: 10 }]);
  h.saver.overwrite(8);
  await settle();
  assert.equal(h.states.at(-1), "conflict");
  assert.deepEqual(h.events.filter((e) => e === "conflict").length, 2);
  assert.deepEqual(h.saver.unsaved, { mine: 1 }, "still kept");
});

test("resolve: use the newer saved version drops mine and continues from it", async () => {
  const h = await conflicted([{ ok: true, revision: 9 }]);
  h.saver.adopt(8);
  assert.equal(h.saver.unsaved, null);
  assert.equal(h.saver.stopped, null);
  assert.equal(h.states.at(-1), "saved");
  h.saver.change({ next: true });
  h.runTimers();
  await settle();
  assert.deepEqual(h.sent.at(-1), { payload: '{"next":true}', base: 8 });
});

test("resolve: overwrite does nothing unless there is a conflict", async () => {
  const h = harness([{ ok: true, revision: 1 }]);
  h.saver.start(0);
  h.saver.overwrite(99);
  assert.equal(h.saver.revision, 0);
  assert.equal(h.sent.length, 0);
});

test("refresh required: saving stops for good and the change is kept", async () => {
  const h = harness([{ ok: false, error: "refresh_required", revision: 4 }]);
  h.saver.start(0);
  h.saver.change({ legacy: true });
  h.runTimers();
  await settle();
  assert.equal(h.states.at(-1), "refresh");
  assert.deepEqual(h.events, ["refresh-required"]);
  assert.deepEqual(h.saver.unsaved, { legacy: true });
  h.saver.overwrite(4);
  h.saver.adopt(4);
  h.saver.flush();
  await settle();
  assert.equal(h.sent.length, 1, "neither overwrite nor adopt resumes an outdated page");
  assert.equal(h.saver.dirty, true, "leaving still asks first");
});
