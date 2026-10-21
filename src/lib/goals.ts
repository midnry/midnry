/**
 * Browse by what you want to get done. Each goal points at a real place:
 * an app's product page, or the games hub. Shared by the homepage and Apps.
 */
export type Goal = {
  id: string;
  label: string;
  /** An app slug from the catalogue, or "games". */
  target: string;
  hint: string;
};

export const GOALS: readonly Goal[] = [
  { id: "day", label: "Organise my day", target: "tasks", hint: "Remind" },
  { id: "invoice", label: "Send an invoice", target: "invoice", hint: "Invoice" },
  { id: "spending", label: "Understand my spending", target: "ledger", hint: "Ledger" },
  { id: "job", label: "Prepare a job application", target: "apply", hint: "Apply" },
  { id: "play", label: "Find something to play", target: "games", hint: "Games" },
];
