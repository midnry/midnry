import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/games/outpost-zero")({
  validateSearch: (search: Record<string, unknown>): { room?: string; purchase?: string } => {
    const room = typeof search.room === "string" ? search.room.toUpperCase() : "";
    // Back from a store checkout: the game confirms this payment reference.
    const purchase = typeof search.purchase === "string" ? search.purchase : "";
    return {
      ...(/^[A-Z2-9]{6}$/.test(room) ? { room } : {}),
      ...(/^oz[a-f0-9]{24}$/.test(purchase) ? { purchase } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Outpost Zero — Midnry" },
      {
        name: "description",
        content:
          "Blackout Protocol: gather medical supplies and fly a medevac rescue while hidden infiltrators sabotage the mission. Device checks, bots and online play.",
      },
    ],
  }),
  component: OutpostZeroPage,
});

function OutpostZeroPage() {
  const { room, purchase } = Route.useSearch();
  const frame = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const onExit = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "midnry-outpost-exit") window.location.assign("/");
      if (event.data?.type === "midnry-outpost-focus") setPlaying(event.data.active === true);
    };
    window.addEventListener("message", onExit);
    frame.current?.contentWindow?.postMessage({ type: "midnry-outpost-host-ready" }, window.location.origin);
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
        className={playing ? "hidden" : "flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 text-xs"}
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
        src={`/games/outpost-zero.html?renderer=military&v=menu-fix-20261020${room ? `&room=${encodeURIComponent(room)}` : ""}${purchase ? `&purchase=${purchase}` : ""}`}
        title="Outpost Zero first-person shooter"
        className="block min-h-0 w-full flex-1 border-0"
        allow="fullscreen; microphone; web-share; clipboard-write"
      />
    </main>
  );
}
