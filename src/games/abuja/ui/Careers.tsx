import { useMemo, useState } from "react";
import * as BK from "../systems/banking";
import {
  bankAccept,
  bankAppointment,
  bankApply,
  bankAutoStage,
  bankFinance,
  bankLeave,
  bankPromotion,
  bankResign,
  bankSubmitStage,
  bankTraining,
  bankWithdraw,
  bankWorkday,
} from "../systems/engine";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { Interview, Quiz, Task } from "./BankTasks";
import { btnGhost, btnPrimary } from "./theme";

// Careers: the banking career screen. Vacancy board, applications and their
// stages, the job, benefits, reviews, and an About page with sources. Where in
// the bank you're standing decides what you can do now: assessments and
// interviews at the HR desk, training in the training room, work at your
// workstation, promotion panels in the manager's office.

export type Spot = "hr" | "training" | "workstation" | "manager" | null;
type Tab = "vacancies" | "applications" | "career" | "benefits" | "review" | "about";

const SPOT_NAMES: Record<Exclude<Spot, null>, string> = { hr: "the HR desk", training: "the training room", workstation: "your workstation", manager: "the manager's office" };

function Label({ kind }: { kind: BK.InfoLabel }) {
  const tint = kind === "published" ? "bg-emerald-500/20 text-emerald-200" : kind === "model" ? "bg-sky-500/20 text-sky-200" : "bg-amber-500/20 text-amber-200";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${tint}`}>{BK.LABELS[kind]}</span>;
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block size-3 shrink-0 rounded-full border border-white/30" style={{ background: color }} aria-hidden />;
}

export function Careers({ state, at, onClose }: { state: GameState; at: Spot; onClose: () => void }) {
  const bk = state.banking;
  const job = bk?.job ?? null;
  const [tab, setTab] = useState<Tab>(at === "workstation" || at === "manager" || (at === "training" && job) ? "career" : at === "hr" ? "applications" : job ? "career" : "vacancies");
  const [run, setRun] = useState<null | { kind: "stage"; app: BK.BankApp } | { kind: "work" } | { kind: "training" } | { kind: "promotion" }>(null);
  const seed = state.day * 97 + state.slot * 13 + (bk?.apps.length ?? 0);

  if (run) {
    return (
      <Shell onClose={() => setRun(null)} title="Careers" state={state}>
        <Runner run={run} state={state} seed={seed} onDone={() => setRun(null)} />
      </Shell>
    );
  }
  return (
    <Shell onClose={onClose} title="Careers" state={state}>
      <div className="flex gap-1 overflow-x-auto text-[13px]" role="tablist">
        {(
          [
            ["vacancies", "Vacancies"],
            ["applications", `Applications${bk?.apps.filter((a) => a.status === "active" || a.status === "offer").length ? ` (${bk.apps.filter((a) => a.status === "active" || a.status === "offer").length})` : ""}`],
            ["career", "Career"],
            ["benefits", "Benefits"],
            ["review", "Review"],
            ["about", "About"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 shrink-0 rounded-xl px-2.5 font-semibold ${tab === id ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/5"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {tab === "vacancies" ? <Vacancies state={state} /> : null}
        {tab === "applications" ? <Applications state={state} at={at} onRun={(app) => setRun({ kind: "stage", app })} /> : null}
        {tab === "career" ? <Career state={state} at={at} onWork={() => setRun({ kind: "work" })} onTrain={() => setRun({ kind: "training" })} onPromo={() => setRun({ kind: "promotion" })} /> : null}
        {tab === "benefits" ? <Benefits state={state} /> : null}
        {tab === "review" ? <ReviewTab state={state} /> : null}
        {tab === "about" ? <About /> : null}
      </div>
    </Shell>
  );
}

function Shell({ children, onClose, title, state }: { children: React.ReactNode; onClose: () => void; title: string; state: GameState }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" onClick={onClose}>
      <div className="abuja-game__panel flex h-[92dvh] w-full max-w-xl flex-col rounded-t-2xl border border-white/10 shadow-2xl sm:h-[min(48rem,94dvh)] sm:rounded-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="font-semibold">🏦 {title}</p>
            <p className="text-[11px] text-slate-400">Independent simulation · fictional employers · no bank affiliation</p>
          </div>
          <button type="button" className="min-h-11 rounded-xl px-3 text-sm" onClick={onClose} aria-label="Close careers">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {state.toast ? <p className="mb-3 rounded-xl bg-white/10 p-3 text-sm font-semibold">{state.toast}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Vacancy board ─────────────────────────────────────────────────────────────

function Vacancies({ state }: { state: GameState }) {
  const [cat, setCat] = useState<BK.Category | "all">("all");
  const list = useMemo(() => BK.vacancies(state), [state.day]);
  const shown = list.filter((v) => cat === "all" || BK.bankById(v.bank)!.category === cat);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {(["all", "commercial", "noninterest", "merchant", "microfinance", "development"] as const).map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} className={`min-h-9 rounded-full px-3 font-semibold ${cat === c ? "bg-white/20" : "bg-white/5 text-slate-300"}`}>
            {c === "all" ? "All" : BK.CATEGORY_NAMES[c]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {shown.length} openings this week. The board refreshes every few days. <Label kind="simulation" />
      </p>
      <div className="mt-2 grid gap-2">
        {shown.map((v) => {
          const b = BK.bankById(v.bank)!;
          const why = BK.cannotApply(state, v);
          const proc = BK.processOf(v);
          const route = BK.routeById(v.route);
          return (
            <div key={v.id} className="rounded-xl bg-white/5 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Dot color={b.color} />
                <p className="font-semibold">{b.name}</p>
                <span className="ml-auto text-[11px] text-slate-400">{BK.CATEGORY_NAMES[b.category].replace(/s$/, "")}</span>
              </div>
              <p className="mt-1">
                {route.name} · {BK.trackById(v.track).icon} {BK.trackById(v.track).name} · {BK.GRADES[v.grade]!.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {route.contract === "agency" ? "Agency contract · " : ""}
                {naira(BK.payFor(b, v.grade, route.contract))} per pay cycle (simulation)
              </p>
              <p className="mt-1 text-xs text-slate-300">{b.culture}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <Label kind={proc.label} /> {proc.stages.map((s) => BK.STAGES[s].name).join(" → ")}
                {proc.training.published ? ` · training ${proc.training.published.toLowerCase()} (published)` : ""}
              </p>
              <button type="button" disabled={Boolean(why)} onClick={() => bankApply(v)} className={`${btnPrimary} mt-2 min-h-10 w-full disabled:opacity-40`}>
                Apply
              </button>
              {why ? <p className="mt-1 text-xs text-amber-300">{why}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Applications ──────────────────────────────────────────────────────────────

function Applications({ state, at, onRun }: { state: GameState; at: Spot; onRun: (a: BK.BankApp) => void }) {
  const apps = state.banking?.apps ?? [];
  if (!apps.length) return <p className="text-sm text-slate-400">No applications yet. Find one on the vacancy board.</p>;
  return (
    <div className="grid gap-2">
      {apps.map((a) => {
        const b = BK.bankById(a.bank)!;
        const proc = BK.processOf(a);
        const st = BK.stageOf(a);
        const ready = state.day >= a.readyDay;
        return (
          <div key={a.id} className="rounded-xl bg-white/5 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Dot color={b.color} />
              <p className="font-semibold">{b.name}</p>
              <span className="ml-auto text-xs text-slate-400">{BK.routeById(a.route).name}</span>
            </div>
            <ol className="mt-2 flex flex-wrap gap-1 text-[11px]">
              {proc.stages.map((s, i) => (
                <li key={s} className={`rounded-full px-2 py-0.5 ${i < a.stage ? "bg-emerald-500/25 text-emerald-200" : i === a.stage && a.status === "active" ? "bg-sky-500/30 text-white" : "bg-white/5 text-slate-400"}`}>
                  {BK.STAGES[s].icon} {BK.STAGES[s].name}
                </li>
              ))}
              <li className={`rounded-full px-2 py-0.5 ${a.status === "offer" ? "bg-emerald-500/30 text-white" : "bg-white/5 text-slate-400"}`}>📄 Offer</li>
            </ol>
            {a.status === "active" && st ? (
              <div className="mt-2">
                {!ready ? (
                  <p className="text-xs text-slate-400">Next: {BK.STAGES[st].name} from day {a.readyDay}.</p>
                ) : at !== "hr" ? (
                  <p className="text-xs text-amber-300">Ready: go to the HR desk at Bankers' Row (CBD) for your {BK.STAGES[st].name.toLowerCase()}.</p>
                ) : BK.autoStage(st) ? (
                  <button type="button" className={`${btnPrimary} min-h-10 w-full`} onClick={() => bankAutoStage(a.id)}>
                    {st === "medical" ? "Attend the medical" : "Hand over your documents"}
                  </button>
                ) : (
                  <button type="button" className={`${btnPrimary} min-h-10 w-full`} onClick={() => onRun(a)}>
                    Start: {BK.STAGES[st].name}
                  </button>
                )}
                <button type="button" className="mt-1 text-xs text-slate-400 underline" onClick={() => bankWithdraw(a.id)}>
                  Withdraw
                </button>
              </div>
            ) : null}
            {a.status === "offer" ? (
              <div className="mt-2">
                <p className="text-xs text-slate-300">
                  Offer: {BK.trackById(a.track).name}, {BK.GRADES[a.grade]!.name}, {naira(BK.payFor(b, a.grade, BK.routeById(a.route).contract))} per pay cycle (simulation).
                  {state.banking?.job ? " Accepting means resigning from your current bank." : ""}
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className={`${btnPrimary} min-h-10 flex-1`} onClick={() => bankAccept(a.id)}>
                    Accept offer
                  </button>
                  <button type="button" className={`${btnGhost} min-h-10 px-3`} onClick={() => bankWithdraw(a.id)}>
                    Decline
                  </button>
                </div>
              </div>
            ) : null}
            {a.status === "rejected" ? <p className="mt-2 text-xs text-rose-200">Feedback: {a.feedback}</p> : null}
            {a.status === "withdrawn" ? <p className="mt-2 text-xs text-slate-500">Closed.</p> : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Running a stage, a workday, training or a promotion panel ─────────────────

function Runner({ run, state, seed, onDone }: { run: { kind: "stage"; app: BK.BankApp } | { kind: "work" } | { kind: "training" } | { kind: "promotion" }; state: GameState; seed: number; onDone: () => void }) {
  if (run.kind === "stage") {
    const a = run.app;
    const b = BK.bankById(a.bank)!;
    const st = BK.stageOf(a)!;
    const title = `${b.name}: ${BK.STAGES[st].name}`;
    if (st === "online_assessment" || st === "physical_assessment")
      return (
        <Quiz
          pool={BK.CONTENT.aptitude}
          n={st === "physical_assessment" ? 6 : 5}
          seed={seed}
          timedDefault
          title={title}
          onDone={(c, of) => {
            bankSubmitStage(a.id, c / of, 0);
            onDone();
          }}
        />
      );
    if (st === "practical_task")
      return (
        <div>
          <p className="mb-2 text-sm font-semibold">{title}</p>
          <p className="mb-3 text-xs text-slate-400">{BK.CONTENT.practical[a.track]}</p>
          <Task
            kind={BK.trackById(a.track).tasks[0]!}
            seed={seed}
            onDone={(r) => {
              bankSubmitStage(a.id, r.accuracy >= 80 && !r.missell ? 0.95 : 0.3, r.conduct);
              onDone();
            }}
          />
        </div>
      );
    const count = st === "panel_interview" ? 4 : st === "executive_interview" ? 3 : 2;
    return (
      <Interview
        count={count}
        seed={seed}
        extra={st !== "hr_discussion" ? BK.employerQuestion(b) : undefined}
        title={title}
        onDone={(score, conduct) => {
          bankSubmitStage(a.id, score, conduct);
          onDone();
        }}
      />
    );
  }
  if (run.kind === "training")
    return (
      <Quiz
        pool={BK.CONTENT.training}
        n={3}
        seed={seed}
        title={state.banking?.job?.training ? `${BK.bankById(state.banking.job.bank)!.programme}: session` : "Course module"}
        onDone={(c, of) => {
          bankTraining(c, of);
          onDone();
        }}
      />
    );
  if (run.kind === "promotion")
    return (
      <Interview
        count={2}
        seed={seed}
        title="Promotion panel"
        onDone={(score) => {
          bankPromotion(score);
          onDone();
        }}
      />
    );
  return <Workday state={state} seed={seed} onDone={onDone} />;
}

function Workday({ state, seed, onDone }: { state: GameState; seed: number; onDone: () => void }) {
  const job = state.banking!.job!;
  const tasks = useMemo(() => BK.todaysTasks(job, seed), [job, seed]);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<BK.TaskResult[]>([]);
  const t = BK.trackById(job.track);
  return (
    <div>
      <p className="text-xs text-slate-400">
        {BK.bankById(job.bank)!.name} · {BK.titleOf(job)} · task {i + 1} of {tasks.length}
      </p>
      <p className="mb-3 text-xs text-sky-200">Today's objective: {t.goal}</p>
      <Task
        key={i}
        kind={tasks[i]!}
        seed={seed + i * 31}
        onDone={(r) => {
          const all = [...results, r];
          setResults(all);
          if (i + 1 >= tasks.length) {
            bankWorkday(all);
            onDone();
          } else setI(i + 1);
        }}
      />
    </div>
  );
}

// ── Career ────────────────────────────────────────────────────────────────────

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-slate-300">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Career({ state, at, onWork, onTrain, onPromo }: { state: GameState; at: Spot; onWork: () => void; onTrain: () => void; onPromo: () => void }) {
  const bk = state.banking;
  const job = bk?.job;
  if (!job)
    return (
      <div className="text-sm text-slate-300">
        <p>You don't work at a bank yet. Find an opening on the vacancy board, apply, and go through the stages at the HR desk.</p>
        {bk?.history.length ? <History state={state} /> : null}
        <p className="mt-3 text-xs text-slate-500">Pension saved: {naira(bk?.pension ?? 0)}</p>
      </div>
    );
  const b = BK.bankById(job.bank)!;
  const g = BK.GRADES[job.grade]!;
  const need = (spot: Exclude<Spot, null>) => (at === spot ? null : `Go to ${SPOT_NAMES[spot]} at Bankers' Row (CBD).`);
  const appt = BK.APPOINTMENTS.find((x) => x.id === bk!.offerAppt);
  return (
    <div className="text-sm">
      <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${b.color}, #0f172a)` }}>
        <p className="text-xs opacity-80">{b.name} · {job.contract === "agency" ? "Agency contract" : "Direct employment"}</p>
        <p className="text-xl font-black">{BK.titleOf(job)}</p>
        <p className="text-xs opacity-90">
          Grade: {g.name} · {BK.trackById(job.track).icon} {BK.trackById(job.track).name}
        </p>
        <p className="mt-2 text-sm font-semibold">{naira(BK.grossPay(job))} per pay cycle</p>
        <p className="text-[10px] opacity-75">Salary and every number on this screen are game simulation values.</p>
      </div>
      {job.training ? (
        <div className="mt-3 rounded-xl bg-white/5 p-3">
          <p className="font-semibold">🎓 {b.programme}</p>
          <p className="text-xs text-slate-400">
            {job.training.done}/{job.training.needed} sessions done. {BK.processOf({ bank: job.bank, route: job.route }).training.published ? `The real programme this is modelled on lasts ${BK.processOf({ bank: job.bank, route: job.route }).training.published!.toLowerCase()} (published information); the game shortens it.` : ""}
          </p>
          <button type="button" disabled={Boolean(need("training"))} onClick={onTrain} className={`${btnPrimary} mt-2 min-h-10 w-full disabled:opacity-40`}>
            Attend a training session
          </button>
          {need("training") ? <p className="mt-1 text-xs text-amber-300">{need("training")}</p> : null}
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <Meter label="Accuracy" value={job.m.accuracy} />
            <Meter label="Customer satisfaction" value={job.m.satisfaction} />
            <Meter label="Productivity" value={job.m.productivity} />
            <Meter label="Learning" value={job.m.learning} />
            <Meter label="Conduct" value={job.m.conduct} />
            <Meter label={job.track === "rm" ? "Sales (suitable only)" : "Sales"} value={job.m.sales} />
            <Meter label="Energy" value={state.stats.energy} />
            <Meter label="Stress" value={state.stats.stress} />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Objective: {BK.trackById(job.track).goal} · Workdays this pay cycle: {job.workdays}/{BK.BAL.workdaysExpected} · Payday day {job.nextPayDay} · Review day {job.nextReviewDay}
          </p>
          <div className="mt-3 grid gap-2">
            <button type="button" disabled={Boolean(need("workstation"))} onClick={onWork} className={`${btnPrimary} min-h-11 disabled:opacity-40`}>
              Start a workday (2 time slots)
            </button>
            {need("workstation") ? <p className="text-xs text-amber-300">{need("workstation")}</p> : null}
            {BK.nextCourses(job).length ? (
              <button type="button" disabled={Boolean(need("training"))} onClick={onTrain} className={`${btnGhost} min-h-10 disabled:opacity-40`}>
                Take a course module ({BK.nextCourses(job).length} needed for promotion)
              </button>
            ) : null}
            {job.promoReady ? (
              <button type="button" disabled={Boolean(need("manager"))} onClick={onPromo} className={`${btnPrimary} min-h-10 disabled:opacity-40`}>
                Sit the promotion panel
              </button>
            ) : null}
            {job.promoReady && need("manager") ? <p className="text-xs text-amber-300">{need("manager")}</p> : null}
            <button type="button" onClick={bankLeave} disabled={job.leaveLeft <= 0} className={`${btnGhost} min-h-10 disabled:opacity-40`}>
              Take a day of leave ({job.leaveLeft} left)
            </button>
          </div>
        </>
      )}
      {appt ? (
        <div className="mt-3 rounded-xl bg-amber-400/15 p-3">
          <p className="font-semibold">🏛️ Board shortlist: {appt.name}</p>
          <p className="text-xs text-slate-300">A rare appointment, decided by the board, not a promotion. (Game simulation.)</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className={`${btnPrimary} min-h-10 flex-1`} onClick={() => bankAppointment(true)}>
              Go for it
            </button>
            <button type="button" className={`${btnGhost} min-h-10 px-3`} onClick={() => bankAppointment(false)}>
              Not now
            </button>
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-400">
        {b.culture} <span className="text-slate-500">({BK.signature(b).label})</span>
      </p>
      <History state={state} />
      <button type="button" className="mt-4 text-xs text-rose-300 underline" onClick={bankResign}>
        Resign from {b.name}
      </button>
    </div>
  );
}

function History({ state }: { state: GameState }) {
  const h = state.banking?.history ?? [];
  if (!h.length) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Career history</p>
      <ul className="mt-1 grid gap-1 text-xs text-slate-300">
        {h.map((x, i) => (
          <li key={i}>
            {BK.bankById(x.bank)?.name}: {x.title} ({x.grade}), day {x.from}–{x.to}. {x.why}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Benefits and staff finance ────────────────────────────────────────────────

function Benefits({ state }: { state: GameState }) {
  const job = state.banking?.job;
  const [amount, setAmount] = useState(50000);
  const [item, setItem] = useState(BK.FINANCE_ITEMS[0]!);
  if (!job) return <p className="text-sm text-slate-400">Benefits come with a bank job.</p>;
  const terms = BK.financeTerms(job, amount);
  const limit = BK.financeLimit(job);
  const mura = BK.nonInterest(job);
  return (
    <div className="text-sm">
      <p className="mb-2 flex items-center gap-2 text-xs text-slate-400">
        Your contract's benefits <Label kind="simulation" />
      </p>
      <div className="grid gap-1.5">
        {BK.benefitList(job).map((x) => (
          <div key={x.name} className={`rounded-lg p-2.5 ${x.on ? "bg-white/5" : "bg-white/[0.02] text-slate-500"}`}>
            <p className="font-semibold">{x.name}</p>
            <p className="text-xs text-slate-400">{x.status}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Pension rates follow the Pension Reform Act 2014 minimums (employer 10%, employee 8%) <Label kind="published" />. Cars, housing and travel are never guaranteed benefits here.
      </p>
      <div className="mt-4 rounded-xl bg-white/5 p-3">
        <p className="font-semibold">{mura ? "Staff financing (Murabaha)" : "Staff loan"}</p>
        <p className="text-xs text-slate-400">
          {mura ? "The bank buys the item and sells it to you at an agreed profit, paid from salary. No interest." : "Borrow against your salary; repayments come out before you're paid."} Limit {naira(limit)}. Repayments can't exceed a third of pay.
        </p>
        {limit ? (
          <>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-300">
                Amount
                <input type="number" min={10000} step={10000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2" />
              </label>
              <label className="text-xs text-slate-300">
                For
                <select value={item} onChange={(e) => setItem(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2">
                  {BK.FINANCE_ITEMS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className={`mt-2 text-xs ${terms.affordable ? "text-slate-300" : "text-rose-300"}`}>
              {naira(terms.perCycle)} per pay cycle for {terms.cycles} cycles ({naira(terms.total)} in total, {mura ? "agreed profit" : "interest"} {Math.round(terms.charge * 100)}%: simulation). {terms.affordable ? "Affordable." : "Not affordable on your pay."}
            </p>
            <button type="button" className={`${btnPrimary} mt-2 min-h-10 w-full`} onClick={() => bankFinance(amount, item)}>
              Request {mura ? "financing" : "loan"}
            </button>
          </>
        ) : null}
        {job.finance.length ? (
          <ul className="mt-2 grid gap-1 text-xs text-slate-300">
            {job.finance.map((f) => (
              <li key={f.id}>
                {f.kind === "murabaha" ? "Murabaha" : "Loan"} for {f.item.toLowerCase()}: {naira(f.owed)} left, {naira(f.perCycle)} per cycle
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-slate-500">Pension saved so far: {naira(state.banking?.pension ?? 0)}</p>
    </div>
  );
}

// ── Review ────────────────────────────────────────────────────────────────────

function ReviewTab({ state }: { state: GameState }) {
  const job = state.banking?.job;
  if (!job) return <p className="text-sm text-slate-400">Reviews come with a bank job.</p>;
  const rv = state.banking?.review;
  const checks = BK.promotionChecks(state, job);
  const next = BK.GRADES[job.grade + 1];
  return (
    <div className="text-sm">
      <p className="flex items-center gap-2 text-xs text-slate-400">
        Every {BK.BAL.reviewEveryDays} days <Label kind="simulation" />
      </p>
      {rv ? (
        <div className="mt-2 rounded-xl bg-white/5 p-3">
          <p className="font-semibold">Last review (day {rv.day}): {rv.rating}/5</p>
          <p className="text-xs text-slate-300">
            Pay review: {rv.payRise ? `+${Math.round(rv.payRise * 100)}%` : "no change"} · Bonus: {rv.bonus ? naira(rv.bonus) : "none"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Pay reviews, promotions and appointments are separate decisions.</p>
          {rv.notes.map((n) => (
            <p key={n} className="mt-1 text-xs text-amber-200">
              {n}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">{job.training ? "Reviews start after training." : `First review on day ${job.nextReviewDay}.`} Current rating estimate: {BK.rating(job)}/5.</p>
      )}
      <p className="mt-4 font-semibold">{next ? `Promotion to ${next.name}` : "Top grade"}</p>
      <ul className="mt-2 grid gap-1.5">
        {checks.map((c) => (
          <li key={c.label} className={`flex gap-2 rounded-lg p-2 text-xs ${c.ok ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
            <span aria-hidden>{c.ok ? "✅" : "⬜"}</span>
            <span>
              <span className="font-semibold">{c.label}:</span> {c.detail}
            </span>
          </li>
        ))}
        <li className="flex gap-2 rounded-lg bg-white/5 p-2 text-xs">
          <span aria-hidden>🎲</span>
          <span>
            <span className="font-semibold">Vacancy:</span> even when you're ready, a slot must be open at {BK.bankById(job.bank)!.name} (simulation).
          </span>
        </li>
      </ul>
      <p className="mt-2 text-[11px] text-slate-500">Specialists can rise through the grades in their own track; leading a team isn't required. The leadership track leads to branch roles.</p>
    </div>
  );
}

// ── About and sources ─────────────────────────────────────────────────────────

function About() {
  return (
    <div className="text-sm text-slate-300">
      <p className="rounded-xl bg-amber-400/10 p-3 text-amber-100">{BK.DISCLAIMER}</p>
      <ul className="mt-3 grid gap-1.5 text-xs">
        <li>
          <Label kind="published" /> Facts from public sources, listed below with the date they were checked.
        </li>
        <li>
          <Label kind="model" /> A general model of Nigerian bank careers (grades, tracks, stages), not any one bank's structure.
        </li>
        <li>
          <Label kind="simulation" /> Game balancing: pay, chances, thresholds, timelines and benefits.
        </li>
      </ul>
      <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Sources for published information</p>
      <ul className="mt-1 grid gap-2 text-xs">
        {Object.entries(BK.SOURCES)
          .filter(([id]) => ["access_graduate", "gtb_graduate", "pension_act"].includes(id))
          .map(([id, s]) => (
            <li key={id} className="rounded-lg bg-white/5 p-2">
              <p className="font-semibold">{s.title}</p>
              <p className="break-all text-slate-400">{s.url}</p>
              <p className="text-slate-500">
                Checked {s.verifiedOn}
                {s.caveat ? ` · ${s.caveat}` : ""}
              </p>
            </li>
          ))}
      </ul>
      <p className="mt-3 text-[11px] text-slate-500">Recruitment stages marked “Published information” are modelled on two real Nigerian banks' published graduate programmes; the game shortens training. All other employers use the general model. The full roster, statuses and sources are in the game's data files.</p>
    </div>
  );
}
