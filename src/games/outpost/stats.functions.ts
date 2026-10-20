import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { readIsAdmin } from "@/lib/community.functions";
import type { OutpostStats } from "./stats.server";

export type { OutpostStats };

/** Outpost Zero players and matches for the admin's Stats page. */
export const outpostAdminStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OutpostStats> => {
    if (!(await readIsAdmin(context.userId))) throw new Error("Only the admin can see game stats.");
    const { outpostStats } = await import("./stats.server");
    return outpostStats();
  });
