import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAppDoc } from "@/components/use-app-doc";
import { setViewParam, viewParam } from "@/components/use-merged-docs";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";
import { ViewTabs } from "@/components/tools/view-tabs";
import { getApp } from "@/lib/catalog";
import { aliasOf } from "@/lib/app-aliases";
import { loadMergedDoc } from "@/lib/merged-docs.functions";
import { myShares } from "@/lib/study.functions";
import { STUDY_OLD_DOCS, STUDY_SLUG, STUDY_VIEWS, broughtIn, importOldDocs, isStudyView, normalizeStudy, type StudyDoc, type StudyView } from "@/lib/study";
import { CardsView } from "@/components/tools/study/cards";
import { PracticeView } from "@/components/tools/study/practice";
import { ReferencesView } from "@/components/tools/study/references";
import { NotesView } from "@/components/tools/study/notes";
import { ShareList, type Shares } from "@/components/tools/study/share";
import { makeId, stamp } from "@/components/tools/study/parts";

/** ?view= values beyond the four tabs, used by old links (Formulas, Cite). */
function startView(view: string | null): { tab: StudyView; formulas?: boolean; law?: boolean } {
  if (view === "formulas") return { tab: "notes", formulas: true };
  if (view === "law") return { tab: "references", law: true };
  return { tab: isStudyView(view) ? view : "cards" };
}

/** Quick tools the Study space links to; they stay their own apps. */
const QUICK_TOOLS = ["units", "circuit", "solver", "plot", "algo", "ratios", "breakeven", "statements"];
/** Writing help for study (Explain, Bugs, Outline, Digest, Case brief). */
const WRITING_HELP = [
  { slug: "explainer", label: "Explain code" },
  { slug: "bug-scan", label: "Find bugs" },
  { slug: "outliner", label: "Outline an essay" },
  { slug: "digest", label: "Summarise reading" },
  { slug: "case-brief", label: "Case brief" },
];

export function StudyTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc<Record<string, unknown>>(STUDY_SLUG, {});
  const doc = useMemo(() => normalizeStudy(data), [data]);
  const [start] = useState(() => startView(viewParam()));
  const [tab, setTab] = useState<StudyView>(start.tab);
  const [notice, setNotice] = useState<string | null>(null);
  const [shares, setShares] = useState<Shares>({ canShare: null, list: [], failed: false });
  const importTried = useRef(false);

  function commit(change: (doc: StudyDoc) => StudyDoc) {
    setData((prev) => change(normalizeStudy(prev)) as unknown as Record<string, unknown>);
  }

  // Your share links, and whether you can make one (Midnry Pass, checked on the server).
  useEffect(() => {
    let live = true;
    myShares()
      .then((res) => live && setShares({ canShare: res.canShare, list: res.shares, failed: false }))
      .catch(() => live && setShares({ canShare: null, list: [], failed: true }));
    return () => {
      live = false;
    };
  }, []);

  // Copy the old Lab and Quiz documents in, once. They are only read, never changed.
  useEffect(() => {
    if (!ready || loadError || blocked || importTried.current) return;
    const todo = STUDY_OLD_DOCS.filter((slug) => !doc.imported[slug]);
    if (todo.length === 0) return;
    importTried.current = true;
    const read = (slug: string) =>
      loadMergedDoc({ data: slug })
        .then((res): unknown => {
          if (!res.ok) return null;
          if (!res.payload) return undefined;
          try {
            return JSON.parse(res.payload) as unknown;
          } catch {
            return undefined;
          }
        })
        .catch(() => null);
    void Promise.all(todo.map(read)).then((docs) => {
      const sources = Object.fromEntries(todo.map((slug, i) => [slug, docs[i]]));
      let copied: string[] = [];
      setData((prev) => {
        const result = importOldDocs(normalizeStudy(prev), sources, stamp(), makeId);
        copied = result.copied;
        return result.changed ? (result.doc as unknown as Record<string, unknown>) : prev;
      });
      if (copied.length) {
        const names = copied.map((slug) => (broughtIn(slug) === "Lab" ? "Lab write-up" : "Quiz"));
        setNotice(`Your saved ${names.join(" and ")} ${names.length > 1 ? "were" : "was"} copied in here. The original${names.length > 1 ? "s stay" : " stays"} as ${names.length > 1 ? "they were" : "it was"}.`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loadError, blocked]);

  function choose(next: StudyView) {
    setTab(next);
    setViewParam(next === "cards" ? null : next);
  }

  const onShares = (list: Shares["list"]) => setShares((prev) => ({ ...prev, list }));

  return (
    <ToolFrame slug={STUDY_SLUG} saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        {notice ? (
          <p className="mb-4 max-w-2xl rounded-2xl bg-paper-2 px-4 py-3 text-sm text-pretty" role="status" data-import-notice>
            {notice}
          </p>
        ) : null}
        <ViewTabs label="Study space" views={STUDY_VIEWS} value={tab} onChange={choose} className="mb-6" />
        <div data-study-tab={tab}>
          {tab === "cards" ? <CardsView doc={doc} commit={commit} shares={shares} onShares={onShares} /> : null}
          {tab === "practice" ? <PracticeView doc={doc} commit={commit} shares={shares} onShares={onShares} /> : null}
          {tab === "references" ? <ReferencesView doc={doc} commit={commit} initialStyle={start.law ? "Law" : undefined} /> : null}
          {tab === "notes" ? <NotesView doc={doc} commit={commit} focus={start.formulas ? "formulas" : undefined} /> : null}
        </div>
        {tab === "cards" || tab === "practice" ? <ShareList shares={shares} onChange={onShares} /> : null}
        <StudyLinks />
      </ToolStatus>
    </ToolFrame>
  );
}

function StudyLinks() {
  const quick = QUICK_TOOLS.map((slug) => getApp(slug)).filter((app) => app !== undefined);
  const writing = WRITING_HELP.filter((item) => getApp(item.slug) || aliasOf(item.slug));
  return (
    <section className="no-print mt-12 border-t border-line pt-6" aria-labelledby="study-tools">
      <h2 id="study-tools" className="font-medium">
        Quick tools
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {quick.map((app) => (
          <li key={app.slug}>
            <Link to="/apps/$slug" params={{ slug: app.slug }} className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm shadow-line hover:bg-paper-2">
              {app.name}
            </Link>
          </li>
        ))}
      </ul>
      {writing.length > 0 ? (
        <>
          <h2 className="mt-6 font-medium">Writing help</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {writing.map((item) => (
              <li key={item.slug}>
                <Link to="/apps/$slug" params={{ slug: item.slug }} className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm shadow-line hover:bg-paper-2">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
