import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:8080';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 for (const mobile of [false,true]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/games/outpost-zero.html');
  await page.waitForFunction(()=>document.querySelector('midnry-fps')?.engine?.militaryLoaded,null,{timeout:60000});
  await page.evaluate(()=>{const g=document.querySelector('midnry-fps').engine;cancelAnimationFrame(g.frame);g.lockMouse=()=>{};});
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const fov=page.getByRole('spinbutton',{name:'Field of view value',exact:true});
  assert.equal(await fov.inputValue(),'100');
  await fov.fill('110');await fov.dispatchEvent('change');
  const sensitivity=page.getByRole('spinbutton',{name:'Mouse sensitivity value',exact:true});
  await sensitivity.fill('1.5');await sensitivity.dispatchEvent('change');
  await page.getByRole('checkbox',{name:'Invert vertical look',exact:true}).check();
  await page.evaluate(()=>{
   const g=document.querySelector('midnry-fps').engine;
   if(g.aimSettings.values.fov!==110||g.aimSettings.values.sensitivity!==1.5||!g.aimSettings.values.invert)throw Error('Settings did not apply');
   g.player.a=0;g.lookPitch=0;g.applyLook(100,100);const a=g.player.a,p=g.lookPitch;
   if(Math.abs(a-p)>1e-9)throw Error('Axes differ');
   g.academy.options.width=480;g.resize();g.player.a=0;g.lookPitch=0;g.applyLook(100,100);
   if(Math.abs(g.player.a-a)>1e-9||Math.abs(g.lookPitch-p)>1e-9)throw Error('Resolution changed aim');
   const angle=g.lookPitch;g.aimSettings.values.fov=75;g.resize();if(g.lookPitch!==angle)throw Error('FOV changed aim angle');
   g.aimSettings.values.fov=110;g.resize();g.render();
   if(Math.abs(g.military.camera.fov-g.verticalFov*180/Math.PI)>1e-6)throw Error('Projection mismatch');
   g.applyLook(0,1e6);if(Math.abs(g.lookPitch-75*Math.PI/180)>1e-9)throw Error('Pitch limit mismatch');
   g.player.a=0;g.lookPitch=0;
  });
  await page.evaluate(()=>{const g=document.querySelector("midnry-fps").engine;g.$(".mf-settingsbody").scrollTop=0;g.$(".mf-settings").scrollTop=0;});
  await page.screenshot({path:`/workspace/screenshots/outpost-aim-settings-${mobile?'mobile':'desktop'}.png`});
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('button',{name:'START SOLO',exact:false}).click();
  await page.evaluate(()=>{const g=document.querySelector('midnry-fps').engine;g.applyLook(300,-50);g.render();});
  await page.screenshot({path:`/workspace/screenshots/outpost-aim-play-${mobile?'mobile':'desktop'}.png`});
  await page.reload();await page.waitForFunction(()=>document.querySelector('midnry-fps')?.engine?.militaryLoaded,null,{timeout:60000});
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  assert.equal(await sensitivity.inputValue(),'1.5');assert.equal(await fov.inputValue(),'110');
  await page.getByRole('button',{name:'Reset camera & aim',exact:true}).click();
  assert.equal(await sensitivity.inputValue(),'2');assert.equal(await fov.inputValue(),'100');
  assert.equal(await page.getByRole('checkbox',{name:'Invert vertical look',exact:true}).isChecked(),false);
  assert.deepEqual(errors,[]);await page.close();
 }
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/games/outpost-zero.html?renderer=classic');await page.waitForFunction(()=>document.querySelector('midnry-fps')?.engine?.loading===false);
 await page.evaluate(()=>{const g=document.querySelector('midnry-fps').engine;cancelAnimationFrame(g.frame);g.lockMouse=()=>{};g.start();for(const fov of [75,100,120]){g.aimSettings.values.fov=fov;g.resize();for(const dy of [-10000,10000]){g.applyLook(0,dy);g.render();}}});
 assert.deepEqual(errors,[]);await page.close();
 console.log('Desktop/mobile settings, saved preferences, reset, equal-axis aim, resolution independence, pitch limits, shared FOV and classic fallback passed.');
} finally {await browser.close();}
