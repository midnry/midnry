import { LoadingScreen } from "./LoadingScreen";
import { GameLoadingContext } from "./loading-context";
import { myLooks } from "../systems/painted";
import { useContext, useEffect, useRef, useState } from "react";
import { Brain, CarFront, ChevronRight, DoorOpen, Droplet, Hand, Heart, LocateFixed, Map as MapIcon, MapPin, MessageCircle, Minus, Moon, Pause, Play, Plus, Search, Siren, Smartphone, Sofa, SquareParking, Star, Sunrise, Utensils, Zap } from "lucide-react";
import type { Game as PhaserGame } from "phaser";
import { EVENTS, chapter, districtAt, place } from "../systems/data";
import {
  abandonTask,
  clearToast,
  currentBeat,
  doAction,
  drive,
  findPerson,
  haggle,
  insult,
  lineFor,
  offerFor,
  reachBeat,
  freshenUp,
  resolveEvent,
  savePosition,
  skipToMorning,
  skipToNight,
  storyOpen,
  takeOffer,
  talk,
  memoryKey,
  finishGame,
} from "../systems/engine";
import { onTheirMind } from "../systems/memory";
import { MiniGame } from "./MiniGame";
import { ACT_ONE, storyGoal } from "../systems/story";
import { hasCar, isDriving } from "../systems/drive";
import { blocked } from "../systems/negotiate/core";
import { deal as dealDef } from "../systems/negotiate/deals";
import { isDirty, lifeOf } from "../systems/life";
import { personLook } from "../systems/peoplelook";
import { SLOTS, beatKey, check, debt, fill, lockReason, naira } from "../systems/rules";
import { bus, getState, input, loadControls, saveControls, type Controls, type NearThing } from "../systems/store";
import type { GameState } from "../systems/types";
import { Phone, type PhoneApp } from "./Phone";
import { isPoorRoom, roomForBuilding, roomForPlace, type RoomInfo } from "../systems/rooms";
import { ChatBubble, ReplyButton } from "./Chat";
import { NegotiationScreen } from "./Negotiation";
import { LotPanel } from "./LotPanel";
import { KitchenScreen, type KitchenOpen } from "./kitchen/Kitchen";
import { StoryPanel } from "./StoryView";
import { WardrobePanel } from "./Wardrobe";
import { DecorPanel } from "./Decor";
import { DriveHudView } from "./DriveHud";
import { MONTHS, SEASON_NAMES, weatherOf } from "../systems/weather";
import { isMyRoom } from "../systems/decor";
import { GAME_FONT, actionBtn, btnGhost, btnPrimary, glass, iconBtn, panel } from "./theme";

