import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppDoc } from "@/components/use-app-doc";
import { Button } from "@/components/ui";
import { SaveMark, ToolStatus } from "@/components/tools/shared";

const FOCUS_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

type PulseMode = "focus" | "break";
type PulseDoc = {
  mode: PulseMode;
  secondsLeft: number;
  running: boolean;
  startedAt: number | null;
  rounds: number;
  /** The Remind task this round is for, if it was started from one. */
  label?: string;
};

/** A request from Remind to focus on one task. `at` makes each tap a new request. */
export type FocusIntent = { title: string; at: number };

const FALLBACK: PulseDoc = {
  mode: "focus",
  secondsLeft: FOCUS_SEC,
  running: false,
  startedAt: null,
  rounds: 0,
};

function duration(mode: PulseMode): number {
  return mode === "focus" ? FOCUS_SEC : BREAK_SEC;
}

function asPulse(value: PulseDoc): PulseDoc {
  const mode = value.mode === "break" ? "break" : "focus";
  const seconds = Number(value.secondsLeft);
  const rounds = Number(value.rounds);
  return {
    mode,
    secondsLeft: Number.isFinite(seconds) ? Math.max(0, Math.min(FOCUS_SEC, Math.floor(seconds))) : duration(mode),
    running: value.running === true && typeof value.startedAt === "number",
    startedAt: typeof value.startedAt === "number" ? value.startedAt : null,
    rounds: Number.isFinite(rounds) ? Math.max(0, Math.floor(rounds)) : 0,
    label: typeof value.label === "string" ? value.label.slice(0, 200) : "",
  };
}

function remaining(doc: PulseDoc, now = Date.now()): number {
  if (!doc.running || doc.startedAt == null) return doc.secondsLeft;
  const elapsed = Math.floor((now - doc.startedAt) / 1000);
  return Math.max(0, doc.secondsLeft - Math.max(0, elapsed));
}

function clock(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [660, 880].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const at = ctx.currentTime + index * 0.25;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.65);
    });
    window.setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* sound is optional */
  }
}

/**
 * Remind's Focus view (a Pass feature), formerly the Pulse app. It keeps the
 * "pulse" document, so a running round and the finished count carry over.
 */
export function FocusPanel({ intent }: { intent?: FocusIntent | null }) {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("pulse", FALLBACK);
  const pulse = asPulse(data);
  const pulseRef = useRef(pulse);
  pulseRef.current = pulse;
  const completing = useRef(false);
  const [, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ready || !pulse.running) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [ready, pulse.running]);

  const left = remaining(pulse);

  useEffect(() => {
    if (!ready) return;
    const current = pulseRef.current;
    if (!current.running || remaining(current) > 0) {
      completing.current = false;
      return;
    }
    if (completing.current) return;
    completing.current = true;
    const finishedFocus = current.mode === "focus";
    chime();
    toast.success(finishedFocus ? "Focus round done. Take a five-minute break." : "Break over. Ready for the next round?");
    const mode: PulseMode = finishedFocus ? "break" : "focus";
    setData({
      mode,
      secondsLeft: duration(mode),
      running: false,
      startedAt: null,
      rounds: current.rounds + (finishedFocus ? 1 : 0),
      label: current.label,
    });
  }, [ready, pulse.running, pulse.startedAt, pulse.secondsLeft, left, setData]);

  useEffect(() => {
    if (!pulse.running) return;
    const before = document.title;
    document.title = `${clock(left)} · ${pulse.mode === "focus" ? (pulse.label ? `Focus: ${pulse.label}` : "Focus") : "Break"}`;
    return () => {
      document.title = before;
    };
  }, [left, pulse.running, pulse.mode, pulse.label]);

  const total = duration(pulse.mode);
  const scale = total === 0 ? 0 : left / total;

  function start() {
    const current = asPulse(pulseRef.current);
    const seconds = remaining(current);
    setData({
      ...current,
      secondsLeft: seconds > 0 ? seconds : duration(current.mode),
      running: true,
      startedAt: Date.now(),
    });
  }

  function pause() {
    const current = asPulse(pulseRef.current);
    setData({
      ...current,
      secondsLeft: remaining(current),
      running: false,
      startedAt: null,
    });
  }

  function reset() {
    const current = asPulse(pulseRef.current);
    setData({
      ...current,
      secondsLeft: duration(current.mode),
      running: false,
      startedAt: null,
    });
  }

  // "Focus" on a Remind task: start a fresh focus round for it, or relabel the one running.
  const handled = useRef(0);
  useEffect(() => {
    if (!ready || blocked || loadError || !intent || handled.current === intent.at) return;
    handled.current = intent.at;
    const current = asPulse(pulseRef.current);
    if (current.running && current.mode === "focus") {
      setData({ ...current, label: intent.title });
      return;
    }
    setData({ ...current, mode: "focus", secondsLeft: FOCUS_SEC, running: true, startedAt: Date.now(), label: intent.title });
  }, [ready, blocked, loadError, intent, setData]);

  function skip() {
    const current = asPulse(pulseRef.current);
    const mode: PulseMode = current.mode === "focus" ? "break" : "focus";
    setData({
      ...current,
      mode,
      secondsLeft: duration(mode),
      running: false,
      startedAt: null,
    });
  }

  return (
    <div className="mt-4" data-remind-panel="focus">
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="max-w-md rounded-3xl bg-card p-5 shadow-line sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-pine">{pulse.mode === "focus" ? "Focus · 25 minutes" : "Break · 5 minutes"}</p>
            <SaveMark state={saveState} />
          </div>
          {pulse.label ? (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-pretty" data-focus-task>
              <span className="text-sm text-muted">For</span>
              <span className="min-w-0 break-words font-medium">{pulse.label}</span>
              <button
                type="button"
                className="min-h-9 text-xs text-muted underline underline-offset-2 hover:text-ink"
                onClick={() => setData({ ...asPulse(pulseRef.current), label: "" })}
              >
                Clear
              </button>
            </p>
          ) : null}
          <p className="mt-3 font-display text-7xl tabular-nums tracking-tight sm:text-8xl">{clock(left)}</p>
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-paper-2" aria-hidden>
            <div className="timer-bar h-full origin-left bg-pine" style={{ transform: `scaleX(${scale})` }} />
          </div>
          <p className="mt-3 text-sm text-muted">
            {pulse.rounds} {pulse.rounds === 1 ? "focus round" : "focus rounds"} finished
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {pulse.running ? (
              <Button tone="primary" onClick={pause}>
                Pause
              </Button>
            ) : (
              <Button tone="primary" onClick={start}>
                {left === duration(pulse.mode) || left === 0 ? "Start" : "Resume"}
              </Button>
            )}
            <Button tone="quiet" onClick={reset}>
              Reset
            </Button>
            <Button tone="quiet" onClick={skip}>
              Skip
            </Button>
          </div>
        </div>
      </ToolStatus>
    </div>
  );
}
