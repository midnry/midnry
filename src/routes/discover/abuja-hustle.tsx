import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/catalog";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-900.css";

export const Route = createFileRoute("/discover/abuja-hustle")({
  head: () => ({
    meta: [
      { title: "Abuja Hustle: a free life sim set in Abuja — Midnry" },
      {
        name: "description",
        content:
          "Grow up in Abuja, from primary school to adult life. Walk a hand-painted city, build a banking career, trade, bet, start businesses, make well-connected friends, and stay out of Kuje prison. Free to play on your phone or computer. 18+.",
      },
    ],
  }),
  component: GamePage,
});

// A full-bleed, dark page in the spirit of a big game launch site: one huge
// opening picture, short lines, big place names over edge-to-edge art, and a
// gallery that opens pictures full screen. Colours and type come from the game.

/** Bump when the pictures are retaken, so browsers and the CDN fetch the new ones. */
const SHOTS_VERSION = "2026-10-10";
const img = (path: string) => `/shots/abuja-hustle/${path}?v=${SHOTS_VERSION}`;
const wide = (name: string) => img(`wide/${name}.jpg`);
const wideSm = (name: string) => img(`wide/${name}-sm.jpg`);

const FONT = { fontFamily: '"Nunito", "Outfit", system-ui, sans-serif' };
const INK = "#07091a";

const STAGES: { id: string; years: string; title: string; quote: string; text: string; art: string; scale: string; glow: string }[] = [
  {
    id: "child",
    years: "Age 9 · Chapter 1",
    title: "Primary School",
    quote: "“Somewhere in Maitama, a boy your age has just been given his first car keys.”",
    text: "Lapo Baby or average family, it starts here: school fees, Mama Put, interhouse sports, and your first side hustle selling sweets at break.",
    art: "child",
    scale: "h-56 sm:h-72",
    glow: "#3b82f6",
  },
  {
    id: "teen",
    years: "Age 14 · Chapter 2",
    title: "Secondary School",
    quote: "“Same Tunde. Same Slim. New problems.”",
    text: "Crushes, prefect elections, WAEC and JAMB, a new classmate who arrives in a black Prado, and choices that can get you suspended or expelled.",
    art: "teen",
    scale: "h-64 sm:h-80",
    glow: "#16a34a",
  },
  {
    id: "nysc",
    years: "Age 18–23 · Chapters 3 & 4",
    title: "Campus & NYSC",
    quote: "“Freedom smells like burnt noodles.”",
    text: "Eight people in a four-person hostel room, then a year of national service: camp, your posting, and the certificate that opens doors.",
    art: "nysc",
    scale: "h-72 sm:h-[22rem]",
    glow: "#ca8a04",
  },
  {
    id: "adult",
    years: "Age 23+ · Chapter 5",
    title: "Adult Life",
    quote: "“Talent matters. Grind matters. Money and connections matter more.”",
    text: "Rent is due every week. Build a career, a business or a following, and chase financial freedom without ending up in Kuje.",
    art: "adult",
    scale: "h-72 sm:h-[22rem]",
    glow: "#c2566a",
  },
];

const PLACES: { name: string; area: string; line: string; image: string }[] = [
  { name: "Central Business District", area: "CBD", line: "Glass towers, Bankers' Row and the ministries. Where the money sleeps with the lights on.", image: "cbd-night" },
  { name: "Wuse Market", area: "Wuse", line: "Haggle for everything, hear everything, and never pay the first price.", image: "wuse" },
  { name: "Jabi Lake", area: "Jabi", line: "The mall, the lake, and Sunday evenings that cost more than they should.", image: "jabi" },
  { name: "Maitama", area: "Maitama", line: "Mansions, oil money and gates with three security men each.", image: "maitama" },
  { name: "Nyanya", area: "Nyanya", line: "POS Junction, one-room flats and nights when NEPA takes the light.", image: "nyanya" },
  { name: "Gwarinpa", area: "Gwarinpa", line: "Estates, a flat of your own and the evening walk back from the bus stop.", image: "gwarinpa" },
];

