import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { APPS, getApp, type AppDef } from "@/lib/catalog";
import { KITS } from "@/lib/kits";
import { sectionOf } from "@/lib/sections";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { FREE_LABEL, PASS_FEATURES, PASS_LABEL } from "@/lib/plans";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppMark } from "@/components/app-mark";
import { pitchFor } from "@/lib/pitches";
import { buttonClass, cn } from "@/components/ui";
import { AppDemo, hasDemo } from "@/components/demos/product-demo";
import { AccessBadge } from "@/components/home-start";
import { ArrowLink } from "@/components/home-section";

/** A screenshot inside a simple laptop-browser frame. */
export function BrowserFrame({ src, alt, width = 1280, height = 800 }: { src: string; alt: string; width?: number; height?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_20px_60px_-25px_rgba(16,32,51,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-line bg-paper-2 px-4 py-2.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-[#f87171]" />
        <span className="size-2.5 rounded-full bg-[#fbbf24]" />
        <span className="size-2.5 rounded-full bg-[#34d399]" />
        <span className="ml-3 h-5 flex-1 rounded-full bg-card" />
      </div>
      <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="block h-auto w-full" />
    </div>
  );
}

/**
 * A flat status bar drawn on one grid (390 × 54, like a phone's own points), so the
 * time, the camera cut-out and the icons all sit on the same centre line.
 */
function StatusBar({ className }: { className: string }) {
  const mid = 29; // the shared centre line
  return (
    <svg viewBox="0 0 390 54" className={`block w-full ${className}`} aria-hidden>
      {/* Time, centred in the left section. */}
      <text x="72" y={mid} textAnchor="middle" dominantBaseline="central" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif" fontSize="17" fontWeight="600">
        9:41
      </text>
      {/* Camera cut-out, centred, with a lens on the right. */}
      <rect x="133" y={mid - 18} width="124" height="36" rx="18" fill="#050608" />
      <circle cx="238" cy={mid} r="6" fill="#121a3a" />
      <circle cx="238" cy={mid} r="3" fill="#2b3d8f" />
      {/* Signal, Wi-Fi and battery, centred in the right section and evenly spaced. */}
      <g fill="currentColor">
        <rect x="288" y={mid + 1.5} width="3.2" height="4" rx="1" />
        <rect x="292.8" y={mid - 0.5} width="3.2" height="6" rx="1" />
        <rect x="297.6" y={mid - 2.8} width="3.2" height="8.3" rx="1" />
        <rect x="302.4" y={mid - 5.5} width="3.2" height="11" rx="1" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
        <path d={`M313 ${mid - 2} a 10 10 0 0 1 14 0`} />
        <path d={`M316 ${mid + 1.2} a 5.8 5.8 0 0 1 8 0`} />
      </g>
      <circle cx="320" cy={mid + 4.2} r="1.6" fill="currentColor" />
      <rect x="335" y={mid - 6} width="24" height="12" rx="3.6" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      <rect x="337" y={mid - 4} width="20" height="8" rx="2" fill="currentColor" />
      <path d={`M360.6 ${mid - 2} a 2 2 0 0 1 0 4 Z`} fill="currentColor" opacity="0.45" />
    </svg>
  );
}

/** A screenshot in a modern phone: thin titanium frame, slim black bezel, and a status bar that keeps the app clear of the camera cut-out. */
export function PhoneFrame({
  src,
  alt,
  className = "",
  eager = false,
  dark = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  /** The screenshot has a dark top (the game): use a dark status bar to match. */
  dark?: boolean;
}) {
  const ink = dark ? "text-white" : "text-[#0b0d12]";
  return (
    <div className={`relative mx-auto w-[min(16.5rem,70vw)] ${className}`}>
      {/* Side buttons: action and volume on the left, power on the right. */}
      <span className="absolute top-[18%] -left-[3px] h-[5%] w-[3px] rounded-l-sm bg-[#5b6577]" aria-hidden />
      <span className="absolute top-[26%] -left-[3px] h-[9%] w-[3px] rounded-l-sm bg-[#5b6577]" aria-hidden />
      <span className="absolute top-[37%] -left-[3px] h-[9%] w-[3px] rounded-l-sm bg-[#5b6577]" aria-hidden />
      <span className="absolute top-[30%] -right-[3px] h-[13%] w-[3px] rounded-r-sm bg-[#5b6577]" aria-hidden />
      {/* Titanium frame. */}
      <div className="rounded-[2.9rem] bg-gradient-to-b from-[#6b7487] via-[#3f4757] to-[#59627a] p-[3px] shadow-[0_30px_60px_-24px_rgba(16,32,51,0.5),0_10px_20px_-10px_rgba(16,32,51,0.25)]">
        {/* Black bezel. */}
        <div className="rounded-[2.75rem] bg-[#0b0d12] p-[7px]">
          <div className={`overflow-hidden rounded-[2.3rem] ${dark ? "bg-[#0b1a33]" : "bg-[#f4f7fb]"}`}>
            {/* Status bar: the camera sits here, so the app below never touches it. */}
            <StatusBar className={ink} />
            <img
              src={src}
              alt={alt}
              width={780}
              height={1560}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="block aspect-[1/2] h-auto w-full rounded-b-[2.3rem] object-cover object-top"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * What each product page says. Everything here is taken from the catalogue
 * (features, guide), the kits' own notes, or the app code it names.
 * ------------------------------------------------------------------------- */

type Capability = { title: string; text?: string };

/** Three capabilities, in the words of a person using the app. Other apps use their first three features. */
const CAPABILITIES: Record<string, Capability[]> = {
  tasks: [
    { title: "Type it naturally", text: "“Call mum tomorrow 6pm @home” sets the date, the time and the label for you." },
    { title: "Repeats that fit real life", text: "Every Tuesday, every weekday, every 2 weeks, or every 15th of the month." },
    { title: "Stay on top of it", text: "Projects, sub-tasks, priorities and saved filters, with streaks and Midnry Points for what you finish." },
  ],
  invoice: [
    { title: "Who it is from and who it is for", text: "Your details and your client's, at the top of a clean page." },
    { title: "Line items and tax, added up", text: "Quantities, rates and a tax percent. Subtotal, tax and total are worked out for you, in naira or eight other currencies." },
    { title: "Ready to send", text: "Print it, or save it as a PDF to send by email or WhatsApp. Then start the next invoice with the number moved on." },
  ],
  ledger: [
    { title: "Log an expense in seconds", text: "An amount, a short description, a category and the date." },
    { title: "See where the month went", text: "The month's total, a bar for each category, and how much of your budget is left if you set one." },
    { title: "Keep the record", text: "The log stays with your account, and you can export it as a CSV file." },
  ],
  cycle: [
    { title: "Know what is coming", text: "The date your next period should start, and how many days away it is." },
    { title: "Log each period", text: "The first and last day. Once two periods are logged, Cycle uses your own average." },
    { title: "A note for each period", text: "Like a notes app. Edit or delete a note, or a whole period, at any time." },
  ],
};

/** Tools that go well together. Other apps show three from the same section. */
const RELATED: Record<string, string[]> = {
  tasks: ["habits", "board", "pulse"],
  invoice: ["quote", "proposal", "ledger"],
  ledger: ["budget", "split", "pocket"],
  cycle: ["symptom-log", "meds", "visits"],
  apply: ["cold-email", "letters", "tasks"],
};

/** Apps that keep your work on your account (they save through useAppDoc or Remind's own store). */
const SAVES = new Set(["tasks", "invoice", "ledger", "cycle", "apply", "board", "contrast", "glyph", "habits", "planner", "pulse", "scratch", "split"]);
const SAVING_KITS = new Set(["template", "tracker", "write", "mood"]);

function savesToAccount(slug: string): boolean {
  if (SAVES.has(slug)) return true;
  const kit = KITS.find((item) => item.slug === slug);
  return Boolean(kit && SAVING_KITS.has(kit.kind));
}

/** Notes a person should read before relying on the app. */
function notesFor(app: AppDef): string[] {
  const notes: string[] = [];
  if (app.slug === "cycle") notes.push("Your periods and notes are saved on your account. Dates are estimates, not medical advice, and not a form of birth control.");
  if (app.slug === "compressor") notes.push("The video is re-encoded on this device. It is not uploaded.");
  const kit = KITS.find((item) => item.slug === app.slug);
  if (kit?.note) notes.push(kit.note);
  return notes;
}

function relatedTo(app: AppDef): AppDef[] {
  const curated = (RELATED[app.slug] ?? []).map((slug) => getApp(slug)).filter((item): item is AppDef => Boolean(item));
  if (curated.length >= 3) return curated.slice(0, 3);
  const section = sectionOf(app.genre) ?? app.genre;
  const same = APPS.filter((a) => a.slug !== app.slug && !curated.includes(a) && (sectionOf(a.genre) ?? a.genre) === section);
  const everyday = ["tasks", "invoice", "cycle"].map((slug) => getApp(slug)).filter((a): a is AppDef => Boolean(a) && a!.slug !== app.slug);
  const out: AppDef[] = [];
  for (const candidate of [...curated, ...same, ...everyday]) if (!out.includes(candidate) && out.length < 3) out.push(candidate);
  return out;
}

/* ------------------------------------------------------------------------- */

/** The one next step: sign up and land in the app, or open it when signed in. */
function NextAction({ app, onDark = false }: { app: AppDef; onDark?: boolean }) {
  const { user } = useCurrentUserState();
  const primary = onDark
    ? cn(buttonClass(), "min-h-12 bg-white px-6 text-base text-[#0b1f3d] hover:bg-white/90 hover:opacity-100 focus-visible:outline-white")
    : cn(buttonClass({ tone: "primary" }), "min-h-12 px-6 text-base");
  if (user) {
    return (
      <Link to="/apps/$slug" params={{ slug: app.slug }} className={primary}>
        Open {app.name}
      </Link>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <Link to="/login" search={{ next: `/apps/${app.slug}`, intent: "register" }} className={primary}>
        {app.tier === "free" ? `Try ${app.name} free` : `Get started with ${app.name}`}
      </Link>
      <Link
        to="/login"
        search={{ next: `/apps/${app.slug}`, intent: "sign-in" }}
        className={cn("inline-flex min-h-11 items-center text-sm underline underline-offset-4", onDark ? "text-white/85 hover:text-white focus-visible:outline-white" : "text-muted hover:text-ink")}
      >
        I have an account
      </Link>
    </div>
  );
}

function PageSection({ id, eyebrow, title, children, className }: { id: string; eyebrow: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-20 sm:mt-28", className)} aria-labelledby={id}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-3 font-display text-title text-balance">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/** The product page for one app: benefit, a readable preview, three capabilities, how it works, what you need, one action, related tools. */
export function AppShowcase({ app }: { app: AppDef }) {
  const shot = (view: "desktop" | "phone") => `/shots/${app.slug}/${view}.jpg`;
  const capabilities = CAPABILITIES[app.slug] ?? app.features.slice(0, 3).map((title) => ({ title }));
  const steps = app.guide.slice(0, 3);
  const notes = notesFor(app);
  const related = relatedTo(app);
  const saves = savesToAccount(app.slug);
  const passExtra = PASS_FEATURES[app.slug];
  const demo = hasDemo(app.slug);

  return (
    <div>
      <nav className="flex items-center text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/" className="-ml-1 inline-flex min-h-11 items-center px-1 hover:text-ink">
          Home
        </Link>
        <span aria-hidden className="px-1">
          /
        </span>
        <Link to="/apps" className="inline-flex min-h-11 items-center px-1 hover:text-ink">
          Apps
        </Link>
        <span aria-hidden className="px-1">
          /
        </span>
        <span className="px-1" aria-current="page">
          {app.name}
        </span>
      </nav>

      {/* Hero: what it does for you, and the one next step. */}
      <div className="mt-6 grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <div className="flex items-center gap-3">
            <AppMark slug={app.slug} name={app.name} className="size-14" />
            <AccessBadge tier={app.tier} />
          </div>
          <h1 className="mt-6 font-display text-hero text-balance">{app.name}</h1>
          <p className="mt-5 max-w-xl text-lede text-pretty text-ink-soft">{pitchFor(app)}</p>
          <div className="mt-8">
            <NextAction app={app} />
          </div>
          <p className="mt-4 text-sm text-muted">Works in your browser, on your phone and your computer. Nothing to install.</p>
        </div>
        <PhoneFrame src={shot("phone")} alt={`${app.name} on a phone, with example data`} eager />
      </div>

      {/* The result: a hands-on sample where there is one, otherwise a real screenshot. */}
      {demo ? (
        <PageSection id="try-heading" eyebrow="Try it" title={app.slug === "invoice" ? "Fill in the lines, get the finished invoice" : `See what ${app.name} does`}>
          <AppDemo slug={app.slug} />
        </PageSection>
      ) : (
        <PageSection id="see-heading" eyebrow="See it" title={`${app.name} on a computer`} className="hidden sm:block">
          <BrowserFrame src={shot("desktop")} alt={`A screenshot of ${app.name} on a computer, with example data`} />
          <p className="mt-3 text-sm text-muted">A screenshot with example data.</p>
        </PageSection>
      )}

      <PageSection id="can-heading" eyebrow="What you can do" title={`What ${app.name} does for you`}>
        <ul className="grid gap-4 md:grid-cols-3">
          {capabilities.map((cap, index) => (
            <li key={cap.title} className="rounded-3xl bg-card p-6 shadow-line">
              <span className="grid size-9 place-items-center rounded-full bg-pine/10 text-sm font-semibold text-pine" aria-hidden>
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-medium text-pretty">{cap.title}</h3>
              {cap.text ? <p className="mt-2 text-pretty text-muted">{cap.text}</p> : null}
            </li>
          ))}
        </ul>
      </PageSection>

      {steps.length ? (
        <PageSection id="how-heading" eyebrow="How it works" title={`${steps.length === 3 ? "Three" : steps.length === 2 ? "Two" : "One"} ${steps.length === 1 ? "step" : "steps"}`}>
          <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <li key={step} className="border-t-2 border-pine pt-4">
                <p className="text-sm font-semibold text-pine">Step {index + 1}</p>
                <p className="mt-2 text-pretty">{step}</p>
              </li>
            ))}
          </ol>
        </PageSection>
      ) : null}

      {/* What you need, why, and the action. */}
      <section
        className="mt-20 overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_top_left,#2b5fe6,#0b1f3d_72%)] p-6 text-white sm:mt-28 sm:p-10 lg:p-12"
        aria-labelledby="need-heading"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <div>
            <p className="text-sm font-medium tracking-[0.12em] text-white/75 uppercase">What you need</p>
            <h2 id="need-heading" className="mt-3 font-display text-title text-balance">
              {app.tier === "free" ? FREE_LABEL : PASS_LABEL}
            </h2>
            <p className="mt-4 max-w-xl text-lede text-pretty text-white/85">
              {app.tier === "free"
                ? `Create a Midnry account with your email and ${app.name} is yours. No card needed.`
                : `${app.name} is part of Midnry Pass, ${PASS_PRICE_LABEL} a month, charged to a card through Paystack. Cancel any time and keep access until the end of the month you paid for.`}
            </p>
            <dl className="mt-6 max-w-xl space-y-4 text-sm text-white/80">
              <div>
                <dt className="font-semibold text-white">Why an account</dt>
                <dd className="mt-1 text-pretty">
                  {saves
                    ? `What you add is saved to your Midnry account, so it is there next time, on your phone or your computer.`
                    : app.tier === "free"
                      ? "Free apps open when you are signed in to a Midnry account."
                      : "Pass apps open when you are signed in with Midnry Pass."}
                </dd>
              </div>
              {passExtra ? (
                <div>
                  <dt className="font-semibold text-white">With Midnry Pass</dt>
                  <dd className="mt-1 text-pretty">
                    {passExtra[0].toUpperCase()}
                    {passExtra.slice(1)}, for {PASS_PRICE_LABEL} a month.
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="lg:justify-self-end">
            <NextAction app={app} onDark />
          </div>
        </div>
      </section>

      {notes.length ? (
        <aside className="mt-6 rounded-3xl border border-line p-5 text-sm text-pretty text-muted sm:p-6" aria-label="Good to know">
          <p className="font-medium text-ink">Good to know</p>
          <ul className="mt-2 space-y-1">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </aside>
      ) : null}

      {related.length ? (
        <PageSection id="related-heading" eyebrow="Related" title="Goes well with">
          <ul className="grid gap-4 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  to="/discover/$slug"
                  params={{ slug: r.slug }}
                  className="group flex h-full flex-col rounded-3xl bg-card p-5 shadow-line motion-safe:transition-[transform,box-shadow] motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <AppMark slug={r.slug} name={r.name} className="size-11" />
                    <div className="min-w-0">
                      <h3 className="font-display text-heading">{r.name}</h3>
                      <AccessBadge tier={r.tier} className="mt-0.5" />
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-pretty text-muted">{pitchFor(r)}</p>
                  <ArrowLink className="mt-4 text-sm text-pine">Learn more</ArrowLink>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/apps" className="mt-6 inline-flex min-h-11 items-center text-sm text-ink">
            <ArrowLink>Explore all {APPS.length} apps</ArrowLink>
          </Link>
        </PageSection>
      ) : null}
    </div>
  );
}
