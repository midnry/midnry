import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  cancelInvite,
  deleteShared,
  getEmailPrefs,
  getFeed,
  sendTestEmail,
  setEmailPrefs,
  type EmailPrefs,
  inviteMember,
  leaveShared,
  removeMember,
  renameShared,
  setFeed,
  type SharedProject,
} from "@/lib/remind.functions";
import type { DueFilter, Filter, Priority } from "@/lib/remind/model";
import { Button, TextInput, cn, fieldClass } from "@/components/ui";
import { PRIORITY_STYLE } from "./items";

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  return image ? (
    <img src={image} alt="" className="size-8 rounded-full object-cover" />
  ) : (
    <span aria-hidden className="grid size-8 place-items-center rounded-full bg-pine/10 text-sm font-medium text-pine">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function PeoplePanel({
  project,
  me,
  canShare,
  onChanged,
  onGone,
}: {
  project: SharedProject;
  me: string;
  canShare: boolean;
  onChanged: () => Promise<void>;
  onGone: () => void;
}) {
  const owner = project.role === "owner";
  const [email, setEmail] = useState("");
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => setName(project.name), [project.name]);

  async function run(action: () => Promise<unknown>, done: string, fallback: string) {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      await onChanged();
    } catch (error) {
      toast.error(errorText(error, fallback));
    } finally {
      setBusy(false);
    }
  }

  function invite(event: FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    inviteMember({ data: { projectId: project.id, email: value } })
      .then(async (result) => {
        toast.success(result.emailed ? `Invited ${value}. We've emailed them.` : `Invited ${value}.`);
        setEmail("");
        await onChanged();
      })
      .catch((error: unknown) => toast.error(errorText(error, "Couldn't send the invite.")))
      .finally(() => setBusy(false));
  }

  return (
    <section className="mt-4 space-y-4 rounded-2xl bg-card p-5 shadow-line">
      <div>
        <h3 className="font-medium">People</h3>
        <ul className="mt-2 divide-y divide-line">
          {project.members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3 py-2">
              <Avatar name={member.name} image={member.image} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {member.name}
                  {member.userId === me ? " (you)" : ""}
                </span>
                <span className="block truncate text-xs text-muted">{member.role === "owner" ? "Owner" : member.email}</span>
              </span>
              {owner && member.userId !== me ? (
                <button
                  type="button"
                  className="min-h-11 px-2 text-xs text-muted hover:text-fail"
                  disabled={busy}
                  onClick={() => void run(() => removeMember({ data: { projectId: project.id, userId: member.userId } }), "Removed.", "Couldn't remove them.")}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
          {project.invites.map((invited) => (
            <li key={invited} className="flex items-center gap-3 py-2">
              <span aria-hidden className="grid size-8 place-items-center rounded-full bg-paper-2 text-sm text-muted">
                ✉
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{invited}</span>
                <span className="block text-xs text-muted">Invited. They'll see a Join button in Remind when they sign in with this email.</span>
              </span>
              <button
                type="button"
                className="min-h-11 px-2 text-xs text-muted hover:text-fail"
                disabled={busy}
                onClick={() => void run(() => cancelInvite({ data: { projectId: project.id, email: invited } }), "Invite cancelled.", "Couldn't cancel it.")}
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      </div>

      {owner ? (
        canShare ? (
          <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row">
            <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Their email address" aria-label="Email to invite" />
            <Button type="submit" tone="primary" disabled={busy || !email.trim()}>
              Invite
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted">
            Inviting people needs{" "}
            <Link to="/billing" className="text-ink underline underline-offset-4">
              Midnry Pass
            </Link>
            .
          </p>
        )
      ) : null}

      {owner ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim() && name.trim() !== project.name) {
              void run(() => renameShared({ data: { projectId: project.id, name } }), "Renamed.", "Couldn't rename it.");
            }
          }}
        >
          <TextInput value={name} onChange={(event) => setName(event.target.value)} aria-label="Project name" />
          <Button type="submit" tone="quiet" disabled={busy || !name.trim() || name.trim() === project.name}>
            Rename
          </Button>
        </form>
      ) : null}

      <div className="border-t border-line pt-4">
        {confirm ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">{owner ? "Delete this project for everyone?" : "Leave this project?"}</span>
            <Button
              tone="primary"
              className="bg-fail"
              disabled={busy}
              onClick={() =>
                void run(
                  () => (owner ? deleteShared({ data: { projectId: project.id } }) : leaveShared({ data: { projectId: project.id } })),
                  owner ? "Project deleted." : "You left the project.",
                  "That didn't work.",
                ).then(onGone)
              }
            >
              {owner ? "Delete" : "Leave"}
            </Button>
            <Button tone="quiet" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button tone="quiet" onClick={() => setConfirm(true)}>
            {owner ? "Delete project" : "Leave project"}
          </Button>
        )}
      </div>
    </section>
  );
}

