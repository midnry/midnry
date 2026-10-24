/** Outpost Zero sound mix: the bus table, per-bus levels, ducking rules and
 * the settings → gain maths. Everything here is a pure function of plain
 * numbers so it can be unit tested without an AudioContext; FieldAudio
 * (outpost-retention.js) owns the GainNodes and applies what this returns.
 *
 * Signal flow (one GainNode per bus, all into master, then a limiter):
 *
 *   weapons ─┐   gunfire, reloads, explosions near you
 *   hits    ─┤   hit marker, damage taken, heartbeat / adrenaline, shock
 *   alerts  ─┤   zone / haze siren, countdown, lives lost
 *   ui      ─┼─▶ master ─▶ limiter ─▶ speakers
 *   world   ─┤   footsteps, work sounds, weather, base ambience
 *   music   ─┤   the Last Signal score
 *   voice   ─┘   nearby voice (its own slider lives in the voice panel)
 *
 * Why buses at all: before this, every sound sat at one level with no
 * ducking, so fights sounded flat and warnings got buried under gunfire.
 * A bus gives each family one knob (the settings sliders) and one place for
 * the ducker to pull it down for a moment without touching individual
 * sounds. The spatial maths (distance, stereo, wall muffling) is untouched:
 * it still shapes each sound before it reaches its bus. */

/** Every bus name, in mix order. `master` is not a bus: it is where they meet. */
export const BUSES = ["weapons", "hits", "alerts", "ui", "world", "music", "voice"];

/** Buses whose activity makes other buses duck. */
export const TRIGGERS = ["weapons", "alerts", "voice"];

/** Linear trim applied to each bus on top of the sounds' own gains.
 * Decisions (0 dB = 1.0, each 6 dB roughly halves or doubles):
 *  - weapons 1.0 : the reference. Guns are the loudest thing in the game and
 *                  the master loudness was tuned around them, so they stay put.
 *  - hits 1.15   : +1.2 dB. The marker and damage cues are tiny (35–120 ms);
 *                  a touch of lift keeps them readable under a burst without
 *                  making them feel loud.
 *  - alerts 1.25 : +2 dB. The one family that must cut through everything:
 *                  zone sirens, the countdown, a lost life. Ducking below does
 *                  the rest, so this stays modest.
 *  - ui 0.85     : −1.4 dB. Chimes (ready, pickup, round start) carry
 *                  information, not drama; they should never compete.
 *  - world 0.8   : −2 dB. Footsteps, work sounds and weather are the bed the
 *                  action sits on. Still clearly audible (positional cues are
 *                  gameplay), just behind the fight.
 *  - music 0.55  : −5.2 dB. The old music trim, kept: a driving score at this
 *                  level reads as music without masking footsteps.
 *  - voice 1.0   : speech is never trimmed here; the voice panel has its own
 *                  volume and spatial maths already scales it. */
export const BUS_DEFAULTS = {
  weapons: 1,
  hits: 1.15,
  alerts: 1.25,
  ui: 0.85,
  world: 0.8,
  music: 0.55,
  voice: 1,
};

/** The procedural sounds are mixed quiet; the master level lifts them so the
 * default volume is clearly audible on laptop and phone speakers. The
 * limiter after master catches what stacked gunfire adds on top. */
export const MASTER_LOUDNESS = 1.7;

/** Your own shots versus everyone else's. Bots' shots already fall off with
 * distance (spatial maths, unchanged); on top of that your own gun gets +2 dB
 * so it has presence and you always know which shots are yours. */
export const SHOT_PRESENCE = { own: 1.25, other: 1 };

/** Combat sound intensity (Settings → Sound), mirroring Camera motion:
 *  full    : the mix as designed.
 *  reduced : gunfire and hits at half level (−6 dB) and ducking at half
 *            depth, for long sessions or sensitive ears.
 *  off     : no gunfire or hit sounds at all. Alerts, voice, footsteps and
 *            music stay, so the game is still playable by ear. */
export const COMBAT_MODES = ["full", "reduced", "off"];
export const COMBAT_SCALE = { full: 1, reduced: 0.5, off: 0 };
export const COMBAT_DUCK_SCALE = { full: 1, reduced: 0.5, off: 1 };

/** Ducking: how far (dB, negative) a target bus dips while a trigger bus is
 * busy. Kept between 3 and 6 dB on purpose: enough that an alert or a burst
 * stands clear, not enough to hear the music "breathe" (pumping).
 *  - gunfire pulls music 4 dB and world 3 dB: your shots stay on top, but the
 *    footsteps behind them are still there.
 *  - alerts pull harder (music 6, world 5) and nudge weapons 3 dB so a siren
 *    or lost life is heard even mid fight.
 *  - voice pulls music 4 dB: speech over a score needs the room.
 * When several triggers are active the deepest rule wins; depths are not
 * summed, otherwise gunfire plus a siren would bury the music. */
