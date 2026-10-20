/** Real-engine regression for optional material downloads and shared equipment.
 * Fixtures exercise existing simulation/public-view APIs; no gameplay is changed. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { verifyMedicalDepot } from "./qa-outpost-medical-depot.mjs";
import { verifyWorldText } from './qa-outpost-world-text.mjs';
import {verifySupplyAtrium} from './qa-outpost-supply-atrium.mjs';
import {verifyCommandOperations} from './qa-outpost-command-operations.mjs';
import {verifyCommunicationsRadar} from './qa-outpost-communications-radar.mjs';
import { verifyCentralPassage } from './qa-outpost-central-passage.mjs';
const base = process.argv[2] || "http://127.0.0.1:8080",
  label = process.argv[3] || "dev";
const pass = process.env.OUTPOST_GRAPHICS_PASS || "interactables";
assert.ok(["interactables", "medical-depot", "text-clarity", "central-passage", "supply-atrium", "command-operations", "communications-radar"].includes(pass));
const directory = "/workspace/screenshots/outpost-" + pass;
const evidence = "docs/graphics-benchmark/" + pass;
mkdirSync(directory, { recursive: true });
mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const results = [];
try {
  for (const variant of ["blocked", "desktop", "mobile", ...(['text-clarity','central-passage'].includes(pass)?['font-fallback']:[])]) {
    if (process.env.OUTPOST_QA_VARIANT && process.env.OUTPOST_QA_VARIANT !== variant) continue;
    const mobile = variant === "mobile",
      blocked = variant === "blocked",
      fallback = variant === 'font-fallback',
      errors = [],
      warnings = [],
      aborted = [];
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: "reduce",
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "warning" && /Optional operator response|Outpost world text/.test(e.text()))
        warnings.push(e.text());
      if (e.type() === "error" && !(blocked && /benchmark-operator/.test(e.location().url)) && !(fallback&&/\.woff2/.test(e.location().url)))
        errors.push(e.text());
    });
    if (blocked)
      await page.route(/benchmark-operator/, (r) => {
        aborted.push(r.request().url());
        return r.abort();
      });
    if(fallback) await page.route(/barlow-condensed.*\.woff2/,route=>{aborted.push(route.request().url());return route.abort();});
    await page.addInitScript(() => {
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "balanced", options: { adaptive: false } }),
      );
      localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 10 }));
    });
    await page.goto(base + "/games/outpost-zero.html",{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 180000 },
    );
    const initial = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.lockMouse = () => {};
      const { dailyRandom } = await import("./outpost-shifts.js"),
        original = Math.random;
      try {
        Math.random = dailyRandom("outpost-corridor-20261019");
        g.mode = "protocol";
        g.rolePreference = "operator";
        g.shift = "full";
        g.modifier = "radio-silence";
        g.reset();
      } finally {
        Math.random = original;
      }
      g.start();
      for (const d of g.root.querySelectorAll("dialog[open]")) d.close();
      g.arena.time = 30;
      for (const e of g.arena.entities) {
        e.bot = false;
        if (e !== g.player) Object.assign(e, { x: 21.5, y: 7.5 });
      }
      for (const p of g.arena.protocol.mission.patients) p.decay = 0;
      g.arena.protocol.events = [];
      window.equipmentDraw = (x = 6.45, y = 23.5, a = 0, pitch = -0.04) => {
        Object.assign(g.player, { x, y, a });
        g.lookPitch = pitch;
        g.protocolCache = null;
        r.frameProtocolArena = null;
        r.naturalLighting.initialized = false;
        r.lastRenderAt = performance.now() - 16;
        r.lastShadowAt = 0;
        if (r.worldVisibility) r.worldVisibility.dirty = true;
        g.protocolUI.update(true);
        g.render();
      };
      window.equipmentDraw();
      const materials = [];
      r.soldier.scene.traverse((o) => {
        if (o.isMesh)
          for (const m of [].concat(o.material))
            if (m.userData.riggedOperator && !materials.some((v) => v.name === m.name))
              materials.push({
                name: m.name,
                roughness: m.roughness,
                metalness: m.metalness,
                roughnessMap: !!m.roughnessMap,
                normal: m.normalScale?.x,
              });
      });
      return {
        loaded: g.militaryLoaded,
        assetErrors: r.assetErrors,
        optionalWarnings: r.optionalAssetWarnings || [],
        response: Object.keys(r.operatorResponse),
        materials,
      };
    });
    assert.equal(initial.loaded, true);
    assert.deepEqual(initial.assetErrors, []);
    if (blocked) {
      assert.equal(aborted.length, 2);
      assert.equal(warnings.length, 2);
      assert.equal(initial.optionalWarnings.length, 2);
      assert.deepEqual(initial.response, []);
      assert.ok(initial.materials.length >= 3);
      for (const m of initial.materials) {
        assert.equal(m.roughnessMap, false);
        assert.equal(m.metalness, 0);
        assert.equal(m.normal, 0.55);
        assert.equal(m.roughness, m.name === "Operator head 2" ? 0.76 : 0.93);
      }
    } else assert.equal(initial.response.length, 2);
    const states = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military;
      const collision = JSON.stringify(g.level);
      const stations = r.interactableInstances.filter((v) => v.type === "station");
      const mounts = stations.map((s) => ({
        id: s.id,
        position: s.root.position.toArray(),
        expected: r
          .protocolMount(
            g.protocolMap.stations.find((v) => v.id === s.id).x,
            g.protocolMap.stations.find((v) => v.id === s.id).y,
            1.34,
          )
          .position.toArray(),
      }));
      const view = g.protocolView();
      view.protocol.self.tasks = [...r.protocolScreens.keys()].map((stationId) => ({
        stationId,
        done: false,
      }));
      r.updateProtocol(view, g.player);
      const active = [...r.protocolScreens.values()].map((m) => m.emissiveIntensity);
      view.protocol.self.tasks.forEach((t) => (t.done = true));
      r.updateProtocol(view, g.player);
      const done = [...r.protocolScreens.values()].map((m) => m.emissiveIntensity);
      view.protocol.sabotage.powerUntil = g.time + 60;
      r.updateProtocol(view, g.player);
      const dark = [...r.protocolScreens.values()].map((m) => m.emissiveIntensity);
      view.protocol.sabotage.powerUntil = 0;
      const medical = [];
      for (const stock of [0, 1, 2]) {
        view.protocol.mission.supplyStock.forEach((s) => (s.stock = stock));
        r.updateMedicalMission(view.protocol.mission, g.time);
        medical.push({
          stock,
          values: [...r.medicalStocks.values()].map((cases) => cases.map((o) => o.visible)),
        });
      }
      const caseMeshes = [...r.medicalStocks.values()].flat().map((o) => {
        let count = 0;
        o.traverse((v) => {
          if (v.isMesh) count++;
        });
        return count;
      });
      const grades = [];
      for (const [x, y, a] of [
        [9.7, 22.4, -Math.PI / 2],
        [6.6, 7.2, -2],
        [14.5, 8.5, 0],
        [22.5, 4.5, -Math.PI / 2],
      ]) {
        window.equipmentDraw(x, y, a);
        const u = r.grade.uniforms;
        grades.push({
          highlight: u.highlight.value.toArray(),
          shadow: u.shadow.value.toArray(),
          saturation: u.saturation.value,
          vignette: u.vignette.value,
          bloom: r.bloom.enabled,
        });
      }
      const emergency = r.interactableInstances
        .find((v) => v.type === "emergency")
        .root.position.toArray();
      return {
        stations: stations.length,
        expectedStations: g.protocolMap.stations.length,
        mounts,
        active,
        done,
        dark,
        medical,
        caseMeshes,
        grades,
        emergency,
        collisionUnchanged: collision === JSON.stringify(g.level),
        atlas: [r.interactableKit.color.image.width, r.interactableKit.response.image.width],
      };
    });
    assert.equal(states.stations, states.expectedStations);
    for (const s of states.mounts) {
      if (s.id === "coolant-test") s.expected[1] += 0.32;
      assert.deepEqual(s.position, s.expected);
    }
    assert.ok(states.active.every((v) => v === 0.9));
    assert.ok(states.done.every((v) => v === 0.4));
    assert.ok(states.dark.every((v) => v === 0.015));
    for (const entry of states.medical)
      assert.ok(entry.values.every((v) => v[0] === entry.stock > 0 && v[1] === entry.stock > 1));
    assert.ok(states.caseMeshes.every((n) => n === 1));
    assert.ok(states.grades.every((v) => JSON.stringify(v) === JSON.stringify(states.grades[0])));
    assert.equal(states.grades[0].bloom, false);
    assert.deepEqual(states.emergency, [19.5, 1.32, 19.5]);
    assert.equal(states.collisionUnchanged, true);
    assert.deepEqual(states.atlas, [2048, 256]);
    const room = ['medical-depot','text-clarity','central-passage'].includes(pass) ? await verifyMedicalDepot(page) : null;
    const text = ['text-clarity','central-passage','supply-atrium','command-operations','communications-radar'].includes(pass)?await verifyWorldText(page,{fallback}):null;
    const atrium = ['supply-atrium','command-operations','communications-radar'].includes(pass)?await verifySupplyAtrium(page):null;
    const command = ['command-operations','communications-radar'].includes(pass)?await verifyCommandOperations(page):null;
    const communications = pass==='communications-radar'?await verifyCommunicationsRadar(page):null;
    const central = pass==='central-passage'?await verifyCentralPassage(page):null;
    if(fallback) assert.ok(aborted.length>=2,'both optional font weights were blocked');
    if (!room) await page.evaluate(() => window.equipmentDraw());
    await page.screenshot({
      path: `${directory}/${label}-${variant}.png`,
      animations: "allow",
      timeout: 120000,
    });
    let charge, transport;
    if (!blocked) {
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.arena.protocol.bombs = [
          {
            id: "qa-charge",
            siteId: "hangar-tool-recess",
            name: "Tool recess",
            room: "hangar",
            x: 20.5,
            y: 19.5,
            armedAt: 20,
          },
        ];
        g.arena.protocol.mission.interactiveTasks = false;
        window.equipmentDraw(21.2, 19.5, Math.PI, -0.62);
      });
      await page.screenshot({
        path: `${directory}/${label}-${variant}-charge-armed.png`,
        timeout: 120000,
      });
      charge = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine,
          r = g.military,
          id = "qa-charge";
        const root = r.protocolCharges.get(id),
          position = root.position.toArray(),
          armedGeometry = root.userData.chargeMesh.geometry;
        // The actual existing channel API emits the authoritative local notice.
        g.arena.channel(g.player, true, false, 0.1);
        window.equipmentDraw(21.2, 19.5, Math.PI, -0.62);
        const channel = g.protocolView().protocol.self.channel?.kind;
        g.arena.channel(g.player, true, false, 20);
        window.equipmentDraw(21.2, 19.5, Math.PI, -0.62);
        return {
          channel,
          position,
          state: root.userData.state,
          geometryChanged: root.userData.chargeMesh.geometry !== armedGeometry,
          simulationRemoved: g.arena.protocol.bombs.length === 0,
          notice: g.player.notice,
          retained: r.protocolCharges.has(id),
        };
      });
      assert.equal(charge.channel, "defuse");
      assert.equal(charge.state, "disabled");
      assert.ok(charge.geometryChanged && charge.simulationRemoved && charge.retained);
      assert.deepEqual(charge.position, [61.5, 0.045, 58.5]);
      assert.match(charge.notice, /^Charge disabled\./);
      await page.screenshot({
        path: `${directory}/${label}-${variant}-charge-disabled.png`,
        timeout: 120000,
      });
      const cleanup = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine,
          r = g.military;
        g.arena.time += 5;
        window.equipmentDraw(21.2, 19.5, Math.PI, -0.62);
        const expired = !r.protocolCharges.has("qa-charge");
        const view = g.protocolView();
        view.protocol.bombs = [{ id: "redacted", x: 20.5, y: 19.5, state: "armed" }];
        r.updateProtocol(view, g.player);
        view.protocol.bombs = [];
        r.updateProtocol(view, g.player);
        return { expired, redactedRemoved: !r.protocolCharges.has("redacted") };
      });
      assert.deepEqual(cleanup, { expired: true, redactedRemoved: true });
      const departed = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine,
          r = g.military;
        for (const m of g.arena.protocol.mission.manifest) m.loaded = m.required;
        const loading = g.arena.protocol.mission.loading;
        Object.assign(g.player, { x: loading.x, y: loading.y });
        const departed = g.arena.departMission(g.player);
        window.equipmentDraw(g.player.x, g.player.y, g.player.a);
        return departed;
      });
      assert.equal(departed, true);
      // The normal transition wrapper deliberately defers the new map draw
      // until async shader compilation finishes. Let that real path complete.
      await page.waitForFunction(
        () => {
          const g = document.querySelector("midnry-fps").engine;
          g.render();
          const r = g.military;
          return r.mapKey === "medevac" && r.transportCargo.length === 13;
        },
        null,
        { timeout: 120000 },
      );
      transport = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine,
          r = g.military;
        r.render();
        const view = g.protocolView();
        view.protocol.mission.manifest.forEach((m) => (m.loaded = 0));
        r.updateMedicalMission(view.protocol.mission, g.time);
        const empty = r.transportCargo.filter((o) => o.visible).length;
        view.protocol.mission.manifest[0].loaded = 3;
        r.updateMedicalMission(view.protocol.mission, g.time);
        const loaded = r.transportCargo.filter((o) => o.visible).length;
        return {
          map: g.arena.mapId,
          empty,
          loaded,
          slots: r.transportCargo.length,
          stations: r.interactableInstances.filter((v) => v.type === "station").length,
          errors: r.assetErrors,
        };
      });
      console.log(JSON.stringify({ variant, transport }));
      assert.equal(transport.map, "medevac");
      assert.equal(transport.empty, 0);
      assert.equal(transport.loaded, 3);
      assert.equal(transport.slots, 13);
      assert.deepEqual(transport.errors, []);
      await page.waitForFunction(
        () => {
          document.querySelector("midnry-fps").engine.render();
          return document.querySelector(".mf-transition")?.hidden;
        },
        null,
        { timeout: 120000 },
      );
      await page.screenshot({
        path: `${directory}/${label}-${variant}-transport.png`,
        timeout: 120000,
      });
    }
    assert.deepEqual(errors, []);
    results.push({ variant, initial, states, room, text, central, atrium, command, communications, charge, transport, warnings, aborted, errors });
    console.log(
      JSON.stringify({
        variant,
        loaded: initial.loaded,
        stations: states.stations,
        charge: charge?.state,
        transport: transport?.map,
        errors,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${evidence}/qa-${label}.json`, JSON.stringify(results, null, 2));
}
