import { useState, type FormEvent } from "react";
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
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <form onSubmit={addNote} className="flex gap-2">
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
            <ul className="mt-3">
              {notes.map((note) => {
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
                      <span className="truncate">{note.title.trim() || "Untitled"}</span>
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
              <Button
                tone="quiet"
                disabled={notes.length <= 1}
                onClick={() => {
                  const next = notes.filter((note) => note.id !== active.id);
                  commit(next, next[0]?.id ?? active.id);
                }}
              >
                Delete note
              </Button>
            </div>
          </div>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
