import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { APPS, type AppDef } from "@/lib/catalog";
import { genreLabel, sectionOf } from "@/lib/sections";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppMark } from "@/components/app-mark";
import { pitchFor } from "@/lib/pitches";
import { buttonClass } from "@/components/ui";

/** A screenshot inside a simple laptop-browser frame. */
export function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_20px_60px_-25px_rgba(16,32,51,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-line bg-paper-2 px-4 py-2.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-[#f87171]" />
        <span className="size-2.5 rounded-full bg-[#fbbf24]" />
        <span className="size-2.5 rounded-full bg-[#34d399]" />
        <span className="ml-3 h-5 flex-1 rounded-full bg-card" />
      </div>
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
    </div>
  );
}

/** A screenshot inside a phone frame. */
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
            <div className={`relative flex h-10 items-center justify-between px-6 text-[11px] font-semibold ${ink}`} aria-hidden>
              <span className="tabular-nums">9:41</span>
              <span className="absolute top-2 left-1/2 h-[1.3rem] w-[27%] -translate-x-1/2 rounded-full bg-[#0b0d12]">
                <span className="absolute top-1/2 right-[9%] aspect-square h-[46%] -translate-y-1/2 rounded-full bg-[#1b2333] ring-1 ring-[#2a3448]" />
              </span>
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 18 12" className="h-2.5 w-auto fill-current">
                  <rect x="0" y="8" width="3" height="4" rx="0.8" />
                  <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
                  <rect x="10" y="3" width="3" height="9" rx="0.8" />
                  <rect x="15" y="0" width="3" height="12" rx="0.8" />
                </svg>
                <svg viewBox="0 0 16 12" className="h-2.5 w-auto fill-current">
                  <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0L8 11.5Zm-4.2-4.3L2.2 5.6a8.2 8.2 0 0 1 11.6 0l-1.6 1.6a5.9 5.9 0 0 0-8.4 0ZM.6 4 0 3.4a11.3 11.3 0 0 1 16 0l-.6.6-1 1a9.9 9.9 0 0 0-12.8 0Z" />
                </svg>
                <span className="relative ml-0.5 flex h-2.5 w-5 items-center rounded-[3px] border border-current p-[1.5px] opacity-90">
                  <span className="h-full w-[78%] rounded-[1.5px] bg-current" />
                  <span className="absolute top-1/2 -right-[3px] h-1 w-[2px] -translate-y-1/2 rounded-r-sm bg-current" />
                </span>
              </span>
            </div>
            <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} className="block aspect-[1/2] w-full rounded-b-[2.3rem] object-cover object-top" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-pine" aria-hidden>
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.12" />
      <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The main and secondary call to action for an app, depending on whether you're signed in. */
