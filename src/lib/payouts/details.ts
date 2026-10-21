// A maker's payout details (bank account), encrypted at rest.
//
// Encryption reuses Better Auth's symmetric helper — the one behind
// `encryptOAuthTokens` (XChaCha20-Poly1305 with a random nonce, key = SHA-256
// of the secret). The key string is the auth secret with a purpose label, so
// these blobs and the OAuth tokens never share a key.

import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import type { Runner } from "./ledger";
import { countryName, PAYOUT_COUNTRIES, type MaskedDetails } from "./countries";

export { countryName, PAYOUT_COUNTRIES, type MaskedDetails };

export type PayoutDetails = {
  holder: string;
  bank: string;
  account: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
};

const KEY_LABEL = "midnry-payout-details-v1";

/** The encryption key string. Refuses to work without a real auth secret. */
export function payoutKey(secret = process.env.BETTER_AUTH_SECRET?.trim() ?? ""): string {
  if (secret.length < 32) throw new Error("Payout details can't be saved right now.");
  return `${KEY_LABEL}:${secret}`;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max + 1) : "";
}

/** Validate and normalise what the form sent. Throws a message fit to show. */
export function validateDetails(input: unknown): PayoutDetails {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const holder = clean(raw.holder, 120);
  const bank = clean(raw.bank, 120);
  const account = clean(raw.account, 40).replace(/[\s-]/g, "").toUpperCase();
  const country = clean(raw.country, 2).toUpperCase();
  if (holder.length < 2 || holder.length > 120) throw new Error("Enter the account holder’s name.");
  if (bank.length < 2 || bank.length > 120) throw new Error("Enter the bank’s name.");
  if (!/^[A-Z0-9]{6,34}$/.test(account)) throw new Error("Enter the account number (6 to 34 letters or digits).");
  if (!PAYOUT_COUNTRIES.some((c) => c.code === country)) throw new Error("Pick the bank’s country.");
  if (country === "NG" && !/^\d{10}$/.test(account)) throw new Error("A Nigerian account number has 10 digits.");
  return { holder, bank, account, country };
}

export async function sealDetails(details: PayoutDetails, key: string): Promise<string> {
  return symmetricEncrypt({ key, data: JSON.stringify(details) });
}

export async function openDetails(blob: string, key: string): Promise<PayoutDetails> {
  const parsed = JSON.parse(await symmetricDecrypt({ key, data: blob })) as PayoutDetails;
  return validateDetails(parsed);
}

function maskName(name: string): string {
  return name
    .split(" ")
    .map((word) => (word.length <= 1 ? word : `${word[0]}${"•".repeat(Math.min(word.length - 1, 6))}`))
    .join(" ");
}

export function maskDetails(details: PayoutDetails, updatedAt: string): MaskedDetails {
  return {
    holder: maskName(details.holder),
    bank: details.bank,
    account: `•••• ${details.account.slice(-4)}`,
    country: details.country,
    countryName: countryName(details.country),
    updatedAt,
  };
}

// ── Storage (scoped by user id; callers pass the verified session's id) ──────

export async function saveDetails(sql: Runner, userId: string, details: PayoutDetails, key: string): Promise<void> {
  const blob = await sealDetails(details, key);
  await sql.query(
    `insert into creator_payout_details (user_id, details, updated_at) values ($1, $2, now())
     on conflict (user_id) do update set details = excluded.details, updated_at = now()`,
    [userId, blob],
  );
}

export async function readDetails(
  sql: Runner,
  userId: string,
  key: string,
): Promise<{ details: PayoutDetails; updatedAt: string } | null> {
  const rows = await sql.query<{ details: string; updated_at: string }>(
    `select details, to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
       from creator_payout_details where user_id = $1`,
    [userId],
  );
  if (!rows[0]) return null;
  return { details: await openDetails(rows[0].details, key), updatedAt: rows[0].updated_at };
}

export async function deleteDetails(sql: Runner, userId: string): Promise<void> {
  await sql.query(`delete from creator_payout_details where user_id = $1`, [userId]);
}

/** Admin: every maker's details, decrypted. A blob that fails to open is reported, not thrown. */
export async function readAllDetails(
  sql: Runner,
  userIds: string[],
  key: string,
): Promise<Map<string, PayoutDetails | "unreadable">> {
  const out = new Map<string, PayoutDetails | "unreadable">();
  if (userIds.length === 0) return out;
  const rows = await sql.query<{ user_id: string; details: string }>(
    `select user_id, details from creator_payout_details where user_id = any($1::text[])`,
    [userIds],
  );
  for (const row of rows) {
    try {
      out.set(row.user_id, await openDetails(row.details, key));
    } catch {
      out.set(row.user_id, "unreadable");
    }
  }
  return out;
}
