// Reading a job advert without a model: Midnry's own word lists and a few
// patterns pick out the skills, tools, qualifications, years of experience and
// repeated phrases an advert asks for, then each resume line is scored by the
// terms it contains. Everything here is deterministic and runs in the browser.

export type TermKind = "skill" | "tool" | "qualification" | "years" | "phrase";

export type Term = {
  /** Lower-case identity, unique within one advert. */
  key: string;
  /** How the term is shown to the person. */
  label: string;
  kind: TermKind;
  /** True when the advert asks for it outside a "nice to have" part. */
  required: boolean;
  /** How often the advert mentions it. */
  count: number;
  weight: number;
  /** Any one of these found in the resume counts as evidence. */
  patterns: RegExp[];
  /** Years terms: the minimum the advert asks for. */
  years?: number;
  /** Qualification with a subject ("Degree in computer science"): the subject must appear too. */
  subject?: RegExp;
};

type Vocab = { label: string; kind: "skill" | "tool"; aliases?: string[]; caseSensitive?: boolean };

// Tools and named technologies. Case-sensitive entries are ordinary English
// words too ("go", "excel at"), so only their capitalised form counts.
const TOOLS: Vocab[] = [
  ...[
    "Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator", "InDesign", "After Effects", "Premiere Pro", "Adobe Creative Suite",
    "Jira", "Confluence", "Trello", "Asana", "Monday.com", "Miro", "Salesforce", "HubSpot", "Zendesk", "Intercom", "Freshdesk",
    "SAP", "QuickBooks", "Xero", "NetSuite", "Tableau", "Power BI", "Google Analytics", "Google Ads", "Meta Ads", "Mailchimp",
    "SEMrush", "Ahrefs", "WordPress", "Shopify", "Webflow", "HTML", "CSS", "Sass", "Tailwind", "JavaScript", "TypeScript",
    "React", "React Native", "Vue", "Angular", "Svelte", "Next.js", "Node.js", "Express", "Django", "Flask", "FastAPI",
    "Laravel", "PHP", "Ruby on Rails", "Python", "Java", "Kotlin", "Scala", "C#", "C++", ".NET", "Flutter", "Dart",
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "BigQuery", "Snowflake", "dbt", "Airflow",
    "Kafka", "Hadoop", "Pandas", "NumPy", "TensorFlow", "PyTorch", "scikit-learn", "MATLAB", "SPSS", "Stata", "SAS",
    "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "GitHub Actions",
    "Git", "GitHub", "GitLab", "Linux", "GraphQL", "REST", "gRPC", "CI/CD", "Microsoft Office", "Google Workspace",
    "Google Sheets", "PowerPoint", "SharePoint", "AutoCAD", "Revit", "SolidWorks", "Canva", "Postman", "Selenium",
    "Cypress", "Playwright", "Jest", "Storybook", "Webpack", "Vite", "Unity", "Unreal Engine", "Blender", "Zapier",
  ].map((label): Vocab => ({ label, kind: "tool" })),
  ...["Go", "Golang", "R", "Rust", "Swift", "Ruby", "Excel", "Word", "Outlook", "Slack", "Notion", "Spark", "Oracle", "Looker", "Sage", "Epic", "Cerner"].map(
    (label): Vocab => ({ label, kind: "tool", caseSensitive: true }),
  ),
];

const ALIASES: Record<string, string[]> = {
  javascript: ["js", "ecmascript"],
  "node.js": ["node", "nodejs"],
  react: ["react.js", "reactjs"],
  "next.js": ["nextjs"],
  vue: ["vue.js", "vuejs"],
  postgresql: ["postgres"],
  kubernetes: ["k8s"],
  "ci/cd": ["continuous integration", "continuous delivery", "continuous deployment"],
  "power bi": ["powerbi"],
  gcp: ["google cloud"],
  "google cloud": ["gcp"],
  aws: ["amazon web services"],
  "microsoft office": ["ms office", "office 365", "microsoft 365"],
  "google workspace": ["g suite", "gsuite"],
  go: ["golang"],
  golang: ["go"],
  "a/b testing": ["ab testing", "split testing", "a/b tests"],
  "machine learning": ["ml"],
  "user experience": ["ux"],
  "search engine optimisation": ["seo"],
  seo: ["search engine optimisation", "search engine optimization"],
  crm: ["customer relationship management"],
  "ruby on rails": ["rails"],
};

