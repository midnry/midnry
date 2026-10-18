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
  for (const mobile of [false, true].filter(m => !process.env.OUTPOST_QA_DEVICE || process.env.OUTPOST_QA_DEVICE === (m ? 'mobile' : 'desktop'))) {
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
      cancelAnimationFrame(g.frame); g.frame=0; g.lockMouse=()=>{}; g.rolePreference='infiltrator';g.reset();g.start(); g.protocolUI.brief.close();
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
        doorCovered:hasRoof(8.5,6.5),atriumCovered:hasRoof(14.5,14.5),perimeterOpen:!hasRoof(14.5,26.5),
        shells:r.wallMeshes.every(m=>m.userData.noRoomCull&&m.frustumCulled&&m.geometry.type==='BoxGeometry'),
        roofPersistent:roofs.every(m=>m.userData.noRoomCull&&m.frustumCulled), assets:r.assetErrors,
        overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.ok(shell.roofs>0); assert.equal(shell.inside,true); assert.equal(shell.shells,true);
    assert.equal(shell.doorCovered,true);assert.equal(shell.atriumCovered,true);assert.equal(shell.perimeterOpen,true);
    assert.equal(shell.roofPersistent,true); assert.deepEqual(shell.assets,[]); assert.equal(shell.overflow,false);
    const seamOverlaps=await page.evaluate(()=>{
      const r=document.querySelector('midnry-fps').engine.military,walls=[],frames=[];
      r.world.updateMatrixWorld(true);
      r.world.traverse(o=>{
        if(!o.isMesh||o.geometry.type!=='BoxGeometry')return;
        const wall=!!o.userData.tiles;
        if(!wall&&o.name!=='Instanced architectural detail')return;
        for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
          const m=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);}
          const a=r.torchDirection.clone().set(-.5,-.5,-.5).applyMatrix4(m),b=r.torchDirection.clone().set(.5,.5,.5).applyMatrix4(m);
          const lo=[Math.min(a.x,b.x),Math.min(a.y,b.y),Math.min(a.z,b.z)],hi=[Math.max(a.x,b.x),Math.max(a.y,b.y),Math.max(a.z,b.z)];
          if(Math.abs(lo[1])>.001||Math.abs(hi[1]-3.5)>.001)continue;
          if(wall)walls.push({lo,hi});else if(Math.min(hi[0]-lo[0],hi[2]-lo[2])<.2)frames.push({lo,hi});
        }
      });
      let overlaps=0;
      for(const frame of frames)for(const wall of walls)for(const axis of [0,2])for(const end of ['lo','hi']){
        if(Math.abs(frame[end][axis]-wall[end][axis])>.0001)continue;
        const along=axis===0?2:0;
        if(Math.min(frame.hi[along],wall.hi[along])-Math.max(frame.lo[along],wall.lo[along])>.02)overlaps++;
      }
      return {overlaps,frames:frames.length};
    });
    assert.ok(seamOverlaps.frames>0);assert.equal(seamOverlaps.overlaps,0,'full-height door frames must not share wall planes');
    await page.evaluate(()=>window.roofPose(9.5,4.5,Math.PI,.12));
    await page.screenshot({path:`/workspace/screenshots/outpost-battle-${label}-${device}-wall.png`});
    await page.evaluate(()=>window.roofPose(14.5,14.5,0,1.2));
    await page.screenshot({path:`/workspace/screenshots/outpost-battle-${label}-${device}-atrium.png`});
    await page.evaluate(()=>window.roofPose(8.5,6.5,0,.45));
    await page.screenshot({path:`/workspace/screenshots/outpost-roofs-${label}-${device}-doorway.png`});
    const daylight=await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine,r=g.military;
      const sample=()=>({sun:r.sun.intensity,sky:r.scene.backgroundIntensity,ambient:r.scene.environmentIntensity,
        exposure:r.renderer.toneMappingExposure,fog:r.scene.fog.color.getHex(),density:r.scene.fog.density,
        weapon:r.weaponScene.environmentIntensity,inside:r.naturalLighting.inside});
      window.roofPose(14.5,26.5,0,.2); const lit=sample();
      g.arena.protocol.sabotage.powerUntil=g.time+45;
      window.roofPose(14.5,26.5,0,.2); const dark=sample();
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
      window.roofPose(13.5,24.8,Math.PI/2,0);
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
    await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine,victim=g.arena.entities.find(e=>e.team===0&&e.hp>0);
      window.roofPose(3.5,5.5,0,0);Object.assign(victim,{x:3.9,y:5.5,name:'Rook <img src=x onerror=alert(1)>'});
      g.arena.privateFor(g.player).killReadyAt=0;g.protocolCache=null;g.military.frameProtocolArena=null;g.protocolUI.update(true);
    });
    const eliminate=page.locator('.mf-protocol-eliminate');
    if(mobile)await eliminate.tap();else await eliminate.click();
    const kill=await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine;g.update(.05);g.protocolCache=null;g.military.frameProtocolArena=null;g.protocolUI.update(true);g.render();
      return {role:g.protocolUI.view.protocol.self.role,kills:g.player.kills,visible:!g.protocolUI.killConfirmation.hidden,
        text:g.protocolUI.killConfirmation.textContent,injection:!!g.protocolUI.killConfirmation.querySelector('img')};
    });
    assert.equal(kill.role,'infiltrator');assert.equal(kill.kills,1);assert.equal(kill.visible,true);assert.equal(kill.injection,false);
    assert.ok(kill.text.includes('Elimination confirmed')&&kill.text.includes('Rook <img'));
    await page.screenshot({path:`/workspace/screenshots/outpost-battle-${label}-${device}-kill.png`});
    await page.waitForTimeout(2850);
    assert.equal(await page.evaluate(()=>{const g=document.querySelector('midnry-fps').engine;g.protocolUI.update(true);return g.protocolUI.killConfirmation.hidden;}),true);
    const opening=await page.evaluate(async()=>{
      const g=document.querySelector('midnry-fps').engine,{beginCombat}=await import('/games/outpost-protocol-combat.js');
      const target=g.arena.entities.find(e=>e.team===0&&e.hp>0);target.name='Accused operator';beginCombat(g.arena,target);
      g.protocolCache=null;g.military.frameProtocolArena=null;g.protocolUI.update(true);g.render();
      const cinematic=g.military.battlePreparation,actor=cinematic.actors[0];
      window.openingWeapon=actor.equipment.getWorldQuaternion(g.military.camera.quaternion.clone()).toArray();
      return {active:cinematic.active,visible:!g.protocolUI.preparation.hidden,count:cinematic.actors.length,
        label:g.protocolUI.preparation.textContent,ammo:g.player.ammo,at:g.time,camera:g.military.camera.position.toArray()};
    });
    assert.equal(opening.active,true);assert.equal(opening.visible,true);assert.equal(opening.count,2);
    assert.ok(opening.label.includes('ACCUSED')&&!/infiltrator|imposter/i.test(opening.label));
    const preparing=await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine;for(let i=0;i<40;i++)g.update(.05);
      g.protocolCache=null;g.military.frameProtocolArena=null;g.protocolUI.update(true);g.render();
      const scene=g.military.battlePreparation,weapon=scene.actors[0].equipment.getWorldQuaternion(g.military.camera.quaternion.clone()).toArray();
      scene.scene.updateMatrixWorld(true);scene.camera.updateMatrixWorld(true);
      let weaponEdge=0;
      for(const actor of scene.actors)actor.equipment.traverse(o=>{
        if(!o.isMesh)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
        const box=o.geometry.boundingBox;
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          const p=g.military.torchDirection.clone().set(x,y,z).applyMatrix4(o.matrixWorld).project(scene.camera);
          weaponEdge=Math.max(weaponEdge,Math.abs(p.x));
        }
      });
      return {active:scene.active,moved:weapon.some((v,i)=>Math.abs(v-window.openingWeapon[i])>.01),ammo:g.player.ammo,
        weaponEdge,actors:scene.actors.map(a=>{
          const wrist=a.grip.support.getWorldPosition(g.military.torchDirection.clone());
          const palm=a.grip.supportKnuckle.getWorldPosition(g.military.torchDirection.clone()).lerp(wrist,.5);
          return{ready:a.actions.Idle.getEffectiveWeight(),grip:!!a.grip,palmGap:palm.distanceTo(a.supportTarget),
            goggles:a.model.getObjectByName('Soldier_head_1')?.userData.gogglesPosition};
        }),text:g.protocolUI.preparation.textContent};
    });
    assert.equal(preparing.active,true);assert.equal(preparing.moved,true,'rifles rise from low ready');assert.equal(preparing.ammo,opening.ammo);
    assert.ok(preparing.actors.every(a=>a.ready===1&&a.grip&&a.palmGap<.02),'both supporting palms stay on the rifle');
    assert.ok(preparing.actors.every(a=>a.goggles==='eyes'),'both operators use the fitted eyewear asset');
    assert.ok(preparing.weaponEdge<1,`both preparation weapons must fit the screen: ${preparing.weaponEdge}`);
    await page.screenshot({path:`/workspace/screenshots/outpost-battle-${label}-${device}-prepare.png`});
    await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine,r=g.military,c=r.battlePreparation,a=c.actors[0];
      window.savedCanvasSize=[r.renderer.domElement.width/r.renderer.getPixelRatio(),r.renderer.domElement.height/r.renderer.getPixelRatio()];
      c.actors[1].root.visible=false;a.equipment.visible=false;g.protocolUI.preparation.hidden=true;
      const head=a.model.getObjectByName('Soldier_head_1');head.computeBoundingBox();
      const focus=head.boundingBox.getCenter(r.torchDirection.clone()).applyMatrix4(head.matrixWorld);
      c.camera.aspect=innerWidth/innerHeight;
      c.camera.position.set(focus.x,focus.y+.03,focus.z-(innerWidth<600?.95:.65));
      c.camera.lookAt(focus);c.camera.updateMatrixWorld(true);c.camera.updateProjectionMatrix();
      r.renderer.setSize(innerWidth,innerHeight,false);r.renderer.render(c.scene,c.camera);
    });
    await page.screenshot({path:`/workspace/screenshots/outpost-goggles-${label}-${device}-closeup.png`});
    await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine,r=g.military,c=r.battlePreparation;
      c.actors[1].root.visible=true;c.actors[0].equipment.visible=true;g.protocolUI.preparation.hidden=false;
      r.renderer.setSize(...window.savedCanvasSize,false);
    });
    const ready=await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine;
      for(let i=0;i<62;i++)g.update(.05);
      g.protocolCache=null;g.military.frameProtocolArena=null;g.protocolUI.update(true);g.render();
      return {active:g.military.battlePreparation.active,visible:!g.protocolUI.preparation.hidden,
        phase:g.arena.protocol.phase,camera:g.military.camera.position.toArray(),self:g.military.actors.get(g.selfId)?.root.visible||false};
    });
    assert.equal(ready.active,false);assert.equal(ready.visible,false);assert.equal(ready.phase,'combat');assert.equal(ready.self,false);
    await page.evaluate(()=>{const g=document.querySelector('midnry-fps').engine;g.arena.protocol.phase='roam';g.arena.protocol.combat=null;});
    // Aircraft bulkheads must also keep a roof while the cockpit retains its
    // genuine outward-facing windows. The phase transition is authoritative.
    const aircraft=await page.evaluate(()=>{
      const g=document.querySelector('midnry-fps').engine;
      for(const item of g.arena.protocol.mission.manifest)item.loaded=item.required;
      const loading=g.arena.protocol.mission.loading;
      const pilot=g.arena.entities.find(e=>e.team===0&&e.hp>0);
      Object.assign(pilot,{x:loading.x,y:loading.y});g.arena.departMission(pilot);
      window.roofPose(8.5,4.5,-Math.PI/2,.5);
      const r=g.military;
      return {map:g.arena.mapId,inside:r.naturalLighting.inside,roof:r.world.children.some(root=>root.children.some(m=>m.name==='Continuous interior roof'))};
    });
    assert.equal(aircraft.map,'medevac');assert.equal(aircraft.inside,true);assert.equal(aircraft.roof,true);
    await page.screenshot({path:`/workspace/screenshots/outpost-roofs-${label}-${device}-aircraft.png`});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({device,shell,seamOverlaps,daylight,movement,kill,opening,preparing,ready,aircraft,errors}));
    await page.close();
  }
} finally { await browser.close(); }