export function CalendarLink() {
  const [state, setState] = useState<{ token: string | null; canShare: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    getFeed()
      .then((next) => {
        if (!cancel) setState(next);
      })
      .catch(() => {
        if (!cancel) setState({ token: null, canShare: false });
      });
    return () => {
      cancel = true;
    };
  }, []);

  const url = state?.token && typeof window !== "undefined" ? `${window.location.origin}/api/remind/calendar/${state.token}` : "";

  async function change(action: "on" | "reset" | "off") {
    setBusy(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const next = await setFeed({ data: { action, tz } });
      setState((current) => ({ canShare: current?.canShare ?? true, token: next.token }));
      if (action === "reset") toast.success("New link made. The old one has stopped working.");
    } catch (error) {
      toast.error(errorText(error, "That didn't work."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-card p-5 shadow-line">
      <h3 className="font-medium">Calendar link</h3>
      <p className="mt-1 text-sm text-pretty text-muted">
        See your dated tasks in Google Calendar, Apple Calendar or Outlook. Add the link once and it keeps itself up to date (calendars refresh it every few hours).
      </p>
      {!state ? (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      ) : !state.canShare && !state.token ? (
        <p className="mt-3 text-sm">
          The calendar link comes with{" "}
          <Link to="/billing" className="underline underline-offset-4">
            Midnry Pass
          </Link>
          .
        </p>
      ) : state.token ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={url} className={cn(fieldClass, "font-mono text-sm")} aria-label="Calendar link" onFocus={(event) => event.target.select()} />
            <Button
              tone="primary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(url)
                  .then(() => toast.success("Link copied."))
                  .catch(() => toast.error("Couldn't copy. Select the link and copy it."));
              }}
            >
              Copy
            </Button>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>
              <strong className="text-ink">Google Calendar:</strong> on a computer, open Settings → Add calendar → From URL, and paste the link.
            </li>
            <li>
              <strong className="text-ink">iPhone:</strong> Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar.
            </li>
            <li>Keep the link private. Anyone with it can see your task titles.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button tone="quiet" disabled={busy} onClick={() => void change("reset")}>
              Make a new link
            </Button>
            <Button tone="quiet" disabled={busy} onClick={() => void change("off")}>
              Turn off
            </Button>
          </div>
        </div>
      ) : (
        <Button tone="primary" className="mt-3" disabled={busy} onClick={() => void change("on")}>
          {busy ? "Making link…" : "Get my calendar link"}
        </Button>
      )}
    </section>
  );
}

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: "any", label: "Any date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today and overdue" },
  { value: "week", label: "Next 7 days" },
  { value: "dated", label: "Has a date" },
  { value: "none", label: "No date" },
];

