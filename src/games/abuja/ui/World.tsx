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
  freshenUp,
  resolveEvent,
  skipToNight,
  storyOpen,
  takeOffer,
  talk,
} from "../systems/engine";
import { lifeOf } from "../systems/life";
import { personLook } from "../systems/peoplelook";
import { SLOTS, check, debt, fill, lockReason, naira } from "../systems/rules";
import { bus, getState, input, loadControls, saveControls, type Controls, type NearThing } from "../systems/store";
import type { GameState } from "../systems/types";
import { Phone, type PhoneApp } from "./Phone";
import { isPoorRoom, roomForBuilding, roomForPlace, type RoomInfo } from "../systems/rooms";
import { ChatBubble, ReplyButton } from "./Chat";
import { StoryPanel } from "./StoryView";
import { WardrobePanel } from "./Wardrobe";
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
  const [wardrobe, setWardrobe] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [controls, setControls] = useState<Controls>("joystick");
  useEffect(() => {
    const saved = loadControls();
    input.controls = saved;
    setControls(saved);
  }, []);
  const chooseControls = (next: Controls) => {
    saveControls(next);
    setControls(next);
  };
  const inStory = Boolean(state.chapter);
  // Inside a building: which room, and the loading screen between outside and in.
  const [inside, setInside] = useState<RoomInfo | null>(null);
  const insideRef = useRef<RoomInfo | null>(null);
  const [loading, setLoading] = useState<{ title: string; icon: string } | null>(null);
  const loadStarted = useRef(0);
  const finishLoading = (min = 900) => {
    const wait = Math.max(0, min - (Date.now() - loadStarted.current));
    window.setTimeout(() => setLoading(null), wait);
  };
  const enterRoom = (info: RoomInfo) => {
    const g = game.current;
    if (!g || insideRef.current) return;
    loadStarted.current = Date.now();
    setLoading({ title: `Entering ${info.name}`, icon: ROOM_ICON[info.type] });
    setOpen(null);
    setTalking(null);
    insideRef.current = info;
    setInside(info);
    window.setTimeout(() => {
      g.scene.sleep("world");
      g.scene.start("room", info);
    }, 120);
  };
  const leaveRoom = () => {
    const g = game.current;
    if (!g || !insideRef.current) return;
    loadStarted.current = Date.now();
    setLoading({ title: "Heading back outside", icon: "🚪" });
    setOpen(null);
    setTalking(null);
    window.setTimeout(() => {
      g.scene.stop("room");
      g.scene.wake("world");
      insideRef.current = null;
      setInside(null);
      finishLoading(700);
    }, 160);
  };
  /** Through a door inside a home: bedroom, bathroom, or back to the living room. */
  const switchRoom = (info: RoomInfo) => {
    const g = game.current;
    if (!g || !insideRef.current) return;
    loadStarted.current = Date.now();
    setLoading({ title: info.parent ? `Into the ${info.name.toLowerCase()}` : `Back to ${info.name}`, icon: ROOM_ICON[info.type] });
    setOpen(null);
    setTalking(null);
    insideRef.current = info;
    setInside(info);
    window.setTimeout(() => {
      g.scene.stop("room");
      g.scene.start("room", info);
    }, 120);
  };
  const roomActions = useRef({ enterRoom, leaveRoom, switchRoom });
  roomActions.current = { enterRoom, leaveRoom, switchRoom };
  const finishLoadingRef = useRef(() => finishLoading());
  finishLoadingRef.current = () => finishLoading();

  useEffect(() => {
    let cancel = false;
    void import("../scenes/WorldScene").then(({ createGame }) => {
      if (cancel || !host.current) return;
      game.current = createGame(host.current);
    });
    const interact = (thing: NearThing) => {
      if (thing.kind === "place") {
        const room = roomForPlace(thing.id);
        if (room && !insideRef.current) roomActions.current.enterRoom({ type: room, name: place(thing.id)?.name ?? thing.label, placeId: thing.id });
        else setOpen(thing.id);
      }
      if (thing.kind === "door") {
        const here = insideRef.current;
        if (here && thing.id.startsWith("room:")) {
          roomActions.current.switchRoom({ type: thing.id.slice(5) as RoomInfo["type"], name: thing.label, placeId: here.placeId, parent: here });
        } else {
          const room = roomForBuilding(thing.id, getState()?.background);
          if (room) roomActions.current.enterRoom({ type: room, name: thing.label });
        }
      }
      if (thing.kind === "exit") {
        const parent = insideRef.current?.parent;
        if (parent) roomActions.current.switchRoom(parent);
        else roomActions.current.leaveRoom();
      }
      if (thing.kind === "item") {
        const poor = insideRef.current ? isPoorRoom(insideRef.current.type) : false;
        if (thing.id === "freshen") freshenUp(poor);
        else if (getState()?.chapter) bus.emit("blocked", "Your phone can wait. You're in the middle of growing up.");
        else setPhone(thing.id === "laptop" ? "jobs" : "home");
      }
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
      bus.on("exploring", (on) => setExploring(on)),
      bus.on("roomReady", () => finishLoadingRef.current()),
      // A ride leaves from the street: step outside first.
      bus.on("ride", () => roomActions.current.leaveRoom()),
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
    input.paused = paused || wardrobe;
    input.x = 0;
    input.y = 0;
  }, [paused, wardrobe]);
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
  const showEnter = near && !loading && !exploring && !story && !panelOpen && !talking && !state.event && !state.task?.haggle;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05070c] text-slate-100 select-none">
      <div ref={host} className="absolute inset-0" />
      {inStory ? <ChapterHud state={state} /> : <Hud state={state} onOpen={setPhone} />}

      {beat && !story && !inside ? (
        <button
          type="button"
          onClick={() => bus.emit("goto", null)}
          className={`${panel} absolute top-24 left-1/2 z-10 max-w-[64vw] -translate-x-1/2 px-4 py-2 text-left text-sm shadow-xl hover:bg-[#1a2238] sm:top-20`}
          aria-label={`Walk to ${beat.spot.label}`}
        >
          <span className="block truncate">
            📍 Go to: <span className="font-semibold text-sky-300">{beat.spot.label}</span>
          </span>
          <span className="block text-[11px] text-slate-400">Tap to walk there</span>
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
          {near.kind === "person"
            ? `💬 Talk to ${near.label}`
            : near.kind === "beat"
              ? `▶ ${near.label}`
              : near.kind === "exit"
                ? `🚪 ${near.label}`
                : near.kind === "item"
                  ? near.label
                  : near.kind === "door"
                    ? inside
                      ? `🚪 ${near.label}`
                      : `🚪 Enter ${near.label}`
                    : inside
                      ? `📋 ${near.label}: things to do`
                      : roomForPlace(near.id)
                        ? `🚪 Enter ${near.label}`
                        : `Visit ${near.label}`}
        </button>
      ) : null}

      {panelOpen && here ? (
        <PlacePanel state={state} placeId={here.id} onClose={() => setOpen(null)} onLoans={() => setPhone("loans")} onPhone={() => setPhone("home")} />
      ) : null}
      {talking ? <TalkModal state={state} personKey={talking} onClose={() => setTalking(null)} /> : null}
      {state.task && !inStory ? <TaskPanel state={state} /> : null}
      {state.task?.haggle ? <HaggleModal state={state} /> : null}

      {!story && controls === "joystick" ? <Joystick /> : null}
      <button
        type="button"
        onClick={() => setPaused(true)}
        className="absolute top-24 left-3 z-10 flex size-11 items-center justify-center rounded-xl border border-white/15 bg-[#0d1220]/90 text-xl font-bold shadow-xl hover:bg-[#1a2238] sm:top-20 lg:top-3"
        aria-label="Pause"
      >
        <span className="flex gap-1" aria-hidden>
          <span className="h-4 w-1.5 rounded-sm bg-slate-100" />
          <span className="h-4 w-1.5 rounded-sm bg-slate-100" />
        </span>
      </button>
      <div className={`absolute top-24 right-3 z-10 flex-col gap-2 sm:top-20 lg:top-3 ${inside ? "hidden" : "flex"}`}>
        <MapButton label="Zoom in" onClick={() => bus.emit("camera", "in")}>
          ＋
        </MapButton>
        <MapButton label="Zoom out" onClick={() => bus.emit("camera", "out")}>
          －
        </MapButton>
        <MapButton label={exploring ? "Back to me" : "Explore the map"} active={exploring} onClick={() => bus.emit("camera", exploring ? "follow" : "explore")}>
          {exploring ? "📍" : "🗺️"}
        </MapButton>
        {!inStory && state.slot < SLOTS.length - 1 ? (
          <MapButton label="Skip to night" onClick={skipToNight}>
            🌙
          </MapButton>
        ) : null}
      </div>
      {exploring ? (
        <div className={`${panel} absolute bottom-40 left-1/2 z-20 flex w-[min(92vw,26rem)] -translate-x-1/2 items-center gap-3 p-3 sm:bottom-10`}>
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">👀 Exploring.</span> <span className="text-slate-300">Drag the map (or use the joystick or arrow keys) to look around. Pinch or ＋/－ to zoom.</span>
          </p>
          <button type="button" className={`${btnPrimary} shrink-0`} onClick={() => bus.emit("camera", "follow")}>
            📍 Back to me
          </button>
        </div>
      ) : null}
      {paused ? (
        <PauseMenu
          controls={controls}
          onControls={chooseControls}
          onResume={() => setPaused(false)}
          onWardrobe={() => {
            setPaused(false);
            setWardrobe(true);
          }}
          onQuit={onQuit}
        />
      ) : null}
      {wardrobe ? (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-label="Wardrobe">
          <div className={`${panel} max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-b-none p-4 sm:rounded-b-2xl sm:p-6`}>
            <p className="mb-3 font-display text-2xl">👕 Wardrobe</p>
            <WardrobePanel state={state} onDone={() => setWardrobe(false)} />
          </div>
        </div>
      ) : null}
      {!inStory && !inside ? (
        <button
          type="button"
          onClick={() => setPhone("map")}
          className="absolute right-4 bottom-24 z-10 flex size-16 flex-col items-center justify-center rounded-2xl border border-white/15 bg-blue-600 text-xs font-semibold text-white shadow-xl hover:bg-blue-500"
          aria-label="Get a ride"
        >
          <span className="text-2xl" aria-hidden>
            🛺
          </span>
          Ride
        </button>
      ) : null}
      {!inStory ? (
        <button
          type="button"
          onClick={() => setPhone("home")}
          className="absolute right-4 bottom-6 z-10 flex size-16 flex-col items-center justify-center rounded-2xl border border-white/15 bg-[#0d1220]/90 text-xs font-semibold shadow-xl"
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
      {loading ? <LoadingScreen title={loading.title} icon={loading.icon} /> : null}
      <p className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 text-xs text-slate-400 sm:block">
        WASD or arrows to move · {controls === "tap" ? "click to walk" : "joystick to walk"} · E to interact
      </p>
    </div>
  );
}

