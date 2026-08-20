/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * paneGate — what each journey REQUIRES before its primary may write.
 *
 * ⚠️ ONE DECLARATION PER JOURNEY, EXHAUSTIVE, CLOSED WITH `never`. A new journey cannot be added
 * without saying what it requires: the switch below fails to compile until it does. That is the
 * guard the house rule asks for, and it is the opposite of the shape this codebase keeps closing —
 * a permissive default that ships every new kind with someone else's behaviour attached.
 *
 * ⚠️ AND THE REQUIREMENT IS A LIST OF FIELDS, NOT A BOOLEAN. "Is this complete?" cannot tell the
 * writer WHICH answer is missing, and the whole of the gate's behaviour — scroll to it, focus it,
 * flash its label — needs the field's identity. So the validator returns the first missing field's
 * key, and the pane finds it by `data-req`.
 *
 * ⚠️ THE GATE DOES NOT WRITE AND DOES NOT KNOW HOW. It runs pane-side, ahead of the same single
 * commit path the takeover uses; a gate that also committed would be a second write path, which is
 * the standing law in `ToDoPage.tsx` and the reason this file is pure.
 */
import { BoardCard } from "./todoBoard";
import { cardBucket } from "./todoBuckets";

/**
 * The journeys the pane draws. `bulk` is its own member rather than a flag on `fix`: the two are
 * the same BUCKET and completely different questions — one query's materials against a cohort's —
 * and folding them would make the required-fields table lie about one of them.
 */
export type JourneyKind = "send" | "decide" | "chase" | "close" | "fix" | "bulk" | "note";

/** The keys the pane's labels carry as `data-req`, so the gate can find the field it names. */
export type ReqField = "unit" | "when" | "expect" | "remind" | "rows";

/** A bulk card stands for a SET; every other fill-in stands for one query. */
export const isBulkCard = (c: BoardCard): boolean => c.taskType === "materials_unrecorded_bulk";

export function journeyKind(c: BoardCard): JourneyKind {
  const b = cardBucket(c);
  if (b === "fix" && isBulkCard(c)) return "bulk";
  return b;
}

/**
 * ⚠️ WHAT EACH JOURNEY REQUIRES, AND THE EMPTY LISTS ARE DECISIONS RATHER THAN GAPS.
 *
 * A NOTE requires nothing: ticking it off is the whole act, and the tick carries its own date.
 * A CHASE requires nothing here either — its own journey asks its own questions and this pane's
 * form has none to withhold. Both are stated as `[]` rather than omitted, because an omission
 * would be indistinguishable from having forgotten them.
 */
export function requiredFor(kind: JourneyKind): ReqField[] {
  switch (kind) {
    /* the parcel, the day, the expectation and the reminder — the four the send form asks */
    case "send": return ["unit", "when", "expect", "remind"];
    /* closing records a day and nothing else; there is no parcel and nothing to expect */
    case "close": return ["when"];
    /* one query's materials: the parcel, and the day it went */
    case "fix": return ["unit", "when"];
    /* a cohort: at least one row touched. There is no single field to scroll to — see the pane */
    case "bulk": return ["rows"];
    case "note": return [];
    case "decide": return [];
    case "chase": return [];
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}

/** What the pane knows about the answers so far — supplied by the form, never read from the DOM. */
export interface GateAnswers {
  /** a unit chosen AND an amount in it — or a full manuscript, which has no unit to pick */
  unit: boolean;
  when: boolean;
  expect: boolean;
  remind: boolean;
  /** bulk: at least one row touched */
  rows: boolean;
}

/**
 * The first requirement the writer has not met, or `null` when the journey may commit.
 *
 * ⚠️ FIRST IN THE DECLARATION'S OWN ORDER, which is the order the form asks them in — so the field
 * the pane scrolls to is the first one going DOWN the page, not whichever the object happened to
 * enumerate first.
 */
export function firstMissing(kind: JourneyKind, a: GateAnswers): ReqField | null {
  for (const f of requiredFor(kind)) if (!a[f]) return f;
  return null;
}

export const gateOpen = (kind: JourneyKind, a: GateAnswers): boolean => firstMissing(kind, a) === null;
