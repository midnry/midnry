import { useMemo, useState } from "react";
import { Button, TextArea, TextInput, cn } from "@/components/ui";
import {
  LIMITS,
  SAMPLE_LABEL,
  STARTER_DECKS,
  copyStarterDeck,
  deckStats,
  deckText,
  dueCards,
  newDeck,
  recordReview,
  resetProgress,
  starterDeck,
  starterKey,
  type Card,
  type CardState,
  type Deck,
  type StudyDoc,
} from "@/lib/study";
import { BackButton, ConfirmButton, CopyButton, Panel, ReviewNote, makeId, plural, prettyDate, printText, stamp } from "@/components/tools/study/parts";
import { SharePanel, type Shares } from "@/components/tools/study/share";
import type { ShareInfo } from "@/lib/study-shares.server";

type Screen = { kind: "list" } | { kind: "edit"; id: string } | { kind: "review"; key: string; all?: boolean };

/** The Cards tab: your decks, the sample deck, editing, and spaced review. */
export function CardsView({
  doc,
  commit,
  shares,
  onShares,
  open,
}: {
  doc: StudyDoc;
  commit: (change: (doc: StudyDoc) => StudyDoc) => void;
  shares: Shares;
  onShares: (list: ShareInfo[]) => void;
  open?: string | null;
}) {
  const [screen, setScreen] = useState<Screen>(() => (open && doc.decks.some((deck) => deck.id === open) ? { kind: "edit", id: open } : { kind: "list" }));
  const today = stamp().today;

  function go(next: Screen) {
    setScreen(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  if (screen.kind === "review") {
    const starter = screen.key.startsWith("starter:") ? starterDeck(screen.key.slice(8)) : undefined;
    const own = starter ? undefined : doc.decks.find((deck) => deck.id === screen.key);
    if (!starter && !own) return <CardsList doc={doc} today={today} go={go} commit={commit} />;
    return (
      <Review
        key={`${screen.key}-${screen.all ? "all" : "due"}`}
        title={starter?.title ?? (own!.title || "Untitled deck")}
        from={starter?.id ?? own!.from}
        cards={(starter?.cards ?? own!.cards).filter((c) => c.front.trim() || c.back.trim())}
        states={doc.progress[screen.key]}
        all={screen.all}
        today={today}
        onResult={(cardId, result) => commit((d) => recordReview(d, screen.key, cardId, result, stamp().today))}
        onAll={() => go({ kind: "review", key: screen.key, all: true })}
        onExit={() => go(own ? { kind: "edit", id: own.id } : { kind: "list" })}
      />
    );
  }

  if (screen.kind === "edit") {
    const deck = doc.decks.find((item) => item.id === screen.id);
    if (!deck) return <CardsList doc={doc} today={today} go={go} commit={commit} />;
    return (
      <DeckEditor
        deck={deck}
        states={doc.progress[deck.id]}
        today={today}
        shares={shares}
        onShares={onShares}
        onChange={(next) => commit((d) => ({ ...d, decks: d.decks.map((item) => (item.id === next.id ? { ...next, updatedAt: stamp().now } : item)) }))}
        onReview={() => go({ kind: "review", key: deck.id })}
        onReset={() => commit((d) => resetProgress(d, deck.id))}
        onDelete={() => {
          commit((d) => resetProgress({ ...d, decks: d.decks.filter((item) => item.id !== deck.id) }, deck.id));
          go({ kind: "list" });
        }}
        onBack={() => go({ kind: "list" })}
      />
    );
  }

  return <CardsList doc={doc} today={today} go={go} commit={commit} />;
}

function CardsList({ doc, today, go, commit }: { doc: StudyDoc; today: string; go: (screen: Screen) => void; commit: (change: (doc: StudyDoc) => StudyDoc) => void }) {
  const full = doc.decks.length >= LIMITS.decks;
  function create() {
    const deck = { ...newDeck(stamp(), makeId), cards: [{ id: makeId(), front: "", back: "" }] };
    commit((d) => ({ ...d, decks: [deck, ...d.decks] }));
    go({ kind: "edit", id: deck.id });
  }
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-tight">Your decks</h2>
          <p className="mt-1 text-sm text-muted">Flip a card, then say whether you knew it. Cards you knew come back later; the ones you missed come back sooner.</p>
        </div>
        <Button onClick={create} disabled={full}>
          New deck
        </Button>
      </div>
      {full ? <p className="mt-2 text-sm text-fail">You have {LIMITS.decks} decks. Delete one to make room.</p> : null}
      {doc.decks.length === 0 ? (
        <Panel className="mt-4">
          <p className="text-pretty">No decks yet. Make one for whatever you are learning: a term on the front, what it means on the back.</p>
        </Panel>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2" data-deck-list>
          {doc.decks.map((deck) => {
            const stats = deckStats(deck.cards, doc.progress[deck.id], today);
            return (
              <li key={deck.id} className="flex flex-col rounded-2xl bg-card p-4 shadow-line">
                <button type="button" className="text-left" onClick={() => go({ kind: "edit", id: deck.id })}>
                  <span className="block font-medium break-words hover:underline">{deck.title || "Untitled deck"}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {plural(stats.total, "card")} · {stats.due > 0 ? `${stats.due} to review today` : stats.nextDue ? `next review ${prettyDate(stats.nextDue)}` : "nothing due"} · {stats.known} known
                  </span>
                  {deck.source === "shared" ? <span className="mt-1 block text-xs text-muted">Saved from a share link</span> : null}
                </button>
                <ReviewNote from={deck.from} className="mt-3" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button tone="primary" disabled={stats.total === 0} onClick={() => go({ kind: "review", key: deck.id })}>
                    Review
                  </Button>
                  <Button tone="quiet" onClick={() => go({ kind: "edit", id: deck.id })}>
                    Open
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-10" aria-labelledby="sample-decks">
        <h2 id="sample-decks" className="font-display text-2xl tracking-tight">
          {SAMPLE_LABEL}
        </h2>
        <p className="mt-1 text-sm text-muted">A short sample deck to try. Copy it to make it your own and change any card.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {STARTER_DECKS.map((starter) => {
            const key = starterKey(starter.id);
            const stats = deckStats(starter.cards, doc.progress[key], today);
            return (
              <li key={starter.id} className="flex flex-col rounded-2xl bg-card p-4 shadow-line" data-starter={starter.id}>
                <span className="font-medium">{starter.title}</span>
                <span className="mt-1 text-sm text-muted">
                  {starter.subject} · {plural(stats.total, "card")} · {stats.due > 0 ? `${stats.due} to review today` : `next review ${prettyDate(stats.nextDue)}`}
                </span>
                <ReviewNote from={starter.id} className="mt-3" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button tone="quiet" onClick={() => go({ kind: "review", key })}>
                    Review
                  </Button>
                  <Button
                    tone="quiet"
                    disabled={full}
                    onClick={() => {
                      const deck = copyStarterDeck(starter, stamp(), makeId);
                      commit((d) => ({ ...d, decks: [deck, ...d.decks] }));
                      go({ kind: "edit", id: deck.id });
                    }}
                  >
                    Copy and edit
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function DeckEditor({
  deck,
  states,
  today,
  shares,
  onShares,
  onChange,
  onReview,
  onReset,
  onDelete,
  onBack,
}: {
  deck: Deck;
  states: Record<string, CardState> | undefined;
  today: string;
  shares: Shares;
  onShares: (list: ShareInfo[]) => void;
  onChange: (deck: Deck) => void;
  onReview: () => void;
  onReset: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [bulk, setBulk] = useState("");
  const stats = deckStats(deck.cards, states, today);
  const full = deck.cards.length >= LIMITS.cards;
  const setCard = (id: string, patch: Partial<Card>) => onChange({ ...deck, cards: deck.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const text = deckText(deck.title, deck.cards);
  const parsed = bulk
    .split("\n")
    .map((line) => line.split(/\t| - | – | — |: /))
    .filter((parts) => parts.length >= 2 && parts[0].trim())
    .map(([front, ...rest]) => ({ front: front.trim(), back: rest.join(" - ").trim() }));

  return (
    <div>
      <BackButton onClick={onBack} label="All decks" />
      <label className="mt-2 block text-sm">
        <span className="mb-1 block text-muted">Deck name</span>
        <TextInput value={deck.title} maxLength={LIMITS.title} placeholder="Untitled deck" onChange={(event) => onChange({ ...deck, title: event.target.value })} />
      </label>
      <ReviewNote from={deck.from} className="mt-3" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button disabled={stats.total === 0} onClick={onReview}>
          Review {stats.due > 0 ? `(${stats.due} due)` : ""}
        </Button>
        <CopyButton text={deck.cards.length ? text : ""} label="Copy as text" />
        <Button tone="quiet" disabled={deck.cards.length === 0} onClick={() => printText(deck.title || "Deck", text)}>
          Print
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted">
        {plural(stats.total, "card")} · {stats.known} known · {stats.due > 0 ? `${stats.due} to review today` : stats.nextDue ? `next review ${prettyDate(stats.nextDue)}` : "nothing due"}
      </p>

      <h3 className="mt-8 font-medium">Cards</h3>
      <ol className="mt-3 space-y-3">
        {deck.cards.map((c, index) => (
          <li key={c.id} className="rounded-2xl bg-card p-4 shadow-line" data-card>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="min-w-0 text-sm">
                <span className="mb-1 block text-muted">Front {index + 1}</span>
                <TextArea rows={2} className="min-h-20" value={c.front} maxLength={LIMITS.text} onChange={(event) => setCard(c.id, { front: event.target.value })} />
              </label>
              <label className="min-w-0 text-sm">
                <span className="mb-1 block text-muted">Back {index + 1}</span>
                <TextArea rows={2} className="min-h-20" value={c.back} maxLength={LIMITS.text} onChange={(event) => setCard(c.id, { back: event.target.value })} />
              </label>
            </div>
            <button type="button" className="mt-2 min-h-11 text-sm text-muted hover:text-ink" onClick={() => onChange({ ...deck, cards: deck.cards.filter((item) => item.id !== c.id) })}>
              Remove card {index + 1}
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button tone="quiet" disabled={full} onClick={() => onChange({ ...deck, cards: [...deck.cards, { id: makeId(), front: "", back: "" }] })}>
          Add a card
        </Button>
      </div>
      {full ? <p className="mt-2 text-sm text-fail">A deck holds up to {LIMITS.cards} cards. Start another deck for the rest.</p> : null}

      <details className="mt-6 rounded-2xl bg-card p-4 shadow-line">
        <summary className="cursor-pointer text-sm font-medium">Add several cards at once</summary>
        <p className="mt-2 text-sm text-muted">One card per line: the front, then a dash or a tab, then the back. For example: Femur - The longest bone.</p>
        <TextArea className="mt-2" rows={4} value={bulk} onChange={(event) => setBulk(event.target.value)} aria-label="Several cards, one per line" />
        <Button
          tone="quiet"
          className="mt-2"
          disabled={parsed.length === 0 || deck.cards.length + parsed.length > LIMITS.cards}
          onClick={() => {
            const kept = deck.cards.filter((c) => c.front.trim() || c.back.trim());
            onChange({ ...deck, cards: [...kept, ...parsed.map((item) => ({ id: makeId(), front: item.front.slice(0, LIMITS.text), back: item.back.slice(0, LIMITS.text) }))] });
            setBulk("");
          }}
        >
          {parsed.length ? `Add ${plural(parsed.length, "card")}` : "Add cards"}
        </Button>
      </details>

      <SharePanel kind="deck" item={deck} shares={shares} onChange={onShares} />

      <div className="mt-6 flex flex-wrap gap-2">
        <ConfirmButton label="Reset progress" question="Forget which cards you knew?" disabled={!states || Object.keys(states).length === 0} onConfirm={onReset} />
        <ConfirmButton label="Delete deck" question="Delete this deck and its progress?" onConfirm={onDelete} />
      </div>
    </div>
  );
}

/** One review session. Each answer is saved straight away, so a reload keeps your progress. */
function Review({
  title,
  from,
  cards,
  states,
  all,
  today,
  onResult,
  onAll,
  onExit,
}: {
  title: string;
  from?: string;
  cards: Card[];
  states: Record<string, CardState> | undefined;
  all?: boolean;
  today: string;
  onResult: (cardId: string, result: "known" | "again") => void;
  onAll: () => void;
  onExit: () => void;
}) {
  // The queue is fixed when the session starts; a card you miss goes to the back once more.
  const [queue, setQueue] = useState<Card[]>(() => (all ? cards : dueCards(cards, states, today)));
  const [flip, setFlip] = useState(false);
  const [tally, setTally] = useState({ known: 0, again: 0 });
  const stats = useMemo(() => deckStats(cards, states, today), [cards, states, today]);
  const current = queue[0];

  function answer(result: "known" | "again") {
    if (!current) return;
    onResult(current.id, result);
    setTally((t) => ({ ...t, [result]: t[result] + 1 }));
    setFlip(false);
    setQueue((list) => (result === "again" ? [...list.slice(1), list[0]] : list.slice(1)));
  }

  return (
    <div>
      <BackButton onClick={onExit} />
      <h2 className="mt-1 font-display text-3xl tracking-tight break-words">{title}</h2>
      <ReviewNote from={from} className="mt-3" />
      {!current ? (
        <Panel className="mt-4">
          <p className="font-medium" role="status">
            {tally.known + tally.again > 0 ? "Done for now." : "Nothing to review today."}
          </p>
          <p className="mt-1 text-sm text-muted">
            {tally.known + tally.again > 0 ? `${tally.known} knew it · ${tally.again} again. ` : ""}
            {stats.due > 0 ? `${stats.due} still due.` : stats.nextDue ? `Next review ${prettyDate(stats.nextDue)}.` : ""} Your progress is saved.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={onExit}>Finish</Button>
            {cards.length > 0 ? (
              <Button tone="quiet" onClick={onAll}>
                Practise every card
              </Button>
            ) : null}
          </div>
        </Panel>
      ) : (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between text-sm text-muted">
            <span>{plural(queue.length, "card")} left</span>
            <span>
              {tally.known} knew it · {tally.again} again
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFlip((value) => !value)}
            aria-label={flip ? "Show the front" : "Show the answer"}
            data-flashcard
            className={cn("min-h-48 w-full rounded-2xl p-6 text-left shadow-line transition-colors", flip ? "bg-pine text-paper" : "bg-card")}
          >
            <span className={cn("text-sm", flip ? "opacity-80" : "text-muted")}>{flip ? "Answer" : "Question"}</span>
            <span className="mt-3 block text-xl text-pretty break-words whitespace-pre-wrap">{flip ? current.back : current.front}</span>
            <span className={cn("mt-4 block text-xs", flip ? "opacity-70" : "text-muted")}>Tap to {flip ? "see the question" : "reveal the answer"}</span>
          </button>
          <div className="mt-3 flex flex-wrap gap-2">
            {flip ? (
              <>
                <Button tone="quiet" onClick={() => answer("again")}>
                  Again
                </Button>
                <Button onClick={() => answer("known")}>I knew it</Button>
              </>
            ) : (
              <Button onClick={() => setFlip(true)}>Show the answer</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
