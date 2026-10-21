import { useEffect, useState } from "react";
import { loadMergedDoc } from "@/lib/merged-docs.functions";

export type MergedDocs = { ready: boolean; failed: boolean; payloads: Record<string, string | null> };

/** The person's saved documents from merged-away apps, read-only. */
export function useMergedDocs(slugs: readonly string[]): MergedDocs {
  const key = slugs.join(",");
  const [state, setState] = useState<MergedDocs>({ ready: slugs.length === 0, failed: false, payloads: {} });
  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (list.length === 0) {
      setState({ ready: true, failed: false, payloads: {} });
      return;
    }
    let live = true;
    setState({ ready: false, failed: false, payloads: {} });
    Promise.all(list.map((slug) => loadMergedDoc({ data: slug })))
      .then((docs) => {
        if (!live) return;
        setState({ ready: true, failed: false, payloads: Object.fromEntries(docs.map((doc) => [doc.slug, doc.payload])) });
      })
      .catch(() => {
        if (live) setState({ ready: true, failed: true, payloads: {} });
      });
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}

/** The ?view= of the current address, read once on the client. */
export function viewParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("view");
}

/** Keep ?view= in the address bar in step with the view on screen, without a navigation. */
export function setViewParam(view: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (view) url.searchParams.set("view", view);
  else url.searchParams.delete("view");
  window.history.replaceState(window.history.state, "", url);
}

export function downloadText(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
