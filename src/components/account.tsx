import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { getAccount } from "@/lib/cove.functions";
import { closeAccount } from "@/lib/account-closure.functions";
import { ACCOUNT_CLOSED_CODE, CLOSE_CONFIRM_WORD } from "@/lib/account-closed";
import type { AccountState } from "@/lib/access";
import { Button, Field, TextInput } from "@/components/ui";

type AccountContextValue = {
  account: AccountState | null;
  loading: boolean;
  refresh: () => Promise<AccountState | null>;
  apply: (next: AccountState) => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [account, setAccount] = useState<AccountState | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getAccount();
    setAccount(next);
    return next;
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setAccount(null);
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    getAccount()
      .then((next) => {
        if (!cancel) setAccount(next);
      })
      .catch(() => {
        if (!cancel) setAccount(null);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [user?.id, isPending]);

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      loading: isPending || (!!user && loading),
      refresh,
      apply: setAccount,
    }),
    [account, isPending, user, loading, refresh],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

// ── Delete account ───────────────────────────────────────────────────────────

/**
 * The "Delete account" section at the bottom of /account. Closing is done by
 * the `closeAccount` server function, always for the signed-in account; this
 * component only collects the typed confirmation (and the password, when the
 * account has one).
 */
export function DeleteAccountSection({ hasPassword }: { hasPassword: boolean | null }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ reason: string; message: string } | null>(null);

  const ready = confirm.trim() === CLOSE_CONFIRM_WORD && (!hasPassword || password.length > 0);

  function reset() {
    setConfirm("");
    setPassword("");
    setProblem(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const result = await closeAccount({ data: { confirm, password: hasPassword ? password : undefined } });
      if (!result.ok) {
        setProblem({ reason: result.reason, message: result.message });
        if (result.reason === "password") setPassword("");
        setBusy(false);
        return;
      }
      // The server has already revoked every session; this clears this
      // browser's cookie and shows the closed-account message on sign-in.
      const after = `/login?intent=sign-in&error=${ACCOUNT_CLOSED_CODE}`;
      await signOut(after).catch(() => {
        window.location.href = after;
      });
    } catch {
      setProblem({ reason: "error", message: "Something went wrong, and your account is still open. Try again." });
      setBusy(false);
    }
  }

  return (
    <section
      id="delete"
      aria-labelledby="delete-account-title"
      className="scroll-mt-6 rounded-3xl border border-fail/30 bg-card p-6 sm:p-8"
    >
      <h2 id="delete-account-title" className="font-display text-2xl tracking-tight">
        Delete account
      </h2>
      <p className="mt-3 text-sm">Close your Midnry account. Here's what happens:</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
        <li>Your Midnry Pass renewal is cancelled, and unused Pass time isn't refunded.</li>
        <li>Outpost Zero store items are lost.</li>
        <li>Your data is kept for 30 days, then permanently deleted.</li>
        <li>
          To restore the account within 30 days, email{" "}
          <a href="mailto:hello@midnry.com" className="font-medium text-ink underline underline-offset-4">
            hello@midnry.com
          </a>
          .
        </li>
      </ul>

      <AlertDialog.Root
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          setOpen(next);
          if (!next) reset();
        }}
      >
        <AlertDialog.Trigger asChild>
          <Button className="mt-6 bg-fail text-white" disabled={hasPassword === null}>
            Delete my account
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
          <AlertDialog.Content
            onEscapeKeyDown={(event) => {
              if (busy) event.preventDefault();
            }}
            className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-card p-6 text-ink shadow-xl sm:p-8"
          >
            <AlertDialog.Title className="font-display text-2xl tracking-tight">Delete your account?</AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-sm text-muted">
              Your Pass renewal is cancelled (no refund for unused time), Outpost Zero store items are lost, and
              you're signed out everywhere. Your data is deleted after 30 days unless you email hello@midnry.com
              to restore it.
            </AlertDialog.Description>

            <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
              <Field label={`Type ${CLOSE_CONFIRM_WORD} to confirm`}>
                <TextInput
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={problem?.reason === "confirm" || undefined}
                />
              </Field>
              {hasPassword ? (
                <Field label="Your password">
                  <TextInput
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    aria-invalid={problem?.reason === "password" || undefined}
                  />
                </Field>
              ) : null}

              {problem ? (
                <div role="alert" className="text-sm text-fail">
                  <p>{problem.message}</p>
                  {problem.reason === "stale" ? (
                    <Button
                      tone="quiet"
                      className="mt-3"
                      onClick={() => void signOut("/login?intent=sign-in&next=/account").catch(() => undefined)}
                    >
                      Sign in again
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <AlertDialog.Cancel asChild>
                  <Button tone="quiet" disabled={busy}>
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <Button type="submit" className="bg-fail text-white" disabled={!ready || busy}>
                  {busy ? "Deleting…" : "Delete my account"}
                </Button>
              </div>
            </form>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
