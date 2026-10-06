import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadGame, saveGame } from "../save.functions";
import { startGame } from "../systems/engine";
import { AGE_KEY, deleteSave, flushSave, loadSave, newGame, newestSave, parseSave, replace, setCloudSaver } from "../systems/store";
import type { GameState } from "../systems/types";
import { EndScreen } from "./EndScreen";
import { AgeGate, Creator, Title } from "./Menus";
import { useGame } from "./useGame";
import { World } from "./World";

/** The whole game: age gate, title, character creation, story chapters, the open world, and endings. */
export function AbujaHustle() {
  const state = useGame();
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id ?? null;
  const [ready, setReady] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState<GameState | null>(null);

  // Find the latest save: this device, or the account when signed in.
  useEffect(() => {
    if (isPending) return;
    let cancel = false;
    try {
      setAgeOk(localStorage.getItem(AGE_KEY) === "yes");
    } catch {
      /* private mode: ask every time */
    }
    const local = loadSave();
    if (!userId) {
      setCloudSaver(null);
      setSaved(local);
      setReady(true);
      return;
    }
    setCloudSaver((payload) => {
      void saveGame({ data: payload }).catch(() => {});
    });
    loadGame()
      .then((result) => !cancel && setSaved(newestSave(local, parseSave(result.payload))))
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
    if (!playing) setSaved(loadSave());
  }, [playing]);

  if (!ready) return <div className="min-h-[100dvh] bg-[#051a10]" />;
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
          onDone={(input) => {
            deleteSave();
            replace(newGame(input));
            startGame();
            setCreating(false);
          }}
        />
      );
    }
    return (
      <Title
        hasSave={Boolean(saved)}
        signedInAs={user ? user.displayName || "you" : null}
        onNew={() => setCreating(true)}
        onContinue={() => replace(saved)}
      />
    );
  }
  if (state.ending) return <EndScreen state={state} />;
  return (
    <World
      state={state}
      onQuit={() => {
        flushSave();
        replace(null);
      }}
    />
  );
}
