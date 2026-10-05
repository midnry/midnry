// Small text helpers shared by Midnry's built-in writers. Everything here runs
// on the visitor's device: no network, no model, no key.

export const STOPWORDS = new Set(
  (
    "a an the and or but if then so of to in on at by for with from as is are was were be been being it its this that these those " +
    "i me my we our you your he him his she her they them their there here what which who whom whose when where why how all any both " +
    "each few more most other some such no nor not only own same than too very can will just should now also into over under again " +
    "about after before between during out up down off once do does did doing have has had having would could may might must shall " +
    "one two per via etc said says upon within without while because until whether"
  ).split(" "),
);

/** Split prose into sentences, keeping abbreviations like "e.g." and decimals intact. */
export function sentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const protectedText = clean
    .replace(/\b(e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|Prof|No|St|Ltd|Inc|Co|Art|Sec|cf)\./gi, (match) => match.replace(/\./g, "§"))
    .replace(/(\d)\.(\d)/g, "$1§$2");
  return protectedText
    .split(/(?<=[.!?])\s+(?=["'“(]?[A-Z0-9])/)
    .map((item) => item.replace(/§/g, ".").trim())
    .filter((item) => item.length > 1);
}

/** Lower-case content words, without stopwords or very short tokens. */
export function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter((word) => !STOPWORDS.has(word));
}

/** Pick one of several phrasings, so "Try another wording" changes the output. */
export function pick<T>(options: readonly T[], variant: number, salt = 0): T {
  return options[Math.abs(variant + salt) % options.length] as T;
}

export function clean(value: string | undefined): string {
  return (value ?? "").replace(/[ \t]+/g, " ").trim();
}

/** Sentence-case the first letter and make sure the text ends with punctuation. */
export function sentence(value: string | undefined): string {
  const text = clean(value);
  if (!text) return "";
  const first = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?…:]$/.test(first) ? first : `${first}.`;
}

/** Lower-case the first letter, for dropping a phrase into the middle of a sentence. */
export function inline(value: string | undefined): string {
  const text = clean(value).replace(/[.!?]+$/, "");
  if (!text) return "";
  if (/^[A-Z]{2,}/.test(text) || /^I\b/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Lines of a field: split on new lines, commas, or semicolons. */
export function items(value: string | undefined): string[] {
  return clean(value)
    .split(/\n|;|,(?![^(]*\))/)
    .map((item) => item.replace(/^(?:[-•*]\s*|\d+[.)]\s+)/, "").trim())
    .filter(Boolean);
}

/** "a, b and c" */
export function list(values: string[]): string {
  const parts = values.filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Turn free text into tidy bullet lines. */
export function bullets(value: string | undefined): string[] {
  const raw = (value ?? "").trim();
  if (!raw) return [];
  const byLine = raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);
  const source = byLine.length > 1 ? byLine : sentences(raw);
  return source.map((line) => sentence(line));
}

export function longDate(date = new Date()): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** The most frequent content words, for hashtags and keywords. */
export function topWords(text: string, count: number): string[] {
  const tally = new Map<string, number>();
  for (const word of words(text)) tally.set(word, (tally.get(word) ?? 0) + 1);
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([word]) => word);
}

/** Capitalise only the first letter. */
export function capital(value: string): string {
  const text = clean(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function titleCase(value: string): string {
  return clean(value)
    .split(" ")
    .map((word, index) =>
      /^(v|vs)\.?$/i.test(word)
        ? word.toLowerCase()
        : index > 0 && /^(a|an|the|and|or|of|for|to|in|on|with|by)$/i.test(word)
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}
