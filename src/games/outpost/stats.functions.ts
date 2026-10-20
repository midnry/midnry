import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { readIsAdmin } from "@/lib/community.functions";
import type { OutpostStats } from "./stats.server";
import type { StoreSales } from "./store.server";

export type { OutpostStats, StoreSales };

/** Outpost Zero players and matches for the admin's Stats page. */
export const outpostAdminStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OutpostStats> => {
    if (!(await readIsAdmin(context.userId))) throw new Error("Only the admin can see game stats.");
    const { outpostStats } = await import("./stats.server");
    return outpostStats();
  });

/** Outpost Zero store sales for the admin's Stats page. */
export const outpostAdminSales = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<StoreSales> => {
    if (!(await readIsAdmin(context.userId))) throw new Error("Only the admin can see sales.");
    const { storeSales } = await import("./store.server");
    return storeSales();
  });
