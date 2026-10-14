/** Real desktop/touch verification of identification, privacy and wayfinding. */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.argv[2]||'http://127.0.0.1:8080';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
mkdirSync('/workspace/screenshots',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const [name,width,height,mobile]of [['desktop',1280,800,false],['mobile',390,844,true]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('midnry-outpost-graphics',JSON.stringify({preset:'performance',options:{adaptive:false}})));
  await page.goto(base+'/games/outpost-zero.html');
  await page.waitForFunction(()=>document.querySelector('midnry-fps')?.engine?.militaryLoaded,null,{timeout:120000});
  const initial=await page.evaluate(()=>{
   const g=document.querySelector('midnry-fps').engine;cancelAnimationFrame(g.frame);g.frame=0;g.lockMouse=()=>{};g.start();g.protocolUI.brief.close();
   for(const e of g.arena.entities)e.bot=false;
   Object.assign(g.player,{x:3.5,y:5.5,a:0});
   const e=g.arena.entities[1];Object.assign(e,{x:4.5,y:5.5,a:Math.PI,name:'Sato <img onerror=alert(1)>'});
   g.protocolCache=null;g.military.frameProtocolArena=null;g.navigation.nextUpdate=0;g.protocolUI.update(true);g.render();
   const before=JSON.stringify(g.arena.snapshot());g.render();
   const bounds=g.navigation.line.getBoundingClientRect();
   let skinRoughness;g.military.soldier.scene.traverse(o=>{if(o.isMesh&&o.material.name==='Operator head 1')skinRoughness=o.material.roughness;});
   return{pure:before===JSON.stringify(g.arena.snapshot()),skinRoughness,gripped:!!g.military.actors.get(e.id).grip,names:[...document.querySelectorAll('.mf-playername:not([hidden])')].map(n=>n.textContent),injection:!!document.querySelector('.mf-playernames img'),goal:g.navigation.route.goal.id,route:g.navigation.route.path.length,rigged:g.military.soldier.scene.userData.riggedOperator,hands:!!g.military.rig.userData.carbine.userData.carbineParts.firingHand.userData.handRig,assets:g.military.assetErrors,overflow:document.documentElement.scrollWidth>innerWidth,navBounds:{x:bounds.x,y:bounds.y,right:bounds.right,bottom:bounds.bottom}};
  });
  assert.equal(initial.pure,true);assert.ok(initial.names.includes('Sato <img onerror=alert(1)>'));
  assert.equal(initial.injection,false);assert.ok(initial.goal.startsWith('collect:'));
  assert.ok(initial.route>0);assert.equal(initial.rigged,true);assert.equal(initial.hands,true);
  assert.equal(initial.gripped,true);
  assert.equal(initial.skinRoughness,.76);
  assert.deepEqual(initial.assets,[]);assert.equal(initial.overflow,false);
  assert.ok(initial.navBounds.x>=0&&initial.navBounds.right<=width&&initial.navBounds.bottom<=height);
  // Freeze only the simulation: matrix/pose/recipient caches are deliberately
  // invalidated when test fixtures teleport actors, as a real 30 Hz tick does.
  const sight=await page.evaluate(()=>{
   const g=document.querySelector('midnry-fps').engine,e=g.arena.entities[1],original={x:e.x,y:e.y,a:e.a},heading=g.player.a;
   const refresh=()=>{g.protocolCache=null;g.military.frameProtocolArena=null;g.protocolUI.update(true);g.render();return !g.military.identification.labels.get(e.id)?.hidden;};
   let blocked,far;
   for(let y=1;y<g.arena.level.length-1;y++)for(let x=1;x<g.arena.level[y].length-1;x++){
    const p={x:x+.5,y:y+.5},d=Math.hypot(p.x-g.player.x,p.y-g.player.y);
    if(g.arena.level[y][x]!==0)continue;
    if(d<6&&!g.arena.visible(g.player,p))blocked ||=p;
    if(d>3&&d<5.5&&g.arena.visible(g.player,p))far ||=p;
   }
   Object.assign(e,blocked);g.player.a=Math.atan2(e.y-g.player.y,e.x-g.player.x);const wall=refresh();
   Object.assign(e,far);g.player.a=Math.atan2(e.y-g.player.y,e.x-g.player.x);const lit=refresh();
   g.arena.protocol.sabotage.powerUntil=g.time+30;const blackout=refresh();
   g.arena.protocol.sabotage.powerUntil=0;Object.assign(e,original);g.player.a=heading;const restored=refresh();
   return{wall,lit,blackout,restored,fixtures:!!blocked&&!!far};
  });
  assert.equal(sight.fixtures,true);assert.equal(sight.wall,false);assert.equal(sight.lit,true);assert.equal(sight.blackout,false);assert.equal(sight.restored,true);
  await page.evaluate(()=>{const g=document.querySelector('midnry-fps').engine;g.arena.entities[1].name='Sato';g.protocolCache=null;g.military.frameProtocolArena=null;g.render();});
  await page.screenshot({path:`/workspace/screenshots/outpost-navigation-${name}.png`});
  if(mobile)await page.locator('.mf-protocol-infoopen').tap();else await page.locator('.mf-protocol-infoopen').click();
  await page.locator('.mf-navdetails summary').click();
  await page.evaluate(()=>document.querySelector('midnry-fps').engine.render());
  assert.equal(await page.locator('.mf-playernames').isVisible(),false);
  const select=page.locator('.mf-navdetails select'),values=await select.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));
  assert.ok(values.length>3);await select.selectOption(values.at(-1));
  await page.locator('.mf-namesetting input').uncheck();
  assert.equal(await page.evaluate(()=>localStorage.getItem('midnry-outpost-names')),'off');
  await page.screenshot({path:`/workspace/screenshots/outpost-navigation-info-${name}.png`});
  await page.locator('.mf-protocol-infoclose').click();
  await page.evaluate(()=>{const g=document.querySelector('midnry-fps').engine;g.protocolUI.update(true);g.render();});
  assert.equal(await page.locator('.mf-playernames').isVisible(),false);
  const pin=await page.evaluate(()=>document.querySelector('midnry-fps').engine.navigation.route.goal.id);
  assert.equal(pin,values.at(-1));
  const repair=await page.evaluate(()=>{
   const g=document.querySelector('midnry-fps').engine;g.arena.protocol.sabotage.powerUntil=g.time+30;g.protocolCache=null;g.military.frameProtocolArena=null;g.protocolUI.update(true);g.render();
   return{goal:g.navigation.route.goal.id,label:g.navigation.label.textContent,pin:g.navigation.pinned};
  });
  assert.ok(repair.goal.startsWith('repair:'));assert.equal(repair.label,'Restore power');assert.equal(repair.pin,pin);
  await page.screenshot({path:`/workspace/screenshots/outpost-navigation-repair-${name}.png`});
  const charge=await page.evaluate(()=>{
   const g=document.querySelector('midnry-fps').engine,p=g.arena.protocol;
   p.sabotage.powerUntil=0;p.bombs.push({id:'hidden-charge',x:24.5,y:24.5,room:'hangar'});p.detonateAt=g.time+120;
   const refresh=()=>{g.protocolCache=null;g.military.frameProtocolArena=null;g.navigation.nextUpdate=0;g.protocolUI.update(true);g.render();};refresh();
   const hidden={goal:g.navigation.route?.goal.id||null,line:g.navigation.line.hidden};
   g.arena.privateFor(g.player).discoveredBombs.push('hidden-charge');refresh();
   const found=g.navigation.route?.goal.id;g.player.hp=0;refresh();
   return{hidden,found,dead:g.navigation.line.hidden};
  });
  assert.equal(charge.hidden.goal,null);assert.equal(charge.hidden.line,true);assert.equal(charge.found,'defuse:hidden-charge');assert.equal(charge.dead,true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({name,identification:'visible only; plain text; toggle persists',navigation:'corridor route; manual target; urgent repair; hidden charge privacy',mobileHUD:'within viewport',riggedHands:'loaded',errors}));
  await page.close();
 }
}finally{await browser.close();}
