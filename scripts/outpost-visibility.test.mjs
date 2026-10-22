import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  actorInView,
  clearSightLine,
  fogVisibility,
  ACTOR_SPHERE_HEIGHT,
  ACTOR_SPHERE_RADIUS,
  HAZE_FOG_DENSITY,
  SANDSTORM_FOG,
} from "./outpost-military/telemetry.js";
import { viewGeometry, LOOK_DEFAULTS } from "../public/games/outpost-look.js";
import { Arena, SIGHT } from "../public/games/outpost-sim.js";

const SCALE = 3;
// An open 44×44 yard with a solid border (bigger than any arena's sightline).
const yard = (n = 44) =>
  Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => (x === 0 || y === 0 || x === n - 1 || y === n - 1 ? 1 : 0)),
  );

/** The renderer's camera for a viewport, look angle and ADS zoom. */
function cameraFor(w, h, me, pitch = 0, zoom = 1) {
  const vertical = viewGeometry(w, h, LOOK_DEFAULTS.fov).vertical;
  const camera = new THREE.PerspectiveCamera(
    THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(vertical / 2) * zoom)),
    w / h,
    0.06,
    260,
  );
  camera.rotation.order = "YXZ";
  camera.position.set(me.x * SCALE, 1.65, me.y * SCALE);
  camera.rotation.set(pitch, -me.a - Math.PI / 2, 0, "YXZ");
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  return { camera, frustum };
}
const inFrustum = (frustum, e) =>
  frustum.intersectsSphere(
    new THREE.Sphere(new THREE.Vector3(e.x * SCALE, ACTOR_SPHERE_HEIGHT, e.y * SCALE), ACTOR_SPHERE_RADIUS),
  );
/** Ground truth: does any point of the body (feet to head, both shoulders and
 * the rifle) land on screen? */
function bodyOnScreen(camera, me, e) {
  const d = Math.hypot(e.x - me.x, e.y - me.y),
    px = -(e.y - me.y) / d,
    py = (e.x - me.x) / d;
  for (const s of [-0.3, 0, 0.3])
    for (const h of [0.15, 0.9, 1.75]) {
      const v = new THREE.Vector3((e.x * SCALE) + px * s, h, (e.y * SCALE) + py * s).project(camera);
      if (Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z < 1) return true;
    }
  return false;
}

test("every rival whose body is on screen is drawn: laptop, phone, landscape, scoped, looking up/down", () => {
  const arena = { level: yard() };
  const viewports = [
    [1280, 720],
    [1920, 1080],
    [390, 844],
    [844, 390],
  ];
  let checked = 0,
    edge = 0;
  for (const [w, h] of viewports)
    for (const zoom of [1, 0.6, 0.85])
      for (const pitch of [0, 0.35, -0.35])
        for (const heading of [0, 0.7, 2.1, -2.6]) {
          const me = { x: 22, y: 22, a: heading };
          const { camera, frustum } = cameraFor(w, h, me, pitch, zoom);
          const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
          for (let f = -1.2; f <= 1.2; f += 0.05)
            for (const d of [0.9, 1.5, 2.5, 4, 6, 9, 13, 17, 20]) {
              const ang = heading + (f * hfov) / 2,
                e = { x: me.x + Math.cos(ang) * d, y: me.y + Math.sin(ang) * d };
              if (!bodyOnScreen(camera, me, e)) continue;
              checked++;
              if (Math.abs(f) > 0.9) edge++;
              assert.equal(
                actorInView(arena, me, e, inFrustum(frustum, e)),
                true,
                `${w}x${h} zoom ${zoom} pitch ${pitch} heading ${heading}: rival at ${f.toFixed(2)} of half-FOV, ${d} tiles`,
              );
            }
        }
  assert.ok(checked > 3000 && edge > 300, `checked ${checked}, ${edge} at the screen edges`);
});

test("rivals behind the camera are skipped; full walls hide, low cover and furniture never do", () => {
  const level = yard(),
    me = { x: 10.5, y: 10.5, a: 0 },
    { frustum } = cameraFor(1280, 720, me);
  const behind = { x: 6.5, y: 10.5 };
  assert.equal(actorInView({ level }, me, behind, inFrustum(frustum, behind)), false);
  const rival = { x: 16.5, y: 10.5 };
  // A wall bay three tiles wide between us hides the whole body.
  for (const y of [9, 10, 11, 12]) level[y][13] = 1;
  assert.equal(actorInView({ level }, me, rival, true), false);
  // ... unless that wall type is see-through furniture (a desk, a window).
  assert.equal(actorInView({ level }, me, rival, true, (x) => x === 13), true);
  // A single post: a shoulder still shows, so the body is drawn.
  for (const y of [9, 11, 12]) level[y][13] = 0;
  assert.equal(actorInView({ level }, me, rival, true), true);
  // Crates and barriers are not in the level grid: they never hide a body.
  assert.equal(actorInView({ level: yard(), crates: [{ x: 13.5, y: 10.5, hp: 50 }] }, me, rival, true), true);
});