const ROOM_ICON: Record<RoomInfo["type"], string> = {
  home_poor: "🏠",
  home_middle: "🏠",
  bedroom_poor: "🛏️",
  bedroom_middle: "🛏️",
  bathroom_poor: "🪣",
  bathroom_middle: "🛁",
  mansion: "🏰",
  office: "🏢",
  bank: "🏦",
  clinic: "🏥",
  shop: "🛍️",
  classroom: "🏫",
  dorm: "🛏️",
  hall: "🎉",
};

const TIPS = [
  "Tip: tap 🗺️ outside to look around the map without moving.",
  "Tip: okadas are fastest, taxis keep you calm.",
  "Tip: 🌙 skips to night. Abuja looks different after dark.",
  "Tip: change your look any time in the Wardrobe.",
  "Tip: talk to people. They remember you.",
];

function LoadingScreen({ title, icon }: { title: string; icon: string }) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]!);
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,#11265c,#05070c_65%)] px-6 text-center" role="status" aria-live="polite">
      <div className="flex size-24 items-center justify-center rounded-3xl border-2 border-white/15 bg-white/10 text-5xl shadow-2xl">
        <span className="animate-bounce" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="mt-6 font-display text-2xl text-white">{title}…</p>
      <div className="mt-5 h-2 w-56 overflow-hidden rounded-full bg-white/15">
        <div className="h-full w-1/3 animate-[loadbar_0.9s_ease-in-out_infinite] rounded-full bg-blue-500" />
      </div>
      <p className="mt-6 max-w-xs text-sm text-slate-300">{tip}</p>
      <style>{`@keyframes loadbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
}

function MapButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex size-11 items-center justify-center rounded-xl border text-lg font-bold shadow-xl transition ${active ? "border-blue-300 bg-blue-600 text-white" : "border-white/15 bg-[#0d1220]/90 text-slate-100 hover:bg-[#1a2238]"}`}
    >
      {children}
    </button>
  );
}

