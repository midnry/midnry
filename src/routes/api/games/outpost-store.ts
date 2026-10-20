import { createFileRoute } from "@tanstack/react-router";

// Outpost Zero store: { op: "state" } (owned items, Pass, open or not),
// { op: "buy", item, currency: "NGN" | "USD" } (Paystack checkout page), { op: "confirm", reference }.
export const Route = createFileRoute("/api/games/outpost-store")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = { "cache-control": "no-store", "content-type": "application/json" };
        const origin = request.headers.get("origin");
        const host =
          request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
          request.headers.get("host") ||
          new URL(request.url).host;
        if (
          origin &&
          (() => {
            try {
              return new URL(origin).host !== host;
            } catch {
              return true;
            }
          })()
        )
          return Response.json({ error: "Cross-site request rejected." }, { status: 403, headers });
        const text = await request.text();
        if (text.length > 1024)
          return Response.json({ error: "Request too large." }, { status: 413, headers });
        let body: Record<string, unknown>;
        try {
          const parsed: unknown = JSON.parse(text);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
          body = parsed as Record<string, unknown>;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400, headers });
        }
        let userId: string;
        try {
          const { requireUserId } = await import("@/lib/auth/verify.server");
          userId = await requireUserId();
        } catch {
          // Signed out is a normal state for the Locker, not an error.
          if (body.op === "state")
            return Response.json({ signedIn: false, owned: [], pass: false, ready: false }, { headers });
          return Response.json({ error: "Sign in to use the store." }, { status: 401, headers });
        }
        const store = await import("@/games/outpost/store.server");
        const { OutpostError } = await import("@/games/outpost/rooms.server");
        try {
          if (body.op === "state") return Response.json(await store.storeState(userId), { headers });
          if (body.op === "buy") return Response.json(await store.beginPurchase(userId, body.item, body.currency), { headers });
          if (body.op === "confirm")
            return Response.json(await store.confirmPurchase(userId, body.reference), { headers });
          return Response.json({ error: "Invalid request." }, { status: 400, headers });
        } catch (error) {
          if (error instanceof OutpostError)
            return Response.json({ error: error.message }, { status: error.status, headers });
          console.error("[outpost] Store failed", error instanceof Error ? error.message : "Unknown error");
          return Response.json({ error: "Store unavailable. Try again shortly." }, { status: 503, headers });
        }
      },
    },
  },
});
