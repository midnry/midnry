import { getSql } from "@/lib/db";
import { cleanDoc, cleanSharedDoc, type Comment, type Priority } from "@/lib/remind/model";
import type { Recur } from "@/lib/remind/recur";

/** An open task that belongs on someone's own schedule. */
export type OpenTask = {
  uid: string;
  title: string;
  notes: string;
  due: string;
  time: string;
  recur: Recur;
  priority: Priority;
  where: string;
  comments: Comment[];
};

/**
 * Every unfinished task with a date for this person: their own tasks, plus
 * shared-project tasks assigned to them or to nobody.
 */
export async function openDatedTasks(userId: string): Promise<OpenTask[]> {
  const sql = await getSql();
  const out: OpenTask[] = [];
  const docs = await sql<{ payload: string }>`
    select payload from app_documents where user_id = ${userId} and app_id = 'tasks'
  `;
  let personal = cleanDoc({});
  try {
    personal = cleanDoc(docs[0] ? JSON.parse(docs[0].payload) : {});
  } catch {
    /* unreadable document: no personal tasks */
  }
  const projectName = new Map(personal.projects.map((project) => [project.id, project.name]));
  for (const task of personal.tasks) {
    if (task.done || !task.due) continue;
    out.push({
      uid: `${task.id}@midnry-remind`,
      title: task.title,
      notes: task.notes,
      due: task.due,
      time: task.time,
      recur: task.recur,
      priority: task.priority,
      where: projectName.get(task.projectId) ?? "Inbox",
      comments: task.comments,
    });
  }
  const shared = await sql<{ name: string; doc: string }>`
    select p.name, p.doc from remind_projects p
    join remind_members m on m.project_id = p.id
    where m.user_id = ${userId}
  `;
  for (const project of shared) {
    let doc = cleanSharedDoc({});
    try {
      doc = cleanSharedDoc(JSON.parse(project.doc));
    } catch {
      continue;
    }
    for (const task of doc.tasks) {
      if (task.done || !task.due) continue;
      if (task.assigneeId && task.assigneeId !== userId) continue;
      out.push({
        uid: `${task.id}@midnry-remind`,
        title: task.title,
        notes: task.notes,
        due: task.due,
        time: task.time,
        recur: task.recur,
        priority: task.priority,
        where: project.name,
        comments: task.comments,
      });
    }
  }
  return out;
}

/** The person can use Pass features (an active pass, or the admin). */
export async function hasPassAccess(userId: string): Promise<boolean> {
  const { readIsAdmin } = await import("@/lib/community.functions");
  if (await readIsAdmin(userId)) return true;
  const { readAccount } = await import("@/lib/account.server");
  return (await readAccount(userId)).hasPass;
}
