import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GameLoadingContext, MIN_LOADING_MS, type LoadingDetails } from "./loading-context";
import { LoadingScreen } from "./LoadingScreen";

/** Keep consecutive loading stages together, and every visible cycle at least three seconds. */
export function LoadingProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<LoadingDetails | null>({ title: "Getting your game ready" });
  const current = useRef<LoadingDetails | null>(screen);
  const active = useRef(new Map<symbol, LoadingDetails>());
  const started = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((details: LoadingDetails | null) => {
    current.current = details;
    setScreen(details);
  }, []);

  const unregister = useCallback(
    (id: symbol) => {
      active.current.delete(id);
      if (active.current.size) {
        show([...active.current.values()].at(-1)!);
        return;
      }
      if (hideTimer.current) clearTimeout(hideTimer.current);
      const remaining = Math.max(0, MIN_LOADING_MS - (Date.now() - started.current));
      // Artwork can be finished while we give the transition a little breathing room.
      if (current.current?.progress != null) show({ ...current.current, progress: 1 });
      hideTimer.current = setTimeout(() => {
        if (!active.current.size) show(null);
        hideTimer.current = null;
      }, remaining);
    },
    [show],
  );

  const register = useCallback(
    (id: symbol, details: LoadingDetails) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = null;
      // Changing title or reporting progress must not restart the three-second clock.
      if (!current.current || !started.current) started.current = Date.now();
      active.current.set(id, details);
      show(details);
    },
    [show],
  );

  const visible = Boolean(screen);
  useEffect(() => {
    if (!visible) return;
    // Start at the committed screen, rather than before React paints it.
    started.current = Date.now();
    // Also cover a cached route whose children don't need another download.
    if (!active.current.size) unregister(Symbol());
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [visible, unregister]);

  const context = useMemo(
    () => ({ visible: Boolean(screen), register, unregister }),
    [screen, register, unregister],
  );
  return (
    <div className="abuja-game">
      <GameLoadingContext.Provider value={context}>
        <div className="contents" inert={Boolean(screen)}>
          {children}
        </div>
      </GameLoadingContext.Provider>
      {screen ? (
        <div className="fixed inset-0 z-[150]">
          <LoadingScreen {...screen} overlay />
        </div>
      ) : null}
    </div>
  );
}
