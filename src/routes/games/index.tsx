import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { cn } from "@/components/ui";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "Games — Midnry" },
      {
        name: "description",
        content:
          "Two free games you play in your browser, on a phone or a computer: Abuja Hustle, a life sim set in Abuja (18+), and Outpost Zero, a medevac rescue with hidden saboteurs.",
      },
    ],
  }),
  component: GamesPage,
});

/** Facts on a game card: short, verified, and never a promise of a date. */
function Facts({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <li key={item} className="rounded-full bg-black/30 px-3 py-1 text-sm ring-1 ring-white/20 backdrop-blur-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}

function GameActions({
  play,
  about,
  name,
  playClass,
}: {
  play: "/games/abuja-hustle" | "/games/outpost-zero";
  about: "/discover/abuja-hustle" | "/discover/outpost-zero";
  name: string;
  playClass: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        to={play}
        aria-label={`Play ${name}`}
        className={cn(
          "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
          playClass,
        )}
      >
        Play <span aria-hidden>→</span>
      </Link>
      <Link
        to={about}
        aria-label={`About ${name}`}
        className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-base font-medium text-white ring-1 ring-white/45 hover:bg-white/10"
      >
        About the game
      </Link>
    </div>
  );
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold tracking-[0.2em] uppercase", className)}>{children}</p>;
}

function GamesPage() {
  return (
    <Shell>
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-pine">Games</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight text-balance sm:text-7xl">Take a break. Play something.</h1>
        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted">
          Two free games that run in your browser, on a phone or a computer. Nothing to install.
        </p>
        <nav aria-label="Games on this page" className="mt-6 flex flex-wrap gap-2">
          <a href="#abuja-hustle" className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-medium shadow-line hover:bg-paper-2">
            Abuja Hustle
          </a>
          <a href="#outpost-zero" className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-medium shadow-line hover:bg-paper-2">
            Outpost Zero
          </a>
        </nav>
      </header>

      <div className="mt-12 space-y-8">
        {/* Abuja Hustle: dusk over the city, in the game's own warm palette. */}
        <article
          id="abuja-hustle"
          aria-labelledby="abuja-title"
          className="relative scroll-mt-20 overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_90%_45%_at_50%_100%,rgba(240,160,75,0.5),transparent_70%),linear-gradient(to_bottom,#0b0f2a_0%,#1d1a4f_34%,#43276a_62%,#86395f_86%,#a84a47_100%)] text-white"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(#f7edda_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.12] [mask-image:linear-gradient(to_bottom,black,transparent_55%)]"
          />
          <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            <div>
              <div className="flex items-center gap-3">
                <img src="/abuja-hustle-v2-192.png" alt="" width={56} height={56} className="size-14 rounded-2xl ring-1 ring-white/20" />
                <Eyebrow className="text-[#edc584]">Free game · 18+</Eyebrow>
              </div>
              <h2 id="abuja-title" className="mt-5 font-display text-5xl tracking-tight text-balance sm:text-6xl">
                Abuja Hustle
              </h2>
              <p className="mt-4 max-w-xl text-lg text-pretty text-[#f7edda]">
                Grow up in Abuja, from primary school to adult life. Build a career, a business or a following, make friends in high
                places, and chase financial freedom without ending up in Kuje.
              </p>
              <ul className="mt-5 grid max-w-xl gap-2 text-pretty text-[#f7edda]/90 sm:grid-cols-2">
                <li>A hand-painted Abuja to walk around</li>
                <li>A banking career across 44 fictional banks</li>
                <li>Okada, keke, taxi or your own car</li>
                <li>Court, Kuje, and the people you meet</li>
              </ul>
              <Facts className="mt-6" items={["Phone or computer", "Sign in to save your progress", "For adults: money, debt, crime"]} />
              <div className="mt-8">
                <GameActions
                  play="/games/abuja-hustle"
                  about="/discover/abuja-hustle"
                  name="Abuja Hustle"
                  playClass="bg-[#70d3ad] text-[#06251b] shadow-[0_8px_24px_-8px_rgba(112,211,173,0.7)] hover:bg-[#8be0bf]"
                />
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[26rem]">
              <div
                aria-hidden
                className="absolute top-1/2 left-1/2 size-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(240,160,75,0.35),rgba(194,86,106,0.12)_45%,transparent_70%)]"
              />
              <img
                src="/shots/abuja-hustle/hero-art.webp?v=2026-10-09"
                alt="Abuja Hustle artwork: a young man with his phone at sunset, with the city's towers, Zuma Rock and the National Mosque behind him"
                width={900}
                height={900}
                loading="lazy"
                className="relative aspect-square w-full rounded-[1.75rem] object-cover shadow-[0_24px_60px_-20px_rgba(10,13,36,0.8)] ring-1 ring-white/15"
              />
            </div>
          </div>
        </article>

        {/* Outpost Zero: the key art, full bleed, with the game's amber call to action. */}
        <article
          id="outpost-zero"
          aria-labelledby="outpost-title"
          className="relative isolate scroll-mt-20 overflow-hidden rounded-[2rem] bg-[#101419] text-white"
        >
          <picture>
            <source media="(max-width: 767px)" srcSet="/games/outpost-zero/key-art-mobile.webp" />
            <img
              src="/games/outpost-zero/key-art.webp"
              alt="Outpost Zero key art: a masked operator faces a horned creature on the base runway at sunset"
              width={1672}
              height={941}
              loading="lazy"
              className="absolute inset-0 -z-10 size-full object-cover object-[70%_center]"
            />
          </picture>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(8,12,18,0.96)_0%,rgba(8,12,18,0.82)_45%,rgba(8,12,18,0.2)_80%)] md:bg-[linear-gradient(to_right,rgba(8,12,18,0.95)_0%,rgba(8,12,18,0.8)_42%,rgba(8,12,18,0.1)_75%)]"
          />
          <div className="flex min-h-[38rem] flex-col justify-end p-6 sm:p-10 md:min-h-[34rem] md:justify-center">
            <div className="max-w-xl">
              <Eyebrow className="text-[#ffc455]">Midnry original · Free game</Eyebrow>
              <h2 id="outpost-title" className="mt-4 font-display text-5xl tracking-tight sm:text-6xl">
                Outpost Zero
              </h2>
              <p className="mt-4 text-lg text-pretty text-[#e9e6dc]">
                In Blackout Protocol, gather medical supplies at Breakwater Base and fly them by medevac aircraft to wounded soldiers,
                while hidden infiltrators sabotage the supplies, the crew and the flight.
              </p>
              <p className="mt-3 text-pretty text-[#c6c8c6]">
                Play offline with smart AI, or open an online room for up to eight players. Bots fill the empty seats.
              </p>
              <Facts className="mt-6" items={["Desktop or mobile", "First match without an account", "Coming soon to Steam, PC and Mac"]} />
              <div className="mt-8">
                <GameActions
                  play="/games/outpost-zero"
                  about="/discover/outpost-zero"
                  name="Outpost Zero"
                  playClass="bg-[#ffc455] text-[#141a20] hover:bg-[#ffda85]"
                />
              </div>
            </div>
          </div>
        </article>
      </div>

      <section className="mt-12 grid gap-4 rounded-3xl bg-card p-6 shadow-line sm:grid-cols-3 sm:p-8">
        <div>
          <h2 className="font-display text-xl tracking-tight">Free to play</h2>
          <p className="mt-1.5 text-sm text-pretty text-muted">
            Both games are free. Outpost Zero’s store sells optional, cosmetic weapon finishes, and Midnry Pass includes one: Midnry
            Signal, in black and gold.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl tracking-tight">Saved to your account</h2>
          <p className="mt-1.5 text-sm text-pretty text-muted">
            A free Midnry account keeps your Abuja Hustle progress and your Outpost Zero stats.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl tracking-tight">Looking for tools?</h2>
          <p className="mt-1.5 text-sm text-pretty text-muted">
            Midnry is also a desk of apps for school, work, business and home.{" "}
            <Link to="/apps" className="font-medium text-ink underline underline-offset-4">
              Browse the apps
            </Link>
          </p>
        </div>
      </section>
    </Shell>
  );
}
