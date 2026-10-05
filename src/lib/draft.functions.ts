import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { env } from "@/lib/env.server";

export const draftText = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { system?: string; prompt?: string; apiKey?: string }) => {
    const system = typeof input?.system === "string" ? input.system.trim().slice(0, 2000) : "";
    const prompt = typeof input?.prompt === "string" ? input.prompt.trim().slice(0, 8000) : "";
    const apiKey = typeof input?.apiKey === "string" ? input.apiKey.trim() : "";
    if (!system || !prompt) throw new Error("Write something first.");
    if (apiKey && (apiKey.length < 16 || apiKey.length > 200 || /\s/.test(apiKey))) {
      throw new Error("That key does not look right.");
    }
    return { system, prompt, apiKey: apiKey || undefined };
  })
  .handler(async ({ data }) => {
    const apiKey = data.apiKey || env("XAI_API_KEY");
    if (!apiKey) return { ok: false as const, error: "AI help is not switched on for this site yet. Paste your own xAI API key to use it now." };
    const model = env("XAI_MODEL") || "grok-3";
    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: "system", content: data.system },
            { role: "user", content: data.prompt },
          ],
        }),
      });
      if (!response.ok) return { ok: false as const, error: "The AI service turned that request down. If you pasted a key, check it and try again." };
      const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = body.choices?.[0]?.message?.content?.trim();
      if (!text) return { ok: false as const, error: "The model sent an empty reply." };
      return { ok: true as const, text };
    } catch {
      return { ok: false as const, error: "Could not reach the model." };
    }
  });
