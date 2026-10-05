import { useEffect, useState, type FormEvent } from "react";
import { Button, TextArea, fieldClass } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";
import { useAppDoc } from "@/components/use-app-doc";
import { extractResume } from "@/lib/apply.functions";
import { tailorResume } from "@/lib/apply/tailor";

type Pack = {
  role: string;
  note: string;
  resume: string;
  submitted: boolean;
};

type ApplyDoc = {
  rolesText: string;
  resume: string;
  packs: Pack[];
};

const FALLBACK: ApplyDoc = { rolesText: "", resume: "", packs: [] };

function asDoc(value: ApplyDoc): ApplyDoc {
  return {
    rolesText: typeof value.rolesText === "string" ? value.rolesText : "",
    resume: typeof value.resume === "string" ? value.resume : "",
    packs: Array.isArray(value.packs)
      ? value.packs.filter((pack) => pack && typeof pack.role === "string" && typeof pack.resume === "string")
      : [],
  };
}

function rolesFrom(text: string): string[] {
  const seen = new Set<string>();
  const roles: string[] = [];
  for (const line of text.split("\n")) {
    const role = line.trim();
    const key = role.toLowerCase();
    if (role.length < 2 || seen.has(key)) continue;
    seen.add(key);
    roles.push(role);
    if (roles.length === 6) break;
  }
  return roles;
}

function fileName(role: string): string {
  const slug = role.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "resume"}-resume`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function downloadPdf(role: string, text: string) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 54;
  const width = pageW - margin * 2;
  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin;

  const fresh = () => {
    page = doc.addPage([pageW, pageH]);
    y = pageH - margin;
  };
  const write = (line: string, size: number, face: typeof font, gap: number) => {
    if (y - size < margin) fresh();
    page.drawText(line, { x: margin, y: y - size, size, font: face, color: rgb(0.1, 0.12, 0.16) });
    y -= size + gap;
  };
  const wrap = (source: string, size: number, face: typeof font) => {
    const words = source.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (face.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };

  write(role, 16, bold, 8);
  for (const block of text.split("\n")) {
    const plain = block.replace(/[^\x20-\x7E]/g, " ").trim();
    if (!plain) {
      y -= 8;
      continue;
    }
    for (const line of wrap(plain, 10, font)) write(line, 10, font, 3);
    y -= 3;
  }

  const bytes = await doc.save();
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName(role)}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function ApplyTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("apply", FALLBACK);
  const doc = asDoc(data);
  const [form, setForm] = useState({ rolesText: "", resume: "" });
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || hydrated) return;
    setForm({ rolesText: doc.rolesText, resume: doc.resume });
    setHydrated(true);
  }, [ready, hydrated, doc]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".txt") || lower.endsWith(".md")) {
      const text = await file.text();
      setForm((current) => ({ ...current, resume: text.slice(0, 18000) }));
      return;
    }
    if (!lower.endsWith(".pdf")) {
      setError("Upload a PDF or a text file.");
      return;
    }
    setBusy("Reading the resume…");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await extractResume({ data: { filename: file.name, data: toBase64(bytes) } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm((current) => ({ ...current, resume: result.text }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t read that file.");
    } finally {
      setBusy(null);
    }
  }

  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const roles = rolesFrom(form.rolesText);
    if (roles.length === 0) {
      setError("Add at least one role, one per line.");
      return;
    }
    setError(null);
    const packs: Pack[] = [];
    if (form.resume.trim().length < 40) {
      setError("Add your resume first: upload a PDF or paste it.");
      return;
    }
    for (const role of roles) {
      const result = tailorResume(role, form.resume);
      packs.push({ role, note: result.note, resume: result.resume, submitted: false });
    }
    setData({ rolesText: form.rolesText, resume: form.resume, packs });
    setBusy(null);
  }

  function mark(role: string, submitted: boolean) {
    setData({
      ...doc,
      packs: doc.packs.map((pack) => (pack.role === role ? { ...pack, submitted } : pack)),
    });
  }

  return (
    <ToolFrame slug="apply" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="flex max-w-xl flex-col gap-6">
          <p className="text-sm text-pretty text-muted">
            LinkedIn does not let another site sign in and send applications. Apply tailors your resume for each
            role, then opens that search so you can submit the file yourself.
          </p>
          <form className="flex flex-col gap-3" onSubmit={(event) => void prepare(event)}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Roles</span>
              <TextArea
                value={form.rolesText}
                onChange={(event) => setForm({ ...form, rolesText: event.target.value })}
                rows={4}
                required
                placeholder={"Product designer\nFrontend engineer"}
                className="min-h-28"
              />
              <span className="mt-1.5 block text-sm text-muted">One role per line. Up to six.</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Resume</span>
              <input
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                className={fieldClass}
                onChange={(event) => {
                  void onFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <TextArea
              value={form.resume}
              onChange={(event) => setForm({ ...form, resume: event.target.value })}
              rows={8}
              required
              placeholder="Or paste the resume here."
              className="min-h-48"
            />
            <Button type="submit" tone="primary" disabled={busy !== null}>
              {busy ?? "Prepare applications"}
            </Button>
          </form>
          {error ? <p className="text-sm text-fail">{error}</p> : null}
          {doc.packs.map((pack) => (
            <article key={pack.role} className="rounded-2xl bg-card p-4 shadow-line">
              <h3 className="font-medium">{pack.role}</h3>
              <p className="mt-1 text-sm text-muted">{pack.note}</p>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-relaxed">{pack.resume}</pre>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  className="inline-flex min-h-11 items-center rounded-full bg-pine px-5 text-sm font-medium text-paper"
                  href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(pack.role)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open on LinkedIn
                </a>
                <Button tone="quiet" onClick={() => void downloadPdf(pack.role, pack.resume)}>
                  Download PDF
                </Button>
                <Button
                  tone="quiet"
                  onClick={() => {
                    const blob = new Blob([pack.resume], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${fileName(pack.role)}.txt`;
                    link.click();
                    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
                  }}
                >
                  Download text
                </Button>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pack.submitted}
                  onChange={(event) => mark(pack.role, event.target.checked)}
                />
                I submitted this
              </label>
            </article>
          ))}
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
