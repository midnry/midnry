import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUp, CornerUpLeft, CornerUpRight, FastForward, MapPin } from "lucide-react";
import { ROADS, roadRoute } from "../systems/citymap";
import { bus, driveInput, type DriveHud } from "../systems/store";
import { GAME_FONT, glass, panel } from "./theme";

type Pt = { x: number; y: number };

/** A little round map: the roads around you, your route, and you. North is up. */
function MiniMap({ hud, route }: { hud: DriveHud; route: Pt[] }) {
  const R = 900;
  const { at, heading } = hud;
  const view = `${at.x - R} ${at.y - R} ${R * 2} ${R * 2}`;
  const angle = (Math.atan2(heading.y, heading.x) * 180) / Math.PI + 90;
  return (
    <div className="relative size-28 overflow-hidden rounded-full border-4 border-[#0d1626] bg-[#6f9a62] shadow-xl sm:size-36">
      <svg viewBox={view} className="size-full" aria-hidden>
        {ROADS.xs.map((x) => (
          <line key={`x${x}`} x1={x} y1={0} x2={x} y2={6000} stroke="#e8e2d4" strokeWidth={110} />
        ))}
        {ROADS.ys.map((y) => (
          <line key={`y${y}`} x1={0} y1={y} x2={8000} y2={y} stroke="#e8e2d4" strokeWidth={110} />
        ))}
        <polyline points={route.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#2f7cf6" strokeWidth={70} strokeLinejoin="round" />
        <circle cx={route[route.length - 1]?.x} cy={route[route.length - 1]?.y} r={70} fill="#ef4444" stroke="#fff" strokeWidth={22} />
        <g transform={`translate(${at.x} ${at.y}) rotate(${angle})`}>
          <path d="M0 -120 L85 95 L0 50 L-85 95 Z" fill="#fbbf24" stroke="#1f2937" strokeWidth={22} />
        </g>
      </svg>
      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0d1626] px-1.5 text-[11px] font-black text-white">N</span>
    </div>
  );
}

/** Drag the wheel left or right to steer; let go and it centres. */
function Wheel() {
  const [turn, setTurn] = useState(0);
  const start = useRef<number | null>(null);
  const set = (v: number) => {
    setTurn(v);
    driveInput.steer = v;
  };
  return (
    <div
      role="slider"
      aria-label="Steering wheel: drag left or right"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={Math.round(turn * 10) / 10}
      tabIndex={0}
      className="pointer-events-auto size-32 touch-none select-none sm:size-40"
      onPointerDown={(e) => {
        start.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current == null) return;
        set(Math.max(-1, Math.min(1, (e.clientX - start.current) / 70)));
      }}
      onPointerUp={() => {
        start.current = null;
        set(0);
      }}
      onPointerCancel={() => {
        start.current = null;
        set(0);
      }}
    >
      <svg viewBox="-60 -60 120 120" className="size-full drop-shadow-xl" style={{ transform: `rotate(${turn * 90}deg)` }} aria-hidden>
        <circle r="54" fill="none" stroke="#1b2333" strokeWidth="13" />
        <circle r="54" fill="none" stroke="#3a4558" strokeWidth="4" />
        <path d="M-50 4 L-16 8 L-10 26 L10 26 L16 8 L50 4" fill="none" stroke="#1b2333" strokeWidth="12" strokeLinejoin="round" />
        <circle r="17" fill="#1b2333" stroke="#e5e7eb" strokeWidth="5" />
        <path d="M-58 0 L-48 -7 L-48 7 Z M58 0 L48 -7 L48 7 Z" fill="#e5e7eb" />
      </svg>
    </div>
  );
}

