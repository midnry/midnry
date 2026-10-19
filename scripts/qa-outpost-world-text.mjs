import assert from "node:assert/strict";

/** Real renderer contracts: typography, filtering, exposure and electrical
 * states. Readability itself is verified in the matched engine screenshots. */
export async function verifyWorldText(page, { fallback = false } = {}) {
  const result = await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine,
      r = g.military;
    const errors = [],
      signs = [];
    for (const m of r.protocolSignMaterials || []) {
      const t = m.map,
        meta = t?.userData.worldText;
      if (
        t?.colorSpace !== "srgb" ||
        !t.generateMipmaps ||
        t.anisotropy !== r.renderer.capabilities.getMaxAnisotropy()
      )
        errors.push("filtering: " + m.name);
      if (!(m.userData.textEmission > 0 && m.userData.textEmission <= 0.25))
        errors.push("excessive emission");
      if (meta?.worldSize) {
        if (
          Math.abs(t.image.width / t.image.height - meta.worldSize[0] / meta.worldSize[1]) > 0.025
        )
          errors.push("stretched: " + meta.title);
        if (meta.subtitlePx && meta.subtitlePx / meta.titlePx < 0.55)
          errors.push("tiny secondary: " + meta.title);
        if (!Number.isFinite(meta.titleWidth) || !Number.isFinite(meta.availableWidth) ||
          meta.titleWidth > meta.availableWidth)
          errors.push("clipped title: " + meta.title);
        signs.push({
          title: meta.title,
          image: [t.image.width, t.image.height],
          worldSize: meta.worldSize,
          titlePx: meta.titlePx,
          subtitlePx: meta.subtitlePx,
        });
      }
    }
    const view = g.protocolView(),
      until = view.protocol.sabotage.powerUntil;
    view.protocol.sabotage.powerUntil = 0;
    r.updateProtocol(view, g.player);
    const lit = [...r.protocolSignMaterials].map((m) => m.emissiveIntensity);
    view.protocol.sabotage.powerUntil = g.time + 60;
    r.updateProtocol(view, g.player);
    const dark = [...r.protocolSignMaterials].map((m) => m.emissiveIntensity);
    const darkScreens = [...r.protocolScreens.values()].map((m) => m.emissiveIntensity);
    const antiGlare = [...r.protocolScreens.values()].every(
      (m) => m.isMeshPhysicalMaterial && m.specularIntensity <= 0.1,
    );
    view.protocol.sabotage.powerUntil = until;
    r.updateProtocol(view, g.player);
    return {
      font: r.worldTypography,
      errors,
      signs,
      lit,
      dark,
      darkScreens,
      antiGlare,
      atlasSizes: [
        r.benchmarkAtlas.image.width,
        r.benchmarkAtlas.image.height,
        r.medicalDepotAtlas.image.width,
        r.medicalDepotAtlas.image.height,
        r.interactableKit.color.image.width,
      ],
      filtering: r.renderer.capabilities.getMaxAnisotropy(),
      sceneLoaded: g.militaryLoaded,
    };
  });
  assert.equal(result.sceneLoaded, true);
  assert.equal(result.font.loaded, !fallback);
  assert.deepEqual(result.errors, []);
  assert.ok(result.signs.length > 25);
  assert.deepEqual(result.atlasSizes, [2048, 1024, 2048, 512, 2048]);
  assert.ok(result.lit.every((n, i) => n > result.dark[i] && result.dark[i] > 0));
  assert.ok(
    result.darkScreens.every((n) => n === 0.015),
    "power-out screens retain their electrical state",
  );
  assert.equal(result.antiGlare, true);
  return result;
}
