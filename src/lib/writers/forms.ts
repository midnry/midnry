import type { Field } from "@/lib/kits";
import { bullets, capital, clean, inline, items, list, longDate, pick, sentence, titleCase, topWords } from "./text.ts";

export type Piece = { title: string; text: string };
export type Values = Record<string, string>;

export type Writer = {
  /** The boxes the person fills. The first `required` ids must have text before writing. */
  fields: Field[];
  required: string[];
  /** True when several wordings exist, so "Try another wording" is worth showing. */
  variants: boolean;
  run: (values: Values, variant: number) => Piece[];
};

const f = (id: string, label: string, placeholder?: string): Field => ({ id, label, placeholder });
const a = (id: string, label: string, placeholder?: string): Field => ({ id, label, kind: "area", placeholder });

const caseBrief: Writer = {
  fields: [
    f("name", "Case name", "Donoghue v Stevenson"),
    f("cite", "Court and year", "House of Lords, 1932"),
    a("facts", "What happened", "One fact per line"),
    f("issue", "The legal question", "Does a manufacturer owe a duty of care to the end consumer?"),
    f("holding", "What the court decided", "Yes. A duty is owed to the ultimate consumer."),
    a("reasons", "Why the court decided it", "One reason per line"),
    f("rule", "Rule to remember, optional", "The neighbour principle"),
  ],
  required: ["name", "facts"],
  variants: false,
  run: (v) => {
    const issue = clean(v.issue)
      ? sentence(/^whether/i.test(clean(v.issue)) ? v.issue : clean(v.issue))
      : "State the question the court had to answer, starting with “Whether…”.";
    const lines = [
      `${titleCase(clean(v.name))}${clean(v.cite) ? ` (${clean(v.cite)})` : ""}`,
      "",
      "FACTS",
      ...bullets(v.facts).map((line) => `• ${line}`),
      "",
      "ISSUE",
      issue.endsWith("?.") ? issue.slice(0, -1) : issue,
      "",
      "HOLDING",
      sentence(v.holding) || "Add what the court decided.",
      "",
      "REASONING",
      ...(bullets(v.reasons).length ? bullets(v.reasons).map((line, index) => `${index + 1}. ${line}`) : ["Add the court's reasons, one per line."]),
    ];
    if (clean(v.rule)) lines.push("", "RULE TO REMEMBER", sentence(v.rule));
    lines.push("", "Study aid only. Check every line against the judgment.");
    return [{ title: "Case brief", text: lines.join("\n") }];
  },
};

const ESSAY_TYPES: [RegExp, string, [string, string, string]][] = [
  [/to what extent|how far|assess|evaluate/i, "an evaluation", ["The case for", "The case against", "Weighing them up"]],
  [/compare|contrast|differ|similar/i, "a comparison", ["Where they are alike", "Where they differ", "Which difference matters most"]],
  [/cause|why did|reasons? for|led to/i, "an explanation of causes", ["The main cause", "A contributing cause", "How the causes connect"]],
  [/effect|impact|consequence|result/i, "an analysis of effects", ["The immediate effect", "The longer-term effect", "Who was affected most"]],
  [/discuss|explore|examine/i, "a discussion", ["The first angle", "A second angle", "A tension between them"]],
];

