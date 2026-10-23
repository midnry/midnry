/**
 * One open app document: load it, save changes through DocSaver, and keep the
 * browser-only recovery copy (doc-recovery.ts) whenever a save can't finish.
 *
 * Kept free of React and the browser so the whole recovery flow can be tested
 * in Node (scripts/doc-session.test.mjs). useAppDoc (src/components/use-app-doc.ts)
 * is a thin wrapper that wires React state, toasts and window events to it.
 *
 * Rules the session keeps:
 *  - A save problem (retrying, conflict, refresh required, too large, locked)
 *    keeps a copy of the unsaved document in this browser, refreshed as the
 *    person keeps typing, and cleared once the document is saved.
 *  - "Refresh now" reloads only after the copy was stored. If this browser
 *    would not store it, the page stays open with the document and the panel
 *    offers Copy / Download first; refreshing then is an explicit choice.
 *  - Closing the tool (in-app navigation) or leaving the page while a save is
 *    pending or in flight keeps a "pending" copy first, and recovery handling
 *    stays active until the request settles: a late failure (network, a
 *    conflict, a refresh) keeps the copy with its reason; a late success
 *    clears the copy it had kept, and only that copy.
 *  - When this browser cannot keep a copy (storage blocked or full, found by
 *    a probe when the app opens or by a failed copy), leaving inside the app
 *    with an unsaved change asks first (mustConfirmLeave), as closing the tab
 *    already does.
 *  - Copies are keyed by the signed-in account and the app, so one account
 *    is never offered another's changes, nor one app another app's.
 *  - Every save names the account the page was opened for. If another account
 *    has signed in on this browser since, the server refuses it ("wrong_account"):
 *    saving stops, the change is kept under the original account, and the
 *    panel explains it. Nothing is written into the other account.
 */
import { DocSaver, type SaveResult, type SaveState, type SaverEvent } from "@/lib/doc-saver";
import { decideOnLoad, docIssues as sharedIssues, type RecoveryReason, type RecoveryStore, type RefreshOutcome } from "@/lib/doc-recovery";

export type LoadResult =
  | { ok: true; payload: string | null; revision: number; owner: string }
  | { ok: false; error: string };

export type SessionDeps<T extends object> = {
  slug: string;
  /** Size limit for one saved document (characters of JSON). */
  limit: number;
  store: RecoveryStore;
  /** The document when nothing is saved yet; saved keys are laid over it. */
  fallback: () => T;
  load: () => Promise<LoadResult>;
  /** Sends one save; `owner` is the account this page was opened for (the server refuses another). */
  save: (payload: string, baseRevision: number, keepalive: boolean, owner: string) => Promise<SaveResult>;
  /** The document to show changed (a load, a restore, "use the saved version"). */
  onData: (value: T) => void;
  onLoaded: (status: { loadError: boolean; blocked: boolean }) => void;
  onSaveState: (state: SaveState) => void;
  notify?: (event: SaverEvent) => void;
  /** Reload the page (after the copy was kept). */
  reload: () => void;
  issues?: typeof sharedIssues;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Pause after a change before it is saved. */
  debounceMs?: number;
  /** Pause before refreshing the recovery copy while the person keeps typing. */
  copyDebounceMs?: number;
};

/** The save states that keep a recovery copy, with the reason written on it. */
const PROBLEM_STATES: Partial<Record<SaveState, RecoveryReason>> = {
  retrying: "retrying",
  conflict: "conflict",
  refresh: "refresh",
  "too-large": "too-large",
  error: "locked",
  account: "account",
};

export class DocSession<T extends object> {
  private readonly saver: DocSaver<T>;
  private readonly deps: SessionDeps<T>;
  private readonly issues: typeof sharedIssues;
  private owner = "";
  private latest: T;
  /** A save problem is open; its reason labels the copy. */
  private problem: RecoveryReason | null = null;
  /** The copy this session last stored, so a late success clears only its own. */
  private copied: string | null = null;
  /** A copy from an earlier visit is on offer; it is not replaced until decided. */
  private offering = false;
  private copyTimer: unknown = null;
  /** Leaving on purpose (Refresh in the panel): no "leave page?" prompt. */
  private leaving = false;
  /** Whether this browser can keep a recovery copy: unknown until probed or a copy is attempted. */
  private storage: "unknown" | "ok" | "broken" = "unknown";
  closed = false;

