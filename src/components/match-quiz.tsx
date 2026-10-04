import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AUDIENCES, genreLabel, isAudience, isSection, sectionsIn, type AudienceId, type SectionId } from "@/lib/sections";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui";

const KEY = "midnry.match";

export function MatchQuiz() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<AudienceId | null>(null);
  const [saved, setSaved] = useState<SectionId | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored && isSection(stored)) setSaved(stored);
  }, []);

  if (isPending || !user) return null;

  function choose(section: SectionId) {
    localStorage.setItem(KEY, section);
    setSaved(section);
    setOpen(false);
    setAudience(null);
  }

  return (
    <section className="rounded-2xl bg-card p-5 shadow-line">
      <h2 className="font-display text-3xl tracking-tight">Not sure where to start?</h2>
      <p className="mt-1 max-w-xl text-sm text-pretty text-muted">
        Answer two questions and Midnry will point you at a section.
      </p>
      {saved && !open ? (
        <p className="mt-4">
          Your match is{" "}
          <Link to="/sections/$genre" params={{ genre: saved }} className="underline">
            {genreLabel(saved)}
          </Link>
          .
        </p>
      ) : null}
      {!open ? (
        <Button tone="primary" className="mt-4" onClick={() => { setOpen(true); setAudience(null); }}>
          {saved ? "Answer again" : "Find a section"}
        </Button>
      ) : (
        <div className="mt-4">
          {audience == null ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {AUDIENCES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="rounded-2xl bg-paper px-4 py-3 text-left"
                  onClick={() => {
                    if (isAudience(item.id)) setAudience(item.id);
                  }}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="text-sm text-muted">{item.blurb}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {sectionsIn(audience).map((section) => (
                <button key={section.id} type="button" className="rounded-2xl bg-paper px-4 py-3 text-left" onClick={() => choose(section.id)}>
                  <span className="block font-medium">{section.label}</span>
                  <span className="text-sm text-muted">{section.blurb}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
