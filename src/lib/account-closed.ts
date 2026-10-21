// Shared by the sign-in guard (server) and the login page (client).

/** Better Auth error code for a sign-in to a closed account. */
export const ACCOUNT_CLOSED_CODE = "ACCOUNT_CLOSED";

export const ACCOUNT_CLOSED_MESSAGE =
  "This account was closed. Email hello@midnry.com within 30 days to restore it.";

/** What a person must type to confirm closing their account. */
export const CLOSE_CONFIRM_WORD = "DELETE";
