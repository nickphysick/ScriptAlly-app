/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The save notice's contract — where a saved agent ended up, and the sentence that says so.
 *
 * ⚠️ `saveOutcome` ITSELF RETIRED WITH THE v11 LIST (P3): it computed survival and position
 * against the OLD filter set (`agentFilters`), and the page now derives both inline against the
 * v11 pipeline (contactList's facts, filters and sorts) before calling `saveNotice`. The TYPE
 * and the SENTENCES are the surviving contract — the derivation moved, the wording did not.
 * (`sectionFor`/`sectionChanged` went earlier, Phase 7, with the grid's section grouping.)
 */

export type SaveOutcome =
  | { kind: "filtered-out" }
  | { kind: "travel"; index: number; total: number; sortLabel: string };

/**
 * The notice. It exists because a card that travels off-screen otherwise just vanishes — the
 * motion answers "did it save?" only for a destination you can see, and the sentence answers it
 * for one you can't. 1-based: it is read by a person counting rows, not by an array.
 */
export function saveNotice(name: string, outcome: SaveOutcome): string {
  const who = name.trim() || "That agent";
  if (outcome.kind === "filtered-out") return `${who} saved. Not shown under your current filters.`;
  return `${who} saved. Moved to position ${outcome.index} under ${outcome.sortLabel}.`;
}
