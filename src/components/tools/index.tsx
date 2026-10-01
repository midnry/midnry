import type { ReactElement } from "react";
import { ScratchTool } from "@/components/tools/scratch";
import { PulseTool } from "@/components/tools/pulse";
import { SplitTool } from "@/components/tools/split";
import { LedgerTool } from "@/components/tools/ledger";
import { BoardTool } from "@/components/tools/board";
import { InvoiceTool } from "@/components/tools/invoice";
import { GlyphTool } from "@/components/tools/glyph";
import { HabitsTool } from "@/components/tools/habits";
import { ContrastTool } from "@/components/tools/contrast";

const TOOLS: Record<string, () => ReactElement> = {
  scratch: ScratchTool,
  pulse: PulseTool,
  split: SplitTool,
  ledger: LedgerTool,
  board: BoardTool,
  invoice: InvoiceTool,
  glyph: GlyphTool,
  habits: HabitsTool,
  contrast: ContrastTool,
};

export function ToolView({ slug }: { slug: string }) {
  const Tool = TOOLS[slug];
  if (!Tool) return null;
  return <Tool />;
}
