import { KITS } from "@/lib/kits";
import { FIELD_TAGS, TAG_OVERRIDES } from "@/lib/audience-tags";
import { GENRES, defaultTagOf, genreLabel, isGenre, type GenreId, type TagId } from "@/lib/sections";

export { GENRES, genreLabel, isGenre };
export type { GenreId };

export const APP_NAME = "Midnry";

export type AppTier = "free" | "pass";

export type AppDef = {
  slug: string;
  name: string;
  blurb: string;
  tier: AppTier;
  genre: GenreId;
  audiences: readonly TagId[];
  fields: readonly string[];
  features: readonly string[];
  guide: readonly string[];
};

type AppSource = Omit<AppDef, "audiences" | "fields">;

function tagged(app: AppSource): AppDef {
  const fallback = defaultTagOf(app.genre);
  return {
    ...app,
    audiences: TAG_OVERRIDES[app.slug] ?? (fallback ? [fallback] : []),
    fields: FIELD_TAGS[app.slug] ?? [],
  };
}

const SOURCES: readonly AppSource[] = [
  {
    slug: "scratch",
    name: "Scratch",
    blurb: "A plain notepad. Several notes, saved with your account.",
    tier: "pass",
    genre: "arts",
    features: ["Several notes on one account", "A title and a body for each note", "Notes stay when you leave"],
    guide: ["Type a title and add the note.", "Select a note in the list to open it.", "Edit the title or the body. It saves on its own."],
  },
  {
    slug: "pulse",
    name: "Pulse",
    blurb: "A focus timer. Twenty-five minutes on, five off. The count stays.",
    tier: "pass",
    genre: "computing",
    features: ["Twenty-five minutes of focus, then five off", "Start, pause, and switch the mode", "The remaining time stays if you leave"],
    guide: ["Press start to begin a focus block.", "Pause if you stop. The remaining time stays.", "When it ends, start the break, or another focus block."],
  },
  {
    slug: "split",
    name: "Split",
    blurb: "Split a bill. Amount, people, tip. The per-person figure is the point.",
    tier: "pass",
    genre: "books",
    features: ["Bill amount, number of people, and tip", "A per-person figure", "The last split stays with your account"],
    guide: ["Enter the bill amount.", "Set how many people are paying, and the tip percent.", "Read the amount each person pays."],
  },
  {
    slug: "ledger",
    name: "Ledger",
    blurb: "An expense log with categories and a bar of where the month went.",
    tier: "pass",
    genre: "books",
    features: ["An expense line with a category", "A bar of where the month went", "The log stays with your account"],
    guide: ["Add an amount and a short description.", "Pick a category.", "Use the bar to see which category took the most."],
  },
  {
    slug: "board",
    name: "Board",
    blurb: "Three columns. Move cards across. Personal, not a team product.",
    tier: "pass",
    genre: "developers",
    features: ["Three columns you can rename", "Cards you add to a column", "Move a card left or right"],
    guide: ["Rename a column if the default labels are wrong.", "Type a card and add it to that column.", "Move the card across as the work changes."],
  },
  {
    slug: "invoice",
    name: "Invoice",
    blurb: "A one-page invoice. Line items, tax, and a sheet you can print.",
    tier: "free",
    genre: "freelance",
    features: ["Who it is from and who it is for", "Line items, quantities, and tax", "A page you can print"],
    guide: ["Fill in your name and the client.", "Add a line for each item, with quantity and rate.", "Check the total, then print the sheet."],
  },
  {
    slug: "glyph",
    name: "Glyph",
    blurb: "Paste JSON. Format it, minify it, or see why it failed.",
    tier: "pass",
    genre: "developers",
    features: ["Format JSON so it is readable", "Minify it to one line", "The place the JSON failed, when it does"],
    guide: ["Paste the JSON into the box.", "Format it to read it, or minify it to copy it.", "If it fails, read the error and fix that spot."],
  },
  {
    slug: "habits",
    name: "Habits",
    blurb: "Up to eight habits, checked across the week you are in.",
    tier: "pass",
    genre: "elder-health",
    features: ["Up to eight habits", "A check for each day of the week", "The week stays with your account"],
    guide: ["Add a habit. Eight is the limit.", "Check the day when you do it.", "Move to another week when this one is done."],
  },
  {
    slug: "contrast",
    name: "Contrast",
    blurb: "Two colors, one ratio, and whether the pair passes WCAG.",
    tier: "pass",
    genre: "creatives",
    features: ["Two colors, as hex", "The contrast ratio between them", "Whether the pair passes WCAG"],
    guide: ["Enter the text color and the background color.", "Read the ratio.", "Change a color if the pair does not pass."],
  },
  {
    slug: "compressor",
    name: "Compressor",
    blurb: "Re-encode a video to MP4 on this device. The preset sets the bitrate.",
    tier: "pass",
    genre: "creatives",
    features: ["A video you already have", "Quality presets that set the bitrate", "The file is re-encoded on this device, not uploaded"],
    guide: ["Choose a video file.", "Pick a quality preset.", "Start the encode, then download the MP4."],
  },
  {
    slug: "planner",
    name: "Planner",
    blurb: "A year of posts for one brand, using the holidays people keep where they are.",
    tier: "pass",
    genre: "marketing",
    features: ["One brand, one location, and one year", "Two video ideas and two post ideas for every week", "Holidays people keep in that place", "A PDF of the year"],
    guide: ["Name the brand and say what it does.", "Choose where the audience is, and the year.", "Plan the year. It takes about a minute.", "Download the PDF when the list is complete."],
  },
  {
    slug: "apply",
    name: "Apply",
    blurb: "Tailor your resume for each role, then open that search on LinkedIn to submit it.",
    tier: "pass",
    genre: "freelance",
    features: ["One resume, several roles", "A version for each role with your best matches first, and nothing invented", "A PDF and a text file to download", "A link to that role’s search on LinkedIn"],
    guide: ["Enter the roles, one per line.", "Upload a PDF or paste the resume.", "Prepare the applications.", "Download the file, open the LinkedIn search, and submit it yourself.", "Check “I submitted this” once you have."],
  },
  {
    slug: "tasks",
    name: "Tasks",
    blurb: "Projects, due dates, priorities, and a today list. Personal, saved with your account.",
    tier: "pass",
    genre: "developers",
    features: [
      "Inbox, projects, and sections",
      "Labels, priorities, due dates, and repeats",
      "Subtasks and a description",
      "Today, Upcoming, and Completed",
      "List, board, and month",
    ],
    guide: [
      "Type a task, set the project, date, priority, and repeat, then add it.",
      "Open Inbox, Today, or Upcoming from the side.",
      "Click a task to edit it, add a subtask, or delete it.",
      "Use Board to drag a task between sections, or Month to see due dates.",
      "Completing a repeating task schedules the next one.",
    ],
  },
  {
    slug: "cycle",
    name: "Cycle",
    blurb: "A simple period log. See when your next period should start, and keep notes for each period.",
    tier: "free",
    genre: "medicine",
    features: [
      "The date your next period should start, and how many days away it is",
      "Log a period with its first and last day",
      "Notes for each period, like a notes app, saved on your account",
      "Edit or delete any note, and delete any logged period",
      "Uses your own average cycle once two periods are logged",
    ],
    guide: [
      "Under Log a period, pick the first day of your last period, and the last day if it has ended.",
      "Read the date your next period should start, right under the form.",
      "Open a period to add a note. Edit or delete a note at any time.",
      "Delete period removes that period and its notes.",
      "These dates are estimates, not medical advice and not birth control.",
    ],
  },
  ...KITS.map((kit) => ({
    slug: kit.slug,
    name: kit.name,
    blurb: kit.blurb,
    tier: "free" as const,
    genre: kit.section,
    features: kit.features,
    guide: kit.guide,
  })),
];

export const APPS: readonly AppDef[] = SOURCES.map(tagged);

export function includedNames(): string {
  return "three apps in every section";
}

export const SITE_DESCRIPTION =
  "Midnry is a desk of web apps for students, professionals, business owners, and seniors. Each section includes three free apps. The rest is $5 a month.";

export function getApp(slug: string): AppDef | undefined {
  return APPS.find((app) => app.slug === slug);
}

export function tierLabel(tier: AppTier): string {
  return tier === "free" ? "Included" : "Pass";
}
