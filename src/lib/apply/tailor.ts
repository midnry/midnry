// Midnry's own resume tailoring. It reorders what is already in the resume so
// the lines with the strongest evidence for a job come first, adds a headline
// for that job, and lists what the job asks for that the resume does and does
// not show. With a pasted job advert it matches the advert's own terms (see
// match.ts); with a role name only, the role's usual keyword family.
//
// The promise, tested in scripts/apply-tailor.test.mjs: every line of the
// result is a line of the resume, a skills line with its own items in another
// order, or the headline, which is the role plus terms written in the resume.
// It never adds a fact, a skill, a date, or a number. Runs on the device, with
// no model and no key.

import { extractTerms, findTerm, resumeYears, roleTerms, scoreLine, type Term, type TermKind } from "@/lib/apply/match";

const FAMILIES: [RegExp, string[]][] = [
  [/engineer|developer|programmer|software|frontend|front-end|backend|back-end|full[- ]?stack|devops|mobile/i, ["javascript", "typescript", "react", "node", "python", "java", "api", "sql", "git", "testing", "cloud", "aws", "docker", "ci/cd", "agile", "performance", "security"]],
  [/design|ux|ui\b|product designer|graphic/i, ["figma", "user research", "prototyping", "wireframes", "design system", "accessibility", "usability testing", "visual design", "interaction design", "adobe", "branding"]],
  [/product manager|product owner|\bpm\b/i, ["roadmap", "stakeholders", "metrics", "discovery", "prioritisation", "prioritization", "launch", "user research", "agile", "okrs", "requirements", "a/b testing"]],
  [/data|analyst|analytics|scientist|bi\b/i, ["sql", "python", "excel", "dashboards", "tableau", "power bi", "statistics", "reporting", "data visualisation", "data visualization", "machine learning", "forecasting"]],
  [/market|seo|content|social media|brand|growth|communications/i, ["seo", "campaigns", "content", "social media", "analytics", "email marketing", "copywriting", "brand", "paid ads", "conversion", "engagement"]],
  [/sales|account executive|business development|bdr|sdr/i, ["pipeline", "crm", "quota", "negotiation", "prospecting", "b2b", "closing", "client relationships", "revenue", "targets", "salesforce"]],
  [/account|finance|audit|tax|bookkeep|treasury/i, ["reconciliation", "ifrs", "audit", "tax", "budgeting", "excel", "financial reporting", "payroll", "accounts payable", "accounts receivable", "forecasting", "compliance"]],
  [/nurse|nursing|clinical|health|medical|doctor|pharmac|caregiver/i, ["patient care", "clinical", "medication", "triage", "documentation", "infection control", "patient safety", "assessment", "teamwork", "compassion"]],
  [/teacher|tutor|lecturer|educator|teaching/i, ["curriculum", "lesson planning", "assessment", "classroom management", "differentiation", "student progress", "parents", "safeguarding"]],
  [/support|customer service|customer success|call cent|help ?desk/i, ["customer service", "tickets", "resolution", "crm", "customer satisfaction", "communication", "escalation", "zendesk", "retention"]],
  [/project|programme|program manager|scrum|delivery/i, ["planning", "budget", "stakeholders", "risk", "timeline", "agile", "scrum", "jira", "delivery", "reporting", "scope"]],
  [/admin|assistant|secretary|receptionist|office/i, ["scheduling", "calendar", "documentation", "microsoft office", "communication", "filing", "organisation", "organization", "data entry"]],
  [/\bhr\b|human resources|recruit|talent|people/i, ["recruitment", "onboarding", "employee relations", "payroll", "hr policies", "interviews", "training", "performance management"]],
  [/operations|logistics|supply|procure|warehouse|inventory/i, ["supply chain", "inventory", "procurement", "logistics", "vendors", "cost reduction", "process improvement", "scheduling"]],
];

