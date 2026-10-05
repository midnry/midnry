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
    try {
      return await billing.beginCheckout(context.userId);
    } catch (error) {
      console.error("paystack checkout failed:", error instanceof Error ? error.message : error);
      throw error;
    }
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
    try {
      return await billing.confirmCheckout(context.userId, data);
    } catch (error) {
      console.error("paystack confirm failed:", error instanceof Error ? error.message : error);
      throw error;
    }
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