const WAYS: { title: string; text: string; image: string; tall?: boolean }[] = [
  { title: "Build a banking career", text: "44 fictional banks, each with its own interviews, perks and promotion panels.", image: "bank.jpg" },
  { title: "Pick your path", text: "Career, business, trading, betting, going viral or connections. Missions point the way.", image: "missions.jpg", tall: true },
  { title: "Friends in high places", text: "Children of oil chiefs, judges and bankers, and the favours they can do.", image: "nepo.jpg", tall: true },
  { title: "Talk to everyone", text: "Mama POS, Tunde, the agbero. Everyone remembers how you treated them.", image: "chat.jpg", tall: true },
  { title: "Face the court", text: "Legal Aid or a Senior Advocate. Settle, plead, and hope.", image: "court.jpg", tall: true },
  { title: "Serve time, or escape", text: "Life inside Kuje, or over the wall past the floodlight and the dogs.", image: "prison.jpg" },
  { title: "Make a home", text: "From a one-room flat in Nyanya to a place you decorate yourself.", image: "bedroom.jpg" },
  { title: "Carry the right phone", text: "From a battered Kpakpa to a folding flagship that raises your reputation.", image: "phones.jpg", tall: true },
];

const APPS: [string, string][] = [
  ["🎯 Missions", "Your path to financial freedom, one step at a time."],
  ["🏦 Bank Careers", "Vacancies, applications and your career."],
  ["📈 Trade", "Stocks, crypto and dollars, with all the risk."],
  ["⚽ OddsNaija", "Fictional football, real odds. The bookie usually wins."],
  ["📸 Instaflex", "Followers, trolls and brand deals."],
  ["💎 Connects", "Your nepo friends and their favours."],
  ["⚖️ Legal", "The evidence against you: destroy it, or lay low."],
  ["💸 QuickKash", "Loans when you're desperate. Read the terms."],
];

const GALLERY: { src: string; thumb: string; alt: string }[] = [
  { src: wide("cbd-night"), thumb: wideSm("cbd-night"), alt: "The Central Business District at night, towers lit up" },
  { src: wide("ride-dusk"), thumb: wideSm("ride-dusk"), alt: "A taxi ride through Abuja at dusk" },
  { src: wide("wuse"), thumb: wideSm("wuse"), alt: "Wuse Market by day" },
  { src: wide("jabi"), thumb: wideSm("jabi"), alt: "Jabi Lake in the evening" },
  { src: wide("nyanya"), thumb: wideSm("nyanya"), alt: "POS Junction in Nyanya during a power cut" },
  { src: wide("ride-night"), thumb: wideSm("ride-night"), alt: "A keke at night with its headlights on" },
  { src: wide("maitama"), thumb: wideSm("maitama"), alt: "Mansions in Maitama" },
  { src: img("bank.jpg"), thumb: img("bank.jpg"), alt: "The banking hall at Bankers' Row" },
  { src: img("prison.jpg"), thumb: img("prison.jpg"), alt: "The cell block at Kuje Custodial Centre" },
];