const GENERIC = ["communication", "teamwork", "problem solving", "leadership", "results"];
const HEADING = /^(summary|profile|professional summary|about me|objective|experience|work experience|employment( history)?|professional experience|education|skills|technical skills|key skills|projects|certifications?|awards|languages|interests|volunteer(ing)?|references)\s*:?\s*$/i;

function keywordsFor(role: string): string[] {
  const family = FAMILIES.filter(([test]) => test.test(role)).flatMap(([, list]) => list);
  const own = role
    .toLowerCase()
    .split(/[^a-z0-9+#/.-]+/)
    .filter((word) => word.length > 2 && !/^(senior|junior|lead|head|the|and|for|with|intern)$/.test(word));
  return [...new Set([...own, ...(family.length ? family : GENERIC)])];
}

function isBullet(line: string): boolean {
  return /^\s*([-•*▪●◦]|\d+[.)])\s+/.test(line);
}

function isHeading(line: string): boolean {
  const text = line.trim();
  return HEADING.test(text) || (text.length > 2 && text.length < 40 && text === text.toUpperCase() && /[A-Z]/.test(text) && !/\d{4}/.test(text));
}

export type Change =
  | { id: "headline"; kind: "headline"; text: string; after: number }
  | { id: string; kind: "move"; line: number; from: number; to: number; text: string; section: string; terms: string[] }
  | { id: string; kind: "skills"; line: number; text: string; before: string; section: string; terms: string[] };

export type Coverage = {
  key: string;
  label: string;
  kind: TermKind;
  required: boolean;
  /** The resume line (or date summary) that shows it; only for covered terms. */
  evidence?: string;
};

type Run = { start: number; items: { index: number; score: number }[] };

export type TailorPlan = {
  role: string;
  fromAdvert: boolean;
  /** The resume's lines, unchanged. */
  original: string[];
  terms: Term[];
  covered: Coverage[];
  missing: Coverage[];
  /** Per original line: the score and the terms that matched. */
  scores: { score: number; matched: string[] }[];
  runs: Run[];
  changes: Change[];
};

export type TailoredLine = {
  text: string;
  /** Index in the original resume, or -1 for the headline and blank spacing. */
  source: number;
  /** The change that put this line here, when it is still applied. */
  change?: string;
};

function sectionAbove(lines: string[], index: number): string {
  for (let i = index; i >= 0; i--) if (isHeading(lines[i])) return lines[i].trim().replace(/:$/, "");
  return "";
}

/** The skills section's comma lists, items with the strongest evidence first. */
function skillChanges(lines: string[], terms: Term[]): Change[] {
  const changes: Change[] = [];
  const starts = lines.map((line, index) => (isHeading(line) ? index : -1)).filter((index) => index >= 0);
  starts.forEach((start, n) => {
    if (!/skill/i.test(lines[start])) return;
    const end = starts[n + 1] ?? lines.length;
    for (let i = start + 1; i < end; i++) {
      const line = lines[i];
      if (!line.includes(",")) continue;
      const prefix = line.match(/^(\s*[^:,]{2,25}:\s*)/)?.[1] ?? "";
      const parts = line.slice(prefix.length).split(",").map((part) => part.trim()).filter(Boolean);
      if (parts.length < 3) continue;
      const scored = parts.map((part, index) => ({ part, index, ...scoreLine(part, terms) }));
      const sorted = [...scored].sort((a, b) => b.score - a.score || a.index - b.index);
      if (sorted.every((item, index) => item.index === index)) continue;
      changes.push({
        id: `skills:${i}`,
        kind: "skills",
        line: i,
        before: line,
        text: `${prefix}${sorted.map((item) => item.part).join(", ")}`,
        section: lines[start].trim().replace(/:$/, ""),
        terms: [...new Set(scored.flatMap((item) => item.matched))],
      });
    }
  });
  return changes;
}

/** Runs of consecutive bullet lines, each item with its score. */
function bulletRuns(lines: string[], scores: { score: number }[]): Run[] {
  const runs: Run[] = [];
  let run: Run | null = null;
  lines.forEach((line, index) => {
    if (isBullet(line)) {
      run ??= { start: index, items: [] };
      run.items.push({ index, score: scores[index].score });
    } else if (run) {
      runs.push(run);
      run = null;
    }
  });
  if (run) runs.push(run);
  return runs.filter((item) => item.items.length > 1);
}

/** The order of one run: kept promotions by score, then the rest as they were. */
function orderRun(run: Run, reverted: ReadonlySet<string>): { index: number; promoted: boolean }[] {
  const promoted = run.items
    .filter((item) => item.score > 0 && !reverted.has(`move:${item.index}`))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const rest = run.items.filter((item) => !promoted.includes(item));
  return [...promoted.map((item) => ({ index: item.index, promoted: true })), ...rest.map((item) => ({ index: item.index, promoted: false }))];
}

/** The line after the name and contact details, where the headline goes. */
function headlineAfter(lines: string[]): number {
  const nameLine = lines.findIndex((line) => line.trim().length > 0);
  return Math.max(
    nameLine,
    ...lines.slice(0, 6).map((line, index) => (/@|\+?\d[\d\s()-]{6,}|linkedin|github|\.com/i.test(line) ? index : -1)),
  );
}

function asWritten(found: string): string {
  return found === found.toLowerCase() ? found.replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()) : found;
}

