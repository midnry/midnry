import { useState } from "react";
import { Button, TextArea, TextInput } from "@/components/ui";
import { LAB_PARTS, broughtIn, LIMITS, STARTER_FORMULAS, newNote, noteText, type LabNote, type StudyDoc } from "@/lib/study";
import { BackButton, ConfirmButton, CopyButton, Panel, makeId, plural, prettyDate, printText, stamp } from "@/components/tools/study/parts";

/** The Notes tab: several lab write-ups, and the formula sheet with your own formulas. */
export function NotesView({ doc, commit, focus }: { doc: StudyDoc; commit: (change: (doc: StudyDoc) => StudyDoc) => void; focus?: "formulas" }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const note = openId ? doc.notes.find((item) => item.id === openId) : undefined;

  if (note) {
    return (
      <NoteEditor
        note={note}
        onChange={(next) => commit((d) => ({ ...d, notes: d.notes.map((item) => (item.id === next.id ? { ...next, updatedAt: stamp().now } : item)) }))}
        onDelete={() => {
          commit((d) => ({ ...d, notes: d.notes.filter((item) => item.id !== note.id) }));
          setOpenId(null);
        }}
        onBack={() => setOpenId(null)}
      />
    );
  }

  const full = doc.notes.length >= LIMITS.notes;
  const lab = (
    <section aria-labelledby="lab-writeups">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="lab-writeups" className="font-display text-3xl tracking-tight">
            Lab write-ups
          </h2>
          <p className="mt-1 text-sm text-muted">Aim, method, results and conclusion, one write-up per experiment. Each saves as you type.</p>
        </div>
        <Button
          disabled={full}
          onClick={() => {
            const next = newNote(stamp(), makeId);
            commit((d) => ({ ...d, notes: [next, ...d.notes] }));
            setOpenId(next.id);
          }}
        >
          New write-up
        </Button>
      </div>
      {full ? <p className="mt-2 text-sm text-fail">You have {LIMITS.notes} write-ups. Delete one to make room.</p> : null}
      {doc.notes.length === 0 ? (
        <Panel className="mt-4">
          <p>No write-ups yet.</p>
        </Panel>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2" data-note-list>
          {doc.notes.map((item) => (
            <li key={item.id}>
              <button type="button" className="h-full w-full rounded-2xl bg-card p-4 text-left shadow-line hover:bg-paper-2/60" onClick={() => setOpenId(item.id)}>
                <span className="block font-medium break-words">{item.title || "Untitled write-up"}</span>
                <span className="mt-1 block text-sm text-muted">
                  {broughtIn(item.from) === "Lab" ? "Brought in from Lab · " : ""}
                  {item.updatedAt ? `Changed ${prettyDate(item.updatedAt)}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      {focus === "formulas" ? (
        <>
          <Formulas doc={doc} commit={commit} />
          <div className="mt-12">{lab}</div>
        </>
      ) : (
        <>
          {lab}
          <div className="mt-12">
            <Formulas doc={doc} commit={commit} />
          </div>
        </>
      )}
    </div>
  );
}

function NoteEditor({ note, onChange, onDelete, onBack }: { note: LabNote; onChange: (note: LabNote) => void; onDelete: () => void; onBack: () => void }) {
  const text = noteText(note);
  return (
    <div>
      <BackButton onClick={onBack} label="All write-ups" />
      <label className="mt-2 block text-sm">
        <span className="mb-1 block text-muted">Experiment</span>
        <TextInput value={note.title} maxLength={LIMITS.title} placeholder="Untitled write-up" onChange={(event) => onChange({ ...note, title: event.target.value })} />
      </label>
      {broughtIn(note.from) === "Lab" ? <p className="mt-2 text-xs text-muted">Brought in from your Lab app. The original is kept as it was.</p> : null}
      <div className="mt-3 grid gap-3">
        {LAB_PARTS.map((part) => (
          <label key={part.id} className="block text-sm">
            <span className="mb-1 block text-muted">{part.label}</span>
            <TextArea rows={4} value={note[part.id]} maxLength={LIMITS.long} onChange={(event) => onChange({ ...note, [part.id]: event.target.value })} />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CopyButton text={text} label="Copy as text" />
        <Button tone="quiet" onClick={() => printText(note.title || "Lab write-up", text)}>
          Print
        </Button>
        <ConfirmButton label="Delete write-up" question="Delete this write-up?" onConfirm={onDelete} />
      </div>
    </div>
  );
}

function Formulas({ doc, commit }: { doc: StudyDoc; commit: (change: (doc: StudyDoc) => StudyDoc) => void }) {
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const match = (item: { title: string; body: string }) => `${item.title} ${item.body}`.toLowerCase().includes(query.trim().toLowerCase());
  const own = doc.formulas.filter(match);
  const starter = STARTER_FORMULAS.filter(match);
  const full = doc.formulas.length >= LIMITS.formulas;

  return (
    <section aria-labelledby="formulas-heading">
      <h2 id="formulas-heading" className="font-display text-3xl tracking-tight">
        Formula sheet
      </h2>
      <p className="mt-1 text-sm text-muted">A starter sheet of core relations, plus your own. Search by name or symbol.</p>
      <TextInput className="mt-3" type="search" value={query} placeholder="Search, such as stress or ohm" aria-label="Search formulas" onChange={(event) => setQuery(event.target.value)} />

      <Panel className="mt-4">
        <p className="font-medium">Add your own formula</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_2fr]">
          <label className="min-w-0 text-sm">
            <span className="mb-1 block text-muted">Name</span>
            <TextInput value={title} maxLength={LIMITS.title} placeholder="Pressure" onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="min-w-0 text-sm">
            <span className="mb-1 block text-muted">Formula and what the letters mean</span>
            <TextInput value={body} maxLength={LIMITS.text} placeholder="p = F / A. Force over area." onChange={(event) => setBody(event.target.value)} />
          </label>
        </div>
        <Button
          className="mt-3"
          disabled={!title.trim() || !body.trim() || full}
          onClick={() => {
            commit((d) => ({ ...d, formulas: [...d.formulas, { id: makeId(), title: title.trim(), body: body.trim() }] }));
            setTitle("");
            setBody("");
          }}
        >
          Add formula
        </Button>
      </Panel>

      {own.length > 0 ? (
        <>
          <p className="mt-6 font-medium">Your formulas ({plural(doc.formulas.length, "formula")})</p>
          <ul className="mt-2 space-y-2" data-own-formulas>
            {own.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-card p-4 shadow-line">
                <span className="min-w-0 flex-1 basis-56">
                  <span className="block font-medium break-words">{item.title}</span>
                  <span className="mt-1 block text-sm text-pretty break-words text-muted">{item.body}</span>
                </span>
                <span className="max-w-full">
                  <ConfirmButton label="Remove" question="Remove it?" onConfirm={() => commit((d) => ({ ...d, formulas: d.formulas.filter((other) => other.id !== item.id) }))} />
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-6 font-medium">Starter sheet</p>
      <ul className="mt-2 space-y-2">
        {starter.map((item) => (
          <li key={item.id} className="rounded-2xl bg-card p-4 shadow-line">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-pretty text-muted">{item.body}</p>
          </li>
        ))}
        {starter.length === 0 && own.length === 0 ? <li className="text-sm text-muted">Nothing matches “{query.trim()}”.</li> : null}
      </ul>
    </section>
  );
}
