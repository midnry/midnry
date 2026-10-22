import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { loadDoc, saveDoc } from "@/lib/cove.functions";
import { docLimit } from "@/lib/doc-limits";
import { DocSaver, type SaveState, type SaverEvent } from "@/lib/doc-saver";
import { browserRecoveryStore, decideOnLoad, docIssues, type RecoveryReason } from "@/lib/doc-recovery";

export type { SaveState };

export const SAVE_MESSAGES = {
  retrying: "Not saved, retrying…",
  conflict: "This was changed in another tab. Your changes are kept until you choose.",
  refresh: "Midnry was updated, refresh to keep saving.",
  tooLarge: "Too large to save. Nothing was deleted: export or remove some entries.",
} as const;

/** Browsers cap keepalive request bodies at 64 KiB in total. */
const KEEPALIVE_MAX = 60_000;
const keepaliveFetch: typeof fetch = (input, init) => fetch(input, { ...init, keepalive: true });
/** Pause before refreshing the recovery copy while the person keeps typing. */
const COPY_DEBOUNCE_MS = 400;

function notify(slug: string, event: SaverEvent) {
  if (event === "retrying") {
    toast.error(SAVE_MESSAGES.retrying, { id: `retry-${slug}`, description: "Your changes are kept on this page and in this browser." });
  } else if (event === "saved-after-retry") {
    toast.dismiss(`retry-${slug}`);
  } else if (event === "conflict" || event === "refresh-required") {
    // The resolution panel (src/components/doc-recovery-panel.tsx) takes over.
    toast.dismiss(`retry-${slug}`);
  } else if (event === "too-large") {
    toast.error(SAVE_MESSAGES.tooLarge, { id: `too-large-${slug}` });
  } else {
    toast.error("Midnry Pass is required for this tool.");
  }
}

const PROBLEM_STATES: Partial<Record<SaveState, RecoveryReason>> = {
  retrying: "retrying",
  conflict: "conflict",
  refresh: "refresh",
  "too-large": "too-large",
};

