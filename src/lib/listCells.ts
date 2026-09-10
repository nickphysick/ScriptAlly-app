/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIST ROW'S FIVE CELLS — ported from `design-refs/todo-three-views-contract.html`.
 *
 * The contract's list is the Query Centre's table: Task · Agent · Asked · Where it stands ·
 * Actions. Three of those need a derivation, and this is it — the verb the row offers, the
 * sentence about where the query stands, the mono line beneath it, and the date chip's two halves.
 *
 * ⚠️ THE SPAN IS `listFragment`'s, NEVER RE-DERIVED. That function already answers "how long, in
 * what unit" for every bucket, and the board's card and the grid's ticket both read it. A second
 * derivation here is how a list comes to say 15 months beside a board saying 16 weeks about one
 * query — and both would be defensible on their own terms, which is what makes it expensive.
 *
 * ⚠️ AND THE COPY IS THE CONTRACT'S OWN, EXCEPT WHERE THE CONTRACT HAS NO CARD OF THAT KIND. The
 * ref draws six task verbs — Send · Nudge · Close · Quiet · Fix · Note — and this app buckets by
 * six that are not quite the same six: it has `decide` (an offer or an R&R) where the ref has
 * `Quiet` (a silence after a nudge). Every string below is the ref's except `decide`'s, which is
 * built from words the card already carries — its own `Came in` anchor — rather than invented.
 */
import { cardBucket, type Bucket } from "./todoBuckets";
import { listFragment, type RowInputs } from "./taskListRow";

/**
 * The row's contextual verb.
 *
 * ⚠️ A VERB PER BUCKET, EXHAUSTIVELY — never a default. An unrecognised bucket is the case nobody
 * has thought about, and this repo's standing rule is that such a case does nothing rather than
 * offering the nearest neighbour's action. Declared as a `Record` so a new bucket fails to compile.
 */
export const LIST_VERB: Record<Bucket, string> = {
  send: "Mark sent",
  chase: "Log a nudge",
  close: "Close it",
  decide: "Decide",
  fix: "Fill it in",
  note: "Tick it off",
};

/** `.l1` — a plain sentence with one emphasised fragment, as the contract writes it */
export interface StandsLine { before: string; strong: string; after: string }

const EM_DASH = "—";

/**
 * ⚠️ THE BUCKET IS DERIVED HERE, NOT PASSED IN — and the first form of this took it as an argument.
 * `listFragment` derives its own from the card, so a caller handing in a different one would have
 * had the sentence and the figure beneath it describing two different kinds of task, silently. Its
 * own unit test caught it: a fixture card that buckets as `fix` returned a send's sentence over a
 * fix's figure. One derivation, one answer.
 */
export function listStands(i: RowInputs, anchorDate: string | null): StandsLine {
  const bucket = cardBucket(i.card);
  const on = anchorDate && anchorDate !== EM_DASH ? anchorDate : "";
  switch (bucket) {
    /* the ref's own: the MATERIAL is the emphasis, because what is owed is what has not gone */
    case "send": return { before: "", strong: i.partial ? "Partial" : "Full", after: " — not yet sent" };
    case "chase": return on
      ? { before: "Their window closed ", strong: on, after: "" }
      : { before: "Past their stated window", strong: "", after: "" };
    case "close": return on
      ? { before: "No reply since ", strong: on, after: "" }
      : { before: "No reply on record", strong: "", after: "" };
    /* ⚠️ THE ONE LINE THE REF DOES NOT DRAW. Its `Quiet` card is a silence after a nudge; this
       app's `decide` is an offer or an R&R, which is a different thing entirely and must not
       borrow that sentence. Both fragments here are already on the card. */
    case "decide": return on
      ? { before: "Came in ", strong: on, after: "" }
      : { before: "Came in", strong: "", after: "" };
    case "fix": return { before: "Materials ", strong: "not recorded", after: "" };
    case "note": return { before: "Ticking it off is what finishes it", strong: "", after: "" };
    default: { const unhandled: never = bucket; return unhandled; }
  }
}

/**
 * `.l2` — the mono sub-line.
 *
 * The figure and its unit come from `listFragment`; the phrasing around them is the ref's. Where
 * the fragment has no figure at all it states the absence in its own words rather than printing a
 * sentence with a hole in it.
 */
export function listSub(i: RowInputs, anchorDate: string | null): string {
  const bucket = cardBucket(i.card);
  const f = listFragment(i);
  if (bucket === "fix") {
    const on = anchorDate && anchorDate !== EM_DASH ? anchorDate : "";
    return on ? `imported ${on}` : f.lead;
  }
  if (f.absent || !f.figure) return f.lead;
  const span = `${f.figure} ${f.tail ?? ""}`.trim();
  switch (bucket) {
    case "send": return `${span} since request`;
    case "chase": return `${span} past window`;
    case "close": return `silent ${span}`;
    case "decide": return `open ${span}`;
    case "note": return `added ${span}`;
    default: return span;
  }
}

/**
 * The Query Centre's date chip, as two halves.
 *
 * ⚠️ IT SPLITS THE DATE THE ROW ALREADY HOLDS rather than re-formatting from a timestamp. The
 * anchor is whatever `listRowInputs` resolved — "1 August", "14 March 2024" — and the chip is a
 * PRESENTATION of it, so a chip and the sentence beside it cannot come to name two different days.
 */
/** the row's verb, from the card — one derivation, as above */
export const listVerb = (i: RowInputs): string => LIST_VERB[cardBucket(i.card)];

export function dateChip(anchorDate: string | null): { mon: string; day: string } {
  const raw = (anchorDate ?? "").trim();
  if (!raw || raw === EM_DASH) return { mon: "", day: EM_DASH };
  const parts = raw.split(/\s+/);
  const day = parts[0] ?? EM_DASH;
  const mon = parts[1] ? parts[1].slice(0, 3).toUpperCase() : "";
  return { mon, day };
}
