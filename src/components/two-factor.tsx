import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button, Field, TextInput } from "@/components/ui";

type Stage = "idle" | "password" | "scan" | "codes" | "disable" | "regen";

function secretFromUri(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function friendlyError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (/invalid password/i.test(message)) return "That password isn't right.";
  if (/invalid (two factor|code|otp)|invalid code/i.test(message)) return "That code didn't match. Try the newest one.";
  if (/too many|locked/i.test(message)) return "Too many tries. Wait a few minutes and try again.";
  return message;
}

function Badge({ on }: { on: boolean }) {
  return (
    <span
      className={
        on
          ? "inline-flex items-center gap-1.5 rounded-full bg-pine/10 px-3 py-1 text-sm font-medium text-pine"
          : "inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1 text-sm font-medium text-muted"
      }
    >
      <span aria-hidden className={on ? "size-2 rounded-full bg-pine" : "size-2 rounded-full bg-muted"} />
      {on ? "On" : "Off"}
    </span>
  );
}

function BackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const text = codes.join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Backup codes copied.");
    } catch {
      toast.error("Couldn't copy. Select the codes and copy them instead.");
    }
  }

  function download() {
    const blob = new Blob([`Midnry backup codes\nEach code works once.\n\n${text}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "midnry-backup-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">Save your backup codes</p>
        <p className="mt-1 text-sm text-muted">
          Use one if you lose your phone. Each code works once, and you won't see them again.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-paper p-4 font-mono text-sm">
        {codes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button tone="quiet" onClick={() => void copy()}>
          Copy
        </Button>
        <Button tone="quiet" onClick={download}>
          Download
        </Button>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="size-4 accent-pine"
        />
        I've saved these codes
      </label>
      <Button tone="primary" disabled={!saved} onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

export function TwoFactorPanel({ hasPassword, enabled }: { hasPassword: boolean; enabled: boolean }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!uri) {
      setQr(null);
      return;
    }
    let cancel = false;
    QRCode.toDataURL(uri, { margin: 1, width: 200, color: { dark: "#102033", light: "#ffffff" } })
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

  function reset(next: Stage = "idle") {
    setStage(next);
    setPassword("");
    setCode("");
    setError(null);
    setShowKey(false);
    if (next === "idle") setUri(null);
  }

  if (!hasPassword) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          You sign in with Google, so Google protects this account. Turn on 2-Step Verification in your
          Google account to add a code to every sign-in.
        </p>
        <a
          href="https://myaccount.google.com/signinoptions/two-step-verification"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-card px-5 text-sm font-medium text-ink shadow-line hover:bg-paper-2"
        >
          Open Google security settings
        </a>
      </div>
    );
  }

  async function begin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!password) return setError("Enter your password.");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error || !result.data?.totpURI) {
        setError(friendlyError(result.error?.message, "Couldn't start setup. Try again."));
        return;
      }
      setUri(result.data.totpURI);
      setCodes(result.data.backupCodes);
      setPassword("");
      setCode("");
      setStage("scan");
    } catch {
      setError("Couldn't start setup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(trimmed)) return setError("Enter the 6-digit code from the app.");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: trimmed });
      if (result.error) {
        setError(friendlyError(result.error.message, "That code didn't match."));
        return;
      }
      setUri(null);
      setCode("");
      setStage("codes");
      toast.success("Two-step verification is on.");
    } catch {
      setError("That code didn't match.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!password) return setError("Enter your password.");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        setError(friendlyError(result.error.message, "Couldn't turn it off. Try again."));
        return;
      }
      reset();
      setCodes(null);
      toast.success("Two-step verification is off.");
    } catch {
      setError("Couldn't turn it off. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!password) return setError("Enter your password.");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error || !result.data?.backupCodes) {
        setError(friendlyError(result.error?.message, "Couldn't make new codes. Try again."));
        return;
      }
      setCodes(result.data.backupCodes);
      setPassword("");
      setStage("codes");
    } catch {
      setError("Couldn't make new codes. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const errorLine = error ? (
    <p role="alert" className="text-sm text-fail">
      {error}
    </p>
  ) : null;

  const passwordField = (
    <Field label="Password">
      <TextInput
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        autoFocus
        required
      />
    </Field>
  );

  if (stage === "codes" && codes) {
    return <BackupCodes codes={codes} onDone={() => reset()} />;
  }

  if (stage === "scan" && uri) {
    const secret = secretFromUri(uri);
    return (
      <form onSubmit={confirm} className="space-y-5">
        <ol className="space-y-5">
          <li>
            <p className="font-medium">1. Add Midnry to your authenticator app</p>
            <p className="mt-1 text-sm text-muted">
              Scan this with Google Authenticator, Authy, 1Password or similar.
            </p>
            {qr ? (
              <img
                src={qr}
                alt="QR code for your authenticator app"
                width={200}
                height={200}
                className="mt-3 rounded-xl border border-line bg-white p-2"
              />
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={uri}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-card px-5 text-sm font-medium text-ink shadow-line hover:bg-paper-2 sm:hidden"
              >
                Open in authenticator app
              </a>
              <Button tone="quiet" onClick={() => setShowKey((v) => !v)}>
                {showKey ? "Hide key" : "Can't scan? Enter a key"}
              </Button>
            </div>
            {showKey && secret ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="break-all rounded-lg bg-paper px-3 py-2 font-mono text-sm">{secret}</code>
                <Button
                  tone="quiet"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(secret)
                      .then(() => toast.success("Key copied."))
                      .catch(() => toast.error("Couldn't copy the key."));
                  }}
                >
                  Copy key
                </Button>
              </div>
            ) : null}
          </li>
          <li>
            <p className="font-medium">2. Enter the 6-digit code it shows</p>
            <div className="mt-3 max-w-48">
              <TextInput
                aria-label="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, "").slice(0, 7))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="text-center font-mono text-lg tracking-[0.3em]"
                required
              />
            </div>
          </li>
        </ol>
        {errorLine}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" tone="primary" disabled={busy}>
            {busy ? "Checking…" : "Turn on"}
          </Button>
          <Button tone="quiet" onClick={() => reset()} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  if (stage === "password" || stage === "disable" || stage === "regen") {
    const copy =
      stage === "password"
        ? { lead: "Confirm it's you to start setup.", action: "Continue", working: "Starting…", submit: begin }
        : stage === "disable"
          ? {
              lead: "Sign-in will only need your password after this.",
              action: "Turn off",
              working: "Turning off…",
              submit: turnOff,
            }
          : {
              lead: "Your old backup codes will stop working.",
              action: "Get new codes",
              working: "Making codes…",
              submit: regenerate,
            };
    return (
      <form onSubmit={copy.submit} className="max-w-sm space-y-4">
        <p className="text-sm text-muted">{copy.lead}</p>
        {passwordField}
        {errorLine}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" tone="primary" disabled={busy}>
            {busy ? copy.working : copy.action}
          </Button>
          <Button tone="quiet" onClick={() => reset()} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge on={enabled} />
        <p className="text-sm text-muted">
          {enabled
            ? "Signing in asks for a code from your authenticator app."
            : "Add a code from an authenticator app when you sign in."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {enabled ? (
          <>
            <Button tone="quiet" onClick={() => reset("regen")}>
              New backup codes
            </Button>
            <Button tone="quiet" onClick={() => reset("disable")}>
              Turn off
            </Button>
          </>
        ) : (
          <Button tone="primary" onClick={() => reset("password")}>
            Set up
          </Button>
        )}
      </div>
    </div>
  );
}
