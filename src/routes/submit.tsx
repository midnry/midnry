import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { GENRES, genreLabel, type GenreId } from "@/lib/catalog";
import { CREATOR_POOL_PERCENT, MAX_HTML_CHARS } from "@/lib/revenue";
import { listMine, saveSubmission, type MineApp } from "@/lib/community.functions";
import { Button, Field, Skeleton, TextArea, TextInput, fieldClass } from "@/components/ui";
import { toast } from "sonner";

export const Route = createFileRoute("/submit")({
  head: () => ({ meta: [{ title: "Add an app — Midnry" }] }),
  component: SubmitPage,
});

function statusLabel(app: MineApp): string {
  if (app.live && app.draftStatus === "pending") return "Live · update in review";
  if (app.live && app.draftStatus === "rejected") return "Live · update rejected";
  if (app.live) return "Live";
  if (app.draftStatus === "rejected") return "Rejected";
  return "In review";
}

function SubmitPage() {
  const { user, isPending } = useCurrentUserState();
  const [mine, setMine] = useState<MineApp[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [genre, setGenre] = useState<GenreId>("freelance");
  const [html, setHtml] = useState("");
  const [features, setFeatures] = useState("");
  const [guide, setGuide] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return listMine()
      .then(setMine)
      .catch(() => setMine([]));
  }

  useEffect(() => {
    if (!user) return;
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
  }, [user?.id]);

  if (isPending || (user && !mine)) {
    return (
      <Shell>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-64 w-full max-w-xl" />
      </Shell>
    );
  }
  if (!user || !mine) return <RedirectToSignIn to="/login" />;

  function reset() {
    setEditing(null);
    setName("");
    setBlurb("");
    setGenre("work");
    setHtml("");
    setFeatures("");
    setGuide("");
    setFileName("");
    setError(null);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_HTML_CHARS) {
      setError("That file is over 80KB.");
      return;
    }
    const text = await file.text();
    setHtml(text);
    setFileName(file.name);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await saveSubmission({
        data: { id: editing ?? undefined, name, blurb, genre, html, features, guide },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Update sent for review." : "Sent for review.");
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">Add an app</h1>
      <p className="mt-3 max-w-xl text-pretty text-muted">
        Upload one HTML file. It stays off the desk until the admin opens it in a sandbox and approves it.
        Approved apps share {CREATOR_POOL_PERCENT}% of Midnry Pass, split by how often each one is opened.
      </p>

      <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-4">
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
        <Field label="Features" hint="One feature per line. At least two. These show on the app page, not the desk.">
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
        <Field label="HTML file" hint={fileName || "A single .html file. Scripts cannot leave the sandbox."}>
          <input
            type="file"
            accept=".html,text/html"
            className={fieldClass}
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-fail">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" tone="primary" disabled={busy || !html}>
            {busy ? "Sending…" : editing ? "Send update" : "Submit for review"}
          </Button>
          {editing ? (
            <Button tone="quiet" onClick={reset}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <section className="mt-12 max-w-xl">
        <h2 className="font-display text-3xl tracking-tight">Your apps</h2>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing submitted yet.</p>
        ) : (
          <ul className="mt-4">
            {mine.map((app) => (
              <li key={app.id} className="border-t border-line py-4 last:border-b">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{app.name}</p>
                  <p className="text-sm text-pine">{statusLabel(app)}</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {genreLabel(app.genre)} · {app.blurb}
                </p>
                {app.reviewNote ? <p className="mt-2 text-sm text-fail">{app.reviewNote}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    tone="quiet"
                    onClick={() => {
                      setEditing(app.id);
                      setName(app.name);
                      setBlurb(app.blurb);
                      setFeatures(app.features);
                      setGuide(app.guide);
                      setGenre(app.genre);
                      setHtml(app.html);
                      setFileName("Current file kept until you replace it");
                      setError(null);
                    }}
                  >
                    Edit
                  </Button>
                  {app.live || app.draftStatus !== "clean" ? (
                    <Link to="/apps/$slug" params={{ slug: app.slug }} className="inline-flex min-h-11 items-center text-sm underline">
                      Preview
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-sm text-muted">
          <Link to="/earnings" className="underline">
            See this month’s share
          </Link>
        </p>
      </section>
    </Shell>
  );
}
