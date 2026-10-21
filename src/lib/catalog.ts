import { KITS } from "@/lib/kits";
import { PASS_PRICE_LABEL } from "@/lib/access";
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
    blurb: "Your money in one place: a full expense log, a Budget view of income against costs, and a simple large-type Pocket view.",
    tier: "pass",
    genre: "books",
    features: [
      "An expense line with a category, or money in",
      "A bar of where the month went, and a monthly budget",
      "Budget view: income against costs for the month, and what is left",
      "Pocket view: money in, money out, and what is left, in large type",
      "Bring in your entries from Budget and Pocket in one click; the originals are kept",
      "The log stays with your account, and exports as CSV",
    ],
    guide: [
      "Add an amount and a short description.",
      "Pick a category, and whether it is money in or out.",
      "Use the bar to see which category took the most.",
      "Open Budget for income against costs, or Pocket for a simple large-type view.",
      "Used Budget or Pocket before? Press Bring my entries into Ledger to copy them in.",
    ],
  },
  {
    slug: "invoice",
    name: "Invoice",
    blurb: "Invoices, quotes and simple proposals for client work. Numbered, searchable, and ready to print.",
    tier: "free",
    genre: "freelance",
    features: [
      "Line items, quantities and tax, added up in the currency you choose",
      "Every invoice kept, numbered in order with a prefix you can change, and searchable by client, number or amount",
      "Draft, sent and paid with the date paid; unpaid invoices past their due date show as overdue",
      "Quotes with line items that turn into an invoice without retyping",
      "Simple proposals for a job that become a quote",
      "Saved clients you pick instead of typing them again",
      "A clean page to print or save as a PDF, on a phone or a computer",
    ],
    guide: [
      "Fill in your name and the client, then add a line for each item, with quantity and rate.",
      "Check the total, then print it or save it as a PDF.",
      "Press New invoice for the next one. The number moves on and the earlier invoice stays under Invoices.",
      "Mark an invoice sent or paid. Search the list by client, number or amount.",
      "Under Quotes, price a job and press Convert to invoice when the client agrees.",
      "Under Proposals, describe the job and make a quote from it.",
    ],
  },
  {
    slug: "glyph",
    name: "Glyph",
    blurb: "The full JSON workbench: a collapsible tree, the path of any node, minify, sorted keys, copy and download, and room for large files.",
    tier: "pass",
    genre: "developers",
    features: [
      "A collapsible tree view of the JSON, with counts for every object and array",
      "Click a node to get its JSON path, such as $.items[2].price, and copy it",
      "Format, minify, and sort keys A to Z",
      "Copy or download the result as a .json file, or open a .json file",
      "Handles large input: up to a few megabytes, with the tree opened a level at a time",
      "The line and column where the JSON failed, with that spot marked",
      "Your last JSON stays with your account",
    ],
    guide: [
      "Paste JSON, or open a .json file.",
      "Format, minify, or sort the keys.",
      "Open and close branches in the tree. Click a node to see and copy its path.",
      "Copy or download the result.",
      "If it fails, go to the line and column named in the error.",
    ],
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
    name: "Remind",
    blurb: "Reminders and to-dos in plain words. \"Pay rent every 25th p1\" just works. Projects, streaks, and points.",
    tier: "free",
    genre: "developers",
    features: [
      "Type naturally: \"call mum tomorrow 6pm @home\" sets the date, time, and label",
      "Repeats like every Tuesday, every weekday, every 2 weeks, or every 15th",
      "Projects, sections, sub-tasks, colour-coded priorities, labels, and saved filters",
      "Comments on tasks, and Productivity with daily and weekly streaks",
      "Midnry Points and levels for every task you finish",
      "With Midnry Pass: shared projects, assigning tasks, file attachments, and a Google or Apple Calendar link",
      "With Midnry Pass: a three-column Board, a Focus timer you can start from any task, and Habits with today's ticks next to Today",
    ],
    guide: [
      "Type a task in the box and press Add. Words like tomorrow, 6pm, every Friday, p1, @label, and #project are picked up for you.",
      "Use Today and Upcoming to see what's due. Tick the circle to finish a task and earn points.",
      "Tap a task to add notes, sub-tasks, comments, a time, a repeat, or labels.",
      "Make projects and sections in the menu, and save filters for the views you use most.",
      "Open Productivity to see your streaks and set daily and weekly goals.",
      "With Midnry Pass, share a project, invite people by email, assign tasks, attach files, and add your calendar link under Settings.",
      "With Midnry Pass, open Board, Focus, and Habits in the menu. Tap Focus on a task to start a 25-minute round for it.",
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

const FREE_COUNT = APPS.filter((app) => app.tier === "free").length;
const PASS_COUNT = APPS.length - FREE_COUNT;

/** What every account opens, for sentences like "Your account includes …". */
export function includedNames(): string {
  return `all ${FREE_COUNT} free apps`;
}

export const SITE_DESCRIPTION = `Midnry is a desk of browser apps for school, work, business and home, plus free games. ${FREE_COUNT} apps are free with an account; Midnry Pass adds ${PASS_COUNT} more tools for ${PASS_PRICE_LABEL} a month.`;

export function getApp(slug: string): AppDef | undefined {
  return APPS.find((app) => app.slug === slug);
}

/** The short access label, for breadcrumbs and tight rows. The long form is accessLabel in plans.ts. */
export function tierLabel(tier: AppTier): string {
  return tier === "free" ? "Free" : "Midnry Pass";
}