/** The walkable game: story chapters and adult Abuja share this view. */
export function World({ state, onQuit }: { state: GameState; onQuit: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<PhaserGame | null>(null);
  const [near, setNear] = useState<NearThing | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [lotOpen, setLotOpen] = useState<string | null>(null);
  const [talking, setTalking] = useState<string | null>(null);
  const [phone, setPhone] = useState<PhoneApp | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [wardrobe, setWardrobe] = useState(false);
  const [decorating, setDecorating] = useState(false);
  /** Driving yourself somewhere: the behind-the-car view is on. */
  const [trip, setTrip] = useState<{ from: { x: number; y: number }; to: { x: number; y: number }; name: string } | null>(null);
  const tripRef = useRef<typeof trip>(null);
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
  const negotiation = state.life?.neg?.active ?? null;
  const [kitchenOpen, setKitchenOpen] = useState<KitchenOpen | null>(null);
  // Inside a building: which room, and the loading screen between outside and in.
  const [inside, setInside] = useState<RoomInfo | null>(null);
  const insideRef = useRef<RoomInfo | null>(null);
  const [loading, setLoading] = useState<{ title: string; icon: string; progress?: number; error?: string } | null>({ title: "Loading your next chapter", icon: "✦" });
  const presentedLoading = useContext(GameLoadingContext)?.visible ?? false;
  const isLoading = Boolean(loading) || presentedLoading;
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleTransition = (action: () => void) => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    // Give the browser a frame to paint the screen before constructing a scene.
    transitionTimer.current = setTimeout(action, 120);
  };
  const enterRoom = (info: RoomInfo) => {
    const g = game.current;
    if (!g || insideRef.current || isLoading) return;
    setLoading({ title: `Entering ${info.name}`, icon: ROOM_ICON[info.type] });
    setOpen(null);
    setTalking(null);
    setDecorating(false);
    insideRef.current = info;
    setInside(info);
    scheduleTransition(() => {
      g.scene.sleep("world");
      g.scene.start("room", info);
    });
  };
  const leaveRoom = () => {
    const g = game.current;
    if (!g || !insideRef.current || isLoading) return;
    setLoading({ title: "Heading back outside", icon: "🚪" });
    setOpen(null);
    setTalking(null);
    setDecorating(false);
    scheduleTransition(() => {
      g.scene.stop("room");
      g.scene.wake("world");
      insideRef.current = null;
      setInside(null);
    });
  };
  /** Through a door inside a home: bedroom, bathroom, or back to the living room. */
  const switchRoom = (info: RoomInfo) => {
    const g = game.current;
    if (!g || !insideRef.current || isLoading) return;
    setLoading({ title: info.parent ? `Into the ${info.name.toLowerCase()}` : `Back to ${info.name}`, icon: ROOM_ICON[info.type] });
    setOpen(null);
    setTalking(null);
    setDecorating(false);
    insideRef.current = info;
    setInside(info);
    scheduleTransition(() => {
      g.scene.stop("room");
      g.scene.start("room", info);
    });
  };
  /** Behind the wheel: out of any room, the map asleep, the driving view on. */
  const startDrive = (t: { from: { x: number; y: number }; to: { x: number; y: number }; name: string }) => {
    const g = game.current;
    if (!g) return;
    setOpen(null);
    setTalking(null);
    setDecorating(false);
    setPhone(null);
    setNear(null);
    tripRef.current = t;
    setTrip(t);
    scheduleTransition(() => {
      if (insideRef.current) {
        g.scene.stop("room");
        insideRef.current = null;
        setInside(null);
      } else g.scene.sleep("world");
      g.scene.start("drive", t);
    });
  };
  /** Arrived: back on the map, standing where you parked. */
  const endDrive = () => {
    const g = game.current;
    if (!g) return;
    g.scene.stop("drive");
    g.scene.wake("world");
    // Out of the car by the kerb at the destination (the map may have saved your old spot meanwhile).
    const t = tripRef.current;
    tripRef.current = null;
    setTrip(null);
    if (t) {
      bus.emit("teleport", t.to);
      savePosition(t.to.x, t.to.y, districtAt(t.to.x, t.to.y)?.id ?? getState()?.district ?? "");
    }
  };
  const roomActions = useRef({ enterRoom, leaveRoom, switchRoom, startDrive, endDrive });
  roomActions.current = { enterRoom, leaveRoom, switchRoom, startDrive, endDrive };

  useEffect(() => {
    let cancel = false;
    // Wait (briefly) for the game font, so names on the map aren't drawn in a fallback face.
    const fonts = typeof document !== "undefined" && document.fonts ? Promise.all([document.fonts.load('800 14px "Nunito"'), document.fonts.load('700 14px "Nunito"')]) : Promise.resolve();
    void Promise.all([import("../scenes/WorldScene"), Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))])]).then(([{ createGame }]) => {
      if (cancel || !host.current) return;
      game.current = createGame(host.current);
    }).catch(() => {
      if (!cancel) setLoading({ title: "Loading Abuja", icon: "!", error: "We couldn't load the game files. Check your connection and reload to try again." });
    });
    const interact = (thing: NearThing) => {
      if (thing.kind === "place") {
        const room = roomForPlace(thing.id);
        if (room && !insideRef.current) roomActions.current.enterRoom({ type: room, name: place(thing.id)?.name ?? thing.label, placeId: thing.id });
        else setOpen(thing.id);
      }
      if (thing.kind === "lot") {
        setLotOpen(thing.id);
        return;
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
        else if (thing.id === "kitchen") {
          if (getState()?.chapter) bus.emit("blocked", "Mama's kitchen, Mama's rules. You'll cook for yourself when you're grown.");
          else if (!insideRef.current?.placeId?.startsWith("home_") && !insideRef.current?.parent?.placeId?.startsWith("home_")) bus.emit("blocked", "This isn't your kitchen. Cook at home.");
          else setKitchenOpen({ at: "home", market: null, tab: "cook" });
        }
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
      bus.on("sceneLoading", ({ title, progress }) => setLoading((previous) => previous?.error ? previous : ({ title, progress, icon: insideRef.current ? ROOM_ICON[insideRef.current.type] : "✦" }))),
      bus.on("sceneReady", () => setLoading((previous) => previous?.error ? previous : null)),
      bus.on("sceneLoadError", () => setLoading({ title: "Loading game artwork", icon: "!", error: "Some game artwork couldn't load. Reload to try again." })),
      bus.on("kitchen", (open) => {
        setOpen(null);
        setKitchenOpen(open);
      }),
      // A ride leaves from the street: step outside first.
      bus.on("ride", () => roomActions.current.leaveRoom()),
      bus.on("chaseDrive", (t) => roomActions.current.startDrive(t)),
      bus.on("driveDone", () => roomActions.current.endDrive()),
    ];
    return () => {
      cancel = true;
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      input.paused = false;
      offs.forEach((off) => off());
      game.current?.destroy(true);
      game.current = null;
    };
  }, []);

  // The world stands still while the pause menu is open. Esc or P toggles it.
  useEffect(() => {
    input.paused = paused || wardrobe || decorating || Boolean(negotiation) || Boolean(kitchenOpen) || isLoading;
    input.x = 0;
    input.y = 0;
  }, [paused, wardrobe, decorating, negotiation, kitchenOpen, isLoading]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isLoading) return;
      if (event.key === "Escape" || event.key === "p" || event.key === "P") setPaused((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [isLoading]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(clearToast, 6000);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  // The city sleeps behind a sports-day mini-game, so the game gets the whole device.
  const playing = Boolean(state.minigame);
  useEffect(() => {
    const g = game.current;
    if (!g) return;
    if (playing) g.loop.sleep();
    else g.loop.wake();
  }, [playing]);

  useEffect(() => {
    if (!blocked) return;
    const timer = window.setTimeout(() => setBlocked(null), 4000);
    return () => window.clearTimeout(timer);
  }, [blocked]);

  const story = inStory && storyOpen(state);
  const beat = currentBeat(state);
  const goal = !inStory && !state.task ? storyGoal(state) : null;
  const here = near && near.kind === "place" ? place(near.id) : undefined;
  const panelOpen = Boolean(here && open === here.id);
  const showEnter = near && !lotOpen && !isLoading && !exploring && !story && !panelOpen && !talking && !state.event && !state.task?.haggle;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05070c] text-slate-100 select-none">
      <div className="contents" inert={isLoading}>
      <div ref={host} className="absolute inset-0" />
      {inStory ? <ChapterHud state={state} /> : <Hud state={state} onOpen={setPhone} />}

      {beat && !story && !inside ? (
        <button
          type="button"
          onClick={() => bus.emit("goto", null)}
          className={`${glass} absolute top-24 left-1/2 z-10 flex max-w-[70vw] -translate-x-1/2 items-center gap-2.5 rounded-2xl py-2 pr-4 pl-2.5 text-left text-sm hover:bg-[#1e2740]/90 sm:top-[5.5rem]`}
          style={{ fontFamily: GAME_FONT }}
          aria-label={`Walk to ${beat.spot.label}`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500 shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]">
            <MapPin className="size-[18px] text-white" strokeWidth={2.6} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-bold">
              Go to <span className="text-sky-300">{beat.spot.label}</span>
            </span>
            <span className="block text-[11px] font-semibold text-slate-400">Tap to walk there</span>
          </span>
        </button>
      ) : null}

      {goal && !beat && !inside && !state.event ? (
        <button
          type="button"
          onClick={() => bus.emit("goto", null)}
          className={`${glass} absolute top-24 left-1/2 z-10 flex w-max max-w-[min(calc(100vw-8.5rem),26rem)] -translate-x-1/2 items-center gap-2.5 rounded-2xl py-2 pr-4 pl-2.5 text-left text-sm hover:bg-[#1e2740]/90 sm:top-[5.5rem]`}
          style={{ fontFamily: GAME_FONT }}
          aria-label={`${ACT_ONE}: ${goal.text}. Walk there`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]">
            <MapPin className="size-[18px]" strokeWidth={2.6} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wide text-amber-300 uppercase">{ACT_ONE}</span>
            <span className="block font-bold text-pretty">{goal.text}</span>
          </span>
        </button>
      ) : null}

      {(state.toast || blocked) && !story ? (
        <button
          type="button"
          onClick={() => {
            clearToast();
            setBlocked(null);
          }}
          className={`${glass} absolute ${state.task ? "top-48 sm:top-44" : "top-36 sm:top-32"} left-1/2 z-20 w-[min(92vw,30rem)] -translate-x-1/2 rounded-2xl p-3 text-left text-sm font-semibold text-pretty`}
          style={{ fontFamily: GAME_FONT }}
        >
          {blocked ?? state.toast}
        </button>
      ) : null}

      {showEnter ? (
        <button
          type="button"
          className={`${glass} absolute bottom-40 left-1/2 z-10 flex h-12 max-w-[78vw] -translate-x-1/2 items-center gap-2.5 rounded-full pr-4 pl-3 text-[15px] font-extrabold text-white transition hover:bg-[#1e2740]/90 active:scale-[0.98] sm:bottom-12`}
          style={{ fontFamily: GAME_FONT }}
          onClick={() => bus.emit("interact", near)}
        >
          <PromptIcon kind={near.kind === "place" && !inside && !roomForPlace(near.id) ? "visit" : near.kind} />
          <span className="truncate">
            {near.kind === "lot"
              ? near.label
              : near.kind === "person"
                ? `Talk to ${near.label}`
                : near.kind === "beat" || near.kind === "exit" || near.kind === "item"
                  ? near.label.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, "")
                  : near.kind === "door"
                    ? inside
                      ? near.label
                      : `Enter ${near.label}`
                    : inside
                      ? `${near.label}: things to do`
                      : roomForPlace(near.id)
                        ? `Enter ${near.label}`
                        : `Visit ${near.label}`}
          </span>
          <ChevronRight className="size-5 shrink-0 text-slate-300" strokeWidth={3} aria-hidden />
        </button>
      ) : null}

      {panelOpen && here ? (
        <PlacePanel state={state} placeId={here.id} onClose={() => setOpen(null)} onApp={setPhone} onPhone={() => setPhone("home")} />
      ) : null}
      {lotOpen && near?.kind === "lot" && near.id === lotOpen && !inside ? (
        <LotPanel
          state={state}
          lotId={lotOpen}
          onClose={() => setLotOpen(null)}
          onEnter={(type, name) => {
            setLotOpen(null);
            roomActions.current.enterRoom({ type, name });
          }}
        />
      ) : null}
      {talking ? <TalkModal state={state} personKey={talking} onClose={() => setTalking(null)} /> : null}
      {state.task && !inStory ? <TaskPanel state={state} /> : null}
      {state.task?.haggle ? <HaggleModal state={state} /> : null}

      {!story && controls === "joystick" && !trip ? <Joystick /> : null}
      {trip ? <DriveHudView trip={trip} /> : null}
      <button
        type="button"
        onClick={() => setPaused(true)}
        className={`${iconBtn} absolute top-24 left-3 z-10 sm:top-20 lg:top-3`}
        aria-label="Pause"
      >
        <Pause className="size-5" fill="currentColor" strokeWidth={0} aria-hidden />
      </button>
      <div className={`absolute top-24 right-3 z-10 flex-col gap-2 sm:top-20 lg:top-3 ${inside || trip ? "hidden" : "flex"}`}>
        <MapButton label="Zoom in" onClick={() => bus.emit("camera", "in")}>
          <Plus className="size-5" strokeWidth={3} aria-hidden />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => bus.emit("camera", "out")}>
          <Minus className="size-5" strokeWidth={3} aria-hidden />
        </MapButton>
        <MapButton label={exploring ? "Back to me" : "Explore the map"} active={exploring} onClick={() => bus.emit("camera", exploring ? "follow" : "explore")}>
          {exploring ? <LocateFixed className="size-5" strokeWidth={2.5} aria-hidden /> : <MapIcon className="size-5 text-emerald-300" strokeWidth={2.5} aria-hidden />}
        </MapButton>
        {!inStory && state.slot < SLOTS.length - 1 ? (
          <MapButton label="Skip to night" onClick={skipToNight}>
            <Moon className="size-5 text-amber-300" fill="currentColor" strokeWidth={2} aria-hidden />
          </MapButton>
        ) : null}
        {!inStory && state.slot >= SLOTS.length - 1 ? (
          <MapButton label="Sleep till morning" onClick={skipToMorning}>
            <Sunrise className="size-5 text-amber-300" strokeWidth={2.4} aria-hidden />
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
      {!inStory && !inside && !trip && hasCar(state) ? (
        <button
          type="button"
          onClick={drive}
          className={`${actionBtn} absolute right-4 bottom-[11rem] z-10 ${isDriving(state) ? "bg-blue-600 text-white ring-2 ring-blue-300/60" : `${glass} text-slate-50`}`}
          style={{ fontFamily: GAME_FONT }}
          aria-label={isDriving(state) ? "Park and get out" : "Drive your car"}
        >
          {isDriving(state) ? <SquareParking className="size-7" strokeWidth={2.4} aria-hidden /> : <CarFront className="size-7" strokeWidth={2.4} aria-hidden />}
          {isDriving(state) ? "Park" : "Drive"}
        </button>
      ) : null}
      {!inStory && !inside && !trip ? (
        <button
          type="button"
          onClick={() => setPhone("map")}
          className={`${actionBtn} absolute right-4 bottom-[6.25rem] z-10 border border-blue-300/40 bg-gradient-to-b from-[#285949] to-[#163c37] text-white hover:brightness-110`}
          style={{ fontFamily: GAME_FONT }}
          aria-label="Get a ride"
        >
          <CarFront className="size-7" strokeWidth={2.4} aria-hidden />
          Ride
        </button>
      ) : null}
      {inside && isMyRoom(state, inside) && !decorating ? (
        <button
          type="button"
          onClick={() => setDecorating(true)}
          className={`${actionBtn} absolute right-4 bottom-[6.25rem] z-10 border border-amber-300/40 bg-gradient-to-b from-[#b7791f] to-[#8a5a12] text-white hover:brightness-110`}
          style={{ fontFamily: GAME_FONT }}
          aria-label="Decorate your room"
        >
          <Sofa className="size-7" strokeWidth={2.4} aria-hidden />
          Decorate
        </button>
      ) : null}
      {decorating && inside ? <DecorPanel state={state} info={inside} onClose={() => setDecorating(false)} /> : null}
      {!inStory && !decorating && !trip ? (
        <button
          type="button"
          onClick={() => setPhone("home")}
          className={`${actionBtn} ${glass} absolute right-4 bottom-6 z-10 text-slate-50 hover:bg-[#1e2740]/90`}
          style={{ fontFamily: GAME_FONT }}
          aria-label="Open your phone"
        >
          <Smartphone className="size-7" strokeWidth={2.4} aria-hidden />
          Phone
        </button>
      ) : null}

      {phone && !inStory ? <Phone
          state={state}
          app={phone}
          onApp={(app) => {
            if (app !== "kitchen") return setPhone(app);
            setPhone(null);
            setKitchenOpen({ at: null, market: null, tab: "shop" });
          }}
          onClose={() => setPhone(null)}
        /> : null}
      {state.event ? <EventModal state={state} /> : null}
      {kitchenOpen && !state.event && !negotiation ? <KitchenScreen state={state} open={kitchenOpen} onClose={() => setKitchenOpen(null)} /> : null}
      {negotiation && !state.event ? <NegotiationScreen key={`${negotiation.deal}-${negotiation.npc}`} state={state} n={negotiation} /> : null}
      {state.minigame ? <MiniGame key={`${state.minigame.kind}-${state.scene}`} kind={state.minigame.kind} level={state.minigame.level} house={String(state.flags.house ?? "")} onDone={finishGame} /> : null}
      {story && !state.minigame ? (
        <div className="absolute inset-0 z-40 overflow-y-auto bg-black/55 px-3 py-6 backdrop-blur-[2px] sm:py-12">
          <StoryPanel state={state} />
        </div>
      ) : null}
      </div>
      {loading ? <LoadingScreen overlay title={loading.title} icon={loading.icon} progress={loading.progress} error={loading.error} /> : null}
      {trip ? null : (
        <p className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 text-xs text-slate-400 sm:block">
          WASD or arrows to move · {controls === "tap" ? "click to walk" : "joystick to walk"} · E to interact
        </p>
      )}
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

/** The little round icon at the start of an interaction prompt. */
function PromptIcon({ kind }: { kind: string }) {
  const [Icon, tone] = kind === "person" ? [MessageCircle, "bg-sky-500"] : kind === "lot" ? [Search, "bg-emerald-500"] : kind === "beat" ? [Play, "bg-amber-500"] : kind === "visit" ? [MapPin, "bg-violet-500"] : kind === "item" ? [Hand, "bg-amber-500"] : [DoorOpen, "bg-violet-500"];
  return (
    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${tone} shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]`}>
      <Icon className="size-[18px] text-white" strokeWidth={2.6} aria-hidden />
    </span>
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
      className={`${iconBtn} ${active ? "!bg-[#23624f]/95 ring-2 ring-blue-300/60" : ""}`}
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

type StatIcon = typeof Zap;

/** One stat: a coloured icon, the name, the number and a bar. */
function Bar({ label, Icon, value, color, warn }: { label: string; Icon: StatIcon; value: number; color: string; warn?: boolean }) {
  const fill = warn ? "#ef4444" : color;
  return (
    <div className="min-w-0" title={`${label}: ${Math.round(value)}`}>
      <div className="flex items-center gap-1 text-[10px] font-extrabold tracking-wide text-slate-200 uppercase">
        <Icon className="size-3.5 shrink-0" style={{ color: fill }} strokeWidth={2.6} fill={Icon === Heart || Icon === Droplet || Icon === Zap || Icon === Star ? fill : "none"} aria-hidden />
        <span className="hidden truncate sm:inline">{label}</span>
        <span className="ml-auto tabular-nums text-slate-300">{Math.round(value)}</span>
      </div>
      <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-black/35 ring-1 ring-white/5">
        <div className="h-full rounded-full shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: fill }} />
      </div>
    </div>
  );
}

function Hud({ state, onOpen }: { state: GameState; onOpen: (app: PhoneApp) => void }) {
  const weather = weatherOf(state.day, state.slot);
  const owed = debt(state);
  const l = lifeOf(state);
  return (
    <button
      type="button"
      onClick={() => onOpen("stats")}
      className={`${glass} absolute top-3 left-1/2 z-10 grid w-[min(96vw,56rem)] -translate-x-1/2 grid-cols-[auto_1fr] items-center gap-x-5 rounded-2xl px-4 py-2.5 text-left`}
      style={{ fontFamily: GAME_FONT }}
      aria-label="Your stats"
    >
      <div>
        <p className="text-xl leading-tight font-black tabular-nums text-[#4ade80] drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]">{naira(state.stats.money)}</p>
        <p className="text-[11px] font-bold whitespace-nowrap text-slate-300">
          Day {state.day} <span className="text-slate-500">•</span> {SLOTS[Math.min(state.slot, 3)]}{" "}
          <span title={`${weather.label} · ${MONTHS[weather.month]} · ${SEASON_NAMES[weather.season]}`} aria-label={`Weather: ${weather.label}, ${MONTHS[weather.month]}`}>
            {weather.icon}
          </span>{" "}
          <span className="text-slate-500">•</span> Age {Math.floor(state.age)}
        </p>
        {owed ? <p className="text-[11px] font-bold text-red-400">Owes {naira(owed)}</p> : null}
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-1.5 sm:grid-cols-7">
        <Bar label="Energy" Icon={Zap} value={state.stats.energy} color="#34d399" />
        <Bar label="Health" Icon={Heart} value={state.stats.health} color="#f2547d" />
        <Bar label="Food" Icon={Utensils} value={l.food} color="#f59e0b" warn={l.food < 25} />
        <Bar label="Water" Icon={Droplet} value={l.water} color="#38bdf8" warn={l.water < 25} />
        <Bar label="Stress" Icon={Brain} value={state.stats.stress} color="#c084fc" />
        <Bar label="Rep" Icon={Star} value={state.stats.reputation} color="#facc15" />
        <Bar label="Heat" Icon={Siren} value={state.stats.heat} color="#8b5cf6" />
      </div>
    </button>
  );
}

function PlacePanel({
  state,
  placeId,
  onClose,
  onApp,
  onPhone,
}: {
  state: GameState;
  placeId: string;
  onClose: () => void;
  onApp: (app: PhoneApp) => void;
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
          const dealWhy = a.kind === "negotiate" && a.deal ? blocked(state, a.deal) : null;
          const ok = check(state, a.if) && !dealWhy;
          const meta = [a.slots ? `${a.slots} slot${a.slots > 1 ? "s" : ""}` : "", a.energy < 0 ? `${a.energy} energy` : a.energy > 0 ? `+${a.energy} energy` : ""]
            .filter(Boolean)
            .join(" · ");
          return (
            <button
              key={a.id}
              type="button"
              disabled={!ok}
              onClick={() => {
                const app = doAction(p.id, a.id);
                if (app) onApp(app);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-blue-400/60 hover:bg-white/10 disabled:opacity-45"
            >
              <span className="block text-sm font-semibold">{fill(state, a.label)}</span>
              <span className="block text-xs text-slate-400">{ok ? (a.kind === "negotiate" ? `${dealDef(a.deal!)?.blurb ?? ""}` : meta) : `🔒 ${dealWhy ?? a.lockedText ?? "Not available yet"}`}</span>
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
      className="absolute bottom-6 left-4 z-10 size-32 touch-none rounded-full border-2 border-white/25 bg-[#141b2d]/35 shadow-[0_8px_24px_rgba(4,8,20,0.3),inset_0_0_24px_rgba(255,255,255,0.08)] backdrop-blur-sm"
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
      {/* Direction marks around the ring. */}
      {[0, 90, 180, 270].map((deg) => (
        <span key={deg} className="pointer-events-none absolute top-1/2 left-1/2 size-0" style={{ transform: `rotate(${deg}deg) translateY(-54px)` }} aria-hidden>
          <span className="absolute -left-[6px] -top-[4px] block border-x-[6px] border-b-[7px] border-x-transparent border-b-white/70" />
        </span>
      ))}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 size-14 rounded-full border border-white/70 bg-gradient-to-b from-white to-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
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
  const mind = onTheirMind(state, memoryKey(person));
  return (
    <div className="absolute inset-x-2 bottom-2 z-30 max-h-[80dvh] overflow-y-auto sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem]" role="dialog" aria-label={`Talking to ${person.name}`}>
      <div className="grid gap-4 pb-1">
        <ChatBubble name={person.name} looks={them.look} adult={them.adult} painted={them.painted}>
          {mind?.say ? <span className="mb-2 block">{fill(state, mind.say)}</span> : null}
          {lineFor(state, person)}
          {isDirty(state) ? <span className="mt-2 block italic">They take a small step back. "Ehn… when last did you wash that shirt?"</span> : null}
          {offer ? <span className="mt-2 block">{fill(state, offer.text)}</span> : null}
        </ChatBubble>
        <div className="mt-1 grid gap-2 pl-8">
          {offer?.choices.map((choice) => {
            const reason = lockReason(state, choice);
            return (
              <ReplyButton
                key={choice.text}
                looks={myLooks(state)}
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
          <ReplyButton looks={myLooks(state)} adult={adult} onClick={onClose}>
            {offer ? "Not now 👋" : "Bye 👋"}
          </ReplyButton>
          {state.flags[`insulted_${personKey}`] !== beatKey(state) ? (
            <ReplyButton
              looks={myLooks(state)}
              adult={adult}
              note="Costs reputation"
              onClick={() => {
                insult(personKey);
                onClose();
              }}
            >
              Insult them 😤
            </ReplyButton>
          ) : null}
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
