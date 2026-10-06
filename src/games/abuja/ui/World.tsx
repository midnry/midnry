import { useEffect, useRef, useState } from "react";
import type { Game as PhaserGame } from "phaser";
import { EVENTS, chapter, place } from "../systems/data";
import {
  abandonTask,
  clearToast,
  currentBeat,
  doAction,
  findPerson,
  haggle,
  lineFor,
  offerFor,
  reachBeat,
  resolveEvent,
  storyOpen,
  takeOffer,
  talk,
} from "../systems/engine";
import { SLOTS, check, debt, fill, lockReason, naira } from "../systems/rules";
import { bus, input, type NearThing } from "../systems/store";
import type { GameState } from "../systems/types";
import { Phone, type PhoneApp } from "./Phone";
import { StoryPanel } from "./StoryView";
import { btnGhost, btnPrimary, panel } from "./theme";

/** The walkable game: story chapters and adult Abuja share this view. */
export function World({ state, onQuit }: { state: GameState; onQuit: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<PhaserGame | null>(null);
  const [near, setNear] = useState<NearThing | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [talking, setTalking] = useState<string | null>(null);
  const [phone, setPhone] = useState<PhoneApp | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const inStory = Boolean(state.chapter);

  useEffect(() => {
    let cancel = false;
    void import("../scenes/WorldScene").then(({ createGame }) => {
      if (cancel || !host.current) return;
      game.current = createGame(host.current);
    });
    const interact = (thing: NearThing) => {
      if (thing.kind === "place") setOpen(thing.id);
      if (thing.kind === "person") {
        talk(thing.id);
        setTalking(thing.id);
      }
      if (thing.kind === "beat") reachBeat();
    };
    const offs = [
      bus.on("near", (thing) => {
        setNear(thing);
        if (!thing) {
          setOpen(null);
          setTalking(null);
        }
      }),
      bus.on("interact", interact),
      bus.on("blocked", (message) => setBlocked(message)),
    ];
    return () => {
      cancel = true;
      offs.forEach((off) => off());
      game.current?.destroy(true);
      game.current = null;
    };
  }, []);

  // The world stands still while the pause menu is open. Esc or P toggles it.
  useEffect(() => {
    input.paused = paused;
    input.x = 0;
    input.y = 0;
  }, [paused]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "p" || event.key === "P") setPaused((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      input.paused = false;
    };
  }, []);

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

  const story = inStory && storyOpen(state);
  const beat = currentBeat(state);
  const here = near && near.kind === "place" ? place(near.id) : undefined;
  const panelOpen = Boolean(here && open === here.id);
  const showEnter = near && !story && !panelOpen && !talking && !state.event && !state.task?.haggle;

  return (
    <div className="fixed inset-0 overflow-hidden bg-stone-950 text-stone-100 select-none">
      <div ref={host} className="absolute inset-0" />
      {inStory ? <ChapterHud state={state} /> : <Hud state={state} onOpen={setPhone} />}

      {beat && !story ? (
        <button
          type="button"
          onClick={() => bus.emit("goto", null)}
          className={`${panel} absolute top-24 left-1/2 z-10 max-w-[64vw] -translate-x-1/2 px-4 py-2 text-left text-sm shadow-xl hover:bg-stone-800 sm:top-20`}
          aria-label={`Walk to ${beat.spot.label}`}
        >
          <span className="block truncate">
            📍 Go to: <span className="font-semibold text-amber-300">{beat.spot.label}</span>
          </span>
          <span className="block text-[11px] text-stone-400">Tap to walk there</span>
        </button>
      ) : null}

      {(state.toast || blocked) && !story ? (
        <button
          type="button"
          onClick={() => {
            clearToast();
            setBlocked(null);
          }}
          className={`${panel} absolute ${state.task ? "top-48 sm:top-44" : "top-36 sm:top-32"} left-1/2 z-20 w-[min(92vw,30rem)] -translate-x-1/2 p-3 text-left text-sm text-pretty`}
        >
          {blocked ?? state.toast}
        </button>
      ) : null}

      {showEnter ? (
        <button
          type="button"
          className={`${btnPrimary} absolute bottom-40 left-1/2 z-10 max-w-[70vw] -translate-x-1/2 shadow-xl sm:bottom-10`}
          onClick={() => bus.emit("interact", near)}
        >
          {near.kind === "person" ? `💬 Talk to ${near.label}` : near.kind === "beat" ? `▶ ${near.label}` : `Enter ${near.label}`}
        </button>
      ) : null}

      {panelOpen && here ? (
        <PlacePanel state={state} placeId={here.id} onClose={() => setOpen(null)} onLoans={() => setPhone("loans")} onPhone={() => setPhone("home")} />
      ) : null}
      {talking ? <TalkModal state={state} personKey={talking} onClose={() => setTalking(null)} /> : null}
      {state.task && !inStory ? <TaskPanel state={state} /> : null}
      {state.task?.haggle ? <HaggleModal state={state} /> : null}

      {!story ? <Joystick /> : null}
      <button
        type="button"
        onClick={() => setPaused(true)}
        className="absolute top-24 left-3 z-10 flex size-11 items-center justify-center rounded-xl border border-white/15 bg-stone-900/90 text-xl font-bold shadow-xl hover:bg-stone-800 sm:top-20 lg:top-3"
        aria-label="Pause"
      >
        ⏸
      </button>
      {paused ? <PauseMenu onResume={() => setPaused(false)} onQuit={onQuit} /> : null}
      {!inStory ? (
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
      ) : null}

      {phone && !inStory ? <Phone state={state} app={phone} onApp={setPhone} onClose={() => setPhone(null)} /> : null}
      {state.event ? <EventModal state={state} /> : null}
      {story ? (
        <div className="absolute inset-0 z-40 overflow-y-auto bg-black/55 px-3 py-6 backdrop-blur-[2px] sm:py-12">
          <StoryPanel state={state} />
        </div>
      ) : null}
      <p className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 text-xs text-stone-400 sm:block">
        WASD or arrows to move · click to walk · E to interact
      </p>
    </div>
  );
}

