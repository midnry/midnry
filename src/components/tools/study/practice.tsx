import { useState } from "react";
import { Button, TextArea, TextInput, cn } from "@/components/ui";
import {
  LIMITS,
  SAMPLE_LABEL,
  broughtIn,
  STARTER_QUIZZES,
  copyStarterQuiz,
  newQuestion,
  newQuiz,
  playable,
  questionProblem,
  quizText,
  recordAttempt,
  scoreQuiz,
  scoreSummary,
  starterQuiz,
  type Question,
  type Quiz,
  type StudyDoc,
} from "@/lib/study";
import { BackButton, ConfirmButton, CopyButton, Panel, ReviewNote, makeId, plural, prettyDate, printText, stamp } from "@/components/tools/study/parts";
import { SharePanel, type Shares } from "@/components/tools/study/share";
import type { ShareInfo } from "@/lib/study-shares.server";

type Screen = { kind: "list" } | { kind: "edit"; id: string } | { kind: "play"; id: string };

const LETTERS = "ABCDEF";

/** The Practice tab: your quizzes, the sample sets, making a quiz, and saved scores. */
export function PracticeView({
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
  const [screen, setScreen] = useState<Screen>(() => (open && doc.quizzes.some((quiz) => quiz.id === open) ? { kind: "edit", id: open } : { kind: "list" }));
  function go(next: Screen) {
    setScreen(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  if (screen.kind === "play") {
    const starter = starterQuiz(screen.id);
    const own = starter ? undefined : doc.quizzes.find((quiz) => quiz.id === screen.id);
    if (starter || own) {
      return (
        <Player
          key={screen.id}
          title={starter?.title ?? (own!.title || "Untitled quiz")}
          from={starter?.id ?? own!.from}
          questions={playable(starter?.questions ?? own!.questions)}
          summary={scoreSummary(doc.attempts, screen.id)}
          onFinish={(answers) => {
            const result = scoreQuiz(playable(starter?.questions ?? own!.questions), answers);
            commit((d) => recordAttempt(d, screen.id, result, stamp().now, makeId));
          }}
          onExit={() => go(own ? { kind: "edit", id: own.id } : { kind: "list" })}
        />
      );
    }
  }

  if (screen.kind === "edit") {
    const quiz = doc.quizzes.find((item) => item.id === screen.id);
    if (quiz) {
      return (
        <QuizEditor
          quiz={quiz}
          doc={doc}
          shares={shares}
          onShares={onShares}
          onChange={(next) => commit((d) => ({ ...d, quizzes: d.quizzes.map((item) => (item.id === next.id ? { ...next, updatedAt: stamp().now } : item)) }))}
          onPlay={() => go({ kind: "play", id: quiz.id })}
          onDelete={() => {
            commit((d) => ({ ...d, quizzes: d.quizzes.filter((item) => item.id !== quiz.id), attempts: d.attempts.filter((item) => item.quizId !== quiz.id) }));
            go({ kind: "list" });
          }}
          onBack={() => go({ kind: "list" })}
        />
      );
    }
  }

  const full = doc.quizzes.length >= LIMITS.quizzes;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-tight">Your quizzes</h2>
          <p className="mt-1 text-sm text-muted">Questions with up to four choices and a reason. Every score is saved, so you can see how you're doing.</p>
        </div>
        <Button
          disabled={full}
          onClick={() => {
            const quiz = newQuiz(stamp(), makeId);
            commit((d) => ({ ...d, quizzes: [quiz, ...d.quizzes] }));
            go({ kind: "edit", id: quiz.id });
          }}
        >
          Make a quiz
        </Button>
      </div>
      {full ? <p className="mt-2 text-sm text-fail">You have {LIMITS.quizzes} quizzes. Delete one to make room.</p> : null}
      {doc.quizzes.length === 0 ? (
        <Panel className="mt-4">
          <p className="text-pretty">No quizzes yet. Make one to test yourself, or to print for a class.</p>
        </Panel>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2" data-quiz-list>
          {doc.quizzes.map((quiz) => {
            const ready = playable(quiz.questions).length;
            const summary = scoreSummary(doc.attempts, quiz.id);
            return (
              <li key={quiz.id} className="flex flex-col rounded-2xl bg-card p-4 shadow-line">
                <button type="button" className="text-left" onClick={() => go({ kind: "edit", id: quiz.id })}>
                  <span className="block font-medium break-words hover:underline">{quiz.title || "Untitled quiz"}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {plural(ready, "question")}
                    {summary.last ? ` · last score ${summary.last.score} of ${summary.last.total}` : ""}
                    {summary.best && summary.count > 1 ? ` · best ${summary.best.score} of ${summary.best.total}` : ""}
                  </span>
                  {quiz.source === "shared" ? <span className="mt-1 block text-xs text-muted">Saved from a share link</span> : null}
                  {broughtIn(quiz.from) === "Quiz" ? <span className="mt-1 block text-xs text-muted">Brought in from Quiz</span> : null}
                </button>
                <ReviewNote from={quiz.from} className="mt-3" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={ready === 0} onClick={() => go({ kind: "play", id: quiz.id })}>
                    Start
                  </Button>
                  <Button tone="quiet" onClick={() => go({ kind: "edit", id: quiz.id })}>
                    Open
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-10" aria-labelledby="sample-quizzes">
        <h2 id="sample-quizzes" className="font-display text-2xl tracking-tight">
          {SAMPLE_LABEL}
        </h2>
        <p className="mt-1 text-sm text-muted">Short sample sets to practise on. Copy one to change the questions.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {STARTER_QUIZZES.map((starter) => {
            const summary = scoreSummary(doc.attempts, starter.id);
            return (
              <li key={starter.id} className="flex flex-col rounded-2xl bg-card p-4 shadow-line" data-starter={starter.id}>
                <span className="font-medium">{starter.title}</span>
                <span className="mt-1 text-sm text-muted">
                  {starter.subject} · {plural(starter.questions.length, "question")}
                  {summary.last ? ` · last score ${summary.last.score} of ${summary.last.total}` : ""}
                </span>
                <ReviewNote from={starter.id} className="mt-3" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button tone="quiet" onClick={() => go({ kind: "play", id: starter.id })}>
                    Start
                  </Button>
                  <Button
                    tone="quiet"
                    disabled={full}
                    onClick={() => {
                      const quiz = copyStarterQuiz(starter, stamp(), makeId);
                      commit((d) => ({ ...d, quizzes: [quiz, ...d.quizzes] }));
                      go({ kind: "edit", id: quiz.id });
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

function QuizEditor({
  quiz,
  doc,
  shares,
  onShares,
  onChange,
  onPlay,
  onDelete,
  onBack,
}: {
  quiz: Quiz;
  doc: StudyDoc;
  shares: Shares;
  onShares: (list: ShareInfo[]) => void;
  onChange: (quiz: Quiz) => void;
  onPlay: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState(true);
  const ready = playable(quiz.questions);
  const summary = scoreSummary(doc.attempts, quiz.id);
  const history = doc.attempts.filter((item) => item.quizId === quiz.id).slice(-5).reverse();
  const text = quizText(quiz.title, quiz.questions, quiz.notes, answers);
  const full = quiz.questions.length >= LIMITS.questions;
  const setQuestion = (id: string, patch: Partial<Question>) => onChange({ ...quiz, questions: quiz.questions.map((item) => (item.id === id ? { ...item, ...patch } : item)) });

  return (
    <div>
      <BackButton onClick={onBack} label="All quizzes" />
      <label className="mt-2 block text-sm">
        <span className="mb-1 block text-muted">Quiz name or topic</span>
        <TextInput value={quiz.title} maxLength={LIMITS.title} placeholder="Untitled quiz" onChange={(event) => onChange({ ...quiz, title: event.target.value })} />
      </label>
      <ReviewNote from={quiz.from} className="mt-3" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button disabled={ready.length === 0} onClick={onPlay}>
          Start the quiz
        </Button>
        <CopyButton text={text} label="Copy as text" />
        <Button tone="quiet" onClick={() => printText(quiz.title || "Quiz", text)}>
          Print
        </Button>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={answers} onChange={(event) => setAnswers(event.target.checked)} />
          Include answers when copying or printing
        </label>
      </div>
      {summary.last ? (
        <p className="mt-2 text-sm text-muted" data-score-summary>
          Last score {summary.last.score} of {summary.last.total}
          {summary.best ? ` · best ${summary.best.score} of ${summary.best.total}` : ""} · {plural(summary.count, "attempt")} saved
        </p>
      ) : null}
      {history.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
          {history.map((item) => (
            <li key={item.id} className="rounded-full bg-paper-2 px-3 py-1">
              {item.score}/{item.total} on {prettyDate(item.at)}
            </li>
          ))}
        </ul>
      ) : null}

      <h3 className="mt-8 font-medium">Questions</h3>
      <ol className="mt-3 space-y-3">
        {quiz.questions.map((item, index) => {
          const problem = questionProblem(item);
          return (
            <li key={item.id} className="rounded-2xl bg-card p-4 shadow-line" data-question>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Question {index + 1}</span>
                <TextArea rows={2} className="min-h-20" value={item.q} maxLength={LIMITS.text} onChange={(event) => setQuestion(item.id, { q: event.target.value })} />
              </label>
              <fieldset className="mt-3">
                <legend className="mb-1 text-sm text-muted">Choices. Pick the right one.</legend>
                <div className="grid gap-2">
                  {item.options.map((option, at) => (
                    <div key={at} className="flex items-center gap-2">
                      <input
                        type="radio"
                        className="size-5 shrink-0"
                        name={`answer-${item.id}`}
                        checked={item.answer === at}
                        aria-label={`Choice ${LETTERS[at]} is right`}
                        onChange={() => setQuestion(item.id, { answer: at })}
                      />
                      <TextInput
                        value={option}
                        maxLength={1000}
                        aria-label={`Question ${index + 1}, choice ${LETTERS[at]}`}
                        placeholder={`Choice ${LETTERS[at]}`}
                        onChange={(event) => setQuestion(item.id, { options: item.options.map((value, i) => (i === at ? event.target.value : value)) })}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
              <label className="mt-3 block text-sm">
                <span className="mb-1 block text-muted">Why, shown after answering (optional)</span>
                <TextInput value={item.why} maxLength={LIMITS.text} onChange={(event) => setQuestion(item.id, { why: event.target.value })} />
              </label>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className={cn("text-sm", problem ? "text-muted" : "text-pine")}>{problem ?? "Ready"}</span>
                <button type="button" className="min-h-11 text-sm text-muted hover:text-ink" onClick={() => onChange({ ...quiz, questions: quiz.questions.filter((other) => other.id !== item.id) })}>
                  Remove question {index + 1}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <Button tone="quiet" className="mt-3" disabled={full} onClick={() => onChange({ ...quiz, questions: [...quiz.questions, newQuestion(makeId)] })}>
        Add a question
      </Button>

      <label className="mt-6 block text-sm">
        <span className="mb-1 block text-muted">Notes, kept as you write them (optional)</span>
        <TextArea rows={4} value={quiz.notes} maxLength={LIMITS.long} placeholder="Instructions for a class, or questions you haven't split up yet" onChange={(event) => onChange({ ...quiz, notes: event.target.value })} />
      </label>
      {broughtIn(quiz.from) === "Quiz" ? <p className="mt-1 text-xs text-muted">Brought in from your Quiz app as you wrote it. Split it into questions above whenever you like.</p> : null}

      <SharePanel kind="quiz" item={quiz} shares={shares} onChange={onShares} />

      <div className="mt-6 flex flex-wrap gap-2">
        <ConfirmButton label="Delete quiz" question="Delete this quiz and its scores?" onConfirm={onDelete} />
      </div>
    </div>
  );
}

function Player({
  title,
  from,
  questions,
  summary,
  onFinish,
  onExit,
}: {
  title: string;
  from?: string;
  questions: Question[];
  summary: ReturnType<typeof scoreSummary>;
  onFinish: (answers: number[]) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);
  const total = questions.length;
  const question = questions[index];
  const result = scoreQuiz(questions, answers);

  function restart() {
    setIndex(0);
    setPicked(null);
    setAnswers([]);
    setSaved(false);
  }

  if (total === 0) {
    return (
      <div>
        <BackButton onClick={onExit} />
        <p className="mt-2">Add a question with at least two choices and the right answer picked.</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div>
        <BackButton onClick={onExit} />
        <h2 className="mt-1 font-display text-3xl tracking-tight break-words">{title}</h2>
        <ReviewNote from={from} className="mt-3" />
        <Panel className="mt-4">
          <p className="text-sm text-muted">Your score</p>
          <p className="mt-1 font-display text-4xl tracking-tight" data-quiz-score>
            {result.score} of {result.total}
          </p>
          <p className="mt-2 text-muted">
            {result.score === total ? "Every answer right." : result.percent >= 70 ? "Strong. Review the ones you missed." : "Keep going. Review the answers below, then try again."} Saved to your scores.
          </p>
          {summary.best && summary.count > 1 ? <p className="mt-1 text-sm text-muted">Your best: {summary.best.score} of {summary.best.total}.</p> : null}
        </Panel>
        {result.missed.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {result.missed.map((at) => {
              const item = questions[at];
              return (
                <li key={item.id} className="rounded-2xl bg-card p-4 shadow-line">
                  <p className="font-medium break-words">{item.q}</p>
                  <p className="mt-1 text-sm break-words">Answer: {item.options[item.answer]}</p>
                  {item.why ? <p className="mt-1 text-sm text-muted break-words">{item.why}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={restart}>Try again</Button>
          <Button tone="quiet" onClick={onExit}>
            Finish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackButton onClick={onExit} />
      <h2 className="mt-1 font-display text-3xl tracking-tight break-words">{title}</h2>
      <ReviewNote from={from} className="mt-3" />
      <div className="mt-4 mb-3 flex items-center justify-between text-sm text-muted">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>Score {result.score}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-pine transition-[width]" style={{ width: `${(index / total) * 100}%` }} />
      </div>
      <p className="text-lg font-medium text-pretty break-words">{question.q}</p>
      <div className="mt-3 grid gap-2">
        {question.options.map((option, optionIndex) => {
          const right = picked != null && optionIndex === question.answer;
          const wrong = picked === optionIndex && optionIndex !== question.answer;
          return (
            <button
              key={optionIndex}
              type="button"
              disabled={picked != null}
              data-choice
              className={cn(
                "rounded-2xl px-4 py-3 text-left break-words shadow-line transition-colors",
                right ? "bg-pine text-paper" : wrong ? "bg-fail text-white" : "bg-card",
                picked == null && "hover:bg-paper-2",
                picked != null && !right && !wrong && "opacity-60",
              )}
              onClick={() => {
                setPicked(optionIndex);
                setAnswers((list) => [...list, optionIndex]);
              }}
            >
              {option}
              {right ? " ✓" : wrong ? " ✗" : ""}
            </button>
          );
        })}
      </div>
      {picked != null ? (
        <p className="mt-3 text-sm text-pretty" role="status">
          <span className="font-medium">{picked === question.answer ? "Correct. " : "Not quite. "}</span>
          <span className="text-muted">{question.why}</span>
        </p>
      ) : null}
      {picked != null ? (
        <Button
          className="mt-3"
          onClick={() => {
            setPicked(null);
            setIndex((value) => value + 1);
            if (index + 1 === total && !saved) {
              setSaved(true);
              onFinish(answers);
            }
          }}
        >
          {index + 1 === total ? "See my score" : "Next question"}
        </Button>
      ) : null}
    </div>
  );
}
