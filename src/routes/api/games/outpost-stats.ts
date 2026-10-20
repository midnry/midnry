import { createFileRoute } from "@tanstack/react-router";

// Outpost Zero accounts: { op: "me" } tells the game who is signed in (401 when
// nobody is, so it shows its sign-in screen); { op: "record", match } stores a
// finished match for the signed-in player.
export const Route = createFileRoute("/api/games/outpost-stats")({
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
        if (text.length > 2048)
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
          // Local browser QA only (scripts/qa/dev-up.sh sets OUTPOST_QA_PLAYER):
          // signed-out test browsers play as a stand-in player whose matches are
          // not stored. Never on Render; the `outpost-qa-signed-out` cookie
          // restores the real answer so the sign-in screen itself can be tested.
          const qa =
            process.env.OUTPOST_QA_PLAYER === "1" &&
            !process.env.RENDER &&
            !/(?:^|;\s*)outpost-qa-signed-out=1/.test(request.headers.get("cookie") ?? "");
          if (qa) return Response.json(body.op === "me" ? { name: "QA Player" } : { ok: true }, { headers });
          return Response.json({ error: "Sign in to play." }, { status: 401, headers });
        }
        const stats = await import("@/games/outpost/stats.server");
        const { OutpostError } = await import("@/games/outpost/rooms.server");
        try {
          if (body.op === "me") return Response.json({ name: await stats.playerName(userId) }, { headers });
          if (body.op === "record" && body.match && typeof body.match === "object")
            return Response.json(await stats.recordMatch(userId, body.match as Record<string, unknown>), { headers });
          return Response.json({ error: "Invalid request." }, { status: 400, headers });
        } catch (error) {
          if (error instanceof OutpostError)
            return Response.json({ error: error.message }, { status: error.status, headers });
          console.error("[outpost] Stats failed", error instanceof Error ? error.message : "Unknown error");
          return Response.json({ error: "Stats unavailable. Try again shortly." }, { status: 503, headers });
        }
      },
    },
  },
});
