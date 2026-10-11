import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/games/outpost-zero")({
  validateSearch: (search: Record<string, unknown>): { room?: string } => {
    const room = typeof search.room === "string" ? search.room.toUpperCase() : "";
    return /^[A-Z2-9]{6}$/.test(room) ? { room } : {};
  },
  head: () => ({
    meta: [
      { title: "Outpost Zero — Midnry" },
      {
        name: "description",
        content:
          "A free tactical shooter with cinematic 3D graphics. Play Solo or Duo survival with bots or friends online, Charge Cores and shrinking Red Haze.",
      },
    ],
  }),
  component: OutpostZeroPage,
});

function OutpostZeroPage() {
  const { room } = Route.useSearch();
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const onExit = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === "midnry-outpost-exit"
      )
        window.location.assign("/");
    };
    window.addEventListener("message", onExit);
    return () => window.removeEventListener("message", onExit);
  }, []);
  return (
    <main
      className="flex h-dvh min-h-0 flex-col bg-[#101419] text-[#fff4dc]"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <nav
        aria-label="Game navigation"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 text-xs"
      >
        <Link to="/" className="inline-flex min-h-11 items-center font-semibold hover:underline">
          ← Midnry
        </Link>
        <Link
          to="/discover/outpost-zero"
          className="inline-flex min-h-11 items-center hover:underline"
        >
          About Outpost Zero
        </Link>
      </nav>
      {/* The static document owns its Canvas, styles and inputs. Unmounting the
          iframe tears down the game, and its scripts never run during SSR. */}
      <iframe
        ref={frame}
        src={`/games/outpost-zero.html?renderer=military&v=tablet-refresh-20261011${room ? `&room=${encodeURIComponent(room)}` : ""}`}
        title="Outpost Zero first-person shooter"
        className="block min-h-0 w-full flex-1 border-0"
        allow="fullscreen"
      />
    </main>
  );
}
