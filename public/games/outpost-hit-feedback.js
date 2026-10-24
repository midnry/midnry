/** Combat feedback for the Outpost Zero HUD: hit markers, damage-direction
 * arcs and kill confirmation. The simulation only counts (hitSeq, damageSeq,
 * kills) and records where hits came from (damageFrom) and who went down
 * (lastKill); this module turns those counters into short, quiet visuals
 * around the crosshair. Pure helpers first (unit-tested), then the class that
 * owns the DOM.
 *
 * Motion: every opacity and scale is computed per frame from timestamps, so
 * nothing here relies on CSS animation. When camera motion is off (Settings)
 * or the system asks for reduced motion, `still` is true: no pop, no fade,
 * instant show/hide, same timing. */

export const TIMING = Object.freeze({
  hit: 360, // a plain hit marker lives this long after the last hit
  stack: 300, // hits this close together add up in one number instead of flickering
  kill: 600, // the kill variant, also the longest anything sits by the crosshair
  pop: 120, // the 1.25 → 1 scale pop at the first hit of a stack
  fade: 160, // the marker's fade-out at the end of its life
  arc: 700, // a damage-direction arc fades over this
  pulse: 700, // the neutral hazard ring (no attacker) fades over this
  merge: 14, // degrees: a new arc this close to a live one refreshes it instead
  flash: 600, // the accent flash on the health/ammo cards after a kill
});

/** Width of a damage-direction arc, in degrees of the ring. */
export const ARC_SPAN = 56;

/** How many arcs can show at once; the oldest goes when a seventh arrives. */
export const MAX_ARCS = 6;

/** Whether feedback should be still (no pop, no fade): the camera-motion
 * setting is off (scale 0) or the system prefers reduced motion. The 0.4
 * "reduced" setting keeps the small pop and fades: they are not camera motion. */
export function motionStill(cameraMotionScale, reducedMotion) {
  return !!reducedMotion || cameraMotionScale === 0;
}

/** Fold a new hit into the marker state. Hits within TIMING.stack of the
 * previous one sum into one number and refresh the timer (no re-pop); a kill
 * always pops and keeps the kill look for TIMING.kill even if plain hits land
 * meanwhile. `kill` is the tag text ("ELIMINATED · NAME"), or null. */
export function stackHit(mark, amount, now, kill = null, timing = TIMING) {
  const stacking = !!mark && now - mark.at <= timing.stack;
  const wasKill = !!mark?.kill && now < mark.until;
  return {
    amount: (stacking ? mark.amount : 0) + Math.max(0, amount || 0),
    at: now,
    popAt: stacking && !kill ? mark.popAt : now,
    kill: kill || (wasKill ? mark.kill : null),
    until: kill ? now + timing.kill : Math.max(wasKill ? mark.until : 0, now + timing.hit),
  };
}

/** Per-frame marker look, or null once it has expired. */
export function markStyle(mark, now, still = false, timing = TIMING) {
  if (!mark || now >= mark.until) return null;
  const fade = still ? 1 : Math.max(0, Math.min(1, (mark.until - now) / timing.fade));
  const pop = still ? 0 : Math.max(0, 1 - (now - mark.popAt) / timing.pop) * 0.25;
  return { opacity: fade, scale: (mark.kill ? 1.3 : 1) * (1 + pop) };
}

/** The tag for a kill: who went down, and whether they are out for good.
 * `lastKill` is the simulation's record (may be missing on older servers). */
export function killTag(lastKill, kills) {
  const known = lastKill && (lastKill.seq == null || lastKill.seq === kills);
  const what = known && lastKill.down ? "DOWN" : "ELIMINATED";
  const name = known && typeof lastKill.name === "string" ? lastKill.name.trim().slice(0, 18) : "";
  return name ? `${what} · ${name.toUpperCase()}` : what;
}

/** Screen bearing of a world angle: degrees clockwise from the top of the
 * screen (0 ahead, 90 right, 180 behind, 270 left), given the player's facing.
 * The renderer's right-hand vector is (-sin a, cos a), so a world angle of
 * facing + 90° lies to the right: the same sign the old canvas arrow used. */
export function bearingOf(phi, facing) {
  let deg = (((phi - facing) * 180) / Math.PI) % 360;
  if (deg < 0) deg += 360;
  return deg;
}