function PauseMenu({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" role="dialog" aria-label="Paused">
      <div className={`${panel} w-full max-w-sm p-5`}>
        <p className="font-display text-2xl">Paused</p>
        <p className="mt-1 text-sm text-stone-400">Your progress is saved automatically.</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className={btnPrimary} onClick={onResume}>
            ▶ Resume
          </button>
          <button type="button" className={btnGhost} onClick={onQuit}>
            Save and exit to title
          </button>
        </div>
        <div className="mt-5 rounded-xl bg-white/5 p-3 text-xs text-stone-300">
          <p className="font-semibold text-stone-200">How to play</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Move with the joystick, WASD or the arrow keys, or tap/click where you want to go.</li>
            <li>Tap the “Go to” banner (or “Go” on a job) to walk to your goal automatically.</li>
            <li>Walk up to people and places, then tap the yellow button (or press E) to talk or enter.</li>
            <li>Esc or P pauses the game.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ChapterHud({ state }: { state: GameState }) {
  const def = chapter(state.chapter ?? "");
  return (
    <div className={`${panel} absolute top-3 left-1/2 z-10 flex w-[min(96vw,36rem)] -translate-x-1/2 items-center justify-between gap-3 px-4 py-2`}>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold tracking-widest text-amber-400 uppercase">{def?.title}</p>
        <p className="text-[11px] text-stone-400">
          {state.name} · age {Math.floor(state.age)}
        </p>
      </div>
      <p className="font-bold tabular-nums text-emerald-400">{naira(state.stats.money)}</p>
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

function TalkModal({ state, personKey, onClose }: { state: GameState; personKey: string; onClose: () => void }) {
  const person = findPerson(personKey);
  if (!person) return null;
  const offer = offerFor(state, person);
  return (
    <div className="absolute inset-x-2 bottom-2 z-30 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem]">
      <div className={`${panel} p-4`} role="dialog" aria-label={`Talking to ${person.name}`}>
        <div className="flex items-center gap-3">
          <span className="size-10 shrink-0 rounded-full" style={{ background: person.color }} aria-hidden />
          <p className="flex-1 font-display text-xl">{person.name}</p>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 text-sm text-stone-300 hover:bg-white/10" aria-label="End conversation">
            ✕
          </button>
        </div>
        <p className="mt-3 text-pretty text-stone-200">{lineFor(state, person)}</p>
        {offer ? (
          <div className="mt-3 rounded-xl bg-black/30 p-3">
            <p className="text-sm text-pretty text-stone-200">{fill(state, offer.text)}</p>
            <div className="mt-2 grid gap-2">
              {offer.choices.map((choice) => {
                const reason = lockReason(state, choice);
                return (
                  <button
                    key={choice.text}
                    type="button"
                    disabled={Boolean(reason)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm transition hover:border-amber-400/60 disabled:opacity-45"
                    onClick={() => {
                      takeOffer(personKey, choice);
                      onClose();
                    }}
                  >
                    {fill(state, choice.text)}
                    {reason ? <span className="mt-0.5 block text-xs text-stone-400">🔒 {reason}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TaskPanel({ state }: { state: GameState }) {
  const task = state.task!;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  const step = task.steps[task.index];
  if (!step) return null;
  const left = Math.max(0, Math.ceil(task.limit - (now - task.stepStarted) / 1000));
  const title = task.kind === "delivery" ? "Delivery shift" : task.kind === "hawk" ? "Hawking at Wuse Market" : task.app === "ownprice" ? "OwnPrice driver" : "Zoom driver";
  const done = task.kind === "hawk" ? task.index : Math.floor(task.index / 2);
  const total = task.kind === "hawk" ? task.steps.length : task.steps.length / 2;
  return (
    <div className={`${panel} absolute top-24 left-1/2 z-10 flex w-[min(96vw,30rem)] -translate-x-1/2 items-center gap-3 px-3 py-2 text-sm sm:top-20`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold tracking-widest text-cyan-300 uppercase">
          {title} · {done}/{total} · {naira(task.earned)}
        </p>
        <p className="truncate font-semibold">★ {step.label}</p>
        <p className={`text-xs tabular-nums ${left === 0 ? "text-red-400" : "text-stone-300"}`}>
          {left === 0 ? "Running late!" : `${left}s to get there on time`}
        </p>
      </div>
      <button type="button" className={`${btnPrimary} min-h-9 shrink-0 px-3`} onClick={() => bus.emit("goto", null)} aria-label={`Walk to ${step.label}`}>
        Go
      </button>
      <button type="button" className={`${btnGhost} min-h-9 shrink-0 px-3`} onClick={abandonTask}>
        Stop
      </button>
    </div>
  );
}

function HaggleModal({ state }: { state: GameState }) {
  const h = state.task!.haggle!;
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className={`${panel} w-full max-w-sm p-5`} role="dialog" aria-label="Fare offer">
        <p className="text-xs font-semibold tracking-widest text-cyan-300 uppercase">OwnPrice</p>
        <p className="mt-2 text-lg text-pretty">
          {h.passenger} offers <span className="font-bold text-emerald-400">{naira(h.offer)}</span> for this trip.
        </p>
        <p className="mt-1 text-xs text-stone-400">Counter for {naira(Math.round((h.offer * 1.4) / 100) * 100)}? They might agree, or cancel.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className={btnPrimary} onClick={() => haggle(true)}>
            Accept
          </button>
          <button type="button" className={btnGhost} onClick={() => haggle(false)}>
            Counter
          </button>
        </div>
      </div>
    </div>
  );
}
