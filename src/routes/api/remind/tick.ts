import { createFileRoute } from "@tanstack/react-router";

// Pinged every few minutes by an outside scheduler (e.g. cron-job.org), which
// also wakes the server. Safe to call from anywhere: it does real work at most
// once a minute and never sends the same email twice.
async function tick() {
  const { runTick } = await import("@/lib/remind/email.server");
  const result = await runTick();
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}

export const Route = createFileRoute("/api/remind/tick")({
  server: { handlers: { GET: tick, POST: tick } },
});
