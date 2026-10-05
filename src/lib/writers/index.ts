import { FORM_WRITERS, type Piece, type Values, type Writer } from "./forms.ts";
import { READERS } from "./readers.ts";

export type { Piece, Values, Writer };

/** Midnry's built-in writers, by app slug. They run on the device, with no key. */
export const WRITERS: Record<string, Writer> = { ...FORM_WRITERS, ...READERS };
