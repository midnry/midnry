import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { PricingPanel } from "@/components/pricing-panel";
import { PASS_PRICE_LABEL } from "@/lib/access";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Midnry" }] }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <Shell>
      <h1 className="max-w-2xl font-display text-5xl tracking-tight text-balance">
        Two ways in.
      </h1>
      <p className="mt-4 max-w-xl text-pretty text-muted">
        An account includes three tools. Midnry Pass is {PASS_PRICE_LABEL} a month and opens the rest of the desk,
        including apps members add after they are approved. Cancel and you keep access until the date you already paid through.
      </p>
      <div className="mt-10">
        <PricingPanel />
      </div>
      <p className="mt-6 max-w-2xl text-sm text-pretty text-muted">
        Midnry Pass is {PASS_PRICE_LABEL} a month, charged to a card through Paystack. The pass opens after
        Paystack confirms the payment, and canceling keeps access until the date already paid.
      </p>
    </Shell>
  );
}
