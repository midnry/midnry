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
      toast("Checkout canceled. Your card was not charged.");
      return;
    }
    if (!reference) return;
    void (async () => {
      try {
        const next = await confirmCheckout({ data: reference });
        apply(next);
        toast.success("Payment received. Midnry Pass is active.");
      } catch {
        try {
          const next = await refresh();
          if (next?.hasPass) toast.success("Payment received. Midnry Pass is active.");
          else toast.error("The payment did not finish. The pass stays locked.");
        } catch {
          toast.error("The payment did not finish. The pass stays locked.");
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
  const included = APPS.filter((app) => app.tier === "free").map((app) => app.name);
  const paid = APPS.filter((app) => app.tier === "pass").map((app) => app.name);

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
        toast.error("Card checkout isn't connected yet.");
      }
    } catch {
      toast.error("Could not open checkout. Your card was not charged.");
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
      toast.success("Renewal canceled. Access stays through the end date.");
    } catch {
      toast.error("Could not cancel.");
    } finally {
      setBusy(null);
    }
  }

  async function resume() {
    setBusy("resume");
    try {
      const next = await resumeRenewal();
      apply(next);
      toast.success("Renewal is back on.");
    } catch {
      toast.error("Could not resume renewal.");
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
      toast.error("Could not open the card page.");
      setBusy(null);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">Billing</h1>
      <p className="mt-3 max-w-xl text-pretty text-muted">
        Signed in as {user.primaryEmail ?? user.displayName ?? "your account"}. Included tools stay
        open without a pass.
      </p>

      <section className="mt-8 max-w-xl rounded-3xl bg-card p-6 shadow-line sm:p-8">
        {!state || !state.hasPass ? (
          <>
            <p className="text-sm text-pine">Midnry Pass</p>
            <p className="mt-3 font-display text-5xl tabular-nums">
              {PASS_PRICE_LABEL}
              <span className="ml-2 font-sans text-base text-muted">/ month</span>
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li>Charged as {formatUsd(500)} today, then every month</li>
              <li>Opens {paid.join(", ")}</li>
              <li>Keeps {included.join(", ")} either way</li>
              <li>Cancel anytime. Access stays until the period ends.</li>
            </ul>
            <p className="mt-4 text-sm text-pretty text-muted">
              {config?.mode === "test"
                ? "Paystack is in test mode. A real card is not charged. Use 4084084084084081, any future date, CVV 408, PIN 0000, and OTP 123456."
                : config?.ready
                  ? "The card is entered on Paystack. Midnry never sees the card number. The pass opens only after the $5 charge succeeds."
                  : "Card checkout isn't connected yet, so a pass can't be started. Nothing is charged."}
            </p>
            <Button
              tone="primary"
              className="mt-6"
              disabled={busy !== null || !config?.ready}
              onClick={() => void start()}
            >
              {busy === "start"
                ? "Opening checkout…"
                : !config
                  ? "Checking…"
                  : !config.ready
                    ? "Card checkout unavailable"
                    : `Continue to Paystack — ${PASS_PRICE_LABEL}`}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-pine">
              {state.status === "canceled" ? "Ends soon" : "Active"}
            </p>
            <p className="mt-3 font-display text-4xl tracking-tight text-balance">
              {state.status === "canceled" ? "Access continues" : "Midnry Pass is on"}
            </p>
            <p className="mt-3 text-sm text-muted">
              {formatUsd(state.priceCents)} / month
              {state.currentPeriodEnd
                ? state.status === "canceled"
                  ? ` · ends ${formatWhen(state.currentPeriodEnd)}`
                  : ` · renews ${formatWhen(state.currentPeriodEnd)}`
                : null}
            </p>
            <p className="mt-4 text-sm text-pretty text-muted">
              The whole desk is open
              {state.currentPeriodEnd ? ` through ${formatWhen(state.currentPeriodEnd)}` : ""}, including
              approved member apps. Paystack bills the card on file
              {state.status === "canceled" ? " until you resume." : " each month until you cancel."}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button tone="quiet" disabled={busy !== null || !config?.ready} onClick={() => void portal()}>
                {busy === "portal" ? "Opening…" : "Update card"}
              </Button>
              {state.status === "active" ? (
                confirmCancel ? (
                  <>
                    <Button tone="quiet" onClick={() => setConfirmCancel(false)} disabled={busy !== null}>
                      Keep the pass
                    </Button>
                    <Button tone="primary" onClick={() => void cancel()} disabled={busy !== null}>
                      {busy === "cancel" ? "Canceling…" : "Confirm cancel"}
                    </Button>
                  </>
                ) : (
                  <Button tone="quiet" onClick={() => setConfirmCancel(true)} disabled={busy !== null}>
                    Cancel renewal
                  </Button>
                )
              ) : (
                <Button tone="primary" disabled={busy !== null || !config?.ready} onClick={() => void resume()}>
                  {busy === "resume" ? "Resuming…" : "Resume renewal"}
                </Button>
              )}
            </div>
          </>
        )}
      </section>

      <p className="mt-6 text-sm text-muted">
        <Link to="/apps" className="underline-offset-4 hover:underline">
          Back to the desk
        </Link>
      </p>
    </Shell>
  );
}
