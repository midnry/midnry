/**
 * Apps that were merged into another app. Old links (/apps/<old>, /discover/<old>)
 * redirect to the app that now holds them; `view` opens the right part of it.
 * Saved data stays where it is: the receiving app reads the old documents.
 */
export type AppAlias = { to: string; view?: string };

export const APP_ALIASES: Record<string, AppAlias> = {};

export function aliasOf(slug: string): AppAlias | undefined {
  return Object.hasOwn(APP_ALIASES, slug) ? APP_ALIASES[slug] : undefined;
}
