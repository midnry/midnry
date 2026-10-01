import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { Shell } from "@/components/shell";
import { Button, Field, Skeleton, TextInput } from "@/components/ui";

export const Route = createFileRoute("/security")({
  head: () => ({ meta: [{ title: "Security — Midnry" }] }),
  component: SecurityPage,
});

function secretFromUri(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function SecurityPage() {
  const { user, isPending } = useCurrentUserState();
  const session = authClient.useSession();
  const enabled = Boolean(
    session.data?.user &&
      "twoFactorEnabled" in session.data.user &&
      session.data.user.twoFactorEnabled,
  );
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!uri) {
      setQr(null);
      return;
    }
    let cancel = false;
    QRCode.toDataURL(uri, { margin: 1, width: 196, color: { dark: "#1c1915", light: "#f3efe6" } })
      .then((url) => {
        if (!cancel) setQr(url);
      })
      .catch(() => {
        if (!cancel) setQr(null);
      });
    return () => {
      cancel = true;
    };
  }, [uri]);

  if (isPending || (user && session.isPending)) {
    return (
      <Shell>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-40 w-full max-w-xl" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;

  async function startSetup(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Enter the password for this account.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error || !result.data?.totpURI) {
        setError(
          result.error?.message ||
            "That password was not accepted. Google and X sign-in does not use this step.",
        );
        setBusy(false);
        return;
      }
      setUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setConfirmed(false);
      setCode("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from the app.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: trimmed });
      if (result.error) {
        setError(result.error.message || "That code was not accepted.");
        setBusy(false);
        return;
      }
      setConfirmed(true);
      setUri(null);
      setCode("");
      await authClient.getSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Enter your password to turn this off.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        setError(result.error.message || "Could not turn two-factor off.");
        setBusy(false);
        return;
      }
      setPassword("");
      setBackupCodes(null);
      setConfirmed(false);
      await authClient.getSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not turn two-factor off.");
    } finally {
      setBusy(false);
    }
  }

  const secret = uri ? secretFromUri(uri) : "";

  return (
    <Shell>
      <p className="text-sm text-muted">
        <Link to="/apps" className="hover:text-ink">
          Desk
        </Link>
        <span aria-hidden> / </span>
        Security
      </p>
      <h1 className="mt-3 font-display text-5xl tracking-tight">Two-factor</h1>
      <p className="mt-3 max-w-xl text-pretty text-muted">
        After email and password, Midnry asks for a code from an authenticator app. Google and X keep
        their own sign-in checks and do not stop here.
      </p>

      {enabled ? (
        <div className="mt-8 max-w-md space-y-6">
          {backupCodes ? (
            <div>
              <p className="text-sm text-pine">On. Keep these backup codes. They will not be shown again.</p>
              <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
                {backupCodes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-pine">On. Sign-in with email asks for a code.</p>
          )}
          <form onSubmit={turnOff} className="space-y-4">
          <Field label="Password" hint="Required to turn this off.">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-fail">
              {error}
            </p>
          ) : null}
          <Button type="submit" tone="quiet" disabled={busy}>
            {busy ? "Working…" : "Turn off"}
          </Button>
          </form>
        </div>
      ) : uri ? (
        <form onSubmit={confirmCode} className="mt-8 max-w-md space-y-4">
          <p className="text-sm text-pretty text-muted">
            Add Midnry in your authenticator, then enter one code. It stays off until this matches.
          </p>
          {qr ? (
            <img
              src={qr}
              alt="Setup code for an authenticator app"
              width={196}
              height={196}
              className="border border-line bg-paper"
            />
          ) : null}
          {secret ? (
            <p className="break-all font-mono text-sm">
              <span className="text-muted">Key </span>
              {secret}
            </p>
          ) : null}
          {backupCodes ? (
            <div>
              <p className="text-sm text-muted">Save these backup codes. They are shown once.</p>
              <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
                {backupCodes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Field label="Code from the app">
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-fail">
              {error}
            </p>
          ) : null}
          <Button type="submit" tone="primary" disabled={busy}>
            {busy ? "Checking…" : "Turn on"}
          </Button>
        </form>
      ) : (
        <form onSubmit={startSetup} className="mt-8 max-w-md space-y-4">
          {confirmed && backupCodes ? (
            <div>
              <p className="text-sm text-pine">On. Keep these backup codes. They will not be shown again.</p>
              <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
                {backupCodes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted">Off.</p>
          )}
          <Field label="Password" hint="The password for this email account.">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-fail">
              {error}
            </p>
          ) : null}
          <Button type="submit" tone="primary" disabled={busy}>
            {busy ? "Working…" : "Set up authenticator"}
          </Button>
        </form>
      )}
    </Shell>
  );
}
