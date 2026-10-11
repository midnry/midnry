import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/games/outpost")({
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
        if (text.length > 4096)
          return Response.json({ error: "Request too large." }, { status: 413, headers });
        try {
          const body: unknown = JSON.parse(text);
          if (!body || typeof body !== "object" || Array.isArray(body))
            return Response.json({ error: "Invalid request." }, { status: 400, headers });
          const { roomAction, OutpostError } = await import("@/games/outpost/rooms.server");
          try {
            const clientKey =
              request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
            return Response.json(await roomAction(body as Record<string, unknown>, clientKey), {
              headers,
            });
          } catch (error) {
            if (error instanceof OutpostError)
              return Response.json({ error: error.message }, { status: error.status, headers });
            console.error(
              "[outpost] Room operation failed",
              error instanceof Error ? error.message : "Unknown error",
            );
            return Response.json(
              { error: "Room service unavailable. Try again shortly." },
              { status: 503, headers },
            );
          }
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400, headers });
        }
      },
    },
  },
});
