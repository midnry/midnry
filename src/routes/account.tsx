import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { removeAvatar, saveAvatar } from "@/lib/profile.functions";
import { useAccount } from "@/components/account";
import { Shell } from "@/components/shell";
import { TwoFactorPanel } from "@/components/two-factor";
import { Button, Field, Skeleton, TextInput } from "@/components/ui";
import { formatWhen } from "@/lib/format";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — Midnry" }] }),
  component: AccountPage,
});

const AVATAR_SIZE = 256;
const MAX_NAME = 60;

async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-3xl bg-card p-6 shadow-line sm:p-8">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Avatar({ src, label, size }: { src: string | null; label: string; size: string }) {
  return src ? (
    <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      aria-hidden
      className={`${size} grid shrink-0 place-items-center rounded-full bg-pine/10 font-display text-3xl text-pine`}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

function AccountPage() {
  const { user, isPending } = useCurrentUserState();
  const session = authClient.useSession();
  const { account } = useAccount();
  const [providers, setProviders] = useState<string[] | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<"upload" | "remove" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    authClient
      .listAccounts()
      .then((result) => {
        if (cancel) return;
        setProviders(result.data ? result.data.map((item) => item.providerId) : []);
      })
      .catch(() => {
        if (!cancel) setProviders([]);
      });
    return () => {
      cancel = true;
    };
  }, [userId]);

  const currentName = user?.displayName ?? "";
  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  useEffect(() => {
    if (!user || window.location.hash !== "#security") return;
    document.getElementById("security")?.scrollIntoView();
  }, [user, providers]);

  if (isPending || (user && session.isPending)) {
    return (
      <Shell>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-8 h-56 w-full max-w-2xl" />
        <Skeleton className="mt-6 h-40 w-full max-w-2xl" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;

  const label = user.displayName || user.primaryEmail || "You";
  const twoFactorOn = Boolean(
    session.data?.user && "twoFactorEnabled" in session.data.user && session.data.user.twoFactorEnabled,
  );
  const hasPassword = providers?.includes("credential") ?? false;
  const signInMethod = providers
    ? providers.includes("google")
      ? hasPassword
        ? "Google or email and password"
        : "Google"
      : "Email and password"
    : null;
  const trimmedName = name.trim();
  const nameChanged = trimmedName !== currentName;

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmedName) {
      toast.error("Your name can't be empty.");
      return;
    }
    setSavingName(true);
    try {
      const result = await authClient.updateUser({ name: trimmedName });
      if (result.error) throw new Error(result.error.message);
      toast.success("Name saved.");
    } catch {
      toast.error("Couldn't save your name. Try again.");
    } finally {
      setSavingName(false);
    }
  }

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick a photo file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("That photo is over 15 MB. Pick a smaller one.");
      return;
    }
    setPhotoBusy("upload");
    try {
      let dataUrl: string;
      try {
        dataUrl = await toAvatarDataUrl(file);
      } catch {
        toast.error("That photo couldn't be opened. Try a JPG or PNG.");
        return;
      }
      const { url } = await saveAvatar({ data: dataUrl });
      const result = await authClient.updateUser({ image: url });
      if (result.error) throw new Error(result.error.message);
      toast.success("Photo updated.");
    } catch {
      toast.error("Couldn't update your photo. Try again.");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function clearPhoto() {
    setPhotoBusy("remove");
    try {
      const result = await authClient.updateUser({ image: null });
      if (result.error) throw new Error(result.error.message);
      await removeAvatar().catch(() => undefined);
      toast.success("Photo removed.");
    } catch {
      toast.error("Couldn't remove your photo. Try again.");
    } finally {
      setPhotoBusy(null);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">Account</h1>

      <div className="mt-8 max-w-2xl space-y-6">
        <Section title="Profile">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar src={user.profileImageUrl} label={label} size="size-20" />
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => void pickPhoto(e)}
              />
              <Button tone="quiet" disabled={photoBusy !== null} onClick={() => fileInput.current?.click()}>
                {photoBusy === "upload" ? "Uploading…" : user.profileImageUrl ? "Change photo" : "Add photo"}
              </Button>
              {user.profileImageUrl ? (
                <Button tone="quiet" disabled={photoBusy !== null} onClick={() => void clearPhoto()}>
                  {photoBusy === "remove" ? "Removing…" : "Remove"}
                </Button>
              ) : null}
            </div>
          </div>

          <form onSubmit={saveName} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Name">
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
                  autoComplete="name"
                  maxLength={MAX_NAME}
                  required
                />
              </Field>
            </div>
            <Button type="submit" tone="primary" disabled={!nameChanged || !trimmedName || savingName}>
              {savingName ? "Saving…" : "Save"}
            </Button>
          </form>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="mt-0.5 break-all font-medium">{user.primaryEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Signs in with</dt>
              <dd className="mt-0.5 font-medium">{signInMethod ?? "…"}</dd>
            </div>
          </dl>
        </Section>

        <Section id="security" title="Two-step verification">
          {providers === null ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <TwoFactorPanel hasPassword={hasPassword} enabled={twoFactorOn} />
          )}
        </Section>

        <Section title="Midnry Pass">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">
              {account?.hasPass
                ? account.status === "canceled" && account.currentPeriodEnd
                  ? `Active until ${formatWhen(account.currentPeriodEnd)}.`
                  : account.currentPeriodEnd
                    ? `Active · renews ${formatWhen(account.currentPeriodEnd)}.`
                    : "Active."
                : "Not active. Free apps stay open."}
            </p>
            <Link
              to="/billing"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-card px-5 text-sm font-medium text-ink shadow-line hover:bg-paper-2"
            >
              {account?.hasPass ? "Manage billing" : "Get the pass"}
            </Link>
          </div>
        </Section>
      </div>
    </Shell>
  );
}
