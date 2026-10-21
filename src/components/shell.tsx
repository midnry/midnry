import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { APP_NAME } from "@/lib/catalog";
import { FREE_APPS } from "@/lib/plans";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { useRole } from "@/components/role";
import { cn } from "@/components/ui";
import { TagLink } from "@/components/desk-list";
import { TAGS } from "@/lib/sections";

type NavLink = { to: string; label: string };

function navClass(on: boolean) {
  return cn(
    "inline-flex min-h-11 items-center rounded-md px-1 text-sm",
    on ? "font-medium text-ink" : "text-muted hover:text-ink",
  );
}

/** Whether a nav link is the current page: /apps is on for /apps/<slug> and the browse pages too. */
function isOn(path: string, to: string): boolean {
  if (to === "/apps") return path.startsWith("/apps") || path.startsWith("/for/") || path === "/everyday" || path.startsWith("/sections/") || path.startsWith("/audiences/");
  return path === to || path.startsWith(`${to}/`);
}

/** The links in the header, for the signed-in person and their role. */
function useNavLinks() {
  const { user } = useCurrentUserState();
  const { isAdmin } = useRole();
  const main: NavLink[] = [
    { to: "/apps", label: "Apps" },
    { to: "/games", label: "Games" },
    { to: "/pricing", label: "Pricing" },
  ];
  const yours: NavLink[] = [];
  if (user) yours.push({ to: "/submit", label: "Add an app" }, { to: "/earnings", label: "Earnings" }, { to: "/billing", label: "Billing" });
  if (isAdmin) yours.push({ to: "/review", label: "Review" }, { to: "/stats", label: "Stats" }, { to: "/payouts", label: "Payouts" });
  return { main, yours };
}

