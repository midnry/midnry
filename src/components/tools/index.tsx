import type { ReactElement } from "react";
import { ScratchTool } from "@/components/tools/scratch";
import { SplitTool } from "@/components/tools/split";
import { LedgerTool } from "@/components/tools/ledger";
import { InvoiceTool } from "@/components/tools/invoice";
import { GlyphTool } from "@/components/tools/glyph";
import { ContrastTool } from "@/components/tools/contrast";
import { CompressorTool } from "@/components/tools/compressor";
import { PlannerTool } from "@/components/tools/planner";
import { ApplyTool } from "@/components/tools/apply";
import { RemindTool } from "@/components/tools/remind";
import { CycleTool } from "@/components/tools/cycle";
import { MedsTool } from "@/components/tools/meds";
import { StudioTool } from "@/components/tools/studio";
import { StudyTool } from "@/components/tools/study";
import { KitTool } from "@/components/tools/kit";
import { getKit } from "@/lib/kits";

const TOOLS: Record<string, () => ReactElement> = {
  scratch: ScratchTool,
  split: SplitTool,
  ledger: LedgerTool,
  invoice: InvoiceTool,
  glyph: GlyphTool,
  contrast: ContrastTool,
  compressor: CompressorTool,
  planner: PlannerTool,
  apply: ApplyTool,
  tasks: RemindTool,
  cycle: CycleTool,
  meds: MedsTool,
  write: StudioTool,
  study: StudyTool,
};

export function ToolView({ slug }: { slug: string }) {
  const Tool = TOOLS[slug];
  if (Tool) return <Tool />;
  if (getKit(slug)) return <KitTool slug={slug} />;
  return null;
}
