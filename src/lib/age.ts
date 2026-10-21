// Age confirmations, shared by the server checks and the forms (client-safe).

/** Sign-up: required to create an account on any path. */
export const AGE_SIGNUP_LABEL = "I'm 13 or older, or I have a parent's or guardian's permission.";
export const AGE_SIGNUP_MESSAGE = "To create an account, confirm you're 13 or older or have a parent's or guardian's permission.";
/** Better Auth error code (and OAuth `?error=` value) for a sign-up without it. */
export const AGE_REQUIRED_CODE = "AGE_CONFIRMATION_REQUIRED";

/** Paying: required to start any checkout (Midnry Pass, Outpost Zero store). */
export const ADULT_PAY_LABEL = "I'm 18 or older, or a parent or guardian is paying.";
export const ADULT_PAY_MESSAGE = "Before paying, confirm you're 18 or older or that a parent or guardian is paying.";
