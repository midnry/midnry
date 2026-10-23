import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { toast } from "sonner";
import { loadDoc, saveDoc } from "@/lib/cove.functions";
import { docLimit } from "@/lib/doc-limits";
import type { SaveState, SaverEvent } from "@/lib/doc-saver";
import { browserRecoveryStore } from "@/lib/doc-recovery";
import { DocSession } from "@/lib/doc-session";

export type { SaveState };

/** Asked before in-app navigation when a change is unsaved and this browser can't keep a copy. */
export const LEAVE_UNSAVED =
  "Your latest change isn't saved yet, and this browser can't keep a copy to offer back. Leave anyway and lose it?";

export const SAVE_MESSAGES = {
  retrying: "Not saved, retrying…",
  conflict: "This was changed in another tab. Your changes are kept until you choose.",
  refresh: "Midnry was updated, refresh to keep saving.",
  tooLarge: "Too large to save. Nothing was deleted: export or remove some entries.",
  account: "Another account is signed in now. These changes were not saved to it.",
} as const;

/** Browsers cap keepalive request bodies at 64 KiB in total. */
const KEEPALIVE_MAX = 60_000;
const keepaliveFetch: typeof fetch = (input, init) => fetch(input, { ...init, keepalive: true });

function notify(slug: string, event: SaverEvent) {
  if (event === "retrying") {
    toast.error(SAVE_MESSAGES.retrying, { id: `retry-${slug}`, description: "Your changes are kept on this page and in this browser." });
  } else if (event === "saved-after-retry") {
    toast.dismiss(`retry-${slug}`);
  } else if (event === "conflict" || event === "refresh-required") {
    // The resolution panel (src/components/doc-recovery-panel.tsx) takes over.
    toast.dismiss(`retry-${slug}`);
  } else if (event === "account-changed") {
    toast.dismiss(`retry-${slug}`);
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
 *
 * Unsaved changes are never dropped: the session behind this hook
 * (src/lib/doc-session.ts) keeps a copy in this browser whenever a save can't
 * finish, or when the tool closes or the page leaves while a save is still
 * pending, and offers it back the next time the app opens. Conflicts are
 * resolved in the panel from src/components/doc-recovery-panel.tsx.
 */
export function useAppDoc<T extends object>(slug: string, fallback: T) {
  const [data, setDataState] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const session = useRef<DocSession<T> | null>(null);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  // Latest value, so a function update applies to the newest change even
  // before React re-renders.
  const latest = useRef<T>(data);
  latest.current = data;

  useEffect(() => {
    const s = new DocSession<T>({
      slug,
      limit: docLimit(slug),
      store: browserRecoveryStore(),
      fallback: () => fallbackRef.current,
      load: async () => {
        const res = await loadDoc({ data: slug });
        if (!res.ok) return { ok: false, error: res.error };
        return {
          ok: true,
          payload: res.payload ?? null,
          revision: typeof res.revision === "number" ? res.revision : 0,
          owner: typeof res.owner === "string" ? res.owner : "",
        };
      },
      save: (payload, baseRevision, keepalive, owner) =>
        saveDoc({
          data: { slug, payload, baseRevision, ...(owner ? { owner } : {}) },
          ...(keepalive && payload.length <= KEEPALIVE_MAX ? { fetch: keepaliveFetch } : {}),
        }),
      onData: (value) => {
        latest.current = value;
        setDataState(value);
      },
      onLoaded: (status) => {
        setBlocked(status.blocked);
        setLoadError(status.loadError);
        setReady(true);
      },
      onSaveState: setSaveState,
      notify: (event) => notify(slug, event),
      reload: () => window.location.reload(),
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (handle) => window.clearTimeout(handle as number),
    });
    session.current = s;
    setReady(false);
    setLoadError(false);
    setBlocked(false);
    setSaveState("idle");
    void s.open();

    // Hiding the tab or leaving the page during the pause: send now.
    const onPageHide = () => s.pageHide();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") s.flush(true);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // Still unsaved (offline, conflict, too large): ask before leaving.
      if (!s.beforeUnload()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onOnline = () => s.online();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("online", onOnline);
      // Closing the tool inside the app (or switching slug): a copy is kept
      // first, what is left is sent, and the outcome settles the copy.
      s.close();
    };
  }, [slug]);

  // Leaving inside the app (a link, Back) while a change is unsaved and no copy can be kept: ask first.
  // Closing or reloading the tab is covered by beforeunload above.
  useBlocker({
    shouldBlockFn: () => Boolean(session.current?.mustConfirmLeave()) && !window.confirm(LEAVE_UNSAVED),
    enableBeforeUnload: false,
  });

  const setData = useCallback((next: T | ((prev: T) => T)) => {
    const value = typeof next === "function" ? (next as (p: T) => T)(latest.current) : next;
    latest.current = value;
    setDataState(value);
    session.current?.change(value);
  }, []);

  return { data, setData, ready, loadError, blocked, saveState };
}