// Skills, the same families the role-name mode uses plus common advert phrases.
const SKILLS: string[] = [
  "user research", "prototyping", "wireframes", "wireframing", "design system", "accessibility", "usability testing",
  "visual design", "interaction design", "branding", "typography", "roadmap", "stakeholder management", "stakeholders", "discovery",
  "prioritisation", "OKRs", "requirements gathering", "A/B testing", "dashboards", "statistics", "reporting", "data visualisation",
  "machine learning", "forecasting", "data analysis", "data modelling", "SEO", "campaigns", "content strategy", "social media",
  "email marketing", "copywriting", "paid social", "conversion", "pipeline", "CRM", "negotiation", "prospecting", "B2B", "B2C",
  "account management", "client relationships", "lead generation", "reconciliation", "IFRS", "GAAP", "audit", "budgeting",
  "financial reporting", "financial modelling", "payroll", "accounts payable", "accounts receivable", "compliance", "patient care",
  "medication administration", "triage", "infection control", "patient safety", "curriculum", "lesson planning",
  "classroom management", "safeguarding", "customer service", "customer satisfaction", "escalation", "retention", "onboarding",
  "recruitment", "employee relations", "performance management", "supply chain", "inventory", "procurement", "logistics",
  "vendor management", "process improvement", "project management", "risk management", "change management", "agile", "scrum",
  "kanban", "testing", "unit testing", "test automation", "code review", "microservices", "API design", "APIs", "system design",
  "web performance", "security", "cloud", "DevOps", "mobile", "responsive design", "front-end", "back-end", "full-stack",
  "leadership", "mentoring", "coaching", "public speaking", "presentation", "communication", "problem solving", "teamwork",
  "time management", "attention to detail", "scheduling", "data entry", "documentation", "technical writing",
  "analytics", "user experience", "product strategy", "go-to-market", "market research", "budget management", "event planning",
];

const VOCAB: Vocab[] = [...TOOLS, ...SKILLS.map((label): Vocab => ({ label, kind: "skill" }))];

// Words too common in adverts to be a requirement on their own.
const STOP = new Set(
  (
    "a an and or the of to in on for with by at from as is are be been being will would can could should may might must " +
    "our we us you your yours they their them it its this that these those who whom which what when where why how all any " +
    "each every more most other some such no not only own same so than too very just also about into over under within " +
    "across per via etc e.g i.e plus up out off if then there here do does did done have has had having get gets make " +
    "role job position team teams company work working works experience experienced years year ability able strong good " +
    "great excellent proven skills skill knowledge understanding including include includes new well using use used help " +
    "join looking candidate candidates opportunity apply application applicants based day days time full part please " +
    "responsibilities requirements required preferred desirable essential nice bonus ideal ideally someone people " +
    "environment culture benefits salary competitive offer offers support supporting ensure across key level high " +
    "within wide range one two three four five six seven eight nine ten first like want need needs closely other others " +
    "while who'll you'll we're you're it's day-to-day hands-on fast-paced world business clients client customers customer"
  ).split(/\s+/),
);

