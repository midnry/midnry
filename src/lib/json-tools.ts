/**
 * JSON helpers shared by the free JSON kit (format + validate) and Glyph
 * (the Pass JSON workbench). Pure functions, kept apart for tests.
 */

export type JsonProblem = { message: string; offset: number; line: number; column: number };

export type JsonCheck = { ok: true; value: unknown } | { ok: false; problem: JsonProblem };

/** Line and column (both from 1) of a character offset. */
export function lineCol(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let start = 0;
  const end = Math.min(Math.max(0, offset), text.length);
  for (let index = 0; index < end; index += 1) {
    if (text.charCodeAt(index) === 10) {
      line += 1;
      start = index + 1;
    }
  }
  return { line, column: end - start + 1 };
}

class Stop extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
  }
}

function describeChar(char: string | undefined): string {
  if (char === undefined) return "the end of the text";
  if (char === "\n") return "a line break";
  if (/\s/.test(char)) return "a space";
  return `“${char}”`;
}

/**
 * Finds the first place the text stops being JSON. Browsers word (and place)
 * JSON.parse errors differently, and some leave the position out, so this
 * scans the text itself and says where, in the same words everywhere.
 */
export function findJsonProblem(text: string): JsonProblem | null {
  let at = 0;
  const ws = () => {
    while (at < text.length && (text[at] === " " || text[at] === "\t" || text[at] === "\n" || text[at] === "\r")) at += 1;
  };
  const fail = (message: string, offset = at): never => {
    throw new Stop(message, offset);
  };
  const literal = (word: string) => {
    if (text.startsWith(word, at)) at += word.length;
    else fail(`Expected a value but found ${describeChar(text[at])}.`);
  };
  const string = () => {
    const start = at;
    at += 1;
    while (at < text.length) {
      const char = text[at];
      if (char === '"') {
        at += 1;
        return;
      }
      if (char === "\\") {
        const next = text[at + 1];
        if (next === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(at + 2, at + 6))) fail("A \\u escape needs four hex digits.", at);
          at += 6;
          continue;
        }
        if (next === undefined || !'"\\/bfnrt'.includes(next)) fail(`${describeChar(next)} cannot follow a backslash in a string.`, at);
        at += 2;
        continue;
      }
      if (char.charCodeAt(0) < 0x20) fail("A string cannot contain a line break or tab. Use \\n or \\t.", at);
      at += 1;
    }
    fail("This string is never closed with a double quote.", start);
  };
  const number = () => {
    const match = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(at, at + 400));
    if (!match || !match[0] || match[0] === "-") fail(`Expected a value but found ${describeChar(text[at])}.`);
    at += match![0].length;
  };
  const value = (depth: number): void => {
    if (depth > 5000) fail("The JSON is nested too deeply.");
    ws();
    const char = text[at];
    if (char === "{") {
      at += 1;
      ws();
      if (text[at] === "}") {
        at += 1;
        return;
      }
      for (;;) {
        ws();
        if (text[at] !== '"') fail(text[at] === "}" ? "Remove the comma before “}”." : `Expected a key in double quotes but found ${describeChar(text[at])}.`);
        string();
        ws();
        if (text[at] !== ":") fail(`Expected “:” after the key but found ${describeChar(text[at])}.`);
        at += 1;
        value(depth + 1);
        ws();
        if (text[at] === ",") {
          at += 1;
          continue;
        }
        if (text[at] === "}") {
          at += 1;
          return;
        }
        fail(`Expected “,” or “}” but found ${describeChar(text[at])}.`);
      }
    }
    if (char === "[") {
      at += 1;
      ws();
      if (text[at] === "]") {
        at += 1;
        return;
      }
      for (;;) {
        ws();
        if (text[at] === "]") fail("Remove the comma before “]”.");
        value(depth + 1);
        ws();
        if (text[at] === ",") {
          at += 1;
          continue;
        }
        if (text[at] === "]") {
          at += 1;
          return;
        }
        fail(`Expected “,” or “]” but found ${describeChar(text[at])}.`);
      }
    }
    if (char === '"') return string();
    if (char === "t") return literal("true");
    if (char === "f") return literal("false");
    if (char === "n") return literal("null");
    if (char === "'") fail("JSON strings use double quotes, not single quotes.");
    if (char === "-" || (char !== undefined && char >= "0" && char <= "9")) return number();
    fail(char === undefined ? "The JSON ends before a value." : `Expected a value but found ${describeChar(char)}.`);
  };
  try {
    if (!text.trim()) throw new Stop("There is nothing to read yet.", 0);
    value(0);
    ws();
    if (at < text.length) fail(`Unexpected ${describeChar(text[at])} after the end of the JSON.`);
    return null;
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    const offset = Math.min(error.offset, text.length);
    return { message: error.message, offset, ...lineCol(text, offset) };
  }
}

