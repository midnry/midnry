const BEARER_KEY = "grok-auth.bearer-token";

/** Store the session token Better Auth returns for preview iframes. */
export function captureBearer(response: Response): void {
  if (typeof window === "undefined") return;
  const token = response.headers.get("set-auth-token");
  if (!token) return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* storage unavailable */
  }
}
