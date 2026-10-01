import { useId } from "react";
import { cn } from "@/components/ui";

const KINDS = {
  scratch: "note",
  pulse: "timer",
  split: "split",
  ledger: "bars",
  board: "columns",
  invoice: "invoice",
  glyph: "braces",
  habits: "check",
  contrast: "contrast",
  compressor: "film",
  chat: "chat",
  planner: "calendar",
} as const;

type Kind = (typeof KINDS)[keyof typeof KINDS] | "letter";

function kindFor(slug: string): Kind {
  if (slug in KINDS) return KINDS[slug as keyof typeof KINDS];
  return "letter";
}

export function AppMark({
  slug,
  name,
  className,
}: {
  slug: string;
  name?: string;
  className?: string;
}) {
  const raw = useId().replace(/:/g, "");
  const fill = `url(#${raw})`;
  const kind = kindFor(slug);
  const letter = (name || slug).trim().charAt(0).toUpperCase() || "M";

  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-10 shrink-0", className)}>
      <defs>
        <linearGradient id={raw} x1="12" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3D9BFF" />
          <stop offset="1" stopColor="#1A46E0" />
        </linearGradient>
      </defs>
      <path
        d="M44.2 9.1A26 26 0 1 0 54.9 19.7"
        fill="none"
        stroke={fill}
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <circle cx="52.4" cy="12.2" r="3.3" fill={fill} />
      {kind === "note" ? <Note fill={fill} /> : null}
      {kind === "timer" ? <Timer fill={fill} /> : null}
      {kind === "split" ? <Split fill={fill} /> : null}
      {kind === "bars" ? <Bars fill={fill} /> : null}
      {kind === "columns" ? <Columns fill={fill} /> : null}
      {kind === "invoice" ? <Invoice fill={fill} /> : null}
      {kind === "braces" ? <Braces fill={fill} /> : null}
      {kind === "check" ? <Check fill={fill} /> : null}
      {kind === "contrast" ? <Contrast fill={fill} /> : null}
      {kind === "film" ? <Film fill={fill} /> : null}
      {kind === "chat" ? <Chat fill={fill} /> : null}
      {kind === "calendar" ? <Calendar fill={fill} /> : null}
      {kind === "letter" ? (
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fill={fill}
          fontFamily="Outfit, ui-sans-serif, sans-serif"
          fontSize="22"
          fontWeight="600"
        >
          {letter}
        </text>
      ) : null}
    </svg>
  );
}

function Note({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="23" y="20" width="18" height="24" rx="3" fill={fill} />
      <rect x="27" y="26" width="10" height="1.7" rx="0.8" fill="#f4f7fb" />
      <rect x="27" y="30.2" width="10" height="1.7" rx="0.8" fill="#f4f7fb" />
      <rect x="27" y="34.4" width="6.5" height="1.7" rx="0.8" fill="#f4f7fb" />
    </g>
  );
}

function Timer({ fill }: { fill: string }) {
  return (
    <g fill="none" stroke={fill} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="33.5" r="9.5" />
      <path d="M32 28.2V33.6H36.4" />
    </g>
  );
}

function Split({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      <rect x="21.5" y="24" width="8" height="16" rx="4" />
      <rect x="34.5" y="24" width="8" height="16" rx="4" />
    </g>
  );
}

function Bars({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      <rect x="21.5" y="31" width="5.5" height="11" rx="1.6" />
      <rect x="29.2" y="23" width="5.5" height="19" rx="1.6" />
      <rect x="37" y="27" width="5.5" height="15" rx="1.6" />
    </g>
  );
}

function Columns({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      <rect x="19.5" y="22" width="7" height="20" rx="2" />
      <rect x="28.5" y="22" width="7" height="13" rx="2" />
      <rect x="37.5" y="22" width="7" height="16" rx="2" />
    </g>
  );
}

function Invoice({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M23 20h12l6 6v18a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3V23a3 3 0 0 1 3-3z" fill={fill} />
      <path d="M35 20v6h6" fill="#f4f7fb" />
      <rect x="26" y="32" width="12" height="1.7" rx="0.8" fill="#f4f7fb" />
      <rect x="26" y="36.2" width="8" height="1.7" rx="0.8" fill="#f4f7fb" />
    </g>
  );
}

function Braces({ fill }: { fill: string }) {
  return (
    <g fill="none" stroke={fill} strokeWidth="3.2" strokeLinecap="round">
      <path d="M29 23.5c-5 1.6-5 15.4 0 17" />
      <path d="M35 23.5c5 1.6 5 15.4 0 17" />
    </g>
  );
}

function Check({ fill }: { fill: string }) {
  return (
    <path
      d="M23.5 33.2 29 38.6 41.2 25.2"
      fill="none"
      stroke={fill}
      strokeWidth="3.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Contrast({ fill }: { fill: string }) {
  return (
    <g fill="none" stroke={fill} strokeWidth="3.2">
      <circle cx="27.5" cy="33" r="7.2" />
      <circle cx="36.5" cy="33" r="7.2" />
    </g>
  );
}

function Film({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      <rect x="20" y="24" width="24" height="16" rx="2.5" />
      <rect x="23" y="27.2" width="2.2" height="2.2" rx="0.4" fill="#f4f7fb" />
      <rect x="23" y="34.6" width="2.2" height="2.2" rx="0.4" fill="#f4f7fb" />
      <rect x="38.8" y="27.2" width="2.2" height="2.2" rx="0.4" fill="#f4f7fb" />
      <rect x="38.8" y="34.6" width="2.2" height="2.2" rx="0.4" fill="#f4f7fb" />
      <path d="M30 29.2v6.2l5.2-3.1z" fill="#f4f7fb" />
    </g>
  );
}

function Chat({ fill }: { fill: string }) {
  return <path d="M20 24a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H30l-7 6v-6h-1a4 4 0 0 1-2-3.5z" fill={fill} />;
}

function Calendar({ fill }: { fill: string }) {
  return (
    <g fill="none" stroke={fill} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="21" y="24" width="22" height="18" rx="2.5" />
      <path d="M21 30h22M27 21v6M37 21v6" />
    </g>
  );
}
