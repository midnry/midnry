/** Real HTTP + WebSocket + WebRTC integration, with browser-owned fake audio.
 * No private credentials/audio are written to logs or external services. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const sessions = [],
  sockets = [],
  pages = [],
  errors = [];
async function nativeClick(page, selector) {
  const element = page.locator(selector);
  await element.evaluate(e => e.scrollIntoView({block:"center",behavior:"instant"}));
  await page.waitForFunction(() => !document.pointerLockElement);
  const rect = await element.boundingBox();
  assert.ok(rect, `Missing native click target: ${selector}`);
  await page.mouse.click(rect.x+rect.width/2, rect.y+rect.height/2);
}
async function post(body) {
  const r = await fetch(base + "/api/games/outpost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error);
  return data;
}
async function connect(s) {
  const ws = new WebSocket(base.replace(/^http/, "ws") + "/api/games/outpost/socket");
  const stub = { ws, room: null, seq: 0, packets: 0 };
  sockets.push(stub);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("Socket auth timeout")), 10000);
    ws.onopen = () =>
      ws.send(JSON.stringify({ type: "hello", code: s.code, id: s.id, token: s.token }));
    ws.onmessage = (e) => {
      const p = JSON.parse(e.data);
      if (p.type === "ready" || p.type === "state") {
        stub.room = p.room;
        stub.packets++;
        if (p.type === "ready") {
          clearTimeout(timer);
          resolve();
        }
      }
      if (p.type === "error") reject(Error(p.message));
    };
    ws.onerror = () => reject(Error("Socket failed"));
  });
  stub.heartbeat = setInterval(() => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: "ping", at: 0 }));
  }, 3000);
  return stub;
}
function input(stub, input) {
  stub.ws.send(JSON.stringify({ type: "input", seq: ++stub.seq, input }));
}
async function waitFor(fn, ms = 10000) {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw Error("Condition timeout");
    await pause(50);
  }
}
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});
try {
  const host = await post({ op: "create", mode: "protocol" });
  sessions.push(host);
  for (let i = 0; i < 7; i++) sessions.push(await post({ op: "join", code: host.code }));
  for (const s of sessions) await connect(s);
  console.log("Eight real socket seats connected");
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1000, height: 700 },
      hasTouch: mobile,
      isMobile: mobile,
      permissions: ["microphone"],
    });
    const page = await context.newPage();
    pages.push(page);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "performance", options: { adaptive: false, width: 480 } }),
      );
      const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      window.captureRequests = 0;
      navigator.mediaDevices.getUserMedia = (options) => {
        window.captureRequests++;
        return capture(options);
      };
    });
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 90000 },
    );
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
    });
    console.log(mobile ? "Mobile scene loaded" : "Desktop scene loaded");
  }
  sockets[0].ws.send(JSON.stringify({ type: "action", requestId: 1, body: { op: "start" } }));
  await waitFor(() => sockets.every((s) => s.room.arena));
  const chosen = sessions
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => i > 0 && sockets[i].room.arena.protocol.self.role === "operator")
    .slice(0, 2);
  assert.equal(chosen.length, 2);
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i],
      session = chosen[i].s;
    await p.evaluate(
      (s) => document.querySelector("midnry-fps").engine.connectOnline("resume", s),
      session,
    );
    await p.waitForFunction(() => document.querySelector("midnry-fps").engine.transport.ready);
    await p.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.protocolUI.update(true);
    });
    await p.locator(".mf-protocol-begin").click();
    await p.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.protocolUI.update(true);
      g.render();
    });
    if (i === 0) {
      await p.keyboard.press("i");
      await p.waitForFunction(() => !document.pointerLockElement);
    } else await p.getByRole("button", { name: "Open mission information", exact: true }).click();
    await nativeClick(p,".mf-voice summary");
    await nativeClick(p,".mf-voicejoin");
    console.log("Browser seat resumed; listening without capture");
    assert.equal(await p.evaluate(() => window.captureRequests), 0, "joining only listens");
  }
  // Denied permission stays nonblocking; the next explicit gesture may retry.
  await pages[1].evaluate(() => {
    window.originalCapture = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("denied", "NotAllowedError"));
  });
  await nativeClick(pages[1],".mf-voicemic");
  await pages[1].waitForFunction(() =>
    document.querySelector(".mf-voicestatus").textContent.includes("not granted"),
  );
  assert.equal(
    await pages[1].evaluate(() => document.querySelector("midnry-fps").engine.transport.ready),
    true,
  );
  await pages[1].evaluate(() => (navigator.mediaDevices.getUserMedia = window.originalCapture));
  for (const p of pages) {
    await nativeClick(p,".mf-voicemic");
    await p.waitForFunction(() => !!document.querySelector("midnry-fps").engine.voice.stream);
    assert.equal(
      await p.evaluate(
        () => document.querySelector("midnry-fps").engine.voice.stream.getAudioTracks()[0].enabled,
      ),
      false,
    );
  }
  // The real host walks to the operations console and calls an assembly.
  for (const [x, y] of [
    [6.5, 5.5],
    [6.5, 6.5],
  ]) {
    const end = Date.now() + 6000;
    for (;;) {
      const e = sockets[0].room.arena.entities.find((e) => e.id === host.id);
      if (Math.hypot(e.x - x, e.y - y) < 0.12) break;
      if (Date.now() > end) throw Error("Host could not reach console");
      input(sockets[0], { forward: 1, aim: Math.atan2(y - e.y, x - e.x) });
      await pause(50);
    }
    input(sockets[0], { forward: 0 });
  }
  input(sockets[0], { protocolAction: { op: "meeting", seq: 1 } });
  await waitFor(() => sockets[0].room.arena.protocol.phase === "discussion");
  console.log("Server-authorized meeting voice");
  for (const p of pages)
    await p.waitForFunction(
      () => document.querySelector("midnry-fps").engine.voice.peers.size === 1,
      null,
      { timeout: 10000 },
    );
  for (const p of pages)
    await p.evaluate(() => document.querySelector("midnry-fps").engine.protocolUI.update(true));
  await pages[0].locator(".mf-protocol-meetingmenu").evaluate((e) => e.focus());
  await pages[0].waitForFunction(
    () => {
      const v = document.querySelector("midnry-fps").engine.voice;
      return v.captureNode && [...v.peers.values()].every((p) => p.pc?.remoteDescription || !p.pc);
    },
    null,
    { timeout: 10000 },
  );
  await pages[0].keyboard.down("v");
  assert.equal(
    await pages[0].evaluate(
      () => document.querySelector("midnry-fps").engine.voice.stream.getAudioTracks()[0].enabled,
    ),
    true,
  );
  await pause(1000);
  await pages[0].keyboard.up("v");
  const received = await pages[1].evaluate(async () => {
    let bytes = document.querySelector("midnry-fps").engine.voice.receivedFrames * 2560 || 0;
    for (const p of document.querySelector("midnry-fps").engine.voice.peers.values())
      for (const s of (await p.pc.getStats()).values())
        if (s.type === "inbound-rtp" && s.kind === "audio") bytes += s.bytesReceived || 0;
    return bytes;
  });
  assert.ok(received > 0, "real direct or relayed voice samples arrived");
  assert.equal(
    await pages[0].evaluate(
      () => document.querySelector("midnry-fps").engine.voice.stream.getAudioTracks()[0].enabled,
    ),
    false,
  );
  const mic = await pages[1].locator(".mf-talk-radio").boundingBox();
  assert.ok(mic && mic.width >= 44 && mic.height >= 44);
  const touch = await pages[1].context().newCDPSession(pages[1]);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: mic.x + mic.width / 2, y: mic.y + mic.height / 2 }],
  });
  assert.equal(
    await pages[1].evaluate(
      () => document.querySelector("midnry-fps").engine.voice.stream.getAudioTracks()[0].enabled,
    ),
    true,
  );
  await pause(400);
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert.equal(
    await pages[1].evaluate(
      () => document.querySelector("midnry-fps").engine.voice.stream.getAudioTracks()[0].enabled,
    ),
    false,
  );
  await pages[0].locator(".mf-protocol-chatform input").focus();
  await pages[0].keyboard.press("v");
  assert.equal(
    await pages[0].evaluate(
      () => document.querySelector("midnry-fps").engine.voice.stream.getAudioTracks()[0].enabled,
    ),
    false,
  );
  // Reconnect retains the capability, identity, private role and existing seat.
  const before = await pages[0].evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    return { id: g.selfId, role: g.protocolView().protocol.self.role, hp: g.player.hp };
  });
  await pages[0].evaluate(() =>
    document.querySelector("midnry-fps").engine.transport.socket.close(),
  );
  await pages[0].waitForFunction(
    () => !document.querySelector("midnry-fps").engine.transport.ready,
  );
  await pages[0].waitForFunction(
    () => document.querySelector("midnry-fps").engine.transport.ready,
    null,
    { timeout: 12000 },
  );
  const after = await pages[0].evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    return { id: g.selfId, role: g.protocolView().protocol.self.role, hp: g.player.hp };
  });
  assert.deepEqual(after, before);
  assert.equal(
    await pages[0].evaluate(
      () => document.querySelector("midnry-fps").engine.online.members.length,
    ),
    8,
  );
  // Explicit room exit stops capture, closes peers, and clears tab credentials.
  for (const p of pages) {
    assert.equal(
      await p.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine,
          track = g.voice.stream.getAudioTracks()[0];
        g.leaveOnline();
        return (
          track.readyState === "ended" &&
          g.voice.peers.size === 0 &&
          !sessionStorage.getItem("midnry-outpost-session-v1")
        );
      }),
      true,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      websocket: "20 Hz live rooms",
      desktopAndMobile: "passed",
      voice: "real audio packets received",
      listenOnly: "passed",
      deniedMicrophone: "nonblocking",
      pushToTalk: "passed",
      reconnect: "same identity and role",
      exit: "capture stopped",
      errors,
    }),
  );
} catch (error) {
  for (let i = 0; i < pages.length; i++) {
    console.log(
      await pages[i]
        .evaluate(() => {
          const v = document.querySelector("midnry-fps").engine.voice;
          return {
            voiceStatus: v.status.textContent,
            enabled: v.enabled,
            allowed: v.allowed.size,
            peers: [...v.peers.values()].map((p) => ({
              state: p.pc?.connectionState,
              ice: p.pc.iceConnectionState,
              gather: p.pc.iceGatheringState,
              signal: p.pc.signalingState,
              local: !!p.pc.localDescription,
              remote: !!p.pc.remoteDescription,
              candidates: p.candidates.length,
            })),
          };
        })
        .catch(() => ({})),
    );
    await pages[i]
      .screenshot({ path: `/workspace/screenshots/outpost-realtime-debug-${i}.png` })
      .catch(() => {});
    console.log(
      await pages[i]
        .evaluate(() =>
          [
            ".mf-protocol-info",
            ".mf-navdetails summary",
            ".mf-liveconnection summary",
            ".mf-voice summary",
          ].map((selector) => {
            const e = document.querySelector(selector),
              r = e.getBoundingClientRect();
            return {
              selector,
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              scroll: e.scrollTop,
            };
          }),
        )
        .catch(() => []),
    );
  }
  throw error;
} finally {
  for (const s of sockets) {
    clearInterval(s.heartbeat);
    s.ws.close();
  }
  await browser.close();
  for (const s of sessions)
    await post({ op: "leave", code: s.code, id: s.id, token: s.token }).catch(() => {});
}
