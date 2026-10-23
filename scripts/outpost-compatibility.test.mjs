import test from "node:test";
import assert from "node:assert/strict";
import { newCompatibilityReport, checkBrowser, performanceRecommendation } from "../public/games/outpost-compatibility.js";

const features = {
  ResizeObserver: class {}, PointerEvent: class {},
  WebAssembly: { instantiate() {} }, HTMLDialogElement: class { showModal() {} },
};
test("unsupported browser is blocked before it tries creating a graphics context", () => {
  let contextAttempted = false;
  const report = newCompatibilityReport();
  assert.equal(checkBrowser(report, { ...features, ResizeObserver: undefined, document: { createElement() { contextAttempted = true; } } }), false);
  assert.equal(contextAttempted, false);
  assert.equal(report.status, "unsupported");
  assert.match(report.checks[0].detail, /ResizeObserver/);
});
test("disabled WebGL blocks play while retaining an actionable explanation", () => {
  const report = newCompatibilityReport();
  assert.equal(checkBrowser(report, { ...features, document: { createElement: () => ({ getContext: () => null }) } }), false);
  assert.equal(report.status, "unsupported");
  assert.match(report.checks[1].detail, /hardware acceleration/);
  assert.equal(report.checks[2].status, "checking", "assets are not downloaded to prove an unsupported device");
});
test("measured performance recommends lower quality without claiming 120 FPS on a 60 Hz display", () => {
  assert.deepEqual(performanceRecommendation(20, 60, "high").recommendedPreset, "balanced");
  assert.deepEqual(performanceRecommendation(35, 28, "balanced").recommendedPreset, "performance");
  const fast = performanceRecommendation(4, 60, "balanced");
  assert.equal(fast.status, "ready");
  assert.equal(fast.sampledFps, 60);
  assert.equal(performanceRecommendation(NaN, 60, "balanced").status, "unsupported");
});
import {
  isAppleTouchDevice,
  graphicsProfile,
  renderSize,
  cinematicRenderSize,
  lobbyRenderSize,
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

test("Retina cinematic pixels grow with measured headroom without changing HUD/aim geometry",()=>{
 const p=graphicsProfile(),options={width:960,militaryWidth:1280,adaptive:true};
 assert.deepEqual(cinematicRenderSize(1280,720,2,options,p,1),[1280,720]);
 assert.deepEqual(cinematicRenderSize(1280,720,2,options,p,1.5),[1920,1080]);
 assert.deepEqual(cinematicRenderSize(1280,720,1,options,p,1.5),[1280,720],"no supersampling above display");
 assert.deepEqual(cinematicRenderSize(1280,720,2,{...options,adaptive:false},p,1.5),[1280,720]);
 const phone=cinematicRenderSize(390,844,2,options,p,1),down=cinematicRenderSize(390,844,2,options,p,.5);
 assert.deepEqual(phone,[487,1055],"phones render at 1.25 CSS pixels (sharper text, far below a full Retina buffer)");
 assert.deepEqual(cinematicRenderSize(844,390,3,options,p,1),[1055,487],"landscape phone too");
 assert.deepEqual(cinematicRenderSize(390,844,1,options,p,1),[390,844],"never above the physical display");
 assert.deepEqual(cinematicRenderSize(844,390,3,{...options,militaryWidth:720},p,1),[720,332],"Performance keeps its width cap");
 assert.ok(down[0]<phone[0]&&down[1]<phone[1],"continued pressure actually reduces a capped phone buffer");
 assert.ok(down[0]>=390*0.9,"but never below ~1 CSS pixel: the 0.75 floor keeps close text readable");
 const apple=graphicsProfile({appleTouch:true});
 const base=cinematicRenderSize(1024,768,2,options,apple,1),extra=cinematicRenderSize(1024,768,2,options,apple,1.5);
 assert.ok(base[0]*base[1]<=1000000);
 assert.ok(extra[0]*extra[1]<=1600000&&extra[0]>base[0]);
 const safe=graphicsProfile({appleTouch:true,safeMode:true});
 const recovery=cinematicRenderSize(1024,768,2,options,safe,1.5);
 assert.ok(recovery[0]*recovery[1]<=600000,"recovery mode keeps its original hard ceiling");
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

test("the lobby renders at the screen's density, within its own budget", () => {
  const iphone = graphicsProfile({ appleTouch: true });
  // iPhone portrait, 3× screen: 2× density (780 × 1688), not the match's 1.25×.
  assert.deepEqual(lobbyRenderSize(390, 844, 3, iphone, "balanced"), [780, 1688]);
  // iPad at 2×: held to the Apple lobby budget of 2 million pixels.
  const [w, h] = lobbyRenderSize(1024, 1366, 2, iphone, "high");
  assert(w * h <= 2000000 && w * h > 1900000 && Math.abs(w / h - 1024 / 1366) < 0.01);
  // A plain laptop screen at 1×: exactly its size.
  assert.deepEqual(lobbyRenderSize(1280, 720, 1, graphicsProfile(), "balanced"), [1280, 720]);
  // Performance and safe mode keep the cheaper match buffer.
  assert.equal(lobbyRenderSize(390, 844, 3, iphone, "performance"), null);
  assert.equal(lobbyRenderSize(390, 844, 3, graphicsProfile({ safeMode: true }), "high"), null);
});
