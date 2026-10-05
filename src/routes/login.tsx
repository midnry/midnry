import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { captureBearer } from "@/lib/capture-bearer";
import { Shell } from "@/components/shell";
import { Button, Field, TextInput } from "@/components/ui";
import { includedNames } from "@/lib/catalog";
import { getSignInOptions } from "@/lib/sign-in-options.functions";

type LoginSearch = { next: string; intent: "register" | "sign-in" };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const nextRaw = typeof search.next === "string" ? search.next : "";
    const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/apps";
    const intent = search.intent === "sign-in" ? "sign-in" : "register";
    return { next, intent };
  },
  loader: () => getSignInOptions(),
  component: LoginPage,
});

function LoginPage() {
  const { next, intent } = Route.useSearch();
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"credentials" | "code" | "backup">("credentials");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);

  if (isPending) {
    return (
      <Shell>
        <div className="mx-auto h-40 max-w-md animate-pulse rounded-2xl bg-paper-2" />
      </Shell>
    );
  }
  if (user) return <RedirectToSignIn to={next} />;

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
        setError(result.error.message || "That did not work. Try again.");
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
                ? `${includedNames()} open as soon as the account exists.`
                : "Welcome back. Included tools are waiting."}
        </p>

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
                    void authClient.signIn
                      .social({ provider: "google", callbackURL: next, errorCallbackURL: "/login" })
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
                    void signIn(provider.providerId, { callbackURL: next }).catch((err: unknown) => {
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
