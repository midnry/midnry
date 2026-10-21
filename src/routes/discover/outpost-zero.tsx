import { useEffect, type MouseEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/discover/outpost-zero")({
  head: () => ({
    meta: [
      { title: "Outpost Zero: play free in your browser | Midnry" },
      {
        name: "description",
        content:
          "Outpost Zero: choose your operator, enter the arena and make every move count. Play Blackout Protocol and Last Signal free in your browser, with bots or friends, on a computer or phone. Coming soon to Steam, PC and Mac.",
      },
      { name: "theme-color", content: "#0c0f0e" },
    ],
  }),
  component: OutpostZeroPage,
});

/* The owner's design: near-black sections, warm off-white type, gold accents
   and one light warm-grey "coming soon" band, set in a tight grotesk. */
const GROTESK = '"Helvetica Neue", Helvetica, Arial, "Inter", system-ui, sans-serif';
const ART = "/games/outpost-zero";
const WRAP = "mx-auto w-full max-w-[80rem] px-6 sm:px-10 lg:px-16";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5bb55]";
const FOCUS_LIGHT = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#232921]";
const EYEBROW = "text-[0.6875rem] font-bold uppercase leading-none tracking-[0.3em]";
const H2 =
  "mt-6 font-bold uppercase leading-[0.88] tracking-[-0.05em] text-[length:clamp(2.5rem,9.5vw,5.5rem)] lg:text-[length:min(5.2vw,4.75rem)]";
const BUTTON =
  "inline-flex min-h-[3.375rem] w-full max-w-[19rem] items-center justify-between gap-8 px-6 text-xs font-bold uppercase tracking-[0.2em] transition-colors sm:w-auto sm:min-w-[15.5rem]";
const GOLD_BUTTON = `${BUTTON} bg-[#e5bb55] text-[#1a1d18] [text-shadow:none] hover:bg-[#f0cb6c] ${FOCUS}`;

/** In-page links scroll smoothly (instantly with reduced motion) and move focus to the section. */
function jump(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById(event.currentTarget.hash.slice(1));
  if (!target) return;
  event.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  target.focus({ preventScroll: true });
}

