import test from "node:test";
import assert from "node:assert/strict";
import {
  BUSES,
  TRIGGERS,
  BUS_DEFAULTS,
  BUS_SLIDER,
  MASTER_LOUDNESS,
  SHOT_PRESENCE,
  COMBAT_MODES,
  DUCK_RULES,
  DUCK_TARGETS,
  DUCK_ATTACK,
  DUCK_RELEASE,
  DUCK_HOLD,
  dbToGain,
  gainToDb,
  rampTimeConstant,
  normalizeSettings,
  levelFor,
  masterLevel,
  activeTriggers,
  duckDepthDb,
  duckGainFor,
  shotPresence,
} from "../public/games/outpost-mix.js";

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);
const DEFAULTS = normalizeSettings(null);

test("every bus has a default level, a slider assignment and is in the table once", () => {
  assert.deepEqual(BUSES, ["weapons", "hits", "alerts", "ui", "world", "music", "voice"]);
  assert.equal(new Set(BUSES).size, BUSES.length);
  for (const bus of BUSES) {
    assert.ok(BUS_DEFAULTS[bus] > 0, `${bus} has a positive trim`);
    assert.ok(bus in BUS_SLIDER, `${bus} names its slider (or null)`);
  }
  assert.deepEqual(Object.keys(BUS_DEFAULTS).sort(), [...BUSES].sort());
  // Gunfire is the reference; alerts are the only bus clearly above it.
  assert.equal(BUS_DEFAULTS.weapons, 1);
  assert.ok(BUS_DEFAULTS.alerts > BUS_DEFAULTS.weapons);
  assert.ok(BUS_DEFAULTS.music < BUS_DEFAULTS.world && BUS_DEFAULTS.world < BUS_DEFAULTS.weapons);
  for (const trigger of TRIGGERS) assert.ok(BUSES.includes(trigger));
});

test("dB maths", () => {
  near(dbToGain(0), 1, "0 dB is unity");
  near(dbToGain(-6), 0.5011872336272722, "−6 dB is about half");
  near(gainToDb(1), 0, "unity is 0 dB");
  near(gainToDb(dbToGain(-4)), -4, "round trip");
  assert.equal(gainToDb(0), -Infinity);
  near(rampTimeConstant(0.03), 0.01, "30 ms attack is a 10 ms constant");
  near(rampTimeConstant(DUCK_RELEASE), DUCK_RELEASE / 3, "release constant");
});

test("settings normalise with the historic defaults and clamp", () => {
  assert.deepEqual(DEFAULTS, { volume: 0.35, muted: false, effects: 1, music: 0.6, alerts: 1, combat: "full" });
  const odd = normalizeSettings({ volume: 7, muted: 1, effects: -2, music: "x", alerts: 0.4, combat: "loud" });
  assert.deepEqual(odd, { volume: 1, muted: true, effects: 0, music: 0.6, alerts: 0.4, combat: "full" });
  assert.deepEqual(COMBAT_MODES, ["full", "reduced", "off"]);
  for (const combat of COMBAT_MODES) assert.equal(normalizeSettings({ combat }).combat, combat);
});

test("bus levels at default settings are the bus trims (music keeps its 0.6 × 0.55)", () => {
  for (const bus of BUSES)
    near(levelFor(bus, DEFAULTS), BUS_DEFAULTS[bus] * (bus === "music" ? 0.6 : 1), bus);
  assert.equal(levelFor("nonsense", DEFAULTS), 0);
});

test("the Effects slider scales weapons, hits, ui and world only", () => {
  const s = { ...DEFAULTS, effects: 0.5 };
  for (const bus of ["weapons", "hits", "ui", "world"]) near(levelFor(bus, s), BUS_DEFAULTS[bus] * 0.5, bus);
  near(levelFor("music", s), levelFor("music", DEFAULTS), "music untouched");
  near(levelFor("alerts", s), levelFor("alerts", DEFAULTS), "alerts untouched");
  near(levelFor("voice", s), 1, "voice untouched");
  assert.equal(levelFor("weapons", { ...DEFAULTS, effects: 0 }), 0);
});

test("the Music and Alerts sliders each scale their own bus", () => {
  near(levelFor("music", { ...DEFAULTS, music: 1 }), BUS_DEFAULTS.music, "music at full");
  near(levelFor("music", { ...DEFAULTS, music: 0 }), 0, "music off");
  near(levelFor("alerts", { ...DEFAULTS, alerts: 0.5 }), BUS_DEFAULTS.alerts * 0.5, "alerts half");
  near(levelFor("weapons", { ...DEFAULTS, alerts: 0.5, music: 0 }), BUS_DEFAULTS.weapons, "others untouched");
});

test("master is volume × loudness, and mute silences it (and only it)", () => {
  near(masterLevel(DEFAULTS), 0.35 * MASTER_LOUDNESS, "default master");
  near(masterLevel({ ...DEFAULTS, volume: 0.25 }), 0.25 * MASTER_LOUDNESS, "lower master");
  assert.equal(masterLevel({ ...DEFAULTS, muted: true }), 0);
  // Buses keep their levels under mute: the one gain on master quiets all
  // of them (voice included) and un-muting needs no re-mix.
  near(levelFor("voice", { ...DEFAULTS, muted: true }), 1, "voice level under mute");
  near(levelFor("weapons", { ...DEFAULTS, muted: true }), 1, "weapons level under mute");
});

