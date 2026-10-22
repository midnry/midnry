import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { Button, Skeleton } from "@/components/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAppDoc } from "@/components/use-app-doc";
import { openStudyShare } from "@/lib/study.functions";
import { STUDY_SLUG, copyShared, normalizeStudy, type SharedItem } from "@/lib/study";
import { Panel, ReviewNote, makeId, plural, stamp } from "@/components/tools/study/parts";
import { saveStateLabel } from "@/components/tools/shared";

// A Study space share link: a read-only copy of someone's deck or quiz. Opening
// it needs a signed-in account (free is enough); it can be saved into your own
// Study space. Making links needs Midnry Pass (src/lib/study.functions.ts).
export const Route = createFileRoute("/study/shared/$token")({
  head: () => ({ meta: [{ title: "Shared study set — Midnry" }, { name: "robots", content: "noindex" }] }),
  component: SharedPage,
});

type State = { kind: "loading" } | { kind: "missing" } | { kind: "error" } | { kind: "ready"; shared: SharedItem; mine: boolean };

function SharedPage() {
  const { token } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const here = `/study/shared/${token}`;

  return (
    <Shell>
      <p className="text-sm text-muted">Shared from a Study space</p>
      {isPending ? (
        <Skeleton className="mt-4 h-48 w-full" />
      ) : !user ? (
        <div className="mt-2 max-w-xl">
          <h1 className="font-display text-4xl tracking-tight">Sign in to open this study set</h1>
          <p className="mt-3 text-pretty text-muted">
            Someone shared a deck of cards or a practice quiz with you. Sign in, or make a free account, to see it and save a copy to your own Study space.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/login" search={{ intent: "sign-in", next: here }} className="inline-flex min-h-11 items-center rounded-full bg-pine px-5 text-sm font-medium text-paper">
              Sign in
            </Link>
            <Link to="/login" search={{ intent: "register", next: here }} className="inline-flex min-h-11 items-center rounded-full bg-card px-5 text-sm font-medium shadow-line">
              Create a free account
            </Link>
          </div>
        </div>
      ) : (
        <SharedSet token={token} />
      )}
    </Shell>
  );
}

function SharedSet({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const { setData, ready, loadError, blocked, saveState } = useAppDoc<Record<string, unknown>>(STUDY_SLUG, {});
  const [saved, setSaved] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    openStudyShare({ data: token })
      .then((res) => {
        if (!live) return;
        setState(res.ok ? { kind: "ready", shared: res.shared, mine: res.mine } : { kind: "missing" });
      })
      .catch(() => live && setState({ kind: "error" }));
    return () => {
      live = false;
    };
  }, [token]);

  if (state.kind === "loading") return <Skeleton className="mt-4 h-48 w-full" />;
  if (state.kind === "error") return <p className="mt-4 text-fail">Could not open this link. Refresh and try again.</p>;
  if (state.kind === "missing") {
    return (
      <div className="mt-2 max-w-xl" data-share-missing>
        <h1 className="font-display text-4xl tracking-tight">This link doesn't open</h1>
        <p className="mt-3 text-pretty text-muted">It may have been turned off by the person who shared it, or the address isn't complete. Ask them for a new link.</p>
        <Link to="/apps/$slug" params={{ slug: STUDY_SLUG }} className="mt-5 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
          Go to your Study space
        </Link>
      </div>
    );
  }

  const { shared, mine } = state;
  const view = shared.kind === "deck" ? "cards" : "practice";

  function save() {
    setProblem(null);
    try {
      let id = "";
      setData((prev) => {
        const result = copyShared(normalizeStudy(prev), shared, stamp(), makeId);
        id = result.id;
        return result.doc as unknown as Record<string, unknown>;
      });
      setSaved(id);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not save a copy.");
    }
  }

  return (
    <div className="mt-2" data-shared-set={shared.kind}>
      <h1 className="font-display text-4xl tracking-tight break-words">{shared.item.title}</h1>
      <p className="mt-2 text-muted">
        {shared.kind === "deck" ? `A deck of ${plural(shared.item.cards.length, "card")}` : `A practice quiz with ${plural(shared.item.questions.length, "question")}`}. Read-only: save a copy to
        study it and change it.
      </p>
      {mine ? <p className="mt-1 text-sm text-muted">This is your own link.</p> : null}
      <ReviewNote from={shared.item.from} className="mt-3 max-w-2xl" />
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {saved ? (
          <>
            <Link
              to="/apps/$slug"
              params={{ slug: STUDY_SLUG }}
              search={{ view }}
              className="inline-flex min-h-11 items-center rounded-full bg-pine px-5 text-sm font-medium text-paper"
              data-open-study
            >
              Open my Study space
            </Link>
            <span className="text-sm text-muted" aria-live="polite">
              Saved a copy. {saveStateLabel(saveState)}
            </span>
          </>
        ) : (
          <Button onClick={save} disabled={!ready || loadError || blocked}>
            Save a copy to my Study space
          </Button>
        )}
      </div>
      {problem ? (
        <p className="mt-2 text-sm text-fail" role="alert">
          {problem}
        </p>
      ) : null}
      {loadError ? <p className="mt-2 text-sm text-fail">Could not load your Study space. Refresh and try again.</p> : null}

      <Panel className="mt-6">
        {shared.kind === "deck" ? (
          <ol className="space-y-3">
            {shared.item.cards.map((card, index) => (
              <li key={card.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <p className="font-medium break-words whitespace-pre-wrap">
                  {index + 1}. {card.front}
                </p>
                <p className="mt-1 text-sm text-muted break-words whitespace-pre-wrap">{card.back}</p>
              </li>
            ))}
          </ol>
        ) : (
          <>
            <ol className="space-y-3">
              {shared.item.questions.map((item, index) => (
                <li key={item.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <p className="font-medium break-words">
                    {index + 1}. {item.q}
                  </p>
                  <ul className="mt-1 text-sm text-muted">
                    {item.options.map((option, at) => (
                      <li key={at} className="break-words">
                        {"ABCDEF"[at]}. {option}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            {shared.item.notes.trim() ? <p className="mt-4 text-sm whitespace-pre-wrap break-words text-muted">{shared.item.notes}</p> : null}
            <p className="mt-4 text-xs text-muted">Answers are hidden here. Save a copy to take the quiz.</p>
          </>
        )}
      </Panel>
    </div>
  );
}
