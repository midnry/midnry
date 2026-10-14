export type MatchOption = { id: string; icon: string; name: string; text: string };
export const MODIFIERS: readonly MatchOption[];
export const TWISTS: readonly MatchOption[];
export function modifierOf(id: unknown): MatchOption | null;
export function twistOf(id: unknown): MatchOption | null;
export function modifierChoice(value: unknown): string;
export function shuffled<T>(list: readonly T[], random: () => number): T[];
export function rollMatch(
  random: () => number,
  choice?: string,
): { modifier: string; twist: string };
export function dealSupplies<T extends { id: string; name: string; supplyId: string; stock: number }>(
  random: () => number,
  cabinets: readonly T[],
  manifest: readonly { id: string; name: string; required: number }[],
  spare?: number,
): T[];
export function liveSites<T extends { room: string }>(random: () => number, sites: readonly T[]): T[];
