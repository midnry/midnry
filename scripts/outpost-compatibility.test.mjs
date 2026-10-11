import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAppleTouchDevice,
  graphicsProfile,
  renderSize,
} from "./outpost-military/compatibility.js";

test("iPad desktop browsing mode receives the Apple touch budget", () => {
  assert(
    isAppleTouchDevice({ userAgent: "Macintosh Safari", platform: "MacIntel", maxTouchPoints: 5 }),
  );
  assert(isAppleTouchDevice({ userAgent: "iPhone Safari" }));
  assert(
    !isAppleTouchDevice({ userAgent: "Macintosh Safari", platform: "MacIntel", maxTouchPoints: 0 }),
  );
});

test("portrait and landscape stay within pixel and GPU dimension limits without changing aspect", () => {
  for (const safeMode of [false, true]) {
    const p = graphicsProfile({ appleTouch: true, safeMode, maxTextureSize: 2048 });
    for (const [w, h] of [
      [1440, 1920],
      [1920, 1440],
      [960, 600],
      [4000, 300],
    ]) {
      const [rw, rh] = renderSize(w, h, p);
      assert(rw * rh <= p.maxPixels);
      assert(Math.max(rw, rh) <= p.maxTextureSize);
      assert(Math.abs(rw / rh - w / h) < 0.1);
    }
  }
});

test("recovery removes expensive passes while retaining the 3D scene pipeline", () => {
  const tablet = graphicsProfile({ appleTouch: true });
  assert.equal(tablet.maxShadowSize, 1024);
  assert.equal(tablet.ambientOcclusion, false);
  const recovery = graphicsProfile({ safeMode: true });
  assert.equal(recovery.reflections, false);
  assert.equal(recovery.maxShadowSize, 512);
  assert.equal(recovery.ambientOcclusion, false);
  assert.equal(graphicsProfile({ halfFloat: false }).ambientOcclusion, false);
});