const OPTIONAL_LINE = /\b(nice[ -]to[ -]have|bonus|desirable|preferred|is a plus|a plus|would be (great|nice|a plus)|advantageous|an advantage|ideally|not required|not essential)\b/i;
const OPTIONAL_HEAD = /^\s*(nice[ -]to[ -]haves?|bonus( points)?|desirable|preferred|good to have|it would be great|extra credit|plus)\b/i;
const REQUIRED_HEAD = /^\s*(requirements?|must[ -]haves?|essential|what you('|’)ll (need|bring|do)|what we('|’)re looking for|about you|you have|you are|qualifications?|skills|responsibilities|the role|key responsibilities|who you are)\b/i;

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/** A pattern for a term: whole words, flexible spaces and hyphens, a plural "s", British and American spellings. */
export function termPattern(text: string, caseSensitive = false): RegExp {
  const body = escape(text.trim())
    .replace(/[\s-]+/g, "[\\s-]+")
    .replace(/is(ation|ations|ing|e|ed)\b/g, "i[sz]$1");
  const plural = /[a-z]$/i.test(text) ? "(?:e?s)?" : "";
  return new RegExp(`(?<![\\p{L}\\p{N}+#])${body}${plural}(?![\\p{L}\\p{N}+#]|\\.[\\p{L}])`, caseSensitive ? "u" : "iu");
}

function vocabPatterns(entry: Vocab): RegExp[] {
  const key = entry.label.toLowerCase();
  return [entry.label, ...(ALIASES[key] ?? [])].map((text, index) => termPattern(text, Boolean(entry.caseSensitive) && index === 0));
}

// "Excel at", "Go beyond", "Word of mouth": the ordinary word, not the tool.
const VERB_AFTER = /^\s+(at|of|to|above|beyond|further|through|out)\b/i;

type Line = { text: string; optional: boolean };

function advertLines(advert: string): Line[] {
  let optional = false;
  return advert
    .replace(/\r/g, "")
    .split(/\n|(?<=[.;!?])\s+(?=[A-Z])/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => {
      const short = text.length < 60;
      if (short && OPTIONAL_HEAD.test(text)) optional = true;
      else if (short && REQUIRED_HEAD.test(text)) optional = false;
      // A paragraph (not a list item) after a "nice to have" list starts a new part.
      else if (text.length > 80 && !/^([-•*▪●◦]|\d+[.)])\s/.test(text)) optional = false;
      return { text, optional: optional || OPTIONAL_LINE.test(text) };
    });
}