/** The small boxed arrow from the design. */
function ArrowBox({ up, light }: { up?: boolean; light?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-[1.125rem] shrink-0">
      <rect width="18" height="18" rx="3" fill={light ? "rgba(35,41,33,0.1)" : "rgba(240,240,233,0.14)"} />
      {up ? (
        <path d="M9 13V5M5.5 8.5 9 5l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 12l6-6M7 6h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function Wordmark() {
  return (
    <p className="whitespace-nowrap text-[0.9375rem] font-bold uppercase leading-none tracking-[0.2em] sm:text-base">
      Outpost <span className="text-[#e5bb55]">Zero</span>
      <span aria-hidden className="ml-[0.55em] inline-block size-[0.42em] bg-[#e5bb55]" />
    </p>
  );
}

/** "TAKE A CLOSER LOOK" style: spaced caps over a thin rule. */
function RuleLink({
  href,
  children,
  light,
  onClick,
}: {
  href: string;
  children: ReactNode;
  light?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex min-h-12 min-w-[12.5rem] items-center justify-between gap-10 border-b pb-1 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
        light ? `border-[#8b8f80] text-[#232921] hover:border-[#232921] ${FOCUS_LIGHT}` : `border-[#74776b] hover:border-[#f0f0e9] ${FOCUS}`
      }`}
    >
      {children}
    </a>
  );
}

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="inline-flex h-7 min-w-6 items-center justify-center whitespace-nowrap rounded-[3px] border border-[#4a4e45] bg-[#191c1a] px-2 font-[inherit] text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#f0f0e9]"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

const MODES: { n: string; name: string; tag: string; text: string; facts: [string, string][] }[] = [
  {
    n: "01",
    name: "Blackout Protocol",
    tag: "Rescue mission · find the infiltrator",
    text: "Gather medical supplies at Breakwater Base, fly them to wounded soldiers by medevac and keep the patients alive. Infiltrators in identical uniforms sabotage the supplies, the crew and the flight. Report what you find, call a meeting and vote.",
    facts: [
      ["Players", "Up to 8, bots fill empty seats"],
      ["Ways to play", "Lifeline Run, Quick shift, Night shift, Daily case"],
    ],
  },
  {
    n: "02",
    name: "Last Signal",
    tag: "Battle royale · 8 fighters",
    text: "Eight fighters, one survivor. Choose your character, break supply crates for Charge Cores and stay in the safe zone as the Red Haze closes in. Each arena brings its own disaster: a sandstorm, a lightning storm or an earthquake.",
    facts: [
      ["Lives", "3 per round"],
      ["Ways to play", "Single round, Series, Marathon"],
    ],
  },
];

const COMPUTER: [string[], string][] = [
  [["W", "A", "S", "D"], "Move"],
  [["Mouse"], "Aim"],
  [["Click"], "Fire"],
  [["R"], "Reload"],
  [["Shift"], "Sprint"],
  [["Hold E"], "Collect and interact (Blackout Protocol)"],
  [["Space", "C"], "Jump, crouch; hold C to lie prone (Last Signal)"],
  [["Esc", "P"], "Menu"],
];

const PHONE: [string[], string][] = [
  [["Left stick"], "Move; push to the edge to run"],
  [["Drag right"], "Aim"],
  [["Fire"], "Shoot"],
  [["Action"], "Hold to collect and interact (Blackout Protocol)"],
  [["Jump", "Stance", "Scope"], "Jump, crouch or lie prone, aim down the sights (Last Signal)"],
];

function SteamIcon() {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="size-10 sm:size-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="26" cy="13" r="6" />
      <circle cx="26" cy="13" r="2.6" />
      <path d="M21.4 16.8 15.6 23.5" />
      <circle cx="13.5" cy="26" r="3.6" />
      <path d="M3.5 22.5 10.2 24.6" />
    </svg>
  );
}

function PcIcon() {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="size-10 sm:size-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="7" width="28" height="19" rx="1.5" />
      <path d="M20 26v6M13 32.5h14" />
    </svg>
  );
}

function MacIcon() {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="size-10 sm:size-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="22" height="16" rx="1" />
      <path d="M9 25 5 31h30l-4-6" />
    </svg>
  );
}

const PLATFORMS = [
  { name: "Steam", Icon: SteamIcon },
  { name: "PC", Icon: PcIcon },
  { name: "Mac", Icon: MacIcon },
];

function ControlsCard({ title, rows, note }: { title: string; rows: [string[], string][]; note: string }) {
  return (
    <div className="border border-[#393d34] bg-[#222522] p-6 sm:p-8">
      <h4 className={`${EYEBROW} text-[#e5bb55]`}>{title}</h4>
      <dl className="mt-6">
        {rows.map(([keys, action]) => (
          <div key={action} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-start gap-4 border-t border-[#33372f] py-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
            <dt>
              <Keys keys={keys} />
            </dt>
            <dd className="pt-1 text-[0.9375rem] leading-snug text-[#c4c5bc]">{action}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 border-t border-[#33372f] pt-5 text-[0.875rem] text-[#a4a99a]">{note}</p>
    </div>
  );
}

function OutpostZeroPage() {
  // Dark canvas behind the page, so overscroll never flashes the site's light paper.
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.backgroundColor;
    html.style.backgroundColor = "#111715";
    return () => {
      html.style.backgroundColor = before;
    };
  }, []);

  return (
    <div
      id="top"
      tabIndex={-1}
      className="min-h-screen overflow-x-clip bg-[#111715] text-[#f0f0e9] antialiased outline-none [&_:is(h1,h2,h3,h4)]:[font-family:inherit]"
      style={{ fontFamily: GROTESK }}
    >
      {/* The way back to the rest of Midnry. */}
      <nav aria-label="Breadcrumb" className="border-b border-white/[0.07] bg-[#0c0f0e]">
        <ol className={`${WRAP} flex items-center gap-3 text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-[#a4a99a]`}>
          <li>
            <Link to="/" className={`inline-flex min-h-11 items-center gap-2 hover:text-[#f0f0e9] ${FOCUS}`}>
              <span aria-hidden>←</span> Midnry
            </Link>
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden className="text-[#5b6057]">/</span>
            <Link to="/games" className={`inline-flex min-h-11 items-center hover:text-[#f0f0e9] ${FOCUS}`}>
              Games
            </Link>
          </li>
          <li className="hidden min-w-0 items-center gap-3 sm:flex">
            <span aria-hidden className="text-[#5b6057]">/</span>
            <span aria-current="page" className="truncate text-[#f0f0e9]">
              Outpost Zero
            </span>
          </li>
        </ol>
      </nav>

      <header className="border-b border-[#2e302f] bg-[#191c1a]">
        <div className={`${WRAP} flex h-[4.25rem] items-center justify-between gap-4`}>
          <Wordmark />
          <a
            href="#coming-soon"
            onClick={jump}
            className={`inline-flex min-h-11 shrink-0 items-center gap-4 border border-[#74776b] px-4 text-[0.6875rem] font-bold uppercase tracking-[0.16em] transition-colors hover:border-[#f0f0e9] sm:px-5 ${FOCUS}`}
          >
            Coming soon <ArrowBox />
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section
          aria-labelledby="oz-title"
          className="relative isolate flex min-h-[calc(100svh-6.9rem)] flex-col overflow-hidden bg-[#111715]"
        >
          <picture>
            <source media="(max-width: 767px)" srcSet={`${ART}/key-art-mobile.webp`} width={912} height={941} />
            <img
              src={`${ART}/key-art.webp`}
              width={1672}
              height={941}
              alt="Key art: a masked fighter in red squares up to a horned brute on the outpost airfield at sunset."
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 -z-20 h-full w-full object-cover object-[22%_30%] md:object-[62%_35%]"
            />
          </picture>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 md:hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(17,23,21,0.92) 0%, rgba(17,23,21,0.45) 20%, rgba(17,23,21,0.3) 42%, rgba(17,23,21,0.62) 68%, rgba(17,23,21,0.95) 100%), linear-gradient(90deg, rgba(17,23,21,0.55) 0%, rgba(17,23,21,0) 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 hidden md:block"
            style={{
              background:
                "linear-gradient(90deg, #111715 0%, rgba(17,23,21,0.9) 26%, rgba(17,23,21,0.45) 50%, rgba(17,23,21,0) 72%), linear-gradient(180deg, rgba(17,23,21,0.75) 0%, rgba(17,23,21,0) 24%, rgba(17,23,21,0) 66%, #111715 100%)",
            }}
          />

          <div className={`${WRAP} flex flex-1 flex-col`}>
            <p className={`${EYEBROW} flex items-center gap-4 pt-9 lg:pt-7`}>
              <span aria-hidden className="size-2 rounded-full bg-[#e5bb55]" />
              Welcome to the outpost
            </p>

            <div className="mt-auto max-w-[46rem] pt-12 lg:pt-10 [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
              <h1
                id="oz-title"
                className="font-bold uppercase leading-[0.8] tracking-[-0.055em] text-[length:clamp(3.5rem,min(19vw,16.5svh),9rem)]"
              >
                <span className="block">Outpost</span>
                <span className="block text-[#e5bb55]">Zero.</span>
              </h1>
              <p className="mt-7 text-[1.3125rem] font-bold leading-tight tracking-[-0.025em] sm:mt-8 sm:text-[1.625rem]">
                Your next fight starts here.
              </p>
              <p className="mt-4 text-base leading-[1.7] text-[#c4c5bc] sm:text-[1.0625rem]">
                Choose your operator. Enter the arena.
                <br />
                Make every move count.
              </p>

              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
                <a href="#the-game" onClick={jump} className={GOLD_BUTTON}>
                  Explore the game <span aria-hidden className="text-base">↓</span>
                </a>
                <Link
                  to="/games/outpost-zero"
                  className={`${BUTTON} border border-[#f0f0e9]/70 bg-[#111715]/40 hover:border-[#f0f0e9] hover:bg-[#f0f0e9]/10 ${FOCUS}`}
                >
                  Play now <span aria-hidden className="text-base">→</span>
                </Link>
              </div>

              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-5 sm:gap-x-12">
                <div>
                  <dt className={`${EYEBROW} text-[#a4a99a]`}>Play free now</dt>
                  <dd className="mt-3 text-base sm:text-lg">In your browser</dd>
                </div>
                <div>
                  <dt className={`${EYEBROW} text-[#a4a99a]`}>Coming soon to</dt>
                  <dd className="mt-3 flex gap-3 text-base sm:gap-4 sm:text-lg">
                    Steam <span aria-hidden className="text-[#74776b]">/</span> PC{" "}
                    <span aria-hidden className="text-[#74776b]">/</span> Mac
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-10 flex items-center justify-between gap-4 whitespace-nowrap text-[length:clamp(0.5rem,2.4vw,0.625rem)] font-medium uppercase tracking-[0.22em] text-[#a4a99a] sm:tracking-[0.3em] lg:mt-6">
              <p>01 / Enter the outpost</p>
              <a href="#the-game" onClick={jump} className={`inline-flex min-h-11 items-center gap-2 hover:text-[#f0f0e9] ${FOCUS}`}>
                Scroll to explore <span aria-hidden>↓</span>
              </a>
            </div>
          </div>
        </section>

        {/* The game */}
        <section id="the-game" tabIndex={-1} aria-labelledby="oz-game" className="bg-[#191c1a] outline-none">
          <div className={`${WRAP} py-16 sm:py-24 lg:grid lg:grid-cols-2 lg:gap-16 lg:py-32`}>
            <div>
              <p className={`${EYEBROW} text-[#a4a99a]`}>The game / Outpost Zero</p>
              <h2 id="oz-game" className={H2}>
                Step in.
                <br />
                Stand out.
              </h2>
            </div>
            <div className="mt-14 lg:mt-0 lg:pt-12">
              <p className="text-[1.75rem] leading-[1.2] tracking-[-0.035em] sm:text-[2.125rem]">
                A different operator.
                <br />
                A different way into the fight.
              </p>
              <p className="mt-8 max-w-[34rem] text-base leading-[1.85] text-[#aab0a4] sm:text-[1.0625rem]">
                From choosing your fighter to taking your first shot, Outpost Zero puts you at the centre of the
                action. Explore the direction of the game below.
              </p>
              <div className="mt-10">
                <RuleLink href="#inside" onClick={jump}>
                  Take a closer look <ArrowBox />
                </RuleLink>
              </div>
            </div>
          </div>
        </section>

        {/* Inside the outpost */}
        <section
          id="inside"
          tabIndex={-1}
          aria-labelledby="oz-inside"
          className="border-t border-[#2e302f] bg-[#191c1a] outline-none"
        >
          <div className={`${WRAP} py-16 sm:py-24 lg:py-32`}>
            <div className="lg:flex lg:items-end lg:justify-between lg:gap-16">
              <div>
                <p className={`${EYEBROW} text-[#a4a99a]`}>Inside the outpost</p>
                <h2 id="oz-inside" className={H2}>
                  Your next
                  <br />
                  point of view.
                </h2>
              </div>
              <p className="mt-8 text-[0.9375rem] leading-[1.75] text-[#c4c5bc] sm:text-base lg:mt-0 lg:pb-2">
                From the lobby to the arena.
                <br />A look at the game’s visual direction.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:mt-14 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
              <figure className="flex flex-col border border-[#393d34] bg-[#222522]">
                <img
                  src={`${ART}/lobby-concept.webp`}
                  srcSet={`${ART}/lobby-concept-960.webp 960w, ${ART}/lobby-concept.webp 1672w`}
                  sizes="(min-width: 1280px) 740px, (min-width: 1024px) 62vw, 100vw"
                  width={1672}
                  height={941}
                  loading="lazy"
                  decoding="async"
                  alt="Lobby UI concept: the operator Ronin on a platform at dusk beside a horned brute, with the Last Signal mode card, a room code and a Start match button."
                  className="block h-auto w-full"
                />
                <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3 sm:px-7 sm:py-4">
                  <span className="text-[0.8125rem] font-bold uppercase tracking-[0.14em]">01 — The lobby</span>
                  <a
                    href={`${ART}/lobby-concept.webp`}
                    target="_blank"
                    rel="noopener"
                    className={`inline-flex min-h-11 items-center gap-3 text-[0.9375rem] text-[#a4a99a] hover:text-[#f0f0e9] ${FOCUS}`}
                  >
                    UI concept <ArrowBox />
                    <span className="sr-only">(opens the full-size image in a new tab)</span>
                  </a>
                </figcaption>
              </figure>

              <figure className="flex flex-col border border-[#393d34] bg-[#222522]">
                <div className="relative lg:min-h-0 lg:flex-1">
                  <img
                    src={`${ART}/hud-concept.webp`}
                    srcSet={`${ART}/hud-concept-600.webp 600w, ${ART}/hud-concept.webp 967w`}
                    sizes="(min-width: 1024px) 260px, 64vw"
                    width={967}
                    height={1627}
                    loading="lazy"
                    decoding="async"
                    alt="In-match HUD concept for phones: first-person view down a walled lane, with players alive, three lives, a Red Haze timer, a minimap, health and touch buttons to fire, jump, crouch, aim and reload."
                    className="mx-auto block h-auto w-[63%] max-w-[22rem] lg:absolute lg:inset-0 lg:h-full lg:w-full lg:max-w-none lg:object-contain lg:object-top"
                  />
                </div>
                <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3 sm:px-7 sm:py-4">
                  <span className="text-[0.8125rem] font-bold uppercase tracking-[0.14em]">02 — In the field</span>
                  <a
                    href={`${ART}/hud-concept.webp`}
                    target="_blank"
                    rel="noopener"
                    className={`inline-flex min-h-11 items-center gap-3 text-[0.9375rem] text-[#a4a99a] hover:text-[#f0f0e9] ${FOCUS}`}
                  >
                    HUD concept <ArrowBox />
                    <span className="sr-only">(opens the full-size image in a new tab)</span>
                  </a>
                </figcaption>
              </figure>
            </div>
            <p className="mt-6 text-[0.875rem] text-[#a4a99a]">
              Concept artwork and UI mockups. Final game visuals may differ.
            </p>
          </div>
        </section>

        {/* How it plays: what is in the browser game today */}
        <section id="how-it-plays" aria-labelledby="oz-how" className="border-t border-[#2e302f] bg-[#191c1a]">
          <div className={`${WRAP} py-16 sm:py-24 lg:py-32`}>
            <div className="lg:flex lg:items-end lg:justify-between lg:gap-16">
              <div>
                <p className={`${EYEBROW} text-[#a4a99a]`}>How it plays</p>
                <h2 id="oz-how" className={H2}>
                  Two games.
                  <br />
                  One outpost.
                </h2>
              </div>
              <p className="mt-8 max-w-[24rem] text-[0.9375rem] leading-[1.75] text-[#c4c5bc] sm:text-base lg:mt-0 lg:pb-2">
                Both are playable today, free in your browser, on a computer or a phone.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:mt-14 md:grid-cols-2">
              {MODES.map((mode) => (
                <article key={mode.n} className="flex flex-col border border-[#393d34] bg-[#222522] p-6 sm:p-8">
                  <p className={`${EYEBROW} text-[#e5bb55]`}>Mode {mode.n}</p>
                  <h3 className="mt-5 text-[length:clamp(1.875rem,7vw,2.75rem)] font-bold uppercase leading-[0.92] tracking-[-0.04em]">
                    {mode.name}
                  </h3>
                  <p className="mt-4 text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-[#a4a99a]">{mode.tag}</p>
                  <p className="mt-6 text-[0.9375rem] leading-[1.75] text-[#c4c5bc] sm:text-base">{mode.text}</p>
                  <dl className="mt-auto pt-8">
                    {mode.facts.map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 border-t border-[#33372f] py-3">
                        <dt className="pt-0.5 text-[0.625rem] font-bold uppercase tracking-[0.24em] text-[#a4a99a]">{label}</dt>
                        <dd className="text-[0.9375rem] leading-snug">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>

            <div className="mt-16 grid gap-10 border-t border-[#2e302f] pt-12 sm:mt-20 md:grid-cols-2 md:gap-6">
              <div>
                <h3>
                  <span className={`${EYEBROW} block text-[#a4a99a]`}>Offline</span>
                  <span className="mt-4 block text-[1.625rem] font-bold leading-tight tracking-[-0.03em] sm:text-[1.875rem]">With bots</span>
                </h3>
                <p className="mt-4 max-w-[30rem] text-[0.9375rem] leading-[1.75] text-[#c4c5bc] sm:text-base">
                  Jump straight in against smart AI bots, in either game. Offline matches pause when you open the menu.
                </p>
              </div>
              <div>
                <h3>
                  <span className={`${EYEBROW} block text-[#a4a99a]`}>Online</span>
                  <span className="mt-4 block text-[1.625rem] font-bold leading-tight tracking-[-0.03em] sm:text-[1.875rem]">With friends</span>
                </h3>
                <p className="mt-4 max-w-[30rem] text-[0.9375rem] leading-[1.75] text-[#c4c5bc] sm:text-base">
                  Create a room and share the code or invite link. Bots fill the empty seats, up to eight players.
                  Online matches keep running while menus are open.
                </p>
              </div>
            </div>

            <div className="mt-16 sm:mt-20">
              <h3 className={`${EYEBROW} text-[#a4a99a]`}>Controls</h3>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <ControlsCard title="On a computer" rows={COMPUTER} note="Game controllers work too." />
                <ControlsCard title="On a phone" rows={PHONE} note="Turn your phone sideways for a wider view." />
              </div>
            </div>

            <div className="mt-16 flex flex-col items-start gap-6 border-t border-[#2e302f] pt-12 sm:mt-20 md:flex-row md:items-center md:gap-10">
              <Link to="/games/outpost-zero" className={GOLD_BUTTON}>
                Play now <span aria-hidden className="text-base">→</span>
              </Link>
              <p className="max-w-[34rem] text-[0.9375rem] leading-[1.7] text-[#c4c5bc]">
                Free in your browser. Your first match needs no account; then sign in to keep playing and keep your
                stats.
              </p>
            </div>
          </div>
        </section>

        {/* Coming soon */}
        <section
          id="coming-soon"
          tabIndex={-1}
          aria-labelledby="oz-soon"
          className="bg-[#e7e7dd] text-[#232921] outline-none"
        >
          <div className={`${WRAP} py-20 text-center sm:py-28 lg:py-32`}>
            <p className={EYEBROW}>The next deployment</p>
            <h2
              id="oz-soon"
              className="mt-12 font-bold uppercase leading-[0.84] tracking-[-0.055em] text-[length:clamp(4rem,18vw,10rem)] sm:mt-14"
            >
              <span className="block">Coming</span>
              <span className="block text-[#7a826c]">Soon.</span>
            </h2>
            <p className="mt-10 text-[1.3125rem] tracking-[-0.02em] sm:mt-12 sm:text-[1.75rem]">A new outpost. A bigger screen.</p>

            <ul className="mx-auto mt-14 grid max-w-[44rem] grid-cols-3 sm:mt-16">
              {PLATFORMS.map(({ name, Icon }, i) => (
                <li key={name} className={`flex flex-col items-center px-2 py-2 ${i ? "border-l border-[#c3c4b9]" : ""}`}>
                  <Icon />
                  <p className="mt-5 text-[1.375rem] font-bold tracking-[-0.02em] sm:text-[1.625rem]">{name}</p>
                  <p className="mt-4 text-[0.625rem] font-medium uppercase tracking-[0.2em]">Coming soon</p>
                </li>
              ))}
            </ul>

            <p className="mt-12 text-[0.9375rem] text-[#5a6050] sm:text-base">Release date and store links will be announced.</p>
            <p className="mt-1 text-[0.9375rem] text-[#5a6050] sm:text-base">
              Until then,{" "}
              <Link
                to="/games/outpost-zero"
                className={`inline-flex min-h-11 items-center font-bold text-[#232921] underline decoration-[#8b8f80] underline-offset-4 hover:decoration-[#232921] ${FOCUS_LIGHT}`}
              >
                play free in your browser
              </Link>
              .
            </p>
            <div className="mt-10">
              <RuleLink href="#top" onClick={jump} light>
                Back to the outpost <ArrowBox up light />
              </RuleLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#191c1a]">
        <div className={`${WRAP} flex flex-wrap items-center justify-between gap-x-8 gap-y-3 pt-12`}>
          <Wordmark />
          <p className="text-[0.875rem] tracking-[0.04em] text-[#a4a99a]">© 2026 Outpost Zero</p>
        </div>
        <div className={`${WRAP} flex flex-wrap items-center justify-between gap-x-8 gap-y-2 pt-5 pb-10`}>
          <nav aria-label="Outpost Zero links">
            <ul className="-ml-0.5 flex flex-wrap gap-x-7 text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-[#a4a99a]">
              <li>
                <Link to="/games/outpost-zero" className={`inline-flex min-h-11 items-center hover:text-[#f0f0e9] ${FOCUS}`}>
                  Play now
                </Link>
              </li>
              <li>
                <Link to="/" className={`inline-flex min-h-11 items-center hover:text-[#f0f0e9] ${FOCUS}`}>
                  Midnry home
                </Link>
              </li>
              <li>
                <Link to="/games" className={`inline-flex min-h-11 items-center hover:text-[#f0f0e9] ${FOCUS}`}>
                  Games
                </Link>
              </li>
            </ul>
          </nav>
          <p className="text-[0.8125rem] text-[#a4a99a]">A Midnry original game.</p>
        </div>
      </footer>
    </div>
  );
}
