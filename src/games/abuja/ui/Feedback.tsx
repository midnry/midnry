import { useState } from "react";
import { getState } from "../systems/store";
import { storyGoal } from "../systems/story";
import { btnGhost, btnPrimary } from "./theme";
import { deviceId } from "./telemetry";

// The pause menu's feedback box. What the player writes is sent with where
// they are in the game, so "the task isn't working" arrives with the task.

const KINDS = [
  ["bug", "🐞 Something's broken"],
  ["idea", "💡 An idea"],
  ["confusing", "🤔 Something's confusing"],
  ["love", "❤️ Something I love"],
] as const;

function gameContext() {
  const s = getState();
  const goal = s ? storyGoal(s) : null;
  return {
    chapter: s?.chapter ?? "adult",
    scene: s?.scene ?? null,
    stage: s?.stage,
    day: s?.day,
    slot: s?.slot,
    age: s ? Math.floor(s.age) : null,
    district: s?.district,
    money: s?.stats.money,
    task: s?.task ? `${s.task.kind} step ${s.task.index + 1} of ${s.task.steps.length}` : null,
    mission: s?.missions?.path ?? null,
    goal: goal?.text ?? null,
    event: s?.event ?? null,
    ending: s?.ending ?? null,
    screen: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}` : null,
    agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : null,
    page: typeof location !== "undefined" ? location.pathname : null,
  };
}

export function FeedbackBox() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("bug");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "limit">("idle");

  async function send() {
    setStatus("sending");
    try {
      const { sendFeedback } = await import("../play.functions");
      const r = await sendFeedback({ data: { device: deviceId(), message: `[${kind}] ${text}`, context: gameContext() } });
      setStatus(r.ok ? "sent" : "limit");
      if (r.ok) setText("");
    } catch {
      setStatus("error");
    }
  }

  if (!open)
    return (
      <button type="button" className={`${btnGhost} mt-5 w-full`} onClick={() => (setOpen(true), setStatus("idle"))}>
        💬 Send feedback
      </button>
    );
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-sm font-semibold">Tell us what you think</p>
      <p className="mt-0.5 text-xs text-slate-400">We'll see where you are in the game, so you don't need to explain it.</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="What kind of feedback">
        {KINDS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={kind === id}
            onClick={() => setKind(id)}
            className={`min-h-10 rounded-lg border px-2 text-left text-xs ${kind === id ? "border-blue-400 bg-blue-400/15" : "border-white/10 bg-black/20"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="mt-2 block text-xs text-slate-400" htmlFor="abuja-feedback">
        Your message
      </label>
      <textarea
        id="abuja-feedback"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="What happened, or what would make the game better?"
        className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-base text-slate-100 placeholder:text-slate-500"
      />
      {status === "sent" ? <p className="mt-1 text-sm text-emerald-300" role="status">Thank you! We read every message.</p> : null}
      {status === "error" ? <p className="mt-1 text-sm text-rose-300" role="status">Couldn't send that. Check your connection and try again.</p> : null}
      {status === "limit" ? <p className="mt-1 text-sm text-amber-300" role="status">You've sent a lot today. Try again tomorrow.</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className={btnGhost} onClick={() => setOpen(false)}>
          Close
        </button>
        <button type="button" className={btnPrimary} disabled={text.trim().length < 3 || status === "sending"} onClick={send}>
          {status === "sending" ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
