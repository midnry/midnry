import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button, TextInput } from "@/components/ui";
import { revokeStudyShare, shareStudyItem } from "@/lib/study.functions";
import type { ShareInfo } from "@/lib/study-shares.server";
import type { Deck, Quiz, ShareKind } from "@/lib/study";
import { ConfirmButton, CopyButton, Panel, prettyDate } from "@/components/tools/study/parts";

export type Shares = { canShare: boolean | null; list: ShareInfo[]; failed: boolean };

export function shareUrl(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/study/shared/${token}`;
}

/** Share one deck or quiz with a group (Midnry Pass). Opening a link is free for anyone signed in. */
export function SharePanel({
  kind,
  item,
  shares,
  onChange,
}: {
  kind: ShareKind;
  item: Deck | Quiz;
  shares: Shares;
  onChange: (list: ShareInfo[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const share = shares.list.find((entry) => entry.kind === kind && entry.itemId === item.id);
  const noun = kind === "deck" ? "deck" : "quiz";

  async function make() {
    setBusy(true);
    try {
      const result = await shareStudyItem({ data: { kind, item } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const now = new Date().toISOString();
      const entry: ShareInfo = { token: result.token, kind, itemId: item.id, title: item.title.trim() || `Untitled ${noun}`, createdAt: share?.createdAt ?? now, updatedAt: now };
      onChange([entry, ...shares.list.filter((other) => other.token !== result.token)]);
      toast.success(result.updated ? "The shared copy now matches this version." : "Share link made. Copy it and send it to your group.");
    } catch {
      toast.error("Could not make the link. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(token: string) {
    setBusy(true);
    try {
      await revokeStudyShare({ data: token });
      onChange(shares.list.filter((entry) => entry.token !== token));
      toast.success("Link turned off. It no longer opens for anyone.");
    } catch {
      toast.error("Could not turn the link off. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="mt-6" >
      <div data-share-panel>
        <h3 className="font-medium">Share with a class or study group</h3>
        {shares.canShare === null ? (
          <p className="mt-2 text-sm text-muted">{shares.failed ? "Sharing isn't available right now." : "Checking…"}</p>
        ) : share ? (
          <div className="mt-3">
            <p className="text-sm text-muted">
              Anyone signed in to Midnry who has this link can see a copy of this {noun} and save it to their own Study space, until you turn the link off.
              Changes you make here reach the link only when you press Update the shared copy.
            </p>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-muted">Share link</span>
              <TextInput readOnly value={shareUrl(share.token)} onFocus={(event) => event.currentTarget.select()} data-share-link />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CopyButton text={shareUrl(share.token)} label="Copy link" />
              {shares.canShare ? (
                <Button tone="quiet" disabled={busy} onClick={() => void make()}>
                  Update the shared copy
                </Button>
              ) : null}
              <ConfirmButton label="Turn off link" question="Turn this link off for everyone?" disabled={busy} onConfirm={() => void revoke(share.token)} />
            </div>
            <p className="mt-2 text-xs text-muted">Shared on {prettyDate(share.createdAt)}{share.updatedAt && share.updatedAt !== share.createdAt ? `, updated ${prettyDate(share.updatedAt)}` : ""}.</p>
          </div>
        ) : shares.canShare ? (
          <div className="mt-2">
            <p className="text-sm text-muted">
              Make a read-only link to a copy of this {noun}. Anyone signed in to Midnry who has the link can see it and save it to their own Study space. You can
              turn the link off at any time.
            </p>
            <Button className="mt-3" disabled={busy} onClick={() => void make()}>
              Make a share link
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-pretty text-muted" data-share-locked>
            Making a share link needs{" "}
            <Link to="/billing" className="font-medium text-ink underline underline-offset-2">
              Midnry Pass
            </Link>
            . Everything else in the Study space is free, and opening a link someone sends you is free too.
          </p>
        )}
      </div>
    </Panel>
  );
}

/** Your links, so you can turn any of them off. */
export function ShareList({ shares, onChange }: { shares: Shares; onChange: (list: ShareInfo[]) => void }) {
  const [busy, setBusy] = useState(false);
  if (shares.list.length === 0) return null;
  return (
    <section className="mt-10" aria-labelledby="study-links">
      <h2 id="study-links" className="font-display text-2xl tracking-tight">
        Your share links
      </h2>
      <ul className="mt-3 space-y-2">
        {shares.list.map((share) => (
          <li key={share.token} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-3 text-sm shadow-line">
            <span className="min-w-0 break-words">
              <span className="font-medium">{share.title}</span> <span className="text-muted">({share.kind})</span>
            </span>
            <span className="flex flex-wrap gap-2">
              <CopyButton text={shareUrl(share.token)} label="Copy link" />
              <ConfirmButton
                label="Turn off"
                question="Turn this link off?"
                disabled={busy}
                onConfirm={() => {
                  setBusy(true);
                  void revokeStudyShare({ data: share.token })
                    .then(() => onChange(shares.list.filter((entry) => entry.token !== share.token)))
                    .catch(() => toast.error("Could not turn the link off. Try again in a minute."))
                    .finally(() => setBusy(false));
                }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
