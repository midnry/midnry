import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { captureBearer } from "@/lib/capture-bearer";
import { Shell } from "@/components/shell";
import { Button, Field, TextInput } from "@/components/ui";
import { getApp } from "@/lib/catalog";
import { getSignInOptions } from "@/lib/sign-in-options.functions";
import { ACCOUNT_CLOSED_CODE, ACCOUNT_CLOSED_MESSAGE } from "@/lib/account-closed";
import { AGE_REQUIRED_CODE, AGE_SIGNUP_LABEL, AGE_SIGNUP_MESSAGE } from "@/lib/age";

// `error` arrives from Better Auth's OAuth error redirect; only the closed
// account and sign-up age codes are kept (never arbitrary text from the URL).
type LoginSearch = {
  next: string;
  intent: "register" | "sign-in";
  error?: typeof ACCOUNT_CLOSED_CODE | typeof AGE_REQUIRED_CODE;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const nextRaw = typeof search.next === "string" ? search.next : "";
    const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/apps";
    // A Google sign-in that would have created a new account without the age
    // confirmation comes back here: show the register form with the box.
    if (search.error === AGE_REQUIRED_CODE) return { next, intent: "register", error: AGE_REQUIRED_CODE };
    const intent = search.intent === "sign-in" ? "sign-in" : "register";
    return search.error === ACCOUNT_CLOSED_CODE ? { next, intent, error: ACCOUNT_CLOSED_CODE } : { next, intent };
  },
  loader: () => getSignInOptions(),
  component: LoginPage,
});

