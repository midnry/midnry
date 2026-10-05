import type { WeekSlot } from "./calendar.ts";

// Midnry's own idea planner. It builds two video ideas and two post ideas for
// every week from the brand, what it does, the season, and that week's
// holidays. It runs on the device, with no model and no key.

export type WeekIdeas = {
  week: number;
  videos: [string, string];
  posts: [string, string];
};

type Fill = { brand: string; thing: string; holiday: string; month: string };
type Template = (fill: Fill) => string;

const HOLIDAY_VIDEOS: Template[] = [
  ({ brand, holiday }) => `Open on the team getting ready for ${holiday}, then show how ${brand} fits into the celebration.`,
  ({ holiday, thing }) => `Open on a close-up of ${thing} styled for ${holiday}; finish with a short ${holiday} greeting from the team.`,
  ({ brand, holiday }) => `Open with a customer saying how they mark ${holiday}; cut to ${brand} helping them do it.`,
  ({ holiday }) => `Open on a 3-second “${holiday} checklist” title; walk through three quick tips your customers can use this week.`,
  ({ brand, holiday }) => `Open on a festive transition to the ${brand} storefront or workspace, decorated for ${holiday}.`,
];

const HOLIDAY_POSTS: Template[] = [
  ({ brand, holiday }) => `A warm ${holiday} greeting card post from everyone at ${brand}, with your opening hours for the holiday.`,
  ({ holiday, thing }) => `A carousel: “How to enjoy ${holiday} with ${thing}” in four simple slides.`,
  ({ holiday, brand }) => `A ${holiday} offer post — one clear deal, the dates it runs, and how to order from ${brand}.`,
  ({ holiday }) => `Ask your followers how they celebrate ${holiday}; reply to the best answers in your stories.`,
  ({ holiday, brand }) => `A behind-the-scenes photo of ${brand} preparing for ${holiday}, with a short caption on what it means to you.`,
];

const VIDEOS: Template[] = [
  ({ brand, thing }) => `Open on hands at work: a 20-second process video showing how ${brand} makes or delivers ${thing}.`,
  ({ brand }) => `Open on a team member's face: “One thing people don't know about ${brand}…” and share it.`,
  ({ thing }) => `Open on a common mistake people make with ${thing}, then show the right way in three steps.`,
  ({ brand }) => `Open on a customer unboxing or receiving their order from ${brand}; let them react in their own words.`,
  ({ thing, month }) => `Open on a “${month} must-have” title card, then show the ${thing} your customers are choosing this month.`,
  ({ brand }) => `Open on the empty workspace at sunrise; a day-in-the-life time-lapse of ${brand}.`,
  ({ thing }) => `Open on a before-and-after split screen that shows the difference ${thing} makes.`,
  ({ brand }) => `Open on the founder answering the question customers ask most about ${brand}.`,
  ({ thing }) => `Open on three items side by side: “Which would you pick?” comparing options of ${thing}.`,
  ({ brand, month }) => `Open on the view outside: what ${month} looks like at ${brand}, and what changes this time of year.`,
  ({ thing }) => `Open on a 5-second hook “Stop scrolling if you love ${thing}”, then a quick tip that saves time or money.`,
  ({ brand }) => `Open on a packing table: how an order leaves ${brand}, from start to doorstep.`,
  ({ thing }) => `Open on a myth about ${thing} written on screen; bust it with a quick demonstration.`,
  ({ brand }) => `Open on a staff member's favourite item and why they love it — a short “team picks” video for ${brand}.`,
  ({ thing }) => `Open on a timer: “${thing} in 60 seconds” — the fastest way to get started.`,
  ({ brand }) => `Open on a happy customer at the door or counter; a 15-second testimonial for ${brand}.`,
];

const POSTS: Template[] = [
  ({ thing }) => `A carousel of five quick tips for getting the most out of ${thing}.`,
  ({ brand }) => `A customer review as a clean quote graphic, tagged and thanked, from a real ${brand} customer.`,
  ({ brand }) => `“Meet the team”: a photo and three fun facts about one person behind ${brand}.`,
  ({ thing }) => `A poll: “Which do you prefer?” with two options of ${thing}; share the result next week.`,
  ({ brand }) => `An FAQ carousel answering the four questions ${brand} hears most.`,
  ({ thing, month }) => `A “${month} favourites” post featuring the three most popular ${thing} this month.`,
  ({ brand }) => `A short story post: why ${brand} started, told in five slides.`,
  ({ thing }) => `A myth vs fact graphic about ${thing}.`,
  ({ brand }) => `A clear price list or menu graphic so followers can order from ${brand} without asking.`,
  ({ thing, month }) => `A ${month} guide: how to choose the right ${thing} for this time of year.`,
  ({ brand }) => `A thank-you post celebrating a ${brand} milestone, with a small thank-you offer.`,
  ({ thing }) => `A step-by-step “how to order” graphic for ${thing}, ending with the contact details.`,
  ({ brand }) => `A user-generated content repost: share a customer's photo of ${brand} with their permission.`,
  ({ thing }) => `A checklist graphic: “Before you buy ${thing}, check these four things.”`,
  ({ brand }) => `A behind-the-scenes photo dump from this week at ${brand}.`,
  ({ thing }) => `A comparison table: the options of ${thing} you offer, and who each one suits.`,
];