test("no range cap: a rival 40 tiles away in open ground is drawn (the old cast stopped at 32)", () => {
  const level = yard(48);
  assert.equal(clearSightLine(level, 2.5, 2.5, 45.5, 40.5), true);
  const me = { x: 2.5, y: 2.5, a: Math.atan2(38, 43) },
    rival = { x: 45.5, y: 40.5 },
    { frustum } = cameraFor(1280, 720, me);
  assert.equal(actorInView({ level }, me, rival, inFrustum(frustum, rival)), true);
  // The simulation's own test, for comparison, gives up at 32 tiles.
  const sim = Object.create(Arena.prototype);
  sim.level = level;
  sim.crates = [];
  assert.equal(sim.visible(me, rival), false, "Arena.visible stops at 32 tiles (bots never look that far)");
});

// --- Fairness: bots never see further or through more than the player does.
const quiet = (mapId = "skyport") => {
  const a = new Arena({ mode: "signal", mapId, random: () => 0.5 });
  for (const e of a.entities) Object.assign(e, { bot: false, shieldUntil: 0 });
  a.disaster = null;
  a.time = 20;
  return a;
};
const lane = (a, length) => {
  for (let y = 2; y < a.level.length - 2; y++)
    for (let x = 2; x < a.level.length - length - 2; x++) {
      let clear = true;
      for (let i = 0; i <= length && clear; i++) clear = a.canMove(x + i + 0.5, y + 0.5, 0.35);
      if (clear && !a.crates.some((c) => Math.abs(c.y - (y + 0.5)) < 1 && c.x > x && c.x < x + length + 1))
        return { x: x + 0.5, y: y + 0.5 };
    }
  throw new Error("no lane");
};

test("bot sight limits match what fog lets the player see", () => {
  // Red Haze: the player's view is the haze fog; bots may not spot further.
  assert.ok(SIGHT.haze <= fogVisibility(HAZE_FOG_DENSITY), `haze ${SIGHT.haze} vs ${fogVisibility(HAZE_FOG_DENSITY).toFixed(2)}`);
  // Sandstorm at full gust.
  const storm = fogVisibility(SANDSTORM_FOG.base + SANDSTORM_FOG.gust);
  assert.ok(SIGHT.sandstorm <= storm, `sandstorm ${SIGHT.sandstorm} vs ${storm.toFixed(2)}`);
  // Clear air: fog is light enough that every bot awareness is in plain view.
  assert.ok(fogVisibility(0.012) > 9 * 2);
});

test("a bot does not spot (or shoot) a player inside the Red Haze from beyond haze visibility", () => {
  const a = quiet(),
    [me, bot] = a.entities,
    start = lane(a, 8);
  Object.assign(me, { x: start.x, y: start.y, a: 0, hp: me.maxHp });
  Object.assign(bot, { x: start.x + 7, y: start.y, a: Math.PI, bot: true, weapon: "carbine", hp: bot.maxHp });
  for (const e of a.entities.slice(2)) e.hp = 0;
  a.difficulty = "hard";
  assert.ok(a.visible(bot, me), "clear line of sight");
  assert.equal(a.spots(bot, me), true, "in clear air a hard bot spots a rival 7 tiles away");
  // The haze closes over the player (and bot): the player sees ~5 tiles.
  a.time = a.zone.delay + 1;
  a.zone.cx = -50;
  a.zone.cy = -50;
  a.zone.half = 1;
  assert.ok(a.outsideSafe(me) && a.outsideSafe(bot));
  assert.equal(a.spots(bot, me), false);
  const hp = me.hp;
  for (let i = 0; i < 30; i++) {
    bot.attack = 0;
    bot.nextPath = 1e9;
    bot.path = [];
    Object.assign(bot, { x: start.x + 7, y: start.y });
    a.updateRival(bot, 1 / 30);
  }
  assert.equal(me.hp, hp, "no shots at a player it cannot see");
  // Close enough to see each other through the haze: fair game again.
  Object.assign(bot, { x: start.x + 4 });
  assert.equal(a.spots(bot, me), true);
});

test("bots never see or shoot through walls", () => {
  const a = quiet(),
    [me, bot] = a.entities;
  for (const e of a.entities.slice(2)) e.hp = 0;
  // Find two open tiles 3 apart with a wall tile exactly between them.
  let pair = null;
  for (let y = 1; y < a.level.length - 1 && !pair; y++)
    for (let x = 1; x < a.level.length - 3 && !pair; x++)
      if (!a.level[y][x] && a.level[y][x + 1] && a.level[y][x + 1] === a.level[y][x + 2] && !a.level[y][x + 3])
        pair = [x + 0.5, x + 3.5, y + 0.5];
  assert.ok(pair, "a wall to test against");
  Object.assign(me, { x: pair[0], y: pair[2], hp: me.maxHp });
  Object.assign(bot, { x: pair[1], y: pair[2], a: Math.PI, bot: true, weapon: "carbine", hp: bot.maxHp });
  assert.equal(a.visible(bot, me), false);
  assert.equal(a.spots(bot, me), false);
  const hp = me.hp;
  for (let i = 0; i < 30; i++) {
    bot.attack = 0;
    Object.assign(bot, { x: pair[1], y: pair[2], path: [], nextPath: 1e9 });
    a.updateRival(bot, 1 / 30);
    // Even firing blind straight at the player, the wall takes the bullets.
    bot.a = Math.PI;
    bot.pitch = 0;
    a.shoot(bot);
    a.advance(1 / 30);
  }
  assert.equal(me.hp, hp);
});
