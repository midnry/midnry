import { createServerFn } from "@tanstack/react-start";

export type SignInOptions = { google: boolean };

// Which sign-in buttons the login page can offer. Reads the same keys as
// `auth/server.ts` without importing it, so nothing server-only reaches the client.
export const getSignInOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<SignInOptions> => {
    const set = (key: string) => Boolean(process.env[key]?.trim());
    const authOff = process.env.VITE_AUTH_ENABLED?.trim() === "false";
    return { google: !authOff && set("GOOGLE_CLIENT_ID") && set("GOOGLE_CLIENT_SECRET") };
  },
);
