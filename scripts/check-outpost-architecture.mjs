/** Real desktop/touch camera, roof and daylight regression checks. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:8080';
const label = process.argv[3] || 'dev';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
mkdirSync('/workspace/screenshots', { recursive: true });
const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
  for (const mobile of [false, true]) {
    const device = mobile ? 'mobile' : 'desktop';
    const page = await browser.newPage({viewport: mobile ? {width:390,height:844} : {width:960,height:640}, hasTouch:mobile,isMobile:mobile});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if(e.type()==='error') errors.push(e.text()); });
    await page.addInitScript(() => localStorage.setItem('midnry-outpost-graphics', JSON.stringify({preset:'performance',options:{adaptive:false,width:480,shadows:false,lighting:true}})));
    await page.goto(base+'/games/outpost-zero.html');
    await page.waitForFunction(() => document.querySelector('midnry-fps')?.engine?.militaryLoaded, null, {timeout:120000});
    await page.evaluate(() => {
      const g = document.querySelector('midnry-fps').engine;
      cancelAnimationFrame(g.frame); g.frame=0; g.lockMouse=()=>{}; g.start(); g.protocolUI.brief.close();
      for(const e of g.arena.entities) if(e!==g.player) Object.assign(e,{bot:false,x:21.5,y:24.5});
      g.arena.protocol.sabotage.powerUntil=0;
      window.roofPose=(x,y,a=0,pitch=0) => {
        Object.assign(g.player,{x,y,a}); g.lookPitch=pitch;
        g.protocolCache=null; g.military.frameProtocolArena=null; g.protocolUI.update(true);
        g.military.naturalLighting.initialized=false; g.render();
      };
      window.roofPose(8.5,6.5,0,.45);
    });
    const shell = await page.evaluate(() => {
      const g=document.querySelector('midnry-fps').engine,r=g.military;
      const roofs=[]; r.world.traverse(o=>{if(o.name==='Continuous interior roof') roofs.push(o);});
      // Probe the actual instanced slab volumes, not just roof metadata.
      const hasRoof=(x,y)=>roofs.some(roof=>{
        for(let i=0;i<roof.count;i++){
          const matrix=r.camera.matrixWorld.clone();roof.getMatrixAt(i,matrix);
          matrix.premultiply(roof.matrixWorld).invert();
          const p=r.torchDirection.clone().set(x*3,3.58,y*3).applyMatrix4(matrix);
          if(Math.abs(p.x)<=.50001&&Math.abs(p.y)<=.50001&&Math.abs(p.z)<=.50001)return true;
        }return false;
      });
      return {roofs:roofs.length, inside:r.naturalLighting.inside,
        doorCovered:hasRoof(8.5,6.5),courtyardOpen:!hasRoof(14.5,14.5),
        shells:r.wallMeshes.every(m=>m.userData.noRoomCull&&m.frustumCulled&&m.geometry.type==='BoxGeometry'),
        roofPersistent:roofs.every(m=>m.userData.noRoomCull&&m.frustumCulled), assets:r.assetErrors,
        overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.ok(shell.roofs>0); assert.equal(shell.inside,true); assert.equal(shell.shells,true);
    assert.equal(shell.doorCovered,true);assert.equal(shell.courtyardOpen,true);
    assert.equal(shell.roofPersistent,true); assert.deepEqual(shell.assets,[]); assert.equal(shell.overflow,false);
    await page.screenshot({path:`/workspace/screenshots/outpost-roofs-${label}-${device}-doorway.png`});
    const daylight=await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine,r=g.military;
      const sample=()=>({sun:r.sun.intensity,sky:r.scene.backgroundIntensity,ambient:r.scene.environmentIntensity,
        exposure:r.renderer.toneMappingExposure,fog:r.scene.fog.color.getHex(),density:r.scene.fog.density,
        weapon:r.weaponScene.environmentIntensity,inside:r.naturalLighting.inside});
      window.roofPose(14.5,14.5,0,.2); const lit=sample();
      g.arena.protocol.sabotage.powerUntil=g.time+45;
      window.roofPose(14.5,14.5,0,.2); const dark=sample();
      window.roofPose(8.5,6.5,0,.45); const indoor=sample();
      return {lit,dark,indoor,fixturesOff:r.protocolLightMaterials.every(m=>m.emissiveIntensity<.05)};
    });
    assert.deepEqual(daylight.dark,daylight.lit,'blackout must not change outdoor daylight, atmosphere or weapon');
    assert.equal(daylight.indoor.inside,true); assert.equal(daylight.lit.inside,false);
    assert.equal(daylight.indoor.sky,daylight.lit.sky); assert.ok(daylight.indoor.ambient<daylight.lit.ambient);
    assert.equal(daylight.fixturesOff,true);
    await page.screenshot({path:`/workspace/screenshots/outpost-roofs-${label}-${device}-blackout.png`});
    const movement=await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine,r=g.military;
      g.arena.protocol.sabotage.powerUntil=0;
      window.roofPose(14.5,11.8,Math.PI/2,0);
      const before=r.scene.environmentIntensity;
      g.keys.add('w'); for(let i=0;i<16;i++)g.update(.05); g.keys.clear();
      r.lastRenderAt=performance.now()-1000/120;g.render();
      const outside={inside:r.naturalLighting.inside,ambient:r.scene.environmentIntensity,sky:r.scene.backgroundIntensity};
      window.roofPose(8.35,6.5,0,.3);
      g.keys.add('w');for(let i=0;i<8;i++)g.update(1/60);g.keys.clear();g.render();
      return {before,outside,doorInside:r.naturalLighting.inside,mask:r.camera.layers.mask,
        culled:r.metrics.worldCulled,stats:r.metrics};
    });
    assert.equal(movement.outside.inside,false); assert.ok(movement.outside.ambient>movement.before&&movement.outside.ambient<.3);
    assert.equal(movement.outside.sky,.58);assert.equal(movement.doorInside,true);assert.equal(movement.mask,1);assert.ok(movement.culled>0);
    // Aircraft bulkheads must also keep a roof while the cockpit retains its
    // genuine outward-facing windows. The phase transition is authoritative.
    const aircraft=await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine;
      for(const item of g.arena.protocol.mission.manifest)item.loaded=item.required;
      const loading=g.arena.protocol.mission.loading;
      Object.assign(g.player,{x:loading.x,y:loading.y});g.arena.departMission(g.player);
      window.roofPose(8.5,4.5,-Math.PI/2,.5);
      const r=g.military;
      return {map:g.arena.mapId,inside:r.naturalLighting.inside,roof:r.world.children.some(root=>root.children.some(m=>m.name==='Continuous interior roof'))};
    });
    assert.equal(aircraft.map,'medevac');assert.equal(aircraft.inside,true);assert.equal(aircraft.roof,true);
    await page.screenshot({path:`/workspace/screenshots/outpost-roofs-${label}-${device}-aircraft.png`});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({device,shell,daylight,movement,aircraft,errors}));
    await page.close();
  }
} finally { await browser.close(); }
