import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { env } from "@/lib/env.server";

type ChatRole = "user" | "assistant";
type ChatTurn = { role: ChatRole; content: string };

function parseTurns(input: unknown): ChatTurn[] {
  if (!input || typeof input !== "object") throw new Error("Missing messages");
  const raw = (input as { messages?: unknown; apiKey?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 30) {
    throw new Error("Send between 1 and 30 messages.");
  }
  return raw.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Bad message");
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") throw new Error("Bad message");
    if (typeof content !== "string" || !content.trim() || content.length > 8000) {
      throw new Error("Each message needs text, under 8,000 characters.");
    }
    return { role, content: content.trim() };
  });
}

function parseKey(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const key = (input as { apiKey?: unknown }).apiKey;
  if (key == null || key === "") return undefined;
  if (typeof key !== "string" || key.length < 16 || key.length > 200 || /[\s]/.test(key)) {
    throw new Error("That key does not look right.");
  }
  return key;
}

export const chatReady = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => ({ configured: Boolean(env("XAI_API_KEY")) }));

export const sendChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { messages: ChatTurn[]; apiKey?: string }) => ({
    messages: parseTurns(input),
    apiKey: parseKey(input),
  }))
  .handler(async ({ data }) => {
    const apiKey = data.apiKey || env("XAI_API_KEY");
    if (!apiKey) {
      return {
        ok: false as const,
        error: "AI help is not switched on for this site yet. Paste your own xAI API key to use it now.",
      };
    }
    const model = env("XAI_MODEL") || "grok-3";
    let response: Response;
    try {
      response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: data.messages,
          stream: false,
        }),
      });
    } catch {
      return { ok: false as const, error: "Could not reach the model." };
    }
    if (!response.ok) {
      return { ok: false as const, error: "The AI service turned that request down. If you pasted a key, check it and try again." };
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false as const, error: "The model sent an empty reply." };
    return { ok: true as const, text };
  });
