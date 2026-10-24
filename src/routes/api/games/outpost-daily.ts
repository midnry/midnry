import { createFileRoute } from "@tanstack/react-router";

// Daily case leaderboard: { op: "board" | "submit", day, token, ...run }.
export const Route = createFileRoute("/api/games/outpost-daily")({
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
        let body: unknown;
        try {
          body = JSON.parse(text);
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400, headers });
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          return Response.json({ error: "Invalid request." }, { status: 400, headers });
        const { dailyAction } = await import("@/games/outpost/daily.server");
        const { OutpostError } = await import("@/games/outpost/rooms.server");
        try {
          const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
          return Response.json(await dailyAction(body as Record<string, unknown>, clientKey), { headers });
        } catch (error) {
          if (error instanceof OutpostError)
            return Response.json({ error: error.message }, { status: error.status, headers });
          console.error("[outpost] Daily board failed", error instanceof Error ? error.message : "Unknown error");
          // A normal answer, not a 503: the board is optional (the local best
          // score still shows) and a 503 is logged as an error in every
          // visitor's browser console while the database is unreachable.
          return Response.json({ unavailable: true, error: "Leaderboard unavailable. Try again shortly." }, { headers });
        }
      },
    },
  },
});