function PlayButton({ big = false }: { big?: boolean }) {
  return (
    <Link
      to="/games/abuja-hustle"
      className={`inline-flex items-center justify-center rounded-full bg-[#70d3ad] font-black text-[#06251b] uppercase shadow-[0_10px_30px_-10px_rgba(112,211,173,0.8)] transition hover:bg-[#8be0bf] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#edc584] ${big ? "min-h-14 px-9 text-base tracking-wider" : "min-h-11 px-5 text-sm tracking-wide"}`}
      style={FONT}
    >
      Play free
    </Link>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-extrabold tracking-[0.3em] text-[#edc584] uppercase sm:text-sm" style={FONT}>
      {children}
    </p>
  );
}

function TopBar() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${solid ? "bg-[#07091a]/85 shadow-[0_1px_0_rgba(247,237,218,0.08)] backdrop-blur-md" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2.5 text-[#f7edda]" aria-label={`${APP_NAME} home`}>
          <img src="/logo.png" alt="" width={32} height={32} className="size-8" />
          <span className="hidden font-display text-xl leading-none tracking-tight sm:inline">{APP_NAME}</span>
        </Link>
        <span className="hidden items-center gap-2 text-sm font-extrabold tracking-[0.2em] text-[#f7edda]/80 uppercase md:flex" style={FONT}>
          <img src="/abuja-hustle-192.png" alt="" className="size-7 rounded-lg" />
          Abuja Hustle
        </span>
        <PlayButton />
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col items-center overflow-hidden text-center">
      <img src={wide("cbd-night")} alt="" className="absolute inset-0 -z-20 size-full scale-110 object-cover blur-[3px] brightness-90" fetchPriority="high" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(7,9,26,0.75)_0%,rgba(26,23,69,0.35)_30%,rgba(74,42,110,0.35)_55%,rgba(194,86,106,0.35)_75%,#07091a_100%)]" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(240,160,75,0.45),transparent_70%)]" aria-hidden />

      <div className="flex w-full flex-1 flex-col items-center px-4 pt-28 sm:pt-32">
        <Kicker>A life sim set in Abuja, Nigeria</Kicker>
        <h1
          className="mt-4 text-[clamp(3.2rem,13vw,9.5rem)] leading-[0.85] font-black tracking-tight text-[#f7edda] uppercase drop-shadow-[0_6px_30px_rgba(7,9,26,0.8)]"
          style={FONT}
        >
          Abuja
          <br />
          <span className="bg-[linear-gradient(180deg,#ffe3a8,#edc584_45%,#f0a04b)] bg-clip-text text-transparent">Hustle</span>
        </h1>
        <p className="mt-5 max-w-md text-base text-pretty text-[#f7edda]/85 sm:text-lg">Grow up, get paid, stay out of Kuje.</p>
        <div className="mt-7 flex flex-col items-center gap-3">
          <PlayButton big />
          <p className="text-xs font-bold tracking-[0.2em] text-[#f7edda]/70 uppercase" style={FONT}>
            Free · 18+ · Phone &amp; computer
          </p>
        </div>
      </div>

      <img src={img("hero-family.webp")} alt="The player characters: a young woman in a pink hoodie, with her younger self and a schoolboy in front of her" className="relative mt-6 h-[17rem] w-auto drop-shadow-[0_20px_40px_rgba(7,9,26,0.7)] sm:h-[24rem]" />
      <a href="#story" className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[11px] font-bold tracking-[0.3em] text-[#f7edda]/60 uppercase md:flex" style={FONT}>
        Scroll
        <span className="block h-8 w-px bg-[#f7edda]/40 motion-safe:animate-pulse" aria-hidden />
      </a>
    </section>
  );
}

function Story() {
  return (
    <section id="story" className="mx-auto max-w-4xl scroll-mt-16 px-5 py-24 text-center sm:py-36">
      <Kicker>Federal Capital Territory</Kicker>
      <h2 className="mt-4 text-5xl font-black tracking-tight text-[#f7edda] uppercase sm:text-7xl" style={FONT}>
        Abuja, FCT.
      </h2>
      <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-pretty text-[#f7edda]/80 sm:text-xl">
        Wide roads, big gates, bigger dreams. You start at nine years old, in a one-room flat in Nyanya or a civil servant's flat in Gwarinpa, and the city is already
        sorting people into those who will make it and those who will hustle forever. Grow up through school, campus and national service, then try to make it as an adult:
        a banking career, a business, the markets, the bookies, a following, or friends whose parents run the country. Every shortcut has a price. Some of them come
        with a cell in Kuje.
      </p>
    </section>
  );
}

function Stages() {
  return (
    <section aria-labelledby="stages-title" className="pb-8">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Kicker>Chapter by chapter</Kicker>
        <h2 id="stages-title" className="mt-3 text-4xl font-black tracking-tight text-[#f7edda] uppercase sm:text-6xl" style={FONT}>
          Grow up in Abuja
        </h2>
      </div>
      <div className="mt-10 space-y-6 sm:space-y-10">
        {STAGES.map((s, i) => (
          <article key={s.id} className="relative isolate overflow-hidden">
            <div className="absolute inset-0 -z-10" style={{ background: `radial-gradient(ellipse 55% 80% at ${i % 2 ? "80%" : "20%"} 70%, ${s.glow}55, transparent 70%)` }} aria-hidden />
            <div className={`mx-auto grid max-w-7xl items-end gap-6 px-5 sm:px-8 md:grid-cols-2 md:gap-12 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div className="flex justify-center pt-6">
                <img src={img(`cast/${s.art}.webp`)} alt={`The player characters in the ${s.title.toLowerCase()} years`} loading="lazy" className={`${s.scale} w-auto drop-shadow-[0_20px_30px_rgba(7,9,26,0.6)]`} />
              </div>
              <div className="pb-10 md:pb-16">
                <p className="text-xs font-extrabold tracking-[0.25em] text-[#f7edda]/60 uppercase" style={FONT}>
                  {s.years}
                </p>
                <h3 className="mt-2 text-4xl leading-none font-black tracking-tight text-[#f7edda] uppercase sm:text-6xl" style={FONT}>
                  {s.title}
                </h3>
                <p className="mt-5 text-xl font-bold text-pretty text-[#edc584] sm:text-2xl" style={FONT}>
                  {s.quote}
                </p>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-pretty text-[#f7edda]/75 sm:text-lg">{s.text}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Places() {
  const [first, ...rest] = PLACES;
  return (
    <section aria-labelledby="places-title" className="pt-24 sm:pt-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Kicker>A hand-painted city</Kicker>
        <h2 id="places-title" className="mt-3 text-4xl font-black tracking-tight text-[#f7edda] uppercase sm:text-6xl" style={FONT}>
          Only in Abuja
        </h2>
      </div>
      {first ? <PlaceTile place={first} big /> : null}
      <div className="grid gap-px bg-[#07091a] sm:grid-cols-2">
        {rest.map((p) => (
          <PlaceTile key={p.name} place={p} />
        ))}
      </div>
    </section>
  );
}

function PlaceTile({ place, big = false }: { place: (typeof PLACES)[number]; big?: boolean }) {
  return (
    <div className={`relative isolate mt-px flex overflow-hidden ${big ? "mt-10 min-h-[70svh]" : "min-h-[22rem] sm:min-h-[30rem]"}`}>
      <img src={big ? wide(place.image) : wideSm(place.image)} srcSet={`${wideSm(place.image)} 960w, ${wide(place.image)} 1920w`} sizes={big ? "100vw" : "(min-width: 640px) 50vw, 100vw"} alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover transition duration-700 hover:scale-[1.03]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_top,#07091a_0%,rgba(7,9,26,0.55)_35%,transparent_70%)]" aria-hidden />
      <div className={`pointer-events-none mt-auto w-full px-5 pb-8 sm:px-8 ${big ? "mx-auto max-w-7xl sm:pb-14" : ""}`}>
        <p className="text-xs font-extrabold tracking-[0.3em] text-[#edc584] uppercase" style={FONT}>
          {place.area}
        </p>
        <h3 className={`mt-1 leading-none font-black tracking-tight text-[#f7edda] uppercase ${big ? "text-4xl sm:text-7xl" : "text-3xl sm:text-4xl"}`} style={FONT}>
          {place.name}
        </h3>
        <p className={`mt-3 max-w-xl text-pretty text-[#f7edda]/80 ${big ? "text-lg" : ""}`}>{place.line}</p>
      </div>
    </div>
  );
}

function OnTheRoad() {
  return (
    <section className="relative isolate mt-px flex min-h-[80svh] items-center overflow-hidden">
      <img src={wide("ride-dusk")} srcSet={`${wideSm("ride-dusk")} 960w, ${wide("ride-dusk")} 1920w`} sizes="100vw" alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(7,9,26,0.9),rgba(7,9,26,0.4)_55%,transparent)]" aria-hidden />
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-lg">
          <Kicker>Okada · Keke · Taxi · Bus</Kicker>
          <h2 className="mt-3 text-4xl leading-none font-black tracking-tight text-[#f7edda] uppercase sm:text-6xl" style={FONT}>
            Ride the city
          </h2>
          <p className="mt-5 text-lg text-pretty text-[#f7edda]/80">
            Watch the real route from behind as your driver weaves through traffic, at any hour, in any weather. Or buy your own car, and watch out for FRSC.
          </p>
        </div>
      </div>
    </section>
  );
}

function Ways() {
  return (
    <section aria-labelledby="ways-title" className="py-24 sm:py-32">
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-5 sm:px-8">
        <div>
          <Kicker>Financial freedom, by any means</Kicker>
          <h2 id="ways-title" className="mt-3 text-4xl font-black tracking-tight text-[#f7edda] uppercase sm:text-6xl" style={FONT}>
            Ways to make it
          </h2>
        </div>
        <p className="hidden text-sm text-[#f7edda]/50 sm:block">Swipe or scroll sideways →</p>
      </div>
      <ul className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-4 [scrollbar-width:thin] sm:scroll-px-8 sm:px-8">
        {WAYS.map((w) => (
          <li key={w.title} className="w-[78vw] max-w-[22rem] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#0f1430] ring-1 ring-white/10">
            <div className="aspect-[4/5] overflow-hidden bg-[#0b1c2b]">
              <img src={img(w.image)} alt="" loading="lazy" className={`size-full object-cover ${w.tall ? "object-top" : "object-center"}`} />
            </div>
            <div className="p-5">
              <h3 className="text-xl font-black text-[#f7edda]" style={FONT}>
                {w.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-pretty text-[#f7edda]/70">{w.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PhoneApps() {
  return (
    <section aria-labelledby="apps-title" className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="rounded-3xl bg-[linear-gradient(160deg,#0f2233,#07091a)] p-6 ring-1 ring-white/10 sm:p-10">
        <Kicker>In your pocket</Kicker>
        <h2 id="apps-title" className="mt-3 text-3xl font-black tracking-tight text-[#f7edda] uppercase sm:text-5xl" style={FONT}>
          Your phone runs your life
        </h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {APPS.map(([title, text]) => (
            <li key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="font-extrabold text-[#edc584]" style={FONT}>
                {title}
              </p>
              <p className="mt-1 text-sm text-pretty text-[#a0b6bd]">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + GALLERY.length) % GALLERY.length)), []);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
    };
  }, [open, close, step]);
  useEffect(() => {
    if (open === null) opener.current?.focus();
  }, [open]);
  const shot = open === null ? null : GALLERY[open];
  return (
    <section aria-labelledby="media-title" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <Kicker>Media</Kicker>
      <h2 id="media-title" className="mt-3 text-4xl font-black tracking-tight text-[#f7edda] uppercase sm:text-6xl" style={FONT}>
        Screenshots
      </h2>
      <ul className="mt-10 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {GALLERY.map((g, i) => (
          <li key={g.src} className={i === 0 ? "col-span-2 row-span-2" : ""}>
            <button
              type="button"
              className="group block size-full overflow-hidden rounded-xl ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#edc584]"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setOpen(i);
              }}
              aria-label={`View larger: ${g.alt}`}
            >
              <img src={i === 0 ? g.src : g.thumb} alt="" loading="lazy" className="aspect-video size-full object-cover transition duration-500 group-hover:scale-105" />
            </button>
          </li>
        ))}
      </ul>
      {shot ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#03040c]/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={shot.alt} onClick={close}>
          <div className="flex items-center justify-between gap-3 p-3 text-[#f7edda] sm:p-5">
            <p className="text-sm text-[#f7edda]/70">
              {(open ?? 0) + 1} / {GALLERY.length} · {shot.alt}
            </p>
            <button ref={closeRef} type="button" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-2xl hover:bg-white/10" onClick={close} aria-label="Close">
              ×
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-16">
            <img src={shot.src} alt={shot.alt} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
            <button type="button" className="absolute top-1/2 left-1 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-[#f7edda] hover:bg-black/70 sm:left-4" onClick={(e) => (e.stopPropagation(), step(-1))} aria-label="Previous picture">
              ‹
            </button>
            <button type="button" className="absolute top-1/2 right-1 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-[#f7edda] hover:bg-black/70 sm:right-4" onClick={(e) => (e.stopPropagation(), step(1))} aria-label="Next picture">
              ›
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Finale() {
  return (
    <section className="relative isolate flex min-h-[80svh] flex-col items-center justify-center overflow-hidden px-5 py-24 text-center">
      <img src={wide("asokoro")} srcSet={`${wideSm("asokoro")} 960w, ${wide("asokoro")} 1920w`} sizes="100vw" alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(7,9,26,0.55),#07091a_85%)]" aria-hidden />
      <img src="/abuja-hustle-192.png" alt="" className="size-20 rounded-3xl shadow-2xl ring-1 ring-white/20" />
      <h2 className="mt-6 text-4xl leading-none font-black tracking-tight text-[#f7edda] uppercase sm:text-7xl" style={FONT}>
        Your life in Abuja
        <br />
        starts now
      </h2>
      <p className="mt-5 max-w-md text-pretty text-[#f7edda]/80">Free to play in your browser. Sign in to save your progress on any device.</p>
      <div className="mt-8">
        <PlayButton big />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-[#f7edda] text-[#f7edda]" aria-hidden>
            <span className="text-2xl leading-none font-black" style={FONT}>
              18+
            </span>
          </div>
          <p className="max-w-sm text-sm text-pretty text-[#f7edda]/60">
            For adults 18 and over. Deals with money, debt, crime, gambling and relationships. A work of satire: every bank, brand and company in the game is fictional.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#f7edda]/70" aria-label="Midnry">
          <Link to="/" className="inline-flex min-h-11 items-center hover:text-[#f7edda]">
            {APP_NAME} home
          </Link>
          <Link to="/apps" className="inline-flex min-h-11 items-center hover:text-[#f7edda]">
            Desk
          </Link>
          <Link to="/pricing" className="inline-flex min-h-11 items-center hover:text-[#f7edda]">
            Pricing
          </Link>
        </nav>
      </div>
    </footer>
  );
}

function GamePage() {
  return (
    <div className="min-h-screen overflow-x-clip text-[#f7edda]" style={{ background: INK, colorScheme: "dark" }}>
      <a href="#story" className="sr-only z-50 rounded bg-[#edc584] px-3 py-2 text-[#07091a] focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to main content
      </a>
      <TopBar />
      <main>
        <Hero />
        <Story />
        <Stages />
        <Places />
        <OnTheRoad />
        <Ways />
        <PhoneApps />
        <Gallery />
        <Finale />
      </main>
      <Footer />
    </div>
  );
}