/** New damage since `seenSeq`, as a list of world angles toward each attacker
 * (phi), or null for damage with no attacker (haze, water, own blast). Reads
 * the simulation's `damageFrom` list; a room that does not send it (older
 * server, Blackout Protocol's field whitelist) still has `damageAngle`, the
 * last attacker's angle, so one arc shows; with neither, a hazard pulse. */
export function newDamage(player, seenSeq) {
  const list = Array.isArray(player.damageFrom)
    ? player.damageFrom.filter((e) => e && Number.isFinite(e.seq) && e.seq > seenSeq)
    : [];
  if (list.length)
    return list.map((e) => ({
      phi:
        Number.isFinite(e.x) && Number.isFinite(e.y) ? Math.atan2(e.y - player.y, e.x - player.x) : null,
    }));
  return [{ phi: Number.isFinite(player.damageAngle) ? player.damageAngle : null }];
}

/** Add an arc at world angle phi, or refresh a live arc within TIMING.merge
 * degrees of it (one attacker firing a burst keeps one arc). Oldest first out. */
export function mergeArc(arcs, phi, now, timing = TIMING) {
  const near = arcs.find((arc) => {
    let d = Math.abs((((arc.phi - phi) * 180) / Math.PI) % 360);
    if (d > 180) d = 360 - d;
    return d <= timing.merge && now - arc.at < timing.arc;
  });
  if (near) near.at = now;
  else arcs.push({ phi, at: now });
  while (arcs.length > MAX_ARCS) arcs.shift();
  return arcs;
}

/** Arcs still showing at `now`. */
export function liveArcs(arcs, now, timing = TIMING) {
  return arcs.filter((arc) => now - arc.at < timing.arc);
}

/** Per-frame arc look: the ring rotation that centres the arc on the attacker's
 * bearing (the dash starts at 3 o'clock, so it is turned back by 90° plus half
 * its span) and its opacity. */
export function arcStyle(arc, now, facing, still = false, timing = TIMING) {
  const age = Math.max(0, Math.min(1, (now - arc.at) / timing.arc));
  return {
    rotate: bearingOf(arc.phi, facing) - 90 - ARC_SPAN / 2,
    opacity: still ? 1 : 1 - age,
  };
}

/** Per-frame look of the neutral hazard ring, or null when it has faded. */
export function pulseStyle(pulseAt, now, still = false, timing = TIMING) {
  if (pulseAt == null || now - pulseAt >= timing.pulse) return null;
  const age = (now - pulseAt) / timing.pulse;
  return { opacity: still ? 0.6 : 0.6 * (1 - age), scale: still ? 1 : 1 + 0.08 * age };
}

