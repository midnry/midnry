import type { SectionId } from "@/lib/sections";

/**
 * A form box. `legacy` marks a box that only older saved rows use: it shows on a
 * row (and in its edit form) when that row has a value, and is not offered for
 * new entries, so old rows keep loading exactly as they were saved.
 */
export type Field = { id: string; label: string; kind?: "text" | "number" | "area" | "date" | "time"; placeholder?: string; legacy?: boolean };
export type Line = { label: string; value: string };
export type Card = { front: string; back: string };
export type Question = { q: string; options: string[]; answer: number; why: string };
export type Entry = { title: string; body: string };
/** A second list inside a tracker (Farm sales: Sales · Price log). A view without fields is the main list. */
export type TrackerView = { id: string; label: string; fields?: Field[]; blurb?: string };
/** A QR code section under a tracker (Menu). It encodes a link the person already has; nothing is hosted. */
export type QrSection = { title: string; blurb: string };

type Base = {
  slug: string;
  name: string;
  blurb: string;
  section: SectionId;
  features: string[];
  guide: string[];
  note?: string;
};

export type Kit = Base &
  (
    | { kind: "calc"; fields: Field[]; run: (v: Record<string, string>) => Line[] }
    | { kind: "template"; parts: Field[] }
    | { kind: "tracker"; fields: Field[]; views?: TrackerView[]; qr?: QrSection }
    | { kind: "cards"; deck: Card[] }
    | { kind: "quiz"; questions: Question[] }
    | { kind: "write" }
    | { kind: "cite"; mode: "paper" | "legal" }
    | { kind: "list"; items: Entry[] }
    | { kind: "units" }
    | { kind: "ohm" }
    | { kind: "regex" }
    | { kind: "json" }
    | { kind: "algo" }
    | { kind: "plot" }
    | { kind: "solver" }
    | { kind: "qr" }
    | { kind: "tax" }
    | { kind: "voice" }
    | { kind: "photo" }
    | { kind: "speak" }
    | { kind: "steps"; steps: Entry[] }
    | { kind: "scam" }
    | { kind: "mood" }
    | { kind: "ratios" }
    | { kind: "even" }
    | { kind: "reconcile" }
  );

const f = (id: string, label: string, placeholder?: string): Field => ({ id, label, placeholder });
const n = (id: string, label: string, placeholder?: string): Field => ({ id, label, kind: "number", placeholder });
const a = (id: string, label: string, placeholder?: string): Field => ({ id, label, kind: "area", placeholder });
const d = (id: string, label: string): Field => ({ id, label, kind: "date" });
const t = (id: string, label: string): Field => ({ id, label, kind: "time" });
const old = (id: string, label: string): Field => ({ id, label, legacy: true });

function num(v: Record<string, string>, id: string): number {
  const value = Number(v[id]);
  return Number.isFinite(value) ? value : NaN;
}

