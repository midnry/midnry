import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { APP_NAME } from "@/lib/catalog";
import { useRole } from "@/components/role";
import { cn } from "@/components/ui";

function navClass(on: boolean) {
  return cn(
    "inline-flex min-h-11 items-center text-sm",
    on ? "font-medium text-ink" : "text-muted hover:text-ink",
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const { isAdmin } = useRole();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2.5">
            <img src="/logo.png" alt="" width={36} height={36} className="size-9" />
            <span className="font-display text-2xl leading-none tracking-tight">{APP_NAME}</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4">
            <Link to="/apps" className={navClass(path.startsWith("/apps"))}>
              Desk
            </Link>
            <Link to="/pricing" className={navClass(path.startsWith("/pricing"))}>
              Pricing
            </Link>
            {user ? (
              <Link to="/submit" className={navClass(path.startsWith("/submit"))}>
                Add
              </Link>
            ) : null}
            {user ? (
              <Link to="/earnings" className={navClass(path.startsWith("/earnings"))}>
                Earnings
              </Link>
            ) : null}
            {user ? (
              <Link to="/billing" className={navClass(path.startsWith("/billing"))}>
                Billing
              </Link>
            ) : null}
            {isAdmin ? (
              <Link to="/review" className={navClass(path.startsWith("/review"))}>
                Review
              </Link>
            ) : null}
            <div className="inline-flex min-h-11 items-center">
              {isPending ? (
                <span className="h-8 w-24 animate-pulse rounded-full bg-paper-2" />
              ) : user ? (
                <UserButton />
              ) : (
                <span className="flex items-center gap-3">
                  <Link
                    to="/login"
                    search={{ next: "/apps", intent: "sign-in" }}
                    className={navClass(path.startsWith("/login"))}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/login"
                    search={{ next: "/apps", intent: "register" }}
                    className="inline-flex min-h-11 items-center rounded-full bg-pine px-4 text-sm font-medium text-paper"
                  >
                    Create account
                  </Link>
                </span>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">{children}</div>
      </main>
      <footer className="no-print border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <p>Free apps for everyone. Midnry Pass unlocks the rest for $5 a month.</p>
          <span className="flex gap-4">
            <Link to="/apps" className="hover:text-ink">
              Desk
            </Link>
            <Link to="/pricing" className="hover:text-ink">
              Pricing
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
