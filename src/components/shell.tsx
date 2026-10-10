import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { APP_NAME } from "@/lib/catalog";
import { useRole } from "@/components/role";
import { cn } from "@/components/ui";
import { TagLink } from "@/components/desk-list";
import { TAGS } from "@/lib/sections";

function BrowseMenu({ active }: { active: boolean }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (menu.current) menu.current.open = false;
  };
  return (
    <details ref={menu} className="group relative">
      <summary className={cn(navClass(active), "cursor-pointer list-none gap-1 [&::-webkit-details-marker]:hidden")}>
        Browse
        <svg aria-hidden viewBox="0 0 20 20" className="size-4 transition-transform group-open:rotate-180" fill="none">
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="absolute left-0 z-20 mt-1 w-56 rounded-2xl bg-card p-2 shadow-line">
        <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">By audience</p>
        {TAGS.map((tag) => (
          <TagLink
            key={tag.id}
            tag={tag.id}
            onClick={close}
            className="flex min-h-11 items-center rounded-xl px-3 text-sm hover:bg-paper"
          >
            {tag.label}
          </TagLink>
        ))}
        <div className="my-1 h-px bg-line" />
        <Link to="/apps" onClick={close} className="flex min-h-11 items-center rounded-xl px-3 text-sm text-muted hover:bg-paper">
          Browse by subject
        </Link>
      </div>
    </details>
  );
}

function navClass(on: boolean) {
  return cn(
    "inline-flex min-h-11 items-center text-sm",
    on ? "font-medium text-ink" : "text-muted hover:text-ink",
  );
}

/** The links in the header, for the signed-in person and their role. */
function useNavLinks() {
  const { user } = useCurrentUserState();
  const { isAdmin } = useRole();
  const links: { to: string; label: string }[] = [
    { to: "/apps", label: "Desk" },
    { to: "/pricing", label: "Pricing" },
  ];
  if (user) links.push({ to: "/submit", label: "Add" }, { to: "/earnings", label: "Earnings" }, { to: "/billing", label: "Billing" });
  if (isAdmin) links.push({ to: "/review", label: "Review" }, { to: "/stats", label: "Stats" });
  return links;
}

/** On phones: one menu button that opens every page in a grouped list, like an iOS sheet. */
function MobileMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUserState();
  const links = useNavLinks();
  const panel = useRef<HTMLDivElement>(null);
  // Close when the page changes, on Escape, and on a tap outside.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const tap = (e: PointerEvent) => {
      const el = e.target as Node;
      if (panel.current && !panel.current.contains(el) && !(el as HTMLElement).closest?.("[data-menu-button]")) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", tap);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", tap);
    };
  }, [open]);
  const row = "flex min-h-12 items-center justify-between px-4 text-base active:bg-paper-2";
  return (
    <>
      <button
        type="button"
        data-menu-button
        className="inline-flex size-11 items-center justify-center rounded-full text-ink active:bg-paper-2"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open ? (
        <div id="site-menu" ref={panel} className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-paper px-4 pt-3 pb-6 shadow-lg">
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-line">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className={cn(row, path.startsWith(l.to) && "font-semibold text-pine")}>
                  {l.label}
                  <span aria-hidden className="text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="px-4 pt-5 pb-2 text-xs font-medium tracking-wide text-muted uppercase">Browse by audience</p>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-line">
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
            <Link to="/login" search={{ next: "/apps", intent: "sign-in" }} className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-card text-base font-medium shadow-line active:bg-paper-2">
              Sign in
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const links = useNavLinks();
  const account = isPending ? (
    <span className="h-8 w-24 animate-pulse rounded-full bg-paper-2" />
  ) : user ? (
    <UserButton />
  ) : null;

  return (
    <div className="site-shell flex min-h-screen flex-col">
      {/* A slim, translucent bar that stays at the top, like the navigation bar in Apple's apps. */}
      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-1.5 sm:px-5">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2.5">
            <img src="/logo.png" alt="" width={36} height={36} className="site-logo size-8 sm:size-9" />
            <span className="font-display text-2xl leading-none tracking-tight">{APP_NAME}</span>
          </Link>
          {/* Larger screens: everything in one row. */}
          <nav className="hidden items-center gap-x-5 lg:flex" aria-label="Main">
            <Link to="/apps" className={navClass(path.startsWith("/apps"))}>
              Desk
            </Link>
            <BrowseMenu active={path.startsWith("/for/") || path === "/everyday"} />
            {links.slice(1).map((l) => (
              <Link key={l.to} to={l.to} className={navClass(path.startsWith(l.to))}>
                {l.label}
              </Link>
            ))}
            <div className="inline-flex min-h-11 items-center">
              {account ?? (
                <span className="flex items-center gap-4">
                  <Link to="/login" search={{ next: "/apps", intent: "sign-in" }} className={navClass(path.startsWith("/login"))}>
                    Sign in
                  </Link>
                  <Link
                    to="/login"
                    search={{ next: "/apps", intent: "register" }}
                    className="inline-flex min-h-11 items-center rounded-full bg-pine px-4 text-sm font-medium text-paper active:opacity-80"
                  >
                    Create account
                  </Link>
                </span>
              )}
            </div>
          </nav>
          {/* Phones and small tablets: the main action and a menu. */}
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
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">{children}</div>
      </main>
      <footer className="no-print border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <p>Free apps for everyone. Midnry Pass unlocks the rest for $5 a month.</p>
          <span className="flex gap-2">
            <Link to="/apps" className="inline-flex min-h-11 items-center px-2 hover:text-ink">
              Desk
            </Link>
            <Link to="/pricing" className="inline-flex min-h-11 items-center px-2 hover:text-ink">
              Pricing
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