export const KITS: readonly Kit[] = [
  {
    slug: "dose",
    name: "Dose",
    section: "medicine",
    blurb: "Weight times mg per kg, then millilitres from the concentration. Not a prescription.",
    note: "This is arithmetic for study. It is not a dose for a patient.",
    features: ["mg from weight and mg/kg", "mL from a concentration", "The working shown in plain figures"],
    guide: ["Enter weight in kilograms.", "Enter the ordered mg per kg and the mg in each mL.", "Read the mg and the mL. Confirm it with a prescriber."],
    kind: "calc",
    fields: [n("kg", "Weight (kg)", "60"), n("mgkg", "mg per kg", "15"), n("mgml", "mg per mL", "50")],
    run: (v) => {
      const mg = num(v, "kg") * num(v, "mgkg");
      const ml = mg / num(v, "mgml");
      if (![mg, ml].every((item) => Number.isFinite(item) && item >= 0) || num(v, "mgml") <= 0) return [{ label: "Result", value: "Enter positive numbers." }];
      return [
        { label: "Total", value: `${round(mg)} mg` },
        { label: "Volume", value: `${round(ml)} mL` },
      ];
    },
  },
  {
    slug: "anatomy",
    name: "Anatomy",
    section: "medicine",
    blurb: "Flip cards for structures you are learning. A short deck, not a textbook.",
    features: ["A deck of structures and what they do", "Flip a card, then mark it again or next", "The deck stays in the app"],
    guide: ["Read the structure.", "Flip it for the note.", "Go to the next card, or shuffle when you finish."],
    kind: "cards",
    deck: [
      { front: "Left ventricle", back: "Pumps blood into the aorta and around the body." },
      { front: "Right atrium", back: "Receives venous blood from the venae cavae." },
      { front: "Femur", back: "Thigh bone. The longest bone in the body." },
      { front: "Diaphragm", back: "The main muscle of quiet breathing. It separates chest and abdomen." },
      { front: "Nephron", back: "The filtering unit of the kidney." },
      { front: "Liver", back: "Makes bile, stores glycogen, and processes many drugs." },
      { front: "Trachea", back: "The airway from larynx to the bronchi." },
      { front: "Deltoid", back: "Shoulder muscle that abducts the arm." },
    ],
  },
  {
    slug: "clinic-quiz",
    name: "Cases",
    section: "medicine",
    blurb: "Short clinical drills for study. Not a diagnosis.",
    note: "Study questions only. Do not use them to treat anyone.",
    features: ["A short case and four choices", "The reason after you answer", "A score for the set"],
    guide: ["Read the case.", "Pick one answer.", "Read why, then go on. The score is at the end."],
    kind: "quiz",
    questions: [
      { q: "An adult with crushing chest pain, sweating, and pain into the left arm. What do you do first?", options: ["Send them home with an antacid", "Treat it as a possible heart attack and get emergency care", "Start antibiotics", "Book a routine clinic in a month"], answer: 1, why: "That pattern is an emergency until a clinician says otherwise." },
      { q: "A child with a fever and a stiff neck. The safer first step is:", options: ["Urgent assessment for meningitis", "Herbal steam only", "Wait three days", "A sleeping tablet"], answer: 0, why: "Fever plus neck stiffness needs urgent clinical review." },
      { q: "Before giving a drug, which check is the point of the five rights?", options: ["The brand logo", "Patient, drug, dose, route, and time", "The colour of the cup", "The ward nickname"], answer: 1, why: "Those five checks are the usual last look before a dose." },
      { q: "A wound that is red, hot, and spreading after two days suggests:", options: ["Healing as expected", "Possible infection that needs review", "A need for more sugar", "Dehydration only"], answer: 1, why: "Spreading redness and heat are signs to get the wound seen." },
    ],
  },
  {
    slug: "units",
    name: "Units",
    section: "engineering",
    blurb: "Length, mass, volume, and temperature, converted in the browser.",
    features: ["Length, mass, volume, and temperature", "The factor is applied as you type", "No account data is required"],
    guide: ["Pick what you are converting.", "Choose the units and type the value.", "Read the result."],
    kind: "units",
  },
  {
    slug: "formula-sheet",
    name: "Formulas",
    section: "engineering",
    blurb: "A short sheet of formulas you can search.",
    features: ["Search by name", "The formula and what the letters mean", "A handful of core relations, not every course"],
    guide: ["Type a word, such as stress or ohm.", "Open the line you need.", "Copy it into your own working."],
    kind: "list",
    items: [
      { title: "Ohm's law", body: "V = I R. Voltage in volts, current in amps, resistance in ohms." },
      { title: "Stress", body: "σ = F / A. Force over area." },
      { title: "Strain", body: "ε = ΔL / L. Change in length over original length." },
      { title: "Power", body: "P = V I = I² R." },
      { title: "Density", body: "ρ = m / V." },
      { title: "Kinetic energy", body: "KE = ½ m v²." },
      { title: "Moment", body: "M = F d. Force times the perpendicular distance." },
      { title: "Efficiency", body: "η = output / input. Often written as a percent." },
    ],
  },
  {
    slug: "circuit",
    name: "Circuit",
    section: "engineering",
    blurb: "Ohm's law. Leave one of voltage, current, or resistance blank.",
    features: ["Solves the missing one of V, I, or R", "The unit is written next to the figure"],
    guide: ["Fill two of voltage, current, and resistance.", "Leave the one you want blank.", "Read the missing value and its unit."],
    kind: "ohm",
  },
  {
    slug: "case-brief",
    name: "Case brief",
    section: "law",
    blurb: "Turns a case into facts, issue, holding, and reason. A study aid, not advice.",
    note: "A draft for study. It is not a legal opinion.",
    features: ["Facts, issue, holding, and reason", "You paste the case, or fill the boxes", "Written for you instantly, then yours to edit"],
    guide: ["Fill the case name, the facts, and what the court decided.", "Press Write it to get a brief with Facts, Issue, Holding, and Reasoning.", "Check every line against the judgment before you rely on it."],
    kind: "write",
  },
  {
    slug: "legal-cite",
    name: "Cite",
    section: "law",
    blurb: "A Nigerian-style case citation from the parties, year, volume, report, part, page, and court.",
    features: ["Parties, year, volume, report, part, page, and court", "One line you can copy", "You still check the style your school wants"],
    guide: ["Fill the parties and the year.", "Add the volume, report, part, page, and court if you have them.", "Copy the line and fix it to your school's guide."],
    kind: "cite",
    mode: "legal",
  },
  {
    slug: "law-drill",
    name: "Drill",
    section: "law",
    blurb: "Short practice questions on first-year ideas. Not a bar exam.",
    note: "Practice only. Laws differ, and this is not advice.",
    features: ["Short questions with one best answer", "A reason after you choose", "A score for the set"],
    guide: ["Read the question.", "Pick an answer.", "Read the reason. Then try the next one."],
    kind: "quiz",
    questions: [
      { q: "A shop labels a phone at ₦80,000. A customer says 'I accept'. In basic contract study, the label is usually:", options: ["An offer that binds the shop at once", "An invitation to treat", "A deed", "A crime"], answer: 1, why: "A price tag is usually an invitation to treat. The customer's words are the offer." },
      { q: "Consideration, in simple terms, is:", options: ["A judge's mood", "Something of value each side gives", "The court fee only", "A witness signature"], answer: 1, why: "Each side gives something. A bare promise with nothing in return is the usual problem." },
      { q: "Which is the safer note in a student brief?", options: ["Quote the holding you actually read", "Invent a page number", "Add a case you have not opened", "Change the year so it looks newer"], answer: 0, why: "Only cite what you have read. Invented pins are misconduct." },
      { q: "Ratio decidendi means:", options: ["A remark that was not necessary to the result", "The reason that was necessary to the decision", "The court reporter's name", "The losing party's costs"], answer: 1, why: "The ratio is the reason required for the decision. Other comments are obiter." },
    ],
  },
  {
    slug: "ratios",
    name: "Ratios",
    section: "accounting",
    blurb: "Current ratio, quick ratio, and debt to equity from the figures you type.",
    features: ["Current and quick ratios", "Debt to equity", "A one-line reading of each"],
    guide: ["Enter the balance-sheet figures.", "Leave stock out of the quick ratio on purpose.", "Read the three results. They are ratios, not a full audit."],
    kind: "ratios",
  },
  {
    slug: "statements",
    name: "Statements",
    section: "accounting",
    blurb: "A simple income statement. Revenue, costs, and what is left.",
    features: ["Revenue, cost of sales, and expenses", "Gross profit and net profit", "Saved with your account"],
    guide: ["Name the period.", "Enter revenue and the costs.", "Read gross profit and what remains."],
    kind: "template",
    parts: [f("period", "Period", "October 2026"), n("revenue", "Revenue"), n("cogs", "Cost of sales"), n("expenses", "Other expenses")],
  },
  {
    slug: "breakeven",
    name: "Break-even",
    section: "accounting",
    blurb: "How many units cover the fixed costs.",
    features: ["Fixed costs, price, and cost per unit", "Break-even units and sales", "A warning if the price does not cover the unit cost"],
    guide: ["Enter fixed costs for the period.", "Enter the price and the variable cost of one unit.", "Read how many units you need to sell."],
    kind: "even",
  },
  {
    slug: "explainer",
    name: "Explain",
    section: "computing",
    blurb: "Says what a snippet does, in plain language.",
    features: ["A line-by-line reading of code you paste", "No rewrite unless you ask", "Written for you instantly, then yours to edit"],
    guide: ["Paste a short snippet of code.", "Press Write it for an overview and a line-by-line explanation.", "Copy the explanation, or edit it before you use it."],
    kind: "write",
  },
  {
    slug: "bug-scan",
    name: "Bugs",
    section: "computing",
    blurb: "Points at likely bugs. You still run the code.",
    features: ["Likely bugs and why", "It does not claim to compile the code", "Written for you instantly, then yours to edit"],
    guide: ["Paste the code and, if you have it, the error message.", "Read what the error means and the likely problems, with line numbers.", "Fix one thing at a time and test it yourself."],
    kind: "write",
  },
  {
    slug: "algo",
    name: "Algo",
    section: "computing",
    blurb: "Steps through bubble sort on a short list of numbers.",
    features: ["Your numbers, or a sample list", "One swap at a time", "The comparisons and swaps counted"],
    guide: ["Type numbers separated by spaces, then press Start.", "Press Step to see the next swap, and how many comparisons it took.", "Press Start again for a new list."],
    kind: "algo",
  },
  {
    slug: "outliner",
    name: "Outline",
    section: "arts",
    blurb: "A thesis and three parts for an essay.",
    features: ["A question, a thesis, and three parts", "Copy or print the result", "Written for you instantly, then yours to edit"],
    guide: ["Write the essay question, and your answer if you have one.", "Add your main points, or let Outline suggest a structure.", "Edit the outline, then find the sources yourself."],
    kind: "write",
  },
  {
    slug: "citations",
    name: "Citations",
    section: "arts",
    blurb: "APA, MLA, or a simple Chicago line from the fields you fill.",
    features: ["Author, year, title, and source", "APA, MLA, and a notes-style line", "You match it to your department's guide"],
    guide: ["Enter the author, year, and title.", "Pick a style.", "Copy the line and check the punctuation."],
    kind: "cite",
    mode: "paper",
  },
  {
    slug: "digest",
    name: "Digest",
    section: "arts",
    blurb: "A short summary of something you paste.",
    features: ["A summary in a few sentences", "It uses only the text you paste", "Written for you instantly, then yours to edit"],
    guide: ["Paste the passage.", "Read the summary, the key points, and the key terms.", "Try another wording for a shorter or longer summary. Check it against the original."],
    kind: "write",
  },
  {
    slug: "lab-notes",
    name: "Lab",
    section: "science",
    blurb: "Aim, method, results, and a conclusion. Saved with your account.",
    features: ["Aim, method, results, and conclusion", "Saved on your account", "A page you can copy"],
    guide: ["Name the experiment.", "Fill each part.", "It saves as you type."],
    kind: "template",
    parts: [f("title", "Experiment"), a("aim", "Aim"), a("method", "Method"), a("results", "Results"), a("end", "Conclusion")],
  },
  {
    slug: "solver",
    name: "Solver",
    section: "science",
    blurb: "Speed, density, force, and molarity. Pick one and fill the knowns.",
    features: ["Speed, density, force, and molarity", "The answer from the two values you fill", "The formula written out"],
    guide: ["Pick a formula.", "Fill the two values it asks for.", "Read the answer. It works one way: speed from distance and time, not time from speed."],
    kind: "solver",
  },
  {
    slug: "plot",
    name: "Plot",
    section: "science",
    blurb: "A line from pairs you type. One pair per line.",
    features: ["Pairs of x and y", "A line on a grid", "Nothing is uploaded"],
    guide: ["Type one pair per line, such as 1, 2.", "The line draws as the pairs parse.", "Fix a line if a point is missing."],
    kind: "plot",
  },
  {
    slug: "lesson",
    name: "Lesson",
    section: "teaching",
    blurb: "Objective, starter, main task, and a check. For one class.",
    features: ["Objective, steps, and a check", "Copy or print the result", "Written for you instantly, then yours to edit"],
    guide: ["Enter the subject, topic, class, and lesson length.", "Press Write it for a timed plan with a starter, main task, and check.", "Try another wording for different activities, then edit it to your class."],
    kind: "write",
  },
  {
    slug: "quiz-maker",
    name: "Quiz",
    section: "teaching",
    blurb: "Write your questions and answers, saved in one place.",
    features: ["Questions you type and save", "Copy or print it when it is ready"],
    guide: ["Add the topic.", "Write each question and its answer.", "Copy or print the quiz when it is ready."],
    kind: "template",
    parts: [f("topic", "Topic"), a("questions", "Questions and answers")],
  },
  {
    slug: "remarks",
    name: "Remarks",
    section: "teaching",
    blurb: "A report-card sentence from a name and two notes.",
    features: ["Name, strength, and next step", "A sentence you can edit", "Written for you instantly, then yours to edit"],
    guide: ["Enter the learner's first name.", "Add one strength and one next step.", "Pick one of three sentences and edit it so it sounds like you."],
    kind: "write",
  },
  {
    slug: "shifts",
    name: "Shifts",
    section: "clinic",
    blurb: "A list of shifts. Date, start, end, and where, with the hours worked out.",
    features: ["Date, start, end, and place", "Hours for each line, this week, and in total", "The list stays on your account"],
    guide: ["Add the date and the clock times. A shift that ends after midnight is counted as a night shift.", "Add the ward or site.", "The list saves on its own. Each shift has a button to copy it into your to-do list."],
    kind: "tracker",
    fields: [d("date", "Date"), t("start", "Start"), t("end", "End"), f("where", "Where", "Ward")],
  },
  {
    slug: "soap-note",
    name: "Notes",
    section: "clinic",
    blurb: "Subjective, objective, assessment, plan. A formatter, not a record system.",
    note: "Do not put a real patient's identifying details in here.",
    features: ["SOAP headings", "Copy or print the result", "Written for you instantly, then yours to edit"],
    guide: ["Fill the four parts without names or file numbers.", "Press Write it for a tidy SOAP note.", "Copy it into the real record system yourself."],
    kind: "write",
  },
  {
    slug: "dose-ref",
    name: "Reference",
    section: "clinic",
    blurb: "A few adult ranges for study. Confirm every figure before you use it.",
    note: "Reference notes for study. Not a dose for a named patient. Check a current formulary.",
    features: ["Search a short adult list", "The usual caution next to the name", "Not a substitute for a formulary"],
    guide: ["Search the name.", "Read the note.", "Check a current formulary before any dose."],
    kind: "list",
    items: [
      { title: "Paracetamol, adult", body: "Often 0.5–1 g every 4–6 hours, maximum 4 g in 24 hours. Lower the dose if liver disease or low weight. Confirm." },
      { title: "Ibuprofen, adult", body: "Often 200–400 mg every 4–6 hours with food, maximum 1.2 g a day over the counter. Avoid in some asthma, ulcers, and late pregnancy. Confirm." },
      { title: "ORS", body: "Oral rehydration, not a drug dose. Give after each loose stool, in sips. Seek care for blood, high fever, or no urine." },
      { title: "Adrenaline, anaphylaxis", body: "Emergency drug. Intramuscular dose depends on age and a protocol. Do not calculate it from memory in a crisis. Follow the local protocol." },
    ],
  },
  { slug: "regex", name: "Regex", section: "developers", blurb: "A pattern, a sample, and the matches.", features: ["A JavaScript pattern and flags", "Matches marked in the sample", "The error if the pattern is bad"], guide: ["Type the pattern without slashes.", "Add flags such as g or i.", "Paste a sample and read the matches."], kind: "regex" },
  {
    slug: "json-fmt",
    name: "JSON",
    section: "developers",
    blurb: "A simple free JSON check: format it, or see the line and column where it breaks.",
    features: ["Format JSON so it is readable", "Check that it is valid", "The line and column of the first error, with that spot marked"],
    guide: ["Paste JSON.", "Press Format, or Check to only validate it.", "If it fails, go to the line and column named in the error. For a tree view, minify, sorted keys and large files, Glyph is included with Midnry Pass."],
    kind: "json",
  },
  {
    slug: "readme",
    name: "README",
    section: "developers",
    blurb: "A README from the project name and what it does.",
    features: ["What it is, how to run it, and a license line", "You edit the draft", "Written for you instantly, then yours to edit"],
    guide: ["Enter the project name and what it does.", "Add how to install and run it.", "Copy the Markdown and delete anything that is not true."],
    kind: "write",
  },
  {
    slug: "cold-email",
    name: "Outreach",
    section: "marketing",
    blurb: "A short email from who you are and why you are writing.",
    features: ["Three short emails with subject lines", "Plain, friendly wording with no fake familiarity", "Written for you instantly, then yours to edit"],
    guide: [
      "Add your name, what you do, and who you're writing to (for example: Ruth, event planner).",
      "Say what you can do for them, and why them if you know. Short phrases are fine.",
      "Pick one of three emails, or try another wording. Edit it, then send it yourself.",
    ],
    kind: "write",
  },
  {
    slug: "ad-copy",
    name: "Ads",
    section: "marketing",
    blurb: "Three short lines for one offer.",
    features: ["Three variations", "The offer you typed, not a new one", "Written for you instantly, then yours to edit"],
    guide: ["Describe the product, who it is for, and the main benefit.", "Pick one of three ad lines, or try another wording.", "Edit it so every claim is true."],
    kind: "write",
  },
  // Proposal is now part of Invoice (proposals view); its saved document is copied in there.
  {
    slug: "paye",
    name: "Tax",
    section: "books",
    blurb: "A 2026 Nigeria PAYE estimate, and VAT at 7.5%. Confirm it before you file.",
    note: "Estimate using the Nigeria Tax Act bands from 1 January 2026, and VAT at 7.5%. Confirm with a tax office. Reliefs other than optional rent relief are not applied.",
    features: ["PAYE bands from the 2026 schedule", "Optional rent relief, 20% capped at ₦500,000", "VAT at 7.5% on an amount you type"],
    guide: ["Enter annual pay.", "Add annual rent only if you want that relief.", "Read the estimate. It is not a filing."],
    kind: "tax",
  },
  {
    slug: "reconcile",
    name: "Reconcile",
    section: "books",
    blurb: "Two lists of amounts. Which amounts appear in both, and what is only on one side.",
    features: ["Your figures and theirs", "Lines that are not amounts, by line number", "Amounts only on one side, and the difference of the totals"],
    guide: ["Paste one amount per line on each side.", "An amount that appears in both lists is paired once, by amount only.", "Read what is left, and fix any line it could not read."],
    kind: "reconcile",
  },
  {
    slug: "contract-scan",
    name: "Contract",
    section: "practice",
    blurb: "A plain summary of a contract you paste. Not an opinion.",
    note: "A reading aid. It is not legal advice and it can miss a clause.",
    features: ["Parties, term, money, and ending", "Only what is in the paste", "Written for you instantly, then yours to edit"],
    guide: ["Paste the contract.", "Read the parties, money, dates, duties, how it ends, and terms to watch.", "Read the whole contract again before you sign anything."],
    kind: "write",
  },
  {
    slug: "clauses",
    name: "Clauses",
    section: "practice",
    blurb: "A small library of plain starting clauses. Edit them to the deal.",
    note: "Starting points, not a finished contract and not legal advice.",
    features: ["Search a short library", "Copy a clause", "You edit names, dates, and law"],
    guide: ["Search, for example payment or notice.", "Copy the clause.", "Have a lawyer read it before anyone signs."],
    kind: "list",
    items: [
      { title: "Payment", body: "The client pays the fee in the schedule within 14 days of a correct invoice. Late amounts may attract interest at the rate the parties write here." },
      { title: "Scope", body: "The work is only what this agreement lists. Extra work needs a written change before it starts." },
      { title: "Confidentiality", body: "Each party keeps the other's non-public information private, and uses it only for this agreement, except where the law requires disclosure." },
      { title: "Termination", body: "Either party may end this agreement by written notice of 14 days. Clauses that should survive, including payment for work done, survive." },
      { title: "Liability", body: "Neither party excludes liability for death, fraud, or anything else that cannot be excluded. Other liability is capped at the fees paid in the previous three months, unless the parties change that figure." },
    ],
  },
  {
    slug: "letters",
    name: "Letters",
    section: "practice",
    blurb: "A formal letter from the points you list.",
    features: ["Addressee, matter, and the ask", "A draft you edit", "Written for you instantly, then yours to edit"],
    guide: ["Enter who it is from, who it is to, and the subject.", "Add what happened and what you are asking for.", "Put it on your own letterhead and check the facts."],
    kind: "write",
  },
  {
    slug: "creative-brief",
    name: "Creative brief",
    section: "creatives",
    blurb: "Audience, message, and what done looks like.",
    features: ["Audience, message, deliverable, and deadline", "Saved with your account", "Copy or print it when it is ready"],
    guide: ["Fill what the client actually said.", "Cut anything the client did not ask for.", "Send it only after the client would recognise it."],
    kind: "template",
    parts: [f("client", "Client"), a("audience", "Audience"), a("message", "Message"), f("done", "Deliverable"), f("when", "Deadline")],
  },
  {
    slug: "mood",
    name: "Mood",
    section: "creatives",
    blurb: "A few colours and words for a direction.",
    features: ["Six colour chips", "Words for the direction", "Saved with your account"],
    guide: ["Set the colours.", "Write the words.", "It saves with your account."],
    kind: "mood",
  },
  {
    slug: "stock",
    name: "Stock",
    section: "retail",
    blurb: "What you have, and a line when it is low.",
    features: ["Item, quantity, and a low mark", "A flag when quantity is at or under the mark", "Saved with your account"],
    guide: ["Add the item and how many you have.", "Set the number that means low.", "Update the quantity when stock moves."],
    kind: "tracker",
    fields: [f("item", "Item"), n("qty", "Quantity", "0"), n("low", "Low at", "5")],
  },
  {
    slug: "margin",
    name: "Profit",
    section: "retail",
    blurb: "Price minus cost, and the margin.",
    features: ["Cost and selling price", "Profit and margin percent", "A note if the price is below cost"],
    guide: ["Enter what you paid and what you charge.", "Read the profit on one unit.", "Margin is profit divided by the price."],
    kind: "calc",
    fields: [n("cost", "Cost", "0"), n("price", "Price", "0")],
    run: (v) => {
      const cost = num(v, "cost");
      const price = num(v, "price");
      if (![cost, price].every((item) => Number.isFinite(item))) return [{ label: "Result", value: "Enter both numbers." }];
      const profit = price - cost;
      const margin = price === 0 ? NaN : (profit / price) * 100;
      return [
        { label: "Profit", value: round(profit) },
        { label: "Margin", value: Number.isFinite(margin) ? `${round(margin)}%` : "—" },
      ];
    },
  },
  {
    slug: "menu",
    name: "Menu",
    section: "kitchen",
    blurb: "Dishes, prices, and a short note, plus a QR code that opens your menu link. Copy it or print it.",
    features: [
      "Dish, price, and a note",
      "A list you can copy",
      "Saved with your account",
      "A QR code for a menu link you already have (any https link), saved as an image",
      "The link is not checked or hosted for you",
    ],
    guide: [
      "Add each dish.",
      "Write a short note if it needs one.",
      "Copy the menu when it is ready.",
      "Under QR code, paste the link where your menu already lives, make the code, and save the image where people can scan it.",
    ],
    kind: "tracker",
    fields: [f("dish", "Dish"), n("price", "Price"), f("note", "Note")],
    qr: {
      title: "QR code",
      blurb: "Paste the link where your menu already lives, such as a website, a PDF link or a WhatsApp catalogue. The code only opens that link: Midnry does not host your menu and does not check the link.",
    },
  },
  {
    slug: "recipe-cost",
    name: "Recipe cost",
    section: "kitchen",
    blurb: "Ingredient costs divided by the portions.",
    features: ["Lines of cost", "Portions", "Cost of one portion"],
    guide: ["Add each ingredient cost.", "Set how many portions the recipe makes.", "Read the cost of one."],
    kind: "calc",
    fields: [a("costs", "Costs, one per line", "500\n200"), n("portions", "Portions", "4")],
    run: (v) => {
      const lines = (v.costs || "").split(/\n/).map((line) => Number(line.trim())).filter((item) => Number.isFinite(item));
      const portions = num(v, "portions");
      const total = lines.reduce((sum, item) => sum + item, 0);
      if (lines.length === 0 || !(portions > 0)) return [{ label: "Result", value: "Add costs and a portion count." }];
      return [
        { label: "Batch", value: round(total) },
        { label: "Each", value: round(total / portions) },
      ];
    },
  },
  {
    slug: "bookings",
    name: "Bookings",
    section: "beauty",
    blurb: "Name, service, and time. A list, not a public website.",
    features: ["Name, service, and time", "The list stays on your account", "You still confirm with the client"],
    guide: ["Add the client and the service.", "Set the day and time.", "Message them yourself to confirm."],
    kind: "tracker",
    fields: [f("name", "Name"), f("service", "Service"), f("when", "When", "Fri 14:00")],
  },
  {
    slug: "catalog",
    name: "Catalog",
    section: "beauty",
    blurb: "Products and their prices, with a one-line description. A price list you can copy.",
    features: [
      "Product or item, price, and an optional line",
      "A price list you can copy or export",
      "Change a price in the same row",
      "Saved with your account",
    ],
    guide: [
      "Add each product or item and its price.",
      "Add a short line if it helps.",
      "Copy the list into your shop, your status or a message. Change a price in the same row.",
    ],
    kind: "tracker",
    fields: [f("name", "Product or item"), n("price", "Price", "0"), f("line", "Line")],
  },
  {
    slug: "captions",
    name: "Captions",
    section: "beauty",
    blurb: "A caption from the product and the point of the photo.",
    features: ["Three short options", "No claims you did not type", "Written for you instantly, then yours to edit"],
    guide: ["Say the product and what the photo shows.", "Pick one of three captions, with hashtags.", "Post the one that is true."],
    kind: "write",
  },
  // Quote is now part of Invoice (quotes view); its saved document is copied in there.
  {
    slug: "service-terms",
    name: "Agreement",
    section: "freelance",
    blurb: "A short client or services agreement from the job, the fee, revisions and notice. Edit it, then get it read.",
    note: "A starting draft, not a finished contract. Have it read before anyone signs.",
    features: ["Parties, the work or job, fee, revisions, and notice", "A one-page draft you can copy or print", "Saved with your account", "You add the governing details"],
    guide: ["Fill the names, the work or job, and the fee.", "Set how many revisions, and the notice period.", "Read every sentence.", "Get it checked before it is signed."],
    kind: "template",
    parts: [f("you", "You"), f("client", "Client"), a("work", "Work or job"), f("fee", "Fee"), f("revisions", "Revisions", "2"), f("notice", "Notice", "14 days")],
  },
  {
    slug: "listing",
    name: "Listing",
    section: "sellers",
    blurb: "A product description from the facts you have.",
    features: ["Title and a short description", "No invented specs", "Written for you instantly, then yours to edit"],
    guide: ["Enter the real facts: material, size, colour, and what is included.", "Copy the title and the description.", "Delete anything that is not true."],
    kind: "write",
  },
  {
    slug: "orders",
    name: "Orders",
    section: "sellers",
    blurb: "Who ordered, what, and whether it has gone out.",
    features: ["Name, item, and status", "Saved with your account", "A list you can scan"],
    guide: ["Add the buyer and the item.", "Set the status, such as paid or sent.", "Update the row when it changes."],
    kind: "tracker",
    fields: [f("buyer", "Buyer"), f("item", "Item"), f("status", "Status", "paid")],
  },
  {
    slug: "wa-replies",
    name: "Replies",
    section: "sellers",
    blurb: "WhatsApp replies you can copy.",
    features: ["Price, delivery, and a polite no", "Copy a reply", "Edit the numbers before you send it"],
    guide: ["Pick a situation.", "Copy the text.", "Put in the real price or date before you send it."],
    kind: "list",
    items: [
      { title: "Price", body: "Hello. The price is ₦____. It includes ____. Tell me if you want it and I will share how to pay." },
      { title: "Paid", body: "I have received the payment. I will send it on ____ and share the update here." },
      { title: "Delay", body: "Hello. The item is delayed until ____. You can wait, or I can refund you. Tell me which you prefer." },
      { title: "Not available", body: "Hello. That one is finished. I can offer ____, or message you when it is back." },
      { title: "Delivery fee", body: "Delivery to your area is ₦____. The item is ₦____. Total is ₦____." },
    ],
  },
  {
    slug: "yield",
    name: "Yield",
    section: "agro",
    blurb: "Harvest, land, and cost. Yield per hectare and cost per unit.",
    features: ["Quantity and hectares", "Cost of the season", "Yield and cost per unit"],
    guide: ["Enter how much you harvested and the land size.", "Enter the season's cost.", "Read yield per hectare and cost per unit."],
    kind: "calc",
    fields: [n("qty", "Harvest", "0"), n("land", "Hectares", "1"), n("cost", "Season cost", "0")],
    run: (v) => {
      const qty = num(v, "qty");
      const land = num(v, "land");
      const cost = num(v, "cost");
      if (!(qty >= 0) || !(land > 0) || !(cost >= 0)) return [{ label: "Result", value: "Enter a harvest, land above zero, and a cost." }];
      return [
        { label: "Per hectare", value: round(qty / land) },
        { label: "Cost per unit", value: qty === 0 ? "—" : round(cost / qty) },
      ];
    },
  },
  {
    slug: "farm-sales",
    name: "Farm sales",
    section: "agro",
    blurb: "A farm sales book: who bought, what, and for how much, with a log of crop prices and when.",
    features: [
      "Sales: buyer, crop, and amount, in a running list",
      "Price log: crop, price, and date",
      "Your own prices, not a market feed",
      "Saved with your account",
    ],
    guide: [
      "Under Sales, add the buyer, the crop, and the amount.",
      "Under Price log, add the crop, the price you saw or got, and the date.",
      "This is your book. It does not fetch market prices.",
    ],
    kind: "tracker",
    fields: [f("buyer", "Buyer"), f("crop", "Crop"), n("amount", "Amount")],
    views: [
      { id: "sales", label: "Sales" },
      { id: "prices", label: "Price log", fields: [f("crop", "Crop"), n("price", "Price"), f("when", "Date")], blurb: "What a crop sold for, and when. Your own prices, not a market feed." },
    ],
  },
  {
    slug: "meds",
    name: "Medicines",
    section: "elder-health",
    blurb: "A list of medicines and the time. Tick today. This phone will not ring you.",
    note: "A list you look at. It does not send a reminder and it is not medical advice.",
    features: ["Name and time of day", "A tick for today, with the time", "The last 30 days at a glance", "Large type"],
    guide: ["Add the medicine and when you take it.", "Press it when you have taken it. Press it again to undo a mistake.", "Ask a clinician or pharmacist before you change a medicine."],
    // Rendered by src/components/tools/meds.tsx (dated ticks); saved rows keep this shape.
    kind: "tracker",
    fields: [f("name", "Medicine"), f("when", "When", "Morning")],
  },
  {
    slug: "visits",
    name: "Visits",
    section: "elder-health",
    blurb: "Appointments in a large list.",
    features: ["Who, where, and when", "Large type", "Saved with your account"],
    guide: ["Add the clinic or person.", "Add the date and time.", "Open the list when you need it. It will not call you, but each visit has a button to copy it into your to-do list."],
    kind: "tracker",
    fields: [f("who", "Who"), f("where", "Where"), d("date", "Date"), t("time", "Time"), old("when", "When")],
  },
  {
    slug: "symptom-log",
    name: "Symptoms",
    section: "elder-health",
    blurb: "A diary of how you felt. Not a diagnosis.",
    note: "A diary. If you are worried, or symptoms are severe, seek care.",
    features: ["Day and a short note", "Saved with your account", "Large type"],
    guide: ["Write the day.", "Write how you felt, in your own words.", "Show the list to a clinician if you want to."],
    kind: "tracker",
    fields: [f("day", "Day"), a("note", "How you felt")],
  },
  {
    slug: "scam-check",
    name: "Scam check",
    section: "safety",
    blurb: "Paste a message. It looks for pressure, money, and odd links.",
    note: "A warning list, not proof. When money is involved, stop and ask someone you trust.",
    features: ["Pressure, payment, and links", "Each warning sign found, what it means, and what to do", "It does not contact the sender"],
    guide: ["Paste the message.", "Read which signs showed up.", "Do not pay or share a code if you are unsure."],
    kind: "scam",
  },
  {
    slug: "ice-card",
    name: "Emergency card",
    section: "safety",
    blurb: "Name, a person to call, and notes a helper might need.",
    features: ["Your name and a phone to call", "Allergies and medicines, if you want them listed", "Large type, saved on your account"],
    guide: ["Write your name and who to call.", "Add allergies only if you want them on this card.", "Show the card to a helper. It is not a medical record."],
    kind: "template",
    parts: [f("name", "Your name"), f("call", "Call this person"), f("phone", "Their phone"), a("notes", "Allergies or medicines")],
  },
  {
    slug: "rumor-check",
    name: "Claims",
    section: "safety",
    blurb: "Questions to ask before you forward a claim.",
    features: ["Who said it, and whether you can open the source", "A checklist, not a fact-check", "Large type"],
    guide: ["Read the claim again.", "Answer the questions on the screen.", "Do not forward it if the source will not open."],
    kind: "scam",
  },
  { slug: "voice-note", name: "Voice", section: "family", blurb: "Record a message on this device and play it back.", features: ["A large record button", "Play it back here", "Download the file. It is not sent for you."], guide: ["Press record and speak.", "Press stop.", "Play it, or download it and send it in the app your family uses."], kind: "voice" },
  { slug: "clearer", name: "Clearer", section: "family", blurb: "Raises contrast on a photo. It does not invent missing detail.", features: ["A photo from this device", "Stronger contrast", "A download. The photo is not uploaded."], guide: ["Choose a photo.", "Wait for the clearer copy.", "Download it. Faces and text that were already gone stay gone."], kind: "photo" },
  {
    slug: "call-guide",
    name: "Call",
    section: "family",
    blurb: "Big steps for a WhatsApp or Meet call.",
    features: ["WhatsApp and Meet", "Large steps", "Nothing is dialled for you"],
    guide: ["Pick the app your family uses.", "Follow one step at a time.", "Ask them to send the link if you do not have it."],
    kind: "steps",
    steps: [
      { title: "WhatsApp", body: "Open WhatsApp. Open the chat with the person. Tap the video camera at the top. Wait until they answer. To hang up, tap the red button." },
      { title: "They sent a link", body: "Open the message. Tap the link. If the phone asks, allow the camera and the microphone. Tap Join. To leave, tap the red button." },
      { title: "Google Meet", body: "Open the link they sent. Type your name if it asks. Tap Ask to join or Join. Allow camera and microphone. The red phone button leaves the call." },
    ],
  },
  {
    slug: "pension",
    name: "Savings",
    section: "elder-money",
    blurb: "What a monthly save might become. A plain compound figure, not a forecast.",
    note: "A classroom compound-interest sum. It ignores fees, tax, and markets.",
    features: ["Monthly amount, years, and a yearly rate", "A future figure", "Large type"],
    guide: ["Enter how much you could put away each month.", "Enter the years and a yearly rate.", "Read the figure as a sum, not a promise."],
    kind: "calc",
    fields: [n("monthly", "Each month", "20000"), n("years", "Years", "10"), n("rate", "Yearly rate %", "8")],
    run: (v) => {
      const monthly = num(v, "monthly");
      const years = num(v, "years");
      const rate = num(v, "rate") / 100 / 12;
      const months = years * 12;
      if (!(monthly >= 0) || !(months > 0) || !Number.isFinite(rate)) return [{ label: "Result", value: "Enter the monthly amount, years, and rate." }];
      const future = rate === 0 ? monthly * months : monthly * ((Math.pow(1 + rate, months) - 1) / rate);
      return [
        { label: "You put in", value: round(monthly * months) },
        { label: "The sum", value: round(future) },
      ];
    },
  },
  {
    slug: "bill-watch",
    name: "Bills",
    section: "elder-money",
    blurb: "Bills and the day they are due. The app does not pay them.",
    features: ["Name, amount, and due date", "Large type", "Saved with your account"],
    guide: ["Add the bill and the amount.", "Pick the date it is due.", "Open the list. Nothing is paid automatically. Each bill has a button to copy it into your to-do list."],
    kind: "tracker",
    fields: [f("name", "Bill"), n("amount", "Amount"), d("dueOn", "Due date"), old("due", "Due")],
  },
  {
    slug: "recipes",
    name: "Recipes",
    section: "hobbies",
    blurb: "A few plain recipes you can search. Not the whole internet.",
    features: ["Search by food", "Ingredients and steps", "Large type"],
    guide: ["Type a word, such as rice or beans.", "Open a recipe.", "This list does not search the web."],
    kind: "list",
    items: [
      { title: "Jollof rice", body: "Rinse rice. Blend tomatoes, pepper, and onion. Fry the paste in oil, add stock and seasoning, then the rice. Cook on low heat until the liquid is gone. Stir once or twice." },
      { title: "Beans porridge", body: "Boil beans until soft. Fry onion and pepper, add the beans and a little of the water, then salt and pepper. Simmer until thick." },
      { title: "Pepper soup", body: "Season meat or fish with pepper-soup spice, onion, and salt. Cover with water. Simmer until tender. Add scent leaf near the end if you have it." },
      { title: "Pap", body: "Mix corn flour with cold water into a paste. Boil water, stir in the paste, and keep stirring until it is thick and smooth." },
      { title: "Plantain", body: "Peel ripe plantain. Fry slices in a little oil until golden, or grill them. Salt only if you want it." },
    ],
  },
  { slug: "read-aloud", name: "Aloud", section: "hobbies", blurb: "Large type, read out loud by this device.", features: ["Your own text, or a short passage", "A speak button", "Large type"], guide: ["Paste text, or use the passage already there.", "Press speak.", "Press stop when you have heard enough. This uses the voice on the device."], kind: "speak" },
  {
    slug: "memoir",
    name: "Memoir",
    section: "hobbies",
    blurb: "A prompt, then a memory in your words.",
    features: ["A prompt to start", "Your writing, saved", "Large type"],
    guide: ["Read the prompt, or write your own.", "Write the memory.", "It saves with your account."],
    kind: "template",
    parts: [f("prompt", "Prompt", "A place I knew as a child"), a("memory", "The memory")],
  },
];

