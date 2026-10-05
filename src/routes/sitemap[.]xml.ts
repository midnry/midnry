import { createFileRoute } from "@tanstack/react-router";
import { APPS } from "@/lib/catalog";
import { AUDIENCES, SECTIONS, TAGS } from "@/lib/sections";

const PAGES = [
  "/",
  "/apps",
  "/pricing",
  "/submit",
  ...TAGS.map((tag) => (tag.id === "everyday" ? "/everyday" : `/for/${tag.id}`)),
  ...AUDIENCES.map((audience) => `/audiences/${audience.id}`),
  ...SECTIONS.map((section) => `/sections/${section.id}`),
  ...APPS.map((app) => `/apps/${app.slug}`),
];

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

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = originOf(request);
        const urls = PAGES.map(
          (path) => `  <url><loc>${origin}${path}</loc></url>`,
        ).join("\n");
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
