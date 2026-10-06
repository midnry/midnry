import { useState } from "react";
import { fullLook, type Look } from "../systems/character";
import { changeLooks } from "../systems/engine";
import type { GameState } from "../systems/types";
import { Avatar } from "./Avatar";
import { Dresser } from "./Dresser";
import { btnGhost, btnPrimary } from "./theme";

/** Change your style any time: same person, new fit. */
export function WardrobePanel({ state, onDone }: { state: GameState; onDone: () => void }) {
  const [look, setLook] = useState<Look>(() => fullLook(state.looks));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-3xl bg-gradient-to-b from-green-200/20 to-transparent p-2">
          <Avatar looks={look} size={120} />
        </div>
        <p className="text-sm font-semibold">{state.name}</p>
      </div>
      <div className="min-w-0">
        <Dresser look={look} onChange={setLook} />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              changeLooks(look);
              onDone();
            }}
          >
            Save outfit
          </button>
          <button type="button" className={btnGhost} onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
