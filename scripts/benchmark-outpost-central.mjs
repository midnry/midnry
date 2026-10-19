/** Matched room evidence; the fixture freezes simulation only inside QA.
 * Software-renderer counters are useful; its wall-clock timings are not FPS. */
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,existsSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const phase=process.argv[2]||'before',base=process.argv[3]||'http://127.0.0.1:8080';
assert.ok(['before','after'].includes(phase));
const folder='docs/graphics-benchmark/central-passage',shots='/workspace/screenshots/outpost-central-passage';
mkdirSync(folder,{recursive:true});mkdirSync(shots,{recursive:true});
const bundle=phase==='before'?'/tmp/outpost-central-baseline/outpost-military.js':'public/games/outpost-military.js';
const hash=createHash('sha256').update(readFileSync(bundle)).digest('hex');
const result={phase,seed:'outpost-corridor-20261019',rendererSHA256:hash,
  timingLimit:'Chromium SwiftShader software rendering; no device FPS or hardware GPU time claim',
  memoryScope:'Estimated unique uploaded managed source textures, RGBA plus mipmaps; excludes render targets, PMREM internals, depth/MSAA and driver allocations. Not total VRAM.',rows:[]};
const prior=existsSync(`${folder}/${phase}.json`)?JSON.parse(readFileSync(`${folder}/${phase}.json`)):null;
if(prior?.rendererSHA256===hash)result.rows=prior.rows;
const save=()=>writeFileSync(`${folder}/${phase}.json`,JSON.stringify(result,null,2)+'\n');
const roomViews=[
  {id:'central-west-day',x:11.7,y:11.1,a:-.11,pitch:.035},
  {id:'central-east-day',x:16.2,y:10.55,a:Math.PI-.10,pitch:.02},
  {id:'central-west-night',x:11.7,y:11.1,a:-.11,pitch:.035,night:true},
  {id:'central-east-night',x:16.2,y:10.55,a:Math.PI-.10,pitch:.02,night:true},
];
const fixedViews=[
  {id:'rations-approach',x:9.7,y:16.4,a:Math.PI/2,pitch:-.035},
  {id:'cold-storage-junction',x:9.7,y:22.4,a:-Math.PI/2,pitch:-.035},
  {id:'cold-storage-terminal',x:6.45,y:23.5,a:0,pitch:-.04},
  {id:'soldier',x:9.7,y:18.2,a:Math.PI/2,pitch:-.11},
  // The loading/patrol camera, with its original nearby soldier.
  {id:'patrol',x:3.5,y:5.5,a:0,pitch:0,patrol:true},
];
const contexts=[
  {id:'laptop',viewport:{width:1280,height:720},dpr:1,preset:'balanced',views:[...roomViews,...fixedViews]},
  {id:'phone',viewport:{width:390,height:844},dpr:2,preset:'balanced',mobile:true,views:roomViews},
  {id:'ipad',viewport:{width:1024,height:768},dpr:2,preset:'balanced',mobile:true,apple:true,views:[roomViews[0],roomViews[2],fixedViews[4]]},
  ...['balanced','high'].map(preset=>({id:'retina',viewport:{width:1280,height:720},dpr:2,preset,views:[
    {id:'central-sign-3m',target:'Central Passage',distance:3},
    {id:'central-sign-6m',target:'Central Passage',distance:6},
    {id:'station-label-3m',target:'station-label',distance:3},
    {id:'terminal-screen-3m',target:'terminal-screen',distance:3},
  ]})),
];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const config of contexts){
  if(process.env.OUTPOST_CENTRAL_DEVICE&&process.env.OUTPOST_CENTRAL_DEVICE!==config.id)continue;
  if(process.env.OUTPOST_CENTRAL_PRESET&&process.env.OUTPOST_CENTRAL_PRESET!==config.preset)continue;
  if(process.env.OUTPOST_CENTRAL_RESUME&&config.views.every(p=>result.rows.some(r=>r.device===config.id&&r.preset===config.preset&&r.id===p.id)))continue;
  const errors=[];
  const page=await browser.newPage({viewport:config.viewport,deviceScaleFactor:config.dpr,isMobile:!!config.mobile,hasTouch:!!config.mobile,
    reducedMotion:'reduce',...(config.apple?{userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}:{})});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await page.addInitScript(preset=>{
    localStorage.setItem('midnry-outpost-graphics',JSON.stringify({preset,options:{adaptive:false}}));
    localStorage.setItem('midnry-outpost-profile',JSON.stringify({matches:10}));
  },config.preset);
  if(phase==='before')for(const f of ['outpost-military.js','outpost-academy.js','outpost-zero.html'])
    await page.route('**/'+f+'*',r=>r.fulfill({path:'/tmp/outpost-central-baseline/'+f,contentType:f.endsWith('html')?'text/html':'text/javascript'}));
  await page.goto(base+'/games/outpost-zero.html',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>{const g=document.querySelector('midnry-fps')?.engine;return g?.militaryLoaded||g?.militaryLoadError;},null,{timeout:180000});
  const load=await page.evaluate(()=>{const g=document.querySelector('midnry-fps').engine;return {ready:g.militaryLoaded,error:g.militaryLoadError};});
  assert.ok(load.ready,'3D loading failed: '+JSON.stringify({load,errors}));
  await page.evaluate(async seed=>{
    const g=document.querySelector('midnry-fps').engine,{dailyRandom}=await import('./outpost-shifts.js');
    cancelAnimationFrame(g.frame);g.frame=0;g.lockMouse=()=>{};
    const rand=Math.random;try{Math.random=dailyRandom(seed);g.mode='protocol';g.rolePreference='operator';g.shift='full';g.modifier='radio-silence';g.reset();}finally{Math.random=rand;}
    g.start();for(const d of g.root.querySelectorAll('dialog[open]'))d.close();g.arena.time=30;
    for(const e of g.arena.entities){e.bot=false;if(e!==g.player)Object.assign(e,{x:21.5,y:7.5,a:0});}
    const actor=g.arena.entities.find(e=>e!==g.player);Object.assign(actor,{x:9.7,y:19.35,a:-Math.PI/2,color:'#a78bce'});window.centralActor=actor.id;
    for(const p of g.arena.protocol.mission.patients)p.decay=0;
    g.arena.protocol.events=[];g.arena.protocol.sabotage.powerUntil=0;
  },result.seed);
  for(const pose of config.views){
    const row=await page.evaluate(pose=>{
      const g=document.querySelector('midnry-fps').engine,r=g.military;
      const actor=g.arena.entities.find(e=>e.id===window.centralActor);
      Object.assign(actor,pose.patrol?{x:4.7,y:5.5,a:Math.PI}:{x:9.7,y:19.35,a:-Math.PI/2});
      let object,clip=null,camera={x:pose.x,y:pose.y,a:pose.a,pitch:pose.pitch},text=null;
      r.world.updateMatrixWorld(true);
      if(pose.target){
        if(pose.target.startsWith('station')||pose.target.startsWith('terminal')){
          const st=r.interactableInstances.find(v=>v.type==='station'&&v.id==='ammo-audit');
          object=pose.target==='terminal-screen'?st.screen:st.root.children.find(o=>o.geometry===r.geometries.get('protocol-label'));
        }else r.world.traverse(o=>{if(o.material?.map?.userData.worldText?.title===pose.target)object=o;});
        if(!object)throw Error('Missing world target '+pose.target);
        const center=object.getWorldPosition(object.position.clone()),normal=center.clone().set(0,0,1).applyQuaternion(object.getWorldQuaternion(object.quaternion.clone()));
        camera={x:(center.x+normal.x*pose.distance)/3,y:(center.z+normal.z*pose.distance)/3,a:Math.atan2(-normal.z,-normal.x),pitch:Math.atan2(center.y-1.65,pose.distance)};
        text=object.material.map?.userData.worldText||null;
      }
      if(g.level[Math.floor(camera.y)]?.[Math.floor(camera.x)]!==0)throw Error('Camera inside collision '+pose.id+' '+JSON.stringify(camera));
      Object.assign(g.player,{x:camera.x,y:camera.y,a:camera.a});g.lookPitch=camera.pitch;
      g.arena.protocol.match.modifier=pose.night?'night-shift':'radio-silence';
      g.protocolCache=null;r.frameProtocolArena=null;r.naturalLighting.initialized=false;
      const samples=[];
      for(let i=0;i<3;i++){r.lastRenderAt=performance.now()-16;r.lastShadowAt=0;if(r.worldVisibility)r.worldVisibility.dirty=true;g.protocolUI.update(true);g.render();samples.push({...r.renderer.info.render});}
      if(object){const rect=r.renderer.domElement.getBoundingClientRect(),pos=object.geometry.attributes.position,pts=[];
        for(let i=0;i<pos.count;i++)pts.push(object.position.clone().set(pos.getX(i),pos.getY(i),pos.getZ(i)).applyMatrix4(object.matrixWorld).project(r.camera));
        const xs=pts.map(p=>(p.x*.5+.5)*rect.width+rect.x),ys=pts.map(p=>(-.5*p.y+.5)*rect.height+rect.y);
        const x=Math.max(rect.x,Math.floor(Math.min(...xs)-80)),y=Math.max(rect.y,Math.floor(Math.min(...ys)-70));
        clip={x,y,width:Math.min(rect.right-x,Math.ceil(Math.max(...xs)-x+80)),height:Math.min(rect.bottom-y,Math.ceil(Math.max(...ys)-y+70))};
      }
      const ts=new Set(r.textures),seen=new Set();let bytes=0;
      for(const root of [r.scene,r.weaponScene])root?.traverse(o=>{for(const m of [].concat(o.material||[]))for(const t of Object.values(m||{}))if(t?.isTexture)ts.add(t);});
      for(const t of ts){const handle=r.renderer.properties.get(t).__webglTexture,im=t.image;if(!handle||seen.has(handle)||!im?.width)continue;seen.add(handle);bytes+=im.width*im.height*(t.type===1016?8:t.type===1015?16:4)*(t.generateMipmaps?4/3:1);}
      return {id:pose.id,camera,clip,distanceMetres:pose.distance||null,text,samples,calls:Math.max(...samples.map(s=>s.calls)),triangles:Math.max(...samples.map(s=>s.triangles)),
        textureObjects:r.renderer.info.memory.textures,sourceTextureBytesEstimate:Math.round(bytes),drawingBuffer:[r.renderer.domElement.width,r.renderer.domElement.height],
        bloom:r.bloom.enabled,font:r.worldTypography,assetErrors:r.assetErrors,centralRecords:r.centralPassagePresentation?.records.length||0};
    },pose);
    assert.deepEqual(row.assetErrors,[]);
    if(phase==='after'&&config.preset==='balanced'){assert.equal(row.bloom,false);assert.ok(row.calls<=520,`${config.id}/${pose.id} ${row.calls} calls >520`);}
    const image=`${phase}-${config.id}-${config.preset}-${pose.id}.png`;
    if(row.clip)await page.screenshot({path:shots+'/'+image,clip:row.clip,timeout:120000});
    else await page.locator('canvas.mf-webgl').screenshot({path:shots+'/'+image,timeout:120000});
    copyFileSync(shots+'/'+image,folder+'/'+image);
    result.rows=result.rows.filter(v=>!(v.device===config.id&&v.preset===config.preset&&v.id===pose.id));
    result.rows.push({device:config.id,preset:config.preset,dpr:config.dpr,image,...row});save();
    console.log(JSON.stringify({phase,device:config.id,preset:config.preset,id:pose.id,calls:row.calls,triangles:row.triangles,buffer:row.drawingBuffer}));
  }
  assert.deepEqual(errors,[]);await page.close();
}}finally{await browser.close();save();}
