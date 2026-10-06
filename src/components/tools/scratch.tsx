import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextArea, TextInput } from "@/components/ui";
import { nid, ToolFrame, ToolStatus } from "@/components/tools/shared";

type Note = { id: string; title: string; body: string };
type ScratchDoc = { notes: Note[]; activeId: string };

const FALLBACK: ScratchDoc = {
  notes: [{ id: "first", title: "", body: "" }],
  activeId: "first",
};

function asNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) return FALLBACK.notes;
  const notes = value
    .filter(
      (note): note is Note =>
        !!note &&
        typeof note === "object" &&
        typeof (note as Note).id === "string" &&
        typeof (note as Note).title === "string" &&
        typeof (note as Note).body === "string",
    )
    .slice(0, 40);
  return notes.length > 0 ? notes : FALLBACK.notes;
}

function words(body: string): number {
  const trimmed = body.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function ScratchTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("scratch", FALLBACK);
  const notes = asNotes(data.notes);
  const activeId = notes.some((note) => note.id === data.activeId) ? data.activeId : notes[0].id;
  const active = notes.find((note) => note.id === activeId) ?? notes[0];
  const [draftTitle, setDraftTitle] = useState("");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle ? notes.filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(needle)) : notes;

  function commit(nextNotes: Note[], nextActive = activeId) {
    setData({ notes: nextNotes, activeId: nextActive });
  }

  function addNote(event: FormEvent) {
    event.preventDefault();
    if (notes.length >= 40) return;
    const title = draftTitle.trim();
    const note: Note = { id: nid(), title, body: "" };
    setDraftTitle("");
    commit([note, ...notes], note.id);
  }

  return (
    <ToolFrame slug="scratch" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="min-w-0">
            <form onSubmit={addNote} className="flex min-w-0 gap-2 [&>input]:min-w-0">
              <TextInput
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="New note"
                aria-label="New note title"
                maxLength={80}
              />
              <Button type="submit" tone="primary" disabled={notes.length >= 40}>
                Add
              </Button>
            </form>
            {notes.length > 5 ? (
              <TextInput className="mt-3" value={query} placeholder="Search notes" aria-label="Search notes" onChange={(event) => setQuery(event.target.value)} />
            ) : null}
            {needle && shown.length === 0 ? <p className="mt-3 text-sm text-muted">No notes match.</p> : null}
            <ul className="mt-3">
              {shown.map((note) => {
                const on = note.id === activeId;
                return (
                  <li key={note.id} className="border-t border-line last:border-b">
                    <button
                      type="button"
                      onClick={() => commit(notes, note.id)}
                      className={
                        on
                          ? "flex min-h-11 w-full items-center text-left font-medium"
                          : "flex min-h-11 w-full items-center text-left text-muted hover:text-ink"
                      }
                    >
                      <span className="min-w-0 py-1.5">
                        <span className="block truncate">{note.title.trim() || "Untitled"}</span>
                        {note.body.trim() ? <span className="block truncate text-xs font-normal text-muted">{note.body.trim().slice(0, 80)}</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <TextInput
              value={active.title}
              onChange={(event) =>
                commit(
                  notes.map((note) =>
                    note.id === active.id ? { ...note, title: event.target.value } : note,
                  ),
                )
              }
              placeholder="Untitled"
              aria-label="Note title"
              maxLength={120}
            />
            <TextArea
              value={active.body}
              onChange={(event) =>
                commit(
                  notes.map((note) =>
                    note.id === active.id ? { ...note, body: event.target.value } : note,
                  ),
                )
              }
              placeholder="Write something. It stays with this account."
              aria-label="Note"
              className="mt-3 min-h-80"
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted">
              <span>
                {words(active.body)} {words(active.body) === 1 ? "word" : "words"}
              </span>
              <span className="flex flex-wrap gap-2">
                <Button
                  tone="quiet"
                  disabled={!active.body.trim()}
                  onClick={() => {
                    void navigator.clipboard.writeText([active.title.trim(), active.body].filter(Boolean).join("\n\n")).then(
                      () => toast.success("Note copied."),
                      () => toast.error("Could not copy."),
                    );
                  }}
                >
                  Copy
                </Button>
                <Button
                  tone="quiet"
                  disabled={notes.length <= 1}
                  onClick={() => {
                    const before = notes;
                    const beforeActive = active.id;
                    const next = notes.filter((note) => note.id !== active.id);
                    commit(next, next[0]?.id ?? active.id);
                    toast("Note deleted", { action: { label: "Undo", onClick: () => commit(before, beforeActive) } });
                  }}
                >
                  Delete note
                </Button>
              </span>
            </div>
          </div>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
