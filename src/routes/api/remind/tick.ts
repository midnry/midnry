import { createFileRoute } from "@tanstack/react-router";

// Pinged every few minutes by an outside scheduler (e.g. cron-job.org), which
// also wakes the server. Safe to call from anywhere: it does real work at most
// once a minute and never sends the same email twice.
//
// The same ping runs the hourly data housekeeping (src/lib/retention.ts):
// deleting accounts closed more than 30 days ago and stats older than 90
// days. It is throttled in the database to once an hour, and a failure in one
// job never stops the other.
async function tick() {
  const { runTick } = await import("@/lib/remind/email.server");
  let remind: Awaited<ReturnType<typeof runTick>> | { ran: false; error: true };
  try {
    remind = await runTick();
  } catch (error) {
    console.error("[tick] remind failed:", error instanceof Error ? error.message : "unknown");
    remind = { ran: false, error: true };
  }
  let maintenance = false;
  try {
    const [{ getSql }, { runMaintenance }] = await Promise.all([import("@/lib/db"), import("@/lib/retention")]);
    maintenance = (await runMaintenance(await getSql())).ran;
  } catch (error) {
    console.error("[tick] retention failed:", error instanceof Error ? error.message : "unknown");
  }
  // Counts of purged accounts stay in the server; the endpoint is public.
  return Response.json(
    { ...remind, maintenance },
    { status: "error" in remind ? 500 : 200, headers: { "cache-control": "no-store" } },
  );
}

export const Route = createFileRoute("/api/remind/tick")({
  server: { handlers: { GET: tick, POST: tick } },
});
