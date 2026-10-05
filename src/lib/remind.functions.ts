import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { readAccount } from "@/lib/account.server";
import { readIsAdmin } from "@/lib/community.functions";
import {
  LIMITS,
  clip,
  cleanSharedDoc,
  cleanSharedTask,
  withDescendants,
  type SharedDoc,
  type SharedTask,
} from "@/lib/remind/model";

// Shared projects, file attachments and calendar links for Remind.
// Personal tasks are saved through the normal app document (app_id "tasks").

export type Member = { userId: string; name: string; email: string; image: string | null; role: "owner" | "member" };
export type SharedProject = {
  id: string;
  name: string;
  role: "owner" | "member";
  version: number;
  doc: SharedDoc;
  members: Member[];
  invites: string[];
};
export type Invitation = { projectId: string; projectName: string; invitedBy: string };
export type FileMeta = { id: string; taskId: string; projectId: string | null; name: string; mime: string; size: number; ownerId: string; createdAt: string };

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_USER_BYTES = 50 * 1024 * 1024;
const MAX_SHARED_PROJECTS = 20;
const MAX_MEMBERS = 25;

type Sql = Awaited<ReturnType<typeof getSql>>;

async function canShare(userId: string): Promise<boolean> {
  if (await readIsAdmin(userId)) return true;
  return (await readAccount(userId)).hasPass;
}

async function requirePass(userId: string, what: string): Promise<void> {
  if (!(await canShare(userId))) throw new Error(`${what} needs Midnry Pass.`);
}

async function roleIn(sql: Sql, projectId: string, userId: string): Promise<"owner" | "member" | null> {
  const rows = await sql<{ role: string }>`
    select role from remind_members where project_id = ${projectId} and user_id = ${userId}
  `;
  const role = rows[0]?.role;
  return role === "owner" ? "owner" : role === "member" ? "member" : null;
}

async function requireMember(sql: Sql, projectId: string, userId: string) {
  const role = await roleIn(sql, projectId, userId);
  if (!role) throw new Error("You're not in that project.");
  return role;
}

async function userEmail(sql: Sql, userId: string): Promise<{ name: string; email: string }> {
  const rows = await sql<{ name: string | null; email: string | null }>`select name, email from "user" where id = ${userId}`;
  return { name: rows[0]?.name?.trim() || "Someone", email: rows[0]?.email?.trim().toLowerCase() || "" };
}

function parseStored(raw: string): SharedDoc {
  try {
    return cleanSharedDoc(JSON.parse(raw));
  } catch {
    return cleanSharedDoc({});
  }
}

function newId(): string {
  return crypto.randomUUID();
}

function projectId(value: unknown): string {
  const id = typeof value === "string" ? value : "";
  if (!/^[0-9a-f-]{16,40}$/i.test(id)) throw new Error("Unknown project");
  return id;
}

// ── Reading ──────────────────────────────────────────────────────────────────

export const loadShared = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ canShare: boolean; projects: SharedProject[]; invitations: Invitation[] }> => {
    const sql = await getSql();
    const me = await userEmail(sql, context.userId);
    const rows = await sql<{ id: string; name: string; doc: string; version: number; role: string }>`
      select p.id, p.name, p.doc, p.version, m.role
      from remind_projects p
      join remind_members m on m.project_id = p.id
      where m.user_id = ${context.userId}
      order by p.created_at
    `;
    const ids = rows.map((row) => row.id);
    const members = ids.length
      ? await sql<{ project_id: string; user_id: string; role: string; name: string | null; email: string | null; image: string | null }>`
          select m.project_id, m.user_id, m.role, u.name, u.email, u.image
          from remind_members m
          join "user" u on u.id = m.user_id
          where m.project_id = any(${ids}::text[])
          order by m.joined_at
        `
      : [];
    const invites = ids.length
      ? await sql<{ project_id: string; email: string }>`
          select project_id, email from remind_invites where project_id = any(${ids}::text[]) order by created_at
        `
      : [];
    const incoming = me.email
      ? await sql<{ project_id: string; name: string; invited_by: string | null }>`
          select i.project_id, p.name, u.name as invited_by
          from remind_invites i
          join remind_projects p on p.id = i.project_id
          left join "user" u on u.id = i.invited_by
          where i.email = ${me.email}
            and not exists (
              select 1 from remind_members m where m.project_id = i.project_id and m.user_id = ${context.userId}
            )
        `
      : [];
    return {
      canShare: await canShare(context.userId),
      projects: rows.map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role === "owner" ? "owner" : "member",
        version: Number(row.version),
        doc: parseStored(row.doc),
        members: members
          .filter((member) => member.project_id === row.id)
          .map((member) => ({
            userId: member.user_id,
            name: member.name?.trim() || member.email || "Member",
            email: member.email ?? "",
            image: member.image,
            role: member.role === "owner" ? "owner" : "member",
          })),
        invites: row.role === "owner" ? invites.filter((invite) => invite.project_id === row.id).map((invite) => invite.email) : [],
      })),
      invitations: incoming.map((row) => ({ projectId: row.project_id, projectName: row.name, invitedBy: row.invited_by?.trim() || "Someone" })),
    };
  });

