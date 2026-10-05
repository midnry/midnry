import type { Field } from "@/lib/kits";
import type { Piece, Values, Writer } from "./forms.ts";
import { sentences, topWords, words } from "./text.ts";

const area = (id: string, label: string, placeholder?: string): Field => ({ id, label, kind: "area", placeholder });
const line = (id: string, label: string, placeholder?: string): Field => ({ id, label, placeholder });

// ── Digest: an extractive summary. It picks the sentences that carry the most
// frequent ideas in the passage and keeps them in their original order. ─────────

export function summarise(text: string, count: number): { picked: string[]; total: number; terms: string[] } {
  const all = sentences(text);
  const tally = new Map<string, number>();
  for (const word of words(text)) tally.set(word, (tally.get(word) ?? 0) + 1);
  const top = Math.max(1, ...tally.values());
  const scored = all.map((item, index) => {
    const tokens = words(item);
    const weight = tokens.reduce((sum, word) => sum + (tally.get(word) ?? 0) / top, 0) / Math.max(4, Math.sqrt(tokens.length) * 2);
    const position = index === 0 ? 0.35 : index === all.length - 1 ? 0.1 : 0;
    const shape = tokens.length < 4 ? -0.5 : item.length > 400 ? -0.2 : 0;
    const numbers = /\d/.test(item) ? 0.05 : 0;
    return { item, index, score: weight + position + shape + numbers };
  });
  const picked = scored
    .slice()
    .sort((x, y) => y.score - x.score)
    .slice(0, Math.min(count, all.length))
    .sort((x, y) => x.index - y.index)
    .map((entry) => entry.item);
  return { picked, total: all.length, terms: topWords(text, 6) };
}

const digest: Writer = {
  fields: [area("text", "Passage", "Paste an article, chapter, or notes. Longer passages give better summaries.")],
  required: ["text"],
  variants: true,
  run: (v, variant) => {
    const text = v.text ?? "";
    const all = sentences(text);
    if (all.length < 3) return [{ title: "Summary", text: "That passage is too short to summarise. Paste at least a few sentences." }];
    const base = Math.max(3, Math.min(6, Math.round(all.length * 0.3)));
    const sizes = [...new Set([base, Math.min(all.length - 1, base + 2), Math.max(2, base - 1)])];
    const size = sizes[Math.abs(variant) % sizes.length]!;
    const { picked, total, terms } = summarise(text, size);
    return [
      { title: `Summary (${picked.length} of ${total} sentences)`, text: picked.join(" ") },
      { title: "Key points", text: picked.map((item) => `• ${item}`).join("\n") },
      { title: "Key terms", text: terms.join(", ") },
    ];
  },
};

// ── Contract: finds the clauses a reader should look at first. It quotes the
// contract's own sentences and never adds terms of its own. ────────────────────

