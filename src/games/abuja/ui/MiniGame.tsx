import { useCallback, useEffect, useRef, useState } from "react";
import type { GameKind } from "../systems/types";
import { HOUSES } from "../systems/tournament";
import { GAME_FONT, btnGhost, btnPrimary, panel } from "./theme";

// Sports-day mini-games for interhouse sports. Each is a few seconds of real
// play: tap or press keys, and the result decides the story. Everything runs
// on one animation loop; rivals are paced by the level (1 easy to 3 hard).

export { HOUSES };

const INFO: Record<GameKind, { title: string; how: string; keys: string }> = {
  sprint: { title: "100m sprint", how: "Tap Left and Right one after the other, as fast as you can. Same foot twice and you stumble.", keys: "← → or A D" },
  sack: { title: "Sack race", how: "Tap Hop when the marker is in the green. Miss and you fall over in your sack.", keys: "Space" },
  egg: { title: "Egg and spoon race", how: "You walk on your own. Keep the egg in the middle of the spoon: lean the other way when it rolls.", keys: "← → or A D" },
  relay: { title: "4 × 100m relay", how: "Your team runs; you pass the baton. Tap Pass when the runner reaches the green zone. Too early or too late costs time.", keys: "Space" },
  tug: { title: "Tug of war", how: "Tap Pull as fast as you can. When the coach shouts HEAVE!, pull on the shout for a big heave.", keys: "Space" },
  basketball: {
    title: "Basketball shootout",
    how: "Five shots each. The power bar slides back and forth: tap Shoot when it's in the green. Close to the edge and it rattles the rim.",
    keys: "Space",
  },
  tennis: {
    title: "Tennis",
    how: "First to five points. The ball comes at you: tap Hit when it reaches the yellow zone. The closer to the middle of the zone, the harder it is to return. Too early or too late and you lose the point.",
    keys: "Space",
  },
  chess: {
    title: "Chess: checkmate in one",
    how: "Three positions, one move each. You're White: find the move that checkmates. Tap your piece, then the square. Solve two of three to win the match.",
    keys: "Tap or click",
  },
  tourney: { title: "Interhouse tournament", how: "", keys: "" },
  penalties: {
    title: "Penalty shootout",
    how: "Five kicks each. When you shoot, the aim swings across the goal: tap Shoot to strike. Corners are hard to save but easy to miss. When they shoot, pick which way to dive.",
    keys: "Shoot: Space · Dive: ← Space →",
  },
};

type Phase = "intro" | "count" | "play" | "done";