  constructor(deps: SessionDeps<T>) {
    this.deps = deps;
    this.issues = deps.issues ?? sharedIssues;
    this.latest = deps.fallback();
    this.saver = new DocSaver<T>({
      limit: deps.limit,
      debounceMs: deps.debounceMs,
      save: (payload, baseRevision, keepalive) => deps.save(payload, baseRevision, keepalive, this.owner),
      setTimer: deps.setTimer,
      clearTimer: deps.clearTimer,
      onState: (state) => {
        deps.onSaveState(state);
        const reason = PROBLEM_STATES[state];
        if (reason) this.problem = reason;
        else if (state === "saved") {
          this.problem = null;
          void this.clearCopy();
        }
      },
      onEvent: (event) => {
        deps.notify?.(event);
        if (event === "retrying") void this.keepCopy("retrying");
        else if (event === "too-large") void this.keepCopy("too-large");
        else if (event === "locked") void this.keepCopy("locked");
        else if (event === "conflict") {
          void this.keepCopy("conflict");
          this.showConflict();
        } else if (event === "refresh-required") {
          void this.keepCopy("refresh");
          this.showRefresh();
        } else if (event === "account-changed") {
          // Kept under the account this page was opened for, so only that account is offered it.
          void this.keepCopy("account");
          this.showRefresh("account");
        }
      },
      // The tool has closed: nothing is shown, but the copy kept at close is
      // settled by what the request did.
      onAfterClose: (event) => {
        if (event.kind === "saved") void this.clearCopy(event.payload);
        else void this.keepCopy(event.reason, true);
      },
    });
  }

  /** The newest version on this page, saved or not. */
  get data(): T {
    return this.latest;
  }

  get dirty(): boolean {
    return this.saver.dirty;
  }

  /** Load the saved document, then offer any recovery copy from an earlier visit. */
  open(): Promise<void> {
    return this.deps.load().then(
      (res) => {
        if (this.closed) return;
        if (!res.ok) {
          this.deps.onLoaded({ blocked: res.error === "locked", loadError: res.error !== "locked" });
          return;
        }
        this.owner = res.owner || "";
        this.apply(res.payload);
        this.deps.onLoaded({ blocked: false, loadError: false });
        this.saver.start(res.revision);
        void this.deps.store.canKeep(this.owner).then((kept) => {
          if (this.storage === "unknown") this.storage = kept ? "ok" : "broken";
        });
        return this.offerRecovered(res.payload);
      },
      () => {
        if (this.closed) return;
        this.deps.onLoaded({ blocked: false, loadError: true });
      },
    );
  }

  /** A change from the tool. */
  change(value: T) {
    this.latest = value;
    this.saver.change(value);
    if (!this.problem || !this.owner || this.offering) return;
    const reason = this.problem;
    this.cancelCopyTimer();
    this.copyTimer = this.timer(() => {
      this.copyTimer = null;
      void this.keepCopy(reason);
    }, this.deps.copyDebounceMs ?? 400);
  }

  /** Send now (tab hidden, back online, tool closing). */
  flush(keepalive = false) {
    this.saver.flush(keepalive);
  }

  /** Back online: retry at once instead of waiting out the backoff. */
  online() {
    if (this.saver.waitingToRetry) this.saver.flush();
  }

  /**
   * The page is going (pagehide). Send what is left with keepalive, and keep a
   * copy first in case that request never lands: "pending" when there was no
   * problem yet, else the problem's reason.
   */
  pageHide() {
    this.saver.flush(true);
    if (this.saver.dirty || this.problem) void this.keepCopy(this.problem ?? "pending");
  }

  /**
   * beforeunload: returns true when the browser should ask before leaving
   * (something is still unsaved and the person did not choose to refresh).
   */
  beforeUnload(): boolean {
    if (!this.saver.dirty || this.leaving) return false;
    this.saver.flush(true);
    void this.keepCopy(this.problem ?? "pending");
    return true;
  }

  /**
   * In-app navigation is about to close the tool: true when the person should
   * be asked first. That is only when a change is still unsaved and this
   * browser cannot keep a copy, because then a request that fails after
   * leaving would lose the change with nothing to offer back.
   */
  mustConfirmLeave(): boolean {
    return this.saver.dirty && this.storage !== "ok" && Boolean(this.owner);
  }

  /**
   * The tool closed (in-app navigation or a change of app). Anything still
   * pending or in flight is copied first, then sent; the outcome settles the
   * copy through onAfterClose.
   */
  close() {
    if (this.closed) return;
    const reason = this.problem ?? "pending";
    if (this.saver.dirty || this.copyTimer != null) void this.keepCopy(reason);
    this.cancelCopyTimer();
    this.issues.clear(this.deps.slug);
    this.closed = true;
    this.saver.close();
  }

  /* ── recovery copy ──────────────────────────────────────────────────────── */

