import { useEffect, useMemo, useRef, useState } from "react";
import { CONTENT, type TaskKind, type TaskResult } from "../systems/banking";
import { btnGhost, btnPrimary } from "./theme";

// The interactive parts of a banking career: aptitude tests, interviews,
// training quizzes, and the six kinds of workday task. Every choice is a real
// button (Tab to move, Enter to pick) and the number keys 1–4 also choose.

const shuffle = <T,>(xs: T[], seed: number) => {
  const a = [...xs];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

/** Number keys pick an option; returns the handler cleanup automatically. */
function useNumberKeys(count: number, onPick: (i: number) => void, enabled = true) {
  const ref = useRef(onPick);
  ref.current = onPick;
  useEffect(() => {
    if (!enabled) return;
    const down = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= count) {
        e.preventDefault();
        ref.current(n - 1);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [count, enabled]);
}

function Options({ options, onPick, disabled }: { options: string[]; onPick: (i: number) => void; disabled?: boolean }) {
  useNumberKeys(options.length, onPick, !disabled);
  return (
    <div className="mt-3 grid gap-2" role="group">
      {options.map((o, i) => (
        <button key={o} type="button" disabled={disabled} onClick={() => onPick(i)} className={`${btnGhost} min-h-12 justify-start gap-3 px-3 text-left text-sm disabled:opacity-50`}>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-xs font-bold" aria-hidden>
            {i + 1}
          </span>
          {o}
        </button>
      ))}
      <p className="text-[11px] text-slate-500">Tip: press 1–{options.length} to answer.</p>
    </div>
  );
}

/** A quiz of `n` questions from a pool. Timed mode gives each question a countdown; untimed has none. */
export function Quiz({ pool, n, seed, timedDefault, title, onDone }: { pool: { q: string; a: string[]; k: number }[]; n: number; seed: number; timedDefault?: boolean; title: string; onDone: (correct: number, of: number) => void }) {
  const qs = useMemo(() => shuffle(pool, seed).slice(0, n).map((q, i) => {
    const order = shuffle(q.a.map((_, j) => j), seed + i + 7);
    return { q: q.q, a: order.map((j) => q.a[j]!), k: order.indexOf(q.k) };
  }), [pool, n, seed]);
  const [started, setStarted] = useState(false);
  const [timed, setTimed] = useState(Boolean(timedDefault));
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [left, setLeft] = useState(40);
  const answer = (pick: number) => {
    const ok = pick === qs[i]!.k;
    const c = correct + (ok ? 1 : 0);
    setCorrect(c);
    if (i + 1 >= qs.length) onDone(c, qs.length);
    else {
      setI(i + 1);
      setLeft(40);
    }
  };
  useEffect(() => {
    if (!started || !timed) return;
    if (left <= 0) {
      answer(-1);
      return;
    }
    const t = window.setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, timed, left]);
  if (!started)
    return (
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-slate-300">{qs.length} questions. Numerical, verbal and logical reasoning.</p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="size-4" />
          Timed (40 seconds a question). Untick for an untimed test.
        </label>
        <button type="button" className={`${btnPrimary} mt-3 min-h-11 w-full`} onClick={() => setStarted(true)} autoFocus>
          Start
        </button>
      </div>
    );
  const q = qs[i]!;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>
          Question {i + 1} of {qs.length}
        </span>
        {timed ? <span className={left <= 10 ? "font-bold text-rose-300" : ""}>⏱ {left}s</span> : <span>Untimed</span>}
      </div>
      <p className="mt-2 font-semibold">{q.q}</p>
      <Options key={i} options={q.a} onPick={answer} />
    </div>
  );
}

/** An interview: questions with answer choices, scored, never timed. Includes the employer's own question. */
export function Interview({ count, seed, extra, title, onDone }: { count: number; seed: number; extra?: { q: string; a: { t: string; s: number; c?: number }[] }; title: string; onDone: (score: number, conduct: number) => void }) {
  const qs = useMemo(() => {
    const picked = shuffle(CONTENT.interview, seed).slice(0, extra ? count - 1 : count);
    const all = extra ? [...picked, extra] : picked;
    return all.map((q, i) => ({ q: q.q, a: shuffle(q.a, seed + i * 13) }));
  }, [count, seed, extra]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [conduct, setConduct] = useState(0);
  const [said, setSaid] = useState<string | null>(null);
  const pick = (k: number) => {
    const a = qs[i]!.a[k]!;
    const sc = score + a.s;
    const cd = conduct + (a.c ?? 0);
    setScore(sc);
    setConduct(cd);
    setSaid(a.t);
    window.setTimeout(() => {
      setSaid(null);
      if (i + 1 >= qs.length) onDone(Math.max(0, sc) / (qs.length * 3), cd);
      else setI(i + 1);
    }, 700);
  };
  const q = qs[i]!;
  return (
    <div>
      <p className="text-xs text-slate-400">
        {title} · question {i + 1} of {qs.length} · untimed
      </p>
      <p className="mt-2 rounded-xl bg-white/5 p-3 font-semibold">“{q.q}”</p>
      {said ? <p className="mt-3 rounded-xl bg-sky-500/15 p-3 text-sm">You: “{said}”</p> : <Options options={q.a.map((a) => a.t)} onPick={pick} />}
    </div>
  );
}

// ── Workday tasks ─────────────────────────────────────────────────────────────

const naira = (n: number) => `₦${n.toLocaleString("en")}`;

/** One workday task; calls onDone with its result. `t0` times productivity unless untimed. */
export function Task({ kind, seed, onDone }: { kind: TaskKind; seed: number; onDone: (r: TaskResult) => void }) {
  const t0 = useRef(Date.now());
  const speed = () => Math.max(40, Math.min(100, 110 - (Date.now() - t0.current) / 400));
  if (kind === "request") return <RequestTask seed={seed} onDone={(r) => onDone({ ...r, productivity: speed() })} />;
  if (kind === "reconcile") return <ReconcileTask seed={seed} onDone={(ok) => onDone({ kind, accuracy: ok ? 95 : 30, satisfaction: 60, productivity: speed(), conduct: ok ? 2 : 0, sales: 0 })} />;
  if (kind === "kyc") return <KycTask seed={seed} onDone={(ok, risky) => onDone({ kind, accuracy: ok ? 95 : 30, satisfaction: ok ? 65 : 50, productivity: speed(), conduct: ok ? 3 : risky ? -6 : 0, sales: 0 })} />;
  if (kind === "credit") return <CreditTask seed={seed} onDone={(ok, reckless) => onDone({ kind, accuracy: ok ? 95 : 35, satisfaction: ok ? 70 : 55, productivity: speed(), conduct: reckless ? -5 : ok ? 2 : 0, sales: ok ? 1 : 0, missell: reckless })} />;
  if (kind === "software") return <TicketTask seed={seed} onDone={(ok) => onDone({ kind, accuracy: ok ? 95 : 30, satisfaction: ok ? 75 : 45, productivity: speed(), conduct: 0, sales: 0 })} />;
  return <SuperviseTask seed={seed} onDone={(ok, con) => onDone({ kind, accuracy: ok > 0 ? 85 : 45, satisfaction: ok > 0 ? 85 : 40, productivity: ok > 0 ? 85 : 50, conduct: con, sales: 0 })} />;
}

function RequestTask({ seed, onDone }: { seed: number; onDone: (r: TaskResult) => void }) {
  const req = CONTENT.requests[seed % CONTENT.requests.length]!;
  const opts = useMemo(() => shuffle(req.a, seed), [req, seed]);
  return (
    <div>
      <p className="text-xs font-bold tracking-wide text-sky-300 uppercase">Customer request</p>
      <p className="mt-1 font-semibold">{req.who}</p>
      <p className="mt-1 text-sm text-slate-200">{req.ask}</p>
      <Options
        options={opts.map((o) => o.t)}
        onPick={(i) => {
          const o = opts[i]!;
          onDone({ kind: "request", accuracy: o.acc ? 92 : 40, satisfaction: 50 + o.sat * 20, productivity: 70, conduct: o.con * 3, sales: o.sale ?? 0, missell: o.missell });
        }}
      />
    </div>
  );
}

function ReconcileTask({ seed, onDone }: { seed: number; onDone: (ok: boolean) => void }) {
  const rows = useMemo(() => {
    const names = ["POS settlement", "Salary credit", "Transfer to Musa", "ATM withdrawal", "Bills payment", "Cash deposit"];
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const out = names.map((n) => {
      const amt = Math.round((5 + rnd() * 400) * 100);
      return { n, ledger: amt, stmt: amt };
    });
    const bad = Math.floor(rnd() * out.length);
    // The odd line is off by a plausible amount: a missing fee or a doubled digit, never below zero.
    const row = out[bad]!;
    row.stmt = rnd() < 0.5 || row.ledger < 10000 ? row.ledger + 900 : row.ledger - 9000;
    return { out, bad };
  }, [seed]);
  return (
    <div>
      <p className="text-xs font-bold tracking-wide text-sky-300 uppercase">Reconciliation</p>
      <p className="mt-1 text-sm">The ledger and the bank statement should match. Which line doesn't?</p>
      <div className="mt-2 grid gap-1.5" role="group">
        {rows.out.map((row, i) => (
          <button key={row.n} type="button" onClick={() => onDone(i === rows.bad)} className={`${btnGhost} grid min-h-11 grid-cols-[1fr_auto_auto] items-center gap-3 px-3 text-left text-xs`}>
            <span>
              {i + 1}. {row.n}
            </span>
            <span className="tabular-nums text-slate-300">Ledger {naira(row.ledger)}</span>
            <span className="tabular-nums text-slate-300">Stmt {naira(row.stmt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function KycTask({ seed, onDone }: { seed: number; onDone: (ok: boolean, risky: boolean) => void }) {
  const c = useMemo(() => {
    const people = [
      { name: "Chiamaka Obi", dob: "12/03/1996", bvn: "22184736590" },
      { name: "Ibrahim Sule", dob: "05/11/1989", bvn: "22903817264" },
      { name: "Temitope Adewale", dob: "28/07/2001", bvn: "22651094378" },
      { name: "Grace Ekanem", dob: "19/01/1993", bvn: "22417360985" },
    ];
    const p = people[seed % people.length]!;
    const flaw = seed % 3; // 0: clean, 1: wrong DOB, 2: wrong BVN digit
    const form = { ...p, dob: flaw === 1 ? p.dob.replace(/^(\d\d)/, (d) => String((Number(d) % 27) + 1).padStart(2, "0")) : p.dob, bvn: flaw === 2 ? p.bvn.slice(0, 7) + "0" + p.bvn.slice(8) : p.bvn };
    return { p, form, clean: flaw === 0 };
  }, [seed]);
  const Row = ({ k, a, b }: { k: string; a: string; b: string }) => (
    <tr className="border-b border-white/5">
      <td className="py-1.5 pr-2 text-slate-400">{k}</td>
      <td className="py-1.5 pr-2">{a}</td>
      <td className="py-1.5">{b}</td>
    </tr>
  );
  return (
    <div>
      <p className="text-xs font-bold tracking-wide text-sky-300 uppercase">Customer identification (KYC)</p>
      <p className="mt-1 text-sm">Compare the account form with the ID and BVN record.</p>
      <table className="mt-2 w-full text-left text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="font-normal" />
            <th className="font-normal">Form</th>
            <th className="font-normal">ID / BVN record</th>
          </tr>
        </thead>
        <tbody>
          <Row k="Name" a={c.form.name} b={c.p.name} />
          <Row k="Date of birth" a={c.form.dob} b={c.p.dob} />
          <Row k="BVN" a={c.form.bvn} b={c.p.bvn} />
        </tbody>
      </table>
      <Options options={["Approve: everything matches", "Hold and query the mismatch", "Approve anyway: the customer is in a hurry"]} onPick={(i) => onDone(c.clean ? i === 0 : i === 1, i === 2 && !c.clean)} />
    </div>
  );
}

function CreditTask({ seed, onDone }: { seed: number; onDone: (ok: boolean, reckless: boolean) => void }) {
  const c = useMemo(() => {
    const income = [180000, 250000, 400000, 120000][seed % 4]!;
    const existing = [0, 40000, 90000, 30000][(seed >> 2) % 4]!;
    const ask = [300000, 800000, 1500000, 500000][(seed >> 4) % 4]!;
    const months = 12;
    const repay = Math.round((ask * 1.2) / months);
    const ratio = (existing + repay) / income;
    const smaller = Math.round(((income * 0.33 - existing) * months) / 1.2 / 10000) * 10000;
    const right = ratio <= 0.33 ? 0 : smaller >= 50000 ? 1 : 2;
    return { income, existing, ask, repay, ratio, smaller, right };
  }, [seed]);
  return (
    <div>
      <p className="text-xs font-bold tracking-wide text-sky-300 uppercase">Credit analysis</p>
      <p className="mt-1 text-sm">A salary earner asks for a 12-month loan. Repayments should stay within about a third of income.</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-slate-400">Monthly income</dt>
        <dd className="tabular-nums">{naira(c.income)}</dd>
        <dt className="text-slate-400">Existing repayments</dt>
        <dd className="tabular-nums">{naira(c.existing)}</dd>
        <dt className="text-slate-400">Loan requested</dt>
        <dd className="tabular-nums">{naira(c.ask)}</dd>
        <dt className="text-slate-400">New repayment</dt>
        <dd className="tabular-nums">{naira(c.repay)} / month</dd>
      </dl>
      <Options
        options={["Approve as requested", `Approve a smaller amount (${naira(Math.max(0, c.smaller))})`, "Decline politely and explain why"]}
        onPick={(i) => onDone(i === c.right, i === 0 && c.ratio > 0.5)}
      />
    </div>
  );
}

function TicketTask({ seed, onDone }: { seed: number; onDone: (ok: boolean) => void }) {
  const t = CONTENT.tickets[seed % CONTENT.tickets.length]!;
  const order = useMemo(() => shuffle(t.a.map((_, i) => i), seed), [t, seed]);
  return (
    <div>
      <p className="text-xs font-bold tracking-wide text-sky-300 uppercase">Support ticket</p>
      <p className="mt-1 text-sm">{t.t}</p>
      <Options options={order.map((i) => t.a[i]!)} onPick={(i) => onDone(order[i] === t.k)} />
    </div>
  );
}

function SuperviseTask({ seed, onDone }: { seed: number; onDone: (ok: number, conduct: number) => void }) {
  const t = CONTENT.supervision[seed % CONTENT.supervision.length]!;
  const opts = useMemo(() => shuffle(t.a, seed), [t, seed]);
  return (
    <div>
      <p className="text-xs font-bold tracking-wide text-sky-300 uppercase">Team supervision</p>
      <p className="mt-1 text-sm">{t.t}</p>
      <Options options={opts.map((o) => o.t)} onPick={(i) => onDone(opts[i]!.ok, (opts[i]!.con ?? 0) * 3)} />
    </div>
  );
}
