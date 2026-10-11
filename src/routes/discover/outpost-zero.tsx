import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/discover/outpost-zero")({
  head: () => ({
    meta: [
      { title: "Outpost Zero — a comic arena shooter | Midnry" },
      { name: "description", content: "Play Outpost Zero, a free first-person arena shooter with comic graphics, rogue sentries and desktop or touch controls." },
    ],
  }),
  component: OutpostZeroDiscovery,
});

function OutpostZeroDiscovery() {
  return (
    <Shell>
      <section className="grid gap-8 overflow-hidden rounded-3xl border-2 border-[#080e15] bg-[#18212b] p-6 text-[#fff4dc] sm:p-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-[#ffc455]">MIDNRY ORIGINAL · FREE GAME</p>
          <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-6xl">Outpost Zero.</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#c6c8c6]">A sun-scorched outpost. Choose Field Ops for sentry combat, or Last Signal to face seven rival bots and fight to be the last survivor.</p>
          <Link to="/games/outpost-zero" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-[#080e15] bg-[#ffc455] px-7 font-extrabold text-[#141a20] shadow-[4px_4px_0_#080e15] hover:bg-[#ffda85]">Play Outpost Zero →</Link>
          <p className="mt-4 text-sm text-[#c6c8c6]">No account needed. Play on desktop or mobile.</p>
        </div>
        <div className="rounded-2xl border-2 border-[#080e15] bg-[#263b44] p-8 text-center shadow-[6px_6px_0_#080e15]">
          <img src="/outpost-zero.svg" alt="An outlined rogue sentry with a glowing red visor" className="mx-auto w-48 max-w-full" />
          <p className="mt-5 text-xs font-extrabold tracking-[0.25em] text-[#ffc455]">FIELD OPS + LAST SIGNAL · SOLO</p>
        </div>
      </section>
      <section className="mt-8 grid gap-5 sm:grid-cols-3" aria-label="Game features and controls">
        <article className="rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-xl">On your computer</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">WASD to move. Mouse to aim. Click or Space to fire. R to reload, Shift to sprint, and Escape or P to pause. Arrow keys also move and turn.</p>
        </article>
        <article className="rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-xl">On your phone</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">Move with the left stick. Drag the right side to aim, hold FIRE to shoot, and tap R to reload. Try landscape for a wider view.</p>
        </article>
        <article className="rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-xl">Keep the last signal</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">In Last Signal, break Supply Crates and collect Charge Cores for lasting health and damage boosts. Follow the safe zone before Red Haze closes in. Outlast all seven bots to win. Field Ops is still available.</p>
        </article>
      </section>
    </Shell>
  );
}
