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
          "Grow up in Abuja without privilege. Walk the city, go into homes and offices, talk to people, take okadas and kekes, dodge QuickKash and chase financial freedom. Free to play on your phone or computer. 18+.",
      },
    ],
  }),
  component: GamePage,
});

const shot = (name: string) => `/shots/abuja-hustle/${name}.jpg`;

const FEATURES: { title: string; text: string; image: string; phone?: boolean; alt: string }[] = [
  {
    title: "Make someone who looks like you",
    text: "Pick your skin tone, hairstyle, outfit, shoes and accessories in a cartoon style. Change your look any time in the Wardrobe, and watch your character grow up at 18.",
    image: "creator",
    phone: true,
    alt: "The character creator with hair and outfit choices",
  },
  {
    title: "Grow up, chapter by chapter",
    text: "Primary school, secondary school, university and youth service. Walk to each moment of your story and make the choices that shape who you become.",
    image: "chapter",
    phone: true,
    alt: "A school chapter with a story speech bubble",
  },
  {
    title: "A whole city to walk around",
    text: "Gwarinpa, Wuse, the Central Business District, Jabi Lake and more. Office towers, traffic lights, danfos and kekes, and people going about their day.",
    image: "city",
    alt: "The open city of Abuja with roads, towers and traffic",
  },
  {
    title: "Go inside, from a one-room flat to a mansion",
    text: "Walk into homes, offices, the bank, the hospital and the mall. Lapo homes and middle-class flats each have their own bedroom and bathroom, down to the Peak milk on the stool.",
    image: "bedroom",
    alt: "A furnished bedroom inside a home",
  },
  {
    title: "Talk to the people of Abuja",
    text: "Mama, Tunde, Mrs. Okafor, the agbero at the motor park. Everyone has something to say, and some of them have offers you can take or refuse.",
    image: "chat",
    phone: true,
    alt: "A conversation shown in a speech bubble with the speaker's face",
  },
  {
    title: "Okada, keke, taxi or bus",
    text: "Fares go by distance. Okadas are fastest, taxis keep you calm, the bus is cheap but slow. Then ride along the roads to where you're going.",
    image: "ride",
    alt: "Choosing a ride and fare on the in-game phone",
    phone: true,
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
      <Link to="/games/abuja-hustle" className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-500 px-6 text-base font-semibold text-white hover:bg-emerald-400">
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

      <section className="mt-6 overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_top_left,#14407a,#07152b_70%)] p-6 text-white sm:p-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/abuja-hustle-192.png" alt="" className="size-14 rounded-2xl" />
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-widest text-sky-300 uppercase">Free game · 18+</span>
            </div>
            <h1 className="mt-5 font-display text-5xl tracking-tight text-balance sm:text-6xl">Abuja Hustle</h1>
            <p className="mt-4 max-w-xl text-xl text-pretty text-slate-200">
              Grow up in Abuja without privilege. Dodge QuickKash, outwork the Nepo Babies, and chase financial freedom.
            </p>
            <p className="mt-3 max-w-xl text-pretty text-slate-300">
              A satirical life sim you play in your browser, on your phone or computer. Sign in to save your progress.
            </p>
            <div className="mt-8">
              <PlayButtons />
            </div>
          </div>
          <BrowserFrame src={shot("city")} alt="Abuja Hustle: walking through the city" />
        </div>
      </section>

      <div className="mt-16 space-y-20">
        {FEATURES.map((f, i) => (
          <section key={f.title} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div>
              <p className="text-sm font-semibold tracking-widest text-pine uppercase">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight text-balance sm:text-4xl">{f.title}</h2>
              <p className="mt-3 max-w-lg text-lg text-pretty text-muted">{f.text}</p>
            </div>
            {f.phone ? <PhoneFrame src={shot(f.image)} alt={f.alt} /> : <BrowserFrame src={shot(f.image)} alt={f.alt} />}
          </section>
        ))}
      </div>

      <section className="mt-20 rounded-3xl bg-card p-6 shadow-line sm:p-8">
        <h2 className="font-display text-3xl tracking-tight">Your phone runs your life</h2>
        <ul className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["💼 Jobs", "Deliveries, hawking at Wuse Market, driving for Zoom and OwnPrice."],
            ["💸 QuickKash", "Loans when you're desperate. Read the terms. Felix won't."],
            ["📈 Trade", "Stocks, crypto and dollars, with all the risk that comes with them."],
            ["💗 Linkup", "Dates, relationships, weddings and everything in between."],
          ].map(([title, text]) => (
            <li key={title} className="rounded-2xl bg-paper p-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-pretty text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 flex flex-col gap-6 rounded-3xl bg-[radial-gradient(ellipse_at_top_left,#14407a,#07152b_70%)] p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="max-w-lg">
          <h2 className="font-display text-3xl tracking-tight">Your life in Abuja starts now</h2>
          <p className="mt-2 text-pretty text-slate-300">Free to play. For adults 18 and over: it deals with money, debt, crime and relationships.</p>
        </div>
        <PlayButtons />
      </section>
    </Shell>
  );
}