export const DUCK_RULES = [
  { trigger: "weapons", target: "music", db: -4 },
  { trigger: "weapons", target: "world", db: -3 },
  { trigger: "alerts", target: "music", db: -6 },
  { trigger: "alerts", target: "world", db: -5 },
  { trigger: "alerts", target: "weapons", db: -3 },
  { trigger: "voice", target: "music", db: -4 },
];

/** Ducking shape, in seconds. Attack is fast so the first shot already sits
 * on a dipped bed; release is slow so a burst of fire or a three-tone siren
 * reads as one dip, not a flutter. */
export const DUCK_ATTACK = 0.03;
export const DUCK_RELEASE = 0.4;

/** How long a trigger counts as "busy" after its last sound starts. Shots
 * in a burst land 80–150 ms apart, so a 120 ms hold bridges them; a siren is
 * three tones 340 ms apart; voice is re-held every frame while speaking. */
export const DUCK_HOLD = { weapons: 0.12, alerts: 0.45, voice: 0.3 };

export const dbToGain = (db) => 10 ** (db / 20);
export const gainToDb = (gain) => (gain > 0 ? 20 * Math.log10(gain) : -Infinity);

/** `setTargetAtTime` approaches its target exponentially and is ~95% there
 * after three time constants, so a wanted attack or release time becomes a
 * constant of a third of it. */
export const rampTimeConstant = (seconds) => seconds / 3;

const clamp01 = (v, fallback) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback);

/** The saved sound settings with defaults and clamping applied. `volume`,
 * `muted` and `music` are the keys that always existed in the
 * `midnry-outpost-audio` record; `effects`, `alerts` and `combat` extend it. */
export function normalizeSettings(raw) {
  return {
    volume: clamp01(raw?.volume, 0.35),
    muted: Boolean(raw?.muted),
    effects: clamp01(raw?.effects, 1),
    music: clamp01(raw?.music, 0.6),
    alerts: clamp01(raw?.alerts, 1),
    combat: COMBAT_MODES.includes(raw?.combat) ? raw.combat : "full",
  };
}

/** Which settings slider governs each bus. Voice has none here: its own
 * panel slider scales it, and master still mutes it. */
export const BUS_SLIDER = {
  weapons: "effects",
  hits: "effects",
  alerts: "alerts",
  ui: "effects",
  world: "effects",
  music: "music",
  voice: null,
};

/** The linear gain a bus GainNode should sit at for these settings, before
 * ducking and before master. Mute is not applied here: it lives on master so
 * everything, voice included, goes quiet together. */
export function levelFor(bus, settings) {
  const s = normalizeSettings(settings),
    base = BUS_DEFAULTS[bus];
  if (base == null) return 0;
  const slider = BUS_SLIDER[bus],
    combat = bus === "weapons" || bus === "hits" ? COMBAT_SCALE[s.combat] : 1;
  return base * (slider ? s[slider] : 1) * combat;
}

/** Master gain: the volume slider lifted by the loudness trim, or silence. */
export function masterLevel(settings) {
  const s = normalizeSettings(settings);
  return s.muted ? 0 : s.volume * MASTER_LOUDNESS;
}

/** Trigger names whose hold (ctx time when it ends) is still in the future. */
export function activeTriggers(holds, now) {
  return TRIGGERS.filter((t) => (holds?.[t] ?? 0) > now);
}

/** The dip, in dB (0 or negative), a target bus gets from the active
 * triggers. Deepest rule wins. Weapons never trigger when combat sound is
 * off (they are silent, so nothing should move for them), and Reduced halves
 * every depth. */
export function duckDepthDb(target, active, settings) {
  const s = normalizeSettings(settings),
    on = new Set(active || []);
  if (s.combat === "off") on.delete("weapons");
  let depth = 0;
  for (const rule of DUCK_RULES)
    if (rule.target === target && on.has(rule.trigger)) depth = Math.min(depth, rule.db);
  return depth * COMBAT_DUCK_SCALE[s.combat];
}

/** The same dip as a linear multiplier for the bus gain (1 = no ducking). */
export function duckGainFor(target, active, settings) {
  return dbToGain(duckDepthDb(target, active, settings));
}

/** Buses that any rule can duck. */
export const DUCK_TARGETS = [...new Set(DUCK_RULES.map((r) => r.target))];

/** Own-shot presence multiplier for `FieldAudio.shot`. */
export const shotPresence = (own) => SHOT_PRESENCE[own ? "own" : "other"];
