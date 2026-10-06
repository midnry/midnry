import { useEffect, useState } from "react";
import { startGame } from "../systems/engine";
import { AGE_KEY, deleteSave, loadSave, newGame, replace } from "../systems/store";
import { EndScreen } from "./EndScreen";
import { AgeGate, Creator, Title } from "./Menus";
import { StoryView } from "./StoryView";
import { useGame } from "./useGame";
import { World } from "./World";

/** The whole game: age gate, title, character creation, story chapters, the open world, and endings. */
export function AbujaHustle() {
  const state = useGame();
  const [ready, setReady] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [creating, setCreating] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    try {
      setAgeOk(localStorage.getItem(AGE_KEY) === "yes");
    } catch {
      /* private mode: ask every time */
    }
    setHasSave(Boolean(loadSave()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!state) setHasSave(Boolean(loadSave()));
  }, [state]);

  if (!ready) return <div className="min-h-[100dvh] bg-stone-950" />;
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
    return <Title hasSave={hasSave} onNew={() => setCreating(true)} onContinue={() => replace(loadSave())} />;
  }
  if (state.ending) return <EndScreen state={state} />;
  if (state.chapter) return <StoryView state={state} />;
  return <World state={state} />;
}
