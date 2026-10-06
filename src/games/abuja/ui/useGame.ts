import { useSyncExternalStore } from "react";
import { getState, subscribe } from "../systems/store";

export function useGame() {
  return useSyncExternalStore(subscribe, getState, () => null);
}