// ── Projects and people ──────────────────────────────────────────────────────

export const createShared = createServerFn({ method: "POST" })
  .validator((input: { name: string; doc?: unknown }) => {
    const name = clip(input?.name, 60);
    if (!name) throw new Error("Give the project a name.");
    const doc = cleanSharedDoc(input?.doc ?? {});
    return { name, doc };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requirePass(context.userId, "Sharing a project");
    const sql = await getSql();
    const owned = await sql<{ n: number }>`select count(*) as n from remind_projects where owner_id = ${context.userId}`;
    if (Number(owned[0]?.n ?? 0) >= MAX_SHARED_PROJECTS) throw new Error("Twenty shared projects is the limit.");
    const id = newId();
    const doc: SharedDoc = {
      sections: data.doc.sections,
      tasks: data.doc.tasks.map((task) => ({ ...task, createdBy: task.createdBy || context.userId, assigneeId: "" })),
    };
    await sql`
      insert into remind_projects (id, owner_id, name, doc) values (${id}, ${context.userId}, ${data.name}, ${JSON.stringify(doc)})
    `;
    await sql`insert into remind_members (project_id, user_id, role) values (${id}, ${context.userId}, 'owner')`;
    return { id };
  });

export const renameShared = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; name: string }) => {
    const name = clip(input?.name, 60);
    if (!name) throw new Error("Give the project a name.");
    return { projectId: projectId(input?.projectId), name };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if ((await requireMember(sql, data.projectId, context.userId)) !== "owner") throw new Error("Only the owner can rename it.");
    await sql`update remind_projects set name = ${data.name}, updated_at = now() where id = ${data.projectId}`;
    return { ok: true as const };
  });

