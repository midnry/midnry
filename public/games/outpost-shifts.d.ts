export function dailyKey(date?: Date): string;
export function dailyScore(run: {
  won: boolean;
  seconds: number;
  correctVotes?: number;
  crewAlive?: number;
  rescued?: number;
}): number;
