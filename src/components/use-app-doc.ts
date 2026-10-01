import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { loadDoc, saveDoc } from "@/lib/cove.functions";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useAppDoc<T extends object>(slug: string, fallback: T) {
  const [data, setDataState] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<number | null>(null);
  const pending = useRef<T | null>(null);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    let cancel = false;
    pending.current = null;
    setReady(false);
    setLoadError(false);
    setBlocked(false);
    setSaveState("idle");
    loadDoc({ data: slug })
      .then((res) => {
        if (cancel) return;
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
      })
      .catch(() => {
        if (cancel) return;
        setLoadError(true);
        setReady(true);
      });
    return () => {
      cancel = true;
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
        const value = pending.current;
        if (value) {
          void saveDoc({ data: { slug, payload: JSON.stringify(value) } });
        }
      }
    };
  }, [slug]);

  const setData = useCallback(
    (next: T | ((prev: T) => T)) => {
      setDataState((prev) => {
        const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        pending.current = value;
        return value;
      });
      if (timer.current) window.clearTimeout(timer.current);
      setSaveState("saving");
      timer.current = window.setTimeout(() => {
        const value = pending.current;
        if (!value) return;
        void saveDoc({ data: { slug, payload: JSON.stringify(value) } })
          .then((res) => {
            if (!res.ok) {
              setSaveState("error");
              toast.error(
                res.error === "locked"
                  ? "Midnry Pass is required for this tool."
                  : "Could not save.",
              );
              return;
            }
            setSaveState("saved");
          })
          .catch(() => {
            setSaveState("error");
            toast.error("Could not save.");
          });
      }, 350);
    },
    [slug],
  );

  return { data, setData, ready, loadError, blocked, saveState };
}
