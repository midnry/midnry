import { useCallback, useEffect, useRef, useState } from "react";
import type { GameKind } from "../systems/types";
import { GAME_FONT, btnGhost, btnPrimary, panel } from "./theme";

// Sports-day mini-games for interhouse sports. Each is a few seconds of real
// play: tap or press keys, and the result decides the story. Everything runs
// on one animation loop; rivals are paced by the level (1 easy to 3 hard).

export const HOUSES: Record<string, { name: string; color: string }> = {
  red: { name: "Red House", color: "#ef4444" },
  blue: { name: "Blue House", color: "#3b82f6" },
  green: { name: "Green House", color: "#22c55e" },
  yellow: { name: "Yellow House", color: "#eab308" },
};

const INFO: Record<GameKind, { title: string; how: string; keys: string }> = {
  sprint: { title: "100m sprint", how: "Tap Left and Right one after the other, as fast as you can. Same foot twice and you stumble.", keys: "← → or A D" },
  sack: { title: "Sack race", how: "Tap Hop when the marker is in the green. Miss and you fall over in your sack.", keys: "Space" },
  egg: { title: "Egg and spoon race", how: "You walk on your own. Keep the egg in the middle of the spoon: lean the other way when it rolls.", keys: "← → or A D" },
  relay: { title: "4 × 100m relay", how: "Your team runs; you pass the baton. Tap Pass when the runner reaches the green zone. Too early or too late costs time.", keys: "Space" },
  tug: { title: "Tug of war", how: "Tap Pull as fast as you can. When the coach shouts HEAVE!, pull on the shout for a big heave.", keys: "Space" },
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

export function MiniGame({ kind, level = 1, house, onDone }: { kind: GameKind; level?: number; house?: string; onDone: (won: boolean) => void }) {
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

  const props = { level: Math.max(1, Math.min(3, level)), color: mine, playing: phase === "play", onEnd: finish };
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px]" role="dialog" aria-label={info.title} style={{ fontFamily: GAME_FONT }}>
      <div className={`${panel} w-full max-w-lg p-4 text-slate-100 sm:p-5`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-extrabold">{info.title}</h2>
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-300 uppercase">
            <span className="size-3 rounded-full border border-white/40" style={{ background: mine }} aria-hidden />
            {HOUSES[house ?? ""]?.name ?? "Interhouse sports"}
          </span>
        </div>
        <div className="relative mt-3">
          {kind === "sprint" ? <Sprint {...props} /> : null}
          {kind === "sack" ? <Sack {...props} /> : null}
          {kind === "egg" ? <Egg {...props} /> : null}
          {kind === "relay" ? <Relay {...props} /> : null}
          {kind === "tug" ? <Tug {...props} /> : null}
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

type GameProps = { level: number; color: string; playing: boolean; onEnd: (won: boolean) => void };

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
