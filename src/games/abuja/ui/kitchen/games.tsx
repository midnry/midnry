import { useEffect, useRef, useState } from "react";
import { seasonHint } from "../../systems/cooking/cook";
import type { Flavor, Method, Prep } from "../../systems/cooking/types";
import { btnGhost, btnPrimary } from "../theme";

// Short, optional hands-on steps. Each returns a score 0–100 through `onDone`.
// Higher skill makes the targets bigger and the drift gentler.

type Done = (score: number) => void;

/** Which game a step plays. */
export function gameFor(step: { kind: "prep"; action: Prep } | { kind: "cook"; method: Method }): "chop" | "heat" | "timing" | "work" {
  if (step.kind === "prep") return step.action === "knead" || step.action === "mix" || step.action === "marinate" ? "work" : "chop";
  const m = step.method;
  if (["grill", "roast", "bake", "toast", "espresso", "brew", "ferment", "freeze", "smoke"].includes(m)) return "timing";
  if (["blend", "juice", "raw"].includes(m)) return "work";
  return "heat";
}

function useTicker(on: boolean, fn: (dt: number) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      ref.current(Math.min(0.05, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

/** Tap when the blade is over the mark. */
export function ChopGame({ label, skill, onDone }: { label: string; skill: number; onDone: Done }) {
  const cuts = 4;
  const [pos, setPos] = useState(0);
  const dir = useRef(1);
  const [hits, setHits] = useState<number[]>([]);
  const zone = 8 + skill / 8;
  const speed = 70 - skill / 4;
  const centre = useRef(30 + Math.random() * 40);
  useTicker(hits.length < cuts, (dt) => {
    setPos((p) => {
      let n = p + dir.current * speed * dt;
      if (n > 100 || n < 0) {
        dir.current *= -1;
        n = Math.max(0, Math.min(100, n));
      }
      return n;
    });
  });
  const cut = () => {
    const off = Math.abs(pos - centre.current);
    const score = Math.max(0, Math.round(100 - Math.max(0, off - zone / 2) * 4));
    const next = [...hits, score];
    setHits(next);
    centre.current = 20 + Math.random() * 60;
    if (next.length >= cuts) window.setTimeout(() => onDone(Math.round(next.reduce((a, b) => a + b, 0) / next.length)), 250);
  };
  return (
    <div>
      <p className="text-sm text-slate-300">{label}. Tap when the knife is over the green mark.</p>
      <div className="relative mt-4 h-12 overflow-hidden rounded-xl bg-white/10">
        <div className="absolute inset-y-0 bg-emerald-500/40" style={{ left: `${centre.current - zone / 2}%`, width: `${zone}%` }} />
        <div className="absolute -top-1 text-3xl transition-none" style={{ left: `calc(${pos}% - 14px)` }} aria-hidden>
          🔪
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          Cuts: {hits.length}/{cuts}
          {hits.length ? ` · last ${hits[hits.length - 1]}` : ""}
        </p>
        <button type="button" className={`${btnPrimary} min-w-32`} onClick={cut} disabled={hits.length >= cuts}>
          Chop!
        </button>
      </div>
    </div>
  );
}

/** Keep the heat in the band while it cooks. */
export function HeatGame({ label, target, skill, onDone }: { label: string; target: number; skill: number; onDone: Done }) {
  const duration = 7;
  const band = Math.max(8, 12 + skill / 6);
  const top = Math.max(120, target * 1.6 + 20);
  const [temp, setTemp] = useState(target * 0.55);
  const [time, setTime] = useState(0);
  const [good, setGood] = useState(0);
  const [push, setPush] = useState(0);
  const drift = useRef(0);
  const done = time >= duration;
  useTicker(!done, (dt) => {
    drift.current += (Math.random() - 0.5) * 30 * dt;
    drift.current *= 0.97;
    setTemp((t) => Math.max(20, Math.min(top, t + (push * 60 + drift.current * (1.3 - skill / 150)) * dt)));
    setTime((x) => {
      const n = x + dt;
      if (n >= duration) window.setTimeout(() => onDone(Math.round((good / duration) * 100)), 200);
      return n;
    });
    if (Math.abs(temp - target) <= band / 2) setGood((g) => g + dt);
  });
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / top) * 100))}%`;
  const inBand = Math.abs(temp - target) <= band / 2;
  return (
    <div>
      <p className="text-sm text-slate-300">
        {label}. Keep it around <span className="font-semibold">{target}°C</span>.
      </p>
      <div className="relative mt-4 h-10 overflow-hidden rounded-xl bg-gradient-to-r from-sky-500/30 via-amber-500/30 to-red-600/40">
        <div className="absolute inset-y-0 border-x-2 border-emerald-300 bg-emerald-400/25" style={{ left: `calc(${pct(target - band / 2)})`, width: `${(band / top) * 100}%` }} />
        <div className="absolute inset-y-0 w-1 rounded bg-white shadow" style={{ left: pct(temp) }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={inBand ? "text-emerald-300" : "text-amber-300"}>
          {Math.round(temp)}°C {inBand ? "· perfect" : temp < target ? "· too cool" : "· too hot"}
        </span>
        <span className="text-slate-400">{Math.max(0, Math.ceil(duration - time))}s</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`${btnGhost} select-none`}
          onPointerDown={() => setPush(-1)}
          onPointerUp={() => setPush(0)}
          onPointerLeave={() => setPush(0)}
          disabled={done}
        >
          🔽 Lower heat
        </button>
        <button
          type="button"
          className={`${btnGhost} select-none`}
          onPointerDown={() => setPush(1)}
          onPointerUp={() => setPush(0)}
          onPointerLeave={() => setPush(0)}
          disabled={done}
        >
          🔼 Raise heat
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">Hold a button to change the heat.</p>
    </div>
  );
}

/** Take it out (or flip it) when it's just right. */
export function TimingGame({ label, skill, verb, onDone }: { label: string; skill: number; verb: string; onDone: Done }) {
  const [p, setP] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const window0 = useRef(55 + Math.random() * 20);
  const width = 10 + skill / 8;
  useTicker(result == null, (dt) => setP((x) => (x >= 100 ? 100 : x + (22 + Math.random() * 6) * dt)));
  useEffect(() => {
    if (p >= 100 && result == null) {
      setResult(0);
      window.setTimeout(() => onDone(5), 400);
    }
  }, [p, result, onDone]);
  const stop = () => {
    const off = Math.abs(p - (window0.current + width / 2));
    const score = Math.max(0, Math.round(100 - Math.max(0, off - width / 2) * 3.5));
    setResult(score);
    window.setTimeout(() => onDone(score), 400);
  };
  const colour = p < window0.current ? "bg-amber-200" : p < window0.current + width ? "bg-amber-500" : "bg-stone-800";
  return (
    <div>
      <p className="text-sm text-slate-300">{label}. Watch it cook and act in the golden zone.</p>
      <div className="relative mt-4 h-10 overflow-hidden rounded-xl bg-white/10">
        <div className="absolute inset-y-0 border-x-2 border-amber-300 bg-amber-400/20" style={{ left: `${window0.current}%`, width: `${width}%` }} />
        <div className={`absolute inset-y-1 left-1 rounded-lg transition-colors ${colour}`} style={{ width: `calc(${p}% - 8px)` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{p < window0.current ? "Not yet…" : p < window0.current + width ? "Now!" : "Burning!"}</span>
        {result != null ? <span className="text-slate-200">Score {result}</span> : null}
      </div>
      <button type="button" className={`${btnPrimary} mt-3 w-full`} onClick={stop} disabled={result != null}>
        {verb}
      </button>
    </div>
  );
}

/** Work it (knead, mix, blend) until it's right, not over. */
export function WorkGame({ label, skill, onDone }: { label: string; skill: number; onDone: Done }) {
  const [v, setV] = useState(0);
  const [time, setTime] = useState(0);
  const [over, setOver] = useState(false);
  const target = 70;
  const band = 12 + skill / 10;
  const limit = 6;
  useTicker(!over, (dt) => {
    setV((x) => Math.max(0, x - 6 * dt));
    setTime((t) => {
      const n = t + dt;
      if (n >= limit) finish();
      return n;
    });
  });
  const finish = () => {
    if (over) return;
    setOver(true);
    const off = Math.abs(v - target);
    window.setTimeout(() => onDone(Math.max(0, Math.round(100 - Math.max(0, off - band / 2) * 3))), 250);
  };
  return (
    <div>
      <p className="text-sm text-slate-300">{label}. Tap to work it, then stop in the zone. Don't overdo it.</p>
      <div className="relative mt-4 h-10 overflow-hidden rounded-xl bg-white/10">
        <div className="absolute inset-y-0 border-x-2 border-emerald-300 bg-emerald-400/20" style={{ left: `${target - band / 2}%`, width: `${band}%` }} />
        <div className="absolute inset-y-1 left-1 rounded-lg bg-sky-400" style={{ width: `calc(${Math.min(100, v)}% - 8px)` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{v < target - band / 2 ? "Keep going" : v > target + band / 2 ? "Too much!" : "Just right"}</span>
        <span>{Math.max(0, Math.ceil(limit - time))}s</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={btnGhost} onClick={() => setV((x) => Math.min(110, x + 9 + skill / 20))} disabled={over}>
          👐 Work it
        </button>
        <button type="button" className={btnPrimary} onClick={finish} disabled={over}>
          Done
        </button>
      </div>
    </div>
  );
}

type Taste = Pick<Flavor, "spice" | "salt" | "sweet" | "sour">;

/** Set the seasoning. Taste a few times for hints. */
export function SeasonPanel({ start, target, skill, onDone }: { start: Taste; target: Taste; skill: number; onDone: (t: Taste) => void }) {
  const [t, setT] = useState<Taste>(start);
  const [tastes, setTastes] = useState<string[]>([]);
  const maxTastes = skill >= 40 ? 3 : 2;
  const rows: [keyof Taste, string, string][] = [
    ["spice", "🌶️ Pepper", "Ata rodo, chili, yaji"],
    ["salt", "🧂 Salt", "Salt and stock"],
    ["sweet", "🍯 Sweet", "Sugar, honey, ripe fruit"],
    ["sour", "🍋 Tang", "Tomato, lime, vinegar"],
  ];
  const taste = () => {
    const close = (["spice", "salt", "sweet", "sour"] as const).every((k) => Math.abs(t[k] - target[k]) <= 0.75);
    setTastes((x) => [...x, close ? "Perfect. Don't touch it." : seasonHint(t, target)]);
  };
  return (
    <div>
      <p className="text-sm text-slate-300">Season to taste. You can taste {maxTastes} times.</p>
      <div className="mt-3 grid gap-3">
        {rows.map(([key, label, hint]) => (
          <label key={key} className="block">
            <span className="flex justify-between text-sm">
              <span>{label}</span>
              <span className="tabular-nums text-slate-400">{t[key]}</span>
            </span>
            <input type="range" min={0} max={10} step={0.5} value={t[key]} className="w-full accent-blue-500" aria-label={label} onChange={(e) => setT({ ...t, [key]: Number(e.target.value) })} />
            <span className="text-[11px] text-slate-500">{hint}</span>
          </label>
        ))}
      </div>
      {tastes.length ? (
        <ul className="mt-2 space-y-1 text-sm text-amber-200">
          {tastes.map((x, i) => (
            <li key={i}>👅 {x}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={btnGhost} onClick={taste} disabled={tastes.length >= maxTastes}>
          👅 Taste ({maxTastes - tastes.length})
        </button>
        <button type="button" className={btnPrimary} onClick={() => onDone(t)}>
          That's it
        </button>
      </div>
    </div>
  );
}

const STYLES = [
  { id: "neat", label: "Neat and centred", good: ["main", "dessert", "baked"] },
  { id: "family", label: "Generous, family style", good: ["main", "soup", "side", "breakfast"] },
  { id: "layered", label: "Layered with garnish", good: ["dessert", "drink", "snack"] },
] as const;

/** Choose how to plate it. */
export function PlateGame({ course, skill, onDone }: { course: string; skill: number; onDone: Done }) {
  const [style, setStyle] = useState<string | null>(null);
  const [garnish, setGarnish] = useState(false);
  const finish = () => {
    const s = STYLES.find((x) => x.id === style);
    const fit = s && (s.good as readonly string[]).includes(course);
    onDone(Math.min(100, Math.round((fit ? 78 : 58) + skill / 6 + (garnish ? 8 : 0) + Math.random() * 6)));
  };
  return (
    <div>
      <p className="text-sm text-slate-300">How do you want to serve it?</p>
      <div className="mt-3 grid gap-2">
        {STYLES.map((x) => (
          <button key={x.id} type="button" onClick={() => setStyle(x.id)} className={`rounded-xl border px-3 py-2.5 text-left text-sm ${style === x.id ? "border-blue-400 bg-blue-400/15" : "border-white/10 bg-white/5"}`}>
            {x.label}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-blue-500" checked={garnish} onChange={(e) => setGarnish(e.target.checked)} />
          🌿 Add a garnish
        </label>
      </div>
      <button type="button" className={`${btnPrimary} mt-3 w-full`} disabled={!style} onClick={finish}>
        Serve
      </button>
    </div>
  );
}
