/**
 * The save loop behind useAppDoc, kept free of React and the network so it can
 * be tested on its own (scripts/doc-saver.test.mjs).
 *
 * - One save in flight at a time; each carries the revision it was based on.
 * - A failed request keeps the change and retries with backoff (1s … 30s).
 * - A conflict (another tab saved first) stops saving; nothing is overwritten.
 * - A document over the size limit is not sent; the change stays local.
 */

export type SaveState = "idle" | "saving" | "saved" | "error" | "retrying" | "conflict" | "too-large";

export type SaveResult =
  | { ok: true; revision: number }
  | { ok: false; error: "locked" }
  | { ok: false; error: "conflict"; revision: number }
  | { ok: false; error: "too_large"; limit: number };

export type SaverEvent = "retrying" | "saved-after-retry" | "conflict" | "too-large" | "locked";

export type SaverDeps = {
  limit: number;
  debounceMs?: number;
  /** Sends one save. Rejects on a network or server failure. */
  save: (payload: string, baseRevision: number, keepalive: boolean) => Promise<SaveResult>;
  onState: (state: SaveState) => void;
  onEvent?: (event: SaverEvent) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

const MAX_BACKOFF_MS = 30_000;
/** Retries after the tool has closed (in-app navigation) before giving up. */
const RETRIES_AFTER_CLOSE = 3;

/** Next retry delay: 1s, 2s, 4s … capped at 30s. */
export function backoffMs(attempt: number): number {
  return Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.max(0, attempt - 1));
}

export class DocSaver<T> {
  loaded = false;
  revision = 0;
  pending: T | null = null;
  inFlight = false;
  attempt = 0;
  stopped: "conflict" | "locked" | null = null;
  closed = false;
  private timer: unknown = null;
  private retryTimer: unknown = null;
  private readonly deps: Required<Omit<SaverDeps, "onEvent">> & Pick<SaverDeps, "onEvent">;

  constructor(deps: SaverDeps) {
    this.deps = {
      debounceMs: 350,
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      ...deps,
    };
  }

  /** The document has loaded at this revision; saving may start. */
  start(revision: number) {
    this.revision = revision;
    this.loaded = true;
    if (this.pending != null) this.send();
  }

  get dirty(): boolean {
    return this.pending != null || this.inFlight;
  }

  get waitingToRetry(): boolean {
    return this.retryTimer != null;
  }

  /** A change from the tool: keep it and send it after the pause. */
  change(value: T) {
    this.pending = value;
    if (this.stopped) return;
    if (this.timer != null) this.deps.clearTimer(this.timer);
    if (this.retryTimer == null) this.state("saving");
    this.timer = this.deps.setTimer(() => {
      this.timer = null;
      // While a retry is waiting, the next attempt carries this change too.
      if (this.retryTimer == null) this.send();
    }, this.deps.debounceMs);
  }

  /** Send now (page hidden, tab closing, tool closing, back online). */
  flush(keepalive = false) {
    this.send(keepalive);
  }

  /** The tool closed. Sends what is left; later state changes are not shown. */
  close() {
    this.send();
    this.closed = true;
  }

  private state(next: SaveState) {
    if (!this.closed) this.deps.onState(next);
  }

  private event(next: SaverEvent) {
    if (!this.closed) this.deps.onEvent?.(next);
  }

  private clearTimers() {
    if (this.timer != null) this.deps.clearTimer(this.timer);
    if (this.retryTimer != null) this.deps.clearTimer(this.retryTimer);
    this.timer = null;
    this.retryTimer = null;
  }

  send(keepalive = false) {
    if (!this.loaded || this.inFlight || this.stopped || this.pending == null) return;
    this.clearTimers();
    const value = this.pending;
    const payload = JSON.stringify(value);
    if (payload.length > this.deps.limit) {
      this.state("too-large");
      this.event("too-large");
      return;
    }
    this.pending = null;
    this.inFlight = true;
    this.state("saving");
    const keep = () => {
      // A newer change replaces this one; otherwise keep this one to send again.
      if (this.pending == null) this.pending = value;
    };
    this.deps
      .save(payload, this.revision, keepalive)
      .then((res) => {
        this.inFlight = false;
        if (res.ok) {
          this.revision = res.revision;
          if (this.attempt > 0) this.event("saved-after-retry");
          this.attempt = 0;
          if (this.pending != null) this.send();
          else this.state("saved");
          return;
        }
        keep();
        if (res.error === "conflict") {
          this.stopped = "conflict";
          this.state("conflict");
          this.event("conflict");
        } else if (res.error === "too_large") {
          this.state("too-large");
          this.event("too-large");
        } else {
          this.stopped = "locked";
          this.state("error");
          this.event("locked");
        }
      })
      .catch(() => {
        this.inFlight = false;
        keep();
        this.attempt += 1;
        if (this.closed && this.attempt > RETRIES_AFTER_CLOSE) return;
        this.state("retrying");
        if (this.attempt === 1) this.event("retrying");
        this.retryTimer = this.deps.setTimer(() => {
          this.retryTimer = null;
          this.send();
        }, backoffMs(this.attempt));
      });
  }
}
