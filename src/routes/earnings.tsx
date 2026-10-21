import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  deletePayoutDetails,
  getMyEarnings,
  getMyPayoutDetails,
  savePayoutDetails,
  type MyEarnings,
} from "@/lib/payouts.functions";
import { PAYOUT_COUNTRIES, type MaskedDetails } from "@/lib/payouts/countries";
import { CREATOR_POOL_PERCENT } from "@/lib/revenue";
import { formatUsd } from "@/lib/format";
import { Button, Field, Skeleton, TextInput, fieldClass } from "@/components/ui";

export const Route = createFileRoute("/earnings")({
  head: () => ({ meta: [{ title: "Earnings — Midnry" }] }),
  component: EarningsPage,
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

function naira(value: number): string {
  return `₦${Math.round(value).toLocaleString("en")}`;
}

function EarningsPage() {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<MyEarnings | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    getMyEarnings()
      .then((next) => {
        if (!cancel) setData(next);
      })
      .catch(() => {
        if (!cancel) setFailed(true);
      });
    return () => {
      cancel = true;
    };
  }, [user?.id]);

  if (isPending || (user && !data && !failed)) {
    return (
      <Shell>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-40 w-full max-w-xl" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;

  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">Earnings</h1>
      <p className="mt-3 max-w-xl text-pretty text-muted">
        Makers earn {CREATOR_POOL_PERCENT}% of Midnry Pass revenue after payment fees and refunds, shared by opens.
        Your share is that pool times your apps’ opens, divided by every approved app’s opens. One person counts once
        per app per day. Opening your own app does not count.
      </p>
      {failed || !data ? (
        <p className="mt-8 text-sm text-fail">Could not load earnings.</p>
      ) : (
        <>
          <CurrentMonth data={data} />
          <Balance data={data} />
          <History data={data} />
        </>
      )}
      <PayoutDetailsSection />
      <section className="mt-10 max-w-xl text-sm text-pretty text-muted">
        <h2 className="font-display text-2xl text-ink">How payouts work</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>A month’s figures are estimated while it runs and final once it ends.</li>
          <li>
            We pay by bank transfer by the 15th of the following month, once your balance reaches US$20 (₦20,000 for
            a Nigerian bank account). Smaller balances roll over to the next month.
          </li>
          <li>Balances are kept in US dollars. Naira amounts are approximate.</li>
          <li>Earnings from fake or automated opens, or from apps that break the rules, can be withheld.</li>
          <li>You’re responsible for any tax on your earnings.</li>
        </ul>
      </section>
      <Link to="/submit" className="mt-8 inline-flex min-h-11 items-center text-sm underline">
        Add or update an app
      </Link>
    </Shell>
  );
}

function CurrentMonth({ data }: { data: MyEarnings }) {
  const c = data.current;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-muted">
        {monthLabel(c.month)} · <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink">estimated</span>
      </h2>
      <p className="mt-2 font-display text-6xl tabular-nums tracking-tight">{formatUsd(c.cents)}</p>
      <p className="mt-2 max-w-xl text-sm text-pretty text-muted">
        Pool so far {formatUsd(c.poolCents)}: {CREATOR_POOL_PERCENT}% of {formatUsd(c.grossCents)} in Pass payments
        after {formatUsd(c.feesCents)} fees{c.estimatedFees ? " (partly estimated)" : ""} and{" "}
        {formatUsd(c.refundsCents)} refunds · {c.totalUses} counted {c.totalUses === 1 ? "open" : "opens"}. This
        changes until the month ends.
      </p>
      {c.apps.length === 0 ? (
        <p className="mt-6 max-w-xl text-sm text-pretty text-muted">
          Nothing of yours is live yet. Submit an app, then wait for approval.
        </p>
      ) : (
        <ul className="mt-6 max-w-xl">
          {c.apps.map((app) => (
            <li key={app.id} className="flex items-baseline justify-between gap-3 border-t border-line py-3 last:border-b">
              <span className="min-w-0">
                <span className="font-medium break-words">{app.name}</span>
                <span className="mt-1 block text-sm text-muted">
                  {app.uses} {app.uses === 1 ? "open" : "opens"}
                </span>
              </span>
              <span className="tabular-nums">{formatUsd(app.cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Balance({ data }: { data: MyEarnings }) {
  const reached = data.balanceCents >= data.minimumCents;
  return (
    <section className="mt-10 max-w-xl rounded-2xl bg-card p-5 shadow-line">
      <h2 className="font-display text-2xl">Balance</h2>
      <p className="mt-1 text-sm text-muted">Unpaid earnings from final months.</p>
      <p className="mt-3 font-display text-4xl tabular-nums">{formatUsd(data.balanceCents)}</p>
      <p className="text-sm text-muted tabular-nums">about {naira(data.aboutNgn)}</p>
      <p className="mt-3 text-sm text-pretty">
        {data.balanceCents <= 0
          ? "Nothing to pay yet."
          : reached
            ? data.lastFinal
              ? `Above the ${data.minimumLabel} minimum. Paid by bank transfer by ${dayLabel(data.lastFinal.dueBy)}.`
              : `Above the ${data.minimumLabel} minimum.`
            : `Below the ${data.minimumLabel} minimum, so it rolls over to next month.`}
        {data.balanceCents > 0 && !data.hasDetails ? " Add your payout details below so we can pay you." : ""}
      </p>
    </section>
  );
}

function History({ data }: { data: MyEarnings }) {
  if (data.months.length === 0 && data.history.length === 0) return null;
  return (
    <section className="mt-10 max-w-xl">
      <h2 className="font-display text-2xl">Final months</h2>
      <ul className="mt-3">
        {data.months.map((m) => (
          <li key={m.month} className="border-t border-line py-3 text-sm last:border-b">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">
                {monthLabel(m.month)} <span className="ml-1 rounded-full bg-paper-2 px-2 py-0.5 text-xs">final</span>
              </span>
              <span className="tabular-nums">{formatUsd(m.earnedCents)} earned</span>
            </div>
            <p className="mt-1 text-muted tabular-nums">
              Carried over {formatUsd(m.carriedCents)}
              {m.paidCents ? ` · paid ${formatUsd(m.paidCents)}` : ""}
              {m.withheldCents ? ` · withheld ${formatUsd(m.withheldCents)}` : ""} · left {formatUsd(m.remainingCents)}
            </p>
          </li>
        ))}
      </ul>
      {data.history.length > 0 ? (
        <>
          <h2 className="mt-8 font-display text-2xl">Payout history</h2>
          <ul className="mt-3">
            {data.history.map((e) => (
              <li key={e.id} className="border-t border-line py-3 text-sm last:border-b">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {e.kind === "paid" ? `Paid${e.paidOn ? ` on ${dayLabel(e.paidOn)}` : ""}` : "Withheld"}
                  </span>
                  <span className="tabular-nums">{formatUsd(e.amountCents)}</span>
                </div>
                <p className="mt-1 text-muted break-words">
                  For {monthLabel(e.month)}
                  {e.transferReference ? ` · reference ${e.transferReference}` : ""}
                  {e.reason ? ` · ${e.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function PayoutDetailsSection() {
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<MaskedDetails | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [country, setCountry] = useState("NG");

  useEffect(() => {
    let cancel = false;
    getMyPayoutDetails()
      .then((res) => {
        if (cancel) return;
        setSaved(res.details);
        setReadError(res.error);
      })
      .catch(() => !cancel && setReadError("Could not load payout details."))
      .finally(() => !cancel && setLoaded(true));
    return () => {
      cancel = true;
    };
  }, []);

  function startEdit() {
    // Saved details are never sent back unmasked; the form starts empty.
    setHolder("");
    setBank(saved?.bank ?? "");
    setAccount("");
    setCountry(saved?.country ?? "NG");
    setError(null);
    setEditing(true);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await savePayoutDetails({ data: { holder, bank, account, country } });
      setSaved(next);
      setReadError(null);
      setEditing(false);
      setHolder("");
      setAccount("");
      toast.success("Payout details saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete your payout details? We can't pay you until you add them again.")) return;
    setBusy(true);
    try {
      await deletePayoutDetails();
      setSaved(null);
      setEditing(false);
      toast.success("Payout details deleted.");
    } catch {
      toast.error("Could not delete them. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="payout-details" className="mt-10 max-w-xl rounded-2xl bg-card p-5 shadow-line">
      <h2 className="font-display text-2xl">Payout details</h2>
      <p className="mt-1 text-sm text-pretty text-muted">
        The bank account we transfer your earnings to. Stored encrypted; only the admin sees it in full, to pay you.
      </p>
      {!loaded ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : editing || (!saved && !readError) ? (
        <form onSubmit={onSave} className="mt-4 space-y-4">
          <Field label="Account holder name">
            <TextInput value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={120} autoComplete="off" required />
          </Field>
          <Field label="Bank name">
            <TextInput value={bank} onChange={(e) => setBank(e.target.value)} maxLength={120} autoComplete="off" required />
          </Field>
          <Field label="Account number" hint="Nigerian accounts: the 10-digit NUBAN. Elsewhere: account number or IBAN.">
            <TextInput
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              maxLength={40}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </Field>
          <Field label="Bank country">
            <select className={fieldClass} value={country} onChange={(e) => setCountry(e.target.value)}>
              {PAYOUT_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-fail">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save payout details"}
            </Button>
            {saved ? (
              <Button tone="quiet" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="mt-4">
          {readError ? <p className="text-sm text-fail">{readError}</p> : null}
          {saved ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Account holder</dt>
              <dd className="break-words">{saved.holder}</dd>
              <dt className="text-muted">Bank</dt>
              <dd className="break-words">{saved.bank}</dd>
              <dt className="text-muted">Account number</dt>
              <dd className="tabular-nums">{saved.account}</dd>
              <dt className="text-muted">Country</dt>
              <dd>{saved.countryName}</dd>
            </dl>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button tone="quiet" onClick={startEdit} disabled={busy}>
              {saved ? "Edit" : "Add payout details"}
            </Button>
            {saved || readError ? (
              <Button tone="quiet" onClick={() => void onDelete()} disabled={busy}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
