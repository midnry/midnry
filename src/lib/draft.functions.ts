import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { env } from "@/lib/env.server";
import { aiBlocked, aiKey, recordAiUse } from "@/lib/ai.server";

// Whether AI writing is switched on for the site, so the apps can say so up front.
export const draftReady = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => ({ configured: Boolean(aiKey()) }));

export const draftText = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { system?: string; prompt?: string }) => {
    const system = typeof input?.system === "string" ? input.system.trim().slice(0, 2000) : "";
    const prompt = typeof input?.prompt === "string" ? input.prompt.trim().slice(0, 8000) : "";
    if (!system || !prompt) throw new Error("Write something first.");
    return { system, prompt };
  })
  .handler(async ({ context, data }) => {
    const blocked = await aiBlocked(context.userId);
    if (blocked) return { ok: false as const, error: blocked };
    const model = env("XAI_MODEL") || "grok-3";
    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(70_000),
        headers: { authorization: `Bearer ${aiKey()}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: "system", content: data.system },
            { role: "user", content: data.prompt },
          ],
        }),
      });
      if (!response.ok) return { ok: false as const, error: "AI writing could not finish that just now. Try again in a moment." };
      const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = body.choices?.[0]?.message?.content?.trim();
      if (!text) return { ok: false as const, error: "AI writing sent back nothing. Try rewording it." };
      await recordAiUse(context.userId);
      return { ok: true as const, text };
    } catch {
      return { ok: false as const, error: "Could not reach AI writing. Check your connection and try again." };
    }
  });