function LoginPage() {
  const { next, intent, error: searchError } = Route.useSearch();
  const options = Route.useLoaderData();
  // The Grok broker buttons only work inside the Grok live preview; the hosted
  // site signs in with Google directly.
  const [inGrokPreview, setInGrokPreview] = useState(false);
  useEffect(() => {
    setInGrokPreview(window.location.hostname.endsWith(".grok-sandbox.com"));
  }, []);
  const brokerProviders = inGrokPreview ? GROK_PROVIDERS : [];
  const showGoogle = options.google && !inGrokPreview;
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"register" | "sign-in">(intent);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(searchError === ACCOUNT_CLOSED_CODE ? ACCOUNT_CLOSED_MESSAGE : null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"credentials" | "code" | "backup">("credentials");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  // Sign-up only: "I'm 13 or older, or I have a parent's or guardian's
  // permission". The server refuses to create an account without it.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageError, setAgeError] = useState(searchError === AGE_REQUIRED_CODE);

  if (isPending) {
    return (
      <Shell>
        <div className="mx-auto h-40 max-w-md animate-pulse rounded-2xl bg-paper-2" />
      </Shell>
    );
  }
  if (user) return <RedirectToSignIn to={next} />;

  /** Creating an account needs the age box; false (and points to it) when unticked. */
  function ageReady(): boolean {
    if (mode !== "register" || ageConfirmed) return true;
    setAgeError(true);
    document.getElementById("age-confirm")?.focus();
    return false;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "register" && name.trim().length < 1) {
      setError("Add your name.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (!ageReady()) return;
    setBusy(true);
    try {
      const fetchOptions = {
        onSuccess(ctx: { response: Response }) {
          captureBearer(ctx.response);
        },
      };
      const result =
        mode === "register"
          ? await authClient.signUp.email({
              name: name.trim(),
              email: email.trim(),
              password,
              // Not a user field: read and enforced by age.server.ts.
              ...({ ageConfirmed } as object),
              fetchOptions,
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
              fetchOptions: {
                onSuccess(ctx) {
                  const data = ctx.data as { twoFactorRedirect?: boolean } | undefined;
                  if (data?.twoFactorRedirect) return;
                  captureBearer(ctx.response);
                },
              },
            });
      if (result.error) {
        if (result.error.code === AGE_REQUIRED_CODE) setAgeError(true);
        else setError(result.error.message || "That did not work. Try again.");
        setBusy(false);
        return;
      }
      if (
        mode === "sign-in" &&
        result.data &&
        "twoFactorRedirect" in result.data &&
        result.data.twoFactorRedirect
      ) {
        setStep("code");
        setCode("");
        setBusy(false);
        return;
      }
      await authClient.getSession();
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Try again.");
      setBusy(false);
    }
  }

  async function onCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (step === "code" && !/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your authenticator.");
      return;
    }
    if (step === "backup" && trimmed.length < 6) {
      setError("Enter a backup code.");
      return;
    }
    setBusy(true);
    try {
      const fetchOptions = {
        onSuccess(ctx: { response: Response }) {
          captureBearer(ctx.response);
        },
      };
      const result =
        step === "backup"
          ? await authClient.twoFactor.verifyBackupCode({ code: trimmed, trustDevice, fetchOptions })
          : await authClient.twoFactor.verifyTotp({ code: trimmed, trustDevice, fetchOptions });
      if (result.error) {
        setError(result.error.message || "That code was not accepted.");
        setBusy(false);
        return;
      }
      await authClient.getSession();
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code was not accepted.");
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-4xl tracking-tight text-balance">
          {step !== "credentials" ? "Check your authenticator" : mode === "register" ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-3 text-pretty text-muted">
          {step === "code"
            ? "Enter the 6-digit code from the app you set up for Midnry."
            : step === "backup"
              ? "Enter one backup code. Each code works once."
              : mode === "register"
                ? "Your apps save your work to your account, so it’s there on your phone and your computer. Free apps open as soon as the account exists. No card needed."
                : "Welcome back. Sign in to pick up where you left off."}
        </p>
        {step === "credentials" && next.startsWith("/apps/") && next.length > 6 ? (
          <p className="mt-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm text-pretty text-ink-soft">
            {mode === "register" ? "Once your account is ready" : "Once you’re signed in"}, we’ll take you straight to{" "}
            {getApp(next.slice(6).split(/[?#]/)[0])?.name ?? "the app you chose"}.
          </p>
        ) : step === "credentials" && next === "/billing" ? (
          <p className="mt-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm text-pretty text-ink-soft">
            Next, you’ll go to Billing to start Midnry Pass. You pay on Paystack’s checkout page.
          </p>
        ) : null}

        {!authEnabled ? (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        ) : step !== "credentials" ? (
          <form onSubmit={onCode} className="mt-8 space-y-4">
            <Field label={step === "backup" ? "Backup code" : "Authenticator code"}>
              <TextInput
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                inputMode={step === "code" ? "numeric" : "text"}
                autoFocus
                required
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                className="size-4 accent-ink"
              />
              Trust this browser for 30 days
            </label>
            {error ? (
              <p role="alert" className="text-sm text-fail">
                {error}
              </p>
            ) : null}
            <Button type="submit" tone="primary" className="w-full" disabled={busy}>
              {busy ? "Checking…" : "Continue"}
            </Button>
            <button
              type="button"
              className="min-h-11 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
              onClick={() => {
                setStep(step === "code" ? "backup" : "code");
                setCode("");
                setError(null);
              }}
            >
              {step === "code" ? "Use a backup code" : "Use an authenticator code"}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {mode === "register" ? (
                <Field label="Name">
                  <TextInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </Field>
              ) : null}
              <Field label="Email">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Password" hint="At least 8 characters.">
                <TextInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
              </Field>
              {mode === "register" ? (
                <div>
                  <label className="-mx-2 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 text-sm text-pretty">
                    <input
                      id="age-confirm"
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => {
                        setAgeConfirmed(e.target.checked);
                        if (e.target.checked) setAgeError(false);
                      }}
                      aria-required="true"
                      aria-invalid={ageError || undefined}
                      aria-describedby={ageError ? "age-confirm-error" : undefined}
                      className="mt-0.5 size-5 shrink-0 accent-ink"
                    />
                    <span>{AGE_SIGNUP_LABEL}</span>
                  </label>
                  {ageError ? (
                    <p id="age-confirm-error" role="alert" className="text-sm text-pretty text-fail">
                      {AGE_SIGNUP_MESSAGE}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {error ? (
                <p role="alert" className="text-sm text-fail">
                  {error}
                </p>
              ) : null}
              <Button type="submit" tone="primary" className="w-full" disabled={busy}>
                {busy ? "Working…" : mode === "register" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <button
              type="button"
              className="mt-4 min-h-11 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
              onClick={() => {
                setMode(mode === "register" ? "sign-in" : "register");
                setError(null);
                setAgeError(false);
              }}
            >
              {mode === "register" ? "Already have an account? Sign in" : "Need an account? Register"}
            </button>

            {showGoogle || brokerProviders.length > 0 ? (
              <div className="my-6 flex items-center gap-3 text-sm text-muted">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
            ) : null}
            <div className="space-y-2">
              {showGoogle ? (
                <Button
                  tone="quiet"
                  className="w-full"
                  onClick={() => {
                    setError(null);
                    if (!ageReady()) return;
                    // A new Google account is created on the callback; the
                    // confirmation rides in Better Auth's signed OAuth state.
                    void authClient.signIn
                      .social({
                        provider: "google",
                        callbackURL: next,
                        errorCallbackURL: "/login",
                        ...(mode === "register" && ageConfirmed ? { additionalData: { ageConfirmed: true } } : {}),
                      })
                      .then((result) => {
                        if (result.error) setError(result.error.message || "Google sign-in did not start. Try again.");
                      })
                      .catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Google sign-in did not start. Try again.");
                      });
                  }}
                >
                  Continue with Google
                </Button>
              ) : null}
              {brokerProviders.map((provider) => (
                <Button
                  key={provider.providerId}
                  tone="quiet"
                  className="w-full"
                  onClick={() => {
                    setError(null);
                    if (!ageReady()) return;
                    void signIn(provider.providerId, {
                      callbackURL: next,
                      errorCallbackURL: "/login",
                      ageConfirmed: mode === "register" && ageConfirmed,
                    }).catch((err: unknown) => {
                      if (err instanceof Error && err.message === AGE_REQUIRED_CODE) {
                        setMode("register");
                        setAgeError(true);
                        return;
                      }
                      setError(err instanceof Error ? err.message : "Sign-in failed");
                    });
                  }}
                >
                  Continue with {provider.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
