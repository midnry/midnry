import { createFileRoute } from "@tanstack/react-router";

function page(title: string, body: string, form = "") {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Midnry</title></head>
<body style="margin:0;background:#f4f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#102033">
<main style="max-width:480px;margin:48px auto;padding:28px;background:#fff;border-radius:16px">
<p style="color:#5c6e84;margin:0 0 8px">Midnry Remind</p><h1 style="font-size:24px;margin:0 0 12px">${title}</h1><p style="line-height:1.5">${body}</p>${form}
<p style="margin-top:24px"><a href="/apps/tasks" style="color:#1d4ed8">Open Remind</a></p></main></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

const valid = (token: string) => /^[0-9a-f]{48}$/.test(token);

export const Route = createFileRoute("/api/remind/unsubscribe/$token")({
  server: {
    handlers: {
      // A GET only asks, because mail scanners open links on their own.
      GET: async ({ params }) => {
        if (!valid(params.token)) return page("Link not recognised", "This unsubscribe link isn't valid. You can change emails in Remind → Settings.");
        return page(
          "Stop Remind emails?",
          "You'll stop getting task reminders and the morning summary. You can turn them back on in Remind → Settings.",
          `<form method="post"><button style="margin-top:8px;background:#1d4ed8;color:#fff;border:0;border-radius:999px;padding:12px 22px;font-size:16px;cursor:pointer">Unsubscribe</button></form>`,
        );
      },
      POST: async ({ params }) => {
        if (!valid(params.token)) return page("Link not recognised", "This unsubscribe link isn't valid.");
        const { getSql } = await import("@/lib/db");
        const sql = await getSql();
        await sql`update remind_email_prefs set digest = false, due = false, updated_at = now() where unsub_token = ${params.token}`;
        return page("You're unsubscribed", "Remind won't email you any more. You can turn emails back on in Remind → Settings.");
      },
    },
  },
});
