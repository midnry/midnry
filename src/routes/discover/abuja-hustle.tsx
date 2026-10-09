import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { BrowserFrame, PhoneFrame } from "@/components/showcase";
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

/** The game's own look: dusk over Abuja, mint buttons, amber signposts, and its rounded font. */
const DUSK = "bg-[radial-gradient(ellipse_90%_45%_at_50%_100%,rgba(240,160,75,0.55),transparent_70%),linear-gradient(to_bottom,#0b0f2a_0%,#1d1a4f_34%,#43276a_60%,#86395f_84%,#c8604f_100%)]";
const GAME_FONT = { fontFamily: '"Nunito", "Outfit", system-ui, sans-serif' };
const STARS = "pointer-events-none absolute inset-0 bg-[radial-gradient(#f7edda_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.12] [mask-image:linear-gradient(to_bottom,black,transparent_55%)]";

/** Bump when the screenshots are retaken, so browsers and the CDN fetch the new ones. */
const SHOTS_VERSION = "2026-10-09";
const shot = (name: string) => `/shots/abuja-hustle/${name}.jpg?v=${SHOTS_VERSION}`;

const FEATURES: { title: string; text: string; image: string; phone?: boolean; alt: string; isNew?: boolean }[] = [
  {
    title: "Make someone who looks like you",
    text: "Pick your skin tone, hairstyle, outfit, shoes and accessories. Change your look any time in the Wardrobe, and watch your character grow up.",
    image: "creator",
    phone: true,
    alt: "The character creator with hair and outfit choices",
  },
  {
    title: "Grow up, chapter by chapter",
    text: "Primary school, secondary school, university and youth service. New classmates, crushes, prefect elections, interhouse sports, side hustles, and choices that can get you suspended or expelled.",
    image: "chapter",
    phone: true,
    alt: "Secondary school: a new classmate arrives in a black Prado",
  },
  {
    title: "A hand-painted Abuja to walk around",
    text: "Gwarinpa, Wuse, the Central Business District, Jabi Lake, Nyanya and more, with painted homes, towers, shops and landmarks, and room between them to wander.",
    image: "city",
    alt: "The painted city of Abuja with towers, homes and traffic",
    isNew: true,
  },
  {
    title: "Go inside, from a one-room flat to a banking hall",
    text: "Walk into homes, offices, the hospital and the mall. Decorate your own place, down to the Peak milk on the stool.",
    image: "bedroom",
    alt: "A furnished bedroom inside a Gwarinpa flat",
  },
  {
    title: "Talk to the people of Abuja",
    text: "Mama, Tunde, Mrs. Okafor, the agbero at the motor park. Everyone remembers how you treated them, and some of them have offers you can take or refuse.",
    image: "chat",
    phone: true,
    alt: "Talking to Mama POS at POS Junction, with choices to reply",
  },
  {
    title: "Build a banking career",
    text: "44 fictional banks, each with its own culture, perks and interview questions. Apply at Bankers' Row, pass the assessments, train, work the counter, and climb from graduate trainee towards the boardroom.",
    image: "bank",
    alt: "The banking hall at Bankers' Row with the teller counter and vacancy board",
    isNew: true,
  },
  {
    title: "Every bank has its own process",
    text: "Graduate programmes, internships, experienced and specialist hires, agency contracts, staff loans, interest-free Murabaha finance, reviews and promotion panels. An independent simulation: no bank is affiliated.",
    image: "careers",
    phone: true,
    alt: "The vacancy board on the in-game phone",
    isNew: true,
  },
  {
    title: "Ride through the city in third person",
    text: "Take an okada, a keke, a taxi or the bus and watch the real route from behind as your driver weaves through traffic. Or drive your own car, and watch out for FRSC.",
    image: "ride-view",
    alt: "Riding a taxi through Abuja seen from behind",
    isNew: true,
  },
  {
    title: "Pick your path to financial freedom",
    text: "A career, a business, trading, betting, going viral, hustling, connections or fast money. Missions point you to every opportunity in Abuja, with rewards at each step.",
    image: "missions",
    phone: true,
    alt: "The Missions app showing a trading path",
    isNew: true,
  },
  {
    title: "Make friends in high places",
    text: "Bump into the children of oil chiefs, judges and bankers at school or around town. Their favours open doors: referrals, lawyers, tips, and files that go quiet.",
    image: "nepo",
    phone: true,
    alt: "Meeting a nepo-baby friend",
    isNew: true,
  },
  {
    title: "Get caught, and face the court",
    text: "Hire Legal Aid, a private lawyer or a Senior Advocate. Try to settle the case (it's never guaranteed), plead, and hear the verdict.",
    image: "court",
    phone: true,
    alt: "The High Court screen with lawyers and pleas",
    isNew: true,
  },
  {
    title: "Serve your time, or go over the wall",
    text: "Life inside Kuje: work, study, chapel, the yard and visiting day. Good behaviour cuts your sentence. Or plan an escape past the floodlight, the fence and the dogs.",
    image: "prison",
    alt: "The cell block at Kuje Custodial Centre",
    isNew: true,
  },
  {
    title: "A phone that says who you are",
    text: "Start on a battered Kpakpa and work up to a Pear Pro Max or a folding phone. Each one looks different and lays out your apps its own way, and the flagships raise your reputation.",
    image: "phones",
    phone: true,
    alt: "A flagship phone home screen with a dock",
    isNew: true,
  },
  {
    title: "Abuja after dark",
    text: "Skip to night and the city changes: windows glow, street lamps light up, and the hustle keeps going.",
    image: "night",
    alt: "The city at night with lit windows and street lamps",
  },
];

function PlayButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link to="/games/abuja-hustle" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#70d3ad] px-6 text-base font-extrabold text-[#06251b] shadow-[0_8px_24px_-8px_rgba(112,211,173,0.7)] hover:bg-[#8be0bf]" style={GAME_FONT}>
        Play free now
      </Link>
      <Link to="/apps" className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-base font-bold text-[#f7edda] ring-1 ring-[#f7edda]/40 hover:bg-white/10" style={GAME_FONT}>
        See the apps
      </Link>
    </div>
  );
}

function GamePage() {
  return (
    <Shell>
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink">
          Home
        </Link>
        <span aria-hidden> / </span>
        <span>Abuja Hustle</span>
      </nav>

      <section className={`relative mt-6 overflow-hidden rounded-[2rem] ${DUSK} p-6 text-[#f7edda] sm:p-10`}>
        <div className={STARS} aria-hidden />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/abuja-hustle-192.png" alt="" className="size-14 rounded-2xl" />
              <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-extrabold tracking-widest text-[#edc584] uppercase ring-1 ring-[#edc584]/30" style={GAME_FONT}>Free game · 18+</span>
            </div>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-balance drop-shadow-[0_2px_12px_rgba(10,13,36,0.6)] sm:text-6xl" style={GAME_FONT}>Abuja Hustle</h1>
            <p className="mt-4 max-w-xl text-xl text-pretty text-[#f7edda]">
              Grow up in Abuja, from primary school to adult life. Build a career, a business or a following, make friends in high places, and chase financial freedom without ending up in Kuje.
            </p>
            <p className="mt-3 max-w-xl text-pretty text-[#f7edda]/80">
              A satirical life sim you play in your browser, on your phone or computer. Sign in to save your progress.
            </p>
            <div className="mt-8">
              <PlayButtons />
            </div>
          </div>
          <div className="relative flex justify-center pt-2 pb-4">
            {/* Warm light behind her, and her shadow on the ground. */}
            <div className="absolute top-1/2 left-1/2 size-[19rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(240,160,75,0.45),rgba(194,86,106,0.18)_45%,transparent_70%)] sm:size-[26rem]" aria-hidden />
            <div className="absolute bottom-3 left-1/2 h-5 w-36 -translate-x-1/2 rounded-[50%] bg-black/35 blur-md sm:w-44" aria-hidden />
            <img src={`/shots/abuja-hustle/hero-girl.png?v=${SHOTS_VERSION}`} alt="An Abuja Hustle character: a smiling young woman in a pink hoodie and white wide-leg trousers" className="relative h-72 w-auto drop-shadow-[0_12px_24px_rgba(10,13,36,0.45)] sm:h-[26rem]" />
          </div>
        </div>
      </section>

      <div className="mt-16 space-y-20">
        {FEATURES.map((f, i) => (
          <section key={f.title} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div>
              <p className="flex items-center gap-2 text-sm font-extrabold tracking-widest text-[#a45a12] uppercase" style={GAME_FONT}>
                <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-lg bg-[#1a1745] px-2 text-[#edc584] shadow-sm">{String(i + 1).padStart(2, "0")}</span>
                {f.isNew ? <span className="rounded-full bg-[#70d3ad]/25 px-2.5 py-0.5 text-[11px] tracking-normal text-[#0f5c44] normal-case">New</span> : null}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-balance text-[#1a1745] sm:text-4xl" style={GAME_FONT}>{f.title}</h2>
              <p className="mt-3 max-w-lg text-lg text-pretty text-muted">{f.text}</p>
            </div>
            {f.phone ? <PhoneFrame src={shot(f.image)} alt={f.alt} dark /> : <BrowserFrame src={shot(f.image)} alt={f.alt} />}
          </section>
        ))}
      </div>

      <section className="mt-20 rounded-3xl bg-[linear-gradient(160deg,#0b1c2b,#050b14)] p-6 text-[#f7edda] sm:p-8">
        <h2 className="text-3xl font-black tracking-tight" style={GAME_FONT}>Your phone runs your life</h2>
        <ul className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["🎯 Missions", "Your path to financial freedom, one step at a time."],
            ["🏦 Bank Careers", "Vacancies from 44 fictional banks, applications and your career."],
            ["📈 Trade", "Stocks, crypto and dollars, with all the risk that comes with them."],
            ["⚽ OddsNaija", "Fictional football, real odds. Set a limit: the bookie usually wins."],
            ["📸 Instaflex", "Followers, trolls, brand deals, and the temptation to buy likes."],
            ["💎 Connects", "Your nepo friends, hangouts and the favours they can do."],
            ["⚖️ Legal", "The evidence against you: destroy it, or lay low and keep the perks."],
            ["💸 QuickKash", "Loans when you're desperate. Read the terms. Felix won't."],
          ].map(([title, text]) => (
            <li key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="font-extrabold text-[#edc584]" style={GAME_FONT}>{title}</p>
              <p className="mt-1 text-pretty text-[#a0b6bd]">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={`relative mt-16 flex flex-col gap-6 overflow-hidden rounded-3xl ${DUSK} p-8 text-[#f7edda] sm:flex-row sm:items-center sm:justify-between sm:p-10`}>
        <div className={STARS} aria-hidden />
        <div className="relative max-w-lg">
          <h2 className="text-3xl font-black tracking-tight" style={GAME_FONT}>Your life in Abuja starts now</h2>
          <p className="mt-2 text-pretty text-[#f7edda]/85">Free to play. For adults 18 and over: it deals with money, debt, crime and relationships.</p>
        </div>
        <div className="relative">
          <PlayButtons />
        </div>
      </section>
    </Shell>
  );
}
