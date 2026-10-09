// The game's rounded type for the HUD and the names on the map, bundled so it works offline.
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-900.css";
import { lazy, Suspense, useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadGame, saveGame } from "../save.functions";
import { startGame } from "../systems/engine";
import { setViewerEmail } from "../systems/emeka";
import { AGE_KEY, SLOT_IDS, deleteSave, flushSave, getSlot, lastSlot, loadSaves, newGame, newestSave, parseSave, replace, setCloudSaver, setSlot, type Slot } from "../systems/store";
import type { GameState } from "../systems/types";
import { EndScreen } from "./EndScreen";
import { AgeGate, Creator, Title } from "./Menus";
import { useGame } from "./useGame";
import { LoadingScreen } from "./LoadingScreen";

const World = lazy(() => import("./World").then((module) => ({ default: module.World })));

/** The whole game: age gate, title, character creation, story chapters, the open world, and endings. */
export function AbujaHustle() {
  const state = useGame();
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id ?? null;
  const email = user?.primaryEmail ?? null;
  // Who's signed in matters to one character (see systems/emeka.ts): only a hash is kept.
  useEffect(() => {
    void setViewerEmail(email);
  }, [email]);
  const [ready, setReady] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  /** The slot a new life is being made for. */
  const [creating, setCreating] = useState<Slot | null>(null);
  /** What's in each of the three save slots. */
  const [saved, setSaved] = useState<(GameState | null)[]>([null, null, null]);

  // Find the latest save: this device, or the account when signed in.
  useEffect(() => {
    if (isPending) return;
    let cancel = false;
    try {
      setAgeOk(localStorage.getItem(AGE_KEY) === "yes");
    } catch {
      /* private mode: ask every time */
    }
    setSlot(lastSlot());
    const local = loadSaves();
    if (!userId) {
      setCloudSaver(null);
      setSaved(local);
      setReady(true);
      return;
    }
    setCloudSaver((payload, slot) => {
      void saveGame({ data: { slot, payload } }).catch(() => {});
    });
    loadGame()
      .then((result) => {
        if (cancel) return;
        const cloud = result.slots ?? [result.payload, null, null];
        setSaved(SLOT_IDS.map((n, i) => newestSave(local[i] ?? null, parseSave(cloud[i] ?? null))));
      })
      .catch(() => !cancel && setSaved(local))
      .finally(() => !cancel && setReady(true));
    return () => {
      cancel = true;
    };
  }, [userId, isPending]);

  useEffect(() => () => setCloudSaver(null), []);

  // Back on the title (quit, deleted, or finished): show what is saved now.
  const playing = Boolean(state);
  useEffect(() => {
    if (playing) return;
    // This device has the latest for the slot just played (or nothing, if that life was deleted); keep the rest.
    const local = loadSaves();
    setSaved((prev) => SLOT_IDS.map((n, i) => (n === getSlot() ? (local[i] ?? null) : newestSave(local[i] ?? null, prev[i] ?? null))));
  }, [playing]);

  if (!ready) return <LoadingScreen title={isPending ? "Getting your game ready" : "Finding your saved lives"} icon="◈" />;
  if (!ageOk) {
    return (
      <AgeGate
        onPass={() => {
          try {
            localStorage.setItem(AGE_KEY, "yes");
          } catch {
            /* ignore */
          }
          setAgeOk(true);
        }}
      />
    );
  }
  if (!state) {
    if (creating) {
      return (
        <Creator
          onBack={() => setCreating(null)}
          onDone={(input) => {
            setSlot(creating);
            deleteSave(creating);
            replace(newGame(input));
            startGame();
            setCreating(null);
          }}
        />
      );
    }
    return (
      <Title
        saves={saved}
        last={lastSlot()}
        signedInAs={user ? user.displayName || "you" : null}
        onNew={(slot) => setCreating(slot)}
        onContinue={(slot) => {
          setSlot(slot);
          replace(saved[slot - 1] ?? null);
        }}
        onDelete={(slot) => {
          deleteSave(slot);
          setSaved((prev) => prev.map((s, i) => (i === slot - 1 ? null : s)));
        }}
      />
    );
  }
  if (state.ending) return <EndScreen state={state} />;
  return (
    <Suspense fallback={<LoadingScreen title="Loading your next chapter" />}><World
      state={state}
      onQuit={() => {
        flushSave();
        replace(null);
      }}
    /></Suspense>
  );
}