/** Parse, or say exactly where and why it fails. */
export function checkJson(text: string): JsonCheck {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    const problem = findJsonProblem(text);
    if (problem) return { ok: false, problem };
    // The scanner found nothing (should not happen): fall back to the browser's words.
    return { ok: false, problem: { message: error instanceof Error ? error.message : "That is not valid JSON.", offset: 0, line: 1, column: 1 } };
  }
}

/** The line with the problem and a caret under the column, for a short excerpt. */
export function problemExcerpt(text: string, problem: JsonProblem): { line: string; caret: string } {
  const lines = text.split("\n");
  const raw = lines[problem.line - 1] ?? "";
  const from = Math.max(0, problem.column - 40);
  const line = (from > 0 ? "…" : "") + raw.slice(from, from + 80);
  const caret = " ".repeat(problem.column - 1 - from + (from > 0 ? 1 : 0)) + "^";
  return { line, caret };
}

export function formatJson(value: unknown, indent = 2): string {
  return JSON.stringify(value, null, indent);
}

export function minifyJson(value: unknown): string {
  return JSON.stringify(value);
}

/** A copy with every object's keys in A to Z order, at every depth. Arrays keep their order. */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) out[key] = sortKeys(source[key]);
    return out;
  }
  return value;
}

export type PathPart = string | number;

/** A JSONPath for a node: $.items[2].price, or $["odd key"] when the key is not a plain name. */
export function jsonPath(parts: readonly PathPart[]): string {
  return parts.reduce<string>((path, part) => {
    if (typeof part === "number") return `${path}[${part}]`;
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part) ? `${path}.${part}` : `${path}[${JSON.stringify(part)}]`;
  }, "$");
}

/** The value at a path, or undefined. */
export function valueAt(root: unknown, parts: readonly PathPart[]): unknown {
  let node: unknown = root;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string | number, unknown>)[part];
  }
  return node;
}

export type NodeKind = "object" | "array" | "string" | "number" | "boolean" | "null";

export function kindOf(value: unknown): NodeKind {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  return "boolean";
}

/** "3 keys", "12 items", for a branch's summary. */
export function countLabel(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).length;
    return `${keys} ${keys === 1 ? "key" : "keys"}`;
  }
  return "";
}

/** Children of a branch as [key, value] pairs, in order. */
export function childrenOf(value: unknown): [PathPart, unknown][] {
  if (Array.isArray(value)) return value.map((item, index) => [index, item]);
  if (value && typeof value === "object") return Object.entries(value as Record<string, unknown>);
  return [];
}

/** How many nodes the whole document holds (stops counting at `cap`). */
export function countNodes(value: unknown, cap = 1_000_000): number {
  let count = 0;
  const stack: unknown[] = [value];
  while (stack.length > 0 && count < cap) {
    const node = stack.pop();
    count += 1;
    if (node && typeof node === "object") for (const child of Object.values(node as object)) stack.push(child);
  }
  return count;
}

/** Glyph keeps up to this many characters on the page (about 5 MB of JSON). */
export const GLYPH_MAX_INPUT = 5_000_000;
/** Branches show this many children at a time; "Show more" adds the next batch. */
export const TREE_PAGE = 200;
