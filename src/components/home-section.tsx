import type { ReactNode } from "react";
import { cn } from "@/components/ui";

/** One homepage section: a small label, a serif heading and one or two lines of copy. */
export function SectionHeader({
  id,
  eyebrow,
  title,
  children,
  action,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
  /** A link on the right, on wide screens. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="mt-3 font-display text-title text-balance">
          {title}
        </h2>
        {children ? <div className="mt-3 text-lede text-pretty text-muted">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Space between homepage sections. */
export const SECTION_GAP = "mt-24 sm:mt-32";

/** A text link with an arrow that nudges on hover. */
export function ArrowLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("group/arrow inline-flex items-center gap-1.5 font-semibold", className)}>
      {children}
      <span aria-hidden className="motion-safe:transition-transform group-hover:translate-x-0.5 group-hover/arrow:translate-x-0.5">
        →
      </span>
    </span>
  );
}
