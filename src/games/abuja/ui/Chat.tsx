import type { ReactNode } from "react";
import type { Look } from "../systems/character";
import type { Looks } from "../systems/types";
import { Avatar } from "./Avatar";

/** A speech bubble with the speaker's face peeking over the top. */
export function ChatBubble({ name, looks, adult, children }: { name: string; looks: Looks | Look; adult: boolean; children: ReactNode }) {
  return (
    <div className="relative pt-12">
      <div className="absolute top-0 left-5 z-10 flex size-[4.6rem] items-end justify-center overflow-hidden rounded-full border-[3px] border-slate-900 bg-sky-100">
        <Avatar looks={looks} adult={adult} crop="head" size={74} />
      </div>
      <div className="relative rounded-3xl border-[3px] border-slate-900 bg-white text-slate-900 shadow-[0_6px_0_rgba(15,23,42,0.35)]">
        <div className="flex items-center gap-2 rounded-t-[1.3rem] border-b-[3px] border-slate-900 bg-slate-100 py-2 pr-4 pl-28">
          <span className="text-lg leading-none tracking-[0.2em]" aria-hidden>
            •••
          </span>
          <span className="truncate text-sm font-bold">{name}</span>
        </div>
        <div className="px-4 pt-3 pb-4 text-[15px] leading-relaxed text-pretty">{children}</div>
        <span className="absolute -bottom-[14px] left-8 size-6 rotate-45 border-r-[3px] border-b-[3px] border-slate-900 bg-white" aria-hidden />
      </div>
    </div>
  );
}

/** Your reply, as a small green bubble with your face. */
export function ReplyButton({ looks, adult, disabled, note, onClick, children }: { looks: Looks | Look; adult: boolean; disabled?: boolean; note?: string | null; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-2xl border-2 border-slate-900 bg-blue-500 py-2 pr-2 pl-3 text-left text-sm font-semibold text-white shadow-[0_3px_0_rgba(15,23,42,0.35)] transition hover:bg-blue-400 disabled:bg-slate-500 disabled:opacity-60"
    >
      <span className="min-w-0 flex-1">
        {children}
        {note ? <span className="mt-0.5 block text-xs font-normal text-white/85">{disabled ? "🔒" : "⚠️"} {note}</span> : null}
      </span>
      <span className="flex size-9 shrink-0 items-end justify-center overflow-hidden rounded-full border-2 border-slate-900 bg-sky-100">
        <Avatar looks={looks} adult={adult} crop="head" size={36} />
      </span>
    </button>
  );
}
