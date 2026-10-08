/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactStrip — two small facts read across the Contact list: a stated reply window, and whether an agent takes the
 * book. They began as the v13 numbers strip's helpers; the strip itself is retired (Contact list v15 §3 — the desk,
 * lib/contactDesk, replaces it) and these two stay because the next-step section, the rows and the pills read them.
 */
import type { Agent } from "../types";
import { takesBook } from "./genreMatch";

/** A stated reply window: a positive number of weeks. The quick-add stub `0` and an absent value
 *  are both "not stated". */
export const statedWeeks = (a: Pick<Agent, "responseTimeWeeks">): number | null =>
  typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;

/** Does the agent take the book — its main genre or any subGenre (Contact list v14, ruling Q5; `book` is
 *  `bookGenres(manuscript)`). One definition for the strip, the section, the pills and the row ticks. */
export function fitsGenre(a: Pick<Agent, "genres">, book: readonly string[]): boolean {
  return takesBook(a.genres, book);
}

/* ⚠️ RETIRED (Contact list v15 §3): `stripFacts` / `StripFacts` — the numbers strip's figures. The desk (lib/contactDesk)
   replaces the strip; `statedWeeks` and `fitsGenre` above stay, read across the page. */
