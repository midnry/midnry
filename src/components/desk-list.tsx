import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { APPS, genreLabel, getApp } from "@/lib/catalog";
import { AUDIENCES, SECTIONS, TAGS, defaultTagOf, sectionOf, sectionsIn, tagLabel, type GenreId, type TagId } from "@/lib/sections";
import { GENERAL_APPS } from "@/lib/audience-tags";
import { accessLabel } from "@/lib/plans";
import { pitchFor } from "@/lib/pitches";
import { GOALS } from "@/lib/goals";
import { canOpenApp } from "@/lib/access";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
import { useRole } from "@/components/role";
import { listPublished, type PublishedApp } from "@/lib/community.functions";
import { SaveButton } from "@/components/spotlight";
import { AppMark } from "@/components/app-mark";
import { buttonClass, cn } from "@/components/ui";

type DeskItem = {
  slug: string;
  name: string;
  blurb: string;
  /** What the app helps you get done, in plain words. */
  pitch: string;
  genre: GenreId;
  audiences: readonly TagId[];
  tier: "free" | "pass";
  /** A Midnry app with its own product page (community apps don't have one yet). */
  builtIn: boolean;
};

type DeskView = "list" | "grid";

export type { DeskItem };

/** A link to an app: its product page for visitors, or the app itself once you're signed in. */
export function AppLink({ slug, className, children }: { slug: string; className?: string; children: ReactNode }) {
  const { user } = useCurrentUserState();
  if (!user && getApp(slug)) {
    return (
      <Link to="/discover/$slug" params={{ slug }} preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/apps/$slug" params={{ slug }} preload="intent" className={className}>
      {children}
    </Link>
  );
}

const VIEW_KEY = "midnry.desk.view";

/** Apps that help anyone stay out of subject shelves: see GENERAL_APPS. */
export function isGeneral(item: { slug: string }): boolean {
  return GENERAL_APPS.has(item.slug);
}

export function useDesk() {
  const { user, isPending } = useCurrentUserState();
  const { account, loading } = useAccount();
  const { isAdmin, ready: roleReady } = useRole();
  const known = !!user && !isPending && !loading && roleReady;
  const [added, setAdded] = useState<PublishedApp[]>([]);
  const [view, setView] = useState<DeskView>("grid");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_KEY);
      if (stored === "grid" || stored === "list") setView(stored);
    } catch {
      /* storage unavailable: keep the grid */
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    listPublished()
      .then((rows) => {
        if (!cancel) setAdded(rows);
      })
      .catch(() => {
        if (!cancel) setAdded([]);
      });
    return () => {
      cancel = true;
    };
  }, []);

  function choose(next: DeskView) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* the choice still applies for this visit */
    }
  }

  const items: DeskItem[] = [
    ...APPS.map((app) => ({
      slug: app.slug,
      name: app.name,
      blurb: app.blurb,
      pitch: pitchFor(app),
      genre: sectionOf(app.genre) ?? app.genre,
      audiences: app.audiences,
      tier: app.tier,
      builtIn: true,
    })),
    ...added.map((app) => ({
      slug: app.slug,
      name: app.name,
      blurb: app.blurb,
      pitch: app.blurb,
      genre: sectionOf(app.genre) ?? app.genre,
      audiences: app.audiences,
      tier: "pass" as const,
      builtIn: false,
    })),
  ];

  return { items, view, choose, known, signedIn: !!user, hasPass: account?.hasPass ?? false, isAdmin };
}

const SUBJECT_TITLES: Record<string, string> = {
  students: "Fields of study",
  professionals: "Jobs and professions",
  owners: "Kinds of business",
  seniors: "For seniors",
};

