import { Link } from "@tanstack/react-router";
import { ArrowLink, SECTION_GAP, SectionHeader } from "@/components/home-section";
import "@fontsource/nunito/latin-900.css";

/**
 * The two Midnry games. Descriptions follow their own pages
 * (src/routes/discover/abuja-hustle.tsx and outpost-zero.tsx), checked on 21 Oct 2026.
 */

const GAME_FONT = { fontFamily: '"Nunito", "Outfit", system-ui, sans-serif' };
const ABUJA_ART_VERSION = "2026-10-09";

export function GamesSection() {
  return (
    <section className={SECTION_GAP} aria-labelledby="games-heading">
      <SectionHeader
        id="games-heading"
        eyebrow="Games by Midnry"
        title="Something to play, too"
        action={
          <a href="/games" className="inline-flex min-h-11 items-center text-sm text-ink">
            <ArrowLink>See all games</ArrowLink>
          </a>
        }
      >
        Two free games made by Midnry, in your browser on a phone or a computer.
      </SectionHeader>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {/* Abuja Hustle: dusk over the city, in the game's own colours. */}
        <article className="flex flex-col overflow-hidden rounded-3xl bg-[linear-gradient(to_bottom,#1d1a4f_0%,#43276a_55%,#86395f_100%)] text-[#f7edda] shadow-line">
          <picture>
            <source type="image/webp" srcSet={`/shots/abuja-hustle/hero-art.webp?v=${ABUJA_ART_VERSION} 900w`} sizes="(min-width: 768px) 34rem, 100vw" />
            <img
              src="/abuja-hustle-v2-512.png"
              alt="Abuja Hustle artwork: a young man with his phone at sunset, with the city's towers, Zuma Rock and the National Mosque behind him"
              width={512}
              height={512}
              loading="lazy"
              decoding="async"
              className="aspect-[16/10] w-full object-cover object-[50%_22%]"
            />
          </picture>
          <div className="flex flex-1 flex-col p-6 sm:p-7">
            <p className="text-xs font-extrabold tracking-widest text-[#edc584] uppercase" style={GAME_FONT}>
              Free game · 18+
            </p>
            <h3 className="mt-2 text-3xl font-black tracking-tight" style={GAME_FONT}>
              Abuja Hustle
            </h3>
            <p className="mt-3 text-pretty text-[#f7edda]/90">
              A satirical life sim in a hand-painted Abuja. Grow up, build a career or a business, and chase financial freedom without ending up in Kuje.
            </p>
            <p className="mt-2 text-sm text-[#f7edda]/75">Sign in to save your progress.</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                to="/games/abuja-hustle"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#70d3ad] px-5 text-sm font-extrabold text-[#06251b] hover:bg-[#8be0bf] focus-visible:outline-[#f7edda]"
                style={GAME_FONT}
              >
                Play Abuja Hustle
              </Link>
              <Link to="/discover/abuja-hustle" className="inline-flex min-h-11 items-center text-sm text-[#f7edda] focus-visible:outline-[#f7edda]">
                <ArrowLink>About the game</ArrowLink>
              </Link>
            </div>
          </div>
        </article>

        {/* Outpost Zero: the game's slate and amber. */}
        <article className="flex flex-col overflow-hidden rounded-3xl bg-[#18212b] text-[#fff4dc] shadow-line">
          <img
            src={OUTPOST_ART.src}
            alt={OUTPOST_ART.alt}
            width={OUTPOST_ART.width}
            height={OUTPOST_ART.height}
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] w-full object-cover object-[62%_35%]"
          />
          <div className="flex flex-1 flex-col p-6 sm:p-7">
            <p className="text-xs font-bold tracking-[0.2em] text-[#ffc455] uppercase">Free game · Two modes</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight">Outpost Zero</h3>
            <p className="mt-3 text-pretty text-[#d9dbd9]">
              Fly medical supplies to the wounded while infiltrators sabotage the rescue, or fight it out in an eight-player last-one-standing. Play with bots or friends.
            </p>
            <p className="mt-2 text-sm text-[#c6c8c6]">Your first match needs no account. Coming soon to Steam, PC and Mac.</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                to="/games/outpost-zero"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ffc455] px-5 text-sm font-extrabold text-[#141a20] hover:bg-[#ffda85] focus-visible:outline-[#fff4dc]"
              >
                Play Outpost Zero
              </Link>
              <Link to="/discover/outpost-zero" className="inline-flex min-h-11 items-center text-sm text-[#fff4dc] focus-visible:outline-[#fff4dc]">
                <ArrowLink>About the game</ArrowLink>
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

/** The Outpost Zero key art, added with the Outpost Zero page. */
const OUTPOST_ART = {
  src: "/games/outpost-zero/key-art.webp",
  alt: "Outpost Zero key art: a masked fighter in red squares up to a horned brute on the outpost airfield at sunset",
  width: 1672,
  height: 941,
};
