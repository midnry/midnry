import { voicePosition, encodeVoiceFrame, decodeVoiceFrame } from "./outpost-spatial-audio.js";
/** Small peer mesh with server-authorized proximity/meeting signalling.
 * Joining only listens. Capture starts after an explicit microphone gesture;
 * transmit is push-to-talk, and death/blur/disconnect mute immediately. */
export class ProximityVoice {
  constructor(g) {
    this.g = g;
    this.enabled = false;
    this.peers = new Map();
    this.allowed = new Set();
    this.waiting = [];
    this.volume = 0.7;
    this.iceServers = [];
    this.style = document.createElement("style");
    this.style.textContent = `
   midnry-fps .mf-voice{margin:12px 0}midnry-fps .mf-voice button{min-height:44px;margin:8px 8px 8px 0;padding:9px 14px;border-radius:12px;background:#21372b;color:#edf5eb;border:1px solid #9bac9266}
   midnry-fps .mf-talk{position:absolute;z-index:7;right:calc(16px + var(--mf-safe-right));top:calc(66px + var(--mf-safe-top));width:44px;height:44px;min-height:44px;border-radius:50%;border:1px solid #a8b99c;background:#12231de8;color:#eaf4e6;font:700 12px var(--mf-body);touch-action:none}
   midnry-fps .mf-talk[hidden]{display:none}midnry-fps .mf-talk[aria-pressed="true"]{background:#35553b;box-shadow:0 0 0 3px #b0d28d77}
   midnry-fps .mf-voice p{font-size:12px;color:#c3ceb8;line-height:1.5}midnry-fps .mf-voice input{width:100%;min-height:44px}
  `;
    this.panel = document.createElement("details");
    this.panel.className = "mf-voice";
    this.panel.innerHTML =
      '<summary>Nearby voice</summary><p>Hear nearby operators. During a meeting, living players share radio audio. Joining starts listening; your microphone stays off until you enable it and hold to speak. Eliminated players cannot transmit or receive voice.</p><button class="mf-voicejoin">Join voice</button><button class="mf-voicemic" disabled>Enable microphone</button><label>Voice volume<input type="range" min="0" max="100" value="70" aria-label="Voice volume"></label><p class="mf-voicestatus" role="status">Available in an online room.</p>';
    this.join = this.panel.querySelector(".mf-voicejoin");
    this.mic = this.panel.querySelector(".mf-voicemic");
    this.status = this.panel.querySelector(".mf-voicestatus");
    this.button = document.createElement("button");
    this.button.className = "mf-talk";
    this.button.hidden = true;
    this.button.textContent = "MIC";
    this.button.setAttribute("aria-label", "Hold to speak");
    this.button.setAttribute("aria-pressed", "false");
    this.button.title = "Hold V or this button to speak";
    this.radioButton = this.button.cloneNode(true);
    this.radioButton.className = "mf-talk-radio";
    this.g.protocolUI.meeting.querySelector(".mf-protocol-dialoghead").append(this.radioButton);
    g.shell.append(this.style, this.button);
    g.protocolUI.focus.info.append(this.panel);
    g.on(this.join, "click", () => (this.enabled ? this.leave() : this.listen()));
    g.on(this.mic, "click", () => (this.stream ? this.releaseMicrophone() : void this.capture()));
    g.on(this.panel.querySelector("input"), "input", (e) => {
      this.volume = Number(e.target.value) / 100;
      this.sync();
    });
    for (const button of [this.button, this.radioButton])
      g.on(button, "pointerdown", (e) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.talk(true);
      });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      for (const button of [this.button, this.radioButton])
        g.on(button, event, () => this.talk(false));
    g.on(
      window,
      "keydown",
      (e) => {
        if (e.code === "KeyV" && !e.target.closest?.("input,textarea,select,[contenteditable]")) {
          e.preventDefault();
          this.talk(true);
        }
      },
      { capture: true },
    );
    g.on(
      window,
      "keyup",
      (e) => {
        if (e.code === "KeyV") this.talk(false);
      },
      { capture: true },
    );
    for (const event of ["keydown", "keyup"])
      for (const button of [this.button, this.radioButton])
        g.on(button, event, (e) => {
          if ([" ", "Enter"].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            this.talk(event === "keydown");
          }
        });
    g.on(window, "blur", () => this.talk(false));
    g.on(document, "visibilitychange", () => {
      if (document.hidden) this.talk(false);
    });
  }
  living() {
    const g = this.g;
    return (
      !!g.online &&
      g.online.phase === "playing" &&
      g.player.hp > 0 &&
      !g.player.departed &&
      !g.deathSequence
    );
  }
  message(text, warning = false) {
    if (warning) {
      this.note = text;
      this.noteUntil = performance.now() + 8000;
    }
    if (this.status.textContent !== text) this.status.textContent = text;
  }
  listen() {
    if (!this.g.transport.ready) {
      this.message("Connect to an online room first. Text radio remains available.");
      return;
    }
    if (!globalThis.RTCPeerConnection && !globalThis.AudioWorkletNode) {
      this.message("Voice is unavailable in this browser. Text radio remains available.");
      return;
    }
    this.g.retention.audio.unlock();
    this.enabled = true;
    this.join.textContent = "Leave voice";
    this.g.transport.send({ type: "voice", enabled: true });
    this.sync();
  }
  async capture() {
    if (!this.enabled || !this.living() || this.stream) return;
    this.mic.disabled = true;
    this.noteUntil = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      if (!this.enabled || !this.living() || this.g.abort.signal.aborted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const track = stream.getAudioTracks()[0];
      track.enabled = false;
      await Promise.allSettled([...this.peers.values()].map((p) => p.sender?.replaceTrack(track)));
      this.g.on(track, "ended", () => {
        this.stream = null;
        this.closeCapture();
        this.mic.textContent = "Enable microphone";
        this.talk(false);
        this.sync();
      });
      this.mic.textContent = "Disable microphone";
      await this.prepareCapture(stream);
      this.sync();
    } catch {
      this.message(
        "Microphone permission was not granted. You can still listen and use text radio.",
        true,
      );
      this.mic.disabled = false;
    }
  }
  releaseMicrophone() {
    this.talk(false);
    this.closeCapture();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    for (const p of this.peers.values()) void p.sender?.replaceTrack(null).catch(() => {});
    this.mic.textContent = "Enable microphone";
    this.sync();
  }
  setIceServers(servers) {
    this.iceServers = Array.isArray(servers) ? servers : [];
  }
  talk(pressed) {
    if (pressed) this.g.retention.audio.unlock();
    const active =
      !!pressed &&
      this.enabled &&
      this.living() &&
      this.g.transport.ready &&
      performance.now() - (this.g.online.lastSnapshotAt || 0) < 1500 &&
      !document.hidden &&
      !!this.stream;
    for (const t of this.stream?.getAudioTracks() || []) t.enabled = active;
    this.speaking = active;
    this.captureNode?.port.postMessage(active);
    this.button.setAttribute("aria-pressed", String(active));
    this.radioButton.setAttribute("aria-pressed", String(active));
  }
  async prepareCapture(stream) {
    const ctx = this.g.retention.audio.ctx;
    if (!ctx?.audioWorklet || !globalThis.AudioWorkletNode) return;
    try {
      this.workletReady ||= ctx.audioWorklet.addModule(
        new URL("./outpost-voice-worklet.js", import.meta.url),
      );
      await this.workletReady;
      if (this.stream !== stream || !this.living()) return;
      this.captureSource = ctx.createMediaStreamSource(stream);
      this.captureNode = new AudioWorkletNode(ctx, "outpost-voice-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      this.captureSource.connect(this.captureNode);
      this.captureNode.connect(this.g.retention.audio.master);
      this.captureNode.port.postMessage(this.speaking === true);
      this.captureNode.port.onmessage = (event) => {
        if (!this.speaking || !this.living() || !this.g.transport.ready) return;
        if ((this.g.transport.socket?.bufferedAmount || 0) > 8192) return;
        const targets = [...this.peers]
          .filter(([, p]) => p.pc?.connectionState !== "connected")
          .map(([id]) => id);
        if (!targets.length) return;
        const pcm = encodeVoiceFrame(new Int16Array(event.data));
        if (pcm) this.g.transport.send({ type: "voice-audio", targets, pcm });
      };
    } catch {
      this.message(
        "Direct voice is available; this browser could not start the fallback audio path.",
        true,
      );
    }
  }
  closeCapture() {
    if (this.captureNode) {
      this.captureNode.port.onmessage = null;
      this.captureNode.port.close();
      this.captureNode.disconnect();
    }
    this.captureSource?.disconnect();
    this.captureNode = this.captureSource = null;
  }
  audioChain(peer) {
    const a = this.g.retention.audio;
    if (peer.filter || !a.ctx || !a.master) return;
    peer.filter = a.ctx.createBiquadFilter();
    peer.filter.type = "lowpass";
    peer.gain = a.ctx.createGain();
    peer.gain.gain.value = 0;
    peer.pan = a.ctx.createStereoPanner();
    peer.filter.connect(peer.gain);
    peer.gain.connect(peer.pan);
    peer.pan.connect(a.master);
  }
  receiveAudio(packet) {
    if (!this.enabled || !this.living() || !this.allowed.has(packet.from) || document.hidden)
      return;
    const peer = this.peers.get(packet.from),
      a = this.g.retention.audio;
    if (!peer || peer.pc?.connectionState === "connected" || a.ctx?.state !== "running") return;
    const samples = decodeVoiceFrame(packet.pcm);
    if (!samples) return;
    this.audioChain(peer);
    if (!peer.filter) return;
    const buffer = a.ctx.createBuffer(1, 1280, 16000);
    buffer.copyToChannel(samples, 0);
    const source = a.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(peer.filter);
    const now = a.ctx.currentTime;
    // Drop accumulated backlog after a jitter spike; never play old speech
    // seconds later or grow an unbounded audio queue on a weak connection.
    if (peer.nextAudioAt > now + 0.24) {
      for (const queued of peer.audioSources || []) {
        queued.onended = null;
        queued.stop();
        queued.disconnect();
      }
      peer.audioSources?.clear();
      peer.nextAudioAt = now + 0.02;
    }
    const at =
      peer.nextAudioAt > now + 0.24 ? now + 0.02 : Math.max(now + 0.02, peer.nextAudioAt || 0);
    peer.nextAudioAt = at + 0.08;
    peer.audioSources ||= new Set();
    peer.audioSources.add(source);
    source.onended = () => {
      source.disconnect();
      peer.audioSources.delete(source);
    };
    source.start(at);
    this.receivedFrames = (this.receivedFrames || 0) + 1;
    this.sync();
  }
  peersChanged(peers) {
    if (!this.enabled || !this.living()) peers = [];
    this.allowed = new Set(
      (Array.isArray(peers) ? peers : [])
        .map((p) => p.id)
        .filter((id) => typeof id === "string" && id !== this.g.selfId),
    );
    for (const id of this.peers.keys()) if (!this.allowed.has(id)) this.removePeer(id);
    for (const id of this.allowed) if (!this.peers.has(id)) this.addPeer(id);
    const queued = this.waiting;
    this.waiting = [];
    for (const p of queued) if (this.allowed.has(p.from)) void this.signal(p);
    this.sync();
  }
  addPeer(id) {
    const pc = globalThis.RTCPeerConnection
        ? new RTCPeerConnection({ iceServers: this.iceServers })
        : null,
      transceiver =
        this.g.selfId < id ? pc?.addTransceiver("audio", { direction: "sendrecv" }) : null;
    const peer = {
      pc,
      sender: transceiver?.sender,
      makingOffer: false,
      ignoreOffer: false,
      candidates: [],
      polite: this.g.selfId > id,
    };
    this.peers.set(id, peer);
    this.audioChain(peer);
    if (!pc) return peer;
    if (this.stream) void peer.sender?.replaceTrack(this.stream.getAudioTracks()[0]);
    pc.onicecandidate = (e) => {
      if (e.candidate)
        this.g.transport.send({ type: "rtc", to: id, candidate: e.candidate.toJSON() });
    };
    pc.onnegotiationneeded = async () => {
      if (this.g.selfId > id || pc.signalingState !== "stable") return;
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        this.g.transport.send({ type: "rtc", to: id, description: pc.localDescription.toJSON() });
      } catch {
        this.message("A voice link is recovering. Text radio still works.");
      } finally {
        peer.makingOffer = false;
      }
    };
    pc.ontrack = (e) => {
      if (e.track.kind !== "audio" || pc.connectionState === "closed") {
        e.track.stop();
        return;
      }
      const a = this.g.retention.audio;
      this.g.retention.audio.unlock();
      if (!a.ctx || !a.master) return;
      peer.source?.disconnect();
      peer.source = a.ctx.createMediaStreamSource(new MediaStream([e.track]));
      this.audioChain(peer);
      peer.source.connect(peer.filter);
      this.sync();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed")
        this.message("Voice is using the game connection. You can keep playing and talking.", true);
      else this.sync();
    };
    return peer;
  }
  async signal(packet) {
    if (!this.enabled || !this.living()) return;
    if (!this.allowed.has(packet.from)) {
      if (this.waiting.length < 24) this.waiting.push(packet);
      return;
    }
    const p = this.peers.get(packet.from) || this.addPeer(packet.from),
      pc = p.pc;
    if (!pc) return;
    try {
      if (packet.description) {
        const collision =
          packet.description.type === "offer" && (p.makingOffer || pc.signalingState !== "stable");
        p.ignoreOffer = !p.polite && collision;
        if (p.ignoreOffer) return;
        if (collision) await pc.setLocalDescription({ type: "rollback" });
        await pc.setRemoteDescription(packet.description);
        for (const c of p.candidates) await pc.addIceCandidate(c);
        p.candidates = [];
        if (packet.description.type === "offer") {
          // Reuse the offered audio m-line rather than creating a second,
          // unnegotiated transceiver on the answering browser.
          const audio = pc.getTransceivers().find((t) => t.receiver.track.kind === "audio");
          if (audio) {
            audio.direction = "sendrecv";
            p.sender = audio.sender;
            await p.sender.replaceTrack(this.stream?.getAudioTracks()[0] || null);
          }
          await pc.setLocalDescription();
          this.g.transport.send({
            type: "rtc",
            to: packet.from,
            description: pc.localDescription.toJSON(),
          });
        }
      } else if (packet.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(packet.candidate);
        else p.candidates.push(packet.candidate);
      }
    } catch {
      if (!p.ignoreOffer) this.message("A voice link is recovering. Text radio still works.");
    }
  }
  sync() {
    const g = this.g,
      living = this.living();
    this.join.disabled = !g.online || !g.transport.ready;
    this.mic.disabled = !this.enabled || !living;
    this.button.hidden =
      !this.enabled || !living || !this.stream || !g.transport.ready || g.state !== "playing";
    this.radioButton.hidden = this.button.hidden || !g.protocolUI.meeting.open;
    if (
      !living ||
      !g.transport.ready ||
      document.hidden ||
      performance.now() - (g.online?.lastSnapshotAt || 0) > 1500
    )
      this.talk(false);
    if (this.enabled && !living) {
      for (const id of this.peers.keys()) this.removePeer(id);
      this.stream?.getTracks().forEach((t) => t.stop());
      this.closeCapture();
      this.stream = null;
      this.mic.textContent = "Enable microphone";
      this.message("Voice is available to living players during a match.");
      return;
    }
    const view = g.protocolUI.safeView(),
      camera = g.camera(),
      a = g.retention.audio;
    for (const [id, p] of this.peers) {
      if (!p.gain || !a.ctx) continue;
      const e = view?.entities.find((e) => e.id === id),
        v = voicePosition(view, id, camera, e ? g.arena.visible(camera, e) : false);
      p.gain.gain.setTargetAtTime(
        document.hidden ||
          !g.transport.ready ||
          performance.now() - (g.online?.lastSnapshotAt || 0) > 1500
          ? 0
          : v.gain * this.volume,
        a.ctx.currentTime,
        0.08,
      );
      p.pan.pan.setTargetAtTime(v.pan, a.ctx.currentTime, 0.08);
      p.filter.frequency.setTargetAtTime(v.cutoff, a.ctx.currentTime, 0.08);
    }
    if (this.noteUntil > performance.now()) this.message(this.note);
    else if (this.enabled)
      this.message(
        this.peers.size
          ? this.peers.size +
              " nearby voice link" +
              (this.peers.size === 1 ? "" : "s") +
              (this.stream ? " · hold V / MIC to speak." : " · listening; microphone off.")
          : "Listening · no nearby voice participants.",
      );
  }
  removePeer(id) {
    const p = this.peers.get(id);
    if (!p) return;
    if (p.pc) {
      p.pc.onnegotiationneeded = null;
      p.pc.onconnectionstatechange = null;
      p.pc.close();
    }
    for (const source of p.audioSources || []) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    for (const node of [p.source, p.filter, p.gain, p.pan]) node?.disconnect();
    this.peers.delete(id);
  }
  disconnect() {
    this.talk(false);
    for (const id of this.peers.keys()) this.removePeer(id);
    this.allowed.clear();
    this.waiting = [];
    this.button.hidden = true;
    this.radioButton.hidden = true;
  }
  leave() {
    this.g.transport.send({ type: "voice", enabled: false });
    this.enabled = false;
    this.disconnect();
    this.closeCapture();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.join.textContent = "Join voice";
    this.mic.textContent = "Enable microphone";
    this.message("Voice off.");
    this.sync();
  }
  dispose() {
    this.leave();
    this.panel.remove();
    this.button.remove();
    this.radioButton.remove();
    this.style.remove();
  }
}
