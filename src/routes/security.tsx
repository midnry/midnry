import { createFileRoute, redirect } from "@tanstack/react-router";

// Two-step verification now lives on the account page.
export const Route = createFileRoute("/security")({
  beforeLoad: () => {
    throw redirect({ to: "/account", hash: "security", replace: true });
  },
});
