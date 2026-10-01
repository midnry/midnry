import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextArea } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";

type GlyphDoc = { source: string };

const FALLBACK: GlyphDoc = { source: "" };

function describe(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).length;
    return `${keys} ${keys === 1 ? "key" : "keys"}`;
  }
  if (typeof value === "string") return "a string";
  if (typeof value === "number") return "a number";
  if (typeof value === "boolean") return "a boolean";
  if (value === null) return "null";
  return "a value";
}

export function GlyphTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("glyph", FALLBACK);
  const source = typeof data.source === "string" ? data.source : "";
  const [notice, setNotice] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!source.trim()) return { empty: true as const };
    try {
      return { empty: false as const, value: JSON.parse(source) as unknown };
    } catch (error) {
      return {
        empty: false as const,
        error: error instanceof Error ? error.message : "That is not valid JSON.",
      };
    }
  }, [source]);

  function apply(next: string, message: string) {
    setData({ source: next });
    setNotice(message);
  }

  return (
    <ToolFrame slug="glyph" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <TextArea
          value={source}
          onChange={(event) => {
            setNotice(null);
            setData({ source: event.target.value });
          }}
          spellCheck={false}
          aria-label="JSON"
          placeholder='{"ok": true}'
          className="min-h-80 font-mono text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            tone="primary"
            onClick={() => {
              if (!source.trim()) {
                setNotice("Paste some JSON first.");
                return;
              }
              try {
                apply(JSON.stringify(JSON.parse(source), null, 2), "Formatted.");
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "That is not valid JSON.");
              }
            }}
          >
            Format
          </Button>
          <Button
            tone="quiet"
            onClick={() => {
              if (!source.trim()) {
                setNotice("Paste some JSON first.");
                return;
              }
              try {
                apply(JSON.stringify(JSON.parse(source)), "Minified.");
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "That is not valid JSON.");
              }
            }}
          >
            Minify
          </Button>
          <Button
            tone="quiet"
            onClick={() => {
              if (!("value" in parsed) || parsed.empty) return;
              void navigator.clipboard.writeText(source).then(
                () => toast.success("Copied."),
                () => toast.error("Could not copy."),
              );
            }}
          >
            Copy
          </Button>
          <Button
            tone="quiet"
            onClick={() => {
              setNotice(null);
              setData({ source: "" });
            }}
          >
            Clear
          </Button>
        </div>
        {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
        {"error" in parsed ? (
          <p role="alert" className="mt-3 text-sm text-pretty text-fail">
            {parsed.error}
          </p>
        ) : null}
        {"value" in parsed ? (
          <p className="mt-3 text-sm text-muted">Valid JSON · {describe(parsed.value)}</p>
        ) : null}
      </ToolStatus>
    </ToolFrame>
  );
}