export function planTailoring(role: string, resume: string, advert = "", now: Date = new Date()): TailorPlan {
  const roleName = role.trim();
  const original = resume.replace(/\r/g, "").split("\n");
  const fromAdvert = advert.trim().length >= 40;
  const terms = fromAdvert ? extractTerms(advert) : roleTerms(roleName, keywordsFor(roleName));
  const scores = original.map((line) => scoreLine(line, terms));

  const covered: Coverage[] = [];
  const missing: Coverage[] = [];
  const years = resumeYears(resume, now);
  for (const term of terms) {
    const entry: Coverage = { key: term.key, label: term.label, kind: term.kind, required: term.required };
    if (term.kind === "years") {
      if (years.source && years.years >= (term.years ?? 0)) {
        covered.push({ ...entry, evidence: years.source === "dates" ? `The dates in your resume add up to about ${years.years} years.` : `Your resume says ${years.years} years.` });
      } else missing.push(entry);
      continue;
    }
    const line = original.find((text) => findTerm(text, term));
    if (line) covered.push({ ...entry, evidence: line.trim() });
    // A role-name word the person typed is not a gap in their resume.
    else if (fromAdvert || !roleName.toLowerCase().includes(term.key)) missing.push(entry);
  }

  const runs = bulletRuns(original, scores);
  const changes: Change[] = [];

  // The headline: the role, then up to four terms the resume itself contains,
  // spelled as the resume spells them.
  const strengths: string[] = [];
  for (const term of [...terms].sort((a, b) => b.weight - a.weight)) {
    if (strengths.length === 4) break;
    if (term.kind === "years" || term.kind === "qualification") continue;
    if (roleName.toLowerCase().includes(term.key)) continue;
    const found = original.map((line) => findTerm(line, term)).find(Boolean);
    if (!found) continue;
    const text = asWritten(found.replace(/\s+/g, " "));
    if (!strengths.some((item) => item.toLowerCase() === text.toLowerCase())) strengths.push(text);
  }
  changes.push({
    id: "headline",
    kind: "headline",
    text: `${roleName}${strengths.length ? ` | ${strengths.join(" · ")}` : ""}`,
    after: headlineAfter(original),
  });

  for (const run of runs) {
    const order = orderRun(run, new Set());
    order.forEach((item, to) => {
      const from = run.items.findIndex((other) => other.index === item.index);
      if (to >= from) return;
      changes.push({
        id: `move:${item.index}`,
        kind: "move",
        line: item.index,
        from,
        to,
        text: original[item.index],
        section: sectionAbove(original, run.start),
        terms: scores[item.index].matched,
      });
    });
  }
  changes.push(...skillChanges(original, terms));
  return { role: roleName, fromAdvert, original, terms, covered, missing, scores, runs, changes };
}

