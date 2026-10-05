import { clean } from "./text.ts";

// Turns what people actually type ("Eunice. I am a videographer", "because they
// are an event planner", "I want to be shooting their videos") into pieces that
// read well inside a sentence. Runs on the device; no model, no network.

const TITLE = /^(?:mr|mrs|ms|miss|dr|prof|chief|alhaji|alhaja|pastor|engr|barr|sir|madam)\.?$/i;

/** Cut a clause off its trailing punctuation and spare spaces. */
function trim(text: string): string {
  return clean(text).replace(/^[\s,.;:–—-]+|[\s,.;:!?–—-]+$/g, "");
}

function lowerFirst(text: string): string {
  if (!text || /^[A-Z]{2,}\b/.test(text) || /^I(?:\b|['’])/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** "a videographer" / "an event planner" / "the owner of Crust & Co". */
export function withArticle(noun: string): string {
  const text = trim(noun);
  if (!text) return "";
  if (/^(?:a|an|the|my|our|your)\s/i.test(text)) return lowerFirst(text);
  if (/\bof\b/i.test(text)) return `the ${lowerFirst(text)}`;
  return `${/^[aeiou]/i.test(text) && !/^(?:uni|use|one|eu)/i.test(text) ? "an" : "a"} ${lowerFirst(text)}`;
}

/** Drop a leading "a"/"an" from a role: "a videographer" → "videographer". */
export function bareRole(text: string): string {
  return trim(text).replace(/^(?:a|an)\s+/i, "");
}

/** Contractions that make an email sound like a person wrote it. */
export function contract(text: string): string {
  return text
    .replace(/\bI am\b/g, "I'm")
    .replace(/\byou are\b/gi, (m) => (m[0] === "Y" ? "You're" : "you're"))
    .replace(/\bwe are\b/gi, (m) => (m[0] === "W" ? "We're" : "we're"))
    .replace(/\bit is\b/g, "it's")
    .replace(/\bdo not\b/g, "don't")
    .replace(/\bI would\b/g, "I'd")
    .replace(/\byou will\b/gi, (m) => (m[0] === "Y" ? "You'll" : "you'll"));
}

/** Talk to the reader, not about them: "they are" → "you are", "their" → "your". */
export function toYou(text: string): string {
  return text
    .replace(/\bthey're\b/gi, "you're")
    .replace(/\bthey are\b/gi, "you are")
    .replace(/\bthey were\b/gi, "you were")
    .replace(/\bthey have\b/gi, "you have")
    .replace(/\bthey've\b/gi, "you've")
    .replace(/\bthey'll\b/gi, "you'll")
    .replace(/\bthey need\b/gi, "you need")
    .replace(/\bthey\b/gi, "you")
    .replace(/\btheirs\b/gi, "yours")
    .replace(/\btheir\b/gi, "your")
    .replace(/\bthemselves\b/gi, "yourself")
    .replace(/\bthem\b/gi, "you")
    .replace(/\b(?:he|she) is\b/gi, "you are")
    .replace(/\b(?:he|she) has\b/gi, "you have")
    .replace(/\byou (needs|wants|does|has|is|likes|plans|runs|owns|works)\b/gi, (_m, verb: string) => `you ${({ needs: "need", wants: "want", does: "do", has: "have", is: "are", likes: "like", plans: "plan", runs: "run", owns: "own", works: "work" } as Record<string, string>)[verb.toLowerCase()]}`)
    .replace(/\byour (?:videos|work|events?|photos|business|shop|clients?|customers?) for you\b/gi, (m) => m.replace(/ for you$/i, ""));
}

/** Remove the first matching lead-in ("because ", "I want to ", …). */
export function stripLead(text: string, leads: RegExp[]): string {
  let out = trim(text);
  for (let pass = 0; pass < 3; pass += 1) {
    const before = out;
    for (const lead of leads) out = trim(out.replace(lead, ""));
    if (out === before) break;
  }
  return out;
}

export type Person = { name: string; role: string; roleIsClause: boolean };

const SELF_LEAD = /^(?:hi|hello|hey)[,!]?\s*/i;
const SELF_NAME = /^(?:i am|i'm|im|my name is|this is|it's|its)\s+/i;
const ROLE_LEAD = /^(?:and\s+)?(?:i am|i'm|im|i work as|i'm working as|i am working as|my job is|by profession,?)\s+/i;
const CLAUSE_LEAD = /^(?:and\s+)?(?:i|we)\s+(?:run|own|make|sell|offer|provide|do|help|build|teach|cook|bake|design|supply|manage|work)\b/i;

/** Split "Eunice. I am a videographer" / "Tolu, I run a bakery" / "Ruth event planner" into a name and a role. */
export function person(raw: string | undefined, extraRole = ""): Person {
  const text = trim(clean(raw).replace(SELF_LEAD, "").replace(SELF_NAME, ""));
  let name = "";
  let rest = "";
  const split = /^(.+?)(?:\s*[.,;:–—|]\s*|\s+-\s+|\s+(?=(?:and\s+)?(?:i am|i'm|im|i work|i run|i own|we|from|of)\b))(.*)$/i.exec(text);
  if (split) {
    name = trim(split[1]);
    rest = trim(split[2]);
  } else {
    name = text;
  }
  // "Ruth event planner": capitalised words are the name, lower-case words after them are the role.
  const words = name.split(/\s+/);
  if (words.length > 1) {
    let cut = 0;
    while (cut < words.length && cut < 4 && (/^[A-Z][\p{L}'’-]*\.?$/u.test(words[cut]) || TITLE.test(words[cut]))) cut += 1;
    if (cut > 0 && cut < words.length) {
      rest = trim(`${words.slice(cut).join(" ")}${rest ? `, ${rest}` : ""}`);
      name = words.slice(0, cut).join(" ");
    } else if (cut === 0) {
      rest = trim(`${name}${rest ? `, ${rest}` : ""}`);
      name = "";
    }
  } else if (words.length === 1 && !/^[A-Z\p{Lu}]/u.test(name) && name) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  let role = trim(extraRole) || rest;
  const isClause = CLAUSE_LEAD.test(role);
  role = isClause ? trim(role.replace(/^and\s+/i, "")) : bareRole(stripLead(role, [ROLE_LEAD]));
  return { name: trim(name), role: isClause ? role : lowerFirst(role), roleIsClause: isClause };
}

/** "I'm Eunice, a videographer." / "I'm Tolu, and I run a bakery supply business." */
export function introduce(me: Person, style: "im" | "name" | "here"): string {
  const role = me.role ? (me.roleIsClause ? contract(me.role) : withArticle(me.role)) : "";
  if (style === "name") return `My name is ${me.name}${role ? (me.roleIsClause ? `, and ${role}` : `, and I'm ${role}`) : ""}.`;
  if (style === "here") return `${me.name} here${role ? (me.roleIsClause ? `. ${role.charAt(0).toUpperCase()}${role.slice(1)}` : `, ${role}`) : ""}.`;
  return `I'm ${me.name}${role ? (me.roleIsClause ? `, and ${role}` : `, ${role}`) : ""}.`;
}

const ING_TO_BASE: Record<string, string> = {
  shooting: "shoot", filming: "film", editing: "edit", making: "make", creating: "create", designing: "design", writing: "write",
  taking: "take", planning: "plan", running: "run", doing: "do", providing: "provide", supplying: "supply", selling: "sell",
  helping: "help", building: "build", managing: "manage", handling: "handle", covering: "cover", capturing: "capture",
  producing: "produce", delivering: "deliver", cooking: "cook", baking: "bake", cleaning: "clean", fixing: "fix",
  teaching: "teach", recording: "record", photographing: "photograph", organising: "organise", organizing: "organize",
  decorating: "decorate", catering: "cater", printing: "print", styling: "style", hosting: "host", working: "work",
  partnering: "partner", collaborating: "collaborate", offering: "offer", showing: "show", sharing: "share", setting: "set",
  growing: "grow", improving: "improve", training: "train", tutoring: "tutor", translating: "translate", repairing: "repair",
};

export type Offer = { kind: "verb" | "gerund" | "noun"; text: string };

/** "I want to be shooting their videos for them" → { verb, "shoot your videos" }. */
export function offer(raw: string | undefined): Offer | null {
  let text = stripLead(clean(raw), [
    /^(?:i|we)\s+(?:really\s+)?(?:want|would like|'d like|wish|hope|plan|intend|am hoping|are hoping)\s+to\s+/i,
    /^(?:i|we)'d\s+(?:love|like)\s+to\s+/i,
    /^(?:i|we)\s+(?:can|could|will)\s+/i,
    /^(?:to|that i|that we)\s+/i,
    /^(?:offer|offering)\s+(?:to\s+)?/i,
  ]);
  text = trim(toYou(text)).replace(/^be\s+(?=\w+ing\b)/i, "");
  if (!text) return null;
  const [first, ...rest] = text.split(/\s+/);
  // "cleaning services", "catering packages": a description, not something to do.
  if (/ing$/i.test(first) && /^(?:services?|products?|supplies|solutions?|packages?|equipment|materials?|items?|kits?|classes|lessons|sessions?|plans?)\b/i.test(rest[0] ?? "")) {
    return { kind: "noun", text: lowerFirst(text) };
  }
  const base = ING_TO_BASE[first.toLowerCase()];
  if (base) return { kind: "verb", text: [base, ...rest].join(" ") };
  if (/ing$/i.test(first)) return { kind: "gerund", text: lowerFirst(text) };
  if (/^(?:a|an|the|some|my|our|\d)/i.test(first) || /s$/i.test(first)) return { kind: "noun", text: lowerFirst(text) };
  return { kind: "verb", text: lowerFirst(text) };
}

/** A sentence offering the thing, in one of a few wordings. */
export function offerSentence(item: Offer, style: number): string {
  if (item.kind === "verb") return [`I'd love to ${item.text}.`, `I'd be glad to ${item.text}.`, `I can ${item.text}.`][style % 3];
  if (item.kind === "gerund") return [`I'd love to help with ${item.text}.`, `I'd be glad to help with ${item.text}.`, `I can help with ${item.text}.`][style % 3];
  return [`I'd love to offer you ${item.text}.`, `I'd be glad to provide ${item.text}.`, `I can offer ${item.text}.`][style % 3];
}

const MEETING = /\b(?:call|chat|meet|meeting|talk|coffee|zoom|whatsapp|demo|quote|reply|minutes?|mins?|catch up|visit|sample|samples|portfolio|proposal|discuss)\b/i;

/** Does this read like a next step ("a quick call") rather than an offer ("shoot your videos")? */
export function looksLikeNextStep(raw: string | undefined): boolean {
  const text = clean(raw);
  return Boolean(text) && MEETING.test(text) && text.split(/\s+/).length <= 14;
}

export type Ask = { kind: "noun" | "verb"; text: string };

/** "I'd like to have a call" → { noun, "a call" }; "meet next week" → { verb, "meet next week" }. */
export function ask(raw: string | undefined): Ask | null {
  const text = stripLead(clean(raw), [
    /^(?:i|we)\s+(?:want|would like|wish|hope)\s+(?:to\s+)?(?:have\s+|get\s+|book\s+|schedule\s+|set up\s+)?/i,
    /^(?:i|we)['’]d\s+(?:like|love)\s+(?:to\s+)?(?:have\s+|get\s+|book\s+|schedule\s+|set up\s+)?/i,
    /^(?:can|could|shall)\s+we\s+/i,
    /^(?:to\s+)?(?:have|get|book|schedule|set up)\s+(?=a|an|some|\d)/i,
    /^to\s+/i,
  ]).replace(/\?$/, "");
  if (!text) return null;
  const first = text.split(/\s+/)[0].toLowerCase();
  if (/^(?:a|an|the|some|your|\d+|one|two|five|ten|fifteen|twenty|thirty)$/.test(first)) return { kind: "noun", text: lowerFirst(toYou(text)) };
  return { kind: "verb", text: lowerFirst(toYou(text)) };
}

/** "Would you be open to a quick call this week?" / "Could we meet next week?" */
export function askQuestion(item: Ask, style: number): string {
  if (item.kind === "noun") return [`Would you be open to ${item.text}?`, `Would ${item.text} work for you?`, `Could we set up ${item.text}?`][style % 3];
  return [`Could we ${item.text}?`, `Would you be free to ${item.text}?`, `Could we ${item.text}?`][style % 3];
}

/** "because they are an event planner" → "you're an event planner". */
export function reason(raw: string | undefined): string {
  const text = stripLead(clean(raw), [
    /^(?:it'?s\s+)?because\s+(?:of\s+)?/i,
    /^(?:since|as)\s+/i,
    /^(?:i|we)\s+(?:noticed|saw|see|heard|read|came across)\s+(?:that\s+)?/i,
  ]);
  return trim(contract(toYou(lowerFirst(text))));
}

/** A first-person fact, tidied: "we supply 40 bakeries" → "We supply 40 bakeries." */
export function fact(raw: string | undefined): string {
  const text = trim(contract(clean(raw).replace(/^(?:because|also|and|plus)\s+/i, "")));
  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

/** A product name for the middle of a sentence: brands keep their capitals ("Crust & Co"), plain phrases don't. */
export function midPhrase(text: string): string {
  const value = trim(text);
  const parts = value.split(/\s+/);
  if (parts.length > 1 && /^[A-Z&]/.test(parts[1])) return value;
  return lowerFirst(value);
}

/** True when the text is a full clause ("you will look like a queen") rather than a phrase ("soft skin all day"). */
export function isClause(text: string): boolean {
  return /^(?:you|your|it|it's|this|they|we|i|i'm|she|he|our|my|everyone|people)\b/i.test(trim(text)) || /^(?:makes|helps|gives|saves|keeps|lets|brings|protects|stops|turns|works|feels|looks|smells|lasts)\b/i.test(trim(text));
}

const VERB_START = /^(?:is|are|was|has|have|can|could|will|does|did|shows?|works?|reads?|writes?|explains?|helps?|asks?|answers?|listens?|takes?|tries|tried|leads?|thinks?|solves?|uses?|draws?|speaks?|plays?|makes?|keeps?|completes?|participates?|contributes?|always|often|never|really|consistently)\b/i;
const QUALITY = /^(?:good|great|excellent|very|really|so|confident|careful|kind|polite|helpful|creative|hard[- ]?working|neat|curious|focused|organi[sz]ed|respectful|cheerful|keen|eager|quick|strong|brilliant|talented|gifted|attentive|enthusiastic|responsible|patient|thoughtful|friendly|clever|smart|bright)\b/i;

/** "he is good at maths" → "is good at maths"; "maths" → "is strong in maths". For "Tunde ___". */
export function learnerStrength(raw: string | undefined, name: string): string {
  const subject = new RegExp(`^(?:${name ? `${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|` : ""}he|she|they|this learner|the learner|my student)\\s+`, "i");
  let text = trim(clean(raw).replace(subject, ""));
  if (!text) return "";
  text = lowerFirst(text);
  if (VERB_START.test(text)) return text;
  if (QUALITY.test(text)) return `is ${text}`;
  return `is strong in ${text}`;
}

/** "he needs to stop talking in class" → "stop talking in class". For "Tunde should ___". */
export function learnerNext(raw: string | undefined, name: string): string {
  const subject = new RegExp(`^(?:${name ? `${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|` : ""}he|she|they|this learner|the learner)\\s+`, "i");
  const text = stripLead(clean(raw).replace(subject, ""), [
    /^(?:needs?|has|have|must|should|will need|is going|ought)\s+to\s+/i,
    /^(?:should|must|can|could|will)\s+/i,
    /^(?:try|work on|focus on)\s+(?=\w+ing\b)/i,
    /^to\s+/i,
  ]);
  if (!text) return "";
  const [first, ...rest] = text.split(/\s+/);
  const base = ING_TO_BASE[first.toLowerCase()];
  return lowerFirst(base ? [base, ...rest].join(" ") : /ing$/i.test(first) ? `work on ${text}` : text);
}

/** "I want them to refund my deposit" → "refund my deposit". For "I request that you ___". */
export function request(raw: string | undefined): string {
  return lowerFirst(
    stripLead(clean(raw), [
      /^(?:i|we)\s+(?:want|would like|'d like|need|am asking|are asking|demand|expect)\s+(?:you|them|him|her|the \w+)\s+to\s+/i,
      /^(?:i|we)\s+(?:want|would like|'d like|need|am asking for|are asking for|demand|request)\s+(?:to\s+)?(?=a|an|the|my|our|\w)/i,
      /^(?:i|we)['’]d\s+like\s+(?:you|them|him|her)\s+to\s+/i,
      /^(?:please|kindly)\s+/i,
      /^(?:can|could|would|will)\s+you\s+(?:please\s+)?/i,
      /^(?:you|they|he|she)\s+(?:should|must|need to|have to)\s+/i,
      /^to\s+/i,
    ]).replace(/\?$/, ""),
  );
}
