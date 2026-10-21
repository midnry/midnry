export type Character = { id: string; name: string; role: string; accent: string };
export const CHARACTERS: readonly Character[];
export function characterOf(id: string | null | undefined): Character;
export function botCharacter(salt: string, index: number, mine?: string): string;
