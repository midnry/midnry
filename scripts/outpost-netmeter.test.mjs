import test from "node:test";
import assert from "node:assert/strict";
import { networkQuality } from "../public/games/outpost-netmeter.js";

test("network check rates live measurements in bars, and dropouts pull it down", () => {
  assert.equal(networkQuality({ ping: NaN, jitter: 0, stalls: 0 }).bars, 0);
  assert.equal(
    networkQuality({ ping: 45, jitter: 6, stalls: 0, updatesPerSecond: 10 }).label,
    "Excellent",
  );
  assert.equal(networkQuality({ ping: 120, jitter: 25, stalls: 0, updatesPerSecond: 10 }).bars, 3);
  assert.equal(networkQuality({ ping: 200, jitter: 30, stalls: 0, updatesPerSecond: 10 }).bars, 2);
  assert.equal(
    networkQuality({ ping: 400, jitter: 30, stalls: 0, updatesPerSecond: 10 }).label,
    "Poor",
  );
  assert.equal(
    networkQuality({ ping: 45, jitter: 6, stalls: 1, updatesPerSecond: 10 }).bars,
    2,
    "a dropout",
  );
  assert.equal(networkQuality({ ping: 45, jitter: 6, stalls: 3, updatesPerSecond: 10 }).bars, 1);
  assert.equal(
    networkQuality({ ping: 45, jitter: 6, stalls: 0, updatesPerSecond: 1.5 }).bars,
    2,
    "slow updates",
  );
  assert.equal(
    networkQuality({ ping: 45, jitter: 6, stalls: 0, live: false }).bars,
    2,
    "backup mode",
  );
  assert.match(networkQuality({ ping: 45, jitter: 6, stalls: 2 }).advice, /dropped out/);
});
