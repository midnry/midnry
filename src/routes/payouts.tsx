import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useRole } from "@/components/role";
import { adminPayouts, adminRecordPayout, type AdminPayoutLine, type AdminPayouts } from "@/lib/payouts.functions";
import { countryName } from "@/lib/payouts/countries";
import { CREATOR_POOL_PERCENT } from "@/lib/revenue";
import { formatUsd } from "@/lib/format";
import { Button, Field, Skeleton, TextInput, cn, fieldClass } from "@/components/ui";

export const Route = createFileRoute("/payouts")({
  head: () => ({ meta: [{ title: "Payouts — Midnry" }, { name: "robots", content: "noindex" }] }),
  component: PayoutsPage,
});

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y!, m! - 1, 1)),
  );
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso.slice(0, 10)}T00:00:00Z`),
  );
}

function aboutNgn(cents: number, rate: number): string {
  return `about ₦${Math.round((cents / 100) * rate).toLocaleString("en")}`;
}

function toCents(text: string): number {
  const n = Number(text.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** One CSV cell; formula-looking text is prefixed so spreadsheets don't run it. */
function cell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCsv(data: AdminPayouts) {
  if (!data.selected) return;
  const head = [
    "month", "maker", "email", "earned_usd", "carried_over_usd", "due_usd", "minimum_usd", "reached_minimum",
    "paid_usd", "withheld_usd", "remaining_usd", "account_holder", "bank", "account_number", "bank_country",
  ];
  const usd = (cents: number) => (cents / 100).toFixed(2);
  const rows = data.lines.map((l) => {
    const d = l.details && l.details !== "unreadable" ? l.details : null;
    return [
      data.selected, l.name, l.email ?? "", usd(l.earnedCents), usd(l.carriedCents), usd(l.dueCents), usd(l.minimumCents),
      l.reached ? "yes" : "no", usd(l.paidCents), usd(l.withheldCents), usd(l.remainingCents),
      d?.holder ?? "", d?.bank ?? "", d?.account ?? "", d?.country ?? "",
    ];
  });
  const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `midnry-payouts-${data.selected}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PayoutsPage() {
  const { user, isPending } = useCurrentUserState();
  const { isAdmin, ready } = useRole();
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<AdminPayouts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const load = useCallback(
    async (which: string | null) => {
      try {
        setData(await adminPayouts({ data: which }));
        setError(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load payouts.");
      }
    },
    [],
  );

  useEffect(() => {
    if (!userId || !isAdmin) return;
    void load(month);
  }, [userId, isAdmin, month, load]);

  if (isPending || (user && !ready)) {
    return (
      <Shell>
        <Skeleton className="h-10 w-40" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  if (!isAdmin) {
    return (
      <Shell>
        <p className="text-muted">Only the admin can see payouts.</p>
      </Shell>
    );
  }

  const selected = data?.months.find((m) => m.month === data.selected) ?? null;
  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">Payouts</h1>
      <p className="mt-2 max-w-2xl text-pretty text-muted">
        Makers earn {CREATOR_POOL_PERCENT}% of Midnry Pass revenue after payment fees and refunds, shared by opens. Pay
        by bank transfer by the 15th of the next month once a balance reaches US$20 (₦20,000 for a Nigerian bank);
        smaller balances roll over. Visible only to you.
      </p>
      {error ? <p className="mt-6 text-fail">{error}</p> : null}
      {!data && !error ? <Skeleton className="mt-8 h-64 w-full" /> : null}
      {data ? (
        <>
          <section className="mt-8 rounded-2xl bg-card p-5 shadow-line">
            <h2 className="font-display text-2xl">
              {monthLabel(data.current.month)}{" "}
              <span className="ml-1 rounded-full bg-paper-2 px-2 py-0.5 align-middle text-xs font-sans">estimated</span>
            </h2>
            <PoolFigures pool={data.current} totalUses={data.current.totalUses} />
          </section>

          <section className="mt-6 rounded-2xl bg-card p-5 shadow-line">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Final months</h2>
                {data.dueBy ? <p className="text-sm text-muted">Transfers for this month are due by {dayLabel(data.dueBy)}.</p> : null}
              </div>
              {data.months.length ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Month</span>
                    <select
                      className={cn(fieldClass, "w-48")}
                      value={data.selected ?? ""}
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      {data.months.map((m) => (
                        <option key={m.month} value={m.month}>
                          {monthLabel(m.month)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button tone="quiet" onClick={() => exportCsv(data)} disabled={!data.lines.length}>
                    Export CSV
                  </Button>
                </div>
              ) : null}
            </div>
            {selected ? (
              <PoolFigures pool={selected} totalUses={selected.totalUses} />
            ) : (
              <p className="mt-3 text-sm text-muted">
                No final month yet. A month becomes final the day after it ends, once Pass payments have been recorded.
              </p>
            )}
          </section>

          {data.selected ? (
            data.lines.length === 0 ? (
              <p className="mt-6 text-sm text-muted">No maker earned anything in {monthLabel(data.selected)}.</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {data.lines.map((line) => (
                  <MakerCard
                    key={line.ownerId}
                    line={line}
                    month={data.selected!}
                    rate={data.ngnPerUsd}
                    onDone={() => void load(data.selected)}
                  />
                ))}
              </ul>
            )
          ) : null}
        </>
      ) : null}
    </Shell>
  );
}

function PoolFigures({
  pool,
  totalUses,
}: {
  pool: { grossCents: number; feesCents: number; refundsCents: number; poolCents: number; charges: number; estimatedFees: number };
  totalUses: number;
}) {
  const tiles: [string, string][] = [
    [`Pass payments (${pool.charges})`, formatUsd(pool.grossCents)],
    [pool.estimatedFees ? `Fees (${pool.estimatedFees} estimated)` : "Fees", formatUsd(pool.feesCents)],
    ["Refunds", formatUsd(pool.refundsCents)],
    ["Creator pool", formatUsd(pool.poolCents)],
    ["Counted opens", totalUses.toLocaleString("en")],
  ];
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-paper p-3">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-1 font-display text-xl tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MakerCard({ line, month, rate, onDone }: { line: AdminPayoutLine; month: string; rate: number; onDone: () => void }) {
  const [mode, setMode] = useState<"paid" | "withheld" | null>(null);
  const status =
    line.remainingCents <= 0
      ? line.paidCents
        ? "Paid"
        : "Settled"
      : line.reached
        ? "Due"
        : "Below minimum, rolls over";
  const d = line.details;
  return (
    <li className="rounded-2xl bg-card p-5 shadow-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium break-words">{line.name}</p>
          {line.email ? <p className="text-sm text-muted break-all">{line.email}</p> : null}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs",
            status === "Due" ? "bg-pine text-paper" : "bg-paper-2 text-ink",
          )}
        >
          {status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <dt className="text-muted">Earned</dt>
        <dd className="tabular-nums sm:col-span-3">{formatUsd(line.earnedCents)}</dd>
        <dt className="text-muted">Carried over</dt>
        <dd className="tabular-nums sm:col-span-3">{formatUsd(line.carriedCents)}</dd>
        <dt className="text-muted">Balance</dt>
        <dd className="tabular-nums sm:col-span-3">
          {formatUsd(line.dueCents)} <span className="text-muted">({aboutNgn(line.dueCents, rate)})</span>
        </dd>
        <dt className="text-muted">Minimum</dt>
        <dd className="sm:col-span-3">
          {formatUsd(line.minimumCents)} · {line.reached ? "reached" : "not reached"}
        </dd>
        {line.paidCents ? (
          <>
            <dt className="text-muted">Paid</dt>
            <dd className="tabular-nums sm:col-span-3">{formatUsd(line.paidCents)}</dd>
          </>
        ) : null}
        {line.withheldCents ? (
          <>
            <dt className="text-muted">Withheld</dt>
            <dd className="tabular-nums sm:col-span-3">{formatUsd(line.withheldCents)}</dd>
          </>
        ) : null}
        <dt className="text-muted">Left</dt>
        <dd className="tabular-nums sm:col-span-3">{formatUsd(line.remainingCents)}</dd>
      </dl>
      <div className="mt-3 rounded-xl bg-paper p-3 text-sm">
        {d === null ? (
          <p className="text-muted">{line.deleted ? "Account deleted. No payout details." : "No payout details yet."}</p>
        ) : d === "unreadable" ? (
          <p className="text-fail">Payout details can’t be decrypted. Ask the maker to enter them again.</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted">Holder</dt>
            <dd className="break-words">{d.holder}</dd>
            <dt className="text-muted">Bank</dt>
            <dd className="break-words">{d.bank}</dd>
            <dt className="text-muted">Account</dt>
            <dd className="tabular-nums break-all">{d.account}</dd>
            <dt className="text-muted">Country</dt>
            <dd>{countryName(d.country)}</dd>
          </dl>
        )}
      </div>
      {line.entries.length ? (
        <ul className="mt-3 space-y-1 text-sm">
          {line.entries.map((e) => (
            <li key={e.id} className="text-muted break-words">
              {e.kind === "paid"
                ? `Paid ${formatUsd(e.amountCents)}${e.paidOn ? ` on ${dayLabel(e.paidOn)}` : ""}${e.transferReference ? ` · ${e.transferReference}` : ""}`
                : `Withheld ${formatUsd(e.amountCents)} · ${e.reason ?? ""}`}
            </li>
          ))}
        </ul>
      ) : null}
      {line.remainingCents > 0 && !mode ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setMode("paid")}>Mark as paid</Button>
          <Button tone="quiet" onClick={() => setMode("withheld")}>
            Withhold
          </Button>
        </div>
      ) : null}
      {mode ? (
        <PayoutForm
          kind={mode}
          line={line}
          month={month}
          onCancel={() => setMode(null)}
          onDone={() => {
            setMode(null);
            onDone();
          }}
        />
      ) : null}
    </li>
  );
}

function PayoutForm({
  kind,
  line,
  month,
  onCancel,
  onDone,
}: {
  kind: "paid" | "withheld";
  line: AdminPayoutLine;
  month: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const initial = kind === "withheld" ? Math.min(line.earnedCents || line.remainingCents, line.remainingCents) : line.remainingCents;
  const [amount, setAmount] = useState((initial / 100).toFixed(2));
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cents = toCents(amount);
    if (!Number.isInteger(cents) || cents <= 0) {
      setError("Enter an amount in US dollars.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminRecordPayout({
        data: {
          ownerId: line.ownerId,
          month,
          kind,
          amountCents: cents,
          paidOn: kind === "paid" ? paidOn : null,
          transferReference: kind === "paid" ? reference : null,
          reason: kind === "withheld" ? reason : null,
        },
      });
      toast.success(kind === "paid" ? "Marked as paid." : "Withheld.");
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-line pt-4">
      <Field label="Amount (US$)" hint={`Up to ${formatUsd(line.remainingCents)}.`}>
        <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required />
      </Field>
      {kind === "paid" ? (
        <>
          <Field label="Transfer date">
            <TextInput type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
          </Field>
          <Field label="Transfer reference (optional)">
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
          </Field>
        </>
      ) : (
        <Field label="Reason" hint="The maker sees this on their earnings page.">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required />
        </Field>
      )}
      {error ? (
        <p role="alert" className="text-sm text-fail">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : kind === "paid" ? "Record payment" : "Withhold"}
        </Button>
        <Button tone="quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