/** One requestAnimationFrame loop while `on`, with the time step in seconds. */
function useLoop(on: boolean, step: (dt: number) => void) {
  const ref = useRef(step);
  ref.current = step;
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Capped so a stalled tab doesn't jump the race forward.
      const dt = Math.min(0.12, (now - last) / 1000);
      last = now;
      ref.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

export function MiniGame({ kind, level = 1, house, rival, onDone }: { kind: GameKind; level?: number; house?: string; rival?: string; onDone: (won: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [count, setCount] = useState(3);
  const [won, setWon] = useState<boolean | null>(null);
  const info = INFO[kind];
  const mine = HOUSES[house ?? ""]?.color ?? "#3b82f6";

  useEffect(() => {
    if (phase !== "count") return;
    if (count <= 0) {
      setPhase("play");
      return;
    }
    const t = window.setTimeout(() => setCount((c) => c - 1), 650);
    return () => window.clearTimeout(t);
  }, [phase, count]);

  const finish = useCallback((w: boolean) => {
    setWon(w);
    setPhase("done");
  }, []);

  const props = { level: Math.max(1, Math.min(3, level)), color: mine, rival: HOUSES[rival ?? ""], playing: phase === "play", onEnd: finish };
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px]" role="dialog" aria-label={info.title} style={{ fontFamily: GAME_FONT }}>
      <div className={`${panel} w-full max-w-lg p-4 text-slate-100 sm:p-5`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-extrabold">{info.title}</h2>
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-300 uppercase">
            <span className="size-3 rounded-full border border-white/40" style={{ background: mine }} aria-hidden />
            {HOUSES[house ?? ""]?.name ?? "Interhouse sports"}
            {rival && HOUSES[rival] ? (
              <>
                <span className="text-slate-500">vs</span>
                <span className="size-3 rounded-full border border-white/40" style={{ background: HOUSES[rival].color }} aria-hidden />
                {HOUSES[rival].name}
              </>
            ) : null}
          </span>
        </div>
        <div className="relative mt-3">
          {kind === "sprint" ? <Sprint {...props} /> : null}
          {kind === "sack" ? <Sack {...props} /> : null}
          {kind === "egg" ? <Egg {...props} /> : null}
          {kind === "relay" ? <Relay {...props} /> : null}
          {kind === "tug" ? <Tug {...props} /> : null}
          {kind === "penalties" ? <Penalties {...props} /> : null}
          {kind === "basketball" ? <Basketball {...props} /> : null}
          {kind === "tennis" ? <Tennis {...props} /> : null}
          {kind === "chess" ? <Chess {...props} /> : null}
          {phase === "count" ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">{count > 0 ? count : "Go!"}</span>
            </div>
          ) : null}
        </div>
        {phase === "intro" ? (
          <div className="mt-4">
            <p className="text-sm text-slate-300">{info.how}</p>
            <p className="mt-1 text-xs text-slate-500">Keyboard: {info.keys}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className={`${btnPrimary} min-h-12 flex-1`} onClick={() => setPhase("count")} autoFocus>
                Ready
              </button>
              <button type="button" className={`${btnGhost} min-h-12 px-4`} onClick={() => onDone(false)}>
                Sit this one out
              </button>
            </div>
          </div>
        ) : null}
        {phase === "done" ? (
          <div className="mt-4">
            <p className={`text-lg font-extrabold ${won ? "text-emerald-300" : "text-rose-300"}`}>{won ? "You won! 🏅" : "You lost this one."}</p>
            <button type="button" className={`${btnPrimary} mt-3 min-h-12 w-full`} onClick={() => onDone(Boolean(won))} autoFocus>
              Continue
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type GameProps = { level: number; color: string; rival?: { name: string; color: string }; playing: boolean; onEnd: (won: boolean) => void };

/** Keyboard keys while playing. */
function useKeys(playing: boolean, onKey: (key: string) => void) {
  const ref = useRef(onKey);
  ref.current = onKey;
  useEffect(() => {
    if (!playing) return;
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "a", "d", " ", "enter"].includes(k)) {
        e.preventDefault();
        ref.current(k === "a" ? "arrowleft" : k === "d" ? "arrowright" : k === "enter" ? " " : k);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [playing]);
}

const RIVALS = ["#ef4444", "#22c55e", "#eab308", "#3b82f6"];

const houseOf = (color: string) => Object.values(HOUSES).find((h) => h.color === color)?.name.replace(" House", "") ?? "";

/** The running track: one lane per runner, each in their house colour, with the finish line on the right. */
function Track({ lanes, finish = 100 }: { lanes: { x: number; color: string; me?: boolean }[]; finish?: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#b4532a] px-2 py-1.5 shadow-inner">
      <div className="pointer-events-none absolute inset-y-0 right-3 w-2 bg-[repeating-linear-gradient(0deg,#fff_0_6px,#111_6px_12px)] opacity-90" aria-hidden />
      <span className="pointer-events-none absolute top-0.5 right-6 text-sm" aria-hidden>🏁</span>
      {lanes.map((l, i) => (
        <div key={i} className="relative h-10 border-b-2 border-white/50 last:border-b-0">
          <span className="pointer-events-none absolute top-1/2 left-0.5 w-11 -translate-y-1/2 text-[9px] leading-tight font-black tracking-wide text-white/80 uppercase">{l.me ? "You" : houseOf(l.color)}</span>
          <div
            className={`absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border-2 text-base ${l.me ? "border-white shadow-[0_0_0_3px_rgba(255,255,255,0.4)]" : "border-black/25"}`}
            style={{ left: `calc(2.9rem + (100% - 5.2rem) * ${Math.min(1, l.x / finish)})`, background: l.color }}
            aria-label={l.me ? "You" : houseOf(l.color)}
          >
            <span className="-scale-x-100" aria-hidden>
              🏃
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BigButton({ children, onPress, disabled, wide }: { children: React.ReactNode; onPress: () => void; disabled?: boolean; wide?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onPress();
      }}
      className={`${btnPrimary} min-h-16 select-none text-lg font-black touch-manipulation ${wide ? "flex-[2]" : "flex-1"} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

// ── 100m sprint: alternate feet ───────────────────────────────────────────────

function Sprint({ level, color, playing, onEnd }: GameProps) {
  const [st, setSt] = useState({ me: 0, v: 0, rivals: [0, 0, 0], last: "", stumble: 0 });
  const done = useRef(false);
  const pace = [0, 16, 18.5, 21][level]!;
  const step = (foot: string) => {
    if (!playing || done.current) return;
    setSt((s) => (s.last === foot ? { ...s, stumble: 0.35, v: s.v * 0.5 } : { ...s, last: foot, v: Math.min(34, s.v + 4.2) }));
  };
  useKeys(playing, (k) => (k === "arrowleft" || k === "arrowright" ? step(k) : undefined));
  useLoop(playing, (dt) => {
    if (done.current) return;
    setSt((s) => {
      const v = Math.max(0, s.v - 9 * dt);
      const me = s.me + (s.stumble > 0 ? 0 : v) * dt;
      const rivals = s.rivals.map((r, i) => r + (pace + i * 0.8 + Math.sin(performance.now() / 300 + i) * 1.5) * dt);
      const best = Math.max(...rivals);
      if (me >= 100 || best >= 100) {
        done.current = true;
        window.setTimeout(() => onEnd(me >= best), 250);
      }
      return { ...s, v, me, rivals, stumble: Math.max(0, s.stumble - dt) };
    });
  });
  return (
    <div>
      <Track lanes={[{ x: st.me, color, me: true }, ...st.rivals.map((x, i) => ({ x, color: RIVALS.filter((c) => c !== color)[i] ?? "#94a3b8" }))]} />
      <p className="mt-2 h-5 text-center text-sm font-bold text-amber-300">{st.stumble > 0 ? "Stumble! Alternate your feet." : `${Math.round(st.me)}m`}</p>
      <div className="mt-2 flex gap-2">
        <BigButton onPress={() => step("arrowleft")} disabled={!playing}>
          ◀ Left
        </BigButton>
        <BigButton onPress={() => step("arrowright")} disabled={!playing}>
          Right ▶
        </BigButton>
      </div>
    </div>
  );
}

// ── Sack race: hop on the beat ────────────────────────────────────────────────

function Sack({ level, color, playing, onEnd }: GameProps) {
  const [st, setSt] = useState({ me: 0, t: 0, rivals: [0, 0, 0], fallen: 0, msg: "" });
  const done = useRef(false);
  const zone = [0, 0.3, 0.24, 0.18][level]!;
  const pace = [0, 7.5, 8.6, 9.8][level]!;
  const marker = (t: number) => (Math.sin(t * 3.2) + 1) / 2;
  const hop = () => {
    if (!playing || done.current) return;
    setSt((s) => {
      if (s.fallen > 0) return s;
      const m = marker(s.t);
      return Math.abs(m - 0.5) < zone / 2 ? { ...s, me: s.me + 9, msg: "Hop!" } : { ...s, fallen: 1.1, msg: "You fell! Get up…" };
    });
  };
  useKeys(playing, (k) => (k === " " ? hop() : undefined));
  useLoop(playing, (dt) => {
    if (done.current) return;
    setSt((s) => {
      const rivals = s.rivals.map((r, i) => r + (pace + i * 0.5) * dt);
      const best = Math.max(...rivals);
      if (s.me >= 100 || best >= 100) {
        done.current = true;
        window.setTimeout(() => onEnd(s.me >= best), 250);
      }
      return { ...s, t: s.t + dt, rivals, fallen: Math.max(0, s.fallen - dt), msg: s.fallen > dt ? s.msg : s.msg === "Hop!" ? "Hop!" : "" };
    });
  });
  const m = marker(st.t);
  return (
    <div>
      <Track lanes={[{ x: st.me, color, me: true }, ...st.rivals.map((x, i) => ({ x, color: RIVALS.filter((c) => c !== color)[i] ?? "#94a3b8" }))]} />
      <div className="relative mt-3 h-6 overflow-hidden rounded-full bg-slate-800">
        <div className="absolute inset-y-0 bg-emerald-500/70" style={{ left: `${(0.5 - zone / 2) * 100}%`, width: `${zone * 100}%` }} />
        <div className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded bg-white" style={{ left: `${m * 100}%` }} />
      </div>
      <p className="mt-1 h-5 text-center text-sm font-bold text-amber-300">{st.fallen > 0 ? "You fell! Get up…" : st.msg}</p>
      <div className="mt-2 flex">
        <BigButton onPress={hop} disabled={!playing || st.fallen > 0} wide>
          Hop!
        </BigButton>
      </div>
    </div>
  );
}

// ── Egg and spoon: keep it balanced ───────────────────────────────────────────

function Egg({ level, color, playing, onEnd }: GameProps) {
  const [st, setSt] = useState({ me: 0, tilt: 0, vel: 0, t: 0, drops: 0, held: 0 as -1 | 0 | 1, wait: 0 });
  const done = useRef(false);
  const wobble = [0, 1.1, 1.5, 1.9][level]!;
  const rivalTime = [0, 21, 18, 16][level]!;
  // Lean the spoon one way and the egg rolls that way.
  const press = (dir: -1 | 1) => setSt((s) => ({ ...s, vel: s.vel + dir * 0.9 }));
  useKeys(playing, (k) => (k === "arrowleft" ? press(-1) : k === "arrowright" ? press(1) : undefined));
  useLoop(playing, (dt) => {
    if (done.current) return;
    setSt((s) => {
      const t = s.t + dt;
      if (s.wait > 0) return { ...s, t, wait: Math.max(0, s.wait - dt) };
      // The egg rolls away from the middle, faster the further it goes.
      let vel = s.vel + (s.tilt * 1.6 + Math.sin(t * 2.3) * wobble * 0.6 + (Math.random() - 0.5) * wobble) * dt;
      vel *= 0.985;
      let tilt = s.tilt + vel * dt;
      let me = s.me + 6.2 * dt;
      let drops = s.drops;
      let wait = 0;
      if (Math.abs(tilt) > 1) {
        drops += 1;
        tilt = 0;
        vel = 0;
        me = Math.max(0, me - 6);
        wait = 1.4;
      }
      if (me >= 100 || t >= rivalTime) {
        done.current = true;
        window.setTimeout(() => onEnd(me >= 100 && t < rivalTime), 250);
      }
      return { ...s, t, vel, tilt, me, drops, wait };
    });
  });
  const rival = Math.min(100, (st.t / rivalTime) * 100);
  return (
    <div>
      <Track lanes={[{ x: st.me, color, me: true }, { x: rival, color: RIVALS.find((c) => c !== color)! }]} />
      <div className="relative mx-auto mt-4 h-16 w-64">
        <div className="absolute top-10 left-0 h-2 w-full rounded-full bg-slate-300" />
        <div className="absolute top-8 left-1/2 h-6 w-16 -translate-x-1/2 rounded-b-full border-2 border-slate-300 border-t-0" />
        <div
          className="absolute top-3 size-8 -translate-x-1/2 rounded-[50%_50%_45%_45%/60%_60%_40%_40%] border border-amber-200 bg-amber-50 shadow"
          style={{ left: `${50 + st.tilt * 45}%`, opacity: st.wait > 0 ? 0.3 : 1 }}
        />
      </div>
      <p className="h-5 text-center text-sm font-bold text-amber-300">{st.wait > 0 ? "Dropped it! Pick it up…" : `Drops: ${st.drops}`}</p>
      <div className="mt-2 flex gap-2">
        <BigButton onPress={() => press(-1)} disabled={!playing}>
          ◀ Lean
        </BigButton>
        <BigButton onPress={() => press(1)} disabled={!playing}>
          Lean ▶
        </BigButton>
      </div>
    </div>
  );
}

// ── Relay: pass the baton in the zone ─────────────────────────────────────────

function Relay({ level, color, playing, onEnd }: GameProps) {
  const [st, setSt] = useState({ leg: 0, x: 0, penalty: 0, msg: "", t: 0 });
  const done = useRef(false);
  const speed = 34;
  const zoneStart = 78;
  const zoneEnd = [0, 94, 92, 90][level]!;
  const allowed = [0, 2.2, 1.6, 1.1][level]!;
  const pass = () => {
    if (!playing || done.current) return;
    setSt((s) => {
      if (s.leg >= 3) return s;
      let penalty = s.penalty;
      let msg: string;
      if (s.x < zoneStart - 10) return { ...s, msg: "Too early, wait for the zone!" };
      if (s.x < zoneStart) {
        penalty += 0.6;
        msg = "A bit early: fumbled the baton.";
      } else if (s.x <= zoneEnd) msg = "Clean pass!";
      else {
        penalty += 0.9;
        msg = "Late pass: lost time.";
      }
      return { ...s, leg: s.leg + 1, x: 0, penalty, msg };
    });
  };
  useKeys(playing, (k) => (k === " " ? pass() : undefined));
  useLoop(playing, (dt) => {
    if (done.current) return;
    setSt((s) => {
      const x = s.x + speed * dt;
      // Missing the zone altogether is disqualification.
      if (s.leg < 3 && x > 100) {
        done.current = true;
        window.setTimeout(() => onEnd(false), 400);
        return { ...s, x: 100, msg: "Out of the zone: disqualified!" };
      }
      if (s.leg === 3 && x >= 100) {
        done.current = true;
        window.setTimeout(() => onEnd(s.penalty <= allowed), 400);
        return { ...s, x: 100, msg: s.penalty <= allowed ? "First across the line!" : "Beaten at the line." };
      }
      return { ...s, x, t: s.t + dt };
    });
  });
  return (
    <div>
      <p className="mb-2 text-sm text-slate-300">
        Leg {st.leg + 1} of 4 {st.leg < 3 ? "· pass in the green zone" : "· anchor leg, bring it home"}
      </p>
      <div className="relative h-12 overflow-hidden rounded-xl bg-[#b4532a]">
        {st.leg < 3 ? <div className="absolute inset-y-0 bg-emerald-500/60" style={{ left: `${zoneStart * 0.92}%`, width: `${(zoneEnd - zoneStart) * 0.92}%` }} /> : null}
        <div className="absolute inset-y-0 right-1 w-1 bg-white/80" />
        <div className="absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-sm" style={{ left: `calc(${st.x}% * 0.92)`, background: color }}>
          🏃
        </div>
      </div>
      <p className="mt-2 h-5 text-center text-sm font-bold text-amber-300">{st.msg}</p>
      <div className="mt-2 flex">
        <BigButton onPress={pass} disabled={!playing || st.leg >= 3} wide>
          Pass!
        </BigButton>
      </div>
    </div>
  );
}

// ── Tug of war: pull, and heave on the shout ──────────────────────────────────

function Tug({ level, color, playing, onEnd }: GameProps) {
  const [st, setSt] = useState({ rope: 0, t: 0, heave: -1, msg: "" });
  const done = useRef(false);
  const theirs = [0, 9, 11.5, 14][level]!;
  const pull = () => {
    if (!playing || done.current) return;
    setSt((s) => {
      const onShout = s.heave >= 0 && s.heave < 0.45;
      return { ...s, rope: s.rope + (onShout ? 7 : 1.6), msg: onShout ? "HEAVE! 💪" : s.msg, heave: onShout ? -1 : s.heave };
    });
  };
  useKeys(playing, (k) => (k === " " ? pull() : undefined));
  useLoop(playing, (dt) => {
    if (done.current) return;
    setSt((s) => {
      const t = s.t + dt;
      // The coach shouts every few seconds; the window is short.
      let heave = s.heave >= 0 ? s.heave + dt : -1;
      if (heave > 0.8) heave = -1;
      if (heave < 0 && Math.floor(t / 2.6) !== Math.floor(s.t / 2.6)) heave = 0;
      const rope = s.rope - theirs * dt * (0.8 + 0.4 * Math.sin(t * 1.7));
      if (rope >= 50 || rope <= -50 || t >= 25) {
        done.current = true;
        window.setTimeout(() => onEnd(rope > 0), 300);
      }
      return { ...s, t, rope, heave, msg: heave >= 0 ? "HEAVE!" : s.msg === "HEAVE! 💪" ? s.msg : "" };
    });
  });
  const pos = 50 + Math.max(-50, Math.min(50, st.rope));
  return (
    <div>
      <div className="relative h-16 overflow-hidden rounded-xl bg-[#3f7d3a]">
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/70" />
        <div className="absolute inset-y-0 left-[10%] w-1 bg-white" style={{ background: color }} />
        <div className="absolute inset-y-0 right-[10%] w-1 bg-white/80" />
        <div className="absolute top-1/2 left-0 h-1.5 w-full -translate-y-1/2 bg-amber-200/90" />
        <div className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500" style={{ left: `${100 - pos}%` }} />
        <span className="absolute top-1 left-2 text-[11px] font-black text-white">YOUR TEAM</span>
        <span className="absolute top-1 right-2 text-[11px] font-black text-white">THEM</span>
      </div>
      <p className={`mt-2 h-6 text-center font-black ${st.heave >= 0 ? "text-2xl text-amber-300" : "text-sm text-slate-300"}`}>{st.heave >= 0 ? "HEAVE!" : st.msg || `${Math.max(0, Math.ceil(25 - st.t))}s`}</p>
      <div className="mt-2 flex">
        <BigButton onPress={pull} disabled={!playing} wide>
          Pull!
        </BigButton>
      </div>
    </div>
  );
}

// ── Penalty shootout: shoot five, save five, then sudden death ───────────────

type Zone = 0 | 1 | 2;
type Kick = { by: "me" | "them"; scored: boolean };
const ZONE_X = [0.2, 0.5, 0.8];
const zoneOf = (x: number): Zone => (x < 0.36 ? 0 : x > 0.64 ? 2 : 1);
const pickZone = (): Zone => {
  const r = Math.random();
  return r < 0.4 ? 0 : r < 0.6 ? 1 : 2;
};

/** Over yet? Five each, stopping early once one side can't catch up; then pairs of sudden death (ten each at most). */
function decided(kicks: Kick[]): "me" | "them" | null {
  const mine = kicks.filter((k) => k.by === "me");
  const theirs = kicks.filter((k) => k.by === "them");
  const a = mine.filter((k) => k.scored).length;
  const b = theirs.filter((k) => k.scored).length;
  if (mine.length <= 5 && theirs.length <= 5) {
    if (a + (5 - mine.length) < b) return "them";
    if (b + (5 - theirs.length) < a) return "me";
    if (mine.length < 5 || theirs.length < 5) return null;
  }
  if (mine.length !== theirs.length) return null;
  if (a !== b) return a > b ? "me" : "them";
  return mine.length >= 10 ? "them" : null;
}

function Penalties({ level, color, rival, playing, onEnd }: GameProps) {
  const [kicks, setKicks] = useState<Kick[]>([]);
  const [aim, setAim] = useState(0.5);
  const [shot, setShot] = useState<{ ball: number; keeper: number; text: string; good: boolean } | null>(null);
  const done = useRef(false);
  const clock = useRef(0);
  const turn: "me" | "them" = kicks.length % 2 === 0 ? "me" : "them";
  const theirColor = rival?.color ?? "#94a3b8";
  const swing = [0, 0.9, 1.25, 1.6][level]!;
  const miss = [0, 0.2, 0.13, 0.07][level]!;

  useLoop(playing && turn === "me" && !shot, (dt) => {
    clock.current += dt;
    setAim(0.5 + 0.47 * Math.sin(clock.current * swing * Math.PI));
  });

  const resolve = (kick: Kick, view: { ball: number; keeper: number; text: string; good: boolean }) => {
    const next = [...kicks, kick];
    setKicks(next);
    setShot(view);
    window.setTimeout(() => {
      setShot(null);
      const winner = decided(next);
      if (winner && !done.current) {
        done.current = true;
        onEnd(winner === "me");
      }
    }, 1150);
  };

  const shoot = () => {
    if (!playing || done.current || shot || turn !== "me") return;
    const x = aim;
    const zone = zoneOf(x);
    const keeper = Math.floor(Math.random() * 3) as Zone;
    const corner = x < 0.12 || x > 0.88;
    const wide = (x < 0.05 || x > 0.95) && Math.random() < 0.6;
    const saved = !wide && keeper === zone && Math.random() < (corner ? 0.3 : zone === 1 ? 0.9 : 0.7) + (level - 1) * 0.05;
    const scored = !wide && !saved;
    resolve({ by: "me", scored }, { ball: wide ? (x < 0.5 ? -0.08 : 1.08) : x, keeper: ZONE_X[keeper]!, text: wide ? "Wide!" : saved ? "Saved!" : "GOAL! ⚽", good: scored });
  };

  const dive = (mine: Zone) => {
    if (!playing || done.current || shot || turn !== "them") return;
    const zone = pickZone();
    const missed = Math.random() < miss;
    const saved = !missed && mine === zone && Math.random() < (zone === 1 ? 0.85 : 0.72);
    const scored = !missed && !saved;
    const ball = missed ? (zone === 0 ? -0.08 : zone === 2 ? 1.08 : 0.5) : ZONE_X[zone]! + (Math.random() - 0.5) * 0.12;
    resolve({ by: "them", scored }, { ball, keeper: ZONE_X[mine]!, text: missed ? (zone === 1 ? "Over the bar!" : "Wide!") : saved ? "You saved it! 🧤" : "They score.", good: !scored });
  };

  useKeys(playing, (k) => {
    if (turn === "me") return k === " " ? shoot() : undefined;
    if (k === "arrowleft") dive(0);
    else if (k === "arrowright") dive(2);
    else if (k === " ") dive(1);
  });

  const row = (by: "me" | "them") => {
    const list = kicks.filter((k) => k.by === by);
    const slots = Math.max(5, list.length);
    return Array.from({ length: slots }, (_, i) => list[i]);
  };
  const score = (by: "me" | "them") => kicks.filter((k) => k.by === by && k.scored).length;
  const keeperColor = turn === "me" ? theirColor : color;

  return (
    <div>
      <div className="mb-2 grid gap-1 rounded-xl bg-black/30 p-2 text-xs font-bold">
        {(["me", "them"] as const).map((by) => (
          <div key={by} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-full border border-white/40" style={{ background: by === "me" ? color : theirColor }} aria-hidden />
            <span className="w-16 shrink-0 truncate">{by === "me" ? "You" : (rival?.name.replace(" House", "") ?? "Them")}</span>
            <span className="flex flex-1 gap-1">
              {row(by).map((k, i) => (
                <span key={i} className={`size-4 rounded-full border ${k ? (k.scored ? "border-emerald-300 bg-emerald-400" : "border-rose-300 bg-rose-500") : "border-white/25 bg-white/5"}`} aria-hidden />
              ))}
            </span>
            <span className="w-5 text-right text-base tabular-nums">{score(by)}</span>
          </div>
        ))}
      </div>

      <div className="relative h-44 overflow-hidden rounded-xl bg-gradient-to-b from-[#2f6f3a] to-[#3f8a47]" aria-live="polite">
        {/* The goal: posts, bar and net. */}
        <div className="absolute top-3 left-[8%] h-28 w-[84%] rounded-t-sm border-x-[5px] border-t-[5px] border-white bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.18)_0_2px,transparent_2px_10px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.18)_0_2px,transparent_2px_10px)]" />
        <div className="absolute top-[7.6rem] left-0 h-0.5 w-full bg-white/60" />
        {/* The keeper. */}
        <div
          className="absolute top-12 flex h-16 w-10 -translate-x-1/2 flex-col items-center transition-[left] duration-300 ease-out"
          style={{ left: `${8 + 84 * (shot ? shot.keeper : 0.5)}%` }}
          aria-hidden
        >
          <span className="text-lg leading-none">🧤</span>
          <span className="mt-0.5 h-11 w-7 rounded-md border-2 border-black/30" style={{ background: keeperColor }} />
        </div>
        {/* The aim marker, when it's your kick. */}
        {turn === "me" && !shot && playing ? <div className="absolute top-3 h-28 w-1 -translate-x-1/2 rounded bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.9)]" style={{ left: `${8 + 84 * aim}%` }} aria-hidden /> : null}
        {/* The ball: on the spot, or flying to where it went. */}
        <span
          className="absolute -translate-x-1/2 text-2xl transition-all duration-300 ease-out"
          style={shot ? { left: `${8 + 84 * shot.ball}%`, top: "2.6rem" } : { left: "50%", top: "8.4rem" }}
          aria-hidden
        >
          ⚽
        </span>
        {shot ? (
          <p className={`absolute inset-x-0 bottom-1 text-center text-2xl font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] ${shot.good ? "text-emerald-200" : "text-rose-200"}`}>{shot.text}</p>
        ) : (
          playing ? <p className="absolute right-2 bottom-1.5 rounded-full bg-black/35 px-2 py-0.5 text-xs font-black text-white">{turn === "me" ? "Your kick" : "Their kick: dive!"}</p> : null
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {turn === "me" ? (
          <BigButton onPress={shoot} disabled={!playing || Boolean(shot)} wide>
            Shoot! ⚽
          </BigButton>
        ) : (
          <>
            <BigButton onPress={() => dive(0)} disabled={!playing || Boolean(shot)}>
              ◀ Left
            </BigButton>
            <BigButton onPress={() => dive(1)} disabled={!playing || Boolean(shot)}>
              Stay
            </BigButton>
            <BigButton onPress={() => dive(2)} disabled={!playing || Boolean(shot)}>
              Right ▶
            </BigButton>
          </>
        )}
      </div>
    </div>
  );
}

/** The two score rows used by the shootouts: a dot per attempt, green in, red out. */
function ScoreRows({ kicks, color, rival }: { kicks: Kick[]; color: string; rival?: { name: string; color: string } }) {
  const row = (by: "me" | "them") => {
    const list = kicks.filter((k) => k.by === by);
    return Array.from({ length: Math.max(5, list.length) }, (_, i) => list[i]);
  };
  const score = (by: "me" | "them") => kicks.filter((k) => k.by === by && k.scored).length;
  return (
    <div className="mb-2 grid gap-1 rounded-xl bg-black/30 p-2 text-xs font-bold">
      {(["me", "them"] as const).map((by) => (
        <div key={by} className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded-full border border-white/40" style={{ background: by === "me" ? color : (rival?.color ?? "#94a3b8") }} aria-hidden />
          <span className="w-16 shrink-0 truncate">{by === "me" ? "You" : (rival?.name.replace(" House", "") ?? "Them")}</span>
          <span className="flex flex-1 flex-wrap gap-1">
            {row(by).map((k, i) => (
              <span key={i} className={`size-4 rounded-full border ${k ? (k.scored ? "border-emerald-300 bg-emerald-400" : "border-rose-300 bg-rose-500") : "border-white/25 bg-white/5"}`} aria-hidden />
            ))}
          </span>
          <span className="w-5 text-right text-base tabular-nums">{score(by)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Basketball: five shots each on a timing bar, then sudden death ─────────

function Basketball({ level, color, rival, playing, onEnd }: GameProps) {
  const [kicks, setKicks] = useState<Kick[]>([]);
  const [power, setPower] = useState(0);
  const [flash, setFlash] = useState<{ text: string; good: boolean; arc: "in" | "rim" | "short" | "long" } | null>(null);
  const done = useRef(false);
  const clock = useRef(0);
  const turn: "me" | "them" = kicks.length % 2 === 0 ? "me" : "them";
  const zone = { c: 0.72, w: [0, 0.17, 0.13, 0.1][level]! };
  const speed = [0, 0.75, 0.95, 1.15][level]!;
  const theirs = [0, 0.42, 0.55, 0.66][level]!;

  useLoop(playing && turn === "me" && !flash, (dt) => {
    clock.current += dt;
    setPower(0.5 - 0.5 * Math.cos(clock.current * speed * Math.PI));
  });

  const resolve = (kick: Kick, view: NonNullable<typeof flash>) => {
    const next = [...kicks, kick];
    setKicks(next);
    setFlash(view);
    window.setTimeout(() => {
      setFlash(null);
      const winner = decided(next);
      if (winner && !done.current) {
        done.current = true;
        onEnd(winner === "me");
      }
    }, 1100);
  };

  // Their shot comes automatically, a moment after yours.
  useEffect(() => {
    if (!playing || turn !== "them" || flash || done.current) return;
    const t = window.setTimeout(() => {
      const made = Math.random() < theirs;
      resolve({ by: "them", scored: made }, { text: made ? `${rival?.name.replace(" House", "") ?? "They"} score.` : "They miss!", good: !made, arc: made ? "in" : "rim" });
    }, 700);
    return () => window.clearTimeout(t);
  });

  const shoot = () => {
    if (!playing || done.current || flash || turn !== "me") return;
    const off = Math.abs(power - zone.c);
    const clean = off <= zone.w / 2;
    const rim = !clean && off <= zone.w / 2 + 0.06;
    const made = clean || (rim && Math.random() < 0.5);
    const arc = clean ? "in" : rim ? "rim" : power < zone.c ? "short" : "long";
    resolve({ by: "me", scored: made }, { text: clean ? "Swish! 🏀" : made ? "Off the rim… and in!" : rim ? "Rattles out!" : power < zone.c ? "Too short." : "Too long.", good: made, arc });
  };
  useKeys(playing, (k) => (k === " " ? shoot() : undefined));

  const ball = flash ? { in: { left: "80%", top: "22%" }, rim: { left: "74%", top: "18%" }, short: { left: "58%", top: "58%" }, long: { left: "92%", top: "10%" } }[flash.arc] : { left: "14%", top: "62%" };
  return (
    <div>
      <ScoreRows kicks={kicks} color={color} rival={rival} />
      <div className="relative h-40 overflow-hidden rounded-xl bg-gradient-to-b from-[#8a5a2b] to-[#6b4321]" aria-live="polite">
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[#5a3a1d]" />
        {/* Backboard, hoop and net. */}
        <div className="absolute top-[10%] right-[6%] h-[34%] w-2 rounded bg-white" />
        <div className="absolute top-[28%] right-[8%] h-1.5 w-[12%] rounded bg-orange-500" />
        <div className="absolute top-[30%] right-[9%] h-6 w-[10%] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.7)_0_2px,transparent_2px_6px)] [clip-path:polygon(0_0,100%_0,80%_100%,20%_100%)]" />
        <span className="absolute -translate-x-1/2 text-3xl transition-all duration-500 ease-out" style={ball} aria-hidden>
          🏀
        </span>
        {flash ? <p className={`absolute inset-x-0 bottom-1 text-center text-xl font-black drop-shadow ${flash.good ? "text-emerald-200" : "text-rose-200"}`}>{flash.text}</p> : null}
        {!flash && playing ? <p className="absolute right-2 bottom-1.5 rounded-full bg-black/35 px-2 py-0.5 text-xs font-black text-white">{turn === "me" ? "Your shot" : "Their shot…"}</p> : null}
      </div>
      {/* The power bar. */}
      <div className="relative mt-3 h-6 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="absolute inset-y-0 bg-emerald-400/70" style={{ left: `${(zone.c - zone.w / 2) * 100}%`, width: `${zone.w * 100}%` }} />
        <div className="absolute inset-y-0 bg-amber-300/30" style={{ left: `${(zone.c - zone.w / 2 - 0.06) * 100}%`, width: `${(zone.w + 0.12) * 100}%` }} />
        <div className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded bg-white shadow" style={{ left: `${power * 100}%` }} />
      </div>
      <div className="mt-3 flex">
        <BigButton onPress={shoot} disabled={!playing || Boolean(flash) || turn !== "me"} wide>
          Shoot! 🏀
        </BigButton>
      </div>
    </div>
  );
}

// ── Tennis: time your hits, first to five points ────────────────────────────

function Tennis({ level, color, rival, playing, onEnd }: GameProps) {
  const [st, setSt] = useState({ me: 0, them: 0, y: 0, dir: 1 as 1 | -1, speed: [0, 0.85, 1.05, 1.25][level]!, msg: "", wait: 0.8, x: 0.5 });
  const done = useRef(false);
  const theirReturn = [0, 0.62, 0.7, 0.78][level]!;
  const theirColor = rival?.color ?? "#94a3b8";

  const point = (s: typeof st, mine: boolean, msg: string) => {
    const me = s.me + (mine ? 1 : 0);
    const them = s.them + (mine ? 0 : 1);
    if ((me >= 5 || them >= 5) && !done.current) {
      done.current = true;
      window.setTimeout(() => onEnd(me > them), 900);
    }
    return { ...s, me, them, msg, y: 0, dir: 1 as const, wait: 1.1, speed: [0, 0.85, 1.05, 1.25][level]!, x: 0.3 + Math.random() * 0.4 };
  };

  useLoop(playing, (dt) => {
    if (done.current) return;
    setSt((s) => {
      if (s.wait > 0) return { ...s, wait: s.wait - dt, msg: s.wait - dt <= 0 ? "" : s.msg };
      const y = s.y + s.dir * s.speed * dt;
      // Coming at you and you let it go past: their point.
      if (s.dir === 1 && y > 1.06) return point(s, false, "Missed it!");
      // Your shot reaches them: do they get it back?
      if (s.dir === -1 && y <= 0) {
        const quality = s.msg === "Perfect!" ? 0.32 : 0.12;
        if (Math.random() > theirReturn - quality) return point(s, true, "Winner! 🎾");
        return { ...s, y: 0, dir: 1, speed: Math.min(2.2, s.speed * 1.08), x: 0.25 + Math.random() * 0.5, msg: "" };
      }
      return { ...s, y };
    });
  });

  const hit = () => {
    if (!playing || done.current) return;
    setSt((s) => {
      if (s.wait > 0 || s.dir !== 1) return s;
      if (s.y < 0.74) return point(s, false, "Too early!");
      const off = Math.abs(s.y - 0.88);
      return { ...s, dir: -1, speed: s.speed * 1.05, msg: off < 0.05 ? "Perfect!" : "Good hit", x: 0.2 + Math.random() * 0.6 };
    });
  };
  useKeys(playing, (k) => (k === " " ? hit() : undefined));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-sm font-black">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full border border-white/40" style={{ background: color }} aria-hidden /> You {st.me}
        </span>
        <span className="text-xs text-slate-400">First to 5</span>
        <span className="flex items-center gap-2">
          {st.them} {rival?.name.replace(" House", "") ?? "Them"} <span className="size-3 rounded-full border border-white/40" style={{ background: theirColor }} aria-hidden />
        </span>
      </div>
      <div className="relative mx-auto h-56 max-w-xs overflow-hidden rounded-xl border-2 border-white/80 bg-[#2f7a5a]" aria-live="polite">
        <div className="absolute inset-x-[12%] inset-y-0 border-x border-white/60" />
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-white/90 shadow" />
        {/* Your hitting zone. */}
        <div className="absolute inset-x-0 bg-amber-300/25" style={{ top: `${0.74 * 100}%`, height: `${0.28 * 100}%` }} />
        <div className="absolute inset-x-0 h-0.5 bg-amber-300" style={{ top: `${0.88 * 100}%` }} />
        {/* Players. */}
        <div className="absolute top-1 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-black/30" style={{ left: `${st.x * 100}%`, background: theirColor }} aria-hidden />
        <div className="absolute bottom-1 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white" style={{ left: `${st.x * 100}%`, background: color }} aria-hidden />
        <span className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9f99d] shadow-[0_0_6px_rgba(217,249,157,0.9)]" style={{ left: `${st.x * 100}%`, top: `${Math.min(1.04, st.y) * 100}%` }} aria-hidden />
        {st.msg ? <p className="absolute inset-x-0 top-[38%] text-center text-xl font-black text-white drop-shadow">{st.msg}</p> : null}
      </div>
      <div className="mt-3 flex">
        <BigButton onPress={hit} disabled={!playing} wide>
          Hit! 🎾
        </BigButton>
      </div>
    </div>
  );
}

// ── Chess: checkmate in one, three positions ────────────────────────────────

/** White to move and mate in one; every mating move is listed (each checked to be the only one). */
const PUZZLES: { pieces: Record<string, string>; mates: string[]; hint: string }[] = [
  { pieces: { g1: "K", a1: "R", f2: "P", g2: "P", h2: "P", g8: "k", f7: "p", g7: "p", h7: "p" }, mates: ["a1a8"], hint: "Their king is trapped behind its own pawns." },
  { pieces: { g6: "K", d1: "Q", h8: "k" }, mates: ["d1d8"], hint: "Your king already guards g7 and h7." },
  { pieces: { c3: "K", g1: "R", a2: "R", h8: "k" }, mates: ["a2h2"], hint: "One rook holds the g-file. The other gives check." },
  { pieces: { c1: "K", g5: "N", h8: "k", g8: "r", g7: "p", h7: "p" }, mates: ["g5f7"], hint: "The king has smothered itself." },
  { pieces: { g1: "K", h5: "Q", d3: "B", g8: "k", f8: "r", f7: "p", g7: "p" }, mates: ["h5h7"], hint: "The bishop backs up the queen." },
];
const GLYPH: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const FILES = "abcdefgh";

function Chess({ level, rival, playing, onEnd }: GameProps) {
  const set = [[0, 1, 2], [1, 2, 3], [2, 3, 4]][level - 1]!;
  const limit = [0, 45, 35, 30][level]!;
  const [n, setN] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [left, setLeft] = useState(limit);
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null);
  const done = useRef(false);
  const puzzle = PUZZLES[set[n] ?? 0]!;

  const answer = (ok: boolean, text: string) => {
    const next = [...results, ok];
    setResults(next);
    setMsg({ text, good: ok });
    setPick(null);
    window.setTimeout(() => {
      setMsg(null);
      const wins = next.filter(Boolean).length;
      const losses = next.length - wins;
      if ((wins >= 2 || losses >= 2) && !done.current) {
        done.current = true;
        onEnd(wins >= 2);
        return;
      }
      setN((x) => x + 1);
      setLeft(limit);
    }, 1400);
  };

  useLoop(playing && !msg, (dt) => {
    if (done.current) return;
    setLeft((t) => {
      const v = t - dt;
      if (v <= 0 && t > 0) window.setTimeout(() => answer(false, "Time's up!"), 0);
      return Math.max(0, v);
    });
  });

  const tap = (sq: string) => {
    if (!playing || msg || done.current) return;
    const piece = puzzle.pieces[sq];
    if (piece && piece === piece.toUpperCase()) {
      setPick(sq);
      return;
    }
    if (!pick) return;
    const ok = puzzle.mates.includes(`${pick}${sq}`);
    answer(ok, ok ? "Checkmate! ♛" : `Not mate. ${rival?.name.replace(" House", "") ?? "They"} escape.`);
  };

  const squares: string[] = [];
  for (let r = 8; r >= 1; r -= 1) for (let f = 0; f < 8; f += 1) squares.push(`${FILES[f]}${r}`);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-sm font-black">
        <span>
          Position {Math.min(n + 1, 3)} of 3 · {results.filter(Boolean).length} solved
        </span>
        <span className={`tabular-nums ${left < 10 ? "text-rose-300" : "text-slate-300"}`}>⏱ {Math.ceil(left)}s</span>
      </div>
      <div className="mx-auto grid aspect-square w-full max-w-[20rem] grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border-2 border-[#3b2a1a]" role="grid" aria-label="Chess board">
        {squares.map((sq, i) => {
          const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          const p = puzzle.pieces[sq];
          const white = p && p === p.toUpperCase();
          return (
            <button
              key={sq}
              type="button"
              onClick={() => tap(sq)}
              aria-label={`${sq}${p ? ` ${white ? "white" : "black"} ${p.toLowerCase()}` : ""}`}
              className={`relative flex items-center justify-center text-[clamp(1.2rem,7vw,2rem)] leading-none ${dark ? "bg-[#b58863]" : "bg-[#f0d9b5]"} ${pick === sq ? "ring-4 ring-inset ring-amber-400" : ""}`}
            >
              {p ? (
                <span className={white ? "text-white [text-shadow:0_0_2px_#000,0_0_2px_#000,0_1px_1px_#000]" : "text-[#111]"} aria-hidden>
                  {GLYPH[p.toLowerCase()]}
                  {"︎"}
                </span>
              ) : null}
              {i % 8 === 0 ? <span className="absolute top-0 left-0.5 text-[8px] font-bold text-black/50">{sq[1]}</span> : null}
              {i >= 56 ? <span className="absolute right-0.5 bottom-0 text-[8px] font-bold text-black/50">{sq[0]}</span> : null}
            </button>
          );
        })}
      </div>
      <p className={`mt-2 min-h-6 text-center text-sm font-bold ${msg ? (msg.good ? "text-emerald-300" : "text-rose-300") : "text-slate-400"}`}>
        {msg ? msg.text : pick ? "Now tap the square to move to." : `White to move and mate. Hint: ${puzzle.hint}`}
      </p>
    </div>
  );
}