/** The tailored resume, line by line, with the reverted changes left out. */
export function composeLines(plan: TailorPlan, reverted: Iterable<string> = []): TailoredLine[] {
  const off = new Set(reverted);
  const lines: TailoredLine[] = plan.original.map((text, source) => ({ text, source }));
  for (const change of plan.changes) {
    if (change.kind === "skills" && !off.has(change.id)) lines[change.line] = { text: change.text, source: change.line, change: change.id };
  }
  const moveIds = new Set(plan.changes.filter((change) => change.kind === "move").map((change) => change.id));
  // Read from a copy: a run is rewritten in place.
  const before = lines.slice();
  for (const run of plan.runs) {
    const slots = run.items.map((item) => item.index);
    orderRun(run, off).forEach((item, n) => {
      const id = `move:${item.index}`;
      lines[slots[n]] = { ...before[item.index], change: moveIds.has(id) && !off.has(id) ? id : before[item.index].change };
    });
  }
  const headline = plan.changes.find((change) => change.kind === "headline");
  if (headline && !off.has("headline")) {
    lines.splice(headline.after + 1, 0, { text: "", source: -1 }, { text: headline.text, source: -1, change: "headline" }, { text: "", source: -1 });
  }
  // One blank line between blocks, none at the ends.
  const out: TailoredLine[] = [];
  for (const line of lines) {
    const blank = line.text.trim() === "";
    if (blank && (out.length === 0 || out.at(-1)!.text === "")) continue;
    out.push(blank ? { text: "", source: line.source } : line);
  }
  while (out.length && out.at(-1)!.text === "") out.pop();
  return out;
}

export function composeResume(plan: TailorPlan, reverted: Iterable<string> = []): string {
  return composeLines(plan, reverted)
    .map((line) => line.text)
    .join("\n");
}

/** A plain description of one change, for the list of changes. */
export function describeChange(change: Change, plan: TailorPlan): string {
  const label = (key: string) => plan.terms.find((term) => term.key === key)?.label ?? key;
  if (change.kind === "headline") return "Added a headline for this job";
  if (change.kind === "skills") return `Put the matching skills first${change.section ? ` in ${change.section}` : ""}`;
  const places = change.from - change.to;
  const why = change.terms.length ? ` (${change.terms.slice(0, 3).map(label).join(", ")})` : "";
  return `Moved up ${places} place${places === 1 ? "" : "s"}${change.section ? ` in ${change.section}` : ""}${why}`;
}

export function noteFor(plan: TailorPlan, reverted: Iterable<string> = []): string {
  const off = new Set(reverted);
  const moved = plan.changes.filter((change) => change.kind === "move" && !off.has(change.id)).length;
  const headline = plan.changes.find((change) => change.kind === "headline");
  const strengths = headline && headline.text.includes(" | ") ? headline.text.split(" | ")[1].split(" · ") : [];
  const gaps = plan.missing.slice(0, plan.fromAdvert ? 8 : 6).map((item) => item.label);
  const notes = [
    headline && !off.has("headline")
      ? `Added a headline for ${plan.role}${strengths.length ? ` using skills already in your resume (${strengths.join(", ")})` : ""}.`
      : "",
    moved
      ? `Moved ${moved} line${moved === 1 ? "" : "s"} that match ${plan.fromAdvert ? "the advert" : "this role"} to the top of their sections.`
      : "Your strongest matching lines were already near the top.",
    gaps.length
      ? `${plan.fromAdvert ? "The advert asks for" : "This role often asks for"}: ${gaps.join(", ")}. Add them only if they are true for you.`
      : "",
  ].filter(Boolean);
  return notes.join(" ");
}

/** The role-name tailoring the app had before adverts, kept for callers that want text only. */
export function tailorResume(role: string, resume: string, advert = ""): { note: string; resume: string } {
  const plan = planTailoring(role, resume, advert);
  return { note: noteFor(plan), resume: composeResume(plan) };
}
