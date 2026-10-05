// Midnry's own resume tailoring. It reorders what is already in the resume so
// the lines that match a role come first, adds a headline for that role, and
// lists the role's usual keywords the resume does not mention. It never adds a
// fact, a date, or a number. Runs on the device, with no model and no key.

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

function hits(line: string, keywords: string[]): string[] {
  const lower = line.toLowerCase();
  return keywords.filter((word) => new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^a-z0-9]|$)`).test(lower));
}

function isBullet(line: string): boolean {
  return /^\s*([-•*▪●◦]|\d+[.)])\s+/.test(line);
}

function isHeading(line: string): boolean {
  const text = line.trim();
  return HEADING.test(text) || (text.length > 2 && text.length < 40 && text === text.toUpperCase() && /[A-Z]/.test(text) && !/\d{4}/.test(text));
}

/** Reorder runs of bullet lines so the ones matching the role come first. */
function reorderBullets(lines: string[], keywords: string[]): { lines: string[]; moved: number } {
  const out: string[] = [];
  let moved = 0;
  let run: string[] = [];
  const flush = () => {
    if (run.length > 1) {
      const sorted = run
        .map((line, index) => ({ line, index, score: hits(line, keywords).length }))
        .sort((a, b) => b.score - a.score || a.index - b.index);
      sorted.forEach((item, index) => {
        if (item.index !== index) moved += 1;
      });
      out.push(...sorted.map((item) => item.line));
    } else out.push(...run);
    run = [];
  };
  for (const line of lines) {
    if (isBullet(line)) run.push(line);
    else {
      flush();
      out.push(line);
    }
  }
  flush();
  return { lines: out, moved };
}

/** Reorder a comma- or bullet-separated skills block so matching skills lead. */
function reorderSkills(lines: string[], keywords: string[]): string[] {
  return lines.map((line) => {
    if (isHeading(line) || !line.includes(",")) return line;
    const prefix = line.match(/^(\s*[^:,]{2,25}:\s*)/)?.[1] ?? "";
    const parts = line.slice(prefix.length).split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length < 3) return line;
    const sorted = parts
      .map((part, index) => ({ part, index, score: hits(part, keywords).length }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((item) => item.part);
    return `${prefix}${sorted.join(", ")}`;
  });
}

export function tailorResume(role: string, resume: string): { note: string; resume: string } {
  const keywords = keywordsFor(role);
  const lines = resume.replace(/\r/g, "").split("\n");
  const found = [...new Set(hits(resume, keywords))];
  const missing = keywords.filter((word) => !found.includes(word) && !role.toLowerCase().includes(word)).slice(0, 6);

  // Find the skills section, if any, and reorder its items.
  const sections: { start: number; name: string }[] = [];
  lines.forEach((line, index) => {
    if (isHeading(line)) sections.push({ start: index, name: line.trim().toLowerCase() });
  });
  let body = lines.slice();
  for (const [index, section] of sections.entries()) {
    if (!/skill/.test(section.name)) continue;
    const end = sections[index + 1]?.start ?? body.length;
    body = [...body.slice(0, section.start), ...reorderSkills(body.slice(section.start, end), keywords), ...body.slice(end)];
  }
  const { lines: reordered, moved } = reorderBullets(body, keywords);

  // A headline built only from words the resume already uses.
  const nameLine = reordered.findIndex((line) => line.trim().length > 0);
  const roleWords = role.toLowerCase();
  const strengths = found.filter((word) => !roleWords.includes(word)).slice(0, 5);
  // Keep the resume's own spelling, such as "TypeScript" or "SQL".
  const asWritten = (word: string) => {
    const match = resume.match(new RegExp(word.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"), "i"));
    const text = match?.[0] ?? word;
    return text === text.toLowerCase() ? text.replace(/\b\w/g, (c) => c.toUpperCase()) : text;
  };
  const headline = `${role.trim()}${strengths.length ? ` | ${strengths.map(asWritten).join(" · ")}` : ""}`;
  const contactEnd = Math.max(
    nameLine,
    ...reordered.slice(0, 6).map((line, index) => (/@|\+?\d[\d\s()-]{6,}|linkedin|github|\.com/i.test(line) ? index : -1)),
  );
  const result = [...reordered.slice(0, contactEnd + 1), "", headline, ...reordered.slice(contactEnd + 1)]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const notes = [
    `Added a headline for ${role.trim()}${strengths.length ? ` using skills already in your resume (${strengths.map(asWritten).join(", ")})` : ""}.`,
    moved ? `Moved ${moved} line${moved === 1 ? "" : "s"} that match this role to the top of their sections.` : "Your strongest matching lines were already near the top.",
    missing.length ? `This role often asks for: ${missing.join(", ")}. Add them only if they are true for you.` : "",
  ].filter(Boolean);
  return { note: notes.join(" "), resume: result };
}