/** On phones and tablets: one menu button that opens every page in a grouped list. */
function MobileMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUserState();
  const { main, yours } = useNavLinks();
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Close when the page changes.
  useEffect(() => setOpen(false), [path]);

  // While open: Escape closes and returns focus to the button, a tap outside closes,
  // and focus moves into the menu so keyboard users land on the first link.
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const tap = (e: PointerEvent) => {
      const el = e.target as Node;
      if (panel.current && !panel.current.contains(el) && !button.current?.contains(el)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", tap);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", tap);
    };
  }, [open]);

  const row = "flex min-h-12 items-center justify-between px-4 text-base active:bg-paper-2 focus-visible:-outline-offset-2";
  const group = "divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-line";
  const title = "px-4 pt-5 pb-2 text-xs font-medium tracking-wide text-muted uppercase";
  return (
    <>
      <button
        ref={button}
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-paper-2 active:bg-paper-2"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <div
        id="site-menu"
        ref={panel}
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-paper px-4 pt-3 pb-6 shadow-lg"
      >
        <nav aria-label="Menu">
          <ul className={group}>
            {main.map((l) => (
              <li key={l.to}>
                <Link to={l.to} aria-current={isOn(path, l.to) ? "page" : undefined} className={cn(row, isOn(path, l.to) && "font-semibold text-pine")}>
                  {l.label}
                  <span aria-hidden className="text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
          {yours.length ? (
            <>
              <p className={title}>Your account</p>
              <ul className={group}>
                {yours.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} aria-current={isOn(path, l.to) ? "page" : undefined} className={cn(row, isOn(path, l.to) && "font-semibold text-pine")}>
                      {l.label}
                      <span aria-hidden className="text-muted">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className={title}>Browse apps by who they’re for</p>
          <ul className={group}>
            {TAGS.map((tag) => (
              <li key={tag.id}>
                <TagLink tag={tag.id} className={row}>
                  {tag.label}
                  <span aria-hidden className="text-muted">›</span>
                </TagLink>
              </li>
            ))}
          </ul>
          {!user ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                to="/login"
                search={{ next: "/apps", intent: "register" }}
                className="flex min-h-12 items-center justify-center rounded-full bg-pine text-base font-medium text-paper active:opacity-80"
              >
                Create account
              </Link>
              <Link
                to="/login"
                search={{ next: "/apps", intent: "sign-in" }}
                className="flex min-h-12 items-center justify-center rounded-full bg-card text-base font-medium shadow-line active:bg-paper-2"
              >
                Sign in
              </Link>
            </div>
          ) : null}
        </nav>
      </div>
    </>
  );
}

const footerLink = "inline-flex min-h-11 items-center text-sm text-muted hover:text-ink";

function Footer() {
  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-5 py-12 sm:grid-cols-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 max-w-sm sm:col-span-3 md:col-span-1">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2.5">
            <img src="/logo.png" alt="" width={28} height={28} className="site-logo size-7" />
            <span className="font-display text-xl leading-none tracking-tight">{APP_NAME}</span>
          </Link>
          <p className="mt-2 text-sm text-pretty text-muted">
            Browser apps for school, work, business and home, plus free games. {FREE_APPS.length} apps are free with an account;
            Midnry Pass adds the rest for {PASS_PRICE_LABEL} a month.
          </p>
        </div>
        <nav aria-label="Explore">
          <p className="text-sm font-medium text-ink">Explore</p>
          <ul className="mt-2">
            <li>
              <Link to="/apps" className={footerLink}>Apps</Link>
            </li>
            <li>
              <Link to="/games" className={footerLink}>Games</Link>
            </li>
            <li>
              <Link to="/pricing" className={footerLink}>Pricing</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Midnry">
          <p className="text-sm font-medium text-ink">Midnry</p>
          <ul className="mt-2">
            <li>
              <Link to="/about" className={footerLink}>About</Link>
            </li>
            <li>
              <Link to="/contact" className={footerLink}>Contact</Link>
            </li>
            <li>
              <Link to="/submit" className={footerLink}>Add your app</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Trust and legal">
          <p className="text-sm font-medium text-ink">Trust</p>
          <ul className="mt-2">
            <li>
              <Link to="/security" className={footerLink}>Account security</Link>
            </li>
            <li>
              <Link to="/privacy" className={footerLink}>Privacy</Link>
            </li>
            <li>
              <Link to="/terms" className={footerLink}>Terms</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const { main, yours } = useNavLinks();
  const account = isPending ? (
    <span className="h-8 w-24 animate-pulse rounded-full bg-paper-2 motion-reduce:animate-none" />
  ) : user ? (
    <UserButton />
  ) : null;

  return (
    <div className="site-shell flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      {/* A slim, translucent bar that stays at the top. */}
      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-1.5 sm:px-5">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-md" aria-label={`${APP_NAME} home`}>
            <img src="/logo.png" alt="" width={36} height={36} className="site-logo size-8 sm:size-9" />
            <span className="font-display text-2xl leading-none tracking-tight">{APP_NAME}</span>
          </Link>
          {/* Larger screens: everything in one row. */}
          <div className="hidden items-center gap-x-6 lg:flex">
            <nav className="flex items-center gap-x-5" aria-label="Main">
              {[...main, ...yours].map((l) => (
                <Link key={l.to} to={l.to} aria-current={isOn(path, l.to) ? "page" : undefined} className={navClass(isOn(path, l.to))}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="inline-flex min-h-11 items-center">
              {account ?? (
                <span className="flex items-center gap-4">
                  <Link to="/login" search={{ next: "/apps", intent: "sign-in" }} className={navClass(path.startsWith("/login"))}>
                    Sign in
                  </Link>
                  <Link
                    to="/login"
                    search={{ next: "/apps", intent: "register" }}
                    className="inline-flex min-h-11 items-center rounded-full bg-pine px-4 text-sm font-medium text-paper hover:opacity-90 active:opacity-80"
                  >
                    Create account
                  </Link>
                </span>
              )}
            </div>
          </div>
          {/* Phones and tablets: the main action and a menu. */}
          <div className="flex items-center gap-1 lg:hidden">
            {account ?? (
              <Link
                to="/login"
                search={{ next: "/apps", intent: "register" }}
                className="inline-flex min-h-11 items-center rounded-full bg-pine px-4 text-sm font-medium text-paper active:opacity-80"
              >
                Create account
              </Link>
            )}
            <MobileMenu path={path} />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
