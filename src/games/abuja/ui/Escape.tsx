import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_FONT, btnGhost, btnPrimary, panel } from "./theme";

// The escape from Kuje: three hard stages in a row. Preparation (the guard
// rota, a bribed warder, a hacksaw blade, a uniform) makes each one easier,
// through `edge` (0 = no help, 1 = lots). Fail any stage and you're caught.

type Stage = "light" | "fence" | "run";
const STAGES: { id: Stage; title: string; how: string; keys: string }[] = [
  { id: "light", title: "1 · The floodlight", how: "Hold Move to creep across the yard. Stop whenever the beam is on you: moving in the light gets you spotted.", keys: "Hold Space or the Move button" },
  { id: "fence", title: "2 · The fence", how: "Tap Left and Right one after the other to climb before your grip goes. When the torch swings your way (🔦), freeze: any tap then and you're seen.", keys: "← → or A D" },
  { id: "run", title: "3 · The bush", how: "Run for the road. Switch lanes to dodge dogs, ditches and torchlight. Two hits and they have you.", keys: "↑ ↓ or W S" },
];

function useLoop(on: boolean, step: (dt: number) => void) {
  const ref = useRef(step);
  ref.current = step;
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      ref.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

export function Escape({ edge, onDone }: { edge: { light: number; fence: number; run: number }; onDone: (ok: boolean, stage: string) => void }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"intro" | "play" | "lost" | "won">("intro");
  const stage = STAGES[i]!;
  const end = useCallback(
    (ok: boolean) => {
      if (!ok) return setPhase("lost");
      if (i < STAGES.length - 1) {
        setI(i + 1);
        setPhase("intro");
      } else setPhase("won");
    },
    [i],
  );
  const stageWord = stage.id === "light" ? "floodlight" : stage.id === "fence" ? "fence" : "bush";
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-3" role="dialog" aria-label="Escape" style={{ fontFamily: GAME_FONT }}>
      <div className={`${panel} w-full max-w-lg p-4 text-slate-100 sm:p-5`}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold">🌙 The escape</h2>
          <span className="text-xs font-bold text-slate-400 uppercase">Stage {i + 1} of 3</span>
        </div>
        <p className="mt-1 font-bold">{stage.title}</p>
        {phase === "intro" ? (
          <div className="mt-3">
            <p className="text-sm text-slate-300">{stage.how}</p>
            <p className="mt-1 text-xs text-slate-400">Keys: {stage.keys}</p>
            <p className="mt-2 text-xs text-amber-300">
              {stage.id === "light" ? (edge.light ? "Your guard rota and the warder slow the beam down." : "No guard rota, no warder: the beam is fast and wide.") : stage.id === "fence" ? (edge.fence ? "Your hacksaw blade cuts the razor wire: less to climb." : "No tool: you'll have to climb the whole fence.") : edge.run ? "The warder's uniform buys you fewer dogs." : "No disguise: every dog in Kuje is after you."}
            </p>
            <button type="button" className={`${btnPrimary} mt-4 min-h-12 w-full`} onClick={() => setPhase("play")} autoFocus>
              Go
            </button>
          </div>
        ) : null}
        {phase === "play" && stage.id === "light" ? <Light edge={edge.light} onEnd={end} /> : null}
        {phase === "play" && stage.id === "fence" ? <Fence edge={edge.fence} onEnd={end} /> : null}
        {phase === "play" && stage.id === "run" ? <Run edge={edge.run} onEnd={end} /> : null}
        {phase === "lost" ? (
          <div className="mt-3">
            <p className="text-lg font-extrabold text-rose-300">🚨 Spotted at the {stageWord}!</p>
            <button type="button" className={`${btnPrimary} mt-4 min-h-12 w-full`} onClick={() => onDone(false, stageWord)} autoFocus>
              Face the consequences
            </button>
          </div>
        ) : null}
        {phase === "won" ? (
          <div className="mt-3">
            <p className="text-lg font-extrabold text-emerald-300">You're out!</p>
            <button type="button" className={`${btnPrimary} mt-4 min-h-12 w-full`} onClick={() => onDone(true, "")} autoFocus>
              Disappear into the night
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type StageProps = { edge: number; onEnd: (ok: boolean) => void };

/** A mutable game state in a ref, re-rendered every frame; `finish` reports once. */
function useGame<T extends object>(init: () => T, onEnd: (ok: boolean) => void) {
  const g = useRef<T & { done: boolean }>({ ...init(), done: false });
  const [, setFrame] = useState(0);
  const redraw = useCallback(() => setFrame((n) => n + 1), []);
  const finish = useCallback(
    (ok: boolean) => {
      if (g.current.done) return;
      g.current.done = true;
      onEnd(ok);
    },
    [onEnd],
  );
  return { g, redraw, finish };
}

/** Creep across the yard; don't move while the sweeping beam is on you. */
function Light({ edge, onEnd }: StageProps) {
  const { g, redraw, finish } = useGame(() => ({ p: 0, beam: 100, dir: -1, seen: 0, t: 0 }), onEnd);
  const moving = useRef(false);
  const speed = 48 - edge * 18;
  const width = 24 - edge * 9;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        moving.current = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") moving.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  useLoop(true, (dt) => {
    const o = g.current;
    if (o.done) return;
    o.beam += o.dir * speed * dt;
    // The beam doubles back at the walls, and sometimes on a whim.
    if (o.beam < 0 || o.beam > 100 || Math.random() < dt * 0.25) o.dir = -o.dir;
    o.beam = Math.max(0, Math.min(100, o.beam));
    o.p = Math.min(100, o.p + (moving.current ? 15 * dt : 0));
    const lit = Math.abs(o.beam - o.p) < width / 2;
    o.seen = lit && moving.current ? o.seen + dt : Math.max(0, o.seen - dt);
    o.t += dt;
    if (o.seen > 0.22 || o.t > 30) finish(false);
    else if (o.p >= 100) finish(true);
    redraw();
  });
  const st = g.current;
  const lit = Math.abs(st.beam - st.p) < width / 2;
  return (
    <div className="mt-3 select-none">
      <div className="relative h-20 overflow-hidden rounded-xl bg-slate-900">
        <div className="absolute inset-y-0 bg-yellow-200/40" style={{ left: `${st.beam - width / 2}%`, width: `${width}%` }} />
        <div className="absolute bottom-2 text-2xl" style={{ left: `calc(${st.p}% - 12px)` }}>
          🧍
        </div>
        <div className="absolute top-1 right-2 text-xs text-slate-400">wall →</div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={lit ? "font-bold text-rose-300" : "text-slate-400"}>{lit ? "IN THE LIGHT" : "In the dark"}</span>
        <span className="text-slate-400">{Math.max(0, Math.ceil(30 - st.t))}s</span>
      </div>
      <button
        type="button"
        className={`${btnPrimary} mt-2 min-h-14 w-full touch-none`}
        onPointerDown={() => (moving.current = true)}
        onPointerUp={() => (moving.current = false)}
        onPointerLeave={() => (moving.current = false)}
      >
        Hold to move
      </button>
    </div>
  );
}

/** Climb by alternating taps; freeze when the torch swings your way. */
function Fence({ edge, onEnd }: StageProps) {
  const goal = edge ? 70 : 100;
  const { g, redraw, finish } = useGame(() => ({ h: 0, last: "", t: 0, torch: 0, next: 2.5 }), onEnd);
  const tap = useCallback(
    (side: "L" | "R") => {
      const o = g.current;
      if (o.done) return;
      if (o.torch > 0) return finish(false);
      o.h = side === o.last ? Math.max(0, o.h - 4) : o.h + 3.2;
      o.last = side;
      if (o.h >= goal) finish(true);
      redraw();
    },
    [g, goal, finish, redraw],
  );
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") tap("L");
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") tap("R");
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [tap]);
  useLoop(true, (dt) => {
    const o = g.current;
    if (o.done) return;
    o.t += dt;
    if (o.torch > 0) o.torch = Math.max(0, o.torch - dt);
    else if (o.t >= o.next) {
      o.torch = 1.1;
      o.next = o.t + 1.8 + Math.random() * 2.2;
    }
    o.h = Math.max(0, o.h - 5 * dt);
    if (o.t > 14) finish(false);
    redraw();
  });
  const st = g.current;
  return (
    <div className="mt-3 select-none">
      <div className="relative h-36 overflow-hidden rounded-xl bg-slate-900">
        <div className="absolute inset-x-[40%] bottom-0 top-3 border-x-4 border-dashed border-slate-500" />
        {edge ? null : <div className="absolute inset-x-[35%] top-1 text-center text-xs text-rose-300">✂ razor wire</div>}
        <div className="absolute left-1/2 -translate-x-1/2 text-2xl" style={{ bottom: `${(st.h / goal) * 80}%` }}>
          🧗
        </div>
        {st.torch > 0 ? <div className="absolute inset-0 bg-yellow-200/25 text-right text-3xl">🔦</div> : null}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span className={st.torch > 0 ? "font-bold text-rose-300" : ""}>{st.torch > 0 ? "FREEZE!" : "Climb!"}</span>
        <span>{Math.max(0, Math.ceil(14 - st.t))}s</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className={`${btnGhost} min-h-14`} onPointerDown={() => tap("L")}>
          ← Left
        </button>
        <button type="button" className={`${btnGhost} min-h-14`} onPointerDown={() => tap("R")}>
          Right →
        </button>
      </div>
    </div>
  );
}

const HAZARDS = ["🐕", "🕳️", "🔦"];

/** Three lanes; obstacles come at you; dodge for 15 seconds. */
function Run({ edge, onEnd }: StageProps) {
  const { g, redraw, finish } = useGame(() => ({ lane: 1, t: 0, hits: 0, spawn: 0.8, flash: 0, things: [] as { lane: number; x: number; icon: string; hit?: boolean }[] }), onEnd);
  const move = useCallback(
    (d: number) => {
      const o = g.current;
      if (o.done) return;
      o.lane = Math.max(0, Math.min(2, o.lane + d));
      redraw();
    },
    [g, redraw],
  );
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") move(-1);
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") move(1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [move]);
  useLoop(true, (dt) => {
    const o = g.current;
    if (o.done) return;
    o.t += dt;
    o.spawn -= dt;
    o.things = o.things.map((x) => ({ ...x, x: x.x - (70 + o.t * 3) * dt })).filter((x) => x.x > -10);
    if (o.spawn <= 0) {
      o.things.push({ lane: Math.floor(Math.random() * 3), x: 105, icon: HAZARDS[Math.floor(Math.random() * HAZARDS.length)]! });
      o.spawn = (0.62 + edge * 0.45) * (0.8 + Math.random() * 0.5);
    }
    o.flash = Math.max(0, o.flash - dt);
    for (const x of o.things) {
      if (!x.hit && x.lane === o.lane && x.x < 14 && x.x > 2) {
        x.hit = true;
        o.hits += 1;
        o.flash = 0.4;
      }
    }
    if (o.hits >= 2) finish(false);
    else if (o.t >= 15) finish(true);
    redraw();
  });
  const st = g.current;
  return (
    <div className="mt-3 select-none">
      <div className={`relative h-36 overflow-hidden rounded-xl ${st.flash ? "bg-rose-950" : "bg-emerald-950"}`}>
        {[0, 1, 2].map((l) => (
          <div key={l} className="absolute inset-x-0 border-b border-white/5" style={{ top: `${l * 33.3}%`, height: "33.3%" }} />
        ))}
        <div className="absolute text-2xl" style={{ left: "4%", top: `${st.lane * 33.3 + 4}%` }}>
          🏃
        </div>
        {st.things.map((x, n) => (
          <div key={n} className="absolute text-2xl" style={{ left: `${x.x}%`, top: `${x.lane * 33.3 + 4}%`, opacity: x.hit ? 0.3 : 1 }}>
            {x.icon}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>Hits: {st.hits}/2</span>
        <span>{Math.max(0, Math.ceil(15 - st.t))}s to the road</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className={`${btnGhost} min-h-14`} onPointerDown={() => move(-1)}>
          ↑ Up
        </button>
        <button type="button" className={`${btnGhost} min-h-14`} onPointerDown={() => move(1)}>
          ↓ Down
        </button>
      </div>
    </div>
  );
}