const CONTRACT_PARTS: { title: string; test: RegExp; empty: string }[] = [
  {
    title: "Money",
    test: /(₦|\$|£|€|\bNGN\b|\bUSD\b|\bnaira\b|\bdollars?\b|\bpounds?\b|\bfee\b|\brent\b|\bpayment\b|\bdeposit\b|\bsalary\b|\bprice\b|\binvoice\b)/i,
    empty: "No amounts or payment terms were found.",
  },
  {
    title: "How it ends",
    test: /\b(terminat|cancel|expir|notice period|written notice|breach|end of (this|the) agreement)/i,
    empty: "Nothing was found on how it ends. Ask before signing.",
  },
  {
    title: "Dates and length",
    test: /(\bterm\b|\bperiod\b|\bcommenc|\beffective\b|\bstart date\b|\bduration\b|\b\d+\s*(days?|weeks?|months?|years?)\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/i,
    empty: "No start date or length was found.",
  },
  {
    title: "What each side must do",
    test: /\b(shall|must|agrees? to|undertakes?|is responsible for|will provide|obligat)/i,
    empty: "No duties were found.",
  },
];

const WATCH: [RegExp, string][] = [
  [/auto(matic(ally)?)?[- ]?renew|renew(s|ed)? automatically/i, "Renews automatically unless someone gives notice."],
  [/penalt|late fee|liquidated damages|interest (of|at)/i, "Mentions penalties, late fees, or interest."],
  [/non[- ]?compet|shall not (work|engage|compete)/i, "Limits work for others (non-compete)."],
  [/exclusiv/i, "Has an exclusivity term."],
  [/confidential|non[- ]?disclosure/i, "Has confidentiality duties."],
  [/indemnif|hold harmless/i, "Has an indemnity: one side covers the other's losses."],
  [/limitation of liability|not be liable|liability shall not exceed/i, "Limits how much one side can be held liable for."],
  [/governed by|governing law|jurisdiction/i, "Names the law or courts that apply."],
  [/arbitrat|mediat/i, "Disputes go to arbitration or mediation first."],
  [/non[- ]?refundable/i, "Something is non-refundable."],
];

function parties(text: string): string {
  const between = text.match(/between\s+([\s\S]{3,160}?)\s+and\s+([\s\S]{3,160}?)(?:[.;]|\s+\(|,\s*(?:hereinafter|whereby|who))/i);
  const defined = [...text.matchAll(/\((?:hereinafter\s+(?:referred to as\s+|called\s+)?)?["“]?(?:the\s+)?["“]?([A-Z][A-Za-z ]{2,30}?)["”]?\)/g)]
    .map((match) => match[1]!.trim())
    .filter((name, index, all) => all.indexOf(name) === index)
    .slice(0, 4);
  const lines: string[] = [];
  if (between) lines.push(`• ${between[1]!.replace(/\s+/g, " ").trim()}`, `• ${between[2]!.replace(/\s+/g, " ").trim()}`);
  if (defined.length) lines.push(`Called in the contract: ${defined.join(", ")}.`);
  return lines.length ? lines.join("\n") : "The parties were not clearly named. Check the first paragraph.";
}

const contract: Writer = {
  fields: [area("text", "Contract text", "Paste the full contract or the clauses you want to check.")],
  required: ["text"],
  variants: false,
  run: (v) => {
    const text = v.text ?? "";
    const all = sentences(text);
    if (all.length < 2) return [{ title: "Summary", text: "Paste more of the contract. A few clauses at least." }];
    const used = new Set<string>();
    const clip = (item: string) => (item.length > 320 ? `${item.slice(0, 317)}…` : item);
    const pieces: Piece[] = [{ title: "Parties", text: parties(text) }];
    for (const part of CONTRACT_PARTS) {
      const found = all.filter((item) => part.test.test(item) && !used.has(item)).slice(0, 4);
      found.forEach((item) => used.add(item));
      pieces.push({ title: part.title, text: found.length ? found.map((item) => `• ${clip(item)}`).join("\n") : part.empty });
    }
    const flags = WATCH.filter(([test]) => test.test(text)).map(([, note]) => `• ${note}`);
    pieces.push({ title: "Watch for", text: flags.length ? flags.join("\n") : "No common warning terms were found." });
    pieces.push({ title: "Before you sign", text: "This picks out sentences; it does not give legal advice. Read the whole contract, and ask a lawyer about anything that matters." });
    return pieces;
  },
};

// ── Code: language detection, a plain explanation, and common-mistake checks. ──

type Lang = "Python" | "JavaScript" | "TypeScript" | "Java" | "C#" | "C" | "C++" | "PHP" | "SQL" | "HTML" | "code";

export function detectLanguage(code: string): Lang {
  if (/<\/?(html|div|body|span|p|a|head)\b/i.test(code) && !/[;{]\s*$/m.test(code)) return "HTML";
  if (/^\s*(select|insert|update|delete|create table)\b/im.test(code) && /\bfrom\b|\binto\b|\btable\b/i.test(code)) return "SQL";
  if (/<\?php|\$[a-z_]+\s*=/i.test(code)) return "PHP";
  if (/^\s*(def |import \w|from \w+ import|class \w+.*:\s*$|elif |print\()/m.test(code) && !/[{};]\s*$/m.test(code)) return "Python";
  if (/#include\s*</.test(code)) return /std::|cout|cin|class\s+\w+/.test(code) ? "C++" : "C";
  if (/\bpublic\s+(static\s+)?(class|void|int|String)\b|System\.out\.print/.test(code)) return "Java";
  if (/\busing System\b|Console\.Write/.test(code)) return "C#";
  if (/:\s*(string|number|boolean|any)\b|\binterface\s+\w+|\btype\s+\w+\s*=/.test(code)) return "TypeScript";
  if (/\b(const|let|var|function)\b|=>|console\.log|document\./.test(code)) return "JavaScript";
  if (/^\s*(def |print\()/m.test(code)) return "Python";
  return "code";
}

function strip(value: string): string {
  return value.trim().replace(/[{;:]\s*$/, "").trim();
}

function explainLine(raw: string, lang: Lang): string | null {
  const text = raw.trim();
  if (!text || /^[{}()[\];]+$/.test(text)) return null;
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^(#|\/\/|--|\/\*|\*)\s*(.*)/)) && !/^#include/.test(text)) return m[2] ? `A note for people reading the code: “${m[2].replace(/\*\/$/, "").trim()}”.` : null;
  if ((m = text.match(/^(?:import|from)\s+([\w.@/'"-]+)/)) || (m = text.match(/require\(['"]([^'"]+)['"]\)/)) || (m = text.match(/^#include\s*[<"]([^>"]+)/)) || (m = text.match(/^using\s+([\w.]+)/)))
    return `Brings in ${m[1]!.replace(/['"]/g, "")} so this code can use what it provides.`;
  if ((m = text.match(/^(?:export\s+)?(?:public\s+|private\s+|abstract\s+)*class\s+(\w+)/))) return `Defines a class called ${m[1]} — a blueprint for creating objects with shared data and behaviour.`;
  if ((m = text.match(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/)) || (m = text.match(/^(?:export\s+)?(?:async\s+)?function\s*\*?\s*(\w+)\s*\(([^)]*)\)/)) || (m = text.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?([^)=]*)\)?\s*=>/)) || (m = text.match(/^(?:public|private|protected|static|\s)*(?:[\w<>[\]]+\s+)(\w+)\s*\(([^)]*)\)\s*\{?$/)))
    if (!/^(if|for|while|switch|catch|return)$/.test(m[1]!)) {
      const args = m[2]!.split(",").map((arg) => arg.trim().split(/[\s:=]/).filter(Boolean).pop()).filter(Boolean);
      return `Defines a function called ${m[1]}${args.length ? ` that takes ${args.join(", ")}` : " that takes no inputs"}. The indented or braced lines below are what it does.`;
    }
  if ((m = text.match(/^for\s+(\w+)\s+in\s+range\((.*)\)\s*:/))) return `Repeats the block below, with ${m[1]} counting through range(${m[2]}).`;
  if ((m = text.match(/^for\s+(\w+(?:,\s*\w+)?)\s+in\s+(.+):/))) return `Repeats the block below once for each item in ${m[2]}, calling the current item ${m[1]}.`;
  if ((m = text.match(/^for\s*\(\s*(?:let|var|int|const)?\s*(\w+)\s*=\s*([^;]+);\s*\w+\s*(<=?|>=?)\s*([^;]+);/))) return `A counting loop: ${m[1]} starts at ${m[2]!.trim()} and the block repeats while ${m[1]} ${m[3]} ${m[4]!.trim()}.`;
  if ((m = text.match(/^for\s*\(\s*(?:const|let|var)?\s*(\w+)\s+(?:of|in)\s+([^)]+)\)/))) return `Repeats the block for each item in ${m[2]!.trim()}, calling it ${m[1]}.`;
  if ((m = text.match(/^while\s*\(?(.+?)\)?\s*[:{]?$/))) return `Keeps repeating the block below as long as ${strip(m[1]!)} is true.`;
  if ((m = text.match(/^(?:}\s*)?(?:else\s+if|elif)\s*\(?(.+?)\)?\s*[:{]?$/))) return `Otherwise, if ${strip(m[1]!)}, runs the next block instead.`;
  if ((m = text.match(/^if\s*\(?(.+?)\)?\s*[:{]?$/))) return `Checks whether ${strip(m[1]!)}. The block below runs only if it is true.`;
  if (/^(}\s*)?else\s*[:{]?$/.test(text)) return "If none of the checks above were true, runs this block instead.";
  if (/^try\s*[:{]?$/.test(text)) return "Tries the block below; if something goes wrong, the matching except/catch block handles it.";
  if ((m = text.match(/^(?:}\s*)?(?:except|catch)\s*\(?([^):{]*)\)?/))) return `Handles an error${m[1]!.trim() ? ` of type ${m[1]!.trim()}` : ""} from the try block, so the program does not crash.`;
  if ((m = text.match(/^return\s*(.*?);?$/))) return m[1] ? `Sends ${m[1]} back as the function's result and stops the function.` : "Stops the function here.";
  if ((m = text.match(/^(?:print|console\.log|System\.out\.println|System\.out\.print|printf|echo|Console\.WriteLine|cout\s*<<)\s*\(?(.*?)\)?;?$/))) return `Shows ${m[1] || "a value"} on the screen (or in the console).`;
  if ((m = text.match(/^(?:const|let|var|final|int|float|double|String|string|bool|boolean|char|long|auto)\s+(\w+)\s*(?::\s*[\w<>[\]]+)?\s*=\s*(.+?);?$/)))
    return `Creates ${/^(const|final)/.test(text) ? "a constant" : "a variable"} named ${m[1]} holding ${m[2]!.length > 60 ? "the value on the right" : m[2]}.`;
  if ((m = text.match(/^(\w+(?:\.\w+|\[[^\]]+\])*)\s*([+\-*/])=\s*(.+?);?$/))) return `${m[2] === "+" ? "Adds" : m[2] === "-" ? "Subtracts" : m[2] === "*" ? "Multiplies by" : "Divides by"} ${m[3]} ${m[2] === "+" ? "to" : m[2] === "-" ? "from" : ""} ${m[1]}.`.replace(/\s+/g, " ");
  if ((m = text.match(/^(\w+)(\+\+|--);?$/))) return `${m[2] === "++" ? "Adds 1 to" : "Subtracts 1 from"} ${m[1]}.`;
  if ((m = text.match(/^(\w+(?:\.\w+|\[[^\]]+\])*)\s*=\s*(.+?);?$/)) && !/[=!<>]=/.test(text.slice(0, text.indexOf("=") + 2)))
    return `Stores ${m[2]!.length > 60 ? "the value on the right" : m[2]} in ${m[1]}.`;
  if (lang === "SQL" && (m = text.match(/^select\s+(.+?)\s+from\s+(\w+)/i))) return `Reads ${m[1]} from the ${m[2]} table.`;
  if ((m = text.match(/^(\w+(?:\.\w+)*)\((.*)\);?$/))) return `Calls ${m[1]}${m[2] ? ` with ${m[2]}` : ""}.`;
  return null;
}

const explainer: Writer = {
  fields: [area("code", "Code", "Paste a short snippet (up to about 80 lines).")],
  required: ["code"],
  variants: false,
  run: (v) => {
    const code = (v.code ?? "").replace(/\t/g, "    ");
    const lang = detectLanguage(code);
    const lines = code.split("\n").slice(0, 120);
    const funcs = [...code.matchAll(/(?:def|function)\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g)].map((m) => m[1] ?? m[2]);
    const classes = [...code.matchAll(/class\s+(\w+)/g)].map((m) => m[1]);
    const loops = (code.match(/^\s*(for|while)\b/gm) ?? []).length;
    const checks = (code.match(/^\s*(if|elif|else if)\b|}\s*else if\b/gm) ?? []).length;
    const overview = [
      `This looks like ${lang === "code" ? "code in a language Midnry could not identify" : lang}, ${lines.filter((item) => item.trim()).length} lines long.`,
      classes.length ? `It defines ${classes.length === 1 ? "a class" : `${classes.length} classes`}: ${classes.join(", ")}.` : "",
      funcs.length ? `It defines ${funcs.length === 1 ? "one function" : `${funcs.length} functions`}: ${funcs.join(", ")}.` : "",
      loops ? `It repeats work with ${loops} loop${loops === 1 ? "" : "s"}.` : "",
      checks ? `It makes ${checks} decision${checks === 1 ? "" : "s"} with if statements.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const notes = lines
      .map((item, index) => ({ index, note: explainLine(item, lang), text: item.trim() }))
      .filter((entry) => entry.note)
      .slice(0, 40)
      .map((entry) => `Line ${entry.index + 1}: ${entry.text.length > 70 ? `${entry.text.slice(0, 67)}…` : entry.text}\n→ ${entry.note}`);
    return [
      { title: "Overview", text: overview },
      { title: "Line by line", text: notes.length ? notes.join("\n\n") : "No lines Midnry recognises. Try a shorter snippet with functions, loops, or variables." },
    ];
  },
};

// ── Bugs: checks code for common mistakes, and explains a pasted error. ───────

const ERRORS: [RegExp, string][] = [
  [/cannot read propert(y|ies) of (undefined|null)|undefined is not an object/i, "Something you expected to exist is undefined or null. Check the value just before the dot on that line — it was never set, or a lookup found nothing."],
  [/is not a function/i, "You called something with () that is not a function. Check the spelling, and that the value is what you think it is."],
  [/is not defined|NameError|cannot find symbol|undeclared identifier/i, "A name is used before it exists. Check spelling and capitals, and that the variable or import is declared first."],
  [/IndentationError|unexpected indent|expected an indented block/i, "Python indentation is off. Every line in a block must be indented by the same amount, using spaces only."],
  [/SyntaxError|invalid syntax|unexpected token|expected ['";)]/i, "The code breaks a grammar rule. Look for a missing bracket, quote, colon, or comma on that line or the line above."],
  [/IndexError|index out of range|ArrayIndexOutOfBounds|out of bounds/i, "You asked for a position past the end of a list. Lists start at 0, so the last item is length − 1."],
  [/KeyError/i, "A dictionary key is missing. Check the spelling, or use .get(key) to allow for a missing key."],
  [/ZeroDivisionError|divide by zero|division by zero/i, "Something is divided by zero. Check the value before dividing."],
  [/ModuleNotFoundError|ImportError|Cannot find module|module not found/i, "A package or file could not be found. Install it, or check the import path."],
  [/NullPointerException/i, "You used an object that is null. Make sure it is created before you call methods on it."],
  [/ValueError|invalid literal|NumberFormatException|NaN/i, "A value is the wrong kind, such as text where a number was expected. Convert or check the input first."],
  [/TypeError/i, "An operation got a value of the wrong type, such as adding text to a number or calling None. Check the types on that line."],
  [/Segmentation fault|segfault/i, "The program touched memory it should not, often an uninitialised pointer or an index past an array's end."],
  [/maximum recursion|stack overflow|too much recursion/i, "A function keeps calling itself without stopping. Check the base case."],
  [/CORS|Access-Control-Allow-Origin/i, "The browser blocked a request to another site. The server must allow your site, or call it from your own server."],
];

type Finding = { line: number; text: string };

/** The condition of an if/while on this line, for C-style (brackets) or Python (colon) syntax. */
function conditionOf(text: string): string | null {
  const start = text.search(/\b(?:if|while|elif)\b/);
  if (start < 0) return null;
  const rest = text.slice(start).replace(/^(?:if|while|elif)\s*/, "");
  if (rest.startsWith("(")) {
    let depth = 0;
    for (let i = 0; i < rest.length; i += 1) {
      if (rest[i] === "(") depth += 1;
      else if (rest[i] === ")") {
        depth -= 1;
        if (depth === 0) return rest.slice(1, i);
      }
    }
    return rest.slice(1);
  }
  const colon = rest.lastIndexOf(":");
  return colon > 0 ? rest.slice(0, colon) : null;
}

function findMistakes(code: string, lang: Lang): Finding[] {
  const out: Finding[] = [];
  const lines = code.split("\n");
  const add = (line: number, text: string) => {
    if (out.length < 25 && !out.some((item) => item.line === line && item.text === text)) out.push({ line, text });
  };
  lines.forEach((raw, index) => {
    const n = index + 1;
    const text = raw.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""').replace(/(\/\/|#(?!include)).*$/, "");
    if (!text.trim()) return;
    const condition = conditionOf(text);
    if (condition && /(^|[^=!<>+\-*/%&|^:])=(?![=>])/.test(condition) && !/\b(let|const|var)\b|:=/.test(condition))
      add(n, "Single = inside a condition assigns a value instead of comparing. Use == (or === in JavaScript).");
    if (lang === "Python") {
      if (/^\s*(def|class|if|elif|else|for|while|try|except|finally|with)\b[^:]*$/.test(text) && !/\\\s*$/.test(text) && !/[([{,]\s*$/.test(text))
        add(n, "This line starts a block but has no colon (:) at the end.");
      if (/^\s*print\s+[^(=]/.test(text)) add(n, "print needs brackets in Python 3: print(...).");
      if (/[=!]=\s*None\b/.test(text)) add(n, "Compare with None using “is None” or “is not None”.");
      if (/def\s+\w+\([^)]*=\s*(\[\]|\{\}|list\(\)|dict\(\))/.test(text)) add(n, "A list or dict as a default argument is shared between calls. Use None and create it inside the function.");
      if (/^\s*except\s*:/.test(text)) add(n, "A bare except hides every error, including typos. Catch a specific error type.");
      if (/^\t+ +| +\t/.test(raw)) add(n, "Tabs and spaces are mixed in the indentation. Use spaces only.");
    }
    if (lang === "JavaScript" || lang === "TypeScript") {
      if (/[^=!]==[^=]|!=[^=]/.test(text)) add(n, "== and != convert types before comparing. Use === and !== to avoid surprises.");
      if (/\bvar\s/.test(text)) add(n, "var is function-scoped and easy to misuse. Prefer let or const.");
      if (/\.length\s*\(\)/.test(text)) add(n, ".length is a property in JavaScript, not a function. Remove the ().");
      if (/parseInt\([^,()]+\)/.test(text)) add(n, "parseInt without a radix can misread some strings. Use parseInt(value, 10).");
      if (/[=!]==?\s*NaN\b/.test(text)) add(n, "Nothing equals NaN, not even NaN. Use Number.isNaN(value).");
      if (/\bawait\b/.test(text) && !/async/.test(code)) add(n, "await is used, but no function is marked async.");
    }
    if (/for\s*\(.*<=\s*\w+\.(length|size\(\)|Count)/.test(text)) add(n, "Looping with <= length goes one step past the end. Use < instead.");
    if (lang === "Java" && /(==|!=)\s*"|"\s*(==|!=)/.test(text)) add(n, "In Java, compare strings with .equals(), not ==.");
    if (["Java", "C", "C++", "C#"].includes(lang)) {
      const t = text.trim();
      if (t && !/[;{}]$/.test(t) && !/^(if|for|while|else|switch|case|default|do|try|catch|finally|class|public|private|protected|static|@|#|\/\/|\*|\/\*)/.test(t) && !/^[)}\]]/.test(t) && !/[,(+\-*/&|]$/.test(t))
        add(n, "This statement may be missing a semicolon at the end.");
    }
  });
  const pairs: [string, string][] = [["(", ")"], ["[", "]"], ["{", "}"]];
  const bare = code.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "").replace(/(\/\/|#(?!include)).*$/gm, "");
  for (const [open, close] of pairs) {
    const opens = bare.split(open).length - 1;
    const closes = bare.split(close).length - 1;
    if (opens !== closes) add(0, `There ${Math.abs(opens - closes) === 1 ? "is" : "are"} ${Math.abs(opens - closes)} more “${opens > closes ? open : close}” than “${opens > closes ? close : open}”. A bracket is missing or extra.`);
  }
  return out.sort((x, y) => x.line - y.line);
}

const bugScan: Writer = {
  fields: [area("code", "Code", "Paste the code."), line("error", "Error message, optional", "TypeError: Cannot read properties of undefined (reading 'name')")],
  required: ["code"],
  variants: false,
  run: (v: Values) => {
    const code = v.code ?? "";
    const lang = detectLanguage(code);
    const lines = code.split("\n");
    const found = findMistakes(code, lang);
    const pieces: Piece[] = [];
    const error = (v.error ?? "").trim();
    if (error) {
      const meaning = ERRORS.find(([test]) => test.test(error));
      const at = error.match(/line\s+(\d+)|:(\d+):\d+/i);
      const lineNo = at ? Number(at[1] ?? at[2]) : 0;
      pieces.push({
        title: "What the error means",
        text: [
          meaning ? meaning[1] : "Midnry does not recognise this error. Search the first line of it, and check the line it points to.",
          lineNo && lines[lineNo - 1] ? `\nIt points to line ${lineNo}:\n${lines[lineNo - 1]!.trim()}` : "",
        ].join(""),
      });
    }
    pieces.push({
      title: `Likely problems (${lang === "code" ? "language not identified" : lang})`,
      text: found.length
        ? found.map((item) => `${item.line ? `Line ${item.line}: ` : ""}${item.text}`).join("\n\n")
        : "No common mistakes found. That does not mean the code is correct — run it with a small test input and check the result.",
    });
    pieces.push({
      title: "Next steps",
      text: "• Fix one problem at a time and run the code again.\n• Add a print or console.log just before the failing line to see the values.\n• Test with the smallest input that still fails.",
    });
    return pieces;
  },
};

export const READERS: Record<string, Writer> = {
  digest,
  "contract-scan": contract,
  explainer,
  "bug-scan": bugScan,
};
