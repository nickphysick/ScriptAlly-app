/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoJourneys — which journey a card opens, and the three ways a query closes (journeys pack,
 * Phase 4; ref design-refs/todo-workspace-v14.html).
 *
 * ⚠️ THESE LIVE IN `lib/` SO THEY CAN BE TESTED AS FUNCTIONS. `FocusFlow.tsx` imports `db.tsx`,
 * which initialises Firebase at module load, so anything exported from the component can only ever
 * be asserted as a source STRING — and a source lock cannot see a runtime crash, only that code was
 * written. The routing table and the close outcomes are pure, so they belong here beside
 * `todoBuckets` and `journeyMaterials` for the same reason those do.
 *
 * ⚠️ AND A BUCKET IS NOT A JOURNEY. `cardBucket` answers "what kind of act is this" — the pill on
 * the card — while this answers "which recording surface opens". They agree for five of the six and
 * DELIBERATELY differ for the R&R, whose act is a judgement (`decide`) and whose recording is a
 * send. Collapsing the two is what made the R&R's materials unreachable once already.
 */
import { BoardCard } from "./todoBoard";
import { QueryStatus } from "../types";

export type CardJourney = "offer" | "send" | "resubmit" | "nudge" | "stale" | "dq" | "note";

/**
 * ⚠️ THE ORDER OF THESE BRANCHES IS THE ORDER OF THEIR CERTAINTY, matching `cardBucket`'s: a
 * writer's own item is a note whatever else it looks like, and only then does the task type decide.
 */
export function cardJourney(c: BoardCard): CardJourney {
  if (c.userTaskId) return "note";
  if (c.taskType === "offer_received") return "offer";
  /* ⚠️ AN R&R IS ITS OWN JOURNEY, not a send with a different label. It is the one stage where a
     SECOND row is pre-ticked by default, and its reference panel shows the agent's notes rather
     than their ask — two differences a shared journey would have to branch on internally. */
  if (c.taskType === "revise_resubmit") return "resubmit";
  if (c.taskType === "nudge_overdue") return "nudge";
  if (c.taskType === "no_response_close") return "stale";
  if (c.taskType === "data_quality_poor") return "dq";
  return "send";
}

/**
 * ⚠️ THE TWO TASK TYPES THAT ARE GENUINELY SENDS, NAMED. Everything else that falls past
 * `cardJourney`'s branches used to land in the send sheet and be offered "Mark sent" for something
 * that is not a send; naming them here is what lets the fall-through hand off instead.
 *
 * ⚠️ THE HAND-OFF IS THE FALL-THROUGH ONLY — it never fronts `offerSheet` or `dqSheet`. Ruled and
 * accepted; the full reasoning sits on `handoffSheet` in `FocusFlow.tsx`. In one line: the mockup's
 * hand-offs existed because it had neither flow, and this app has both.
 *
 * ⚠️ `exclusive_expiring` IS THE ONE DECLARED TYPE WITH NO PRODUCER, and if it is ever built it
 * wants its OWN journey and its own row in `todoBuckets`, not this generic hand-off — an exclusive
 * running out is a deadline with a decision attached, which is nothing like a housekeeping gap.
 */
export const SEND_TASK_TYPES = ["partial_requested", "full_requested"] as const;
export const isSendTask = (taskType?: string): boolean =>
  (SEND_TASK_TYPES as readonly string[]).includes(taskType ?? "");

/**
 * ⚠️ THREE WAYS A QUERY CLOSES, AND THEY ARE NOT THE SAME EVENT. A silence, a pass you saw but
 * never logged, and a withdrawal are three different facts about what happened. Folding them into
 * one "closed" would make the response rate a number that means nothing — a pass IS a response, a
 * silence is not, and a withdrawal is neither. Each carries its own `QueryStatus`, so
 * `recomputeQuery` stays the single writer of everything derived from it.
 */
export type CloseReason = "no_reply" | "off_record" | "withdrawn";

export const CLOSE_REASONS: { key: CloseReason; label: string; gloss: string; status: QueryStatus }[] = [
  { key: "no_reply", label: "No reply within their window", gloss: "Silence past a stated window", status: QueryStatus.NO_RESPONSE },
  { key: "off_record", label: "A pass arrived off the record", gloss: "You saw it but never logged it", status: QueryStatus.REJECTED },
  { key: "withdrawn", label: "You withdrew the query", gloss: "You pulled it yourself", status: QueryStatus.WITHDRAWN },
];
