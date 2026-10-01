import { useAppDoc } from "@/components/use-app-doc";
import { cn, Field, TextInput } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";

type ContrastDoc = { foreground: string; background: string };

const FALLBACK: ContrastDoc = { foreground: "#1A1916", background: "#F3EFE6" };

type Rgb = { r: number; g: number; b: number };

function parseHex(input: string): Rgb | null {
  const raw = input.trim().replace(/^#/, "");
  const hex = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function pickerValue(input: string): string {
  const rgb = parseHex(input);
  if (!rgb) return "#000000";
  const hex = [rgb.r, rgb.g, rgb.b].map((part) => part.toString(16).padStart(2, "0")).join("");
  return `#${hex}`;
}

function channel(value: number): number {
  const unit = value / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function luminance(color: Rgb): number {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function ratioOf(foreground: string, background: string): number | null {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

const CHECKS = [
  { label: "AA · normal text", min: 4.5 },
  { label: "AA · large text", min: 3 },
  { label: "AAA · normal text", min: 7 },
  { label: "AAA · large text", min: 4.5 },
] as const;

export function ContrastTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("contrast", FALLBACK);
  const foreground = typeof data.foreground === "string" ? data.foreground : FALLBACK.foreground;
  const background = typeof data.background === "string" ? data.background : FALLBACK.background;
  const ratio = ratioOf(foreground, background);
  const previewFg = parseHex(foreground) ? pickerValue(foreground) : FALLBACK.foreground;
  const previewBg = parseHex(background) ? pickerValue(background) : FALLBACK.background;

  return (
    <ToolFrame slug="contrast" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <ColorField
              label="Foreground"
              value={foreground}
              onChange={(value) => setData({ foreground: value, background })}
            />
            <ColorField
              label="Background"
              value={background}
              onChange={(value) => setData({ foreground, background: value })}
            />
            <p className="font-display text-6xl tabular-nums tracking-tight">
              {ratio == null ? "—" : `${ratio.toFixed(2)}:1`}
            </p>
            <ul className="space-y-2 text-sm">
              {CHECKS.map((check) => {
                const pass = ratio != null && ratio >= check.min;
                return (
                  <li key={check.label} className="flex items-center justify-between gap-3">
                    <span>{check.label}</span>
                    <span className={pass ? "text-pine" : "text-fail"}>
                      {ratio == null ? "—" : pass ? "Pass" : "Fail"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-pretty text-muted">
              Large text is 18pt regular or 14pt bold. Ordinary body copy needs 4.5:1.
            </p>
          </div>
          <div
            className="flex min-h-64 flex-col justify-between rounded-3xl p-6 sm:p-8"
            style={{ backgroundColor: previewBg, color: previewFg }}
          >
            <p className="text-sm">Sample</p>
            <p className="font-display text-4xl tracking-tight text-balance">
              The quick brown fox reads this line.
            </p>
            <p className="text-sm">Body copy sits on the background you picked.</p>
          </div>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseHex(value);
  return (
    <Field label={label} hint={parsed ? undefined : "Use a hex color like #1A1916."}>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={pickerValue(value)}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className={cn("size-11 shrink-0 rounded-lg border border-line bg-card p-1")}
        />
        <TextInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          aria-label={`${label} hex`}
          maxLength={7}
        />
      </div>
    </Field>
  );
}