const MONTH_POSTS: Record<number, Template> = {
  0: ({ brand }) => `A New Year post: one promise ${brand} is making to customers this year.`,
  1: ({ thing }) => `A “share the love” post: ${thing} as a gift idea for someone special.`,
  5: ({ brand }) => `A mid-year check-in: the most popular thing at ${brand} so far this year.`,
  8: ({ thing }) => `A back-to-routine post: how ${thing} makes a busy season easier.`,
  10: ({ brand }) => `Early gift guide: the top picks from ${brand} to order before the rush.`,
  11: ({ brand }) => `A year-in-review carousel: ${brand}'s best moments, customers, and thank-yous.`,
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A short phrase for what the brand offers, from the "what they do" text. */
export function offering(about: string): string {
  const text = about.replace(/\s+/g, " ").trim().replace(/[.!]+$/, "");
  const sells = text.match(/\b(?:sell(?:s|ing)?|make(?:s)?|offer(?:s)?|provide(?:s)?|bake(?:s)?|cook(?:s)?|design(?:s)?|run(?:s)?|teach(?:es)?)\s+(.{3,60}?)(?:\s+(?:for|to|in|across|from|with|that|who)\b|[,;]|$)/i);
  const phrase = (sells?.[1] ?? text.split(/[,;]/)[0] ?? text).trim();
  const short = phrase.split(" ").slice(0, 6).join(" ");
  return short ? short.charAt(0).toLowerCase() + short.slice(1) : "what you offer";
}

function pickAt<T>(list: readonly T[], index: number): T {
  return list[((index % list.length) + list.length) % list.length]!;
}

// Each time a pool comes round again, the same idea gets a new angle, so no two
// weeks in the year carry the same line.
const VIDEO_TWISTS = [
  "",
  " Film it vertically and keep it under 30 seconds.",
  " Add bold on-screen captions so it works with the sound off.",
  " End with a question for the comments.",
  " Shoot it in one take, with no cuts.",
  " Use a trending sound and post it as a Reel.",
  " Let a customer or staff member narrate it.",
  " Finish on a clear call to order.",
];
const POST_TWISTS = [
  "",
  " Keep the design to your two brand colours.",
  " Pin it to the top of your profile for a week.",
  " Share it to your Story with a poll sticker.",
  " Use a real photo, not a stock image.",
  " Turn the best comment into next week's post.",
  " Add a clear “send us a message” line at the end.",
  " Post it in the evening, when your audience is online.",
];

function rotate(list: readonly Template[], twists: readonly string[], index: number, fill: Fill): string {
  const cycle = Math.floor(index / list.length);
  return `${pickAt(list, index)(fill)}${pickAt(twists, cycle)}`;
}

/** Two video ideas and two post ideas for every week. */
export function planIdeas(brand: string, about: string, slots: WeekSlot[]): WeekIdeas[] {
  const name = brand.replace(/\s+/g, " ").trim();
  const thing = offering(about);
  return slots.map((slot, index) => {
    const month = new Date(`${slot.start}T12:00:00Z`).getUTCMonth();
    const fill: Fill = { brand: name, thing, holiday: slot.holidays[0] ?? "", month: MONTHS[month]! };
    const firstOfMonth = index === 0 || new Date(`${slots[index - 1]!.start}T12:00:00Z`).getUTCMonth() !== month;
    const videoA = slot.holidays.length ? pickAt(HOLIDAY_VIDEOS, index)(fill) : rotate(VIDEOS, VIDEO_TWISTS, index * 2, fill);
    const videoB = rotate(VIDEOS, VIDEO_TWISTS, index * 2 + 1, fill);
    const postA = slot.holidays.length
      ? pickAt(HOLIDAY_POSTS, index)({ ...fill, holiday: slot.holidays[slot.holidays.length > 1 ? 1 : 0]! })
      : firstOfMonth && MONTH_POSTS[month]
        ? MONTH_POSTS[month]!(fill)
        : rotate(POSTS, POST_TWISTS, index * 2, fill);
    const postB = rotate(POSTS, POST_TWISTS, index * 2 + 1, fill);
    return { week: slot.week, videos: [videoA, videoB], posts: [postA, postB] };
  });
}
