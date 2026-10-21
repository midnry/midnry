import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { loadDoc, saveDoc } from "@/lib/cove.functions";
import { docLimit } from "@/lib/doc-limits";
import { DocSaver, type SaveState, type SaverEvent } from "@/lib/doc-saver";

export type { SaveState };

export const SAVE_MESSAGES = {
  retrying: "Not saved, retrying…",
  conflict: "This was changed in another tab. Reload to see the latest.",
  tooLarge: "Too large to save. Nothing was deleted: export or remove some entries.",
} as const;

/** Browsers cap keepalive request bodies at 64 KiB in total. */
const KEEPALIVE_MAX = 60_000;
const keepaliveFetch: typeof fetch = (input, init) => fetch(input, { ...init, keepalive: true });

function notify(slug: string, event: SaverEvent) {
  if (event === "retrying") {
    toast.error(SAVE_MESSAGES.retrying, { id: `retry-${slug}`, description: "Your changes are kept on this page." });
  } else if (event === "saved-after-retry") {
    toast.dismiss(`retry-${slug}`);
  } else if (event === "conflict") {
    toast.dismiss(`retry-${slug}`);
    toast.error(SAVE_MESSAGES.conflict, {
      id: `conflict-${slug}`,
      duration: Infinity,
      action: { label: "Reload", onClick: () => window.location.reload() },
    });
  } else if (event === "too-large") {
    toast.error(SAVE_MESSAGES.tooLarge, { id: `too-large-${slug}` });
  } else {
    toast.error("Midnry Pass is required for this tool.");
  }
}

/**
 * One JSON document per user per app. Changes are saved after a short pause;
 * see src/lib/doc-saver.ts for retries, conflicts and the size limit. The
 * return shape is unchanged for every tool; saveState gained states.
 */
export function useAppDoc<T extends object>(slug: string, fallback: T) {
  const [data, setDataState] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saver = useRef<DocSaver<T> | null>(null);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    const s = new DocSaver<T>({
      limit: docLimit(slug),
      save: (payload, baseRevision, keepalive) =>
        saveDoc({
          data: { slug, payload, baseRevision },
          ...(keepalive && payload.length <= KEEPALIVE_MAX ? { fetch: keepaliveFetch } : {}),
        }),
      onState: setSaveState,
      onEvent: (event) => notify(slug, event),
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (handle) => window.clearTimeout(handle as number),
    });
    saver.current = s;
    setReady(false);
    setLoadError(false);
    setBlocked(false);
    setSaveState("idle");
    loadDoc({ data: slug })
      .then((res) => {
        if (s.closed) return;
        if (!res.ok) {
          setBlocked(res.error === "locked");
          setLoadError(res.error !== "locked");
          setReady(true);
          return;
        }
        if (res.payload) {
          try {
            const raw: unknown = JSON.parse(res.payload);
            if (raw && typeof raw === "object" && !Array.isArray(raw)) {
              setDataState({ ...fallbackRef.current, ...(raw as T) });
            }
          } catch {
            /* keep fallback */
          }
        } else {
          setDataState(fallbackRef.current);
        }
        setReady(true);
        s.start(typeof res.revision === "number" ? res.revision : 0);
      })
      .catch(() => {
        if (s.closed) return;
        setLoadError(true);
        setReady(true);
      });

    // Hiding the tab or leaving the page during the pause: send now.
    const flush = () => s.flush(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!s.dirty) return;
      flush();
      // Still unsaved (offline, conflict, too large): ask before leaving.
      event.preventDefault();
      event.returnValue = "";
    };
    const onOnline = () => {
      if (s.waitingToRetry) s.flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("online", onOnline);
      // Closing the tool inside the app (or switching slug): send what is left.
      s.close();
    };
  }, [slug]);

  // Latest value, so a function update applies to the newest change even
  // before React re-renders.
  const latest = useRef<T>(data);
  latest.current = data;
  const setData = useCallback((next: T | ((prev: T) => T)) => {
    const value = typeof next === "function" ? (next as (p: T) => T)(latest.current) : next;
    latest.current = value;
    setDataState(value);
    saver.current?.change(value);
  }, []);

  return { data, setData, ready, loadError, blocked, saveState };
}