function OpenButtons({ app }: { app: AppDef }) {
  const { user } = useCurrentUserState();
  if (user) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to="/apps/$slug" params={{ slug: app.slug }} className={buttonClass({ tone: "primary" })}>
          Open {app.name}
        </Link>
        <Link to="/apps" className={buttonClass({ tone: "quiet" })}>
          See all apps
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link to="/login" search={{ next: `/apps/${app.slug}`, intent: "register" }} className={buttonClass({ tone: "primary" })}>
        {app.tier === "free" ? `Try ${app.name} free` : `Get started`}
      </Link>
      <Link to="/login" search={{ next: `/apps/${app.slug}`, intent: "sign-in" }} className={buttonClass({ tone: "quiet" })}>
        I have an account
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="font-display text-3xl tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** The advertising page for one app: what it is, real screenshots, features, steps, and related apps. */
export function AppShowcase({ app }: { app: AppDef }) {
  const section = sectionOf(app.genre) ?? app.genre;
  const related = APPS.filter((a) => a.slug !== app.slug && (sectionOf(a.genre) ?? a.genre) === section).slice(0, 3);
  const shot = (view: "desktop" | "phone") => `/shots/${app.slug}/${view}.jpg`;
  return (
    <div>
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink">
          Home
        </Link>
        <span aria-hidden> / </span>
        <Link to="/apps" className="hover:text-ink">
          Apps
        </Link>
        <span aria-hidden> / </span>
        <span>{app.name}</span>
      </nav>

      {/* Hero */}
      <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-center gap-3">
            <AppMark slug={app.slug} name={app.name} className="size-14" />
            <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-semibold text-muted">{genreLabel(section)}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${app.tier === "free" ? "bg-[#dcfce7] text-[#166534]" : "bg-[#dbeafe] text-[#1e40af]"}`}>
              {app.tier === "free" ? "Free with an account" : `Midnry Pass · ${PASS_PRICE_LABEL}`}
            </span>
          </div>
          <h1 className="mt-5 font-display text-5xl tracking-tight text-balance sm:text-6xl">{app.name}</h1>
          <p className="mt-4 max-w-xl text-xl text-pretty text-ink-soft">{pitchFor(app)}</p>
          <div className="mt-8">
            <OpenButtons app={app} />
          </div>
          <p className="mt-3 text-sm text-muted">Works on your phone and your computer. Nothing to install.</p>
        </div>
        <PhoneFrame src={shot("phone")} alt={`${app.name} on a phone`} eager />
      </div>

      {/* The big screenshot */}
      <section className="mt-16">
        <p className="mb-4 text-sm font-semibold tracking-widest text-pine uppercase">See it in action</p>
        <BrowserFrame src={shot("desktop")} alt={`${app.name} on a computer, with example data`} />
      </section>

      {app.features.length ? (
        <Section title="What you can do">
          <ul className="grid gap-4 sm:grid-cols-2">
            {app.features.map((feature) => (
              <li key={feature} className="flex gap-3 rounded-2xl bg-card p-4 shadow-line">
                <Tick />
                <span className="text-pretty">{feature}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {app.guide.length ? (
        <Section title="How it works">
          <ol className="grid gap-4 md:grid-cols-2">
            {app.guide.map((step, i) => (
              <li key={step} className="flex gap-4 rounded-2xl border border-line p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pine font-semibold text-paper">{i + 1}</span>
                <span className="pt-1.5 text-pretty">{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {/* Closing call to action */}
      <section className="mt-16 flex flex-col gap-6 rounded-3xl bg-[radial-gradient(ellipse_at_top_left,#1d4ed8,#0b1f3d_75%)] p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="max-w-lg">
          <h2 className="font-display text-3xl tracking-tight">Ready to try {app.name}?</h2>
          <p className="mt-2 text-pretty text-white/80">
            {app.tier === "free" ? "It's free with a Midnry account. Sign up with your email or Google, no card needed." : `Part of Midnry Pass, ${PASS_PRICE_LABEL} a month. Every app on Midnry, one price.`}
          </p>
        </div>
        <div className="[&_a]:bg-white [&_a]:text-[#0b1f3d] [&_a+a]:bg-transparent [&_a+a]:text-white [&_a+a]:ring-1 [&_a+a]:ring-white/40">
          <OpenButtons app={app} />
        </div>
      </section>

      {related.length ? (
        <Section title={`More for ${genreLabel(section).toLowerCase()}`}>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} to="/discover/$slug" params={{ slug: r.slug }} className="group rounded-3xl bg-card p-5 shadow-line transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <AppMark slug={r.slug} name={r.name} className="size-11" />
                  <p className="font-display text-xl tracking-tight">{r.name}</p>
                </div>
                <p className="mt-3 text-sm text-pretty text-muted">{pitchFor(r)}</p>
                <span className="mt-3 inline-block text-sm font-semibold">Learn more →</span>
              </Link>
            ))}
          </div>
          <Link to="/apps" className="mt-6 inline-block text-sm font-medium underline underline-offset-4">
            Explore all {APPS.length} apps
          </Link>
        </Section>
      ) : null}
    </div>
  );
}
