import test from "node:test";
import assert from "node:assert/strict";
import { FrameBudget, MIN_BUDGET_SCALE } from "../public/games/outpost-academy.js";
import { MIN_RENDER_SCALE } from "./outpost-military/compatibility.js";
import { FrameDiagnostics } from "../public/games/outpost-frame-diagnostics.js";
test("device diagnostics measure gameplay cadence and retain it through menus", () => {
  const d=new FrameDiagnostics();
  for(let i=0;i<240;i++)d.sample(i*1000/120,3,4,true);
  assert.equal(d.report.fps,120);
  assert.ok(Math.abs(d.report.p95-1000/120)<.01);
  const before=structuredClone(d.report);
  for(let i=0;i<50;i++)d.sample(3000+i*100,1,null,false);
  assert.deepEqual(d.report,before);
  d.sample(10000,3,4,true);
  assert.equal(d.frames.at(-1).interval<9,true,"pause is not counted as a gameplay hitch");
});
test("120Hz and 60Hz cadence report measured FPS without inventing display frames", () => {
  for (const hz of [60, 120, 144]) {
    const b = new FrameBudget();
    for (let i = 0; i < 180; i++) b.sample(3, (i * 1000) / hz, true);
    assert.ok(Math.abs(b.fps - hz) <= 1);
    assert.equal(b.target, 120);
    assert.equal(b.scale, 1);
  }
});
test("sustained overload lowers resolution gradually and clamps its floor at 0.75", () => {
  assert.equal(MIN_BUDGET_SCALE, 0.75);
  assert.equal(MIN_BUDGET_SCALE, MIN_RENDER_SCALE, "page budget and 3D buffer share one floor");
  const b = new FrameBudget();
  for (let i = 0; i < 2000; i++) b.sample(12, (i * 1000) / 120, true);
  assert.equal(b.scale, MIN_BUDGET_SCALE);
  // Comfortable frames (under 5 ms) bring it back to full within ~4 s at 120 Hz.
  let now = 20000, frames = 0;
  while (b.scale < 1 && frames < 2000) b.sample(4, (now += 1000 / 120), true), frames++;
  assert.equal(b.scale, 1);
  assert.ok(frames <= 4 * 120, `recovered in ${frames} frames (was ~2000+)`);
  // Recovery never supersamples: extra pixels still need the strict headroom.
  for (let i = 0; i < 2000; i++) b.sample(4, (now += 1000 / 120), true, true, 4, 1.5);
  assert.equal(b.scale, 1);
});
test("paused games do not lower resolution; disabling adaptation restores it", () => {
  const b = new FrameBudget();
  for (let i = 0; i < 180; i++) b.sample(20, (i * 1000) / 60, false);
  assert.equal(b.scale, 1);
  for (let i = 0; i < 180; i++) b.sample(20, 4000 + (i * 1000) / 120, true);
  assert.ok(b.scale < 1);
  assert.equal(b.sample(20, 6000, true, false), true);
  assert.equal(b.scale, 1);
  const count = b.samples;
  b.sample(NaN, 7000, true);
  assert.equal(b.samples, count);
});
test("repeated slow frames trigger adaptation even when average work looks healthy", () => {
  const b = new FrameBudget();
  for (let i = 0; i < 180; i++) b.sample(3, (i * 1000) / 120, true);
  for (let i = 0; i < 60; i++) b.sample(i % 10 === 0 ? 9 : 3, 2000 + (i * 1000) / 120, true);
  assert.ok(b.work < 6.8);
  assert.ok(b.scale < 1);
});
test("cinematic headroom can raise resolution above its base and GPU load brings it back down", () => {
  const b=new FrameBudget();
  for(let i=0;i<4000;i++)b.sample(2,i*1000/60,true,true,2,1.5);
  assert.equal(b.scale,1.5);
  for(let i=0;i<480;i++)b.sample(2,70000+i*1000/60,true,true,12,1.5);
  assert.ok(b.scale<1,"GPU cost wins over cheap CPU submission");
  b.sample(2,80000,true,false,2,1.5);
  assert.equal(b.scale,1,"manual resolution restores the base cap");
});
test("slow cadence without GPU queries does not claim extra cinematic headroom", () => {
  const b=new FrameBudget();
  for(let i=0;i<5000;i++)b.sample(2,i*1000/60,true,true,null,1.5);
  assert.equal(b.scale,1);
  for(let i=0;i<4000;i++)b.sample(2,90000+i*1000/120,true,true,null,1.5);
  assert.equal(b.scale,1.5);
});
test("menus and intermittent spikes do not count as sustained upward headroom",()=>{
 const b=new FrameBudget();let now=0;
 for(let i=0;i<1200;i++)b.sample(1,now+=1000/120,false,true,1,1.5);
 for(let i=0;i<100;i++)b.sample(2,now+=1000/120,true,true,2,1.5);
 assert.equal(b.scale,1,"menu time cannot earn an immediate upgrade");
 for(let i=0;i<1200;i++)b.sample(i%120===0?4:2,now+=1000/120,true,true,2,1.5);
 assert.equal(b.scale,1,"isolated spikes restart the upward hold");
 for(let i=0;i<600;i++)b.sample(2,now+=1000/120,true,true,2,1.5);
 assert.ok(b.scale>1,"uninterrupted fast gameplay earns extra detail");
});