const DEGREES: { label: string; advert: RegExp; resume: RegExp[] }[] = [
  {
    label: "Bachelor’s degree",
    advert: /\b(bachelor('|’)?s|undergraduate degree|bsc|b\.sc|ba\/bs|bs\/ba|university degree|college degree)\b/i,
    resume: [/\b(bachelor|undergraduate degree|b\.?\s?sc|b\.?\s?eng|b\.?\s?tech|b\.?\s?com|bba|university degree)\b/i, /\b(BA|BS|B\.A\.|B\.S\.|BEng|BSc|HND)\b/],
  },
  {
    label: "Master’s degree",
    advert: /\b(master('|’)?s|msc|m\.sc|mba)\b/i,
    resume: [/\b(master('|’)?s|m\.?\s?sc|mba|m\.?\s?eng|m\.?\s?phil)\b/i, /\b(MA|MS|M\.A\.|M\.S\.)\b/],
  },
  { label: "PhD", advert: /\b(phd|ph\.d|doctorate|doctoral)\b/i, resume: [/\b(phd|ph\.d|doctorate|dphil)\b/i] },
];
const ANY_DEGREE = [/\b(degree|bachelor|master('|’)?s|b\.?\s?sc|m\.?\s?sc|mba|phd|ph\.d|hnd|diploma|b\.?\s?eng|b\.?\s?tech)\b/i, /\b(BA|BS|MA|MS)\b/];

const CERTS = [
  "PMP", "PRINCE2", "CSM", "Certified Scrum Master", "PSM", "CPA", "ACCA", "CFA", "CIMA", "ICAN", "CIPD", "CISSP", "CISM",
  "CompTIA", "CCNA", "ITIL", "Six Sigma", "Lean Six Sigma", "AWS Certified", "Azure Certified", "Google Analytics certification",
  "NMC", "BLS", "ACLS", "PALS", "CPR", "First Aid", "QTS", "PGCE", "TEFL", "CELTA", "IELTS", "Registered Nurse", "RN", "CDL",
];

function extractQualifications(lines: Line[], add: (term: Omit<Term, "count" | "weight">, optional: boolean) => void) {
  for (const line of lines) {
    const degree = DEGREES.find((item) => item.advert.test(line.text));
    const subject = line.text.match(/\bdegree\s+(?:or equivalent\s+)?in\s+([A-Za-z][A-Za-z &,/-]{2,50}?)(?=\s+or\s+(?:a\s+)?(?:related|similar|equivalent)|[.;:()\n]|,\s|\s+(?:and|with|from|is|preferred|required)\b|$)/i);
    if (subject) {
      const name = subject[1].trim().replace(/\s+/g, " ");
      const words = name.split(/\s*(?:,|\/|\bor\b|\band\b)\s*/i).map((word) => word.trim()).filter((word) => word.length > 2);
      if (words.length) {
        add(
          {
            key: `degree-in:${name.toLowerCase()}`,
            label: `${degree?.label ?? "Degree"} in ${name}`,
            kind: "qualification",
            required: !line.optional,
            patterns: degree?.resume ?? ANY_DEGREE,
            subject: new RegExp(words.map((word) => termPattern(word).source).join("|"), "iu"),
          },
          line.optional,
        );
      }
    } else if (degree) {
      add({ key: `degree:${degree.label}`, label: degree.label, kind: "qualification", required: !line.optional, patterns: degree.resume }, line.optional);
    } else if (/\b(degree|graduate)\b/i.test(line.text)) {
      add({ key: "degree:any", label: "A degree", kind: "qualification", required: !line.optional, patterns: ANY_DEGREE }, line.optional);
    }
    for (const cert of CERTS) {
      const caseSensitive = cert === cert.toUpperCase();
      if (!termPattern(cert, caseSensitive).test(line.text)) continue;
      add({ key: `cert:${cert.toLowerCase()}`, label: cert, kind: "qualification", required: !line.optional, patterns: [termPattern(cert, caseSensitive)] }, line.optional);
    }
    if (/\b(driv(ing|er('|’)?s)\s+licen[cs]e|full (uk |clean )?licen[cs]e)\b/i.test(line.text)) {
      add({ key: "licence:driving", label: "Driving licence", kind: "qualification", required: !line.optional, patterns: [/\bdriv(ing|er('|’)?s)\s+licen[cs]e\b/i, /\bfull (uk |clean )?licen[cs]e\b/i] }, line.optional);
    }
  }
}

const YEARS = /\b(?:at least|minimum(?: of)?|over|more than)?\s*(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?(?:\+\s*)?years?(?:('|’)s?)?\s+(?:of\s+)?((?:[\w-]+\s+){0,3}?)experience(?:\s+(in|with|as|of|on|building|leading|managing|running|working)\s+([^.,;:()\n]{2,48}))?/gi;

function extractYears(lines: Line[], add: (term: Omit<Term, "count" | "weight">, optional: boolean) => void) {
  for (const line of lines) {
    for (const match of line.text.matchAll(YEARS)) {
      const years = Number(match[1]);
      if (!years || years > 40) continue;
      const area = (match[5] ?? "").trim().replace(/\s+(?:and|or|is|are|will|preferred|required)$/i, "");
      const label = `${years}+ years of experience${area ? ` ${match[4].toLowerCase()} ${area}` : ""}`;
      add({ key: `years:${years}:${area.toLowerCase()}`, label, kind: "years", required: !line.optional, patterns: [], years }, line.optional);
    }
  }
}

function tokens(text: string): { word: string; raw: string }[] {
  return [...text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}+#.'’/-]*[\p{L}\p{N}+#]|[\p{L}\p{N}]/gu)].map((match) => ({
    raw: match[0],
    word: match[0].toLowerCase().replace(/[’']s$/, ""),
  }));
}

function extractPhrases(lines: Line[], taken: (key: string) => boolean, add: (term: Omit<Term, "count" | "weight">, optional: boolean) => void) {
  type Gram = { label: string; count: number; optional: boolean; lowerSeen: boolean };
  const grams = new Map<string, Gram>();
  for (const line of lines) {
    // Phrases do not cross punctuation.
    for (const part of line.text.split(/[,;:()•·|!?"“”]|\.\s|\s[-–—]\s/)) {
      const words = tokens(part);
      for (let size = 1; size <= 3; size++) {
        for (let i = 0; i + size <= words.length; i++) {
          const slice = words.slice(i, i + size);
          if (STOP.has(slice[0].word) || STOP.has(slice[size - 1].word)) continue;
          if (slice.some((item) => /^\d+$/.test(item.word))) continue;
          if (size === 1 && slice[0].word.length < 4) continue;
          const key = slice.map((item) => item.word).join(" ");
          const gram = grams.get(key) ?? { label: slice.map((item) => item.raw).join(" "), count: 0, optional: true, lowerSeen: false };
          gram.count += 1;
          gram.optional &&= line.optional;
          // Always capitalised (and not at the start of a line): a name, such as the employer's.
          if (slice.some((item) => item.raw === item.word)) gram.lowerSeen = true;
          grams.set(key, gram);
        }
      }
    }
  }
  const chosen: [string, Gram][] = [];
  const sorted = [...grams.entries()]
    .filter(([key, gram]) => gram.count >= (key.includes(" ") ? 2 : 3) && gram.lowerSeen && !taken(key))
    .sort((a, b) => b[0].split(" ").length - a[0].split(" ").length || b[1].count - a[1].count);
  for (const [key, gram] of sorted) {
    // A shorter phrase that only ever appears inside a longer chosen one adds nothing.
    if (chosen.some(([longer, other]) => ` ${longer} `.includes(` ${key} `) && other.count >= gram.count)) continue;
    chosen.push([key, gram]);
  }
  for (const [key, gram] of chosen.slice(0, 12)) {
    for (let i = 0; i < gram.count; i++) {
      add({ key, label: gram.label.toLowerCase() === gram.label ? gram.label : key, kind: "phrase", required: !gram.optional, patterns: [termPattern(key)] }, gram.optional);
    }
  }
}

const KIND_WEIGHT: Record<TermKind, number> = { tool: 3, skill: 3, qualification: 3, years: 2, phrase: 2 };

/** The requirements and terms an advert asks for, strongest first. */
export function extractTerms(advert: string, limit = 30): Term[] {
  const lines = advertLines(advert.slice(0, 20_000));
  const terms = new Map<string, Omit<Term, "weight">>();
  const add = (term: Omit<Term, "count" | "weight">, optional: boolean) => {
    const existing = terms.get(term.key);
    if (existing) {
      existing.count += 1;
      existing.required ||= !optional;
    } else terms.set(term.key, { ...term, required: !optional, count: 1 });
  };

  extractQualifications(lines, add);
  extractYears(lines, add);
  for (const line of lines) {
    // "Requirements", "Skills": a heading names a part of the advert, not a skill.
    if (line.text.length < 60 && (REQUIRED_HEAD.test(line.text) || OPTIONAL_HEAD.test(line.text)) && !/[,:]\s*\S/.test(line.text)) continue;
    for (const entry of VOCAB) {
      const key = entry.label.toLowerCase();
      // The alias of a term already counted on this line is the same mention.
      const own = termPattern(entry.label, Boolean(entry.caseSensitive));
      // A capitalised ordinary word ("Excel at…", "Go further") at the start of a line is not the tool.
      const matches = [...line.text.matchAll(new RegExp(own.source, `${own.flags}g`))].filter((m) => !entry.caseSensitive || ((m.index ?? 0) > 0 && !VERB_AFTER.test(line.text.slice((m.index ?? 0) + m[0].length)))).length;
      for (let i = 0; i < matches; i++) add({ key, label: entry.label, kind: entry.kind, required: !line.optional, patterns: vocabPatterns(entry) }, line.optional);
    }
  }
  // A phrase that overlaps a term already found ("design systems", "react developer") adds nothing.
  const covers = (key: string) =>
    [...terms.values()].some(
      (term) =>
        term.kind !== "years" &&
        term.kind !== "qualification" &&
        (term.patterns.some((pattern) => pattern.test(key)) || termPattern(key).test(term.key)),
    );
  extractPhrases(lines, covers, add);

  const weighted: Term[] = [...terms.values()].map((term) => ({
    ...term,
    weight: KIND_WEIGHT[term.kind] * (term.required ? 1 : 0.5) + Math.min(term.count - 1, 3) * 0.5,
  }));
  return weighted
    .sort((a, b) => b.weight - a.weight || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/** Terms for a role name only (no advert): the role's usual keyword family. */
export function roleTerms(role: string, keywords: string[]): Term[] {
  return keywords.map((word) => {
    const entry =
      VOCAB.find((item) => item.label.toLowerCase() === word) ?? VOCAB.find((item) => ALIASES[item.label.toLowerCase()]?.includes(word));
    return {
      key: word,
      label: entry?.label ?? word,
      kind: entry?.kind ?? "skill",
      required: false,
      count: 1,
      weight: 1,
      patterns: entry ? vocabPatterns(entry) : [termPattern(word)],
    };
  });
}

/** Where the term is written in this text, exactly as written, or null. */
export function findTerm(text: string, term: Term): string | null {
  if (term.subject && !term.subject.test(text)) return null;
  for (const pattern of term.patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export type LineScore = { score: number; matched: string[] };

/** A resume line's score: the summed weight of the terms it contains. */
export function scoreLine(line: string, terms: Term[]): LineScore {
  const matched: string[] = [];
  let score = 0;
  for (const term of terms) {
    if (term.kind === "years") continue;
    if (findTerm(line, term)) {
      matched.push(term.key);
      score += term.weight;
    }
  }
  return { score, matched };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+";
const RANGE = new RegExp(`(?:${MONTH})?((?:19|20)\\d{2})\\s*(?:-|–|—|to|until)\\s*(?:(?:${MONTH})?((?:19|20)\\d{2})|(present|current|now|today|date))`, "gi");

/**
 * Years of experience the resume itself shows: the union of its date ranges
 * ("2019 – 2023", "Mar 2021 - Present"), counted once where they overlap, or
 * a stated "N years" if that is more. Never more than the resume says.
 */
export function resumeYears(resume: string, now: Date = new Date()): { years: number; source: "dates" | "stated" | null } {
  const spans: [number, number][] = [];
  const current = now.getFullYear() * 12 + now.getMonth();
  for (const match of resume.matchAll(RANGE)) {
    const startMonth = match[1] ? MONTHS.indexOf(match[1].toLowerCase().slice(0, 3)) : 0;
    const start = Number(match[2]) * 12 + Math.max(startMonth, 0);
    let end: number;
    if (match[5]) end = current;
    else {
      const endMonth = match[3] ? MONTHS.indexOf(match[3].toLowerCase().slice(0, 3)) : 11;
      end = Number(match[4]) * 12 + Math.max(endMonth, 0);
    }
    if (end >= start && end <= current + 12) spans.push([start, Math.min(end, current)]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  let months = 0;
  let open: [number, number] | null = null;
  for (const span of spans) {
    if (open && span[0] <= open[1]) open[1] = Math.max(open[1], span[1]);
    else {
      if (open) months += open[1] - open[0];
      open = [...span];
    }
  }
  if (open) months += open[1] - open[0];
  const fromDates = Math.floor(months / 12);
  const stated = Math.max(0, ...[...resume.matchAll(/\b(\d{1,2})\s*\+?\s*years?(?:('|’)s?)?\s+(?:of\s+)?(?:[\w-]+\s+){0,2}?experience\b/gi)].map((m) => Number(m[1])));
  if (stated > fromDates) return { years: stated, source: "stated" };
  return { years: fromDates, source: spans.length ? "dates" : null };
}
