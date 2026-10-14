/** Real desktop/touch reports, reactive bot discussion and emergency radio.
 * Fixtures arrange a witnessed kill; controls and simulation stay production. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  for (const mobile of [false, true]) {
    const name = mobile ? "mobile" : "desktop",
      page = await browser.newPage({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        isMobile: mobile,
        hasTouch: mobile,
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.addInitScript(() =>
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "performance", options: { adaptive: false } }),
      ),
    );
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 120000 },
    );
    const click = async (locator) => {
      await locator.waitFor({ state: "visible" });
      await locator.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
      const b = await locator.boundingBox();
      assert.ok(b);
      if (mobile) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    };
    const scene = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.lockMouse = () => {};
      g.start();
      g.protocolUI.brief.close();
      for (const e of g.arena.entities) {
        e.bot = false;
        if (e.id !== g.selfId) Object.assign(e, { x: 21.5, y: 7.5 });
      }
      for (const p of g.arena.protocol.mission.patients) p.decay = 0;
      const killer = g.arena.entities.find((e) => e.team === 1),
        victim = g.arena.entities.find((e) => e.team === 0 && e.id !== g.selfId),
        witness = g.arena.entities.find((e) => e.team === 0 && e !== victim && e.id !== g.selfId);
      g.arena.time = 20;
      Object.assign(g.player, { x: 3.5, y: 6.5, a: -Math.PI / 2 });
      Object.assign(killer, { x: 3.5, y: 5.5 });
      Object.assign(victim, { x: 3.5, y: 6 });
      Object.assign(witness, { x: 4.5, y: 5.5 });
      g.arena.privateFor(killer).killReadyAt = 0;
      g.arena.botAction(killer, "eliminate", victim.id);
      window.socialBots = [killer.id, witness.id];
      g.protocolCache = null;
      g.protocolUI.update(true);
      g.render();
      window.socialPump = setInterval(() => {
        if (g.running) {
          g.update(0.05);
          if (g.arena.protocol.phase === "discussion")
            for (const e of g.arena.entities) e.bot = window.socialBots.includes(e.id);
          g.protocolCache = null;
          g.protocolUI.update(true);
        }
      }, 50);
      return {
        killerId: killer.id,
        killer: killer.name,
        victim: victim.name,
        witnessId: witness.id,
      };
    });
    assert.equal(await page.locator(".mf-protocol-report").isVisible(), true);
    const r = await page.locator(".mf-protocol-report").boundingBox();
    assert.ok(r.width >= 44 && r.height >= 44);
    if (mobile) await click(page.locator(".mf-protocol-report"));
    else {
      await page.locator(".mf-shell").focus();
      await page.keyboard.press("f");
    }
    await page.locator(".mf-protocol-meeting").waitFor({ state: "visible" });
    await page.waitForFunction(
      (id) =>
        document
          .querySelector("midnry-fps")
          .engine.arena.protocol.meeting.messages.some(
            (m) => m.sender === id && m.text.includes("attack a patrol"),
          ),
      scene.witnessId,
      { timeout: 9000 },
    );
    await page
      .locator(".mf-protocol-chatform input")
      .fill(`${scene.killer}, I saw you attack a patrol. Explain your alibi.`);
    await click(page.locator(".mf-protocol-chatform button"));
    await page.waitForFunction(
      (id) =>
        document
          .querySelector("midnry-fps")
          .engine.arena.protocol.meeting.messages.some(
            (m) =>
              m.sender === id &&
              /accusation is wrong|not what happened|did not attack/i.test(m.text),
          ),
      scene.killerId,
      { timeout: 7000 },
    );
    assert.ok((await page.locator(".mf-protocol-radio").textContent()).includes(scene.victim));
    await page.screenshot({ path: `/workspace/screenshots/outpost-social-radio-${name}.png` });
    // A fresh radio call can originate far from the console. Mobile uses Info.
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      window.socialBots = [];
      g.reset();
      g.start();
      g.protocolUI.brief.close();
      for (const e of g.arena.entities) e.bot = false;
      Object.assign(g.player, { x: 14.5, y: 14.5, a: 0 });
      g.protocolCache = null;
      g.protocolUI.update(true);
    });
    if (mobile) {
      await click(page.locator(".mf-protocol-infoopen"));
      await click(page.locator(".mf-protocol-callradio"));
    } else {
      await page.locator(".mf-shell").focus();
      await page.keyboard.press("c");
    }
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.arena.protocol.phase === "discussion",
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector("midnry-fps").engine.protocolView().protocol.self.emergenciesLeft,
      ),
      0,
    );
    // Jamming gives a route to the public wired console instead of a silent failure.
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.reset();
      g.start();
      g.protocolUI.brief.close();
      for (const e of g.arena.entities) e.bot = false;
      Object.assign(g.player, { x: 14.5, y: 14.5, a: 0 });
      g.arena.protocol.sabotage.commsUntil = 40;
      g.protocolCache = null;
      g.protocolUI.update(true);
    });
    await click(page.locator(".mf-protocol-infoopen"));
    await click(page.locator(".mf-protocol-callradio"));
    await page.waitForFunction(
      () =>
        document.querySelector("midnry-fps").engine.navigation.route?.goal.id === "meeting-console",
    );
    // Ceiling emission never follows camera range/culling. Only power sabotage
    // extinguishes it; batching preserves the elevated-emitter exception.
    const lamps = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military,
        samples = [];
      clearInterval(window.socialPump);
      for (const [x, y, a] of [
        [3.5, 5.5, 0],
        [8.5, 6.5, Math.PI],
        [14.5, 14.5, -Math.PI / 2],
      ]) {
        Object.assign(g.player, { x, y, a });
        g.protocolCache = null;
        r.frameProtocolArena = null;
        g.protocolUI.update(true);
        g.render();
        const emitters = [];
        r.world.traverse((o) => {
          if (o.isMesh && r.protocolLightMaterials.includes(o.material) && o.userData.noRoomCull)
            emitters.push({
              on: o.material.emissiveIntensity > 1,
              layer: o.layers.isEnabled(0),
              persistent: o.userData.noRoomCull === true,
              frustum: o.frustumCulled,
              count: o.isInstancedMesh ? o.count : 1,
            });
        });
        samples.push(emitters);
      }
      g.arena.protocol.sabotage.powerUntil = g.time + 40;
      g.protocolCache = null;
      r.frameProtocolArena = null;
      g.render();
      const off = r.protocolLightMaterials.every((m) => m.emissiveIntensity < 0.1);
      g.arena.protocol.sabotage.powerUntil = 0;
      g.protocolCache = null;
      r.frameProtocolArena = null;
      g.render();
      const restored = r.protocolLightMaterials.every((m) => m.emissiveIntensity > 1);
      return {
        samples,
        off,
        restored,
        expected: r.protocolFixtures.filter((f) => !f.arrivalOnly).length,
      };
    });
    assert.ok(
      lamps.samples.every(
        (a) => a.length > 0 && a.every((e) => e.on && e.layer && e.persistent && !e.frustum),
      ),
    );
    assert.equal(lamps.off, true);
    console.log(
      JSON.stringify({
        name,
        expectedCeilingFixtures: lamps.expected,
        renderedCounts: lamps.samples.map((a) => a.reduce((n, e) => n + e.count, 0)),
      }),
    );
    assert.ok(lamps.samples.every((a) => a.reduce((n, e) => n + e.count, 0) === lamps.expected));
    assert.equal(lamps.restored, true);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        name,
        report: "native control passed",
        AI: "witness testimony and accused infiltrator defence passed",
        radio: "remote call and jammed-console route passed",
        ceilingLights: "persistent at all sampled distances; sabotage only",
        errors,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