export function FilterEditor({
  initial,
  labels,
  projects,
  hasShared,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Filter;
  labels: string[];
  projects: { key: string; name: string }[];
  hasShared: boolean;
  onSave: (filter: Filter) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [filter, setFilter] = useState<Filter>(initial);
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  return (
    <form
      className="mt-4 space-y-4 rounded-2xl bg-card p-5 shadow-line"
      onSubmit={(event) => {
        event.preventDefault();
        if (filter.name.trim()) onSave({ ...filter, name: filter.name.trim().slice(0, 40) });
      }}
    >
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Filter name</span>
        <TextInput value={filter.name} onChange={(event) => setFilter({ ...filter, name: event.target.value })} placeholder="e.g. Urgent at home" required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Due</span>
        <select className={fieldClass} value={filter.due} onChange={(event) => setFilter({ ...filter, due: event.target.value as DueFilter })}>
          {DUE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Priority (any if none picked)</legend>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4] as Priority[]).map((priority) => (
            <button
              key={priority}
              type="button"
              aria-pressed={filter.priorities.includes(priority)}
              onClick={() => setFilter({ ...filter, priorities: toggle(filter.priorities, priority) })}
              className={cn("inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm", filter.priorities.includes(priority) ? "bg-ink text-paper" : "bg-paper shadow-line")}
            >
              <span aria-hidden className={cn("size-2.5 rounded-full", PRIORITY_STYLE[priority].fill)} />P{priority}
            </button>
          ))}
        </div>
      </fieldset>
      {labels.length ? (
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Labels (any of)</legend>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <button
                key={label}
                type="button"
                aria-pressed={filter.labels.includes(label)}
                onClick={() => setFilter({ ...filter, labels: toggle(filter.labels, label) })}
                className={cn("h-9 rounded-full px-3 text-sm", filter.labels.includes(label) ? "bg-pine text-paper" : "bg-paper shadow-line")}
              >
                @{label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Projects (all if none picked)</legend>
        <div className="flex flex-wrap gap-2">
          {projects.map((project) => (
            <button
              key={project.key}
              type="button"
              aria-pressed={filter.projects.includes(project.key)}
              onClick={() => setFilter({ ...filter, projects: toggle(filter.projects, project.key) })}
              className={cn("h-9 rounded-full px-3 text-sm", filter.projects.includes(project.key) ? "bg-pine text-paper" : "bg-paper shadow-line")}
            >
              {project.name}
            </button>
          ))}
        </div>
      </fieldset>
      {hasShared ? (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Assigned</span>
          <select className={fieldClass} value={filter.assignee} onChange={(event) => setFilter({ ...filter, assignee: event.target.value as Filter["assignee"] })}>
            <option value="any">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Not assigned</option>
          </select>
        </label>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Words in the task</span>
        <TextInput value={filter.query} onChange={(event) => setFilter({ ...filter, query: event.target.value.slice(0, 80) })} placeholder="Optional" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" tone="primary" disabled={!filter.name.trim()}>
          Save filter
        </Button>
        <Button tone="quiet" onClick={onCancel}>
          Cancel
        </Button>
        {onDelete ? (
          <Button tone="quiet" onClick={onDelete}>
            Delete filter
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Toggle({ on, disabled, onChange, label, detail }: { on: boolean; disabled?: boolean; onChange: (next: boolean) => void; label: string; detail: ReactNode }) {
  return (
    <label className={cn("flex items-start justify-between gap-4 py-3", disabled && "opacity-60")}>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-sm text-muted">{detail}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={on} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        <span aria-hidden className="h-7 w-12 rounded-full bg-paper-2 transition-colors peer-checked:bg-pine peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink" />
        <span aria-hidden className="absolute left-1 top-1 size-5 rounded-full bg-card shadow-line transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function EmailSettings() {
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    getEmailPrefs()
      .then((next) => {
        if (!cancel) setPrefs(next);
      })
      .catch(() => {
        if (!cancel) setPrefs(null);
      });
    return () => {
      cancel = true;
    };
  }, []);

  async function save(next: { digest: boolean; due: boolean }) {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, ...next });
    try {
      await setEmailPrefs({ data: { ...next, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
    } catch (error) {
      setPrefs(before);
      toast.error(errorText(error, "Couldn't save that."));
    }
  }

  async function test() {
    setBusy(true);
    try {
      const result = await sendTestEmail();
      toast.success(result.dryRun ? "Email isn't connected on this copy of the site, so nothing was sent." : `Test email sent to ${result.to}. Check your inbox (and spam).`);
    } catch (error) {
      toast.error(errorText(error, "The test email didn't send."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-card p-5 shadow-line">
      <h3 className="font-medium">Email</h3>
      {!prefs ? (
        <p className="mt-2 text-sm text-muted">Loading…</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">{prefs.email ? `Emails go to ${prefs.email}.` : "Your account has no email address."}</p>
          <div className="mt-2 divide-y divide-line">
            <Toggle
              on={prefs.digest}
              disabled={!prefs.email}
              onChange={(digest) => void save({ digest, due: prefs.due })}
              label="Morning summary"
              detail="At about 7am, what's due today and anything overdue. Skipped on days with nothing due."
            />
            <Toggle
              on={prefs.due}
              disabled={!prefs.email || !prefs.canDue}
              onChange={(due) => void save({ digest: prefs.digest, due })}
              label="Reminder at the task's time"
              detail={
                prefs.canDue ? (
                  "For tasks with a time, an email when they're due. Works even when Midnry is closed."
                ) : (
                  <>
                    Comes with{" "}
                    <Link to="/billing" className="text-ink underline underline-offset-4">
                      Midnry Pass
                    </Link>
                    .
                  </>
                )
              }
            />
          </div>
          <Button tone="quiet" className="mt-3" disabled={busy || !prefs.email} onClick={() => void test()}>
            {busy ? "Sending…" : "Send me a test email"}
          </Button>
        </>
      )}
    </section>
  );
}
