import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, TextArea, TextInput, cn, fieldClass } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";
import { useAppDoc } from "@/components/use-app-doc";
import {
  COUNTRIES,
  countryName,
  isCountryId,
  isPlanYear,
  PLAN_YEARS,
  weekLabel,
  weekMonths,
  yearWeeks,
  type CountryId,
  type PlanYear,
  type WeekSlot,
} from "@/lib/ideas/calendar";
import { planIdeaHalf, type WeekIdeas } from "@/lib/ideas/plan";

type WeekPlan = WeekSlot & WeekIdeas;

type PlannerDoc = {
  brand: string;
  about: string;
  country: CountryId | "";
  year: PlanYear;
  weeks: WeekPlan[] | null;
};

const FALLBACK: PlannerDoc = {
  brand: "",
  about: "",
  country: "",
  year: 2026,
  weeks: null,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function asDoc(value: PlannerDoc): PlannerDoc {
  const country = isCountryId(value.country) ? value.country : "";
  const year = isPlanYear(value.year) ? value.year : 2026;
  const weeks = Array.isArray(value.weeks) ? value.weeks : null;
  return {
    brand: typeof value.brand === "string" ? value.brand : "",
    about: typeof value.about === "string" ? value.about : "",
    country,
    year,
    weeks,
  };
}

function planText(doc: PlannerDoc, weeks: WeekPlan[]): string {
  const lines = [`${doc.brand} — ${doc.country ? countryName(doc.country) : ""} — ${doc.year}`, ""];
  for (const week of weeks) {
    lines.push(`Week ${week.week} · ${weekLabel(week.start, week.end)}`);
    if (week.holidays.length) lines.push(week.holidays.join(", "));
    lines.push("Video", ...week.videos.map((idea, index) => `${index + 1}. ${idea}`), "Posts", ...week.posts.map((idea, index) => `${index + 1}. ${idea}`), "");
  }
  return lines.join("\n").trim();
}

export function PlannerTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("planner", FALLBACK);
  const doc = asDoc(data);
  const [form, setForm] = useState({ brand: "", about: "", country: "" as CountryId | "", year: 2026 as PlanYear });
  const [hydrated, setHydrated] = useState(false);
  const [key, setKey] = useState("");
  const [month, setMonth] = useState<number | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const cache = useRef<{ key: string; ideas: WeekIdeas[] } | null>(null);
  const run = useRef(0);

  useEffect(() => {
    if (!ready || hydrated) return;
    setForm({ brand: doc.brand, about: doc.about, country: doc.country, year: doc.year });
    setHydrated(true);
  }, [ready, hydrated, doc]);

  async function planYear(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!form.country) {
      setError("Choose the brand's location, or Global.");
      return;
    }
    const token = ++run.current;
    const cacheKey = `${form.brand.trim()}|${form.about.trim()}|${form.country}|${form.year}`;
    if (cache.current?.key !== cacheKey) cache.current = { key: cacheKey, ideas: [] };
    const bucket = cache.current;
    if (!bucket) return;
    setError(null);
    try {
      const slots = yearWeeks(form.year, form.country);
      const size = Math.ceil(slots.length / 4);
      for (let part = 0; part < 4; part += 1) {
        const slice = slots.slice(part * size, part * size + size);
        if (slice.length === 0) continue;
        const done = new Set<number>(bucket.ideas.map((item) => item.week));
        if (slice.every((slot) => done.has(slot.week))) continue;
        setBusy(`Planning ${weekLabel(slice[0]!.start, slice[slice.length - 1]!.end)}…`);
        const result = await planIdeaHalf({
          data: { brand: form.brand, about: form.about, country: form.country, year: form.year, part, apiKey: key || undefined },
        });
        if (run.current !== token) return;
        if (!result.ok) {
          setError(result.error);
          return;
        }
        bucket.ideas = [
          ...bucket.ideas.filter((item) => !slice.some((slot) => slot.week === item.week)),
          ...result.ideas,
        ];
        cache.current = bucket;
      }
      if (run.current !== token || !cache.current) return;
      const ideas = new Map(cache.current.ideas.map((item) => [item.week, item]));
      const weeks = slots.flatMap((slot) => {
        const idea = ideas.get(slot.week);
        return idea ? [{ ...slot, ...idea }] : [];
      });
      if (weeks.length !== slots.length) {
        setError("The idea plan came back incomplete. Try again.");
        return;
      }
      setData({ ...form, brand: form.brand.trim(), about: form.about.trim(), weeks });
      setMonth(form.year === 2026 ? 9 : "all");
    } catch (caught) {
      if (run.current !== token) return;
      setError(caught instanceof Error ? caught.message : "Couldn’t plan that year.");
    } finally {
      if (run.current === token) setBusy(null);
    }
  }

  async function savePdf() {
    if (!doc.weeks || savingPdf) return;
    setSavingPdf(true);
    setError(null);
    try {
      const { ideasPdf, ideasPdfName } = await import("@/lib/ideas/pdf");
      const bytes = await ideasPdf({
        brand: doc.brand,
        about: doc.about,
        country: doc.country || "global",
        year: doc.year,
        weeks: doc.weeks,
      });
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = ideasPdfName(doc.brand, doc.year);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setError("Couldn’t make the PDF. Try again.");
    } finally {
      setSavingPdf(false);
    }
  }

  const visible = doc.weeks?.filter((week) => month === "all" || weekMonths(week.start, week.end).includes(month)) ?? [];

  return (
    <ToolFrame slug="planner" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="flex max-w-xl flex-col gap-6">
          <form className="flex flex-col gap-3" onSubmit={(event) => void planYear(event)}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Brand</span>
              <TextInput
                value={form.brand}
                onChange={(event) => setForm({ ...form, brand: event.target.value })}
                placeholder="Northlight Studio"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">What the brand does</span>
              <TextArea
                value={form.about}
                onChange={(event) => setForm({ ...form, about: event.target.value })}
                rows={3}
                required
                placeholder="Wedding films and short brand videos for businesses in Abuja"
                className="min-h-24"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Location</span>
                <select
                  value={form.country}
                  required
                  className={fieldClass}
                  onChange={(event) => setForm({ ...form, country: event.target.value as CountryId | "" })}
                >
                  <option value="">Choose</option>
                  {COUNTRIES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id === "global" ? "Global — every holiday" : item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Year</span>
                <select
                  value={form.year}
                  className={fieldClass}
                  onChange={(event) => setForm({ ...form, year: Number(event.target.value) as PlanYear })}
                >
                  {PLAN_YEARS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">xAI key</span>
              <TextInput
                type="password"
                value={key}
                autoComplete="off"
                placeholder="Leave blank if the server already has one"
                onChange={(event) => setKey(event.target.value)}
              />
              <span className="mt-1.5 block text-sm text-muted">Kept in this tab only. Not saved with the plan.</span>
            </label>
            <p className="text-sm text-muted">
              A location plan uses holidays people there keep. Global marks the full set.
            </p>
            <Button type="submit" tone="primary" disabled={busy !== null}>
              {busy ?? (doc.weeks ? "Plan this year again" : "Plan the year")}
            </Button>
          </form>

          {error ? <p className="text-sm text-fail">{error}</p> : null}

          {doc.weeks ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                {doc.weeks.length} weeks · {doc.country ? countryName(doc.country) : ""} · {doc.year}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button tone="quiet" disabled={savingPdf} onClick={() => void savePdf()}>
                  {savingPdf ? "Preparing…" : "Download PDF"}
                </Button>
                <Button
                  tone="quiet"
                  onClick={() => {
                    void navigator.clipboard.writeText(planText(doc, doc.weeks ?? [])).then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1600);
                    });
                  }}
                >
                  {copied ? "Copied" : "Copy the year"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMonth("all")}
                  className={cn("h-11 rounded-full px-3 text-sm", month === "all" ? "bg-pine text-paper" : "bg-card text-ink shadow-line")}
                >
                  All
                </button>
                {MONTHS.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setMonth(index)}
                    className={cn("h-11 rounded-full px-3 text-sm", month === index ? "bg-pine text-paper" : "bg-card text-ink shadow-line")}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {visible.map((week) => (
                <article key={week.week} className="rounded-2xl bg-card p-4 shadow-line">
                  <p className="text-sm font-medium">
                    Week {week.week}
                    <span className="font-normal text-muted"> · {weekLabel(week.start, week.end)}</span>
                  </p>
                  {week.holidays.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {week.holidays.map((holiday, index) => (
                        <li key={`${holiday}-${index}`} className="rounded-full bg-paper-2 px-2 py-1 text-xs">
                          {holiday}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <h3 className="mt-4 text-xs font-medium text-muted">Video</h3>
                  <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed">
                    {week.videos.map((idea, index) => (
                      <li key={index}>{idea}</li>
                    ))}
                  </ol>
                  <h3 className="mt-3 text-xs font-medium text-muted">Posts</h3>
                  <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed">
                    {week.posts.map((idea, index) => (
                      <li key={index}>{idea}</li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
