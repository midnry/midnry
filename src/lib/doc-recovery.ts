/**
 * A recovery copy of unsaved app changes, kept only in this browser.
 *
 * When a save can't finish (it is retrying, another tab saved first, the
 * server asks for a refresh, or it is too large), useAppDoc keeps a copy of
 * the unsaved document here before anything could lose it, so a reload, a
 * closed tab or a navigation never drops it. Next time the app opens for the
 * same account, the copy is offered back. It is cleared once resolved: saved,
 * restored, or discarded by the person.
 *
 * Privacy: the copy never leaves the browser. It lives in IndexedDB (falling
 * back to sessionStorage when IndexedDB can't be opened), keyed per account
 * and per app, and is dropped after MAX_AGE_MS. Every storage call is wrapped
 * so a blocked or full store only means no copy, never a crash.
 *
 * Kept free of React so it can be tested on its own (scripts/doc-recovery.test.mjs).
 */

/**
 * Why the copy was kept. "pending" means the tool closed (or the page was
 * leaving) while a save was still waiting or in flight: the copy is kept
 * before the outcome is known, and dropped on the next open if the save
 * landed after all (decideOnLoad). "locked" means the server refused the save
 * because the account no longer opens the app.
 */
export type RecoveryReason = "retrying" | "conflict" | "refresh" | "too-large" | "pending" | "locked";

export type RecoveryRecord = {
  v: 1;
  owner: string;
  slug: string;
  /** The unsaved document, as the JSON the app would have saved. */
  payload: string;
  /** The saved revision this change was based on. */
  baseRevision: number;
  reason: RecoveryReason;
  savedAt: number;
};

export interface RecoveryBackend {
  get(key: string): Promise<unknown>;
  put(key: string, value: RecoveryRecord): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Copies older than this are dropped instead of offered. */
export const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function recoveryKey(owner: string, slug: string): string {
  return `midnry-recovery:v1:${owner}:${slug}`;
}

const REASONS: readonly RecoveryReason[] = ["retrying", "conflict", "refresh", "too-large", "pending", "locked"];

function isRecord(value: unknown, owner: string, slug: string): value is RecoveryRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<RecoveryRecord>;
  return (
    r.v === 1 &&
    r.owner === owner &&
    r.slug === slug &&
    typeof r.payload === "string" &&
    typeof r.baseRevision === "number" &&
    typeof r.savedAt === "number" &&
    REASONS.includes(r.reason as RecoveryReason)
  );
}

export class RecoveryStore {
  constructor(
    private readonly backend: RecoveryBackend | null,
    private readonly now: () => number = Date.now,
  ) {}

  /** Keep a copy. Returns false when the browser would not store it. */
  async save(owner: string, slug: string, payload: string, baseRevision: number, reason: RecoveryReason): Promise<boolean> {
    if (!this.backend || !owner) return false;
    try {
      await this.backend.put(recoveryKey(owner, slug), { v: 1, owner, slug, payload, baseRevision, reason, savedAt: this.now() });
      return true;
    } catch {
      return false;
    }
  }

  /** The copy for this account and app, or null (none, unreadable, or too old). */
  async read(owner: string, slug: string): Promise<RecoveryRecord | null> {
    if (!this.backend || !owner) return null;
    try {
      const value = await this.backend.get(recoveryKey(owner, slug));
      if (!isRecord(value, owner, slug)) return null;
      return value;
    } catch {
      return null;
    }
  }

  async clear(owner: string, slug: string): Promise<void> {
    if (!this.backend || !owner) return;
    try {
      await this.backend.delete(recoveryKey(owner, slug));
    } catch {
      /* nothing to do: the copy expires */
    }
  }

  /**
   * Clear the copy only if it still holds `payload` (the version that has
   * just been saved). A copy kept since by another page of the same app, for
   * a save that did fail, is left for the next open to offer.
   */
  async clearIfPayload(owner: string, slug: string, payload: string): Promise<boolean> {
    const record = await this.read(owner, slug);
    if (!record || !samePayload(record.payload, payload)) return false;
    await this.clear(owner, slug);
    return true;
  }
}

/**
 * What to do with a copy found when the app opens:
 *  - "none": there is no copy;
 *  - "discard": it is too old, or the saved document already equals it (the
 *    last save went through after all), so it is cleared without asking;
 *  - "offer": show it and let the person choose.
 */
export function decideOnLoad(record: RecoveryRecord | null, savedPayload: string | null, now: number): "none" | "discard" | "offer" {
  if (!record) return "none";
  if (now - record.savedAt > MAX_AGE_MS) return "discard";
  if (savedPayload != null && samePayload(record.payload, savedPayload)) return "discard";
  return "offer";
}

/** Same document, ignoring formatting. */
export function samePayload(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
  } catch {
    return false;
  }
}