  /** Keep a copy of the unsaved document. True when the browser stored it. */
  private async keepCopy(reason: RecoveryReason, afterClose = false): Promise<boolean> {
    this.cancelCopyTimer();
    if (!this.owner || (this.offering && !afterClose)) return false;
    const payload = JSON.stringify(this.mine());
    const stored = await this.deps.store.save(this.owner, this.deps.slug, payload, this.saver.revision, reason);
    if (stored) this.copied = payload;
    this.storage = stored ? "ok" : "broken";
    return stored;
  }

  /** Clear the copy this session kept, if the store still holds that copy. */
  private async clearCopy(payload = this.copied) {
    this.cancelCopyTimer();
    if (!this.owner || payload == null) return;
    const mine = this.copied;
    this.copied = null;
    // The copy kept at close may be the one just saved even when `copied`
    // was reset meanwhile: compare with the saved payload itself.
    await this.deps.store.clearIfPayload(this.owner, this.deps.slug, payload);
    if (mine != null && mine !== payload) await this.deps.store.clearIfPayload(this.owner, this.deps.slug, mine);
  }

  private cancelCopyTimer() {
    if (this.copyTimer != null) (this.deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>)))(this.copyTimer);
    this.copyTimer = null;
  }

  private timer(fn: () => void, ms: number): unknown {
    return (this.deps.setTimer ?? ((f, m) => setTimeout(f, m)))(fn, ms);
  }

  private mine(): T {
    return this.saver.unsaved ?? this.latest;
  }

  private parse(payload: string | null): T {
    let next = this.deps.fallback();
    if (payload) {
      try {
        const raw: unknown = JSON.parse(payload);
        if (raw && typeof raw === "object" && !Array.isArray(raw)) next = { ...next, ...(raw as T) };
      } catch {
        /* keep fallback */
      }
    }
    return next;
  }

  private apply(payload: string | null) {
    this.latest = this.parse(payload);
    this.deps.onData(this.latest);
  }

  private loadSaved = async () => {
    const res = await this.deps.load();
    if (!res.ok) throw new Error("Could not load the saved version.");
    return { payload: res.payload, revision: res.revision };
  };

  /* ── the resolution panel ───────────────────────────────────────────────── */

  private showConflict() {
    const { slug } = this.deps;
    this.issues.set({
      slug,
      kind: "conflict",
      open: true,
      mine: () => JSON.stringify(this.mine()),
      loadSaved: this.loadSaved,
      keepMine: async () => {
        const saved = await this.loadSaved();
        await this.keepCopy("conflict");
        this.issues.clear(slug, "conflict");
        // Based on the latest revision: if yet another save lands first,
        // this conflicts again and the panel comes back.
        this.saver.overwrite(saved.revision);
      },
      useSaved: async () => {
        const saved = await this.loadSaved();
        this.saver.adopt(saved.revision);
        this.apply(saved.payload);
        this.problem = null;
        await this.deps.store.clear(this.owner, slug);
        this.copied = null;
        this.issues.clear(slug);
      },
    });
  }

  private showRefresh(kind: "refresh" | "account" = "refresh") {
    const { slug } = this.deps;
    this.issues.set({
      slug,
      kind,
      open: true,
      mine: () => JSON.stringify(this.mine()),
      loadSaved: this.loadSaved,
      refresh: async (): Promise<RefreshOutcome> => {
        const stored = await this.keepCopy(kind);
        // Confirm the copy can be read back before the page goes.
        const kept = stored && (await this.deps.store.read(this.owner, slug)) != null;
        if (!kept) return "not-stored";
        this.leaving = true;
        this.deps.reload();
        return "reloading";
      },
      refreshAnyway: () => {
        this.leaving = true;
        this.deps.reload();
      },
    });
  }

  private async offerRecovered(savedPayload: string | null) {
    const { slug, store } = this.deps;
    const record = await store.read(this.owner, slug);
    if (this.closed) return;
    const decision = decideOnLoad(record, savedPayload, (this.deps.now ?? Date.now)());
    if (decision === "discard") void store.clear(this.owner, slug);
    if (decision !== "offer" || !record) return;
    this.offering = true;
    const done = () => {
      this.offering = false;
      this.issues.clear(slug, "recovered");
    };
    this.issues.set({
      slug,
      kind: "recovered",
      open: true,
      savedAt: record.savedAt,
      mine: () => record.payload,
      loadSaved: this.loadSaved,
      keepMine: async () => {
        const saved = await this.loadSaved();
        done();
        // Restore over the latest saved revision; the copy stays until this saves.
        this.saver.adopt(saved.revision);
        this.copied = record.payload;
        this.apply(record.payload);
        this.saver.change(this.latest);
      },
      useSaved: async () => {
        done();
        await store.clear(this.owner, slug);
      },
    });
  }
}
