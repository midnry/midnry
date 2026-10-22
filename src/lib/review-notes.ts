/**
 * Medical, tax and legal tools whose content no qualified professional has
 * checked yet (docs/phase3-plan.md, section 2.4, decision D2). Until a review
 * happens they:
 *  - show a calm "not professionally reviewed yet" note naming who to ask,
 *  - stay out of "Help me choose" and any featured or related spots,
 *  - stay reachable through search and browsing.
 * Never describe any of these as checked, approved or accurate. Remove a slug
 * only after the named professional has reviewed its content.
 */
export const UNREVIEWED: Readonly<Record<string, string>> = {
  dose: "pharmacist or doctor",
  "dose-ref": "pharmacist or doctor",
  "clinic-quiz": "doctor",
  anatomy: "doctor",
  "symptom-log": "doctor",
  paye: "accountant",
  clauses: "lawyer",
  "contract-scan": "lawyer",
  "service-terms": "lawyer",
  "law-drill": "lawyer",
};

export function isUnreviewed(slug: string): boolean {
  return Object.hasOwn(UNREVIEWED, slug);
}

/** "Not professionally reviewed yet. Check with a lawyer before relying on this." */
export function reviewNote(slug: string): string | undefined {
  const who = UNREVIEWED[slug];
  if (!who) return undefined;
  const article = /^[aeiou]/i.test(who) ? "an" : "a";
  return `Not professionally reviewed yet. Check with ${article} ${who} before relying on this.`;
}
