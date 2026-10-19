/** Browser assertions for one room and the approved shared refinements. */
import assert from "node:assert/strict";

export async function verifyMedicalDepot(page) {
  const result = await page.evaluate(async () => {
    const g = document.querySelector("midnry-fps").engine,
      r = g.military;
    const originalLevel = JSON.stringify(g.level),
      records = r.medicalDepotPresentation.records;
    const boundsErrors = [];
    for (const o of records) {
      if (o.kind === "ceiling" && o.min[1] < 2.9) boundsErrors.push(o);
      if (
        o.kind === "floor" &&
        (o.min[1] < 0.026 ||
          o.max[1] > 0.05 ||
          g.level[Math.floor(o.p[2] / 3)]?.[Math.floor(o.p[0] / 3)] !== 0)
      )
        boundsErrors.push(o);
      if (
        o.kind === "solid" &&
        (o.min[0] < 66 - 1e-4 ||
          o.max[0] > 69 + 1e-4 ||
          o.min[2] < 72 - 1e-4 ||
          o.max[2] > 75 + 1e-4)
      )
        boundsErrors.push(o);
      if (o.kind === "wall") {
        const f = o.face,
          axis = f.dx ? 0 : 2,
          edge = ((f.dx ? f.x : f.y) + 0.5 + 0.5 * (f.dx || f.dz)) * 3;
        if (
          !g.level[f.y]?.[f.x] ||
          Math.max(Math.abs(o.min[axis] - edge), Math.abs(o.max[axis] - edge)) > 0.12
        )
          boundsErrors.push(o);
      }
    }
    const paths = [
      [
        [22.5, 21.5],
        [22.5, 23.5],
        [24.5, 23.5],
        [26.5, 23.5],
      ],
      [
        [24.5, 24.5],
        [23.5, 24.5],
        [23.5, 23.5],
        [21.5, 23.5],
        [21.5, 24.5],
        [18.5, 24.5],
      ],
    ];
    let blocked = 0;
    for (const path of paths) {
      Object.assign(g.player, { x: path[0][0], y: path[0][1] });
      for (const [x, y] of path.slice(1)) {
        const dx = x - g.player.x,
          dy = y - g.player.y,
          n = Math.ceil(Math.hypot(dx, dy) / 0.05);
        for (let i = 0; i < n; i++) g.arena.move(g.player, dx / n, dy / n);
        if (Math.hypot(g.player.x - x, g.player.y - y) > 0.01) blocked++;
      }
    }
    const opaqueCover = !g.arena.visible({ x: 22.5, y: 23.5 }, { x: 22.5, y: 25.5 });
    // A real level change must not leave a cosmetic refrigerator over clear floor.
    const cover = g.level[24][22];
    let removedWithTile = false;
    try {
      g.level[24][22] = 0;
      r.rebuildWalls();
      removedWithTile = !r.medicalDepotPresentation.records.some((o) => o.kind === "solid");
    } finally {
      g.level[24][22] = cover;
      r.rebuildWalls();
    }
    const preset = g.academy.preset,
      blooms = [];
    for (const value of ["performance", "balanced", "high"])
      for (const night of [false, true]) {
        g.academy.preset = value;
        r.updateCinematic(night, g.time);
        blooms.push({
          preset: value,
          night,
          enabled: r.bloom.enabled,
          grade: [
            ...r.grade.uniforms.highlight.value.toArray(),
            ...r.grade.uniforms.shadow.value.toArray(),
            r.grade.uniforms.saturation.value,
          ],
        });
      }
    g.academy.preset = preset;
    const label = r.interactableInstances.find(
      (v) => v.type === "cabinet-label" && v.id === "cabinet-comms",
    ).label;
    const labelPosition = label.position.toArray(),
      labelSize = [label.geometry.parameters.width, label.geometry.parameters.height];
    window.equipmentDraw(21.2, 19.5, Math.PI, -0.62);
    const view = g.protocolView();
    view.protocol.bombs = [{ id: "blink-check", x: 20.5, y: 19.5, state: "armed" }];
    const motion = r.motion,
      time = g.arena.time,
      blink = [];
    let disabled, steady, screenSize;
    try {
      r.motion = { matches: false };
      for (const t of [30.25, 30.75]) {
        g.arena.time = t;
        r.updateProtocol(view, g.player);
        blink.push(
          r.protocolCharges.get("blink-check").userData.chargeScreen.material.emissiveIntensity,
        );
      }
      screenSize = [
        r.protocolCharges.get("blink-check").userData.chargeScreen.geometry.parameters.width,
        r.protocolCharges.get("blink-check").userData.chargeScreen.geometry.parameters.height,
      ];
      r.motion = { matches: true };
      r.updateProtocol(view, g.player);
      steady =
        r.protocolCharges.get("blink-check").userData.chargeScreen.material.emissiveIntensity;
      view.protocol.bombs[0].state = "disabled";
      r.updateProtocol(view, g.player);
      disabled =
        r.protocolCharges.get("blink-check").userData.chargeScreen.material.emissiveIntensity;
    } finally {
      r.motion = motion;
      g.arena.time = time;
      r.clearProtocolDynamic();
    }
    const { PROTOCOL_RULES } = await import("./outpost-protocol.js"),
      bombs = g.arena.protocol.bombs;
    let inside, outside;
    try {
      g.arena.protocol.bombs = [{ id: "range-check", x: 20.5, y: 19.5 }];
      Object.assign(g.player, { x: 20.5 + PROTOCOL_RULES.interactRange - 0.01, y: 19.5 });
      inside = g.arena.context(g.player)?.kind;
      g.player.x = 20.5 + PROTOCOL_RULES.interactRange + 0.01;
      outside = g.arena.context(g.player)?.kind;
    } finally {
      g.arena.protocol.bombs = bombs;
    }
    window.equipmentDraw(24.5, 23.5, Math.PI, -0.015);
    return {
      boundsErrors,
      records: records.length,
      blocked,
      opaqueCover,
      removedWithTile,
      collisionUnchanged: JSON.stringify(g.level) === originalLevel,
      blooms,
      labelPosition,
      labelSize,
      blink,
      steady,
      disabled,
      screenSize,
      interactRange: PROTOCOL_RULES.interactRange,
      inside,
      outside,
      reflection: r.reflection?.visible,
      assetErrors: r.assetErrors,
    };
  });
  assert.deepEqual(result.boundsErrors, []);
  assert.ok(result.records > 100);
  assert.equal(result.blocked, 0);
  assert.equal(result.opaqueCover, true);
  assert.equal(result.removedWithTile, true);
  assert.equal(result.collisionUnchanged, true);
  for (const b of result.blooms)
    assert.equal(b.enabled, b.preset === "high");
  assert.ok(
    result.blooms.every((b) => JSON.stringify(b.grade) === JSON.stringify(result.blooms[0].grade)),
  );
  assert.deepEqual(result.labelPosition, [0, 0.534, 0.205]);
  assert.deepEqual(result.labelSize, [1.04, 0.08]);
  assert.ok(Math.max(...result.blink) / Math.min(...result.blink) > 3);
  assert.equal(result.steady, 3.8);
  assert.equal(result.disabled, 0.6);
  assert.deepEqual(result.screenSize, [0.18, 0.15]);
  assert.equal(result.interactRange, 1.4);
  assert.equal(result.inside, "defuse");
  assert.notEqual(result.outside, "defuse");
  assert.equal(result.reflection, false);
  assert.deepEqual(result.assetErrors, []);
  return result;
}
