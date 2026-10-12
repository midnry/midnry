/**
 * Blackout Protocol browser coverage. Run against an explicitly local server:
 *   node scripts/check-outpost-protocol.mjs http://127.0.0.1:8080
 *   node scripts/check-outpost-protocol.mjs http://127.0.0.1:8096 --online
 * Fixture positioning is deliberate; every supply, held action, helm input,
 * discussion message and vote still passes through the production controls.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, request } from "playwright";

const args = process.argv.slice(2);
const base = args.find((arg) => /^https?:/.test(arg)) || "http://127.0.0.1:8080";
assert.ok(
  ["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname),
  "Protocol QA creates disposable sessions and must target a local server",
);
const military = true; // Cinematic 3D is the only supported renderer.
const browser = args.includes("--online-only")
  ? null
  : await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
    });
mkdirSync("/workspace/screenshots", { recursive: true });
const verdict = { desktop: null, mobile: null, online: null };

// A recipient view is the only source of information used by UI assertions.
async function view(page) {
  return page.evaluate(async () => {
    const g = document.querySelector("midnry-fps").engine;
    const { protocolView } = await import("/games/outpost-protocol.js");
    return protocolView(g.arena.snapshot(), g.selfId);
  });
}

async function refresh(page, render = false) {
  await page.evaluate((draw) => {
    const g = document.querySelector("midnry-fps").engine;
    g.updateHUD(false);
    g.protocolCache = null;
    g.protocolUI.update(true);
    if (draw) g.render();
  }, render);
}

async function tick(page, seconds, render = false) {
  await page.evaluate(
    ({ seconds, render }) => {
      const g = document.querySelector("midnry-fps").engine;
      const count = Math.ceil(seconds * 30);
      for (let n = 0; n < count; n++) {
        g.update(seconds / count);
        g.protocolUI.update(true);
      }
      if (render) g.render();
    },
    { seconds, render },
  );
}

async function position(page, point) {
  await page.evaluate(({ x, y, a = 0 }) => {
    const g = document.querySelector("midnry-fps").engine;
    g.player.x = x;
    g.player.y = y;
    g.player.a = a;
    g.keys.clear();
    g.touch = { x: 0, y: 0 };
    g.updateHUD(false);
    g.protocolCache = null;
    g.protocolUI.update(true);
  }, point);
}

async function selectRole(page, role) {
  await page.locator(".mf-protocol-menu select").selectOption(role);
  const safe = await view(page);
  assert.equal(safe.protocol.self.role, role, "offline role preference chooses the requested role");
}

async function deploy(page) {
  await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    g.lockMouse = () => {};
    // Disable AI only in this fixture, retaining all eight living participants.
    for (const e of g.arena.entities) e.bot = false;
  });
  await page.locator(".mf-start").click();
  await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame);
    g.frame = 0;
  });
  assert.equal(
    await page.evaluate(() => document.querySelector("midnry-fps").engine.running),
    true,
  );
  await refresh(page);
  const briefing = page.locator(".mf-protocol-brief");
  if (await briefing.isVisible()) await page.locator(".mf-protocol-begin").click();
  await refresh(page);
}

async function pause(page) {
  await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    // Fixture ticks suspend RAF; finish the preserved death presentation
    // before asking the normal menu controls to begin another test round.
    if (g.deathSequence) g.updateDeath(g.deathSequence.at + g.deathSequence.duration + 1);
    g.pause();
  });
}

async function freshRole(page, role) {
  await pause(page);
  await page.locator('[data-mode="protocol"]').click();
  await selectRole(page, role);
  await deploy(page);
}

// Desktop holds use the real keyboard. Mobile holds use real touch pointer
// events rather than synthesizing a click or mutating the interact input.
async function hold(page, mobile, seconds) {
  if (!mobile) {
    await page.locator(".mf-shell").focus();
    await page.keyboard.down("e");
    await tick(page, seconds);
    await page.keyboard.up("e");
    await tick(page, 1 / 30);
    return;
  }
  const button = page.locator(".mf-protocol-hold");
  await button.scrollIntoViewIfNeeded();
  const rect = await button.boundingBox();
  assert.ok(
    rect && rect.width >= 44 && rect.height >= 44,
    "objective touch target is at least 44 px",
  );
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }],
  });
  await tick(page, seconds);
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await tick(page, 1 / 30);
  await session.detach();
}

async function heldProgress(page, mobile) {
  if (!mobile) {
    await page.locator(".mf-shell").focus();
    await page.keyboard.down("e");
    await tick(page, 0.75);
    const held = await view(page);
    await page.keyboard.up("e");
    await tick(page, 1 / 30);
    return held;
  }
  const rect = await page.locator(".mf-protocol-hold").boundingBox();
  assert.ok(rect, "contextual objective hold button is visible");
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }],
  });
  await tick(page, 0.75);
  const held = await view(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await tick(page, 1 / 30);
  await session.detach();
  return held;
}

async function medicalManifest(page, mobile) {
  const initial = await view(page);
  assert.equal(initial.protocol.mission.phase, "base");
  assert.equal(
    initial.protocol.mission.manifest.reduce((total, item) => total + item.required, 0),
    13,
  );
  assert.equal(initial.protocol.self.cargo, null);
  let testedInterruption = false;
  for (const item of initial.protocol.mission.manifest) {
    for (let quantity = 0; quantity < item.required; quantity++) {
      const before = await view(page);
      const fixture = before.protocol.mission.supplyStock.find(
        (stock) => stock.supplyId === item.id && stock.stock > 0,
      );
      assert.ok(fixture, "required supply is in stock: " + item.id);
      await position(page, fixture);
      if (!testedInterruption) {
        const partial = await heldProgress(page, mobile);
        assert.equal(partial.protocol.self.channel.kind, "collect");
        assert.ok(
          partial.protocol.self.channel.progress > 0 &&
            partial.protocol.self.channel.progress < partial.protocol.self.channel.duration,
        );
        assert.equal(
          (await view(page)).protocol.self.cargo,
          null,
          "release before pickup duration leaves cargo empty",
        );
        testedInterruption = true;
      }
      await hold(page, mobile, 4.7);
      const collected = await view(page);
      assert.equal(
        collected.protocol.self.cargo?.supplyId,
        item.id,
        "real held input picks up the requested category",
      );
      assert.equal(
        collected.protocol.mission.supplyStock.find((stock) => stock.id === fixture.id).stock,
        fixture.stock - 1,
        "a pickup consumes exactly one stocked item",
      );
      const alreadyLoaded = collected.protocol.mission.manifest.find(
        (entry) => entry.id === item.id,
      ).loaded;
      await position(page, collected.protocol.mission.loading);
      await hold(page, mobile, 3.2);
      const loaded = await view(page);
      assert.equal(loaded.protocol.self.cargo, null, "deposit frees the one-item carry slot");
      assert.equal(
        loaded.protocol.mission.manifest.find((entry) => entry.id === item.id).loaded,
        alreadyLoaded + 1,
      );
      assert.equal(loaded.protocol.mission.phase, "base");
      assert.equal(
        loaded.state,
        "playing",
        "loading assignments alone never wins the medical mission",
      );
    }
  }
  const complete = await view(page);
  assert.ok(complete.protocol.mission.manifest.every((entry) => entry.loaded === entry.required));
  const roundId = complete.roundId;
  await position(page, complete.protocol.mission.loading);
  await hold(page, mobile, 3.2);
  const departed = await view(page);
  assert.equal(departed.mapId, "medevac", "departure transitions into the aircraft map");
  assert.equal(departed.protocol.mission.phase, "transport");
  assert.equal(departed.roundId, roundId, "base and aircraft are phases of the same round");
  assert.equal(departed.state, "playing");
  assert.equal(
    departed.protocol.bombs.length,
    0,
    "abandoned base charges cannot follow the aircraft",
  );
  await refresh(page, true);
  assert.equal(
    await page.evaluate(() => document.querySelector("midnry-fps").engine.military.mapKey),
    "medevac",
  );
}

async function transportPoints(page) {
  return page.evaluate(async () => {
    const { TRANSPORT_MAP } = await import("/games/outpost-protocol-map.js");
    return {
      helm: TRANSPORT_MAP.helm,
      avionics: TRANSPORT_MAP.avionics,
      cargo: TRANSPORT_MAP.cargo,
      emergency: TRANSPORT_MAP.emergency,
    };
  });
}

async function fixtureAction(page, op, actorId) {
  await page.evaluate(
    async ({ op, actorId }) => {
      const g = document.querySelector("midnry-fps").engine;
      const { protocolView } = await import("/games/outpost-protocol.js");
      const id = actorId || g.selfId;
      const self = protocolView(g.arena.snapshot(), id).protocol.self;
      const seq = Math.max(self.actionSeq || 0, g.protocolUI.sequence || 0) + 1;
      g.arena.advance(1 / 30, { [id]: { protocolAction: { seq, op } } });
      g.protocolCache = null;
      g.updateHUD(false);
      g.protocolUI.update(true);
    },
    { op, actorId },
  );
}

// Another participant creates a legal sabotage through stationary channel
// input; no fixture directly changes autopilot, attitude or recovery deadlines.
async function disableAutopilot(page) {
  await page.evaluate(async () => {
    const g = document.querySelector("midnry-fps").engine;
    const { protocolView } = await import("/games/outpost-protocol.js");
    const { TRANSPORT_MAP } = await import("/games/outpost-protocol-map.js");
    const actor = g.arena.entities.find(
      (entity) =>
        entity.id !== g.selfId &&
        protocolView(g.arena.snapshot(), entity.id).protocol.self.role === "infiltrator",
    );
    actor.x = TRANSPORT_MAP.avionics.x;
    actor.y = TRANSPORT_MAP.avionics.y;
    for (let n = 0; n < 186; n++) g.arena.advance(1 / 30, { [actor.id]: { interact: true } });
    g.protocolCache = null;
    g.updateHUD(false);
    g.protocolUI.update(true);
  });
  const safe = await view(page);
  assert.equal(safe.protocol.mission.vehicle.autopilot, false);
  assert.equal(safe.protocol.mission.vehicle.underControl, false);
  assert.ok(
    safe.protocol.mission.vehicle.recoveryDeadline > safe.time,
    "sabotage starts a bounded recovery window",
  );
}

async function axisStep(page, mobile, pitch, steer, seconds) {
  if (!mobile) {
    await page.locator(".mf-shell").focus();
    const keys = [
      pitch > 0 ? "w" : pitch < 0 ? "s" : null,
      steer > 0 ? "d" : steer < 0 ? "a" : null,
    ].filter(Boolean);
    for (const key of keys) await page.keyboard.down(key);
    const controls = await page.evaluate(() =>
      document.querySelector("midnry-fps").engine.controls(),
    );
    assert.equal(controls.forward, 0, "seated flight input suppresses walking");
    assert.equal(controls.strafe, 0);
    assert.equal(controls.vehicleInput?.pitch, pitch);
    assert.equal(controls.vehicleInput?.steer, steer);
    await tick(page, seconds);
    for (const key of keys) await page.keyboard.up(key);
    return;
  }
  const touches = [];
  for (const [axis, value] of [
    ["pitch", pitch],
    ["steer", steer],
  ]) {
    if (!value) continue;
    const button = page.locator(`[data-flight-axis="${axis}"][data-flight-value="${value}"]`);
    const rect = await button.boundingBox();
    assert.ok(
      rect && rect.width >= 44 && rect.height >= 44,
      "mobile flight axis is a reachable 44 px touch control",
    );
    touches.push({
      id: touches.length + 1,
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    });
  }
  const session = await page.context().newCDPSession(page);
  if (touches.length)
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touches });
  const controls = await page.evaluate(() =>
    document.querySelector("midnry-fps").engine.controls(),
  );
  assert.equal(controls.forward, 0);
  assert.equal(controls.strafe, 0);
  assert.equal(controls.vehicleInput?.pitch, pitch);
  assert.equal(controls.vehicleInput?.steer, steer);
  await tick(page, seconds);
  if (touches.length)
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
}

async function manualRecovery(page, mobile) {
  const points = await transportPoints(page);
  await position(page, points.cargo);
  await disableAutopilot(page);
  await fixtureAction(page, "autopilot");
  assert.equal(
    (await view(page)).protocol.mission.vehicle.autopilot,
    false,
    "a remote request cannot restore autopilot",
  );
  await position(page, { ...points.helm, a: -Math.PI / 2 });
  await page.locator(".mf-protocol-helm").click();
  await tick(page, 1 / 30);
  const selfId = await page.evaluate(() => document.querySelector("midnry-fps").engine.selfId);
  let safe = await view(page);
  assert.equal(safe.protocol.mission.vehicle.pilotId, selfId);
  assert.equal(
    await page.locator(".mf-protocol-autopilot").isDisabled(),
    true,
    "restore is unavailable before manual stabilization",
  );
  await fixtureAction(page, "autopilot");
  assert.equal(
    (await view(page)).protocol.mission.vehicle.autopilot,
    false,
    "even the seated pilot cannot skip stabilization",
  );
  const seated = await page.evaluate(() => {
    const e = document.querySelector("midnry-fps").engine.player;
    return { x: e.x, y: e.y };
  });
  // The first deliberate axes also verify W raises altitude and A steers left.
  const attitude = safe.protocol.mission.vehicle;
  await axisStep(page, mobile, 1, -1, 0.2);
  safe = await view(page);
  assert.ok(
    safe.protocol.mission.vehicle.altitude > attitude.altitude,
    "W / Raise increases altitude",
  );
  assert.ok(safe.protocol.mission.vehicle.heading < attitude.heading, "A / Left decreases heading");
  for (let step = 0; step < 55 && !safe.protocol.mission.vehicle.underControl; step++) {
    const craft = safe.protocol.mission.vehicle;
    const pitch = craft.altitude < 0.64 ? 1 : craft.altitude > 0.76 ? -1 : 0;
    const steer = craft.heading > 0.06 ? -1 : craft.heading < -0.06 ? 1 : 0;
    await axisStep(page, mobile, pitch, steer, 0.2);
    safe = await view(page);
    assert.equal(safe.state, "playing", "recovery does not crash within the valid input sequence");
  }
  assert.equal(
    safe.protocol.mission.vehicle.underControl,
    true,
    "three stable seconds establish manual control",
  );
  assert.equal(
    safe.protocol.mission.vehicle.autopilot,
    false,
    "stabilization itself does not silently restore autopilot",
  );
  const stillSeated = await page.evaluate(() => {
    const e = document.querySelector("midnry-fps").engine.player;
    return { x: e.x, y: e.y };
  });
  assert.deepEqual(stillSeated, seated, "flight controls keep the operator seated at the helm");
  await page.locator(".mf-protocol-autopilot").click();
  await tick(page, 1 / 30);
  safe = await view(page);
  assert.equal(
    safe.protocol.mission.vehicle.autopilot,
    true,
    "a stabilized seated operator can restore autopilot",
  );
  assert.equal(safe.protocol.mission.vehicle.recoveryDeadline, null);
  await refresh(page, true);
  await page.screenshot({
    path: `/workspace/screenshots/outpost-medical-transport-${mobile ? "mobile" : "desktop"}.png`,
  });
  if (safe.protocol.mission.vehicle.pilotId === selfId) {
    await page.locator(".mf-protocol-releasehelm").click();
    await tick(page, 1 / 30);
  }
  assert.equal(
    (await view(page)).protocol.mission.vehicle.autopilot,
    true,
    "leaving a safely restored autopilot does not sabotage the flight",
  );
}

async function deliverAid(page, mobile) {
  let safe = await view(page);
  const craft = safe.protocol.mission.vehicle;
  await tick(page, Math.max(0, craft.duration - craft.progress) + 0.3);
  safe = await view(page);
  assert.equal(safe.protocol.mission.vehicle.arrived, true);
  assert.equal(
    safe.state,
    "playing",
    "arrival alone does not count as treating the wounded soldiers",
  );
  const points = await transportPoints(page);
  await position(page, points.cargo);
  await hold(page, mobile, 4.7);
  safe = await view(page);
  assert.equal(safe.state, "ended");
  assert.equal(safe.winner, 0);
  assert.equal(safe.protocol.mission.phase, "delivered");
  assert.ok(
    safe.protocol.mission.patients.some((patient) => patient.rescued),
    "the crew wins by delivering aid to a surviving patient",
  );
  await refresh(page, true);
  await page.screenshot({
    path: `/workspace/screenshots/outpost-medical-delivery-${mobile ? "mobile" : "desktop"}.png`,
  });
}

async function crashFailure(page) {
  await freshRole(page, "operator");
  // A second legal manifest run isolates the unattended-crash branch.
  await medicalManifest(page, false);
  await disableAutopilot(page);
  const disabled = await view(page);
  await fixtureAction(page, "autopilot");
  assert.equal((await view(page)).protocol.mission.vehicle.autopilot, false);
  await tick(page, disabled.protocol.mission.vehicle.recoveryDeadline - disabled.time + 0.3);
  const crashed = await view(page);
  assert.equal(crashed.state, "ended");
  assert.equal(crashed.winner, 1, "ignoring a disabled aircraft causes a genuine crash loss");
  assert.ok(
    crashed.entities
      .filter((e) => e.team === 0 || crashed.protocol.revealedRoles?.[e.id] === "operator")
      .every((e) => e.hp <= 0),
  );
}

async function patientFailure(page) {
  await freshRole(page, "operator");
  const initial = await view(page);
  const lastPatientExpires = Math.max(
    ...initial.protocol.mission.patients.map((patient) => patient.hp / patient.decay),
  );
  await tick(page, lastPatientExpires + 0.3);
  const failed = await view(page);
  assert.equal(failed.state, "ended");
  assert.equal(failed.winner, 1);
  assert.ok(failed.protocol.mission.patients.every((patient) => patient.hp <= 0));
}

async function crewFailure(page) {
  await freshRole(page, "infiltrator");
  const operators = await page.evaluate(async () => {
    const g = document.querySelector("midnry-fps").engine;
    const { protocolView } = await import("/games/outpost-protocol.js");
    return g.arena.entities
      .filter(
        (entity) => protocolView(g.arena.snapshot(), entity.id).protocol.self.role === "operator",
      )
      .map((entity) => entity.id);
  });
  for (const id of operators) {
    const safe = await view(page);
    await tick(page, Math.max(0, safe.protocol.self.killReadyAt - safe.time) + 0.1);
    await page.evaluate((targetId) => {
      const g = document.querySelector("midnry-fps").engine;
      g.player.x = 6.5;
      g.player.y = 6.5;
      const target = g.arena.entities.find((e) => e.id === targetId);
      target.x = 6.5;
      target.y = 6.9;
      g.protocolCache = null;
      g.updateHUD(false);
      g.protocolUI.update(true);
    }, id);
    await page.locator(".mf-protocol-eliminate").click();
    await tick(page, 1 / 30);
    assert.equal((await view(page)).entities.find((e) => e.id === id).hp, 0);
  }
  const failed = await view(page);
  assert.equal(failed.state, "ended");
  assert.equal(failed.winner, 1, "loss of all living operators defeats the rescue mission");
}

async function meetings(page) {
  await freshRole(page, "infiltrator");
  await tick(page, 12.2);
  const arranged = await page.evaluate(async () => {
    const g = document.querySelector("midnry-fps").engine;
    const { protocolView } = await import("/games/outpost-protocol.js");
    const target = g.arena.entities.find(
      (e) =>
        e.id !== g.selfId &&
        protocolView(g.arena.snapshot(), e.id).protocol.self.role === "operator",
    );
    const safe = protocolView(g.arena.snapshot(), g.selfId);
    const site = safe.protocol.emergency;
    g.player.x = site.x;
    g.player.y = site.y;
    target.x = site.x;
    target.y = site.y + 0.4;
    g.player.a = Math.PI / 2;
    g.updateHUD(false);
    g.protocolCache = null;
    g.protocolUI.update(true);
    return { target: target.id, x: site.x, y: site.y };
  });
  await page.locator(".mf-protocol-eliminate").click();
  await tick(page, 1 / 30);
  let safe = await view(page);
  assert.ok(
    safe.protocol.bodies.some((body) => body.victimId === arranged.target),
    "contextual elimination creates a reportable body",
  );
  await page.locator(".mf-protocol-report").click();
  await tick(page, 1 / 30);
  safe = await view(page);
  assert.equal(safe.protocol.phase, "discussion");
  const patientsBeforeMeeting = safe.protocol.mission.patients.map((patient) => patient.hp);
  const before =
    safe.entities.find((e) => e.id === safe.protocol.self.id) ||
    (await page.evaluate(() => ({
      x: document.querySelector("midnry-fps").engine.player.x,
      y: document.querySelector("midnry-fps").engine.player.y,
    })));
  await page.locator(".mf-shell").focus();
  await page.keyboard.down("w");
  await tick(page, 0.5);
  await page.keyboard.up("w");
  const frozen = await page.evaluate(() => {
    const e = document.querySelector("midnry-fps").engine.player;
    return { x: e.x, y: e.y };
  });
  assert.equal(frozen.x, before.x);
  assert.equal(frozen.y, before.y);
  const message = 'I was in Command. <img src=x onerror="window.protocolInjected=true">';
  await page.locator(".mf-protocol-chatform input").fill(message);
  await page.locator(".mf-protocol-chatform button").click();
  await tick(page, 1 / 30);
  safe = await view(page);
  assert.ok(
    safe.protocol.meeting.messages.some((item) => item.text === message),
    "discussion accepts a concise alibi",
  );
  assert.equal(
    await page.evaluate(() => !!window.protocolInjected),
    false,
    "discussion renders message text without executing markup",
  );
  assert.equal(await page.locator(".mf-protocol-radio img").count(), 0);
  await tick(page, 15.2);
  safe = await view(page);
  assert.equal(safe.protocol.phase, "vote");
  assert.ok(
    safe.protocol.mission.patients.every((patient, i) => patient.hp < patientsBeforeMeeting[i]),
    "radio discussion never freezes wounded soldiers' vitals",
  );
  const ownId = await page.evaluate(() => document.querySelector("midnry-fps").engine.selfId);
  const target = safe.entities.find((e) => e.id !== ownId && e.hp > 0);
  await page.locator(`[data-vote="${target.id}"]`).click();
  await tick(page, 1 / 30);
  safe = await view(page);
  assert.equal(
    safe.protocol.meeting.votes[ownId],
    target.id,
    "vote travels through one-shot authoritative controls",
  );
  await page.screenshot({ path: "/workspace/screenshots/outpost-protocol-meeting.png" });
  await tick(page, 15.2);
  safe = await view(page);
  assert.equal(safe.protocol.phase, "roam");
  assert.equal(
    safe.entities.find((e) => e.id === target.id).hp,
    0,
    "majority vote detains the selected suspect",
  );
  assert.equal(
    safe.protocol.revealedRoles,
    undefined,
    "detainment does not reveal the suspect's role during a live round",
  );
}

async function legacyModes(page) {
  await pause(page);
  const coverage = [];
  for (const mode of ["training", "signal", "duo"]) {
    await page.locator(`[data-mode="${mode}"]`).click();
    assert.equal(await page.locator(".mf-mapselect").isDisabled(), false);
    const maps = await page
      .locator(".mf-mapselect option")
      .evaluateAll((options) =>
        options
          .filter((option) => !option.hidden && !option.disabled)
          .map((option) => option.value),
      );
    assert.equal(maps.length, 5, "original modes retain five arenas");
    assert.equal(maps.includes("breakwater"), false);
    assert.equal(maps.includes("medevac"), false);
    await page.locator(".mf-mapselect").selectOption("freight");
    await page.locator(".mf-weaponselect").selectOption("rocket");
    await deploy(page);
    assert.equal(
      await page.evaluate(() =>
        document.querySelector("midnry-fps").engine.shell.classList.contains("mf-protocol"),
      ),
      false,
      "combat controls return outside protocol",
    );
    await page.locator(".mf-shell").focus();
    await page.keyboard.down("a");
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.controls().strafe),
      -1,
    );
    await page.keyboard.up("a");
    await page.keyboard.down("d");
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.controls().strafe),
      1,
    );
    await page.keyboard.up("d");
    await page.keyboard.press("Space");
    await tick(page, 1 / 30);
    assert.ok(
      await page.evaluate(
        () => document.querySelector("midnry-fps").engine.arena.projectiles.length > 0,
      ),
      "original rocket firing still works",
    );
    coverage.push(mode);
    await pause(page);
  }
  await page.locator('[data-mode="protocol"]').click();
  assert.equal(await page.locator(".mf-mapselect").inputValue(), "breakwater");
  return coverage;
}

async function compatibilityChecks(page) {
  const report = await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    return { ...g.compatibilityReport, savedPreset: g.academy.preset };
  });
  assert.ok(
    ["ready", "limited"].includes(report.status),
    "real device check reaches a supported result before gameplay",
  );
  assert.equal(report.testedPreset, "performance");
  assert.equal(
    report.savedPreset,
    "performance",
    "automatic compatibility recommendations do not silently change preferences",
  );
  assert.ok(
    Number.isFinite(report.frameCostMs) && report.frameCostMs > 0,
    "compatibility includes measured 3D render cost",
  );
  assert.ok(Number.isFinite(report.observedFps) && report.observedFps > 0);
  await page.locator(".mf-compat-open").click();
  assert.equal(await page.locator(".mf-compat-report").isVisible(), true);
  assert.ok((await page.locator(".mf-compat-body").innerText()).length > 100);
  assert.equal(
    await page.locator(".mf-compat-report [data-compat-check]").count(),
    4,
    "device report describes browser, graphics, assets and performance",
  );
  await page.locator(".mf-compat-close").click();
  assert.equal(await page.locator(".mf-compat-report").isVisible(), false);
  return {
    status: report.status,
    measuredMs: report.frameCostMs,
    recommendation: report.recommendedPreset,
  };
}

async function clientChecks(mobile) {
  const page = await browser.newPage({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    hasTouch: mobile,
    isMobile: mobile,
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.stack || error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    // SwiftShader is not a hardware benchmark; keep objective tests inexpensive.
    await page.addInitScript(() =>
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "performance", options: { adaptive: false } }),
      ),
    );
    await page.goto(base + "/games/outpost-zero.html" + (military ? "?renderer=military" : ""));
    await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.protocolUI);
    if (military)
      await page.waitForFunction(
        () => {
          const g = document.querySelector("midnry-fps").engine;
          return g.militaryLoaded && g.compatibilityReport?.status !== "unsupported";
        },
        null,
        { polling: 100, timeout: 60000 },
      );
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
    });
    const compatibility = await compatibilityChecks(page);
    const initial = await view(page);
    assert.equal(initial.mode, "protocol", "Blackout Protocol is the new default mode");
    assert.equal(initial.mapId, "breakwater");
    assert.equal(initial.entities.length, 8);
    assert.equal(await page.locator('[data-mode="protocol"]').getAttribute("aria-pressed"), "true");
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "menu fits the viewport horizontally",
    );
    assert.equal(await page.locator(".mf-mapselect").isDisabled(), true);
    assert.equal(await page.locator(".mf-weaponselect").isDisabled(), true);
    await selectRole(page, "operator");
    await deploy(page);
    assert.equal(
      await page.locator(".mf-fire").isVisible(),
      false,
      "protocol hides shooting controls",
    );
    assert.equal(
      await page.locator(".mf-reload").isVisible(),
      false,
      "protocol hides reload controls",
    );
    await position(page, { x: 3.5, y: 5.5, a: 0 });
    await refresh(page, true);
    await page.screenshot({
      path: `/workspace/screenshots/outpost-protocol-${mobile ? "mobile" : "desktop"}.png`,
    });
    await medicalManifest(page, mobile);
    await manualRecovery(page, mobile);
    await deliverAid(page, mobile);
    if (!mobile) {
      await crashFailure(page);
      await patientFailure(page);
      await crewFailure(page);
      await meetings(page);
    }
    const modes = await legacyModes(page);
    await freshRole(page, "operator");
    const safe = await view(page);
    await position(page, { x: 3.5, y: 5.5, a: 0 });
    await refresh(page, true);
    const pure = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      const before = JSON.stringify(g.arena.snapshot());
      g.render();
      return before === JSON.stringify(g.arena.snapshot());
    });
    assert.equal(pure, true, "rendering does not mutate the authoritative arena");
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "objective HUD fits the viewport horizontally",
    );
    await page.screenshot({
      path: `/workspace/screenshots/outpost-protocol-${mobile ? "mobile" : "desktop"}.png`,
    });
    if (military)
      assert.deepEqual(
        await page.evaluate(() => document.querySelector("midnry-fps").engine.military.assetErrors),
        [],
      );
    assert.deepEqual(errors, [], "browser has no runtime or asset errors");
    return {
      defaultMode: "passed",
      compatibility,
      medicalManifest: "passed",
      aircraftDeparture: "passed",
      manualHelmRecovery: "passed",
      illegalAutopilotRestore: "passed",
      aidDelivery: "passed",
      crashAndCrewPatientLoss: mobile ? "desktop covered" : "passed",
      meetings: mobile ? "desktop covered" : "passed",
      legacyModes: modes,
      renderPure: pure,
      renderer: military ? "military" : "classic",
      errors,
    };
  } catch (error) {
    console.error(
      await page
        .evaluate(() => {
          const g = document.querySelector("midnry-fps")?.engine;
          return {
            url: location.href,
            mode: g?.mode,
            state: g?.state,
            running: g?.running,
            text: g?.root?.textContent?.slice(-2000),
          };
        })
        .catch(() => ({})),
    );
    await page
      .screenshot({
        path: `/workspace/screenshots/outpost-protocol-failure-${mobile ? "mobile" : "desktop"}.png`,
      })
      .catch(() => {});
    throw error;
  } finally {
    await page.close();
  }
}

async function onlineChecks() {
  const api = await request.newContext({ baseURL: base });
  const sessions = [];
  const auth = (member, op, extra = {}) => ({
    op,
    code: member.code,
    id: member.id,
    token: member.token,
    ...extra,
  });
  async function call(body, status = 200) {
    const response = await api.post("/api/games/outpost", { data: body });
    const bodyResult = await response.json();
    assert.equal(response.status(), status, bodyResult.error);
    return bodyResult;
  }
  try {
    for (const mapId of ["breakwater", "medevac"])
      await call({ op: "create", mode: "signal", mapId }, 400);
    const host = await call({
      op: "create",
      mode: "protocol",
      mapId: "estate",
      rolePreference: "infiltrator",
      weapon: "rocket",
    });
    sessions.push(host);
    for (const mapId of ["breakwater", "medevac"])
      await call(auth(host, "settings", { mode: "signal", mapId }), 400);
    const unchanged = await call(auth(host, "poll"));
    assert.equal(unchanged.mode, "protocol");
    const guests = await Promise.all(
      Array.from({ length: 7 }, () =>
        call({ op: "join", code: host.code, rolePreference: "operator", weapon: "venom" }),
      ),
    );
    sessions.push(...guests);
    await call(auth(guests[0], "start"), 403);
    const started = await call(auth(host, "start"));
    assert.equal(started.mode, "protocol");
    assert.equal(started.mapId, "breakwater");
    assert.equal(started.arena.entities.length, 8);
    const polls = await Promise.all(
      sessions.map((member) => call(auth(member, "poll", { seq: 1, input: { interact: false } }))),
    );
    const roles = polls.map((room) => room.arena.protocol.self.role);
    assert.equal(roles.filter((role) => role === "operator").length, 6);
    assert.equal(roles.filter((role) => role === "infiltrator").length, 2);
    for (let i = 0; i < polls.length; i++) {
      const room = polls[i];
      const selfId = sessions[i].id;
      for (const entity of room.arena.entities) {
        assert.equal(entity.weapon, "carbine", "all protocol uniforms and loadouts are identical");
        if (entity.id !== selfId) {
          assert.equal(entity.role, undefined);
          assert.equal(
            [0, 1].includes(entity.team),
            false,
            "other players' team values do not reveal their role",
          );
        }
      }
      assert.equal(room.arena.protocol.mission.phase, "base");
      assert.equal(room.arena.protocol.mission.vehicle.name, "Lifeline Medevac");
      assert.equal(
        room.arena.protocol.mission.manifest.reduce((sum, item) => sum + item.required, 0),
        13,
      );
      assert.equal(room.arena.protocol.mission.cargo, undefined);
      assert.equal(room.arena.protocol.mission.roles, undefined);
      assert.equal(room.arena.protocol.mission.botGoals, undefined);
      assert.equal(room.arena.protocol.players, undefined);
      assert.equal(room.arena.protocol.roles, undefined);
      assert.equal(room.arena.protocol.channels, undefined);
      assert.equal(room.arena.protocol.assignments, undefined);
      assert.equal(room.arena.protocol.revealedRoles, undefined);
      assert.equal(JSON.stringify(room).includes(sessions[i].token), false);
      for (const member of room.members) assert.equal(member.role, undefined);
      if (roles[i] === "operator") {
        assert.deepEqual(room.arena.protocol.sites, []);
        assert.deepEqual(room.arena.protocol.vents, []);
      }
    }
    await call({ ...auth(host, "poll"), token: "0".repeat(48) }, 401);
    const before = polls[0].arena.entities.find((entity) => entity.id === host.id);
    const spoofed = await call(
      auth(host, "poll", {
        seq: 2,
        input: {
          x: 999,
          y: 999,
          hp: 999,
          role: "infiltrator",
          team: 1,
          interact: false,
          vehicleInput: { pitch: 999, steer: -999 },
          mission: {
            phase: "delivered",
            vehicle: { autopilot: true, progress: 120 },
            manifest: [],
          },
          protocolAction: { seq: 1, op: "autopilot" },
        },
      }),
    );
    const after = spoofed.arena.entities.find((entity) => entity.id === host.id);
    assert.equal(after.hp, before.hp);
    assert.equal(after.x, before.x);
    assert.equal(after.y, before.y);
    assert.equal(spoofed.arena.protocol.self.role, roles[0]);
    assert.equal(spoofed.arena.protocol.mission.phase, "base");
    assert.equal(spoofed.arena.protocol.mission.vehicle.progress, 0);
    assert.ok(spoofed.arena.protocol.mission.manifest.every((item) => item.loaded === 0));
    return {
      participants: 8,
      privateRoles: "passed",
      privateObjectives: "passed",
      medicalMission: "passed",
      aircraftMapRestricted: "passed",
      clientSpoofing: "passed",
      sessionAuth: "passed",
    };
  } finally {
    for (const member of sessions)
      await api.post("/api/games/outpost", { data: auth(member, "leave") }).catch(() => {});
    await api.dispose();
  }
}

try {
  if (!args.includes("--online-only")) {
    verdict.desktop = await clientChecks(false);
    console.log(JSON.stringify({ desktop: verdict.desktop }));
    if (!args.includes("--desktop-only")) {
      verdict.mobile = await clientChecks(true);
      console.log(JSON.stringify({ mobile: verdict.mobile }));
    }
  }
  if (args.includes("--online") || args.includes("--online-only"))
    verdict.online = await onlineChecks();
  console.log(JSON.stringify({ protocol: verdict }));
} finally {
  await browser?.close();
}
