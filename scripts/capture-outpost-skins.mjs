import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
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
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto((process.argv[2] || "http://127.0.0.1:8080") + "/games/outpost-zero.html");
  await page.waitForFunction(
    () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
    null,
    { timeout: 60000 },
  );
  await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame);
    g.ui.refresh = () => {};
  });
  const ids = await page.evaluate(async () =>
    Object.keys((await import("/games/outpost-content.js")).OUTFITS),
  );
  mkdirSync("/workspace/screenshots/skins", { recursive: true });
  for (const id of ids) {
    const data = await page.evaluate(
      (id) => document.querySelector("midnry-fps").engine.military.skinPortrait(id),
      id,
    );
    writeFileSync(
      `/workspace/screenshots/skins/${id}.webp`,
      Buffer.from(data.split(",")[1], "base64"),
    );
  }
  const lineup = await page.evaluate(() =>
    document
      .querySelector("midnry-fps")
      .engine.military.skinPortrait(["ranger", "recon", "engineer"], 1200, 600),
  );
  writeFileSync(
    "/workspace/screenshots/skins/operator.webp",
    Buffer.from(lineup.split(",")[1], "base64"),
  );
  const bones = await page.evaluate(() => {
    const r = document.querySelector("midnry-fps").engine.military,
      g = r.g,
      a = r.makeActor({ ...g.enemies[0], id: "bone-inspect" });
    const parts = a.skinParts.map((p) => ({
      anchor: p.userData.anchor?.name,
      meshes: p.children.length,
    }));
    r.disposeActor(a);
    r.actors.delete("bone-inspect");
    return parts;
  });
  console.log(JSON.stringify({ portraits: ids.length, bones, errors }));
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
}
