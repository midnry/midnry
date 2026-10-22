// Apply's saved document. Version 1 (before job adverts) held the roles, the
// resume and one tailored text per role; it still loads exactly as saved.
// A pack prepared now also keeps its job advert, the changes the person
// reverted, and whether they edited the text by hand. `resume` is always the
// text that is exported, so old and new packs download the same way.

import { composeResume, noteFor, planTailoring, type TailorPlan } from "@/lib/apply/tailor";

export const MAX_ROLES = 6;
export const MAX_RESUME = 18_000;
export const MAX_ADVERT = 12_000;

export type Pack = {
  role: string;
  note: string;
  /** The text that is exported: tailored, minus reverted changes, or the person's edit. */
  resume: string;
  submitted: boolean;
  /** Present on packs prepared with adverts and change review (version 2). */
  v?: 2;
  advert?: string;
  reverted?: string[];
  edited?: boolean;
};

export type ApplyDoc = {
  rolesText: string;
  resume: string;
  packs: Pack[];
};

export const FALLBACK: ApplyDoc = { rolesText: "", resume: "", packs: [] };

/** Reads whatever was saved. Old packs keep every field as it was. */
export function normalizeDoc(value: unknown): ApplyDoc {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof ApplyDoc, unknown>>;
  const packs = Array.isArray(raw.packs)
    ? (raw.packs as unknown[]).filter((pack): pack is Pack => {
        const row = pack as Partial<Pack> | null;
        return Boolean(row) && typeof row!.role === "string" && typeof row!.resume === "string";
      })
    : [];
  return {
    rolesText: typeof raw.rolesText === "string" ? raw.rolesText : "",
    resume: typeof raw.resume === "string" ? raw.resume : "",
    packs: packs.map((pack) => {
      if (pack.v !== 2) return pack;
      return {
        ...pack,
        note: typeof pack.note === "string" ? pack.note : "",
        submitted: pack.submitted === true,
        advert: typeof pack.advert === "string" ? pack.advert : "",
        reverted: Array.isArray(pack.reverted) ? pack.reverted.filter((id): id is string => typeof id === "string") : [],
        edited: pack.edited === true,
      };
    }),
  };
}

export function isReviewable(pack: Pack): boolean {
  return pack.v === 2;
}

export function rolesFrom(text: string): string[] {
  const seen = new Set<string>();
  const roles: string[] = [];
  for (const line of text.split("\n")) {
    const role = line.trim();
    const key = role.toLowerCase();
    if (role.length < 2 || seen.has(key)) continue;
    seen.add(key);
    roles.push(role);
    if (roles.length === MAX_ROLES) break;
  }
  return roles;
}

export function roleKey(role: string): string {
  return role.trim().toLowerCase();
}

export function planFor(doc: ApplyDoc, pack: Pack, now?: Date): TailorPlan {
  return planTailoring(pack.role, doc.resume, pack.advert ?? "", now);
}

/**
 * Prepares one pack per role. A role prepared before with the same resume and
 * the same advert keeps its reverted changes, its edit and its "submitted" tick.
 */
export function preparePacks(
  previous: ApplyDoc,
  input: { rolesText: string; resume: string; adverts: Record<string, string> },
  now?: Date,
): ApplyDoc {
  const resume = input.resume.slice(0, MAX_RESUME);
  const packs = rolesFrom(input.rolesText).map((role): Pack => {
    const advert = (input.adverts[roleKey(role)] ?? "").slice(0, MAX_ADVERT).trim();
    const plan = planTailoring(role, resume, advert, now);
    const old = previous.packs.find((pack) => roleKey(pack.role) === roleKey(role));
    const same = old && isReviewable(old) && previous.resume === resume && (old.advert ?? "") === advert && old.role === role;
    const reverted = same ? (old.reverted ?? []).filter((id) => plan.changes.some((change) => change.id === id)) : [];
    return {
      v: 2,
      role,
      advert,
      reverted,
      edited: same ? old.edited === true : false,
      resume: same && old.edited ? old.resume : composeResume(plan, reverted),
      note: noteFor(plan, reverted),
      submitted: Boolean(old?.submitted && (same || (old && !isReviewable(old) && previous.resume === resume))),
    };
  });
  return { rolesText: input.rolesText, resume, packs };
}

function update(doc: ApplyDoc, role: string, change: (pack: Pack) => Pack): ApplyDoc {
  return { ...doc, packs: doc.packs.map((pack) => (pack.role === role ? change(pack) : pack)) };
}

/** Accepts (keep = true) or reverts one change. Ignored while the text has hand edits. */
export function setChange(doc: ApplyDoc, role: string, id: string, keep: boolean, now?: Date): ApplyDoc {
  return update(doc, role, (pack) => {
    if (!isReviewable(pack) || pack.edited) return pack;
    const plan = planFor(doc, pack, now);
    if (!plan.changes.some((change) => change.id === id)) return pack;
    const off = new Set(pack.reverted ?? []);
    if (keep) off.delete(id);
    else off.add(id);
    const reverted = plan.changes.map((change) => change.id).filter((item) => off.has(item));
    return { ...pack, reverted, resume: composeResume(plan, reverted), note: noteFor(plan, reverted) };
  });
}

/** The person's own text, exported as written. */
export function editText(doc: ApplyDoc, role: string, text: string): ApplyDoc {
  return update(doc, role, (pack) => (isReviewable(pack) ? { ...pack, edited: true, resume: text.slice(0, MAX_RESUME * 2) } : pack));
}

/** Drops hand edits: back to the tailored text with the current accept/revert choices. */
export function discardEdits(doc: ApplyDoc, role: string, now?: Date): ApplyDoc {
  return update(doc, role, (pack) => {
    if (!isReviewable(pack)) return pack;
    const plan = planFor(doc, pack, now);
    return { ...pack, edited: false, resume: composeResume(plan, pack.reverted ?? []) };
  });
}

export function setSubmitted(doc: ApplyDoc, role: string, submitted: boolean): ApplyDoc {
  return update(doc, role, (pack) => ({ ...pack, submitted }));
}

/** The adverts saved with the packs, keyed by role, to fill the form again. */
export function advertsOf(doc: ApplyDoc): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pack of doc.packs) if (pack.advert) out[roleKey(pack.role)] = pack.advert;
  return out;
}
