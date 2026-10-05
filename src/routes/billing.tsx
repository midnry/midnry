import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useAccount } from "@/components/account";
import {
  beginCheckout,
  billingConfig,
  cancelRenewal,
  confirmCheckout,
  openCardPortal,
  resumeRenewal,
  type BillingConfig,
} from "@/lib/billing.functions";
import { APPS } from "@/lib/catalog";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { formatUsd, formatWhen } from "@/lib/format";
import { Button, Skeleton } from "@/components/ui";
import { toast } from "sonner";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — Midnry" }] }),
  component: BillingPage,
});

function checkoutError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/channel|currency|not configured|merchant/i.test(message)) {
    return "Payments aren't available right now. Please try again later. You weren't charged.";
  }
  if (/email/i.test(message)) return "Add an email to your account before paying.";
  return "Checkout didn't open. Please try again. You weren't charged.";
}

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-pine" fill="none">
      <path d="M5 10.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppChips({ names }: { names: string[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {names.map((name) => (
        <li key={name} className="rounded-full bg-paper px-3 py-1 text-sm">
          {name}
        </li>
      ))}
    </ul>
  );
}

function BillingPage() {
  const { user, isPending } = useCurrentUserState();
  const { account, loading, apply, refresh } = useAccount();
  const [busy, setBusy] = useState<"start" | "cancel" | "resume" | "portal" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const handledReturn = useRef(false);

  useEffect(() => {
    let cancel = false;
    billingConfig()
      .then((next) => {
        if (!cancel) setConfig(next);
      })
      .catch(() => {
        if (!cancel) setConfig({ ready: false, mode: "off" });
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!user || handledReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const reference = params.get("reference") || params.get("trxref");
    if (checkout !== "success" && checkout !== "cancel" && !reference) return;
    handledReturn.current = true;
    window.history.replaceState({}, "", "/billing");
    if (checkout === "cancel") {
      toast("Checkout canceled. You weren't charged.");
      return;
    }
    if (!reference) return;
    void (async () => {
      try {
        const next = await confirmCheckout({ data: reference });
        apply(next);
        toast.success("You're in! Midnry Pass is active.");
      } catch {
        try {
          const next = await refresh();
          if (next?.hasPass) toast.success("You're in! Midnry Pass is active.");
          else toast.error("The payment didn't go through. You weren't charged.");
        } catch {
          toast.error("The payment didn't go through. You weren't charged.");
        }
      }
    })();
  }, [user, apply, refresh]);

  if (isPending || (user && loading)) {
    return (
      <Shell>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-6 h-48 w-full max-w-xl" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;

  const state = account;
  const passApps = [...new Set(APPS.filter((app) => app.tier === "pass").map((app) => app.name))];
  const freeApps = [...new Set(APPS.filter((app) => app.tier === "free").map((app) => app.name))];

  async function start() {
    setBusy("start");
    try {
      const result = await beginCheckout();
      if (result.action === "redirect") {
        window.location.assign(result.url);
        return;
      }
      if (result.action === "already") {
        const next = await refresh();
        if (next) apply(next);
        toast.success("Midnry Pass is already active.");
      } else {
        toast.error("Payments aren't available right now. Please try again later.");
      }
    } catch (error) {
      toast.error(checkoutError(error));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    try {
      const next = await cancelRenewal();
      apply(next);
      setConfirmCancel(false);
      toast.success("Renewal canceled. You keep the pass until your end date.");
    } catch {
      toast.error("Couldn't cancel. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function resume() {
    setBusy("resume");
    try {
      const next = await resumeRenewal();
      apply(next);
      toast.success("Your pass will renew again.");
    } catch {
      toast.error("Couldn't turn renewal back on. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function portal() {
    setBusy("portal");
    try {
      const { url } = await openCardPortal();
      window.location.assign(url);
    } catch {
      toast.error("Couldn't open the card page. Try again.");
      setBusy(null);
    }
  }

  const ending = state?.status === "canceled";
  const endDate = state?.currentPeriodEnd ? formatWhen(state.currentPeriodEnd) : null;

  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">Billing</h1>

      <div className="mt-8 max-w-xl space-y-6">
        <section className="rounded-3xl bg-card p-6 shadow-line sm:p-8">
          {!state || !state.hasPass ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-pine">Midnry Pass</p>
                {config?.mode === "test" ? (
                  <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-medium text-muted">
                    Test mode
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-display text-5xl tabular-nums">
                {PASS_PRICE_LABEL}
                <span className="ml-2 font-sans text-base text-muted">/ month</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex gap-2.5">
                  <Check />
                  Unlock all {passApps.length} Pass apps
                </li>
                <li className="flex gap-2.5">
                  <Check />
                  Cancel anytime. Keep access until the month ends.
                </li>
                <li className="flex gap-2.5">
                  <Check />
                  Secure card payment with Paystack
                </li>
              </ul>
              <Button
                tone="primary"
                className="mt-7 w-full sm:w-auto"
                disabled={busy !== null || !config?.ready}
                onClick={() => void start()}
              >
                {busy === "start"
                  ? "Opening checkout…"
                  : !config
                    ? "Loading…"
                    : !config.ready
                      ? "Payments unavailable"
                      : `Get Midnry Pass · ${PASS_PRICE_LABEL}/month`}
              </Button>
              {config && !config.ready ? (
                <p className="mt-3 text-sm text-muted">Payments are paused for now. Please check back soon.</p>
              ) : config?.mode === "test" ? (
                <details className="mt-4 text-sm text-muted">
                  <summary className="cursor-pointer">Test card details</summary>
                  <p className="mt-2 font-mono">4084 0840 8408 4081 · any future date · CVV 408 · PIN 0000 · OTP 123456</p>
                </details>
              ) : null}
            </>
          ) : (
            <>
              <span
                className={
                  ending
                    ? "inline-flex rounded-full bg-paper-2 px-3 py-1 text-sm font-medium text-muted"
                    : "inline-flex rounded-full bg-pine/10 px-3 py-1 text-sm font-medium text-pine"
                }
              >
                {ending ? "Ending" : "Active"}
              </span>
              <p className="mt-4 font-display text-4xl tracking-tight text-balance">
                {ending ? "Your pass is ending" : "Midnry Pass is on"}
              </p>
              <p className="mt-2 text-muted">
                {endDate
                  ? ending
                    ? `You have full access until ${endDate}.`
                    : `${formatUsd(state.priceCents)} a month · next payment ${endDate}`
                  : `${formatUsd(state.priceCents)} a month`}
              </p>

              {confirmCancel ? (
                <div className="mt-6 rounded-2xl bg-paper p-4">
                  <p className="text-sm font-medium">Cancel renewal?</p>
                  <p className="mt-1 text-sm text-muted">
                    {endDate ? `You'll keep the pass until ${endDate}.` : "You'll keep the pass until the period ends."}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button tone="primary" onClick={() => void cancel()} disabled={busy !== null}>
                      {busy === "cancel" ? "Canceling…" : "Yes, cancel"}
                    </Button>
                    <Button tone="quiet" onClick={() => setConfirmCancel(false)} disabled={busy !== null}>
                      Keep my pass
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  {ending ? (
                    <Button tone="primary" disabled={busy !== null || !config?.ready} onClick={() => void resume()}>
                      {busy === "resume" ? "Turning on…" : "Keep my pass"}
                    </Button>
                  ) : null}
                  <Button tone="quiet" disabled={busy !== null || !config?.ready} onClick={() => void portal()}>
                    {busy === "portal" ? "Opening…" : "Update card"}
                  </Button>
                  {!ending ? (
                    <Button tone="quiet" onClick={() => setConfirmCancel(true)} disabled={busy !== null}>
                      Cancel renewal
                    </Button>
                  ) : null}
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-3xl bg-card p-6 shadow-line sm:p-8">
          <h2 className="font-display text-2xl tracking-tight">What's included</h2>
          <p className="mt-4 text-sm font-medium">Unlocked with the pass</p>
          <AppChips names={passApps} />
          <p className="mt-5 text-sm text-muted">
            Plus {freeApps.length} free apps for everyone, with or without the pass.{" "}
            <Link to="/apps" className="text-ink underline underline-offset-4">
              Browse the desk
            </Link>
          </p>
        </section>

        <Link to="/apps" className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink">
          ← Back to the desk
        </Link>
      </div>
    </Shell>
  );
}
