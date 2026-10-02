import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AppFrame } from "@/components/app-frame";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useRole } from "@/components/role";
import { GENRES, genreLabel, type GenreId } from "@/lib/catalog";
import { MAX_HTML_CHARS } from "@/lib/revenue";
import {
  decideSubmission,
  listMine,
  listPending,
  loadDraft,
  publishOwnApp,
  type MineApp,
  type PendingApp,
} from "@/lib/community.functions";
import { Button, Field, Skeleton, TextArea, TextInput, fieldClass } from "@/components/ui";
import { toast } from "sonner";

export const Route = createFileRoute("/review")({
  head: () => ({ meta: [{ title: "Review — Midnry" }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const { user, isPending } = useCurrentUserState();
  const { isAdmin, ready } = useRole();
  const [queue, setQueue] = useState<PendingApp[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; html: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    return listPending()
      .then((rows) => {
        setQueue(rows);
        setSelected((current) => (current && rows.some((row) => row.id === current) ? current : (rows[0]?.id ?? null)));
      })
      .catch(() => setQueue([]));
  }

  useEffect(() => {
    if (!user || !ready || !isAdmin) return;
    let cancel = false;
    listPending()
      .then((rows) => {
        if (cancel) return;
        setQueue(rows);
        setSelected(rows[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancel) setQueue([]);
      });
    return () => {
      cancel = true;
    };
  }, [user?.id, ready, isAdmin]);

  useEffect(() => {
    if (!selected || !isAdmin) {
      setDraft(null);
      return;
    }
    let cancel = false;
    setDraft(null);
    loadDraft({ data: selected })
      .then((row) => {
        if (!cancel) setDraft(row);
      })
      .catch(() => {
        if (!cancel) setDraft(null);
      });
    return () => {
      cancel = true;
    };
  }, [selected, isAdmin]);

  if (isPending || (user && !ready)) {
    return (
      <Shell>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-6 h-72 w-full" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;
  if (!isAdmin) {
    return (
      <Shell>
        <h1 className="font-display text-5xl tracking-tight">Review</h1>
        <p className="mt-3 max-w-xl text-pretty text-muted">Only the admin can open this. Uploads stay off the desk until they are approved.</p>
        <Link to="/apps" className="mt-6 inline-flex min-h-11 items-center text-sm underline">
          Back to the desk
        </Link>
      </Shell>
    );
  }

  const current = queue?.find((item) => item.id === selected) ?? null;

  async function decide(decision: "approve" | "reject") {
    if (!current) return;
    setBusy(decision);
    setError(null);
    try {
      const result = await decideSubmission({ data: { id: current.id, decision, note } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(decision === "approve" ? "Approved. It is on the desk." : "Rejected. The desk is unchanged.");
      setNote("");
      setDraft(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that decision.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">Review</h1>
      <p className="mt-3 max-w-2xl text-pretty text-muted">
        Add an app you built, or open someone else's upload here before it can reach the desk. The frame is sandboxed: scripts cannot read accounts, change Midnry, or navigate the site.
      </p>

      <OwnAppForm />

      <h2 className="mt-14 font-display text-3xl tracking-tight">Waiting</h2>

      {!queue ? (
        <Skeleton className="mt-8 h-72 w-full" />
      ) : queue.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Nothing is waiting.</p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
          <ul>
            {queue.map((item) => (
              <li key={item.id} className="border-t border-line last:border-b">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(item.id);
                    setNote("");
                    setError(null);
                  }}
                  className={
                    item.id === selected
                      ? "flex min-h-11 w-full items-center text-left font-medium"
                      : "flex min-h-11 w-full items-center text-left text-muted hover:text-ink"
                  }
                >
                  <span className="truncate">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
          {current ? (
            <div>
              <p className="text-sm text-pine">
                {genreLabel(current.genre)}
                {current.live ? " · Replacing the live version" : " · Not on the desk"}
              </p>
              <h2 className="mt-2 font-display text-4xl tracking-tight">{current.name}</h2>
              <p className="mt-2 max-w-xl text-pretty text-muted">{current.blurb}</p>
              <p className="mt-2 text-sm text-muted">
                From {current.ownerName}
                {current.ownerEmail ? ` · ${current.ownerEmail}` : ""}
              </p>
              <div className="mt-6">
                {draft ? (
                  <AppFrame html={draft.html} title={`${draft.name} preview`} />
                ) : (
                  <Skeleton className="h-[70vh] w-full" />
                )}
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium">Note if you reject it</span>
                <TextArea value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} className="min-h-20" />
              </label>
              {error ? (
                <p role="alert" className="mt-3 text-sm text-fail">
                  {error}
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button tone="primary" disabled={busy !== null || !draft} onClick={() => void decide("approve")}>
                  {busy === "approve" ? "Approving…" : "Approve"}
                </Button>
                <Button tone="quiet" disabled={busy !== null} onClick={() => void decide("reject")}>
                  {busy === "reject" ? "Rejecting…" : "Reject"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Shell>
  );
}

function OwnAppForm() {
  const [mine, setMine] = useState<MineApp[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [genre, setGenre] = useState<GenreId>("work");
  const [html, setHtml] = useState("");
  const [features, setFeatures] = useState("");
  const [guide, setGuide] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return listMine()
      .then(setMine)
      .catch(() => setMine([]));
  }

  useEffect(() => {
    let cancel = false;
    listMine()
      .then((rows) => {
        if (!cancel) setMine(rows);
      })
      .catch(() => {
        if (!cancel) setMine([]);
      });
    return () => {
      cancel = true;
    };
  }, []);

  function reset() {
    setEditing(null);
    setName("");
    setBlurb("");
    setGenre("work");
    setHtml("");
    setFeatures("");
    setGuide("");
    setError(null);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_HTML_CHARS) {
      setError("That file is over 80KB.");
      return;
    }
    setHtml(await file.text());
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await publishOwnApp({
        data: { id: editing ?? undefined, name, blurb, genre, html, features, guide },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Replaced on the desk." : "On the desk.");
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish that.");
    } finally {
      setBusy(false);
    }
  }

  const ready = html.includes("<") && html.trim().length >= 16;

  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl tracking-tight">Add one you built</h2>
      <p className="mt-2 max-w-2xl text-sm text-pretty text-muted">
        Paste the HTML from Grok, or upload a file you made any other way. Check it in the sandbox, then put it on the desk. It does not wait in the queue. Visitors need Midnry Pass to open it. You can open yours immediately.
      </p>
      <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4">
        <Field label="Name">
          <TextInput value={name} onChange={(event) => setName(event.target.value)} maxLength={48} required />
        </Field>
        <Field label="Description" hint="One sentence. It shows on the desk.">
          <TextArea
            value={blurb}
            onChange={(event) => setBlurb(event.target.value)}
            maxLength={200}
            className="min-h-24"
            required
          />
        </Field>
        <Field label="Features" hint="One feature per line. At least two. Shown on the app page.">
          <TextArea value={features} onChange={(event) => setFeatures(event.target.value)} className="min-h-28" required />
        </Field>
        <Field label="How to use" hint="One step per line. At least two.">
          <TextArea value={guide} onChange={(event) => setGuide(event.target.value)} className="min-h-28" required />
        </Field>
        <Field label="Genre">
          <select className={fieldClass} value={genre} onChange={(event) => setGenre(event.target.value as GenreId)}>
            {GENRES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="HTML" hint="Paste a full page, or upload one .html file. 80KB max.">
          <TextArea
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            className="min-h-40 font-mono text-sm"
            spellCheck={false}
            placeholder="<!doctype html>"
          />
        </Field>
        <input
          type="file"
          accept=".html,text/html"
          className={fieldClass}
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        {error ? (
          <p role="alert" className="text-sm text-fail">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" tone="primary" disabled={busy || !ready}>
            {busy ? "Publishing…" : editing ? "Replace the live app" : "Put it on the desk"}
          </Button>
          {editing ? (
            <Button tone="quiet" onClick={reset}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
      {ready ? (
        <div className="mt-6">
          <AppFrame html={html} title={name || "Preview"} />
        </div>
      ) : null}
      {mine && mine.length > 0 ? (
        <ul className="mt-8 max-w-xl">
          {mine.map((app) => (
            <li key={app.id} className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line py-3 last:border-b">
              <span>
                <span className="font-medium">{app.name}</span>
                <span className="ml-2 text-sm text-muted">{app.live ? "On the desk" : "Not live"}</span>
              </span>
              <span className="flex gap-3">
                <button
                  type="button"
                  className="min-h-11 text-sm underline"
                  onClick={() => {
                    setEditing(app.id);
                    setName(app.name);
                    setBlurb(app.blurb);
                    setFeatures(app.features);
                    setGuide(app.guide);
                    setGenre(app.genre);
                    setHtml(app.html);
                    setError(null);
                  }}
                >
                  Replace
                </button>
                {app.live ? (
                  <Link to="/apps/$slug" params={{ slug: app.slug }} className="inline-flex min-h-11 items-center text-sm underline">
                    Open
                  </Link>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
