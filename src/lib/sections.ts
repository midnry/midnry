export const AUDIENCES = [
  { id: "students", label: "Students", blurb: "By field of study." },
  { id: "professionals", label: "Professionals", blurb: "By the job you do." },
  { id: "owners", label: "Business owners", blurb: "By the kind of business." },
  { id: "seniors", label: "Seniors", blurb: "By what you need done." },
] as const;

export type AudienceId = (typeof AUDIENCES)[number]["id"];

export const SECTIONS = [
  { id: "medicine", audience: "students", label: "Medicine & Nursing", blurb: "Dosage, anatomy, and case drills." },
  { id: "engineering", audience: "students", label: "Engineering", blurb: "Units, formulas, and circuits." },
  { id: "law", audience: "students", label: "Law", blurb: "Briefs, citations, and practice questions." },
  { id: "accounting", audience: "students", label: "Business & Accounting", blurb: "Ratios, statements, and break-even." },
  { id: "computing", audience: "students", label: "Computer Science", blurb: "Explain code, find bugs, see an algorithm." },
  { id: "arts", audience: "students", label: "Arts & Humanities", blurb: "Outlines, citations, and summaries." },
  { id: "science", audience: "students", label: "Sciences", blurb: "Lab notes, formulas, and graphs." },
  { id: "teaching", audience: "professionals", label: "Teachers", blurb: "Lessons, quizzes, and report comments." },
  { id: "clinic", audience: "professionals", label: "Healthcare workers", blurb: "Shifts, notes, and a dosage reference." },
  { id: "developers", audience: "professionals", label: "Developers", blurb: "Regex, JSON, and READMEs." },
  { id: "marketing", audience: "professionals", label: "Sales & Marketing", blurb: "Emails, ads, and proposals." },
  { id: "books", audience: "professionals", label: "Accountants", blurb: "Tax, reconciliation, and budgets." },
  { id: "practice", audience: "professionals", label: "Lawyers", blurb: "Contracts, clauses, and letters." },
  { id: "creatives", audience: "professionals", label: "Creatives", blurb: "Briefs, mood, and client terms." },
  { id: "retail", audience: "owners", label: "Retail & Shops", blurb: "Stock, prices, and profit." },
  { id: "kitchen", audience: "owners", label: "Food & Restaurant", blurb: "Menus, recipe cost, and a QR menu." },
  { id: "beauty", audience: "owners", label: "Fashion & Beauty", blurb: "Bookings, a catalog, and captions." },
  { id: "freelance", audience: "owners", label: "Freelancers & Services", blurb: "Invoices, quotes, and contracts." },
  { id: "sellers", audience: "owners", label: "Online sellers", blurb: "Listings, orders, and WhatsApp replies." },
  { id: "agro", audience: "owners", label: "Farmers & Agro", blurb: "Yield, prices, and a sales book." },
  { id: "elder-health", audience: "seniors", label: "Health", blurb: "Medicines, appointments, and symptoms." },
  { id: "safety", audience: "seniors", label: "Safety", blurb: "Scams, an emergency card, and shaky claims." },
  { id: "family", audience: "seniors", label: "Family", blurb: "Voice notes, clearer photos, and how to call." },
  { id: "elder-money", audience: "seniors", label: "Money", blurb: "Savings, bills, and a simple budget." },
  { id: "hobbies", audience: "seniors", label: "Hobbies", blurb: "Recipes, reading aloud, and a memoir." },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

const LEGACY: Record<string, SectionId> = {
  writing: "arts",
  focus: "computing",
  money: "books",
  work: "freelance",
  code: "developers",
  design: "creatives",
  health: "clinic",
};

export type GenreId = SectionId | keyof typeof LEGACY;

export function isAudience(value: string): value is AudienceId {
  return AUDIENCES.some((item) => item.id === value);
}

export function isSection(value: string): value is SectionId {
  return SECTIONS.some((item) => item.id === value);
}

export function isGenre(value: string): value is GenreId {
  return isSection(value) || value in LEGACY;
}

export function sectionOf(value: string): SectionId | null {
  if (isSection(value)) return value;
  return LEGACY[value] ?? null;
}

export function genreLabel(id: string): string {
  return SECTIONS.find((item) => item.id === id)?.label ?? (id in LEGACY ? genreLabel(LEGACY[id]) : "Other");
}

export function audienceOf(section: string): AudienceId | null {
  return SECTIONS.find((item) => item.id === section)?.audience ?? null;
}

export function sectionsIn(audience: AudienceId) {
  return SECTIONS.filter((item) => item.audience === audience);
}

export const GENRES = SECTIONS.map((item) => ({ id: item.id, label: item.label }));

// Audience tags. Separate from AUDIENCES above, which group the genre
// sections: an app can carry several tags, and "everyday" is shared by all.
export const TAGS = [
  { id: "business", label: "Business Owners", blurb: "Run the shop, the kitchen, or the client work." },
  { id: "professionals", label: "Professionals", blurb: "Tools for the job you do." },
  { id: "students", label: "Students", blurb: "Study, revise, and hand in." },
  { id: "everyday", label: "Everyday", blurb: "Useful to anyone, any day." },
] as const;

export type TagId = (typeof TAGS)[number]["id"];

export function isTag(value: string): value is TagId {
  return TAGS.some((item) => item.id === value);
}

export function tagLabel(id: TagId): string {
  return TAGS.find((item) => item.id === id)?.label ?? id;
}

/** Keeps known tags only, de-duplicated, in TAGS order. */
export function cleanTags(values: readonly unknown[]): TagId[] {
  return TAGS.map((item) => item.id).filter((id) => values.includes(id));
}

/** Tags stored in a text column as "a,b,c". */
export function parseTags(raw: string | null | undefined): TagId[] {
  return cleanTags((raw ?? "").split(",").map((item) => item.trim()));
}

/** The tag an app gets from its genre section when nothing else says otherwise. */
export function defaultTagOf(genre: string): TagId | null {
  const audience = audienceOf(sectionOf(genre) ?? "");
  if (audience === "students") return "students";
  if (audience === "professionals") return "professionals";
  if (audience === "owners") return "business";
  if (audience === "seniors") return "everyday";
  return null;
}
