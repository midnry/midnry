import { createFileRoute } from "@tanstack/react-router";

// A bounded, uncompressed sample from the actual game host. No database,
// accounts, third-party test services or user network information is stored.
let sample: Uint8Array<ArrayBuffer> | undefined;
export const Route = createFileRoute("/api/games/outpost-connection")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const download = new URL(request.url).searchParams.get("probe") === "download";
        const headers = {
          "cache-control": "no-store, no-transform",
          "cross-origin-resource-policy": "same-origin",
        };
        if (!download) return Response.json({ ok: true }, { headers });
        if (!sample) {
          sample = new Uint8Array(256 * 1024);
          for (let offset = 0; offset < sample.length; offset += 65536)
            crypto.getRandomValues(sample.subarray(offset, offset + 65536));
        }
        return new Response(sample, {
          headers: {
            ...headers,
            "content-type": "application/octet-stream",
            "content-length": String(sample.length),
          },
        });
      },
    },
  },
});
