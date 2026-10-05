import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";



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
