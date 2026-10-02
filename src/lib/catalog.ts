export const APP_NAME = "Midnry";

export const SITE_DESCRIPTION =
  "Midnry is a desk of web apps. Scratch, Planner, and Apply come with a free account. The rest is $5 a month.";

export type AppTier = "free" | "pass";

export const GENRES = [
  { id: "writing", label: "Writing" },
  { id: "focus", label: "Focus" },
  { id: "money", label: "Money" },
  { id: "work", label: "Work" },
  { id: "code", label: "Code" },
  { id: "design", label: "Design" },
  { id: "health", label: "Health" },
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
  features: readonly string[];
  guide: readonly string[];
};

export const APPS: readonly AppDef[] = [
  {
    slug: "scratch",
    name: "Scratch",
    blurb: "A plain notepad. Several notes, saved with your account.",
    tier: "free",
    genre: "writing",
    features: ["Several notes on one account", "A title and a body for each note", "Notes stay when you leave"],
    guide: ["Type a title and add the note.", "Select a note in the list to open it.", "Edit the title or the body. It saves on its own."],
  },
  {
    slug: "pulse",
    name: "Pulse",
    blurb: "A focus timer. Twenty-five minutes on, five off. The count stays.",
    tier: "pass",
    genre: "focus",
    features: ["Twenty-five minutes of focus, then five off", "Start, pause, and switch the mode", "The remaining time stays if you leave"],
    guide: ["Press start to begin a focus block.", "Pause if you stop. The remaining time stays.", "When it ends, start the break, or another focus block."],
  },
  {
    slug: "split",
    name: "Split",
    blurb: "Split a bill. Amount, people, tip. The per-person figure is the point.",
    tier: "pass",
    genre: "money",
    features: ["Bill amount, number of people, and tip", "A per-person figure", "The last split stays with your account"],
    guide: ["Enter the bill amount.", "Set how many people are paying, and the tip percent.", "Read the amount each person pays."],
  },
  {
    slug: "ledger",
    name: "Ledger",
    blurb: "An expense log with categories and a bar of where the month went.",
    tier: "pass",
    genre: "money",
    features: ["An expense line with a category", "A bar of where the month went", "The log stays with your account"],
    guide: ["Add an amount and a short description.", "Pick a category.", "Use the bar to see which category took the most."],
  },
  {
    slug: "board",
    name: "Board",
    blurb: "Three columns. Move cards across. Personal, not a team product.",
    tier: "pass",
    genre: "work",
    features: ["Three columns you can rename", "Cards you add to a column", "Move a card left or right"],
    guide: ["Rename a column if the default labels are wrong.", "Type a card and add it to that column.", "Move the card across as the work changes."],
  },
  {
    slug: "invoice",
    name: "Invoice",
    blurb: "A one-page invoice. Line items, tax, and a sheet you can print.",
    tier: "pass",
    genre: "money",
    features: ["Who it is from and who it is for", "Line items, quantities, and tax", "A page you can print"],
    guide: ["Fill in your name and the client.", "Add a line for each item, with quantity and rate.", "Check the total, then print the sheet."],
  },
  {
    slug: "glyph",
    name: "Glyph",
    blurb: "Paste JSON. Format it, minify it, or see why it failed.",
    tier: "pass",
    genre: "code",
    features: ["Format JSON so it is readable", "Minify it to one line", "The place the JSON failed, when it does"],
    guide: ["Paste the JSON into the box.", "Format it to read it, or minify it to copy it.", "If it fails, read the error and fix that spot."],
  },
  {
    slug: "habits",
    name: "Habits",
    blurb: "Up to eight habits, checked across the week you are in.",
    tier: "pass",
    genre: "focus",
    features: ["Up to eight habits", "A check for each day of the week", "The week stays with your account"],
    guide: ["Add a habit. Eight is the limit.", "Check the day when you do it.", "Move to another week when this one is done."],
  },
  {
    slug: "contrast",
    name: "Contrast",
    blurb: "Two colors, one ratio, and whether the pair passes WCAG.",
    tier: "pass",
    genre: "design",
    features: ["Two colors, as hex", "The contrast ratio between them", "Whether the pair passes WCAG"],
    guide: ["Enter the text color and the background color.", "Read the ratio.", "Change a color if the pair does not pass."],
  },
  {
    slug: "compressor",
    name: "Compressor",
    blurb: "Re-encode a video to MP4 on this device. The preset sets the bitrate.",
    tier: "pass",
    genre: "work",
    features: ["A video you already have", "Quality presets that set the bitrate", "The file is re-encoded on this device, not uploaded"],
    guide: ["Choose a video file.", "Pick a quality preset.", "Start the encode, then download the MP4."],
  },
  {
    slug: "chat",
    name: "Chat",
    blurb: "A conversation with Grok. The thread stays on your account.",
    tier: "pass",
    genre: "writing",
    features: ["A conversation with Grok", "The thread stays on your account", "Your own xAI key, if the server does not have one"],
    guide: ["Type a message and send it.", "If the server has no key, paste an xAI key. It stays in this browser.", "Keep going in the same thread. It is saved with your account."],
  },
  {
    slug: "planner",
    name: "Planner",
    blurb: "A year of posts for one brand, using the holidays people keep where they are.",
    tier: "free",
    genre: "writing",
    features: ["One brand, one location, and one year", "A post idea for each week", "Holidays people keep in that place", "A PDF of the year"],
    guide: ["Name the brand and say what it does.", "Choose where the audience is, and the year.", "Leave the key blank if the server already has one, then plan the year.", "Download the PDF when the list is complete."],
  },
  {
    slug: "apply",
    name: "Apply",
    blurb: "Rewrite your resume for each role, then open that search on LinkedIn to submit it.",
    tier: "free",
    genre: "work",
    features: ["One resume, several roles", "A rewrite for each role that does not invent jobs", "A PDF and a text file to download", "A link to that role’s search on LinkedIn"],
    guide: ["Enter the roles, one per line.", "Upload a PDF or paste the resume.", "Prepare the applications. Leave the key blank if the server already has one.", "Download the file, open the LinkedIn search, and submit it yourself.", "Check “I submitted this” once you have."],
  },
  {
    slug: "tasks",
    name: "Tasks",
    blurb: "Projects, due dates, priorities, and a today list. Personal, saved with your account.",
    tier: "pass",
    genre: "work",
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
    blurb: "A period log. Flow, symptoms, and an estimate of the next cycle. Not medical advice.",
    tier: "pass",
    genre: "health",
    features: [
      "Flow, symptoms, mood, discharge, and notes on any day",
      "A pill check",
      "Next period, fertile window, and an estimated ovulation day",
      "A month calendar colored by phase",
      "Average cycle length and period length from your logs",
    ],
    guide: [
      "Set the day your last period started, or mark flow on the days you bled.",
      "Open any day to add symptoms, mood, discharge, or a note.",
      "Read the next period and fertile window above the calendar.",
      "After two cycles, the estimate uses your average instead of 28 days.",
      "These dates are estimates, not medical advice and not birth control.",
    ],
  },
];

export function includedNames(): string {
  const names = APPS.filter((app) => app.tier === "free").map((app) => app.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function getApp(slug: string): AppDef | undefined {
  return APPS.find((app) => app.slug === slug);
}

export function tierLabel(tier: AppTier): string {
  return tier === "free" ? "Included" : "Pass";
}
