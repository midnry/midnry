import { useDeferredValue, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppDoc } from "@/components/use-app-doc";
import { downloadText } from "@/components/use-merged-docs";
import { Button, TextArea, cn } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";
import { docLimit } from "@/lib/doc-limits";
import {
  GLYPH_MAX_INPUT,
  TREE_PAGE,
  checkJson,
  childrenOf,
  countLabel,
  countNodes,
  formatJson,
  jsonPath,
  kindOf,
  minifyJson,
  problemExcerpt,
  sortKeys,
  valueAt,
  type PathPart,
} from "@/lib/json-tools";

type GlyphDoc = { source: string };

const FALLBACK: GlyphDoc = { source: "" };

/** Room left for the rest of the saved document. */
const SAVE_MAX = docLimit("glyph") - 1_000;
/** Above this many nodes, "Open all" is not offered (the tree opens a level at a time). */
const OPEN_ALL_MAX = 3_000;

function keyOf(parts: readonly PathPart[]): string {
  return JSON.stringify(parts);
}

function copy(text: string, done: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(done),
    () => toast.error("Could not copy. Select the text and copy it instead."),
  );
}

export function GlyphTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("glyph", FALLBACK);
  const saved = typeof data.source === "string" ? data.source : "";
  // A large paste stays on this page but is not saved to the account (it would not fit).
  const [local, setLocal] = useState<string | null>(null);
  const source = local ?? saved;
  const deferred = useDeferredValue(source);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(() => new Set([keyOf([])]));
  const [selected, setSelected] = useState<PathPart[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const check = useMemo(() => (deferred.trim() ? checkJson(deferred) : null), [deferred]);
  const nodes = useMemo(() => (check?.ok ? countNodes(check.value, OPEN_ALL_MAX + 1) : 0), [check]);
  const tooLargeToSave = source.length > SAVE_MAX;

  function setSource(next: string, message: string | null = null) {
    if (next.length > GLYPH_MAX_INPUT) {
      setNotice(`That is ${(next.length / 1_000_000).toFixed(1)} MB. Glyph handles up to ${GLYPH_MAX_INPUT / 1_000_000} MB at a time.`);
      return;
    }
    setNotice(message);
    if (next.length > SAVE_MAX) {
      setLocal(next);
    } else {
      setLocal(null);
      setData({ source: next });
    }
  }

  function transform(fn: (value: unknown) => string, message: string) {
    if (!source.trim()) return setNotice("Paste some JSON first.");
    const result = checkJson(source);
    if (!result.ok) return setNotice("Fix the error first.");
    setSource(fn(result.value), message);
  }

  function openAll(value: unknown) {
    const keys = new Set<string>();
    const walk = (node: unknown, parts: PathPart[]) => {
      if (!node || typeof node !== "object") return;
      keys.add(keyOf(parts));
      for (const [key, child] of childrenOf(node)) walk(child, [...parts, key]);
    };
    walk(value, []);
    setOpen(keys);
  }

  const selectedValue = check?.ok && selected ? valueAt(check.value, selected) : undefined;
  const selectedText = selected && selectedValue !== undefined ? formatJson(selectedValue) : "";

  return (
    <ToolFrame slug="glyph" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <TextArea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              spellCheck={false}
              aria-label="JSON"
              placeholder='{"ok": true}'
              className="min-h-80 font-mono text-sm lg:min-h-[32rem]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button tone="primary" onClick={() => transform((value) => formatJson(value), "Formatted.")}>
                Format
              </Button>
              <Button tone="quiet" onClick={() => transform(minifyJson, "Minified to one line.")}>
                Minify
              </Button>
              <Button tone="quiet" onClick={() => transform((value) => formatJson(sortKeys(value)), "Keys sorted A to Z, at every level.")}>
                Sort keys
              </Button>
              <Button tone="quiet" disabled={!source.trim()} onClick={() => copy(source, "Copied.")}>
                Copy
              </Button>
              <Button tone="quiet" disabled={!source.trim()} onClick={() => downloadText("glyph.json", source, "application/json")}>
                Download
              </Button>
              <Button tone="quiet" onClick={() => fileRef.current?.click()}>
                Open file
              </Button>
              <Button
                tone="quiet"
                onClick={() => {
                  setSelected(null);
                  setSource("");
                }}
              >
                Clear
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json,text/plain"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (file.size > GLYPH_MAX_INPUT) {
                    setNotice(`That file is ${(file.size / 1_000_000).toFixed(1)} MB. Glyph handles up to ${GLYPH_MAX_INPUT / 1_000_000} MB at a time.`);
                    return;
                  }
                  void file.text().then((text) => {
                    setSelected(null);
                    setOpen(new Set([keyOf([])]));
                    setSource(text, `Opened ${file.name}.`);
                  });
                }}
              />
            </div>
            {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
            {tooLargeToSave ? (
              <p className="mt-3 text-sm text-pretty text-muted" data-glyph-large>
                This JSON is {(source.length / 1_000_000).toFixed(1)} MB, too large to keep on your account. It stays on this page; download it to keep a copy.
              </p>
            ) : null}
            {check && !check.ok ? <ProblemBox source={deferred} problem={check.problem} /> : null}
          </div>

          <div className="min-w-0">
            {check?.ok ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-auto text-sm text-pine" data-json-ok>
                    Valid JSON · {kindOf(check.value) === "array" || kindOf(check.value) === "object" ? countLabel(check.value) : kindOf(check.value)}
                    {nodes > OPEN_ALL_MAX ? " · large, opens a level at a time" : ""}
                  </p>
                  {nodes <= OPEN_ALL_MAX ? (
                    <Button tone="quiet" onClick={() => openAll(check.value)}>
                      Open all
                    </Button>
                  ) : null}
                  <Button tone="quiet" onClick={() => setOpen(new Set([keyOf([])]))}>
                    Close all
                  </Button>
                </div>
                <div className="mt-3 rounded-2xl bg-card p-3 shadow-line">
                  <p className="text-xs text-muted">Selected path</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 font-mono text-sm break-all" data-glyph-path>
                      {selected ? jsonPath(selected) : "Click a key or value in the tree"}
                    </code>
                    {selected ? (
                      <>
                        <Button tone="quiet" onClick={() => copy(jsonPath(selected), "Path copied.")}>
                          Copy path
                        </Button>
                        <Button tone="quiet" onClick={() => copy(selectedText, "Value copied.")}>
                          Copy value
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                <div role="tree" aria-label="JSON tree" className="mt-3 max-h-[32rem] overflow-auto rounded-2xl bg-card p-3 font-mono text-sm shadow-line" data-glyph-tree>
                  <TreeNode
                    name={null}
                    value={check.value}
                    parts={[]}
                    open={open}
                    setOpen={setOpen}
                    selected={selected ? keyOf(selected) : null}
                    onSelect={setSelected}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">{check ? "The tree shows up once the JSON is valid." : "Paste JSON, or open a .json file. The tree shows up here."}</p>
            )}
          </div>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}

function ProblemBox({ source, problem }: { source: string; problem: { message: string; line: number; column: number; offset: number } }) {
  const excerpt = problemExcerpt(source, problem);
  return (
    <div role="alert" className="mt-3 rounded-2xl bg-card p-4 shadow-line" data-json-error>
      <p className="font-medium text-fail">
        Line {problem.line}, column {problem.column}
      </p>
      <p className="mt-1 text-sm text-pretty">{problem.message}</p>
      <pre className="mt-2 overflow-x-auto font-mono text-sm">
        {excerpt.line}
        {"\n"}
        <span className="text-fail">{excerpt.caret}</span>
      </pre>
    </div>
  );
}

function Scalar({ value }: { value: unknown }) {
  const kind = kindOf(value);
  const text = kind === "string" ? JSON.stringify(value) : String(value);
  return (
    <span className={cn("break-all", kind === "string" ? "text-pine" : kind === "number" ? "text-ink" : "text-muted")}>
      {text.length > 300 ? `${text.slice(0, 300)}…` : text}
    </span>
  );
}

function TreeNode({
  name,
  value,
  parts,
  open,
  setOpen,
  selected,
  onSelect,
}: {
  name: PathPart | null;
  value: unknown;
  parts: PathPart[];
  open: Set<string>;
  setOpen: (next: Set<string>) => void;
  selected: string | null;
  onSelect: (parts: PathPart[]) => void;
}) {
  const key = keyOf(parts);
  const branch = value !== null && typeof value === "object";
  const isOpen = branch && open.has(key);
  const [shown, setShown] = useState(TREE_PAGE);
  const label = name === null ? "$" : typeof name === "number" ? `[${name}]` : name;
  const isSelected = selected === key;
  const children = isOpen ? childrenOf(value) : [];
  return (
    <div role="treeitem" aria-expanded={branch ? isOpen : undefined} aria-selected={isSelected}>
      <div className={cn("flex min-h-8 items-start gap-1 rounded-md", isSelected && "bg-pine/10")}>
        {branch ? (
          <button
            type="button"
            aria-label={isOpen ? `Close ${label}` : `Open ${label}`}
            className="grid size-7 shrink-0 place-items-center rounded text-muted hover:bg-paper-2"
            onClick={() => {
              const next = new Set(open);
              if (isOpen) next.delete(key);
              else next.add(key);
              setOpen(next);
            }}
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="size-7 shrink-0" aria-hidden />
        )}
        <button type="button" className="min-w-0 flex-1 py-1 text-left" onClick={() => onSelect(parts)} data-node={jsonPath(parts)}>
          <span className="font-medium">{label}</span>
          <span className="text-muted">: </span>
          {branch ? <span className="text-muted">{Array.isArray(value) ? `[ ${countLabel(value)} ]` : `{ ${countLabel(value)} }`}</span> : <Scalar value={value} />}
        </button>
      </div>
      {isOpen ? (
        <div role="group" className="ml-3 border-l border-line pl-2">
          {children.slice(0, shown).map(([childKey, child]) => (
            <TreeNode key={String(childKey)} name={childKey} value={child} parts={[...parts, childKey]} open={open} setOpen={setOpen} selected={selected} onSelect={onSelect} />
          ))}
          {children.length > shown ? (
            <button type="button" className="my-1 min-h-8 rounded-md px-2 text-left text-pine underline underline-offset-2" onClick={() => setShown(shown + TREE_PAGE)}>
              Show {Math.min(TREE_PAGE, children.length - shown)} more of {children.length - shown}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
