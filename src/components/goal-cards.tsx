import { Link } from "@tanstack/react-router";
import { GOALS } from "@/lib/goals";
import { getApp } from "@/lib/catalog";
import { accessLabel } from "@/lib/plans";
import { pitchFor } from "@/lib/pitches";
import { AppMark } from "@/components/app-mark";
import { GoalLink } from "@/components/desk-list";
import { cn } from "@/components/ui";

const card =
  "group flex h-full flex-col rounded-2xl p-5 shadow-line transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine";

/**
 * "Start here": browse by what you want to get done. Each card names the app
 * that does it and whether it is free, and opens that app's product page.
 */
export function GoalCards({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-5", className)}>
      {GOALS.map((goal) => {
        if (goal.target === "games") {
          return (
            <li key={goal.id} className="sm:col-span-2 lg:col-span-1">
              <GoalLink
                goal={goal}
                className={cn(card, "relative overflow-hidden bg-[#0b1220] text-[#f4f7fb] hover:bg-[#101a2e]")}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_100%,rgba(90,141,238,0.45),transparent_70%)]"
                />
                <span className="relative font-display text-2xl leading-tight tracking-tight text-balance">{goal.label}</span>
                <span className="relative mt-2 text-sm text-pretty text-[#c4d3e8]">Abuja Hustle and Outpost Zero, free in your browser.</span>
                <span className="relative mt-auto flex items-center gap-2 pt-5">
                  <img src="/abuja-hustle-v2-192.png" alt="" width={40} height={40} loading="lazy" className="size-10 rounded-xl ring-1 ring-white/20" />
                  <img
                    src="/games/outpost-zero/key-art-mobile.webp"
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    className="size-10 rounded-xl object-cover object-[60%_30%] ring-1 ring-white/20"
                  />
                  <span className="ml-auto text-sm font-medium">
                    See the games <span aria-hidden>→</span>
                  </span>
                </span>
              </GoalLink>
            </li>
          );
        }
        const app = getApp(goal.target);
        if (!app) return null;
        return (
          <li key={goal.id}>
            <GoalLink goal={goal} className={cn(card, "bg-card hover:bg-paper-2/60")}>
              <span className="font-display text-2xl leading-tight tracking-tight text-balance">{goal.label}</span>
              <span className="mt-2 line-clamp-3 text-sm text-pretty text-muted">{pitchFor(app)}</span>
              <span className="mt-auto flex items-center gap-3 pt-5">
                <AppMark slug={app.slug} name={app.name} className="size-10" />
                <span className="min-w-0 text-sm leading-snug">
                  <span className="block font-medium">{app.name}</span>
                  <span className={app.tier === "pass" ? "block text-pine" : "block text-muted"}>{accessLabel(app.tier)}</span>
                </span>
              </span>
            </GoalLink>
          </li>
        );
      })}
    </ul>
  );
}

/** A quiet link to the finder, for "not sure?" moments. */
export function FinderLink({ className }: { className?: string }) {
  return (
    <Link to="/apps" hash="finder" className={cn("inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4", className)}>
      Not sure? Answer two quick questions
    </Link>
  );
}