/**
 * One JSON document per user per app. Changes are saved after a short pause;
 * see src/lib/doc-saver.ts for retries, conflicts and the size limit. The
 * return shape is unchanged for every tool; saveState gained states.
 *
 * Unsaved changes are never dropped: whenever a save can't finish (retrying,
 * conflict, refresh required, too large) a copy is kept in this browser
 * (src/lib/doc-recovery.ts) and offered back the next time the app opens.
 * Conflicts are resolved in the panel from src/components/doc-recovery-panel.tsx:
 * keep mine (explicitly saved over the newer one), use the saved one, or review.
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
  // Latest value, so a function update applies to the newest change even
  // before React re-renders.
  const latest = useRef<T>(data);
  latest.current = data;
  /** Called after every change, to keep the recovery copy current. */
  const afterChange = useRef<(() => void) | null>(null);

  useEffect(() => {
    const store = browserRecoveryStore();
    let owner = "";
    /** A save problem is open; its reason labels the copy. */
    let problem: RecoveryReason | null = null;
    /** This page kept a copy that should be cleared once everything is saved. */
    let keptCopy = false;
    /** A copy from an earlier visit is on offer; it is not replaced until decided. */
    let offering = false;
    let copyTimer: number | null = null;
    /** Leaving on purpose (Refresh in the panel): no "leave page?" prompt. */
    let leaving = false;

    const mine = (): T => s.unsaved ?? latest.current;
    const keepCopy = async (reason: RecoveryReason) => {
      if (copyTimer != null) window.clearTimeout(copyTimer);
      copyTimer = null;
      if (!owner || offering) return;
      keptCopy = true;
      await store.save(owner, slug, JSON.stringify(mine()), s.revision, reason);
    };
    const clearCopy = () => {
      if (copyTimer != null) window.clearTimeout(copyTimer);
      copyTimer = null;
      keptCopy = false;
      if (owner) void store.clear(owner, slug);
    };
    afterChange.current = () => {
      if (!problem || !owner || offering) return;
      const reason = problem;
      if (copyTimer != null) window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => void keepCopy(reason), COPY_DEBOUNCE_MS);
    };

    const apply = (payload: string | null) => {
      let next = fallbackRef.current;
      if (payload) {
        try {
          const raw: unknown = JSON.parse(payload);
          if (raw && typeof raw === "object" && !Array.isArray(raw)) next = { ...fallbackRef.current, ...(raw as T) };
        } catch {
          /* keep fallback */
        }
      }
      latest.current = next;
      setDataState(next);
    };
    const loadSaved = async () => {
      const res = await loadDoc({ data: slug });
      if (!res.ok) throw new Error("Could not load the saved version.");
      return { payload: res.payload ?? null, revision: typeof res.revision === "number" ? res.revision : 0 };
    };

    const showConflict = () => {
      docIssues.set({
        slug,
        kind: "conflict",
        open: true,
        mine: () => JSON.stringify(mine()),
        loadSaved,
        keepMine: async () => {
          const saved = await loadSaved();
          await keepCopy("conflict");
          docIssues.clear(slug, "conflict");
          // Based on the latest revision: if yet another save lands first,
          // this conflicts again and the panel comes back.
          s.overwrite(saved.revision);
        },
        useSaved: async () => {
          const saved = await loadSaved();
          s.adopt(saved.revision);
          apply(saved.payload);
          problem = null;
          clearCopy();
          docIssues.clear(slug);
        },
      });
    };
    const showRefresh = () => {
      docIssues.set({
        slug,
        kind: "refresh",
        open: true,
        mine: () => JSON.stringify(mine()),
        loadSaved,
        refresh: () => {
          void keepCopy("refresh").finally(() => {
            leaving = true;
            window.location.reload();
          });
        },
      });
    };

    const s = new DocSaver<T>({
      limit: docLimit(slug),
      save: (payload, baseRevision, keepalive) =>
        saveDoc({
          data: { slug, payload, baseRevision },
          ...(keepalive && payload.length <= KEEPALIVE_MAX ? { fetch: keepaliveFetch } : {}),
        }),
      onState: (state) => {
        setSaveState(state);
        if (PROBLEM_STATES[state]) problem = PROBLEM_STATES[state]!;
        else if (state === "saved") {
          problem = null;
          if (keptCopy) clearCopy();
        }
      },
      onEvent: (event) => {
        notify(slug, event);
        if (event === "retrying") void keepCopy("retrying");
        else if (event === "too-large") void keepCopy("too-large");
        else if (event === "conflict") {
          void keepCopy("conflict");
          showConflict();
        } else if (event === "refresh-required") {
          void keepCopy("refresh");
          showRefresh();
        }
      },
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (handle) => window.clearTimeout(handle as number),
    });
    saver.current = s;
    setReady(false);
    setLoadError(false);
    setBlocked(false);
    setSaveState("idle");

    const offerRecovered = async (savedPayload: string | null) => {
      const record = await store.read(owner, slug);
      if (s.closed) return;
      const decision = decideOnLoad(record, savedPayload, Date.now());
      if (decision === "discard") void store.clear(owner, slug);
      if (decision !== "offer" || !record) return;
      offering = true;
      const done = () => {
        offering = false;
        docIssues.clear(slug, "recovered");
      };
      docIssues.set({
        slug,
        kind: "recovered",
        open: true,
        savedAt: record.savedAt,
        mine: () => record.payload,
        loadSaved,
        keepMine: async () => {
          const saved = await loadSaved();
          done();
          // Restore over the latest saved revision; the copy stays until this saves.
          s.adopt(saved.revision);
          keptCopy = true;
          let value: T = fallbackRef.current;
          try {
            const raw: unknown = JSON.parse(record.payload);
            if (raw && typeof raw === "object" && !Array.isArray(raw)) value = { ...fallbackRef.current, ...(raw as T) };
          } catch {
            /* keep fallback */
          }
          latest.current = value;
          setDataState(value);
          s.change(value);
        },
        useSaved: async () => {
          done();
          await store.clear(owner, slug);
        },
      });
    };

    loadDoc({ data: slug })
      .then((res) => {
        if (s.closed) return;
        if (!res.ok) {
          setBlocked(res.error === "locked");
          setLoadError(res.error !== "locked");
          setReady(true);
          return;
        }
        owner = typeof res.owner === "string" ? res.owner : "";
        apply(res.payload ?? null);
        setReady(true);
        s.start(typeof res.revision === "number" ? res.revision : 0);
        void offerRecovered(res.payload ?? null);
      })
      .catch(() => {
        if (s.closed) return;
        setLoadError(true);
        setReady(true);
      });

    // Hiding the tab or leaving the page during the pause: send now.
    const flush = () => s.flush(true);
    const onPageHide = () => {
      flush();
      // Best effort: bring the copy up to date before the page goes.
      if (problem && (copyTimer != null || !keptCopy)) void keepCopy(problem);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!s.dirty || leaving) return;
      flush();
      // Still unsaved (offline, conflict, too large): ask before leaving.
      event.preventDefault();
      event.returnValue = "";
    };
    const onOnline = () => {
      if (s.waitingToRetry) s.flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("online", onOnline);
      if (problem && copyTimer != null) void keepCopy(problem);
      afterChange.current = null;
      docIssues.clear(slug);
      // Closing the tool inside the app (or switching slug): send what is left.
      s.close();
    };
  }, [slug]);

  const setData = useCallback((next: T | ((prev: T) => T)) => {
    const value = typeof next === "function" ? (next as (p: T) => T)(latest.current) : next;
    latest.current = value;
    setDataState(value);
    saver.current?.change(value);
    afterChange.current?.();
  }, []);

  return { data, setData, ready, loadError, blocked, saveState };
}
