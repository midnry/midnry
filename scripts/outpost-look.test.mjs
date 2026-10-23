import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOK_DEFAULTS, sanitizeLook, viewGeometry, lookDelta, requestAimLock } from '../public/games/outpost-look.js';
const near = (a,b) => assert(Math.abs(a-b)<1e-10, `${a} != ${b}`);
test('preferences validate saved values and bound extremes', () => {
 assert.deepEqual(sanitizeLook(null), LOOK_DEFAULTS);
 assert.deepEqual(sanitizeLook({ fov: '120', sensitivity: NaN, raw: 'false' }), LOOK_DEFAULTS);
 const s=sanitizeLook({fov:200,sensitivity:0,vertical:5,touch:-1,invert:true,raw:false,buttons:3,buttonAlpha:0});
 assert.deepEqual(s,{fov:120,sensitivity:0.1,vertical:2,touch:0.25,invert:true,raw:false,buttons:1.25,buttonAlpha:0.4});
});
test('angular mouse response is linear, equal on both axes and independent of FOV/resolution', () => {
 const delta=lookDelta(100,100,LOOK_DEFAULTS); near(delta.yaw,-delta.pitch);
 near(lookDelta(25,0,LOOK_DEFAULTS).yaw*4,delta.yaw);
 near(lookDelta(100,0,{...LOOK_DEFAULTS,sensitivity:4}).yaw,delta.yaw*2);
 near(lookDelta(0,100,{...LOOK_DEFAULTS,invert:true}).pitch,-delta.pitch);
 near(lookDelta(0,100,{...LOOK_DEFAULTS,vertical:0.5}).pitch,delta.pitch*0.5);
 near(lookDelta(50,0,{...LOOK_DEFAULTS,sensitivity:10},true).yaw,lookDelta(50,0,LOOK_DEFAULTS,true).yaw);
});
test('FOV projection agrees at every resolution and expands on ultrawide', () => {
 const a=viewGeometry(1920,1080,100), b=viewGeometry(960,540,100), wide=viewGeometry(2560,1080,100);
 near(2*Math.atan(a.plane)*180/Math.PI,100); near(a.vertical,b.vertical); near(a.projection,b.projection*2);
 near(a.vertical,wide.vertical); assert(wide.plane>a.plane);
 assert(viewGeometry(390,844,100).vertical<=110*Math.PI/180);
 assert(viewGeometry(1920,1080,120).projection<a.projection);
});
test('raw lock falls back only when unsupported and reports denied lock without retry', async () => {
 const calls=[];
 await requestAimLock({requestPointerLock: async options => {calls.push(options);if(options?.unadjustedMovement)throw Object.assign(Error(),{name:'NotSupportedError'});}},true);
 assert.deepEqual(calls,[{unadjustedMovement:true},undefined]);
 let failures=0,attempts=0;
 await requestAimLock({requestPointerLock:async()=>{attempts++;throw Object.assign(Error(),{name:'NotAllowedError'});}},true,()=>failures++);
 assert.equal(attempts,1);assert.equal(failures,1);
 await requestAimLock({requestPointerLock:()=>undefined},false,()=>failures++);assert.equal(failures,1);
});
