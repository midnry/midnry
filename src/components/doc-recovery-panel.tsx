import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, cn } from "@/components/ui";
import { docIssues, downloadName, prettyPayload, type DocIssue } from "@/lib/doc-recovery";
import { getApp } from "@/lib/catalog";

/**
 * The panel that appears when an app's changes can't be saved as they are:
 *  - conflict: another tab or device saved a newer version;
 *  - refresh: Midnry was updated and this page must be refreshed to save;
 *  - recovered: unsaved changes kept in this browser from an earlier visit.
 * Nothing is overwritten or discarded without the person choosing it here.
 * Mounted once next to the tool (src/components/tools/index.tsx).
 */
export function DocRecoveryHost() {
  const issues = useSyncExternalStore(docIssues.subscribe, docIssues.get, () => EMPTY);
  const issue = issues.find((item) => item.open);
  if (!issue) return null;
  return <DocRecoveryPanel key={`${issue.slug}-${issue.kind}`} issue={issue} />;
}

const EMPTY: readonly DocIssue[] = [];

type Mode = "choose" | "confirm-keep" | "confirm-discard" | "review" | "not-stored";

function download(slug: string, payload: string) {
  try {
    const blob = new Blob([prettyPayload(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName(slug, new Date());
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch {
    toast.error("Could not download. Use Copy instead.");
  }
}

function copy(payload: string) {
  void navigator.clipboard.writeText(prettyPayload(payload)).then(
    () => toast.success("Copied your version."),
    () => toast.error("Could not copy. Use Download instead."),
  );
}

function when(savedAt: number | undefined): string {
  if (!savedAt) return "earlier";
  return new Date(savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function DocRecoveryPanel({ issue }: { issue: DocIssue }) {
  const ids = useId();
  const [mode, setMode] = useState<Mode>("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null | undefined>(undefined);
  const [downloaded, setDownloaded] = useState(false);
  const app = getApp(issue.slug)?.name ?? "this app";

  // The newest saved version, for review.
  useEffect(() => {
    if (mode !== "review" || saved !== undefined) return;
    let live = true;
    issue.loadSaved().then(
      (res) => live && setSaved(res.payload),
      () => live && setError("Could not load the saved version. Check your connection and try again."),
    );
    return () => {
      live = false;
    };
  }, [mode, saved, issue]);

  async function run(action: (() => Promise<void>) | undefined) {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError("That didn’t work. Check your connection and try again. Your version is still kept.");
      setBusy(false);
    }
  }

  const mineDownload = () => {
    download(issue.slug, issue.mine());
    setDownloaded(true);
  };

  /** Refresh only once the copy is kept; otherwise keep the page and offer Copy / Download. */
  async function refresh() {
    if (!issue.refresh) return;
    setBusy(true);
    setError(null);
    try {
      const outcome = await issue.refresh();
      if (outcome === "not-stored") setMode("not-stored");
    } catch {
      setMode("not-stored");
    } finally {
      setBusy(false);
    }
  }

  const title =
    issue.kind === "conflict"
      ? `${app} was changed in another tab or device`
      : issue.kind === "refresh"
        ? "Midnry was updated, refresh to keep saving"
        : issue.kind === "account"
          ? "Another account is signed in now"
          : `You have unsaved changes in ${app}`;
  const body =
    issue.kind === "conflict"
      ? "A newer version was saved somewhere else, so your latest changes were not saved over it. They are kept on this page and in this browser until you choose."
      : issue.kind === "refresh"
        ? "This page is out of date and can’t save any more. Your unsaved changes are kept in this browser, and Midnry offers them back after you refresh. You can also download a copy now."
        : issue.kind === "account"
          ? `This page was opened by a different account. Its unsaved changes in ${app} were not saved to the account signed in now. They are kept in this browser and offered back when that account signs in again. Refresh to continue as the account signed in now.`
          : `These changes from ${when(issue.savedAt)} were not saved to your account before the page closed. They were kept only in this browser.`;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${ids}-title`}
      aria-describedby={`${ids}-body`}
      data-doc-recovery={issue.kind}
      className="no-print fixed inset-x-3 bottom-3 z-50 max-h-[85vh] overflow-y-auto rounded-2xl bg-card p-4 text-ink shadow-line ring-1 ring-line sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[30rem] sm:p-5"
    >
      <h2 id={`${ids}-title`} className="font-display text-xl tracking-tight text-fail">
        {title}
      </h2>
      <p id={`${ids}-body`} className="mt-2 text-pretty text-sm text-muted">
        {body}
      </p>

      {mode === "choose" ? (
        <div className="mt-4 grid gap-2">
          {issue.kind === "refresh" || issue.kind === "account" ? (
            <>
              <Button tone="primary" disabled={busy} onClick={() => void refresh()}>
                {busy ? "Keeping a copy…" : "Refresh now"}
              </Button>
              <Button tone="quiet" onClick={() => setMode("review")}>
                Review my version
              </Button>
              <Button tone="quiet" onClick={mineDownload}>
                Download my version
              </Button>
            </>
          ) : (
            <>
              <Button tone="primary" disabled={busy} onClick={() => setMode("confirm-keep")}>
                Keep my version
              </Button>
              <Button tone="quiet" disabled={busy} onClick={() => setMode("confirm-discard")}>
                {issue.kind === "recovered" ? "Discard it and keep what’s saved" : "Use the newer saved version"}
              </Button>
              <Button tone="quiet" onClick={() => setMode("review")}>
                Review both
              </Button>
            </>
          )}
          <button type="button" className="min-h-11 text-sm text-muted underline underline-offset-2" onClick={() => docIssues.open(issue.slug, false)}>
            Decide later
          </button>
        </div>
      ) : null}

      {mode === "not-stored" ? (
        <div className="mt-4 grid gap-2" data-doc-recovery-step="not-stored">
          <p role="alert" className="rounded-xl bg-paper-2 p-3 text-pretty text-sm font-medium text-fail">
            This browser would not keep a copy of your version, so the page was not refreshed. Copy or download your version
            first. Refreshing without it loses these changes.
          </p>
          <Button tone="primary" onClick={() => copy(issue.mine())}>
            Copy my version
          </Button>
          <Button tone="quiet" onClick={mineDownload}>
            {downloaded ? "Downloaded. Download again" : "Download my version"}
          </Button>
          <Button tone="quiet" onClick={() => setMode("review")}>
            Review my version
          </Button>
          <Button tone="quiet" onClick={() => issue.refreshAnyway?.()}>
            Refresh anyway (my version will be lost)
          </Button>
          <Button tone="quiet" onClick={() => setMode("choose")}>
            Back
          </Button>
        </div>
      ) : null}

      {mode === "confirm-keep" ? (
        <div className="mt-4 grid gap-2">
          <p role="alert" className="rounded-xl bg-paper-2 p-3 text-pretty text-sm font-medium text-fail">
            {issue.kind === "recovered"
              ? "Your recovered version will replace what is saved now, including any changes made since. This can’t be undone."
              : "Your version will replace the newer saved one. Changes made in the other tab or device will be lost. This can’t be undone."}
          </p>
          <Button tone="primary" disabled={busy} onClick={() => void run(issue.keepMine)}>
            {busy ? "Saving…" : "Replace it with my version"}
          </Button>
          <Button tone="quiet" disabled={busy} onClick={() => setMode("choose")}>
            Back
          </Button>
        </div>
      ) : null}

      {mode === "confirm-discard" ? (
        <div className="mt-4 grid gap-2">
          <p role="alert" className="rounded-xl bg-paper-2 p-3 text-pretty text-sm font-medium text-fail">
            Your version will be discarded. Download it first if you might need it.
          </p>
          <Button tone="quiet" onClick={mineDownload}>
            {downloaded ? "Downloaded. Download again" : "Download my version"}
          </Button>
          <Button tone="primary" disabled={busy} onClick={() => void run(issue.useSaved)}>
            {busy ? "Loading…" : "Discard mine, use the saved version"}
          </Button>
          <Button tone="quiet" disabled={busy} onClick={() => setMode("choose")}>
            Back
          </Button>
        </div>
      ) : null}

      {mode === "review" ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Version label="Your version (not saved)" text={prettyPayload(issue.mine())} />
            {issue.kind === "refresh" || issue.kind === "account" ? null : (
              <Version label="Saved version" text={saved === undefined ? "Loading…" : saved == null ? "Nothing saved yet." : prettyPayload(saved)} />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button tone="quiet" onClick={() => copy(issue.mine())}>
              Copy mine
            </Button>
            <Button tone="quiet" onClick={mineDownload}>
              Download mine (.json)
            </Button>
            <Button tone="quiet" onClick={() => setMode("choose")}>
              Back to choices
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-fail">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Version({ label, text }: { label: string; text: string }) {
  return (
    <section className="min-w-0" aria-label={label}>
      <h3 className="mb-1 text-sm font-medium">{label}</h3>
      <pre className={cn("max-h-56 overflow-auto rounded-xl bg-paper-2 p-3 text-xs leading-relaxed whitespace-pre-wrap break-words")}>{text}</pre>
    </section>
  );
}

/** "Resolve" next to the save status, to bring a tucked-away panel back. */
export function ResolveButton({ slug }: { slug?: string }) {
  const issues = useSyncExternalStore(docIssues.subscribe, docIssues.get, () => EMPTY);
  const tucked = issues.find((item) => (!slug || item.slug === slug) && !item.open);
  if (!tucked) return null;
  return (
    <button type="button" className="underline underline-offset-2" onClick={() => docIssues.open(tucked.slug)}>
      Resolve
    </button>
  );
}
