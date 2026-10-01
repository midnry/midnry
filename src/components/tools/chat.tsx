import { useEffect, useState, type FormEvent } from "react";
import { chatReady, sendChat } from "@/lib/chat.functions";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextArea, TextInput } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";

type Turn = { role: "user" | "assistant"; content: string };
type ChatDoc = { messages: Turn[] };

const FALLBACK: ChatDoc = { messages: [] };

function asMessages(value: unknown): Turn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Turn =>
        !!item &&
        typeof item === "object" &&
        ((item as Turn).role === "user" || (item as Turn).role === "assistant") &&
        typeof (item as Turn).content === "string",
    )
    .slice(-30);
}

export function ChatTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("chat", FALLBACK);
  const messages = asMessages(data.messages);
  const [draft, setDraft] = useState("");
  const [key, setKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    chatReady()
      .then((row) => {
        if (!cancel) setConfigured(row.configured);
      })
      .catch(() => {
        if (!cancel) setConfigured(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setData({ messages: next });
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const result = await sendChat({ data: { messages: next, apiKey: key || undefined } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setData({ messages: [...next, { role: "assistant", content: result.text }] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolFrame slug="chat" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="max-w-xl">
          <div className="min-h-48 space-y-4">
            {messages.length === 0 ? (
              <p className="text-sm text-pretty text-muted">Ask something. The thread is saved with your account.</p>
            ) : (
              messages.map((turn, index) => (
                <p key={index} className={turn.role === "user" ? "text-pretty" : "text-pretty text-muted"}>
                  <span className="mb-1 block text-sm font-medium text-pine">
                    {turn.role === "user" ? "You" : "Grok"}
                  </span>
                  {turn.content}
                </p>
              ))
            )}
          </div>
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {!configured ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">xAI key</span>
                <TextInput
                  type="password"
                  value={key}
                  autoComplete="off"
                  placeholder="xai-…"
                  onChange={(event) => setKey(event.target.value)}
                />
                <span className="mt-1.5 block text-sm text-muted">Kept in this tab only. Not saved with the thread.</span>
              </label>
            ) : null}
            <TextArea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message"
              className="min-h-24"
            />
            {error ? (
              <p role="alert" className="text-sm text-fail">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" tone="primary" disabled={busy || !draft.trim()}>
                {busy ? "Sending…" : "Send"}
              </Button>
              {messages.length > 0 ? (
                <Button tone="quiet" disabled={busy} onClick={() => setData({ messages: [] })}>
                  Clear
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