function PauseMenu({
  controls,
  onControls,
  onResume,
  onWardrobe,
  onQuit,
}: {
  controls: Controls;
  onControls: (controls: Controls) => void;
  onResume: () => void;
  onWardrobe: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" role="dialog" aria-label="Paused">
      <div className={`${panel} w-full max-w-sm p-5`}>
        <p className="font-display text-2xl">Paused</p>
        <p className="mt-1 text-sm text-slate-400">Your progress is saved automatically.</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className={btnPrimary} onClick={onResume}>
            ▶ Resume
          </button>
          <button type="button" className={btnGhost} onClick={onWardrobe}>
            👕 Change outfit
          </button>
          <button type="button" className={btnGhost} onClick={onQuit}>
            Save and exit to title
          </button>
        </div>
        <div className="mt-5">
          <p className="text-sm font-semibold">Controls</p>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Controls">
            {(
              [
                ["joystick", "🕹️ Joystick", "Move with the stick"],
                ["tap", "👆 Tap to move", "Tap where to go"],
              ] as const
            ).map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={controls === id}
                onClick={() => onControls(id)}
                className={`rounded-xl border p-3 text-left text-sm transition ${controls === id ? "border-blue-400 bg-blue-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
              >
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-slate-400">{hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Arrow keys and WASD always work on a keyboard.</p>
        </div>
        <div className="mt-5 rounded-xl bg-white/5 p-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">How to play</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Move with the joystick or by tapping where you want to go (pick one under Controls), or with WASD or the arrow keys.</li>
            <li>Tap the “Go to” banner (or “Go” on a job) to walk to your goal automatically.</li>
            <li>Walk up to people and places, then tap the yellow button (or press E) to talk or enter.</li>
            <li>＋ and － (or pinch, or the mouse wheel) zoom in and out.</li>
            <li>🗺️ Explore lets you look around the map without moving; 📍 brings you back.</li>
            <li>🌙 skips ahead to night in the city.</li>
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
        <p className="truncate text-xs font-semibold tracking-widest text-sky-400 uppercase">{def?.title}</p>
        <p className="text-[11px] text-slate-400">
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
      <div className="flex justify-between gap-1 text-[10px] text-slate-400 uppercase">
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
  const l = lifeOf(state);
  return (
    <button
      type="button"
      onClick={() => onOpen("stats")}
      className={`${panel} absolute top-3 left-1/2 z-10 grid w-[min(96vw,44rem)] -translate-x-1/2 grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 rounded-2xl px-3 py-2 text-left`}
      aria-label="Your stats"
    >
      <div className="row-span-2">
        <p className="text-lg font-bold tabular-nums text-emerald-400">{naira(state.stats.money)}</p>
        <p className="text-[11px] text-slate-400">
          Day {state.day} · {SLOTS[Math.min(state.slot, 3)]} · Age {Math.floor(state.age)}
          {owed ? <span className="text-red-400"> · owes {naira(owed)}</span> : null}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-1 sm:grid-cols-7">
        <Bar label="Energy" value={state.stats.energy} tone="bg-emerald-400" />
        <Bar label="Health" value={state.stats.health} tone="bg-sky-400" />
        <Bar label="Food" value={l.food} tone={l.food < 25 ? "bg-red-500" : "bg-amber-400"} />
        <Bar label="Water" value={l.water} tone={l.water < 25 ? "bg-red-500" : "bg-cyan-300"} />
        <Bar label="Stress" value={state.stats.stress} tone="bg-orange-400" />
        <Bar label="Rep" value={state.stats.reputation} tone="bg-violet-300" />
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
          <p className="mt-1 text-sm text-slate-400 text-pretty">{p.blurb}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onPhone} className="min-h-11 rounded-xl px-3 text-lg hover:bg-white/10" aria-label="Phone">
            📱
          </button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 text-sm text-slate-300 hover:bg-white/10" aria-label="Leave this place">
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
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-blue-400/60 hover:bg-white/10 disabled:opacity-45"
            >
              <span className="block text-sm font-semibold">{fill(state, a.label)}</span>
              <span className="block text-xs text-slate-400">{ok ? meta : `🔒 ${a.lockedText ?? "Not available yet"}`}</span>
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
        <p className="text-xs font-semibold tracking-widest text-sky-400 uppercase">Day {state.day}</p>
        <h2 id="event-title" className="mt-1 font-display text-2xl">
          {ev.title}
        </h2>
        <p className="mt-3 text-pretty text-slate-200">{fill(state, ev.text)}</p>
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
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-blue-400/60 hover:bg-white/10 disabled:opacity-45"
              >
                <span className="font-medium">{item.text}</span>
                {!ok ? <span className="mt-0.5 block text-xs text-slate-400">🔒 {reason}</span> : null}
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
        className="absolute top-1/2 left-1/2 size-14 rounded-full bg-blue-500/85 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

function TalkModal({ state, personKey, onClose }: { state: GameState; personKey: string; onClose: () => void }) {
  const person = findPerson(personKey);
  if (!person) return null;
  const offer = offerFor(state, person);
  const them = personLook(person);
  const adult = state.age >= 18;
  return (
    <div className="absolute inset-x-2 bottom-2 z-30 max-h-[80dvh] overflow-y-auto sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem]" role="dialog" aria-label={`Talking to ${person.name}`}>
      <div className="grid gap-4 pb-1">
        <ChatBubble name={person.name} looks={them.look} adult={them.adult}>
          {lineFor(state, person)}
          {offer ? <span className="mt-2 block">{fill(state, offer.text)}</span> : null}
        </ChatBubble>
        <div className="mt-1 grid gap-2 pl-8">
          {offer?.choices.map((choice) => {
            const reason = lockReason(state, choice);
            return (
              <ReplyButton
                key={choice.text}
                looks={state.looks}
                adult={adult}
                disabled={Boolean(reason)}
                note={reason}
                onClick={() => {
                  takeOffer(personKey, choice);
                  onClose();
                }}
              >
                {fill(state, choice.text)}
              </ReplyButton>
            );
          })}
          <ReplyButton looks={state.looks} adult={adult} onClick={onClose}>
            {offer ? "Not now 👋" : "Bye 👋"}
          </ReplyButton>
        </div>
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
        <p className={`text-xs tabular-nums ${left === 0 ? "text-red-400" : "text-slate-300"}`}>
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
        <p className="mt-1 text-xs text-slate-400">Counter for {naira(Math.round((h.offer * 1.4) / 100) * 100)}? They might agree, or cancel.</p>
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