/** Hold to press: the accelerator and the brake. */
function Pedal({ label, onChange, children, className }: { label: string; onChange: (down: boolean) => void; children: React.ReactNode; className: string }) {
  const [down, setDown] = useState(false);
  const set = (v: boolean) => {
    setDown(v);
    onChange(v);
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={label}
        aria-pressed={down}
        className={`pointer-events-auto flex touch-none items-center justify-center rounded-2xl border-4 border-[#3a4558] bg-[#121a2a] text-white shadow-xl transition select-none ${down ? "scale-95 border-white/70" : ""} ${className}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          set(true);
        }}
        onPointerUp={() => set(false)}
        onPointerCancel={() => set(false)}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && set(true)}
        onKeyUp={(e) => (e.key === " " || e.key === "Enter") && set(false)}
      >
        {children}
      </button>
      <span className="rounded-full bg-[#121a2a]/90 px-3 py-0.5 text-xs font-bold text-white sm:text-sm" style={{ fontFamily: GAME_FONT }}>
        {label}
      </span>
    </div>
  );
}

/** The dashboard over the driving view. */
export function DriveHudView({ trip }: { trip: { from: Pt; to: Pt; name: string } }) {
  const [hud, setHud] = useState<DriveHud | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [reverse, setReverse] = useState(false);
  const route = useMemo(() => roadRoute(trip.from, trip.to), [trip]);
  useEffect(() => {
    const offs = [
      bus.on("driveHud", setHud),
      bus.on("driveBump", (text) => {
        setWarn(text);
        window.setTimeout(() => setWarn(null), 1800);
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      Object.assign(driveInput, { steer: 0, throttle: 0, brake: 0, reverse: false });
    };
  }, []);
  const gear = (r: boolean) => {
    setReverse(r);
    driveInput.reverse = r;
  };
  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      <div className="absolute top-40 left-3 flex flex-col gap-2 sm:top-36 lg:top-20">
        {hud ? <MiniMap hud={hud} route={route} /> : null}
        <div className={`${panel} flex max-w-[15rem] items-center gap-2 px-3 py-2`}>
          <MapPin className="size-5 shrink-0 text-sky-300" aria-hidden />
          <p className="min-w-0 text-sm leading-tight">
            <span className="block text-xs text-slate-400">Drive to</span>
            <span className="block truncate font-semibold">{trip.name}</span>
          </p>
          <span className="ml-auto shrink-0 text-xs text-slate-300">{hud ? `${hud.left.toFixed(1)} km` : ""}</span>
        </div>
      </div>

      {hud?.turn && hud.turn.metres < 900 ? (
        <div className={`${panel} absolute top-24 left-1/2 flex -translate-x-1/2 items-center gap-2 border-emerald-300/30 bg-emerald-900/70 px-3 py-2 sm:top-20 lg:top-24`}>
          {hud.turn.dir === "left" ? <CornerUpLeft className="size-7 text-white" aria-hidden /> : <CornerUpRight className="size-7 text-white" aria-hidden />}
          <p className="text-sm leading-tight">
            <span className="block font-bold">{hud.turn.metres < 60 ? "Turn now" : `In ${Math.round(hud.turn.metres / 10) * 10} m`}</span>
            <span className="text-emerald-100">
              Turn {hud.turn.dir}
              {hud.turn.road ? ` onto ${hud.turn.road}` : ""}
            </span>
          </p>
        </div>
      ) : null}

      {warn ? <p className={`${panel} absolute top-1/3 left-1/2 -translate-x-1/2 px-4 py-2 text-sm font-semibold text-amber-200`}>{warn}</p> : null}

      <div className="absolute top-1/2 right-3 flex -translate-y-1/2 flex-col items-center gap-2">
        <div className={`${glass} rounded-2xl px-3 py-2 text-center`}>
          <p className="text-2xl leading-none font-black" style={{ fontFamily: GAME_FONT }}>
            {hud?.kmh ?? 0}
          </p>
          <p className="text-[10px] text-slate-300">km/h</p>
        </div>
        <div className={`${glass} pointer-events-auto flex flex-col overflow-hidden rounded-2xl`} role="radiogroup" aria-label="Gear">
          <button type="button" role="radio" aria-checked={!reverse} onClick={() => gear(false)} className={`px-4 py-2 text-lg font-black ${!reverse ? "bg-emerald-500 text-white" : "text-slate-300"}`}>
            D
          </button>
          <button type="button" role="radio" aria-checked={reverse} onClick={() => gear(true)} className={`px-4 py-2 text-lg font-black ${reverse ? "bg-amber-500 text-white" : "text-slate-300"}`}>
            R
          </button>
        </div>
        <button type="button" onClick={() => (driveInput.skip = true)} className={`${glass} pointer-events-auto flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold`}>
          <FastForward className="size-4" aria-hidden /> Skip
        </button>
      </div>

      <div className="absolute bottom-4 left-4">
        <Wheel />
      </div>
      <div className="absolute right-4 bottom-4 flex items-end gap-3">
        <Pedal label="Brake" onChange={(v) => (driveInput.brake = v ? 1 : 0)} className="h-20 w-20 sm:h-24 sm:w-24">
          <span className="block h-10 w-8 -skew-x-12 rounded-md bg-white/90" aria-hidden />
        </Pedal>
        <Pedal label="Accelerate" onChange={(v) => (driveInput.throttle = v ? 1 : 0)} className="h-28 w-24 sm:h-32 sm:w-28">
          <ChevronsUp className="size-14" strokeWidth={3} aria-hidden />
        </Pedal>
      </div>
      <p className="absolute bottom-1 left-1/2 hidden -translate-x-1/2 text-[11px] text-white/80 sm:block">W / ↑ accelerate · S / ↓ brake · A D / ← → steer</p>
    </div>
  );
}
