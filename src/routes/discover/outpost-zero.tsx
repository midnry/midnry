import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/discover/outpost-zero")({
  head: () => ({
    meta: [
      { title: "Blackout Protocol — Outpost Zero | Midnry" },
      {
        name: "description",
        content:
          "Blackout Protocol: gather medical supplies, pilot a medevac aircraft, and save wounded soldiers while hidden infiltrators sabotage the rescue. Bots or friends, desktop and mobile.",
      },
    ],
  }),
  component: OutpostZeroDiscovery,
});

function OutpostZeroDiscovery() {
  return (
    <Shell>
      <section className="grid gap-8 overflow-hidden rounded-3xl border-2 border-[#080e15] bg-[#18212b] p-6 text-[#fff4dc] sm:p-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-[#ffc455]">
            MIDNRY ORIGINAL · FREE GAME
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-6xl">Outpost Zero.</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#c6c8c6]">
            Blackout Protocol is the default: gather medical equipment at Breakwater Base, then
            transport it by medevac aircraft to wounded soldiers. Hidden infiltrators sabotage
            supplies, the crew and the flight. Play with bots or
            friends. Last Signal and Pair Ops remain available for Solo and Duo combat.
          </p>
          <Link
            to="/games/outpost-zero"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-[#080e15] bg-[#ffc455] px-7 font-extrabold text-[#141a20] shadow-[4px_4px_0_#080e15] hover:bg-[#ffda85]"
          >
            Play Outpost Zero →
          </Link>
          <p className="mt-4 text-sm text-[#c6c8c6]">
            No account needed. Play on desktop or mobile.
          </p>
        </div>
        <div className="rounded-2xl border-2 border-[#080e15] bg-[#263b44] p-8 text-center shadow-[6px_6px_0_#080e15]">
          <img
            src="/games/military/lifeline-mission.png"
            alt="Wounded soldiers waiting at the medevac destination clinic"
            className="mx-auto w-full rounded-xl"
          />
          <p className="mt-5 text-xs font-extrabold tracking-[0.25em] text-[#ffc455]">
            BLACKOUT PROTOCOL · ONLINE + BOTS
          </p>
        </div>
      </section>
      <section className="mt-8 grid gap-5 sm:grid-cols-3" aria-label="Game features and controls">
        <article className="rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-xl">On your computer</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            WASD to move and mouse to look. Hold E to collect, load or deliver supplies. At the
            helm, W/S controls altitude and A/D corrects heading. F
            reports a body, C calls the command console, and Escape or P opens the menu. In combat
            modes, click or Space fires and R reloads.
          </p>
        </article>
        <article className="rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-xl">On your phone</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Move with the left stick and drag the right side to look. Hold the nearby-action button
            to collect and load supplies. Cockpit controls, reporting, tactical actions and voting have
            touch controls. Try landscape for a wider view.
          </p>
        </article>
        <article className="rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-xl">Two phases. One rescue.</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Six operators and two infiltrators share identical uniforms. Load the medical
            manifest, board the aircraft and deliver aid before the wounded soldiers die. If
            autopilot is disabled, an operator must take control and stabilize the aircraft
            before restoring it. The crew loses if every operator or every patient dies.
          </p>
        </article>
      </section>
      <section
        className="mt-5 rounded-2xl bg-card p-6 shadow-line"
        aria-label="Learn and customize"
      >
        <h2 className="font-display text-xl">Learn the rules. Choose your graphics.</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The loading screen checks browser features, 3D graphics, game files and rendering
          performance. Review the result in Device Check. Mission rules explain supplies,
          patient vitals, manual flight and sabotage. All graphics presets use cinematic 3D.
        </p>
      </section>
      <section className="mt-5 grid gap-5 sm:grid-cols-2" aria-label="Maps and loadouts">
        <article className="rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-xl">Base, aircraft and five combat arenas</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Blackout Protocol uses Breakwater’s command rooms, barracks, armory, generators, hangar,
            radar and maintenance corridors, then transitions into Lifeline's cockpit and cabin.
            Combat modes offer Dust Outpost, Test Block, Skyport,
            Freight Rush and Wreck Estate.
          </p>
        </article>
        <article className="rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-xl">Combat modes: eleven loadouts</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Carbine, scatterguns, dual-pistol bursts, shard pods, spinning blades, poison darts,
            lifesteal punches, a dash scythe, rockets, and arcing fuses. Deal damage to charge a
            special ability. Stronger hit feedback makes every exchange easier to read.
          </p>
        </article>
      </section>
    </Shell>
  );
}
