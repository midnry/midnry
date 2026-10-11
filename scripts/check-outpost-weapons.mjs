import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto((process.argv[2] || "http://127.0.0.1:8080") + "/games/outpost-zero.html");
    await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.weapons);
    const result = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine;
      await g.weapons.ready;
      cancelAnimationFrame(g.frame);
      const { WEAPON_ART } = await import("/games/outpost-weapons.js");
      const originalWeapon = g.player.weapon,
        before = JSON.stringify(g.arena.snapshot()),
        images = new Set(),
        ammo = new Set();
      const gallery = document.createElement("canvas");
      gallery.width = 1200;
      gallery.height = 1000;
      const c = gallery.getContext("2d");
      c.fillStyle = "#263543";
      c.fillRect(0, 0, 1200, 1000);
      WEAPON_ART.forEach((id, i) => {
        const sprite = g.weapons.cell(id);
        images.add(sprite.toDataURL());
        c.save();
        c.translate((i % 4) * 300, Math.floor(i / 4) * 260);
        g.weapons.preview(c, id, 300, 220);
        c.fillStyle = "white";
        c.font = "20px sans-serif";
        c.fillText(id, 12, 246);
        c.restore();
      });
      [
        "rifle",
        "burst",
        "shotgun",
        "rocket",
        "blades",
        "poison",
        "spike",
        "lob",
        "barrel",
        "shard",
        "echo",
      ].forEach((kind, i) => {
        const sprite = g.weapons.ammo(kind);
        ammo.add(sprite.toDataURL());
        c.drawImage(sprite, i * 104 + 10, 820, 90, 90);
        c.fillStyle = "white";
        c.font = "14px sans-serif";
        c.fillText(kind, i * 104 + 10, 940);
      });
      for (const id of WEAPON_ART) {
        g.player.weapon = id;
        g.weapons.draw();
        g.weapons.observe();
      }
      g.player.weapon = originalWeapon;
      const after = JSON.stringify(g.arena.snapshot());
      document.body.replaceChildren(gallery);
      gallery.style = "width:100%;height:auto";
      return {
        loaded: g.weapons.loaded,
        images: images.size,
        ammo: ammo.size,
        cache: g.weapons.cells.size,
        pure: before === after,
      };
    });
    assert(result.loaded);
    assert(result.pure);
    assert.equal(result.images, 11);
    assert.equal(result.ammo, 11);
    assert.equal(result.cache, 11);
    await page.screenshot({
      path: `/workspace/screenshots/outpost-weapon-gallery-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ mobile, ...result }));
    await page.close();
  }
} finally {
  await browser.close();
}