const SVG = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}) => {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

/** Owns the hit marker (`.mf-hitmark`, already in the HUD), the damage ring
 * (`.mf-dmgring`, added beside it) and the kill flash on `.mf-bottom`.
 * Call `observe(now)` once per rendered frame; it reads `g.player`. */
export class HitFeedback {
  constructor(g) {
    this.g = g;
    this.mark = null;
    this.arcs = [];
    this.pulseAt = null;
    this.flashUntil = 0;
    this.roundKey = null;
    this.node = g.$(".mf-hitmark");
    // Four ticks around the crosshair (a gap in the middle keeps the reticle
    // clear), a thin ring that only shows for a kill, the number and the tag.
    this.node.replaceChildren();
    const ticks = el("svg", { viewBox: "0 0 48 48", "aria-hidden": "true" });
    ticks.append(
      el("circle", { class: "mf-hm-ring", cx: 24, cy: 24, r: 19, fill: "none", stroke: "currentColor", "stroke-width": 1.5 }),
      el("path", {
        d: "M8 8L17 17M40 8L31 17M8 40L17 31M40 40L31 31",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 3,
        "stroke-linecap": "round",
      }),
    );
    this.ticks = ticks;
    this.number = document.createElement("b");
    this.tag = document.createElement("span");
    this.node.append(ticks, this.number, this.tag);
    this.node.hidden = true;
    // The damage ring: one dashed neutral circle for hazards plus a pool of
    // arcs. pathLength=360 lets the dash array speak in degrees.
    this.ring = el("svg", { class: "mf-dmgring", viewBox: "-50 -50 100 100", "aria-hidden": "true" });
    this.pulse = el("circle", { class: "mf-dmgpulse", r: 40, pathLength: 360 });
    this.pulse.style.opacity = "0";
    this.ring.append(this.pulse);
    this.arcNodes = [];
    for (let i = 0; i < MAX_ARCS; i++) {
      const arc = el("circle", {
        class: "mf-dmgarc",
        r: 40,
        pathLength: 360,
        "stroke-dasharray": `${ARC_SPAN} ${360 - ARC_SPAN}`,
      });
      arc.style.opacity = "0";
      this.ring.append(arc);
      this.arcNodes.push(arc);
    }
    this.node.after(this.ring);
    this.bottom = g.$(".mf-bottom");
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)");
  }
  /** Start fresh (new round, new self): nothing already counted shows. */
  sync(p) {
    this.hitSeen = p.hitSeq || 0;
    this.hitTotalSeen = p.hitTotal || 0;
    this.damageSeen = p.damageSeq || 0;
    this.killsSeen = p.kills || 0;
    this.mark = null;
    this.arcs = [];
    this.pulseAt = null;
    this.flashUntil = 0;
  }
  still() {
    return motionStill(this.g.military?.cameraMotionScale?.(), this.reduced.matches);
  }
  observe(now) {
    const p = this.g.player;
    if (!p) {
      this.node.hidden = true;
      return;
    }
    const key = `${this.g.arena?.roundId ?? ""}|${p.id ?? ""}`;
    if (key !== this.roundKey) {
      this.roundKey = key;
      this.sync(p);
    }
    // Hits landed: the sum of damage since the last look (hitTotal), or the
    // last single hit when the total is missing.
    if ((p.hitSeq || 0) !== this.hitSeen) {
      const total = Math.max(0, (p.hitTotal || 0) - this.hitTotalSeen);
      this.hitSeen = p.hitSeq || 0;
      this.hitTotalSeen = p.hitTotal || 0;
      this.mark = stackHit(this.mark, Math.ceil(total || p.hitDamage || 0), now);
    }
    // Kills: Blackout Protocol has its own takedown presentation and keeps
    // kills secret, so the marker stays out of it.
    const kills = p.kills || 0;
    if (kills > this.killsSeen && this.g.mode !== "protocol") {
      this.mark = stackHit(this.mark, 0, now, killTag(p.lastKill, kills));
      this.flashUntil = now + TIMING.flash;
    }
    this.killsSeen = kills;
    // Damage taken: an arc toward each attacker, a neutral pulse otherwise.
    if ((p.damageSeq || 0) !== this.damageSeen) {
      for (const { phi } of newDamage(p, this.damageSeen))
        if (phi === null) this.pulseAt = now;
        else mergeArc(this.arcs, phi, now);
      this.damageSeen = p.damageSeq || 0;
    }
    this.render(now, p.a || 0);
  }
  render(now, facing) {
    const still = this.still();
    const look = markStyle(this.mark, now, still);
    if (look) {
      this.node.hidden = false;
      this.node.classList.toggle("mf-kill", !!this.mark.kill);
      this.node.classList.toggle("mf-still", still);
      this.node.style.opacity = look.opacity.toFixed(3);
      this.ticks.style.transform = `scale(${look.scale.toFixed(3)})`;
      this.number.textContent = this.mark.amount > 0 ? String(this.mark.amount) : "";
      this.tag.textContent = this.mark.kill || "";
    } else if (!this.node.hidden || this.mark) {
      // Expired: hide and clear, so a stale kill look never shows on the
      // next plain hit's first frame.
      this.node.hidden = true;
      this.node.classList.remove("mf-kill");
      this.number.textContent = "";
      this.tag.textContent = "";
      this.mark = null;
    }
    this.arcs = liveArcs(this.arcs, now);
    this.arcNodes.forEach((node, i) => {
      const arc = this.arcs[i];
      if (!arc) {
        node.style.opacity = "0";
        return;
      }
      const style = arcStyle(arc, now, facing, still);
      node.style.transform = `rotate(${style.rotate.toFixed(1)}deg)`;
      node.style.opacity = style.opacity.toFixed(3);
    });
    const pulse = pulseStyle(this.pulseAt, now, still);
    this.pulse.style.opacity = pulse ? pulse.opacity.toFixed(3) : "0";
    this.pulse.style.transform = pulse ? `scale(${pulse.scale.toFixed(3)})` : "";
    if (!pulse) this.pulseAt = null;
    this.ring.hidden = !pulse && !this.arcs.length;
    this.bottom?.classList.toggle("mf-killflash", now < this.flashUntil);
  }
}