function round(value: number): string {
  return (Math.round(value * 100) / 100).toLocaleString("en");
}

export function getKit(slug: string): Kit | undefined {
  return KITS.find((item) => item.slug === slug);
}

/**
 * Cite (law): "Ade v Bello (2024) 5 NWLR (Pt. 1925) 1, SC". Each part is left
 * out when empty, and the year appears once. Older entries typed the whole
 * report ("[2024] 5 NWLR") into Report; that still prints as typed.
 */
export function legalCitation(values: Record<string, string | undefined>): string {
  const part = (id: string) => (values[id] ?? "").trim();
  const pt = part("part").replace(/^pt\.?\s*/i, "");
  const report = part("report");
  const year = part("year");
  // An old-style report that already holds the year ("[2024] 5 NWLR") is not given the year again.
  const yearShown = year && !report.includes(year) ? `(${year})` : "";
  const line = [part("parties") || "Parties", yearShown, part("volume"), report, pt ? `(Pt. ${pt})` : "", part("page")].filter(Boolean).join(" ");
  const court = part("court");
  return court ? `${line}, ${court}` : line;
}

/** Algo: bubble sort frames. Each frame is the list after a swap, with the comparisons and swaps so far. */
export function bubbleFrames(input: readonly number[]): { list: number[]; comparisons: number; swaps: number }[] {
  const arr = input.slice(0, 12);
  const frames = [{ list: arr.slice(), comparisons: 0, swaps: 0 }];
  let comparisons = 0;
  let swaps = 0;
  for (let i = 0; i < arr.length; i += 1) {
    let swapped = false;
    for (let j = 0; j < arr.length - i - 1; j += 1) {
      comparisons += 1;
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swaps += 1;
        swapped = true;
        frames.push({ list: arr.slice(), comparisons, swaps });
      }
    }
    if (!swapped) break;
  }
  const last = frames[frames.length - 1];
  if (last.comparisons !== comparisons) frames.push({ list: arr.slice(), comparisons, swaps });
  return frames;
}
