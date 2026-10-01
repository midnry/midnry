import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { AccountState } from "@/lib/access";

export type CheckoutStart =
  | { action: "redirect"; url: string }
  | { action: "already" }
  | { action: "unconfigured" };

export type BillingConfig = { ready: boolean; mode: "live" | "test" | "off" };

export const billingConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<BillingConfig> => {
    const { readBillingConfig } = await import("./paystack.server");
    return readBillingConfig();
  },
);

export const beginCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CheckoutStart> => {
    const billing = await import("./paystack.server");
    return billing.beginCheckout(context.userId);
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .validator((reference: string) => {
    if (typeof reference !== "string" || !/^midnry[a-z0-9]{20,40}$/.test(reference)) {
      throw new Error("Invalid checkout");
    }
    return reference;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<AccountState> => {
    const billing = await import("./paystack.server");
    return billing.confirmCheckout(context.userId, data);
  });

export const cancelRenewal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AccountState> => {
    const billing = await import("./paystack.server");
    return billing.cancelRenewal(context.userId);
  });

export const resumeRenewal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AccountState> => {
    const billing = await import("./paystack.server");
    return billing.resumeRenewal(context.userId);
  });

export const openCardPortal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const billing = await import("./paystack.server");
    return { url: await billing.openCardPortal(context.userId) };
  });
