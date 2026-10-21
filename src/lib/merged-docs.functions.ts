import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getApp } from "@/lib/catalog";
import { aliasOf } from "@/lib/app-aliases";
import { MERGES, oldDocTier } from "@/lib/merges";
import { mergedDoc } from "@/lib/merged-docs";
import { readAccount } from "@/lib/account.server";
import { readIsAdmin } from "@/lib/community.functions";
import { readDoc } from "@/lib/app-docs.server";

/** The app that now holds an old slug's saved document, or undefined. */
function receivingApp(slug: string) {
  const to = aliasOf(slug)?.to ?? MERGES.find((merge) => merge.reads.includes(slug))?.into;
  return to ? getApp(to) : undefined;
}

/**
 * Read-only access to a person's own saved document from an app that was
 * merged into another (app_documents keeps it under the old slug), so the
 * receiving app can show it and copy it in. Only old slugs of merged apps are
 * accepted (APP_ALIASES, or a merge's `reads` in merges.ts). There is no write
 * path: old documents are kept exactly as they were.
 *
 * Access follows the OLD app's tier, not the receiving app's: data saved in a
 * free app stays readable (view and export) by its owner even when that app
 * moved into a Pass app (owner-approved rule; Budget and Pocket → Ledger).
 * Data from an old Pass app needs the Pass, as before. When the old tier is
 * unknown, the receiving app's tier applies.
 *
 * Always answers { slug, payload }; payload is null when there is no document
 * or the document is locked (ok: false).
 */
export const loadMergedDoc = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    if (typeof slug !== "string" || !receivingApp(slug)) throw new Error("Unknown app");
    return slug;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: slug }) => {
    const tier = oldDocTier(slug) ?? mergedDoc(slug)?.tier ?? receivingApp(slug)!.tier;
    if (tier !== "free" && !(await readIsAdmin(context.userId)) && !(await readAccount(context.userId)).hasPass) {
      return { ok: false as const, slug, payload: null as string | null, error: "locked" as const };
    }
    const sql = await getSql();
    const doc = await readDoc(sql, context.userId, slug);
    return { ok: true as const, slug, payload: doc.payload };
  });