function TagLink({ tag, className, children, onClick }: { tag: TagId; className?: string; children: ReactNode; onClick?: () => void }) {
  return tag === "everyday" ? (
    <Link to="/everyday" preload="intent" className={className} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <Link to="/for/$audience" params={{ audience: tag }} preload="intent" className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export { TagLink };

const focusRing = "outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine";

/** The secondary ways in: who an app is for, and the subject shelves. */
export function DeskList() {
  const { items } = useDesk();
  return (
    <div>
      <h2 className="font-display text-3xl tracking-tight">Browse by who it’s for</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TAGS.map((tag) => {
          const count = items.filter((item) => item.audiences.includes(tag.id)).length;
          return (
            <li key={tag.id}>
              <TagLink tag={tag.id} className={cn("group flex h-full flex-col rounded-2xl bg-card p-5 shadow-line hover:bg-paper-2", focusRing)}>
                <span className="font-display text-2xl tracking-tight group-hover:underline">{tag.label}</span>
                <span className="mt-1.5 text-sm text-pretty text-muted">
                  {tag.id === "everyday" ? "Reminders, Cycle, converters, money and health logs. Useful to anyone." : tag.blurb}
                </span>
                <span className="mt-auto pt-4 text-sm font-medium text-ink-soft">
                  {count} apps <span aria-hidden>→</span>
                </span>
              </TagLink>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-12 font-display text-2xl tracking-tight">Or by subject</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AUDIENCES.map((audience) => (
          <li key={audience.id}>
            <Link
              to="/audiences/$audience"
              params={{ audience: audience.id }}
              preload="intent"
              className={cn("group flex h-full min-h-11 items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4 shadow-line hover:bg-paper-2", focusRing)}
            >
              <span>
                <span className="block font-medium group-hover:underline">{SUBJECT_TITLES[audience.id]}</span>
                <span className="mt-0.5 block text-sm text-muted">{sectionsIn(audience.id).length} subjects</span>
              </span>
              <span aria-hidden className="text-muted">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Apps tagged with one audience: general tools first, then each subject shelf. */
export function TaggedApps({ tag, label }: { tag: TagId; label: string }) {
  const { items, view, choose, known, signedIn, hasPass, isAdmin } = useDesk();
  const tagged = items.filter((item) => item.audiences.includes(tag));
  const shelved = (item: DeskItem) => !isGeneral(item) && defaultTagOf(item.genre) === tag;
  const home = tagged.filter(shelved);
  const more = tagged.filter((item) => !shelved(item));
  const groups: { id: string; label: string; apps: DeskItem[] }[] = SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    apps: home.filter((item) => item.genre === section.id),
  })).filter((group) => group.apps.length > 0);
  if (more.length > 0) groups.unshift({ id: "more", label: `Handy for ${label.toLowerCase()}`, apps: more });

  return (
    <>
      <div className="mt-6 flex items-end justify-between gap-4">
        <p className="text-sm text-muted">{tagged.length} apps</p>
        <DeskViewToggle view={view} onChange={choose} />
      </div>
      {groups.length === 0 ? <p className="mt-8 text-sm text-muted">Nothing is here yet.</p> : null}
      {groups.length > 1 ? (
        <nav aria-label="Jump to a subject" className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {groups.map((group) => (
            <a
              key={group.id}
              href={`#group-${group.id}`}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-card px-4 text-sm shadow-line hover:bg-paper-2"
            >
              {group.label}
            </a>
          ))}
        </nav>
      ) : null}
      {groups.map((group) => (
        <section key={group.id} id={`group-${group.id}`} className="mt-10 scroll-mt-20">
          <h2 className="font-display text-2xl tracking-tight">{group.label}</h2>
          <AppGroup apps={group.apps} view={view} known={known} signedIn={signedIn} hasPass={hasPass} isAdmin={isAdmin} />
        </section>
      ))}
    </>
  );
}

/** A sideways row of everyday apps not already listed above it. */
export function EverydayRow({ exclude }: { exclude: TagId }) {
  const { items } = useDesk();
  const apps = items.filter((item) => item.audiences.includes("everyday") && !item.audiences.includes(exclude)).slice(0, 8);
  if (apps.length === 0) return null;
  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl tracking-tight">Everyday tools</h2>
        <Link to="/everyday" className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink">
          See all <span aria-hidden className="ml-1">→</span>
        </Link>
      </div>
      <ul className="-mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
        {apps.map((app) => (
          <li key={app.slug} className="w-52 shrink-0 snap-start">
            <AppLink slug={app.slug} className={cn("group flex h-full flex-col gap-3 rounded-2xl bg-card p-4 shadow-line", focusRing)}>
              <AppMark slug={app.slug} name={app.name} className="size-10" />
              <span>
                <span className="block font-medium group-hover:underline">{app.name}</span>
                <AccessTag tier={app.tier} />
                <span className="mt-1.5 line-clamp-2 block text-sm text-muted">{app.pitch}</span>
              </span>
            </AppLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

const FEATURES = new Map(APPS.map((app) => [app.slug, app.features.join(" ")]));

// Everyday words people type that the catalogue spells differently.
const SYNONYMS: Record<string, string> = {
  todo: "to-do",
  todos: "to-do",
  cv: "resume",
  expenses: "expense",
  spending: "spend",
  receipt: "invoice",
  job: "role",
  jobs: "role",
};

function searchWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((word) => word.length > 0);
}

/** How well an app matches: how many search words it contains, and a rank that favours names. */
function score(item: DeskItem, words: string[]): { matched: number; points: number } {
  const name = item.name.toLowerCase();
  const goals = GOALS.filter((goal) => goal.target === item.slug).map((goal) => goal.label);
  const rest = [
    item.blurb,
    item.pitch,
    isGeneral(item) ? "" : genreLabel(item.genre),
    ...item.audiences.map(tagLabel),
    ...goals,
    FEATURES.get(item.slug) ?? "",
  ]
    .join(" ")
    .toLowerCase();
  let matched = 0;
  let points = 0;
  for (const word of words) {
    const forms = [word, SYNONYMS[word], word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : undefined].filter(
      (form): form is string => Boolean(form),
    );
    if (forms.some((form) => name === form)) points += 100;
    else if (forms.some((form) => name.startsWith(form))) points += 60;
    else if (forms.some((form) => name.includes(form))) points += 40;
    else if (forms.some((form) => rest.includes(form))) points += 10;
    else continue;
    matched += 1;
  }
  return { matched, points };
}

/** Search every app on the desk by name, purpose, audience, and features. */
export function AppSearch({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const { items, known, signedIn, hasPass, isAdmin } = useDesk();
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const statusId = useId();
  const words = searchWords(query);
  const scored = words.length ? items.map((item) => ({ item, ...score(item, words) })).filter((entry) => entry.matched > 0) : [];
  // Apps matching every word; if there are none, the closest matches instead.
  const exact = scored.filter((entry) => entry.matched === words.length);
  const partial = exact.length === 0 && scored.length > 0;
  const results = (partial ? scored : exact)
    .sort((a, b) => b.matched - a.matched || b.points - a.points || a.item.name.localeCompare(b.item.name))
    .map((entry) => entry.item);
  const shown = results.slice(0, 24);
  const typed = query.trim();

  function clear() {
    setQuery("");
    input.current?.focus();
  }

  return (
    <div className={className}>
      <form role="search" aria-label="Apps" onSubmit={(event) => event.preventDefault()} className="relative">
        <label htmlFor={`${statusId}-q`} className="sr-only">
          Search apps
        </label>
        <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted" fill="none">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          ref={input}
          id={`${statusId}-q`}
          type="search"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => setQuery(event.target.value.slice(0, 80))}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
          placeholder={`Search ${items.length} apps`}
          aria-describedby={words.length ? statusId : undefined}
          className="h-14 w-full rounded-full border border-line bg-card pl-13 pr-14 text-base text-ink shadow-line outline-none placeholder:text-muted focus-visible:border-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M7 7l10 10M17 7L7 17" />
            </svg>
          </button>
        ) : null}
      </form>
      <div aria-live="polite" className="empty:hidden">
        {words.length ? (
          <p id={statusId} className="mt-4 text-sm text-muted">
            {results.length === 0
              ? `No apps match “${typed}”.`
              : partial
                ? `Nothing matches every word. Closest ${results.length === 1 ? "match" : "matches"}:`
                : `${results.length} ${results.length === 1 ? "app matches" : "apps match"} “${typed}”${results.length > shown.length ? `. Showing the best ${shown.length}.` : "."}`}
          </p>
        ) : null}
      </div>
      {words.length && shown.length ? (
        <AppGroup apps={shown} view="grid" known={known} signedIn={signedIn} hasPass={hasPass} isAdmin={isAdmin} />
      ) : null}
      {words.length && results.length === 0 ? <NoResults onClear={clear} /> : null}
    </div>
  );
}

/** What to do when a search finds nothing: a goal to start from, a clean slate, or the full list. */
function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-3 rounded-2xl bg-card p-5 shadow-line sm:p-6">
      <p className="font-medium">Try a simpler word, or start from what you want to get done:</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {GOALS.map((goal) => (
          <li key={goal.id}>
            <GoalLink goal={goal} className="inline-flex min-h-11 items-center rounded-full bg-paper px-4 text-sm hover:bg-paper-2">
              {goal.label}
            </GoalLink>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={onClear} className={buttonClass({ tone: "quiet" })}>
          Clear search
        </button>
        <Link to="/apps" hash="all" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
          Browse all apps
        </Link>
        <Link to="/apps" hash="finder" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
          Help me choose
        </Link>
      </div>
    </div>
  );
}

/** A goal's destination: the product page of the app that does it, or the games. */
export function GoalLink({ goal, className, children }: { goal: (typeof GOALS)[number]; className?: string; children: ReactNode }) {
  if (goal.target === "games") {
    return (
      <Link to="/games" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/discover/$slug" params={{ slug: goal.target }} preload="intent" className={className}>
      {children}
    </Link>
  );
}

export function DeskViewToggle({ view, onChange }: { view: DeskView; onChange: (next: DeskView) => void }) {
  return (
    <div className="inline-flex rounded-full bg-card p-1 shadow-line" role="group" aria-label="Layout">
      <ViewButton label="List" pressed={view === "list"} onClick={() => onChange("list")}>
        <ListIcon />
      </ViewButton>
      <ViewButton label="Grid" pressed={view === "grid"} onClick={() => onChange("grid")}>
        <GridIcon />
      </ViewButton>
    </div>
  );
}

/** Free or Pass, in the site's one wording (plans.ts). */
export function AccessTag({ tier, className }: { tier: "free" | "pass"; className?: string }) {
  return (
    <span
      className={cn(
        "mt-1 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tier === "free" ? "bg-paper-2 text-ink-soft" : "bg-pine/10 text-pine dark:bg-pine/20 dark:text-ink",
        className,
      )}
    >
      {accessLabel(tier)}
    </span>
  );
}

type Status = { open: boolean; locked: boolean };

function appStatus(app: DeskItem, known: boolean, hasPass: boolean, isAdmin: boolean): Status {
  const unlocked = canOpenApp(app, hasPass, isAdmin);
  return {
    open: known && unlocked,
    locked: known && app.tier === "pass" && !unlocked,
  };
}

/** What selecting the card does, said on the card. */
function actionLabel(app: DeskItem, signedIn: boolean, status: Status): string {
  if (!signedIn) return app.builtIn ? "See how it works" : "See details";
  if (status.locked) return "See how to unlock";
  return `Open ${app.name}`;
}

export function AppGroup({
  apps,
  view,
  known,
  signedIn,
  hasPass,
  isAdmin,
}: {
  apps: DeskItem[];
  view: DeskView;
  known: boolean;
  signedIn: boolean;
  hasPass: boolean;
  isAdmin: boolean;
}) {
  if (view === "grid") {
    return (
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => {
          const status = appStatus(app, known, hasPass, isAdmin);
          return (
            <li key={app.slug} className="relative min-w-0">
              <AppLink
                slug={app.slug}
                className={cn("group flex h-full min-w-0 flex-col rounded-2xl bg-card p-5 shadow-line transition-colors hover:bg-paper-2/60", focusRing)}
              >
                <span className="flex items-start gap-3 pr-10">
                  <AppMark slug={app.slug} name={app.name} className="size-11 sm:size-12" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-xl leading-tight tracking-tight group-hover:underline">{app.name}</span>
                    <AccessTag tier={app.tier} />
                  </span>
                </span>
                <span className="mt-3 line-clamp-3 block text-sm text-pretty text-muted">{app.pitch}</span>
                <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-pine">
                  {actionLabel(app, signedIn, status)}
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">→</span>
                </span>
              </AppLink>
              <span className="absolute right-1.5 top-1.5">
                <SaveButton slug={app.slug} name={app.name} />
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="mt-2">
      {apps.map((app) => {
        const status = appStatus(app, known, hasPass, isAdmin);
        return (
          <li key={app.slug} className="flex items-stretch gap-2 border-t border-line last:border-b">
            <AppLink slug={app.slug} className={cn("group flex min-w-0 flex-1 gap-4 py-4", focusRing)}>
              <AppMark slug={app.slug} name={app.name} className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium group-hover:underline">{app.name}</span>
                  <AccessTag tier={app.tier} className="mt-0" />
                </span>
                <span className="mt-1 block text-sm text-pretty text-muted">{app.pitch}</span>
                <span className="mt-1.5 block text-sm font-medium text-pine">
                  {actionLabel(app, signedIn, status)} <span aria-hidden>→</span>
                </span>
              </span>
            </AppLink>
            <SaveButton slug={app.slug} name={app.name} />
          </li>
        );
      })}
    </ul>
  );
}

type AccessFilter = "all" | "free" | "pass";

const FILTERS: { id: AccessFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "free", label: "Free with an account" },
  { id: "pass", label: "Midnry Pass" },
];

/** Every app, A to Z, with a free/Pass filter. Opens fully when someone follows a link to #all. */
export function AllApps() {
  const { items, known, signedIn, hasPass, isAdmin } = useDesk();
  const [filter, setFilter] = useState<AccessFilter>("all");
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  const hash = useRouterState({ select: (state) => state.location.hash });
  useEffect(() => {
    if (hash === "all") setExpanded(true);
  }, [hash]);

  const sorted = [...items]
    .filter((item) => filter === "all" || item.tier === filter)
    .sort((a, b) => a.name.localeCompare(b.name));
  const shown = expanded ? sorted : sorted.slice(0, 9);

  return (
    <section id="all" aria-labelledby={`${listId}-title`} className="scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id={`${listId}-title`} className="font-display text-3xl tracking-tight">
            Every app, A to Z
          </h2>
          <p className="mt-1 text-sm text-muted">{sorted.length} apps{filter === "all" ? "" : ` · ${FILTERS.find((item) => item.id === filter)?.label}`}</p>
        </div>
        <div className="inline-flex flex-wrap gap-1 rounded-full bg-card p-1 shadow-line" role="group" aria-label="Show">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-4 text-sm",
                filter === item.id ? "bg-pine font-medium text-paper" : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div id={listId}>
        <AppGroup apps={shown} view="grid" known={known} signedIn={signedIn} hasPass={hasPass} isAdmin={isAdmin} />
      </div>
      {sorted.length > shown.length || expanded ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className={cn(buttonClass({ tone: "quiet" }), "mt-5")}
        >
          {expanded ? "Show fewer" : `Show all ${sorted.length} apps`}
        </button>
      ) : null}
    </section>
  );
}

function ViewButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn("grid size-11 place-items-center rounded-full", pressed ? "bg-pine text-paper" : "text-muted hover:text-ink")}
    >
      {children}
    </button>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path d="M8 7h11M8 12h11M8 17h11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4.5" cy="7" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
