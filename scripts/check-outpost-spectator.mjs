/** Real desktop/touch POV controls, death transitions and recipient snapshots. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const refresh = (page) => page.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  g.protocolCache = null; g.protocolUI.update(true); g.spectator.update(); g.render();
});
try {
  for (const [name, width, height, mobile] of [
    ["desktop", 1280, 800, false], ["mobile", 390, 844, true],
    ["landscape", 844, 390, true],
  ]) {
    if (process.argv.includes("--desktop-only") && mobile) continue;
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.addInitScript(() => localStorage.setItem("midnry-outpost-graphics",
      JSON.stringify({ preset: "performance", options: { adaptive: false } })));
    await page.goto(base + "/games/outpost-zero.html");
    try {
      await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
        null, { timeout: 90000 });
    } catch (error) {
      console.log(JSON.stringify({ name, errors, loading: await page.evaluate(() => {
        const g = document.querySelector("midnry-fps")?.engine;
        return { status: g?.compatibilityReport?.status, message: g?.$(".mf-render-message")?.textContent };
      }) }));
      throw error;
    }
    const setup = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame); g.frame = 0; g.lockMouse = () => {};
      g.start(); g.protocolUI.brief.close();
      for (const e of g.arena.entities) e.bot = false;
      Object.assign(g.player, { x: 3.5, y: 5.5, a: 0 });
      const attacker = g.arena.entities.find((e) => e.team === 1);
      Object.assign(attacker, { x: 3.6, y: 5.5 });
      g.arena.privateFor(attacker).killReadyAt = 0;
      g.arena.eliminate(attacker, g.selfId);
      const now = performance.now(); g.updateDeath(now);
      const origin = g.camera().id;
      const before = g.spectator.bar.hidden;
      g.updateDeath(now + g.deathSequence.duration + 1);
      const target = g.camera();
      Object.assign(target, { x: 4.5, y: 7.5, a: -Math.PI / 2, pitch: 0.1 });
      g.updateHUD(); g.spectator.update(); g.render();
      return { origin, before, selfId: g.selfId, targetId: target.id,
        running: g.running, active: g.spectator.active(), role: g.protocolView().protocol.self.role };
    });
    assert.equal(setup.origin, setup.selfId, "death fall uses own origin");
    assert.equal(setup.before, true);
    assert.equal(setup.active, true); assert.equal(setup.running, true);
    assert.notEqual(setup.targetId, setup.selfId);
    assert.equal(await page.locator(".mf-spectator").isVisible(), true);
    for (const selector of [".mf-stick", ".mf-fire", ".mf-reload", ".mf-cross", ".mf-protocol-actions"])
      assert.equal(await page.locator(selector).isVisible(), false, `observer hides ${selector}`);
    const rect = await page.locator(".mf-spectator").boundingBox();
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height);
    assert.ok(rect.width * rect.height / (width * height) < 0.06, "compact spectator controls");
    for (const selector of [".mf-spectator-prev", ".mf-spectator-next"]) {
      const r = await page.locator(selector).boundingBox();
      assert.ok(r.width >= 44 && r.height >= 44);
    }
    // Native desktop key / native touch input, rather than direct selection calls.
    if (mobile) await page.locator(".mf-spectator-next").tap();
    else { await page.locator(".mf-shell").focus(); await page.keyboard.press("ArrowRight"); }
    const nextId = await page.evaluate(() => document.querySelector("midnry-fps").engine.camera().id);
    assert.notEqual(nextId, setup.targetId);
    if (mobile) await page.locator(".mf-spectator-prev").tap();
    else await page.keyboard.press("[");
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.camera().id), setup.targetId);
    if (!mobile) {
      await page.locator(".mf-spectator-next").focus();
      await page.keyboard.press("Space");
      assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.camera().id), nextId);
      await page.locator(".mf-spectator-prev").focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.camera().id), setup.targetId);
    }
    await refresh(page);
    // Regression: stale takedown restoration must never resurrect the POV
    // owner's model for even one main/reflection draw. Inspect actual draws,
    // rather than just checking visibility after render cleanup.
    const drawSafety = await page.evaluate(() => {
      const g=document.querySelector('midnry-fps').engine,r=g.military;
      const original=r.renderer.render.bind(r.renderer);let checks=0,leaks=0;
      r.renderer.render=(scene,camera)=>{
        if(scene===r.scene){checks++;if(r.actors.get(g.camera().id)?.root.visible)leaks++;}
        return original(scene,camera);
      };
      try{
        for(let i=0;i<3;i++){
          g.spectator.cycle(1);const p=g.camera();
          // Ensure the target has a cached actor from a previous viewpoint.
          g.render();const actor=r.actors.get(p.id);
          if(actor)r.takedown.hiddenActors.push([actor.root,true]);
          p.crouching=i===1;g.render();
        }
      }finally{r.renderer.render=original;}
      return{checks,leaks};
    });
    assert.ok(drawSafety.checks>=6);assert.equal(drawSafety.leaks,0);
    const camera = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine, p = g.camera(), r = g.military;
      const before = JSON.stringify(g.arena.snapshot());
      g.keys.add("w"); g.keys.add("arrowright"); g.keys.add("e"); g.keys.add(" ");
      g.firing = true; g.pendingReload = true; g.pendingSuper = true;
      g.protocolUI.actions.push({ seq: 999, op: "eliminate", target: p.id });
      const a = p.a, ownA = g.player.a, input = g.controls();
      g.applyLook(90, 40); g.update(0.01); g.render();
      const selectedActor = r.actors.get(p.id);
      const result = { input, ownAUnchanged: ownA === g.player.a, targetAUnchanged: a === p.a,
        cameraX: r.camera.position.x, targetX: p.x, cameraYaw: r.camera.rotation.y, targetA: p.a,
        cameraPitch: r.camera.rotation.x, targetPitch: Math.atan(p.pitch),
        rig: r.rig.visible, ownRole: g.protocolView().protocol.self.role,
        watchedBodyHidden: !selectedActor || !selectedActor.root.visible,
        before };
      g.keys.clear(); g.firing = g.pendingReload = g.pendingSuper = false;
      g.protocolUI.actions = [];
      const stable = JSON.stringify(g.arena.snapshot());
      g.render(); g.spectator.cycle(1); g.render(); g.spectator.cycle(-1); g.render();
      result.pure = stable === JSON.stringify(g.arena.snapshot());
      return result;
    });
    assert.equal(camera.input.forward, 0); assert.equal(camera.input.strafe, 0);
    for (const k of ["fire", "reload", "super", "interact"]) assert.equal(camera.input[k], false);
    assert.equal(camera.input.protocolAction, undefined);
    assert.deepEqual(camera.input.vehicleInput, { pitch: 0, steer: 0 });
    assert.equal(camera.ownAUnchanged, true); assert.equal(camera.targetAUnchanged, true);
    assert.ok(Math.abs(camera.cameraX - camera.targetX * 3) < 0.001);
    assert.ok(Math.abs(camera.cameraYaw - (-camera.targetA - Math.PI / 2)) < 0.001);
    assert.ok(Math.abs(camera.cameraPitch - camera.targetPitch) < 0.001);
    assert.equal(camera.rig, true); assert.equal(camera.watchedBodyHidden, true);
    assert.equal(camera.ownRole, setup.role); assert.equal(camera.pure, true);
    await page.evaluate(() => {
      // Capture settled observation without the brief death notification.
      document.querySelector("midnry-fps").engine.$(".mf-toast").textContent = "";
    });
    await page.screenshot({ path: `/workspace/screenshots/outpost-spectator-${name}.png` });
    // Info still belongs to self, pauses only offline, and closes back to spectating.
    await page.locator(".mf-protocol-infoopen").click();
    assert.equal(await page.locator(".mf-spectator").isVisible(), false);
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.running), false);
    await page.locator(".mf-protocol-infoclose").click();
    await page.waitForFunction(() => document.querySelector("midnry-fps").engine.running);
    await refresh(page);
    await page.locator(".mf-pause").click();
    assert.equal(await page.locator(".mf-spectator").isVisible(), false);
    await page.locator(".mf-start:visible, .mf-modeplay:visible").first().click();
    await refresh(page);
    assert.equal(await page.locator(".mf-spectator").isVisible(), true);
    // A recipient-safe online snapshot uses the production applyRoom path.
    // Replacing entity objects must preserve selection and the observer's role.
    const online = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine;
      const { protocolView } = await import("/games/outpost-protocol.js");
      const recipient = protocolView(g.arena.snapshot(), g.selfId);
      const selected = g.camera().id;
      g.online = { phase: "playing", code: "TEST23", id: g.selfId, host: g.selfId };
      const data = { mode: "protocol", phase: "playing", mapId: g.arena.mapId, code: "TEST23",
        host: g.selfId, arena: recipient, members: [{ id: g.selfId, name: "Observer", weapon: "carbine", team: 0, connected: true }] };
      g.applyRoom(data); g.spectator.update(); g.render();
      const retained = g.camera().id === selected;
      const watched = data.arena.entities.find((e) => e.id === selected);
      watched.hp = 0;
      g.applyRoom(data); g.spectator.update(); g.render();
      const next = g.camera();
      const result = { retained, switchedAfterDeath: next.id !== selected,
        selfId: g.selfId, role: g.protocolView().protocol.self.role,
        privatePlayers: Boolean(g.arena.protocol.players), action: g.controls().protocolAction,
        stillSpectating: g.spectator.active(), moving: g.controls().forward };
      next.departed = true; g.spectator.update();
      result.switchedAfterDeparture = g.camera().id !== next.id;
      for (const e of g.arena.entities) if (e.id !== g.camera().id) e.hp = 0;
      g.spectator.update();
      result.singleDisabled = g.spectator.next.disabled && g.spectator.previous.disabled;
      for (const e of g.arena.entities) e.hp = 0;
      g.spectator.update(); g.render();
      result.emptyLabel = g.spectator.label.textContent;
      result.emptyCameraSelf = g.camera().id === g.selfId;
      g.online = null; g.reset(); g.spectator.update();
      result.reset = g.spectator.selection.targetId === null && g.spectator.bar.hidden;
      return result;
    });
    assert.equal(online.retained, true); assert.equal(online.switchedAfterDeath, true);
    assert.equal(online.switchedAfterDeparture, true); assert.equal(online.singleDisabled, true);
    assert.equal(online.role, setup.role); assert.equal(online.selfId, setup.selfId);
    assert.equal(online.privatePlayers, false); assert.equal(online.action, undefined);
    assert.equal(online.stillSpectating, true); assert.equal(online.moving, 0);
    assert.equal(online.emptyLabel, "No surviving players"); assert.equal(online.emptyCameraSelf, true);
    assert.equal(online.reset, true); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ name, deathTransition: "passed", nativePOVSwitch: "passed",
      publicAimAndWeapon: "passed", observerActions: "blocked", recipientIdentity: "preserved",
      automaticTargetSwitch: "passed", singleAndEmpty: "passed", errors }));
    await page.close();
  }
} finally { await browser.close(); }
