/**
 * Scam check's warning signs. This is a checklist, never a verdict: the app
 * lists the signs it found, what each means and what to do, and never says a
 * message is or isn't a scam (docs/phase3-plan.md, D1). Claims (rumor-check)
 * does not use this at all; it shows its own questions.
 */
export type ScamSign = { id: string; pattern: RegExp; label: string; meaning: string; todo: string };

export const SCAM_SIGNS: readonly ScamSign[] = [
  {
    id: "pressure",
    pattern: /\b(urgent(ly)?|immediately|right now|act (fast|now)|last chance|within \d+ (hours?|minutes?)|expires? today)\b/,
    label: "Pressure to act fast",
    meaning: "It pushes you to act quickly, before you have time to check.",
    todo: "Slow down. Real banks and family can wait while you check.",
  },
  {
    id: "payment",
    pattern: /\b(gift ?cards?|bitcoin|crypto|usdt|wire (the )?money|western union|send money|transfer (the )?(money|fee))\b/,
    label: "A hard-to-reverse payment",
    meaning: "It asks you to send money in a way that is hard to get back.",
    todo: "Don't send money until you have checked with the person or company another way.",
  },
  {
    id: "code",
    pattern: /\b(otp|one[- ]time (code|password|pin)|verification code|pin|password|bvn|cvv)\b/,
    label: "A code, PIN or password",
    meaning: "It mentions a code, PIN or password. Real companies don't ask for these by message.",
    todo: "Never share a code, PIN or password. Call your bank on the number on your card if unsure.",
  },
  {
    id: "link",
    pattern: /https?:\/\/|www\.|bit\.ly|tinyurl|wa\.me|t\.me/,
    label: "A link",
    meaning: "It contains a link, which can lead to a fake page.",
    todo: "Don't open it. Type the address you already know yourself instead.",
  },
  {
    id: "prize",
    pattern: /\b(you (have )?won|winner|prize|lottery|inheritance|congratulations|claim your)\b/,
    label: "A prize you didn't expect",
    meaning: "It offers a prize or money you didn't expect.",
    todo: "Don't pay a fee to collect anything. Ask someone you trust first.",
  },
  {
    id: "threat",
    pattern: /\b(account (has been|will be|is) (blocked|suspended|closed|locked)|unusual activity|verify your account)\b/,
    label: "A threat to your account",
    meaning: "It says something bad will happen to your account, which can scare you into acting.",
    todo: "Contact the bank or company yourself, using a number or app you already have.",
  },
  {
    id: "new-number",
    pattern: /\b(new number|lost my phone|changed my number|it'?s me,? (mum|mom|dad))\b/,
    label: "Someone you know on a new number",
    meaning: "It says it is someone you know, writing from a new number.",
    todo: "Call their old number, or ask a question only they would know.",
  },
  {
    id: "secret",
    pattern: /\b(keep (this|it) (secret|between us)|don'?t tell (anyone|your))\b/,
    label: "A request for secrecy",
    meaning: "It asks you to keep it secret, so nobody can help you check.",
    todo: "Tell someone you trust about it before you do anything.",
  },
];

/** The warning signs found in a message, in list order. */
export function scamSigns(text: string): ScamSign[] {
  const lower = text.toLowerCase();
  return SCAM_SIGNS.filter((sign) => sign.pattern.test(lower));
}

/** The headline above the list. It counts signs; it never calls a message a scam or safe. */
export function scamHeadline(count: number): string {
  if (count === 0) return "No common warning signs found. That does not prove it is genuine. If unsure, ask someone you trust.";
  return `Warning signs found: ${count}`;
}

export const SCAM_FOOTNOTE = "This is a checklist, not proof either way. If money or a code is involved, stop and ask someone you trust.";

/** Claims (rumor-check): questions to ask before forwarding. No scam signs, no verdict. */
export const CLAIM_QUESTIONS: readonly string[] = [
  "Who said it, and can you open that source yourself?",
  "Do the date and the place match?",
  "Is a trusted news site or official page saying the same thing?",
  "If it asks you to forward it, wait.",
];
