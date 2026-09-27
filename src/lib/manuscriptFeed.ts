/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Whether a manuscript write is narrated into the activity feed as "You updated a manuscript's
 * details" (MANUSCRIPT_UPDATED).
 *
 * ⚠️ A WRITE THAT CHANGES `comps` ALONE IS NOT NARRATED (Nick, 27 Sep). Adding, editing, removing,
 * reordering and switching a comp are list maintenance — one reorder put an identical "updated a
 * manuscript's details" line in the feed, and a sitting of edits put dozens (74 had piled up on the
 * harness account). The feed records the query journey, not keystrokes (the reason
 * `updateManuscriptQuiet` exists).
 *
 * ⚠️ SCOPED BY THE WRITE'S KEYS, NOT BY THE CALLER: exactly `{ comps }` is quiet; ANY other key —
 * with or without comps — narrates exactly as before. Gating by caller would leave the next comps
 * surface narrating, and gating on "contains comps" would silence a details edit that happened to
 * carry the list.
 */
import { Manuscript } from "../types";

export function narratesManuscriptWrite(fields: Partial<Manuscript>): boolean {
  const keys = Object.keys(fields);
  return !(keys.length === 1 && keys[0] === "comps");
}