export const deleteShared = createServerFn({ method: "POST" })
  .validator((input: { projectId: string }) => ({ projectId: projectId(input?.projectId) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if ((await requireMember(sql, data.projectId, context.userId)) !== "owner") throw new Error("Only the owner can delete it.");
    await sql`delete from remind_projects where id = ${data.projectId}`;
    return { ok: true as const };
  });

export const leaveShared = createServerFn({ method: "POST" })
  .validator((input: { projectId: string }) => ({ projectId: projectId(input?.projectId) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if ((await requireMember(sql, data.projectId, context.userId)) === "owner") {
      throw new Error("Owners delete the project instead of leaving.");
    }
    await sql`delete from remind_members where project_id = ${data.projectId} and user_id = ${context.userId}`;
    await unassign(sql, data.projectId, context.userId);
    return { ok: true as const };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; email: string }) => {
    const email = clip(input?.email, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter an email address.");
    return { projectId: projectId(input?.projectId), email };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requirePass(context.userId, "Inviting people");
    const sql = await getSql();
    if ((await requireMember(sql, data.projectId, context.userId)) !== "owner") throw new Error("Only the owner can invite people.");
    const count = await sql<{ n: number }>`
      select (select count(*) from remind_members where project_id = ${data.projectId})
           + (select count(*) from remind_invites where project_id = ${data.projectId}) as n
    `;
    if (Number(count[0]?.n ?? 0) >= MAX_MEMBERS) throw new Error("Twenty-five people is the limit.");
    const already = await sql<{ id: string }>`
      select u.id from "user" u
      join remind_members m on m.user_id = u.id and m.project_id = ${data.projectId}
      where lower(u.email) = ${data.email}
    `;
    if (already[0]) throw new Error("They're already in this project.");
    const added = await sql<{ email: string }>`
      insert into remind_invites (project_id, email, invited_by) values (${data.projectId}, ${data.email}, ${context.userId})
      on conflict do nothing
      returning email
    `;
    let emailed = false;
    if (added[0]) {
      const me = await userEmail(sql, context.userId);
      const project = await sql<{ name: string }>`select name from remind_projects where id = ${data.projectId}`;
      const account = await sql<{ id: string }>`select id from "user" where lower(email) = ${data.email}`;
      const { sendInviteEmail } = await import("@/lib/remind/email.server");
      const result = await sendInviteEmail({
        to: data.email,
        inviterName: me.name,
        projectName: project[0]?.name ?? "a project",
        hasAccount: Boolean(account[0]),
      });
      emailed = result.ok && !result.dryRun;
    }
    return { ok: true as const, emailed };
  });

export const cancelInvite = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; email: string }) => ({ projectId: projectId(input?.projectId), email: clip(input?.email, 200).toLowerCase() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if ((await requireMember(sql, data.projectId, context.userId)) !== "owner") throw new Error("Only the owner can do that.");
    await sql`delete from remind_invites where project_id = ${data.projectId} and email = ${data.email}`;
    return { ok: true as const };
  });

export const answerInvite = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; accept: boolean }) => ({ projectId: projectId(input?.projectId), accept: Boolean(input?.accept) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await userEmail(sql, context.userId);
    const rows = await sql<{ project_id: string }>`
      select project_id from remind_invites where project_id = ${data.projectId} and email = ${me.email}
    `;
    if (!rows[0]) throw new Error("That invitation is no longer open.");
    if (data.accept) {
      await sql`
        insert into remind_members (project_id, user_id, role) values (${data.projectId}, ${context.userId}, 'member')
        on conflict do nothing
      `;
    }
    await sql`delete from remind_invites where project_id = ${data.projectId} and email = ${me.email}`;
    return { ok: true as const };
  });

export const removeMember = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; userId: string }) => ({ projectId: projectId(input?.projectId), userId: clip(input?.userId, 64) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if ((await requireMember(sql, data.projectId, context.userId)) !== "owner") throw new Error("Only the owner can remove people.");
    if (data.userId === context.userId) throw new Error("You own this project.");
    await sql`delete from remind_members where project_id = ${data.projectId} and user_id = ${data.userId}`;
    await unassign(sql, data.projectId, data.userId);
    return { ok: true as const };
  });

async function unassign(sql: Sql, id: string, userId: string) {
  await mutate(sql, id, (doc) => ({
    ...doc,
    tasks: doc.tasks.map((task) => (task.assigneeId === userId ? { ...task, assigneeId: "" } : task)),
  }));
}

// ── Task changes in a shared project ─────────────────────────────────────────

export type SharedOp =
  | { type: "addTask"; task: Partial<SharedTask> }
  | { type: "patchTask"; id: string; patch: Partial<SharedTask> }
  | { type: "removeTask"; id: string }
  | { type: "addSection"; name: string }
  | { type: "renameSection"; id: string; name: string }
  | { type: "removeSection"; id: string }
  | { type: "addComment"; taskId: string; body: string }
  | { type: "removeComment"; taskId: string; commentId: string };

/** Apply a change with optimistic locking, retrying if someone else saved first. */
async function mutate(sql: Sql, id: string, change: (doc: SharedDoc) => SharedDoc): Promise<{ doc: SharedDoc; version: number }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rows = await sql<{ doc: string; version: number }>`select doc, version from remind_projects where id = ${id}`;
    const row = rows[0];
    if (!row) throw new Error("That project no longer exists.");
    const next = cleanSharedDoc(change(parseStored(row.doc)));
    const saved = await sql<{ version: number }>`
      update remind_projects
      set doc = ${JSON.stringify(next)}, version = version + 1, updated_at = now()
      where id = ${id} and version = ${row.version}
      returning version
    `;
    if (saved[0]) return { doc: next, version: Number(saved[0].version) };
  }
  throw new Error("Lots of changes at once. Try again.");
}

