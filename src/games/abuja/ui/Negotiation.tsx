import { useEffect, useMemo, useRef, useState } from "react";
import { negAccept, negArgue, negBluff, negClose, negPropose, negWalk } from "../systems/engine";
import { APPROACHES, QUALITY_LABEL, approachHint, estimatedQuality, playerSkill, reaction, repLabel } from "../systems/negotiate/core";
import { person, TRAIT_INFO } from "../systems/negotiate/people";
import type { Approach, Negotiation, Quality, Term } from "../systems/negotiate/types";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { btnGhost, btnPrimary, panel } from "./theme";

type Draft = Record<string, { included: boolean; amount?: number }>;

const QUALITY_TONE: Record<Quality, string> = {
  excellent: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  good: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
  fair: "bg-sky-500/10 text-sky-200 border-sky-400/30",
  poor: "bg-amber-500/10 text-amber-200 border-amber-400/30",
  terrible: "bg-red-500/15 text-red-300 border-red-400/40",
};

const KIND_ICON: Record<Term["kind"], string> = {
  money: "💵",
  asset: "🏷️",
  service: "🛠️",
  obligation: "📄",
  future: "📈",
  contract: "✍️",
  item: "📦",
  favor: "🤝",
};

const ARGUE_IN_BARGAIN: Approach[] = ["friendly", "logical", "mutual", "urgency", "confident", "aggressive"];

function fmt(amount: number, t: Term): string {
  if (t.unit === "percent") return `${amount}%`;
  if (t.unit === "weeks") return `${amount} weeks`;
  if (t.unit === "naira/week") return `${naira(amount)}/week`;
  return naira(amount);
}

function relWord(rel: number): string {
  return rel >= 50 ? "Friendly" : rel >= 20 ? "Warm" : rel > -20 ? "Neutral" : rel > -50 ? "Cold" : "Hostile";
}

function mood(n: Negotiation): { text: string; tone: string } {
  if (n.anger >= 2) return { text: "Offended", tone: "text-red-300" };
  if (n.patience <= 1) return { text: "Impatient", tone: "text-amber-300" };
  if (n.anger === 1 || n.resistance > 30) return { text: "Guarded", tone: "text-amber-200" };
  if (n.resistance < 8) return { text: "Open", tone: "text-emerald-300" };
  return { text: "Listening", tone: "text-sky-200" };
}

function draftOf(n: Negotiation): Draft {
  const d: Draft = {};
  for (const t of n.terms) d[t.id] = { included: t.included, amount: t.amount };
  return d;
}

