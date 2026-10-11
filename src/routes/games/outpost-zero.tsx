import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/games/outpost-zero")({
  head: () => ({
    meta: [
      { title: "Outpost Zero — Midnry" },
      { name: "description", content: "A free comic-styled raycasting shooter. Play Field Ops or Last Signal, a solo survival mode with Charge Cores and shrinking Red Haze." },
    ],
  }),
  component: OutpostZeroPage,
});

function OutpostZeroPage() {
  return (
    <main className="flex h-dvh min-h-[464px] flex-col bg-[#101419] text-[#fff4dc]">
      <nav aria-label="Game navigation" className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 text-xs">
        <Link to="/" className="inline-flex min-h-11 items-center font-semibold hover:underline">← Midnry</Link>
        <Link to="/discover/outpost-zero" className="inline-flex min-h-11 items-center hover:underline">About Outpost Zero</Link>
      </nav>
      {/* The static document owns its Canvas, styles and inputs. Unmounting the
          iframe tears down the game, and its scripts never run during SSR. */}
      <iframe
        src="/games/outpost-zero.html"
        title="Outpost Zero first-person shooter"
        className="block min-h-[420px] w-full flex-1 border-0"
        allow="fullscreen"
      />
    </main>
  );
}
