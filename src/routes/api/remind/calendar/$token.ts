import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/remind/calendar/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const token = params.token.replace(/\.ics$/i, "");
        if (!/^[0-9a-f]{48}$/.test(token)) return new Response("Not found", { status: 404 });
        const { buildCalendar } = await import("@/lib/remind/calendar.server");
        const body = await buildCalendar(token, new URL(request.url).origin);
        if (body === null) return new Response("Not found", { status: 404 });
        return new Response(body, {
          headers: {
            "content-type": "text/calendar; charset=utf-8",
            "cache-control": "private, max-age=900",
            "content-disposition": 'inline; filename="midnry-remind.ics"',
          },
        });
      },
    },
  },
});
