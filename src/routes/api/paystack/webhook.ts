import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePaystackWebhook } = await import("@/lib/paystack.server");
        return handlePaystackWebhook(request);
      },
    },
  },
});