const PATCHABLE = ["title", "notes", "sectionId", "parentId", "priority", "labels", "due", "time", "recur", "done", "doneAt", "assigneeId"] as const;

export const sharedChange = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; op: SharedOp }) => {
    if (!input?.op || typeof input.op !== "object" || typeof input.op.type !== "string") throw new Error("Unknown change");
    return { projectId: projectId(input.projectId), op: input.op };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const role = await requireMember(sql, data.projectId, context.userId);
    const memberRows = await sql<{ user_id: string }>`select user_id from remind_members where project_id = ${data.projectId}`;
    const memberIds = new Set(memberRows.map((row) => row.user_id));
    const me = await userEmail(sql, context.userId);
    const op = data.op;
    const now = new Date().toISOString();

    return mutate(sql, data.projectId, (doc) => {
      const sectionIds = new Set(doc.sections.map((section) => section.id));
      const fix = (task: SharedTask) => (task.assigneeId && !memberIds.has(task.assigneeId) ? { ...task, assigneeId: "" } : task);
      switch (op.type) {
        case "addTask": {
          if (doc.tasks.length >= LIMITS.sharedTasks) throw new Error("This project is full.");
          const task = cleanSharedTask({ ...op.task, id: op.task?.id || newId(), createdBy: context.userId, createdAt: op.task?.createdAt || now }, sectionIds);
          if (!task) throw new Error("Give the task a title.");
          return { ...doc, tasks: [...doc.tasks, fix(task)] };
        }
        case "patchTask": {
          const patch: Record<string, unknown> = {};
          for (const key of PATCHABLE) if (op.patch && key in op.patch) patch[key] = (op.patch as Record<string, unknown>)[key];
          return {
            ...doc,
            tasks: doc.tasks.map((task) => {
              if (task.id !== op.id) return task;
              const next = cleanSharedTask({ ...task, ...patch }, sectionIds);
              return next ? fix(next) : task;
            }),
          };
        }
        case "removeTask": {
          const drop = withDescendants(doc.tasks, op.id);
          return { ...doc, tasks: doc.tasks.filter((task) => !drop.has(task.id)) };
        }
        case "addSection": {
          const name = clip(op.name, 60);
          if (!name || doc.sections.length >= LIMITS.sections) return doc;
          return { ...doc, sections: [...doc.sections, { id: newId(), name }] };
        }
        case "renameSection": {
          const name = clip(op.name, 60);
          if (!name) return doc;
          return { ...doc, sections: doc.sections.map((section) => (section.id === op.id ? { ...section, name } : section)) };
        }
        case "removeSection":
          return {
            sections: doc.sections.filter((section) => section.id !== op.id),
            tasks: doc.tasks.map((task) => (task.sectionId === op.id ? { ...task, sectionId: "" } : task)),
          };
        case "addComment": {
          const body = typeof op.body === "string" ? op.body.trim().slice(0, 1000) : "";
          if (!body) return doc;
          return {
            ...doc,
            tasks: doc.tasks.map((task) =>
              task.id === op.taskId
                ? { ...task, comments: [...task.comments, { id: newId(), authorId: context.userId, authorName: me.name, body, at: now }].slice(-LIMITS.comments) }
                : task,
            ),
          };
        }
        case "removeComment":
          return {
            ...doc,
            tasks: doc.tasks.map((task) =>
              task.id === op.taskId
                ? { ...task, comments: task.comments.filter((comment) => comment.id !== op.commentId || (comment.authorId !== context.userId && role !== "owner")) }
                : task,
            ),
          };
        default:
          throw new Error("Unknown change");
      }
    });
  });

// ── Attachments ──────────────────────────────────────────────────────────────

