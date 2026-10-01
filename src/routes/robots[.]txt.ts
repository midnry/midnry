import { createFileRoute } from "@tanstack/react-router";

function originOf(request: Request): string {
  const url = new URL(request.url);
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host)
    .split(",")[0]
    .trim();
  const proto = (request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""))
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
}

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = originOf(request);
        const body = `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
        return new Response(body, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
