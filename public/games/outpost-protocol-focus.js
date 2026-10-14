/** Compact mission chrome. Reads recipient-safe presentation; owns no match rules. */
export class ProtocolFocus {
  constructor(g, ui) {
    this.g = g;
    this.ui = ui;
    this.pausedOffline = false;
    this.style = document.createElement("style");
    this.style.textContent = `
      midnry-fps { -webkit-user-select:none;user-select:none;-webkit-touch-callout:none; }
      midnry-fps :is(input,textarea,[contenteditable="true"]) { -webkit-user-select:text;user-select:text;-webkit-touch-callout:default; }
      midnry-fps .mf-protocol-focus :is(.mf-kit,.mf-kitnotes,.mf-progresslabel,.mf-boot,.mf-difficulty,.mf-sprint,.mf-slide,.mf-movement) { display:none !important; }
      midnry-fps .mf-protocol-infoopen { position:absolute;z-index:7;top:calc(14px + var(--mf-safe-top));left:calc(14px + var(--mf-safe-left));min-height:44px;padding:10px 14px;border:1px solid #a5bba966;border-radius:14px;color:#f2f7ef;background:#12231dd9;font:700 13px system-ui;touch-action:manipulation; }
      midnry-fps .mf-protocol-infoopen:focus-visible { outline:3px solid #d6edae;outline-offset:3px; }
      midnry-fps .mf-protocol-info { width:min(560px,calc(100% - 28px));max-height:calc(100% - 28px); }
      midnry-fps .mf-protocol-info .mf-protocol-hud { position:static;width:auto;color:#eef4ed; }
      midnry-fps .mf-protocol-info .mf-protocol-role { width:100%; }
      midnry-fps .mf-protocol-info .mf-protocol-tasklist { max-height:none; }
      midnry-fps .mf-protocol-info .mf-protocol-tactics { position:static;width:auto;max-width:none;margin-top:14px; }
      midnry-fps .mf-protocol-infomap { display:block;width:min(280px,100%);height:auto;margin:12px auto;border-radius:12px; }
      midnry-fps .mf-protocol-infomapkey { margin:8px 0;font-size:12px; }
      midnry-fps .mf-protocol-info .mf-protocol-openactions { width:100%;min-height:44px;margin-top:12px;border:1px solid #8fa38b66;border-radius:10px;background:#263e2d;color:#eef5e8; }
      midnry-fps .mf-protocol-info .mf-protocol-openactions small { display:none; }
      midnry-fps .mf-protocol-focus .mf-protocol-context { width:min(250px,calc(100% - 170px));left:auto;right:calc(14px + var(--mf-safe-right));bottom:calc(var(--mf-action-height,48px) + 30px + var(--mf-safe-bottom));transform:none;padding:8px 11px;text-align:left;pointer-events:none; }
      midnry-fps .mf-protocol-focus .mf-protocol-context b { font-size:12px; }
      midnry-fps .mf-protocol-focus .mf-protocol-context p { display:none; }
      midnry-fps .mf-protocol-focus .mf-protocol-actions { right:calc(14px + var(--mf-safe-right));bottom:calc(18px + var(--mf-safe-bottom));display:flex;flex-direction:column;max-width:min(180px,calc(100% - 170px));gap:6px; }
      midnry-fps .mf-protocol-focus .mf-protocol-actions button { min-width:0;min-height:48px;padding:9px 12px;font-size:13px; }
      midnry-fps .mf-protocol-focus .mf-protocol-actions small { display:none; }
      midnry-fps .mf-protocol-focus .mf-protocol-flight { top:calc(70px + var(--mf-safe-top));bottom:auto;left:calc(14px + var(--mf-safe-left));transform:none;width:min(235px,calc(100% - 145px));padding:9px 11px;font-size:11px; }
      midnry-fps .mf-protocol-focus .mf-protocol-flight b { font-size:12px; }
      midnry-fps .mf-protocol-focus .mf-protocol-flight meter { height:7px; }
      midnry-fps .mf-protocol-focus .mf-protocol-flight .mf-protocol-stabilize { font-size:10px; }
      midnry-fps .mf-protocol-urgent { position:absolute;z-index:6;top:calc(70px + var(--mf-safe-top));left:50%;transform:translateX(-50%);max-width:calc(100% - 32px);padding:7px 12px;border:1px solid #dba67780;border-radius:10px;background:#38231feb;color:#ffe4cf;font:700 12px/1.3 system-ui;text-align:center;pointer-events:none; }
      midnry-fps .mf-protocol-piloting .mf-protocol-urgent { left:auto;right:14px;transform:none;width:125px; }
      @media(pointer:coarse),(max-width:700px) {
        midnry-fps .mf-protocol-focus .mf-brand,midnry-fps .mf-protocol-focus .mf-tag { display:none !important; }
        midnry-fps .mf-protocol-focus .mf-top { left:auto;right:calc(14px + var(--mf-safe-right));top:calc(14px + var(--mf-safe-top)); }
        midnry-fps .mf-protocol-focus .mf-protocol-context { max-width:220px; }
        midnry-fps .mf-protocol-focus .mf-stick { left:calc(18px + var(--mf-safe-left));bottom:calc(18px + var(--mf-safe-bottom));width:104px;height:104px; }
      }
      @media(min-width:701px) and (pointer:fine) {
        midnry-fps .mf-protocol-focus .mf-brand { margin-left:155px;font-size:14px; }
        midnry-fps .mf-protocol-focus .mf-brand small { display:none; }
      }
    `;
    g.shell.append(this.style);
    g.shell.classList.add("mf-protocol-focus");
    this.button = document.createElement("button");
    this.button.className = "mf-protocol-infoopen";
    this.button.textContent = "Info";
    this.button.hidden = true;
    this.button.setAttribute("aria-label", "Open mission information");
    this.button.setAttribute("aria-haspopup", "dialog");
    this.button.setAttribute("aria-expanded", "false");
    g.shell.append(this.button);
    this.info = ui.dialog("mf-protocol-info", "Mission information");
    this.info.innerHTML =
      '<div class="mf-protocol-dialoghead"><h2>Mission info</h2><button class="mf-protocol-infoclose">Done</button></div><p class="mf-protocol-infonote"></p><h3>Next objective</h3><p class="mf-protocol-infoobjective"></p>';
    this.info.append(ui.hud);
    this.radio=document.createElement('section');this.radio.className='mf-protocol-radio-controls';
    this.radio.innerHTML='<h3>Emergency radio</h3><button class="mf-protocol-callradio">Call emergency meeting</button><p class="mf-protocol-radiohint"></p>';
    this.info.append(this.radio);
    g.on(this.radio.querySelector('button'),'click',()=>ui.emergency());
    this.mapDetails = document.createElement("details");
    this.mapDetails.innerHTML =
      '<summary>Map & location</summary><canvas class="mf-protocol-infomap" width="280" height="280" aria-label="Mission map with your location" role="img"></canvas><p class="mf-protocol-infomapkey">The light marker is your location. Other players’ locations are hidden.</p>';
    this.info.append(this.mapDetails);
    this.tacticsButton = ui.actionBar.querySelector(".mf-protocol-openactions");
    this.info.append(this.tacticsButton, ui.tactics);
    this.urgent = document.createElement("div");
    this.urgent.className = "mf-protocol-urgent";
    this.urgent.hidden = true;
    this.urgent.setAttribute("role", "status");
    this.urgent.setAttribute("aria-live", "polite");
    g.shell.append(this.urgent);
    g.on(this.button, "click", () => this.open());
    g.on(window, "message", (event) => {
      if (
        event.origin === location.origin &&
        event.source === window.parent &&
        event.data?.type === "midnry-outpost-host-ready"
      )
        window.parent.postMessage(
          { type: "midnry-outpost-focus", active: this.lastGameplay === true },
          location.origin,
        );
    });
    g.on(this.info.querySelector(".mf-protocol-infoclose"), "click", () => this.info.close());
    g.on(this.info, "close", () => {
      this.button.setAttribute("aria-expanded", "false");
      if (
        this.pausedOffline &&
        g.state === "playing" &&
        g.$(".mf-modal").hidden &&
        g.militaryLoaded
      )
        g.running = true;
      this.pausedOffline = false;
      ui.resumeFocus();
    });
    g.on(
      this.info,
      "click",
      (event) => {
        if (event.target.closest(".mf-protocol-role")) this.info.close();
      },
      { capture: true },
    );
    g.on(ui.tactics, "click", (event) => {
      if (event.target.closest("button:not(:disabled)")) this.info.close();
    });
    const editable = (event) => event.target.closest?.('input,textarea,[contenteditable="true"]');
    // Pointer lock captures desktop clicks; I opens information and releases
    // the mouse before interacting with connection/voice settings.
    this.button.title = "Mission information (I)";
    g.on(
      window,
      "keydown",
      (event) => {
        if (event.code !== "KeyI" || event.repeat || editable(event)) return;
        if (this.info.open) {
          event.preventDefault();
          this.info.close();
        } else if (ui.visibleGameplay() && !ui.hasDialogOpen()) {
          event.preventDefault();
          this.open();
        }
      },
      { capture: true },
    );
    for (const type of ["selectstart", "contextmenu", "dragstart"])
      g.on(g.root, type, (event) => {
        if ((g.running || this.info.open) && !editable(event)) event.preventDefault();
      });
    g.on(g.root, "pointerdown", () => {
      g.missionPointerSerial = (g.missionPointerSerial || 0) + 1;
    }, { capture: true });
    // Completing a touch hold can reveal the menu beneath the finger. Keep
    // its synthesized click from activating a different menu control.
    g.on(
      g.root,
      "click",
      (event) => {
        if (
          (!g.$(".mf-modal").hidden || event.target.closest(".mf-protocol-actions")) &&
          performance.now() < (g.ignoreMissionTapUntil || 0) &&
          g.ignoreMissionTapSerial === g.missionPointerSerial &&
          event.detail > 0 &&
          event.pointerType !== "mouse"
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }

  open() {
    if (
      !this.ui.visibleGameplay() ||
      (this.ui.piloting && !this.ui.safeView()?.protocol.mission.vehicle.autopilot && !this.g.practice?.mission?.failed)
    )
      return;
    this.pausedOffline = !this.g.online && this.g.running;
    this.ui.releaseMouse();
    if (this.pausedOffline) this.g.running = false;
    this.info.querySelector(".mf-protocol-infonote").textContent = this.g.online
      ? "Online play continues. Patient vitals and aircraft safety keep advancing."
      : "The offline mission is paused while you read. Close this panel to continue.";
    this.info.showModal();
    this.button.setAttribute("aria-expanded", "true");
    this.ui.update(true);
    this.drawMap();
  }
  close(resume = false) {
    if (!resume) this.pausedOffline = false;
    if (this.info.open) this.info.close();
  }
  update(view, gameplay) {
    if (this.lastGameplay !== gameplay) {
      this.lastGameplay = gameplay;
      if (window.parent !== window)
        window.parent.postMessage(
          { type: "midnry-outpost-focus", active: gameplay },
          location.origin,
        );
    }
    this.button.hidden = !gameplay;
    const mission = view?.protocol?.mission;
    const p=view?.protocol,self=p?.self;
    this.radio.hidden=!self||!this.ui.alive();
    if(self){
      const wait=Math.ceil(Math.max(0,(p.emergencyReadyAt||0)-view.time));
      const unsafe=mission?.phase==='transport'&&!mission.vehicle.autopilot&&!mission.vehicle.arrived;
      const jammed=p.sabotage.commsUntil>view.time&&!this.ui.nearby?.emergency;
      this.radio.querySelector('button').disabled=self.emergenciesLeft<=0||wait>0||p.phase!=='roam'||unsafe;
      this.radio.querySelector('button').textContent=jammed?'Locate the wired emergency console':'Call emergency meeting';
      this.radio.querySelector('p').textContent=self.emergenciesLeft<=0?'Your emergency call has been used. You can still report nearby bodies.'
        :wait>0?`Radio assembly available in ${wait}s. Body reports remain available.`
          :unsafe?'Recover flight control before calling an assembly.'
            :jammed?'Communications are jammed. Follow the arrow to the wired console, or repair the radio.'
              :'C calls over radio from anywhere. You have one emergency call; nearby body reports use F or Report body.';
    }
    if (!gameplay || !mission) {
      this.urgent.hidden = true;
      this.close();
      return;
    }
    const loaded = mission.manifest.reduce((sum, item) => sum + item.loaded, 0);
    const actionCount = [...this.ui.actionBar.querySelectorAll("button")].filter(
      (button) => !button.hidden,
    ).length;
    if (this.actionCount !== actionCount) {
      this.actionCount = actionCount;
      this.g.shell.style.setProperty(
        "--mf-action-height",
        Math.max(48, actionCount * 48 + Math.max(0, actionCount - 1) * 6) + "px",
      );
    }
    const total = mission.manifest.reduce((sum, item) => sum + item.required, 0);
    this.button.textContent =
      view.protocol.phase === "combat"
        ? "Info · Fight"
        : mission.phase === "base"
          ? `Info · ${loaded}/${total}`
          : "Info · Flight";
    this.button.disabled =
      this.ui.piloting && !mission.vehicle.autopilot && !mission.vehicle.arrived;
    if (this.button.disabled && this.info.open) this.info.close();
    const warnings = [];
    if (p.phase === "combat" && p.combat) {
      const target = view.entities.find((e) => e.id === p.combat.targetId);
      warnings.push(
        view.time < p.combat.startsAt
          ? `Last Stand · starts in ${Math.ceil(p.combat.startsAt - view.time)}s`
          : `Last Stand · ${target?.name || "Accused"} · ${Math.max(0, Math.ceil(p.combat.endsAt - view.time))}s`,
      );
    } else if (
      !mission.vehicle.autopilot &&
      mission.phase === "transport" &&
      !mission.vehicle.arrived
    )
      warnings.push(
        mission.vehicle.underControl
          ? "Manual flight"
          : `Autopilot off · ${Math.max(0, Math.ceil((mission.vehicle.recoveryDeadline || view.time) - view.time))}s to recover`,
      );
    else if (p.detonateAt != null)
      warnings.push(`Base detonation · ${Math.max(0, Math.ceil(p.detonateAt - view.time))}s`);
    else if (mission.patients.some((patient) => patient.hp > 0 && patient.hp <= 25))
      warnings.push("Patients critical · deliver aid");
    else if (p.sabotage.powerUntil > view.time) warnings.push("Power down");
    else if (p.sabotage.commsUntil > view.time) warnings.push("Comms jammed");
    const warning = warnings.join(" · ");
    this.urgent.hidden = !warning;
    if (this.urgent.textContent !== warning) this.urgent.textContent = warning;
    if (this.info.open) {
      this.info.querySelector(".mf-protocol-infoobjective").textContent =
        `${this.ui.context.querySelector("b").textContent}. ${this.ui.context.querySelector("p").textContent}`;
      if (this.mapDetails.open && performance.now() - (this.mapAt || 0) > 500) this.drawMap();
    }
  }
  drawMap() {
    this.mapAt = performance.now();
    const canvas = this.info.querySelector("canvas"),
      c = canvas.getContext("2d"),
      map = this.ui.map(),
      s = canvas.width / map.level.length;
    c.fillStyle = "#14251e";
    c.fillRect(0, 0, canvas.width, canvas.height);
    map.level.forEach((row, y) =>
      row.forEach((tile, x) => {
        c.fillStyle = tile ? "#8b9e8b" : "#294035";
        c.fillRect(x * s, y * s, Math.max(1, s - 1), Math.max(1, s - 1));
      }),
    );
    c.fillStyle = "#f0ebc5";
    c.beginPath();
    c.arc(this.g.player.x * s, this.g.player.y * s, 4, 0, Math.PI * 2);
    c.fill();
    this.g.navigation?.drawMap(c, s);
  }
  dispose() {
    this.close();
    for (const node of [this.style, this.button, this.info, this.urgent]) node.remove();
    this.g.shell.classList.remove("mf-protocol-focus");
  }
}
