import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 60000 },
    );
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.lockMouse = () => {};
    });
    await page.getByRole("button", { name: "Locker", exact: true }).click();
    const ids = await page.evaluate(async () =>
      Object.keys((await import("/games/outpost-content.js")).OUTFITS),
    );
    assert.equal(ids.length, 10);
    for (const id of ids) {
      const card = page.locator(`[data-outfit="${id}"]`);
      await card.scrollIntoViewIfNeeded();
      await card.locator("img").evaluate((i) => i.decode());
      assert.equal(await card.locator("img").evaluate((i) => i.naturalWidth), 600);
      await card.click();
      assert.equal(await card.getAttribute("aria-pressed"), "true");
    }
    await page.locator(".mf-outfitcard").first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/workspace/screenshots/outpost-skins-locker-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.locator(".mf-lockerclose").click();
    const report = await page.evaluate(async () => {
      const { OUTFITS } = await import("/games/outpost-content.js"),
        g = document.querySelector("midnry-fps").engine,
        r = g.military;
      g.arena.entities = g.arena.entities.filter((e) => !e.bot);
      const baseline = r.materials.size;
      for (const id of Object.keys(OUTFITS)) {
        const a = r.makeActor({ ...g.player, id: "skin-test", outfit: id, weapon: "carbine" });
        if (
          a.skinParts.length !== 6 ||
          a.skinParts.some((p) => !p.userData.anchor || !p.children.length)
        )
          throw Error("Missing animated skin parts");
        const before = a.skinParts.map((p) => p.matrix.elements.slice());
        a.actions.Idle?.stop();
        a.actions.Run?.reset().play();
        a.mixer.update(0.25);
        r.updateSkinParts(a);
        if (
          !a.skinParts.some((p, i) =>
            p.matrix.elements.some((v, j) => Math.abs(v - before[i][j]) > 0.001),
          )
        )
          throw Error("Skin parts did not animate");
        r.disposeActor(a);
        r.actors.delete("skin-test");
      }
      if (r.materials.size !== baseline) throw Error("Skin material leak");
      g.player.outfit = "recon";
      r.updateWeapon();
      if (r.weaponOutfit !== "recon" || !r.skinTextures.has("recon"))
        throw Error("First-person sleeve mismatch");
      return { skins: 10, attachments: 6, materials: baseline };
    });
    await page.getByRole("button", { name: "START SOLO", exact: false }).click();
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.$(".mf-modal").hidden = true;
      g.reset();
      g.$(".mf-modal").hidden = true;
      g.arena.entities = g.arena.entities.slice(0, 4);
      g.player.x = 5.5;
      g.player.y = 1.2;
      g.player.a = Math.PI / 2;
      g.lookPitch = 0;
      g.enemies.forEach((e, i) => {
        e.x = 4.6 + i * 0.85;
        e.y = 2.8;
        e.a = -Math.PI / 2;
        e.outfit = ["ranger", "recon", "engineer"][i];
      });
      g.render();
    });
    await page.screenshot({
      path: `/workspace/screenshots/outpost-skins-ai-${mobile ? "mobile" : "desktop"}.png`,
    });
    assert.deepEqual(errors, []);
    console.log({ mobile, ...report });
    await page.close();
  }
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/games/outpost-zero.html?renderer=classic");
  await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.loading === false);
  await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame);
    g.lockMouse = () => {};
    g.player.outfit = "recon";
    g.start();
    g.render();
  });
  assert.deepEqual(errors, []);
  await page.close();
  console.log(
    "All ten skin portraits, selection, AI gear, skeletal animation, material cleanup, sleeves and classic view passed.",
  );
} finally {
  await browser.close();
}
