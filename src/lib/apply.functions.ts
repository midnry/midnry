import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { env } from "@/lib/env.server";
import { aiBlocked, aiKey, recordAiUse } from "@/lib/ai.server";

type TailorResult =
  | { ok: true; note: string; resume: string }
  | { ok: false; error: string };

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function readJson(text: string): { note: string; resume: string } {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The rewrite came back unreadable.");
  const raw = JSON.parse(trimmed.slice(start, end + 1)) as { note?: unknown; resume?: unknown };
  const note = clip(raw.note, 280);
  const resume = typeof raw.resume === "string" ? raw.resume.trim() : "";
  if (resume.length < 80) throw new Error("The rewrite came back too short. Try again.");
  return { note: note || "Rewritten for this role.", resume: resume.slice(0, 18000) };
}

export const extractResume = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Upload a resume.");
    const row = input as { filename?: unknown; data?: unknown };
    if (typeof row.filename !== "string" || typeof row.data !== "string") throw new Error("Upload a resume.");
    if (row.data.length > 4_000_000) throw new Error("That file is too large. Use a PDF under 3 MB.");
    return { filename: row.filename.slice(0, 120), data: row.data };
  })
  .handler(async ({ data }) => {
    const bytes = Uint8Array.from(Buffer.from(data.data, "base64"));
    const name = data.filename.toLowerCase();
    let text = "";
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = new TextDecoder().decode(bytes);
    } else if (name.endsWith(".pdf")) {
      const { extractText } = await import("unpdf");
      const extracted = await extractText(bytes, { mergePages: true });
      text = extracted.text;
    } else {
      return { ok: false as const, error: "Upload a PDF or a text file." };
    }
    text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 40) {
      return { ok: false as const, error: "Couldn’t read text from that file. Paste the resume instead." };
    }
    return { ok: true as const, text: text.slice(0, 18000) };
  });

export const tailorRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Add a role and a resume.");
    const row = input as Record<string, unknown>;
    const role = clip(row.role, 80);
    const resume = typeof row.resume === "string" ? row.resume.trim().slice(0, 18000) : "";
    if (role.length < 2) throw new Error("Add the role.");
    if (resume.length < 40) throw new Error("Add a resume first.");
    return { role, resume };
  })
  .handler(async ({ context, data }): Promise<TailorResult> => {
    const blocked = await aiBlocked(context.userId);
    if (blocked) return { ok: false, error: blocked };
    const apiKey = aiKey() as string;
    const model = env("XAI_MODEL") || "grok-3";
    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(70_000),
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You tailor one resume for one job role. Use only facts from the resume. Never invent employers, titles, dates, degrees, or numbers. You may reorder, shorten, and rephrase so the matching experience leads. Return only JSON: {\"note\":\"one sentence on what changed\",\"resume\":\"the full resume as plain text\"}.",
            },
            { role: "user", content: `Role: ${data.role}\n\nResume:\n${data.resume}` },
          ],
        }),
      });
      if (!response.ok) return { ok: false, error: "The rewrite didn’t go through. Try again in a moment." };
      const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = body.choices?.[0]?.message?.content ?? "";
      const parsed = readJson(text);
      await recordAiUse(context.userId);
      return { ok: true, note: parsed.note, resume: parsed.resume };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Couldn’t tailor that resume.";
      return { ok: false, error: message };
    }
  });
