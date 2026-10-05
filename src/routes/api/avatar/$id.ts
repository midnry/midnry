import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/avatar/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return new Response("Not found", { status: 404 });
        const { getSql } = await import("@/lib/db");
        const sql = await getSql();
        const rows = await sql<{ mime: string; data: string }>`
          select mime, data from user_avatar where user_id = ${id}
        `;
        const row = rows[0];
        if (!row) return new Response("Not found", { status: 404 });
        return new Response(Buffer.from(row.data, "base64"), {
          headers: {
            "content-type": row.mime,
            "cache-control": "public, max-age=86400",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
