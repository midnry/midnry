import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GAP,
  EDGE,
  CONTROLS,
  orientationKey,
  buttonScale,
  clampRect,
  overlaps,
  blockedBy,
  safeBounds,
  offsetsFromMove,
  sanitizeLayout,
  layoutVariables,
} from "../public/games/outpost-touch-layout.js";

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

test("orientation keys: landscape only when wider than tall", () => {
  assert.equal(orientationKey(390, 844), "portrait");
  assert.equal(orientationKey(844, 390), "landscape");
  assert.equal(orientationKey(600, 600), "portrait");
});

test("button scale mirrors the stylesheet: phones cap the size setting at standard", () => {
  assert.equal(buttonScale(1.25, true), 1);
  assert.equal(buttonScale(1.25, false), 1.25);
  assert.equal(buttonScale(0.8, true), 0.8);
  assert.equal(buttonScale(NaN, false), 1);
  assert.equal(buttonScale(0, false), 1);
});

test("clamping keeps a control inside the safe bounds", () => {
  const bounds = safeBounds(390, 844, { top: 44, bottom: 34, left: 0, right: 0 });
  assert.deepEqual(bounds, { left: EDGE, top: 44 + EDGE, right: 390 - EDGE, bottom: 844 - 34 - EDGE });
  const inside = rect(100, 300, 78, 78);
  assert.deepEqual(clampRect(inside, bounds), inside);
  // Past the right edge and past the bottom (into the home indicator).
  const low = clampRect(rect(380, 840, 78, 78), bounds);
  assert.equal(low.right, bounds.right);
  assert.equal(low.bottom, bounds.bottom);
  // Above the notch.
  assert.equal(clampRect(rect(10, -20, 78, 78), bounds).top, bounds.top);
  // Wider than the screen: pinned to the left so it stays reachable.
  assert.equal(clampRect(rect(50, 50, 900, 20), bounds).left, bounds.left);
  // Missing insets count as zero.
  assert.deepEqual(safeBounds(100, 100), { left: EDGE, top: EDGE, right: 100 - EDGE, bottom: 100 - EDGE });
});

test("overlap guard needs the gap on every side, touching counts as overlap", () => {
  const fire = rect(298, 638, 78, 78);
  assert.equal(overlaps(fire, rect(298 - 52 - GAP, 638, 52, 52)), false, "exactly a gap apart is fine");
  assert.equal(overlaps(fire, rect(298 - 52 - GAP + 1, 638, 52, 52)), true, "one pixel closer is too close");
  assert.equal(overlaps(fire, rect(298, 638 + 78, 52, 52)), true, "touching below");
  assert.equal(overlaps(fire, rect(298, 638 + 78 + GAP, 52, 52)), false, "a gap below is fine");
  assert.equal(overlaps(fire, rect(0, 0, 50, 50)), false);
  const others = [rect(0, 0, 0, 0), null, rect(400, 400, 10, 10), rect(300, 700, 20, 20)];
  assert.equal(blockedBy(fire, others), others[3], "the crowded control is reported");
  assert.equal(blockedBy(rect(0, 0, 10, 10), others), null, "zero-size and missing rectangles never block");
});

test("drag to offsets: anchor edge and size factor decide the sign and scale", () => {
  const start = { ...rect(298, 638, 78, 78), dx: 0, dy: 0 };
  // Fire hangs off the right edge: moving it 20px right makes `right` 20px smaller.
  assert.deepEqual(offsetsFromMove("right", start, rect(318, 638, 78, 78)), { dx: -20, dy: 0 });
  // Moving down 10px makes `bottom` 10px smaller.
  assert.deepEqual(offsetsFromMove("right", start, rect(298, 648, 78, 78)), { dx: 0, dy: -10 });
  // The joystick hangs off the left edge: right is positive there.
  assert.deepEqual(offsetsFromMove("left", start, rect(318, 638, 78, 78)), { dx: 20, dy: 0 });
  // Existing offsets accumulate and the shift is stored in standard-size pixels.
  const moved = offsetsFromMove("right", { ...start, dx: 10, dy: 5 }, rect(258, 598, 78, 78), 0.8);
  assert.deepEqual(moved, { dx: 60, dy: 55 });
  assert.deepEqual(offsetsFromMove("right", start, rect(258, 638, 78, 78), 0), { dx: 40, dy: 0 }, "a bad scale falls back to 1");
});

test("round trip: the offsets put the stylesheet's rectangle where the finger left it", () => {
  // The stylesheet: right = (14 + dx) * k + safeRight, bottom = (128 + dy) * k + safeBottom.
  const W = 390, H = 844, k = 0.9, safe = { right: 0, bottom: 34 }, size = 78 * k;
  const place = ({ dx, dy }) => {
    const right = (14 + dx) * k + safe.right, bottom = (128 + dy) * k + safe.bottom;
    return rect(W - right - size, H - bottom - size, size, size);
  };
  const start = { ...place({ dx: 0, dy: 0 }), dx: 0, dy: 0 };
  const wanted = rect(start.left - 57, start.top - 123, size, size);
  const got = place(offsetsFromMove("right", start, wanted, k));
  assert.ok(Math.abs(got.left - wanted.left) < 1e-9 && Math.abs(got.top - wanted.top) < 1e-9);
});

test("saved layouts are validated per orientation and unknown data is dropped", () => {
  assert.deepEqual(sanitizeLayout(null), { portrait: {}, landscape: {} });
  assert.deepEqual(sanitizeLayout("junk"), { portrait: {}, landscape: {} });
  const layout = sanitizeLayout({
    portrait: { fire: { dx: 12.34, dy: -40 }, stick: { dx: "3", dy: 1 }, menu: { dx: 1, dy: 1 }, jump: { dx: 1e9, dy: 0 } },
    landscape: { reload: { dx: NaN, dy: 1 }, scope: { dx: 0, dy: 0 } },
    sideways: { fire: { dx: 1, dy: 1 } },
  });
  assert.deepEqual(layout, { portrait: { fire: { dx: 12.3, dy: -40 } }, landscape: { scope: { dx: 0, dy: 0 } } });
  assert.ok(Object.keys(CONTROLS).length >= 6);
});

test("layout variables name every control, clearing the ones without a saved spot", () => {
  const vars = layoutVariables({ fire: { dx: 10, dy: 160.04 } });
  assert.equal(vars["--mf-fire-dx"], "10px");
  assert.equal(vars["--mf-fire-dy"], "160px");
  assert.equal(vars["--mf-stick-dx"], null);
  assert.equal(Object.keys(vars).length, Object.keys(CONTROLS).length * 2);
  assert.equal(Object.values(layoutVariables()).every((v) => v === null), true);
});
