import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { BrowserFrame, PhoneFrame } from "@/components/showcase";

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
      <Link to="/games/abuja-hustle" className="inline-flex min-h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-base font-semibold text-white hover:bg-blue-500">
        Play free now
      </Link>
      <Link to="/apps" className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-base font-semibold text-white ring-1 ring-white/40 hover:bg-white/10">
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

      <section className="mt-6 overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_top_left,#11265c,#05070c_70%)] p-6 text-white sm:p-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/abuja-hustle-192.png" alt="" className="size-14 rounded-2xl" />
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-widest text-sky-300 uppercase">Free game · 18+</span>
            </div>
            <h1 className="mt-5 font-display text-5xl tracking-tight text-balance sm:text-6xl">Abuja Hustle</h1>
            <p className="mt-4 max-w-xl text-xl text-pretty text-slate-200">
              Grow up in Abuja, from primary school to adult life. Build a career, a business or a following, make friends in high places, and chase financial freedom without ending up in Kuje.
            </p>
            <p className="mt-3 max-w-xl text-pretty text-slate-300">
              A satirical life sim you play in your browser, on your phone or computer. Sign in to save your progress.
            </p>
            <div className="mt-8">
              <PlayButtons />
            </div>
          </div>
          <BrowserFrame src={shot("ride-view")} alt="Abuja Hustle: riding a taxi through Abuja" />
        </div>
      </section>

      <div className="mt-16 space-y-20">
        {FEATURES.map((f, i) => (
          <section key={f.title} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div>
              <p className="text-sm font-semibold tracking-widest text-pine uppercase">
                {String(i + 1).padStart(2, "0")}
                {f.isNew ? <span className="ml-2 rounded-full bg-pine/10 px-2 py-0.5 text-[11px] tracking-normal normal-case">New</span> : null}
              </p>
              <h2 className="mt-2 font-display text-3xl tracking-tight text-balance sm:text-4xl">{f.title}</h2>
              <p className="mt-3 max-w-lg text-lg text-pretty text-muted">{f.text}</p>
            </div>
            {f.phone ? <PhoneFrame src={shot(f.image)} alt={f.alt} dark /> : <BrowserFrame src={shot(f.image)} alt={f.alt} />}
          </section>
        ))}
      </div>

      <section className="mt-20 rounded-3xl bg-card p-6 shadow-line sm:p-8">
        <h2 className="font-display text-3xl tracking-tight">Your phone runs your life</h2>
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
            <li key={title} className="rounded-2xl bg-paper p-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-pretty text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 flex flex-col gap-6 rounded-3xl bg-[radial-gradient(ellipse_at_top_left,#11265c,#05070c_70%)] p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="max-w-lg">
          <h2 className="font-display text-3xl tracking-tight">Your life in Abuja starts now</h2>
          <p className="mt-2 text-pretty text-slate-300">Free to play. For adults 18 and over: it deals with money, debt, crime and relationships.</p>
        </div>
        <PlayButtons />
      </section>
    </Shell>
  );
}