/** A saved payload laid out for reading and for the downloaded file. */
export function prettyPayload(payload: string | null): string {
  if (payload == null) return "";
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

/** "midnry-ledger-my-version-2026-10-22-1405.json" */
export function downloadName(slug: string, when: Date, ext: "json" | "txt" = "json"): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}-${pad(when.getHours())}${pad(when.getMinutes())}`;
  const safe = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "app";
  return `midnry-${safe}-my-version-${stamp}.${ext}`;
}

/* ── browser storage ────────────────────────────────────────────────────── */

const DB_NAME = "midnry-recovery";
const STORE = "docs";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("blocked"));
  });
}

function indexedDbBackend(): RecoveryBackend {
  let db: Promise<IDBDatabase> | null = null;
  const store = async (mode: IDBTransactionMode) => {
    db ??= openDb();
    try {
      return (await db).transaction(STORE, mode).objectStore(STORE);
    } catch (error) {
      db = null;
      throw error;
    }
  };
  const done = (tx: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  return {
    get: async (key) => request((await store("readonly")).get(key)),
    put: async (key, value) => {
      const s = await store("readwrite");
      s.put(value, key);
      await done(s.transaction);
    },
    delete: async (key) => {
      const s = await store("readwrite");
      s.delete(key);
      await done(s.transaction);
    },
  };
}

function sessionStorageBackend(): RecoveryBackend {
  return {
    get: async (key) => {
      const raw = window.sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as unknown) : undefined;
    },
    put: async (key, value) => window.sessionStorage.setItem(key, JSON.stringify(value)),
    delete: async (key) => window.sessionStorage.removeItem(key),
  };
}

/** IndexedDB, and sessionStorage for any call IndexedDB refuses. */
function browserBackend(): RecoveryBackend | null {
  let idb: RecoveryBackend | null = null;
  let session: RecoveryBackend | null = null;
  try {
    if (typeof indexedDB !== "undefined") idb = indexedDbBackend();
  } catch {
    idb = null;
  }
  try {
    if (typeof window !== "undefined" && window.sessionStorage) session = sessionStorageBackend();
  } catch {
    session = null;
  }
  if (!idb && !session) return null;
  const both = <A extends unknown[], R>(pick: (b: RecoveryBackend) => (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      if (idb) {
        try {
          return await pick(idb)(...args);
        } catch {
          /* fall through to sessionStorage */
        }
      }
      if (session) return pick(session)(...args);
      throw new Error("No storage");
    };
  return {
    get: both((b) => b.get),
    put: both((b) => b.put),
    delete: async (key) => {
      // Clear both, so a copy kept by the fallback is not offered again.
      for (const b of [idb, session]) {
        try {
          await b?.delete(key);
        } catch {
          /* ignore */
        }
      }
    },
  };
}

let shared: RecoveryStore | null = null;

/** The store for this browser (no storage on the server). */
export function browserRecoveryStore(): RecoveryStore {
  if (typeof window === "undefined") return new RecoveryStore(null);
  shared ??= new RecoveryStore(browserBackend());
  return shared;
}

/* ── open save problems, for the resolution panel ───────────────────────── */

export type DocIssueKind = "conflict" | "refresh" | "recovered";

export type DocIssue = {
  slug: string;
  kind: DocIssueKind;
  /** Shown, or tucked away with "Decide later". */
  open: boolean;
  /** When the recovered copy was kept (recovered only). */
  savedAt?: number;
  /** The person's unsaved version, as JSON. */
  mine: () => string;
  /** The newest saved version, as JSON (null when nothing is saved). */
  loadSaved: () => Promise<{ payload: string | null; revision: number }>;
  /** Save mine over the newest saved version (conflict, recovered). */
  keepMine?: () => Promise<void>;
  /** Drop mine and use the newest saved version (conflict, recovered). */
  useSaved?: () => Promise<void>;
  /**
   * Keep the copy, then refresh the page (refresh). Resolves "not-stored"
   * instead of reloading when this browser would not keep the copy: the
   * page stays open with the unsaved document, and the panel offers Copy and
   * Download before refreshing on purpose.
   */
  refresh?: () => Promise<RefreshOutcome>;
  /** Refresh without a kept copy, chosen after the warning (refresh). */
  refreshAnyway?: () => void;
};

export type RefreshOutcome = "reloading" | "not-stored";

type Listener = () => void;
let issues: readonly DocIssue[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export const docIssues = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): readonly DocIssue[] {
    return issues;
  },
  set(issue: DocIssue) {
    issues = [...issues.filter((item) => item.slug !== issue.slug), issue];
    emit();
  },
  clear(slug: string, kind?: DocIssueKind) {
    const next = issues.filter((item) => item.slug !== slug || (kind && item.kind !== kind));
    if (next.length === issues.length) return;
    issues = next;
    emit();
  },
  open(slug: string, open = true) {
    issues = issues.map((item) => (item.slug === slug ? { ...item, open } : item));
    emit();
  },
  has(slug: string, kind?: DocIssueKind): boolean {
    return issues.some((item) => item.slug === slug && (!kind || item.kind === kind));
  },
};