const outliner: Writer = {
  fields: [
    a("question", "Essay question", "To what extent did the printing press change Europe?"),
    f("thesis", "Your answer in one sentence, optional"),
    a("points", "Your main points, one per line, optional"),
    f("words", "Word count, optional", "1500"),
  ],
  required: ["question"],
  variants: true,
  run: (v, variant) => {
    const question = clean(v.question);
    const type = ESSAY_TYPES.find(([pattern]) => pattern.test(question));
    const own = items(v.points);
    const heads = own.length >= 2 ? own.slice(0, 4) : type ? type[2] : ["First main point", "Second main point", "Third main point"];
    const total = Number(v.words) > 0 ? Number(v.words) : 0;
    const intro = total ? Math.round(total * 0.1) : 0;
    const body = total ? Math.round((total * 0.8) / heads.length) : 0;
    const thesis = clean(v.thesis)
      ? sentence(v.thesis)
      : pick(
          [
            "Write one sentence that answers the question directly and names your main reasons.",
            "State your position in one sentence. A reader should know your answer before section one.",
          ],
          variant,
        );
    const lines = [
      `QUESTION: ${question}`,
      type ? `This is ${type[1]}, so every section should answer the question, not just describe.` : "",
      "",
      `INTRODUCTION${intro ? ` (about ${intro} words)` : ""}`,
      `• Hook: ${pick(["a striking fact or date", "a short quotation from a primary source", "a question the reader cares about"], variant)}`,
      "• Context: the two or three facts a reader needs first",
      `• Thesis: ${thesis}`,
      "",
      ...heads.flatMap((head, index) => [
        `SECTION ${index + 1}: ${sentence(head).replace(/\.$/, "")}${body ? ` (about ${body} words)` : ""}`,
        "• Point: the claim this section makes, in one sentence",
        "• Evidence: a source, figure, or quotation that proves it",
        "• Explain: why the evidence supports the point",
        "• Link: how this answers the question",
        "",
      ]),
      `CONCLUSION${intro ? ` (about ${intro} words)` : ""}`,
      "• Restate the thesis in new words",
      "• Say which point mattered most, and why",
      "• End with what this means beyond the essay",
      "",
      "Sources are yours to find. Do not cite anything you have not read.",
    ];
    return [{ title: "Essay outline", text: lines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n").trim() }];
  },
};

const lesson: Writer = {
  fields: [
    f("subject", "Subject", "Biology"),
    f("topic", "Topic", "Photosynthesis"),
    f("level", "Class or age", "Year 9 / age 13"),
    f("minutes", "Lesson length in minutes", "40"),
    f("goal", "What learners should be able to do, optional", "explain how plants make food"),
  ],
  required: ["topic"],
  variants: true,
  run: (v, variant) => {
    const topic = clean(v.topic);
    const minutes = Math.max(15, Math.min(180, Number(v.minutes) || 40));
    const split = [0.12, 0.18, 0.5, 0.2].map((share) => Math.max(3, Math.round(minutes * share)));
    split[2] += minutes - split.reduce((sum, value) => sum + value, 0);
    const level = clean(v.level);
    const young = /\b(primary|nursery|year [1-6]\b|grade [1-5]\b|age [4-9]\b|kids?)/i.test(level);
    const goal = clean(v.goal) ? inline(v.goal) : `explain the key ideas of ${topic.toLowerCase()} in their own words`;
    const starter = pick(
      young
        ? [`Show a picture linked to ${topic}. Ask: “What do you notice? What do you wonder?”`, `A quick guessing game: three clues about ${topic}, learners guess the word.`]
        : [`Three quick questions on what they already know about ${topic}. Answers on mini whiteboards.`, `Show one surprising fact about ${topic}. Pairs discuss why it might be true for one minute.`, `Odd one out: four words linked to ${topic}. Learners pick one and justify it.`],
      variant,
    );
    const main = pick(
      [
        [`Model one worked example on ${topic}, thinking aloud.`, "Learners try a similar example in pairs while you circulate.", "Independent practice: three questions that get harder."],
        [`Short explanation of ${topic} with one diagram.`, "Card sort in groups: match terms to meanings.", "Each group explains one card to another group."],
        [`Read a short text or watch a short clip about ${topic}.`, "Learners note three key points and one question.", "Class discussion: build a summary together on the board."],
      ],
      variant,
    );
    const lines = [
      `${clean(v.subject) ? `${clean(v.subject)}: ` : ""}${titleCase(topic)}${level ? ` · ${level}` : ""} · ${minutes} minutes`,
      "",
      "OBJECTIVE",
      `By the end of the lesson, learners can ${goal}.`,
      "",
      `STARTER (${split[0]} min)`,
      `• ${starter}`,
      "",
      `INTRODUCE (${split[1]} min)`,
      `• Share the objective and why ${topic.toLowerCase()} matters.`,
      "• Introduce two or three key words with meanings on the board.",
      "",
      `MAIN TASK (${split[2]} min)`,
      ...main.map((step) => `• ${step}`),
      `• Stretch: ${pick(["learners write their own question for a partner", "apply the idea to a new example", "explain a common mistake and how to fix it"], variant)}.`,
      `• Support: ${young ? "picture prompts and a word bank" : "a worked example and sentence starters"}.`,
      "",
      `CHECK FOR UNDERSTANDING (${split[3]} min)`,
      `• ${pick(["Exit ticket: two questions answered on a slip before leaving.", "Three-question quiz, hands up for each answer.", "Each learner writes one sentence summarising the lesson."], variant)}`,
      "• Note who needs another go next lesson.",
      "",
      "RESOURCES",
      "• Board and pens, the key words, and any worksheet or clip you choose.",
    ];
    return [{ title: "Lesson plan", text: lines.join("\n") }];
  },
};

const remarks: Writer = {
  fields: [
    f("name", "Learner's first name", "Amaka"),
    f("strength", "One strength", "explains her reasoning clearly in maths"),
    f("next", "One next step", "show every step of working in written answers"),
    f("subject", "Subject, optional", "Mathematics"),
  ],
  required: ["name", "strength", "next"],
  variants: true,
  run: (v, variant) => {
    const name = clean(v.name).split(" ")[0] ?? "";
    const strength = inline(v.strength);
    const next = inline(v.next);
    const subject = clean(v.subject) ? ` in ${clean(v.subject)}` : "";
    const options = [
      `${name} has worked well this term${subject} and ${strength}. The next step is to ${next}, which will help build on this good progress.`,
      `It has been a pleasure to see ${name} grow${subject} this term; a real strength is that ${name} ${strength}. Going forward, ${name} should aim to ${next}.`,
      `${name} ${strength}, and this has been clear in class${subject}. To keep improving, ${name} should focus on learning to ${next}.`,
    ];
    return [0, 1, 2].map((offset) => ({ title: `Option ${offset + 1}`, text: pick(options, variant, offset) }));
  },
};

const soap: Writer = {
  fields: [
    a("s", "Subjective: what the patient reports", "No names or file numbers"),
    a("o", "Objective: what you observed or measured"),
    a("a", "Assessment: your clinical impression"),
    a("p", "Plan: what happens next"),
  ],
  required: ["s"],
  variants: false,
  run: (v) => {
    const part = (label: string, value: string | undefined) => [label, ...(bullets(value).length ? bullets(value).map((line) => `• ${line}`) : ["• Not recorded."]), ""];
    const text = [
      ...part("S — SUBJECTIVE", v.s),
      ...part("O — OBJECTIVE", v.o),
      ...part("A — ASSESSMENT", v.a),
      ...part("P — PLAN", v.p),
      "Formatter only. Copy into the official record; do not store patient details here.",
    ].join("\n");
    return [{ title: "SOAP note", text }];
  },
};

const readme: Writer = {
  fields: [
    f("name", "Project name", "weather-cli"),
    a("what", "What it does", "Shows the forecast for any city in the terminal."),
    a("features", "Main features, one per line, optional"),
    a("install", "How to install", "npm install -g weather-cli"),
    a("run", "How to run it", "weather lagos"),
    f("license", "License, optional", "MIT"),
  ],
  required: ["name", "what"],
  variants: false,
  run: (v) => {
    const block = (value: string | undefined) => (clean(value) ? ["```", (value ?? "").trim(), "```"] : ["Add the command here."]);
    const lines = [`# ${clean(v.name)}`, "", sentence(v.what), ""];
    if (items(v.features).length) lines.push("## Features", "", ...items(v.features).map((item) => `- ${item}`), "");
    lines.push("## Installation", "", ...block(v.install), "", "## Usage", "", ...block(v.run), "");
    lines.push("## Contributing", "", "Issues and pull requests are welcome. Describe the change and how you tested it.", "");
    if (clean(v.license)) lines.push("## License", "", `${clean(v.license)}. See the LICENSE file for details.`);
    return [{ title: "README.md", text: lines.join("\n").trim() }];
  },
};

const coldEmail: Writer = {
  fields: [
    f("me", "Your name and what you do", "Tolu, I run a bakery supply business"),
    f("them", "Who you are writing to", "Mrs Ade, owner of Crust & Co"),
    f("why", "Why them, specifically", "your new branch in Lekki opened last month"),
    f("ask", "What you want", "a 15-minute call to show our wholesale prices"),
    f("proof", "One fact that earns trust, optional", "we supply 40 bakeries in Lagos"),
  ],
  required: ["me", "them", "ask"],
  variants: true,
  run: (v, variant) => {
    const meName = clean(v.me).split(/[,–-]/)[0]?.trim() ?? "";
    const meRest = clean(v.me).includes(",") ? inline(clean(v.me).split(",").slice(1).join(",")) : "";
    const them = clean(v.them);
    const greetName = them.split(/[,–-]| owner| manager| at /i)[0]?.trim() || "there";
    const ask = inline(v.ask);
    const why = inline(v.why);
    const proof = inline(v.proof);
    const subjects = [`Quick question for ${greetName}`, `${meName}${meRest ? ` – ${meRest}` : ""}`.slice(0, 70), `Could we talk this week, ${greetName}?`];
    const bodies = [
      [
        `Hi ${greetName},`,
        "",
        `I'm ${meName}${meRest ? ` — ${meRest}` : ""}.${why ? ` I'm reaching out because ${why}.` : ""}`,
        proof ? `${sentence(proof)}` : "",
        "",
        `Would you be open to ${ask}? If it's not a fit, a quick “no thanks” is completely fine.`,
        "",
        "Best,",
        meName,
      ],
      [
        `Dear ${greetName},`,
        "",
        why ? `I noticed ${why}, and I thought this might be useful.` : "I'll keep this short.",
        `My name is ${meName}${meRest ? ` and ${meRest}` : ""}.${proof ? ` ${sentence(proof)}` : ""}`,
        "",
        `Could we arrange ${ask}? I'm happy to work around your schedule.`,
        "",
        "Kind regards,",
        meName,
      ],
      [
        `Hello ${greetName},`,
        "",
        `${meName} here${meRest ? ` — ${meRest}` : ""}.`,
        `${why ? `Since ${why}, ` : ""}I'd like to ask for ${ask}.${proof ? ` For context, ${proof}.` : ""}`,
        "",
        "Does next week work? Reply with a time that suits you.",
        "",
        "Thanks,",
        meName,
      ],
    ];
    return [0, 1, 2].map((offset) => ({
      title: `Email ${offset + 1}`,
      text: [`Subject: ${pick(subjects, variant, offset)}`, "", ...pick(bodies, variant, offset).filter((line, index, all) => !(line === "" && all[index - 1] === ""))]
        .join("\n")
        .replace(/\n{3,}/g, "\n\n"),
    }));
  },
};

const adCopy: Writer = {
  fields: [
    f("product", "Product or service", "Same-day laundry pickup"),
    f("audience", "Who it is for", "busy professionals in Abuja"),
    f("benefit", "The main benefit", "clean clothes without losing your weekend"),
    f("offer", "The offer, if any", "20% off your first order"),
    f("cta", "Call to action", "Book on WhatsApp"),
  ],
  required: ["product", "benefit"],
  variants: true,
  run: (v, variant) => {
    const product = clean(v.product);
    const audience = inline(v.audience);
    const benefit = inline(v.benefit);
    const offer = clean(v.offer);
    const cta = clean(v.cta) || "Learn more";
    const lines = [
      `${sentence(benefit)} ${product} — made for ${audience || "you"}.${offer ? ` ${sentence(offer)}` : ""} ${cta}.`,
      `${audience ? `${capital(audience)}: ` : ""}still putting it off? ${product} means ${benefit}.${offer ? ` ${sentence(offer)}` : ""} ${cta}.`,
      `What if ${benefit} was the easy part? ${product}.${offer ? ` ${sentence(offer)}` : ""} ${cta}.`,
      `${product}. ${sentence(benefit)}${offer ? ` ${sentence(offer)}` : ""} ${cta} today.`,
      `Stop worrying about it. ${product} gives ${audience || "you"} ${benefit}. ${cta}.`,
    ].map((line) => line.replace(/\.\./g, ".").replace(/\s+/g, " ").trim());
    return [0, 1, 2].map((offset) => ({ title: `Ad ${offset + 1}`, text: pick(lines, variant, offset) }));
  },
};

const letters: Writer = {
  fields: [
    a("from", "Your name and address", "Bola Okoro\n12 Allen Avenue, Ikeja"),
    a("to", "Who it is to", "The Manager\nFirst Estate Ltd"),
    f("subject", "Subject", "Refund of security deposit"),
    a("facts", "What happened, one point per line"),
    f("request", "What you are asking for", "refund the ₦200,000 deposit"),
    f("deadline", "By when, optional", "within 14 days"),
  ],
  required: ["to", "subject", "request"],
  variants: true,
  run: (v, variant) => {
    const from = (v.from ?? "").trim();
    const to = (v.to ?? "").trim();
    const name = from.split("\n")[0]?.trim() ?? "";
    const facts = bullets(v.facts);
    const opener = pick(
      [`I am writing regarding ${inline(v.subject)}.`, `I write in connection with ${inline(v.subject)}.`, `This letter concerns ${inline(v.subject)}.`],
      variant,
    );
    const ask = inline(v.request);
    const lines = [
      from,
      "",
      longDate(),
      "",
      to,
      "",
      "Dear Sir or Madam,",
      "",
      `RE: ${clean(v.subject).toUpperCase()}`,
      "",
      opener,
      "",
      ...(facts.length ? [facts.length === 1 ? facts[0]! : facts.map((fact, index) => `${index + 1}. ${fact}`).join("\n"), ""] : []),
      `I therefore request that you ${ask}${clean(v.deadline) ? ` ${inline(v.deadline)}` : ""}.`,
      pick(["I would appreciate a written response.", "Please confirm in writing once this has been done.", "I look forward to your prompt response."], variant),
      "",
      "Yours faithfully,",
      "",
      "",
      name,
    ];
    return [{ title: "Letter", text: lines.join("\n").replace(/\n{3,}/g, "\n\n\n").trim() }];
  },
};

const captions: Writer = {
  fields: [
    f("product", "Product", "Shea butter body cream"),
    f("photo", "What the photo shows", "the jar on a sunny windowsill"),
    f("feel", "The feeling or benefit", "soft skin all day"),
    f("cta", "What people should do", "DM to order"),
    f("tags", "Hashtags, optional", "#lagosbusiness #skincare"),
  ],
  required: ["product"],
  variants: true,
  run: (v, variant) => {
    const product = clean(v.product);
    const photo = inline(v.photo);
    const feel = inline(v.feel);
    const cta = clean(v.cta) || "Link in bio";
    const own = clean(v.tags).split(/\s+/).filter((tag) => tag.startsWith("#"));
    const auto = topWords(`${product} ${v.feel ?? ""}`, 3).map((word) => `#${word.replace(/[^a-z0-9]/g, "")}`);
    const tags = [...new Set([...own, ...auto])].slice(0, 6).join(" ");
    const options = [
      `${feel ? `${sentence(feel)} ` : ""}That's what ${product} is about ✨${photo ? `\nCaught ${photo}.` : ""}\n${cta} 👇`,
      `Meet your new favourite: ${product}.${feel ? ` Made for ${feel}.` : ""}\n${cta}.`,
      `${photo ? `${sentence(photo)} ` : ""}Simple, honest, and made to last — ${product}.\n${cta} 💬`,
      `POV: you finally found ${product}${feel ? ` and ${feel} is your new normal` : ""}.\n${cta}.`,
      `Small business, big care 🤍 ${product}${feel ? ` for ${feel}` : ""}.\n${cta}.`,
    ];
    return [0, 1, 2].map((offset) => ({ title: `Caption ${offset + 1}`, text: `${pick(options, variant, offset)}${tags ? `\n\n${tags}` : ""}` }));
  },
};

const listing: Writer = {
  fields: [
    f("name", "Product", "Ankara tote bag"),
    f("material", "Material", "cotton Ankara print, lined"),
    f("size", "Size or measurements", "40 × 35 cm"),
    f("colour", "Colour or variants", "blue and orange print"),
    a("included", "What is included or special, one per line", "inner zip pocket\nmagnetic closure"),
    f("for", "Best for, optional", "work, market runs, and travel"),
    f("condition", "Condition", "Brand new"),
  ],
  required: ["name"],
  variants: true,
  run: (v, variant) => {
    const name = titleCase(clean(v.name));
    const extras = items(v.included);
    const title = [name, clean(v.material).split(",")[0], clean(v.colour), clean(v.size)].filter(Boolean).join(" – ").slice(0, 120);
    const details = [
      clean(v.material) && `Material: ${clean(v.material)}`,
      clean(v.size) && `Size: ${clean(v.size)}`,
      clean(v.colour) && `Colour: ${clean(v.colour)}`,
      clean(v.condition) && `Condition: ${clean(v.condition)}`,
      ...extras.map((item) => sentence(item).replace(/\.$/, "")),
    ].filter(Boolean) as string[];
    const intro = pick(
      [
        `This ${name.toLowerCase()} is ${clean(v.material) ? `made from ${inline(v.material)}` : "made with care"}${clean(v.for) ? `, ready for ${inline(v.for)}` : ""}.`,
        `Looking for a ${name.toLowerCase()} that works as hard as you do?${clean(v.for) ? ` Perfect for ${inline(v.for)}.` : ""}`,
        `${name}${clean(v.colour) ? ` in ${inline(v.colour)}` : ""}${clean(v.for) ? ` — great for ${inline(v.for)}` : ""}.`,
      ],
      variant,
    );
    const text = [intro, "", ...details.map((line) => `• ${line}`), extras.length ? "" : "", "Message us with any questions before you order."]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
    return [
      { title: "Title", text: title },
      { title: "Description", text },
    ];
  },
};

export const FORM_WRITERS: Record<string, Writer> = {
  "case-brief": caseBrief,
  outliner,
  lesson,
  remarks,
  "soap-note": soap,
  readme,
  "cold-email": coldEmail,
  "ad-copy": adCopy,
  letters,
  captions,
  listing,
};

export { list };