test("combat intensity: Reduced halves weapons and hits, Off silences them, alerts and voice stay", () => {
  const reduced = { ...DEFAULTS, combat: "reduced" },
    off = { ...DEFAULTS, combat: "off" };
  near(levelFor("weapons", reduced), 0.5, "reduced weapons");
  near(levelFor("hits", reduced), BUS_DEFAULTS.hits * 0.5, "reduced hits");
  assert.equal(levelFor("weapons", off), 0);
  assert.equal(levelFor("hits", off), 0);
  for (const s of [reduced, off]) {
    near(levelFor("alerts", s), BUS_DEFAULTS.alerts, "alerts unaffected");
    near(levelFor("voice", s), 1, "voice unaffected");
    near(levelFor("world", s), BUS_DEFAULTS.world, "footsteps unaffected");
    near(levelFor("music", s), levelFor("music", DEFAULTS), "music unaffected");
  }
});

test("ducking rules stay subtle (3–6 dB) and name real buses", () => {
  for (const rule of DUCK_RULES) {
    assert.ok(TRIGGERS.includes(rule.trigger), `${rule.trigger} is a trigger`);
    assert.ok(BUSES.includes(rule.target), `${rule.target} is a bus`);
    assert.notEqual(rule.trigger, rule.target);
    assert.ok(rule.db <= -3 && rule.db >= -6, `${rule.trigger}→${rule.target} ${rule.db} dB`);
  }
  assert.deepEqual([...DUCK_TARGETS].sort(), ["music", "weapons", "world"]);
  assert.equal(DUCK_ATTACK, 0.03);
  assert.equal(DUCK_RELEASE, 0.4);
  for (const t of TRIGGERS) assert.ok(DUCK_HOLD[t] > 0, `${t} has a hold`);
  // Alerts hold long enough to bridge the siren's 340 ms tone spacing.
  assert.ok(DUCK_HOLD.alerts > 0.34);
});

test("ducking depth: nothing active is unity; gunfire dips music 4 dB and world 3 dB", () => {
  assert.equal(duckDepthDb("music", [], DEFAULTS), 0);
  near(duckGainFor("music", [], DEFAULTS), 1, "no duck");
  assert.equal(duckDepthDb("music", ["weapons"], DEFAULTS), -4);
  assert.equal(duckDepthDb("world", ["weapons"], DEFAULTS), -3);
  assert.equal(duckDepthDb("weapons", ["weapons"], DEFAULTS), 0, "a bus never ducks itself");
  assert.equal(duckDepthDb("alerts", ["weapons", "alerts", "voice"], DEFAULTS), 0, "alerts never duck");
  assert.equal(duckDepthDb("hits", ["weapons", "alerts"], DEFAULTS), 0, "hits never duck");
  near(duckGainFor("music", ["weapons"], DEFAULTS), dbToGain(-4), "music under fire");
});

test("ducking depth: alerts pull harder, nudge weapons, and the deepest rule wins (no summing)", () => {
  assert.equal(duckDepthDb("music", ["alerts"], DEFAULTS), -6);
  assert.equal(duckDepthDb("world", ["alerts"], DEFAULTS), -5);
  assert.equal(duckDepthDb("weapons", ["alerts"], DEFAULTS), -3);
  assert.equal(duckDepthDb("music", ["weapons", "alerts"], DEFAULTS), -6, "not −10");
  assert.equal(duckDepthDb("music", ["voice"], DEFAULTS), -4);
  assert.equal(duckDepthDb("music", ["voice", "weapons"], DEFAULTS), -4);
  assert.equal(duckDepthDb("world", ["voice"], DEFAULTS), 0, "voice leaves footsteps alone");
});

test("intensity modes change ducking: Reduced halves depth, Off ignores the silent weapons", () => {
  const reduced = { ...DEFAULTS, combat: "reduced" },
    off = { ...DEFAULTS, combat: "off" };
  assert.equal(duckDepthDb("music", ["weapons"], reduced), -2);
  assert.equal(duckDepthDb("music", ["alerts"], reduced), -3);
  assert.equal(duckDepthDb("music", ["weapons"], off), 0, "silent guns move nothing");
  assert.equal(duckDepthDb("world", ["weapons"], off), 0);
  assert.equal(duckDepthDb("music", ["alerts"], off), -6, "alerts still duck at full depth");
  assert.equal(duckDepthDb("music", ["voice"], off), -4, "voice still ducks");
});

test("active triggers are those whose hold is still in the future", () => {
  assert.deepEqual(activeTriggers({}, 10), []);
  assert.deepEqual(activeTriggers({ weapons: 10.1, alerts: 9.9, voice: 0 }, 10), ["weapons"]);
  assert.deepEqual(activeTriggers({ weapons: 11, alerts: 11, voice: 11 }, 10), ["weapons", "alerts", "voice"]);
  assert.deepEqual(activeTriggers(null, 10), []);
});

test("your own shots carry +2 dB over the (distance-faded) shots of others", () => {
  assert.equal(shotPresence(true), SHOT_PRESENCE.own);
  assert.equal(shotPresence(false), 1);
  assert.ok(gainToDb(SHOT_PRESENCE.own) > 1.5 && gainToDb(SHOT_PRESENCE.own) < 2.5);
});
