/** Blackout-only play, clear mobile view, usable information and editable inputs. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname));
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--enable-unsafe-swiftshader"] });
try {
  for (const [name, width, height, mobile] of [["portrait",390,844,true],["landscape",844,390,true],["tablet",1024,768,true],["desktop",1280,800,false]]) {
    const page = await browser.newPage({ viewport: { width,height }, isMobile: mobile, hasTouch: mobile, ignoreHTTPSErrors:true });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset:"performance", options:{adaptive:false} })));
    await page.goto(base+"/games/outpost-zero", {waitUntil:"domcontentloaded"});
    const iframe = await page.waitForSelector('iframe[src*="outpost-zero.html"]'), frame = await iframe.contentFrame();
    await frame.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, {timeout:90000});
    await frame.evaluate(() => { const g=document.querySelector("midnry-fps").engine; cancelAnimationFrame(g.frame);g.frame=0;g.lockMouse=()=>{}; });
    assert.equal(await frame.locator("[data-mode]").count(),0);
    assert.equal(await frame.locator("[data-play]").count(),2);
    assert.equal(await frame.locator(".mf-offlinechoice").getAttribute("aria-pressed"),"true");
    assert.equal(await frame.locator(".mf-network").isVisible(),false);
    await page.screenshot({path:`/workspace/screenshots/outpost-focus-menu-${name}.png`});
    await frame.locator(".mf-start").click();
    await frame.locator(".mf-protocol-begin").click();
    await frame.evaluate(() => { const g=document.querySelector("midnry-fps").engine;g.protocolUI.update(true);g.render(); });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('nav[aria-label="Game navigation"]')).display==="none");
    const view = await frame.evaluate(() => {
      const g=document.querySelector("midnry-fps").engine,u=g.protocolUI;
      const rects=[u.focus.button,g.$(".mf-pause"),g.$(".mf-stick"),u.context,...u.actionBar.querySelectorAll("button"),u.flight,u.flightPad,u.focus.urgent].filter(e=>e.checkVisibility()).map(e=>e.getBoundingClientRect());
      const area=rects.reduce((sum,r)=>sum+r.width*r.height,0)/(innerWidth*innerHeight);
      return {mode:g.mode, bots:g.arena.entities.filter(e=>e.bot).length, assets:g.military.assetErrors,
        details:u.focus.info.open, selection:getComputedStyle(g.root).userSelect,
        sprintVisible:g.$(".mf-sprint").checkVisibility(),slideVisible:g.$(".mf-slide").checkVisibility(),
        hudVisible:u.hud.checkVisibility(), area, rects:rects.map(r=>({x:r.x,y:r.y,w:r.width,h:r.height})),
        pure:(()=>{const before=JSON.stringify(g.arena.snapshot());g.render();return before===JSON.stringify(g.arena.snapshot());})()};
    });
    assert.equal(view.mode,"protocol");assert.equal(view.bots,7);assert.deepEqual(view.assets,[]);
    assert.equal(view.selection,"none");assert.equal(view.hudVisible,false);assert.equal(view.sprintVisible,false);assert.equal(view.slideVisible,false);
    assert.ok(view.area<.23,`${name} essential controls leave most of the scene visible: ${view.area}`);
    for(const r of view.rects)assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.w<=width+1&&r.y+r.h<=height+1,`${name} control stays in view`);
    assert.equal(view.pure,true);
    await page.screenshot({path:`/workspace/screenshots/outpost-focus-play-${name}.png`});
    await frame.locator(".mf-protocol-infoopen").click();
    assert.equal(await frame.locator(".mf-protocol-info").isVisible(),true);
    assert.equal(await frame.locator(".mf-protocol-hud").isVisible(),true);
    const paused=await frame.evaluate(()=>{
      const g=document.querySelector("midnry-fps").engine;g.keys.add("w");
      const target=g.$(".mf-protocol-infoobjective"),event=new Event("selectstart",{bubbles:true,cancelable:true});target.dispatchEvent(event);
      return {running:g.running,paused:g.protocolUI.focus.pausedOffline,forward:g.controls().forward,selected:event.defaultPrevented,copy:target.textContent};
    });
    assert.equal(paused.running,false);assert.equal(paused.paused,true);assert.equal(paused.forward,0);assert.equal(paused.selected,true);assert.ok(paused.copy.length>20);
    await page.screenshot({path:`/workspace/screenshots/outpost-focus-info-${name}.png`});
    await frame.locator(".mf-protocol-infoclose").click();
    await frame.waitForFunction(()=>document.querySelector("midnry-fps").engine.running, null, {timeout:5000});
    assert.equal(await frame.evaluate(()=>document.querySelector("midnry-fps").engine.running),true);
    await frame.locator(".mf-pause").click();
    await frame.locator(".mf-onlinechoice").click();
    assert.equal(await frame.locator(".mf-network").isVisible(),true);
    assert.equal(await frame.locator(".mf-start").isDisabled(),true);
    await frame.locator(".mf-codeinput").fill("ABC123");
    assert.equal(await frame.locator(".mf-codeinput").inputValue(),"ABC123");
    assert.equal(await frame.locator(".mf-codeinput").evaluate(e=>getComputedStyle(e).userSelect),"text");
    await frame.locator(".mf-offlinechoice").click();
    assert.equal(await frame.locator(".mf-start").isDisabled(),false);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({name,blackoutOnly:"passed",smartBots:view.bots,visibleScene:Math.round((1-view.area)*100)+"%",infoPanel:"passed",textSelection:"blocked",inputs:"editable",errors}));
    await page.close();
  }
} finally { await browser.close(); }
