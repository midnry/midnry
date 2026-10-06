import { useEffect, useRef, useState } from "react";
import type { Game as PhaserGame } from "phaser";
import { EVENTS, place } from "../systems/data";
import { clearToast, doAction, resolveEvent } from "../systems/engine";
import { SLOTS, check, debt, fill, lockReason, naira } from "../systems/rules";
import { bus, input } from "../systems/store";
import type { GameState } from "../systems/types";
import { Phone, type PhoneApp } from "./Phone";
import { btnPrimary, panel } from "./theme";

export function World({ state }: { state: GameState }) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<PhaserGame | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [phone, setPhone] = useState<PhoneApp | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void import("../scenes/WorldScene").then(({ createGame }) => {
      if (cancel || !host.current) return;
      game.current = createGame(host.current);
    });
    const offs = [
      bus.on("near", (id) => {
        setNear(id);
        if (!id) setOpen(null);
      }),
      bus.on("blocked", (message) => setBlocked(message)),
    ];
    return () => {
      cancel = true;
      offs.forEach((off) => off());
      game.current?.destroy(true);
      game.current = null;
    };
  }, []);

  // Keep the map in step with unlocks (homes, flags).
  useEffect(() => {
    const scene = game.current?.scene.getScene("world") as { sync?: () => void } | undefined;
    scene?.sync?.();
  }, [state.flags, state.assets]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(clearToast, 6000);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  useEffect(() => {
    if (!blocked) return;
    const timer = window.setTimeout(() => setBlocked(null), 4000);
    return () => window.clearTimeout(timer);
  }, [blocked]);

  const here = near ? place(near) : undefined;
  const panelOpen = Boolean(here && open === here.id);

  return (
    <div className="fixed inset-0 overflow-hidden bg-stone-950 text-stone-100 select-none">
      <div ref={host} className="absolute inset-0" />
      <Hud state={state} onOpen={setPhone} />

      {state.toast || blocked ? (
        <button
          type="button"
          onClick={() => {
            clearToast();
            setBlocked(null);
          }}
          className={`${panel} absolute top-24 left-1/2 z-20 w-[min(92vw,30rem)] -translate-x-1/2 p-3 text-left text-sm text-pretty sm:top-20`}
        >
          {blocked ?? state.toast}
        </button>
      ) : null}

      {here && !panelOpen ? (
        <button
          type="button"
          className={`${btnPrimary} absolute bottom-36 left-1/2 z-10 -translate-x-1/2 shadow-xl sm:bottom-10`}
          onClick={() => setOpen(here.id)}
        >
          Enter {here.name}
        </button>
      ) : null}

      {panelOpen && here ? (
        <PlacePanel state={state} placeId={here.id} onClose={() => setOpen(null)} onLoans={() => setPhone("loans")} onPhone={() => setPhone("home")} />
      ) : null}

      <Joystick />
      <button
        type="button"
        onClick={() => setPhone("home")}
        className="absolute right-4 bottom-6 z-10 flex size-16 flex-col items-center justify-center rounded-2xl border border-white/15 bg-stone-900/90 text-xs font-semibold shadow-xl"
        aria-label="Open your phone"
      >
        <span className="text-2xl" aria-hidden>
          📱
        </span>
        Phone
      </button>

      {phone ? <Phone state={state} app={phone} onApp={setPhone} onClose={() => setPhone(null)} /> : null}
      {state.event ? <EventModal state={state} /> : null}
      <p className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 text-xs text-stone-400 sm:block">
        WASD or arrows to move · click to walk · E to enter
      </p>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-w-0">
      <div className="flex justify-between gap-1 text-[10px] text-stone-400 uppercase">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Hud({ state, onOpen }: { state: GameState; onOpen: (app: PhoneApp) => void }) {
  const owed = debt(state);
  return (
    <button
      type="button"
      onClick={() => onOpen("stats")}
      className={`${panel} absolute top-3 left-1/2 z-10 grid w-[min(96vw,44rem)] -translate-x-1/2 grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 rounded-2xl px-3 py-2 text-left`}
      aria-label="Your stats"
    >
      <div className="row-span-2">
        <p className="text-lg font-bold tabular-nums text-emerald-400">{naira(state.stats.money)}</p>
        <p className="text-[11px] text-stone-400">
          Day {state.day} · {SLOTS[Math.min(state.slot, 3)]} · Age {Math.floor(state.age)}
          {owed ? <span className="text-red-400"> · owes {naira(owed)}</span> : null}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 sm:grid-cols-5">
        <Bar label="Energy" value={state.stats.energy} tone="bg-emerald-400" />
        <Bar label="Health" value={state.stats.health} tone="bg-sky-400" />
        <Bar label="Stress" value={state.stats.stress} tone="bg-orange-400" />
        <Bar label="Rep" value={state.stats.reputation} tone="bg-amber-300" />
        <Bar label="Heat" value={state.stats.heat} tone="bg-red-500" />
      </div>
    </button>
  );
}

function PlacePanel({
  state,
  placeId,
  onClose,
  onLoans,
  onPhone,
}: {
  state: GameState;
  placeId: string;
  onClose: () => void;
  onLoans: () => void;
  onPhone: () => void;
}) {
  const p = place(placeId)!;
  return (
    <div className={`${panel} absolute inset-x-2 bottom-2 z-20 max-h-[62dvh] overflow-y-auto p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem]`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl">{p.name}</p>
          <p className="mt-1 text-sm text-stone-400 text-pretty">{p.blurb}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onPhone} className="min-h-11 rounded-xl px-3 text-lg hover:bg-white/10" aria-label="Phone">
            📱
          </button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 text-sm text-stone-300 hover:bg-white/10" aria-label="Leave this place">
            ✕
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {p.actions.map((a) => {
          const ok = check(state, a.if);
          const meta = [a.slots ? `${a.slots} slot${a.slots > 1 ? "s" : ""}` : "", a.energy < 0 ? `${a.energy} energy` : a.energy > 0 ? `+${a.energy} energy` : ""]
            .filter(Boolean)
            .join(" · ");
          return (
            <button
              key={a.id}
              type="button"
              disabled={!ok}
              onClick={() => {
                if (doAction(p.id, a.id) === "loans") onLoans();
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-amber-400/60 hover:bg-white/10 disabled:opacity-45"
            >
              <span className="block text-sm font-semibold">{fill(state, a.label)}</span>
              <span className="block text-xs text-stone-400">{ok ? meta : `🔒 ${a.lockedText ?? "Not available yet"}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventModal({ state }: { state: GameState }) {
  const ev = EVENTS.find((item) => item.id === state.event);
  if (!ev) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div className={`${panel} w-full max-w-lg p-5`} role="dialog" aria-modal="true" aria-labelledby="event-title">
        <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">Day {state.day}</p>
        <h2 id="event-title" className="mt-1 font-display text-2xl">
          {ev.title}
        </h2>
        <p className="mt-3 text-pretty text-stone-200">{fill(state, ev.text)}</p>
        <div className="mt-5 grid gap-2">
          {ev.choices.map((item) => {
            const reason = lockReason(state, item);
            const ok = !reason;
            return (
              <button
                key={item.text}
                type="button"
                disabled={!ok}
                onClick={() => resolveEvent(item)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-amber-400/60 hover:bg-white/10 disabled:opacity-45"
              >
                <span className="font-medium">{item.text}</span>
                {!ok ? <span className="mt-0.5 block text-xs text-stone-400">🔒 {reason}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A virtual joystick for touch screens. It writes into the shared input that Phaser reads. */
function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  function move(event: React.PointerEvent) {
    const box = base.current?.getBoundingClientRect();
    if (!box) return;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const max = box.width / 2 - 18;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    setKnob({ x: dx, y: dy });
    input.x = Math.abs(dx) < 6 ? 0 : dx / max;
    input.y = Math.abs(dy) < 6 ? 0 : dy / max;
  }

  function release() {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    input.x = 0;
    input.y = 0;
  }

  if (!touch) return null;
  return (
    <div
      ref={base}
      className="absolute bottom-6 left-4 z-10 size-32 touch-none rounded-full border border-white/15 bg-white/5 backdrop-blur"
      onPointerDown={(event) => {
        active.current = event.pointerId;
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => {
        if (active.current === event.pointerId) move(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      aria-label="Move joystick"
      role="presentation"
    >
      <div
        className="absolute top-1/2 left-1/2 size-14 rounded-full bg-amber-400/80 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
