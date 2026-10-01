export const APP_NAME = "Midnry";

export type AppTier = "free" | "pass";

export const GENRES = [
  { id: "writing", label: "Writing" },
  { id: "focus", label: "Focus" },
  { id: "money", label: "Money" },
  { id: "work", label: "Work" },
  { id: "code", label: "Code" },
  { id: "design", label: "Design" },
] as const;

export type GenreId = (typeof GENRES)[number]["id"];

export function isGenre(value: string): value is GenreId {
  return GENRES.some((genre) => genre.id === value);
}

export function genreLabel(id: string): string {
  return GENRES.find((genre) => genre.id === id)?.label ?? "Other";
}

export type AppDef = {
  slug: string;
  name: string;
  blurb: string;
  tier: AppTier;
  genre: GenreId;
};

export const APPS: readonly AppDef[] = [
  {
    slug: "scratch",
    name: "Scratch",
    blurb: "A plain notepad. Several notes, saved with your account.",
    tier: "free",
    genre: "writing",
  },
  {
    slug: "pulse",
    name: "Pulse",
    blurb: "A focus timer. Twenty-five minutes on, five off. The count stays.",
    tier: "free",
    genre: "focus",
  },
  {
    slug: "split",
    name: "Split",
    blurb: "Split a bill. Amount, people, tip. The per-person figure is the point.",
    tier: "free",
    genre: "money",
  },
  {
    slug: "ledger",
    name: "Ledger",
    blurb: "An expense log with categories and a bar of where the month went.",
    tier: "pass",
    genre: "money",
  },
  {
    slug: "board",
    name: "Board",
    blurb: "Three columns. Move cards across. Personal, not a team product.",
    tier: "pass",
    genre: "work",
  },
  {
    slug: "invoice",
    name: "Invoice",
    blurb: "A one-page invoice. Line items, tax, and a sheet you can print.",
    tier: "pass",
    genre: "money",
  },
  {
    slug: "glyph",
    name: "Glyph",
    blurb: "Paste JSON. Format it, minify it, or see why it failed.",
    tier: "pass",
    genre: "code",
  },
  {
    slug: "habits",
    name: "Habits",
    blurb: "Up to eight habits, checked across the week you are in.",
    tier: "pass",
    genre: "focus",
  },
  {
    slug: "contrast",
    name: "Contrast",
    blurb: "Two colors, one ratio, and whether the pair passes WCAG.",
    tier: "pass",
    genre: "design",
  },
  {
    slug: "compressor",
    name: "Compressor",
    blurb: "Re-encode a video to MP4 on this device. The preset sets the bitrate.",
    tier: "pass",
    genre: "work",
  },
  {
    slug: "chat",
    name: "Chat",
    blurb: "A conversation with Grok. The thread stays on your account.",
    tier: "pass",
    genre: "writing",
  },
  {
    slug: "planner",
    name: "Planner",
    blurb: "A year of posts for one brand, using the holidays people keep where they are.",
    tier: "pass",
    genre: "writing",
  },
  {
    slug: "apply",
    name: "Apply",
    blurb: "Rewrite your resume for each role, then open that search on LinkedIn to submit it.",
    tier: "pass",
    genre: "work",
  },
];

export function getApp(slug: string): AppDef | undefined {
  return APPS.find((app) => app.slug === slug);
}

export function tierLabel(tier: AppTier): string {
  return tier === "free" ? "Included" : "Pass";
}