export const listFiles = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<FileMeta[]> => {
    const sql = await getSql();
    const rows = await sql<{ id: string; task_id: string; project_id: string | null; name: string; mime: string; size: number; owner_id: string; created_at: unknown }>`
      select f.id, f.task_id, f.project_id, f.name, f.mime, f.size, f.owner_id, f.created_at
      from remind_files f
      where (f.project_id is null and f.owner_id = ${context.userId})
         or f.project_id in (select project_id from remind_members where user_id = ${context.userId})
      order by f.created_at
    `;
    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      projectId: row.project_id,
      name: row.name,
      mime: row.mime,
      size: Number(row.size),
      ownerId: row.owner_id,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
  });

export const uploadFile = createServerFn({ method: "POST" })
  .validator((input: { taskId: string; projectId?: string | null; name: string; mime: string; data: string }) => {
    const taskId = clip(input?.taskId, 40);
    const name = clip(input?.name, 120).replace(/[/\\]/g, "_") || "file";
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(input?.mime ?? "") ? input.mime.slice(0, 100) : "application/octet-stream";
    const data = typeof input?.data === "string" ? input.data : "";
    if (!taskId) throw new Error("Unknown task");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error("That file couldn't be read.");
    const size = Math.floor((data.length * 3) / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
    if (size > MAX_FILE_BYTES) throw new Error("Files can be up to 2 MB.");
    return { taskId, projectId: input?.projectId ? projectId(input.projectId) : null, name, mime, data, size };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<FileMeta> => {
    await requirePass(context.userId, "Attaching files");
    const sql = await getSql();
    if (data.projectId) await requireMember(sql, data.projectId, context.userId);
    const used = await sql<{ n: number }>`select coalesce(sum(size), 0) as n from remind_files where owner_id = ${context.userId}`;
    if (Number(used[0]?.n ?? 0) + data.size > MAX_USER_BYTES) throw new Error("You've used your 50 MB of attachments. Delete some first.");
    const id = newId();
    await sql`
      insert into remind_files (id, owner_id, project_id, task_id, name, mime, size, data)
      values (${id}, ${context.userId}, ${data.projectId}, ${data.taskId}, ${data.name}, ${data.mime}, ${data.size}, ${data.data})
    `;
    return { id, taskId: data.taskId, projectId: data.projectId, name: data.name, mime: data.mime, size: data.size, ownerId: context.userId, createdAt: new Date().toISOString() };
  });

async function fileAccess(sql: Sql, id: string, userId: string) {
  const rows = await sql<{ owner_id: string; project_id: string | null }>`select owner_id, project_id from remind_files where id = ${id}`;
  const row = rows[0];
  if (!row) throw new Error("That file is gone.");
  if (row.project_id) {
    const role = await roleIn(sql, row.project_id, userId);
    if (!role) throw new Error("That file is gone.");
    return { row, canDelete: role === "owner" || row.owner_id === userId };
  }
  if (row.owner_id !== userId) throw new Error("That file is gone.");
  return { row, canDelete: true };
}

export const getFile = createServerFn({ method: "GET" })
  .validator((id: string) => clip(id, 40))
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await fileAccess(sql, id, context.userId);
    const rows = await sql<{ name: string; mime: string; data: string }>`select name, mime, data from remind_files where id = ${id}`;
    return rows[0];
  });

export const deleteFile = createServerFn({ method: "POST" })
  .validator((id: string) => clip(id, 40))
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const access = await fileAccess(sql, id, context.userId);
    if (!access.canDelete) throw new Error("Only whoever added it, or the project owner, can delete it.");
    await sql`delete from remind_files where id = ${id}`;
    return { ok: true as const };
  });

export const deleteTaskFiles = createServerFn({ method: "POST" })
  .validator((taskIds: string[]) => (Array.isArray(taskIds) ? taskIds.map((id) => clip(id, 40)).filter(Boolean).slice(0, 200) : []))
  .middleware([authMiddleware])
  .handler(async ({ context, data: taskIds }) => {
    if (taskIds.length === 0) return { ok: true as const };
    const sql = await getSql();
    await sql`
      delete from remind_files
      where task_id = any(${taskIds}::text[])
        and (owner_id = ${context.userId}
             or project_id in (select project_id from remind_members where user_id = ${context.userId} and role = 'owner'))
    `;
    return { ok: true as const };
  });

// ── Calendar link ────────────────────────────────────────────────────────────

function feedToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cleanZone(value: unknown): string {
  const zone = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/.test(zone)) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

export const getFeed = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ token: string | null; canShare: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ token: string }>`select token from remind_feeds where user_id = ${context.userId}`;
    return { token: rows[0]?.token ?? null, canShare: await canShare(context.userId) };
  });

export const setFeed = createServerFn({ method: "POST" })
  .validator((input: { action: "on" | "reset" | "off"; tz?: string }) => ({
    action: input?.action === "reset" ? "reset" : input?.action === "off" ? "off" : "on",
    tz: cleanZone(input?.tz),
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ token: string | null }> => {
    const sql = await getSql();
    if (data.action === "off") {
      await sql`delete from remind_feeds where user_id = ${context.userId}`;
      return { token: null };
    }
    await requirePass(context.userId, "The calendar link");
    const token = feedToken();
    if (data.action === "reset") {
      await sql`
        insert into remind_feeds (user_id, token, tz) values (${context.userId}, ${token}, ${data.tz})
        on conflict (user_id) do update set token = excluded.token, tz = excluded.tz
      `;
      return { token };
    }
    await sql`
      insert into remind_feeds (user_id, token, tz) values (${context.userId}, ${token}, ${data.tz})
      on conflict (user_id) do update set tz = excluded.tz
    `;
    const rows = await sql<{ token: string }>`select token from remind_feeds where user_id = ${context.userId}`;
    return { token: rows[0]?.token ?? token };
  });

// ── Email settings ───────────────────────────────────────────────────────────

export type EmailPrefs = { digest: boolean; due: boolean; email: string; canDue: boolean; configured: boolean };

async function prefsRow(sql: Sql, userId: string, tz?: string) {
  await sql`
    insert into remind_email_prefs (user_id, unsub_token, tz) values (${userId}, ${feedToken()}, ${tz ?? "UTC"})
    on conflict (user_id) do nothing
  `;
  if (tz) await sql`update remind_email_prefs set tz = ${tz} where user_id = ${userId}`;
  const rows = await sql<{ digest: boolean; due: boolean; unsub_token: string; last_test: unknown }>`
    select digest, due, unsub_token, last_test from remind_email_prefs where user_id = ${userId}
  `;
  return rows[0];
}

export const getEmailPrefs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<EmailPrefs> => {
    const sql = await getSql();
    const rows = await sql<{ digest: boolean; due: boolean }>`select digest, due from remind_email_prefs where user_id = ${context.userId}`;
    const me = await userEmail(sql, context.userId);
    const { emailConfigured } = await import("@/lib/email.server");
    return {
      digest: Boolean(rows[0]?.digest),
      due: Boolean(rows[0]?.due),
      email: me.email,
      canDue: await canShare(context.userId),
      configured: emailConfigured(),
    };
  });

export const setEmailPrefs = createServerFn({ method: "POST" })
  .validator((input: { digest: boolean; due: boolean; tz?: string }) => ({ digest: Boolean(input?.digest), due: Boolean(input?.due), tz: cleanZone(input?.tz) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.due) await requirePass(context.userId, "Reminder emails at the task's time");
    const me = await userEmail(sql, context.userId);
    if ((data.digest || data.due) && !me.email) throw new Error("Your account has no email address.");
    await prefsRow(sql, context.userId, data.tz);
    await sql`
      update remind_email_prefs set digest = ${data.digest}, due = ${data.due}, updated_at = now() where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = await userEmail(sql, context.userId);
    if (!me.email) throw new Error("Your account has no email address.");
    const row = await prefsRow(sql, context.userId);
    const last = row?.last_test ? Date.parse(String(row.last_test instanceof Date ? row.last_test.toISOString() : row.last_test)) : 0;
    if (last && Date.now() - last < 60_000) throw new Error("Wait a minute before sending another test.");
    await sql`update remind_email_prefs set last_test = now() where user_id = ${context.userId}`;
    const { sendTestEmail: send } = await import("@/lib/remind/email.server");
    const result = await send(me.email, row.unsub_token);
    if (!result.ok) throw new Error(`The email service said: ${result.error}`);
    return { ok: true as const, dryRun: result.dryRun, to: me.email };
  });