/** The negotiation table: talk first, then build offers until someone agrees or leaves. */
export function NegotiationScreen({ state, n }: { state: GameState; n: Negotiation }) {
  const who = person(n.npc)!;
  const mem = state.life?.neg?.npcs[n.npc];
  const rep = repLabel(state.life?.neg?.rep);
  const skill = playerSkill(state);
  const [draft, setDraft] = useState<Draft>(() => draftOf(n));
  const [arguing, setArguing] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);
  useEffect(() => logEnd.current?.scrollIntoView({ block: "end" }), [n.log.length]);
  // When bargaining starts, begin from the current table.
  useEffect(() => setDraft(draftOf(n)), [n.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo<Negotiation>(
    () => ({ ...n, terms: n.terms.map((t) => ({ ...t, included: t.locked ? t.included : (draft[t.id]?.included ?? t.included), amount: draft[t.id]?.amount ?? t.amount })) }),
    [n, draft],
  );
  const react = reaction(preview, skill);
  const quality = estimatedQuality(preview);
  const known = n.traits.filter((t) => n.revealed.includes(`trait:${t}`));
  const hiddenCount = n.traits.length - known.length;
  const visible = (side: "player" | "npc") => n.terms.filter((t) => t.side === side && !t.hidden);
  const price = n.terms.find((t) => t.id === n.price)!;
  const counter = n.counter;
  const counterDiff = counter
    ? n.terms
        .filter((t) => !t.hidden)
        .map((t) => {
          const c = counter[t.id];
          if (!c) return null;
          if (t.id === n.price && c.amount != null) return `${t.label}: ${fmt(c.amount, t)}`;
          if (!t.locked && c.included !== (draft[t.id]?.included ?? t.included)) return `${c.included ? "Add" : "Remove"}: ${t.label}`;
          return null;
        })
        .filter(Boolean)
    : [];

  const setTerm = (id: string, patch: Partial<{ included: boolean; amount: number }>) => setDraft((d) => ({ ...d, [id]: { ...d[id]!, ...patch } }));
  const offer = () => Object.entries(draft).map(([id, v]) => ({ id, ...v }));

  return (
    <div className="absolute inset-0 z-[55] flex items-stretch justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Negotiating with ${who.name}`}>
      <div className={`${panel} flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-none sm:h-[min(52rem,96dvh)] sm:rounded-2xl`}>
        {/* Who you're dealing with */}
        <div className="flex items-start gap-3 border-b border-white/10 p-3 sm:p-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-slate-950 sm:size-14" style={{ background: who.color }} aria-hidden>
            {who.name.replace(/^(Mr\.|Mrs\.|Hajia|Alhaji|Chief|Iya)\s+/, "").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold tracking-widest text-sky-400 uppercase">{n.title}</p>
            <p className="truncate font-display text-xl leading-tight">{who.name}</p>
            <p className="truncate text-xs text-slate-400">{who.role}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {known.map((t) => (
                <span key={t} title={TRAIT_INFO[t].tip} className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px]">
                  {TRAIT_INFO[t].icon} {TRAIT_INFO[t].label}
                </span>
              ))}
              {hiddenCount ? (
                <span title="Ask questions or watch how they react to learn more" className="rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[11px] text-slate-400">
                  ? {hiddenCount} unknown
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 text-right text-[11px] leading-5 text-slate-400">
            <p>
              Relationship: <span className="text-slate-200">{relWord(mem?.rel ?? 0)}</span>
            </p>
            <p>
              Mood: <span className={mood(n).tone}>{mood(n).text}</span>
            </p>
            <p title={rep.blurb}>
              You: <span className="text-slate-200">{rep.label}</span>
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-[11px] font-semibold tracking-wider uppercase">
          <span className={n.stage === "persuade" ? "text-sky-300" : "text-slate-500"}>1 · Persuade</span>
          <span className="text-slate-600">→</span>
          <span className={n.stage === "bargain" ? "text-sky-300" : "text-slate-500"}>2 · Bargain</span>
          <span className="text-slate-600">→</span>
          <span className={n.stage === "done" ? "text-sky-300" : "text-slate-500"}>3 · {n.outcome?.agreed ? "Deal" : "Outcome"}</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* The conversation */}
          <div className="min-h-[9rem] flex-1 overflow-y-auto p-3 sm:p-4 lg:max-w-[50%] lg:border-r lg:border-white/10" aria-live="polite">
            <div className="grid gap-2">
              {n.log.map((l, i) =>
                l.who === "note" ? (
                  <p key={i} className={`px-2 text-center text-xs italic ${l.tone === "good" ? "text-emerald-300" : l.tone === "bad" ? "text-amber-300" : "text-slate-400"}`}>
                    {l.text}
                  </p>
                ) : (
                  <div key={i} className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${l.who === "you" ? "ml-auto rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-white/10 text-slate-100"}`}>
                    {l.text}
                  </div>
                ),
              )}
              <div ref={logEnd} />
            </div>
          </div>

          {/* What you can do */}
          <div className="max-h-[58dvh] shrink-0 overflow-y-auto border-t border-white/10 p-3 sm:p-4 lg:max-h-none lg:flex-1 lg:border-t-0">
            {n.stage === "persuade" ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Convince them it's worth talking</p>
                  <p className="flex gap-1" aria-label={`${n.progress} of ${n.required} arguments landed`}>
                    {Array.from({ length: n.required }, (_, i) => (
                      <span key={i} className={`size-2.5 rounded-full ${i < n.progress ? "bg-emerald-400" : "bg-white/15"}`} />
                    ))}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">Pick arguments that suit who they are. Repeating yourself works less each time.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(Object.keys(APPROACHES) as Approach[]).map((a) => {
                    const hint = approachHint(state, n, a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => negArgue(a)}
                        className={`rounded-xl border px-3 py-2 text-left transition hover:bg-white/10 ${hint === "good" ? "border-emerald-400/40 bg-emerald-400/5" : hint === "bad" ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-white/5"}`}
                      >
                        <span className="block text-sm font-semibold">{APPROACHES[a].label}</span>
                        <span className="block text-[11px] text-slate-400">
                          {hint === "good" ? "👍 This might suit them" : hint === "bad" ? "⚠️ Risky with them" : APPROACHES[a].hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" className={`${btnGhost} mt-3 w-full`} onClick={negWalk}>
                  Walk away
                </button>
              </div>
            ) : null}

            {n.stage === "bargain" ? (
              <div>
                <TermList title="You give" terms={visible("player")} draft={draft} onChange={setTerm} />
                <TermList title="They give" terms={visible("npc")} draft={draft} onChange={setTerm} />

                <div className="mt-3 grid gap-2 rounded-xl bg-white/5 p-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Their reaction</span>
                      <span>{react.text}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-5 gap-1" aria-hidden>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span key={i} className={`h-1.5 rounded-full ${i <= react.level ? (react.level >= 3 ? "bg-emerald-400" : react.level >= 2 ? "bg-sky-400" : "bg-amber-400") : "bg-white/10"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">
                      Market value, as far as you can tell: <span className="text-slate-200">about {naira(Math.round(n.estimate / 1000) * 1000)}</span>
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${QUALITY_TONE[quality]}`}>For you: {QUALITY_LABEL[quality]}</span>
                  </div>
                </div>

                {counter && counterDiff.length ? (
                  <div className="mt-3 rounded-xl border border-sky-400/30 bg-sky-400/5 p-3 text-sm">
                    <p className="text-xs font-semibold tracking-wider text-sky-300 uppercase">Their offer</p>
                    <ul className="mt-1 list-disc pl-4 text-slate-200">
                      {counterDiff.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" className={`${btnPrimary} min-h-10`} onClick={negAccept}>
                        Accept their offer
                      </button>
                      <button
                        type="button"
                        className={`${btnGhost} min-h-10`}
                        onClick={() => setDraft((d) => {
                          const next = { ...d };
                          for (const [id, v] of Object.entries(counter)) next[id] = { ...v };
                          return next;
                        })}
                      >
                        Start from theirs
                      </button>
                    </div>
                  </div>
                ) : null}

                <button type="button" className={`${btnPrimary} mt-3 w-full`} onClick={() => negPropose(offer())}>
                  Make this offer{price.amount != null ? ` (${fmt(draft[price.id]?.amount ?? price.amount, price)})` : ""}
                </button>

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <button type="button" className={`${btnGhost} min-h-12 px-2 text-xs leading-tight whitespace-normal`} disabled={n.claimedRival} onClick={() => negBluff("rival")} title="Mention another offer. It works if they believe you.">
                    "I have another offer"
                  </button>
                  <button type="button" className={`${btnGhost} min-h-12 px-2 text-xs leading-tight whitespace-normal`} onClick={() => negBluff("final")} title="Put your current offer down as final. Going back on it later costs trust.">
                    "Final offer"
                  </button>
                  <button type="button" className={`${btnGhost} min-h-12 px-2 text-xs leading-tight whitespace-normal`} onClick={() => negBluff("walk")} title="Threaten to leave and see how they react.">
                    "I'll walk"
                  </button>
                </div>

                <button type="button" className="mt-2 w-full text-left text-xs text-slate-400 underline-offset-2 hover:underline" onClick={() => setArguing((v) => !v)} aria-expanded={arguing}>
                  {arguing ? "▾" : "▸"} Make an argument instead
                </button>
                {arguing ? (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {ARGUE_IN_BARGAIN.map((a) => {
                      const hint = approachHint(state, n, a);
                      return (
                        <button key={a} type="button" className={`${btnGhost} min-h-10 justify-start px-3 text-xs`} onClick={() => negArgue(a)}>
                          {APPROACHES[a].label}
                          {hint === "good" ? " 👍" : hint === "bad" ? " ⚠️" : ""}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <button type="button" className={`${btnGhost} mt-3 w-full`} onClick={negWalk}>
                  Walk away
                </button>
              </div>
            ) : null}

            {n.stage === "done" ? (
              <div className="grid gap-3">
                {n.outcome?.agreed ? (
                  <div className={`rounded-xl border p-4 ${QUALITY_TONE[n.outcome.quality]}`}>
                    <p className="text-xs font-semibold tracking-widest uppercase">Agreed</p>
                    <p className="mt-1 font-display text-2xl">{QUALITY_LABEL[n.outcome.quality]}</p>
                    <p className="mt-1 text-sm text-slate-200">{n.outcome.summary}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="font-display text-2xl">No deal</p>
                    <p className="mt-1 text-sm text-slate-300">{n.outcome?.summary}</p>
                  </div>
                )}
                <button type="button" className={btnPrimary} onClick={negClose}>
                  Done
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {n.stage !== "done" ? (
          <p className="border-t border-white/10 px-4 py-2 text-center text-[11px] text-slate-500">Negotiating takes part of your day. Their limits are hidden: read the room.</p>
        ) : null}
      </div>
    </div>
  );
}

function TermList({ title, terms, draft, onChange }: { title: string; terms: Term[]; draft: Draft; onChange: (id: string, patch: Partial<{ included: boolean; amount: number }>) => void }) {
  if (!terms.length) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</p>
      <div className="mt-1.5 grid gap-1.5">
        {terms.map((t) => {
          const d = draft[t.id] ?? { included: t.included, amount: t.amount };
          const adjustable = t.amount != null && t.min != null && t.max != null && t.min !== t.max;
          return (
            <div key={t.id} className={`rounded-xl border px-3 py-2 ${d.included ? "border-white/15 bg-white/[0.07]" : "border-white/5 bg-transparent opacity-80"}`}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-blue-500"
                  checked={d.included}
                  disabled={t.locked}
                  onChange={(event) => onChange(t.id, { included: event.target.checked })}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">
                    {KIND_ICON[t.kind]} {t.label}
                  </span>
                  {t.detail && !/^[a-z_]+$/.test(t.detail) ? <span className="block text-[11px] text-slate-400">{t.detail}</span> : null}
                </span>
                {adjustable ? <span className="shrink-0 tabular-nums text-sm font-semibold">{fmt(d.amount ?? 0, t)}</span> : null}
              </label>
              {adjustable && d.included ? (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg hover:bg-white/15"
                    aria-label={`Lower ${t.label}`}
                    onClick={() => onChange(t.id, { amount: Math.max(t.min!, (d.amount ?? 0) - (t.step ?? 1)) })}
                  >
                    −
                  </button>
                  <input
                    type="range"
                    className="w-full accent-blue-500"
                    min={t.min}
                    max={t.max}
                    step={t.step ?? 1}
                    value={d.amount ?? 0}
                    aria-label={t.label}
                    onChange={(event) => onChange(t.id, { amount: Number(event.target.value) })}
                  />
                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg hover:bg-white/15"
                    aria-label={`Raise ${t.label}`}
                    onClick={() => onChange(t.id, { amount: Math.min(t.max!, (d.amount ?? 0) + (t.step ?? 1)) })}
                  >
                    +
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
