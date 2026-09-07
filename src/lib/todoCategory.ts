/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FIVE CATEGORIES — one task, one category (QC-chassis round; ref `todo-qc-style.html`).
 *
 * ⚠️ EVERY TASK LANDS IN EXACTLY ONE, AND THAT IS ENFORCED BY THE COMPILER RATHER THAN BY CARE.
 * The switch is exhaustive over `TaskType` and closes with the house `never` idiom, so a
 * thirteenth task type fails to compile until it says which category it belongs to. A default
 * branch would have made "whatever we have not thought about" a silent member of Housekeeping —
 * the same shape as `completionVia`'s default returning a WRITE, which this repo already records
 * as wrong in the expensive direction.
 *
 * ⚠️ URGENT IS A LENS, NOT A CATEGORY, and it is deliberately not in this union. A send whose
 * clock is running is still an Agent request; making it a sixth member would mean a task changing
 * category as time passed, and a board column whose contents drain into another column overnight.
 * `isUrgentCard` below is the lens, and the board never draws it as a column.
 *
 * ⚠️ AND IT DOES NOT RE-DERIVE WHAT `cardBucket` ALREADY DECIDES. A writer's own item is a note
 * whatever else it looks like — that is `cardBucket`'s first branch and its own documented law —
 * so this asks it rather than re-testing `userTaskId ?? nature ?? stream`. Two derivations of
 * "is this the writer's own?" is how they come to disagree.
 */
import { BoardCard } from "./todoBoard";
import { cardBucket } from "./todoBuckets";
import { TaskType, isTaskType } from "./todoActions";

export const CATEGORIES = ["req", "nudge", "quiet", "house", "yours"] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * ⚠️ ONE VOCABULARY: the tile's label, the board column's name and the card's tag all read these.
 * The card's tag is the SINGULAR — "Agent request" beside one task — and the tile and column head
 * are the plural set. Two tables would let a card call itself something the tile does not.
 */
export const CATEGORY_LABEL: Record<Category, string> = {
  req: "Agent requests",
  nudge: "Nudges",
  quiet: "Gone quiet",
  house: "Housekeeping",
  yours: "Your tasks",
};

/** what one card of the category calls itself, on its own tag */
export const CATEGORY_TAG: Record<Category, string> = {
  req: "Agent request",
  nudge: "Nudge",
  quiet: "Gone quiet",
  house: "Housekeeping",
  yours: "Your task",
};

/** the board column's mono caption — what the column is FOR, in the writer's terms */
export const CATEGORY_CAPTION: Record<Category, string> = {
  req: "with you",
  nudge: "worth a nudge",
  quiet: "no reply yet",
  house: "your records",
  yours: "your own notes",
};

/** the family a category paints in — the three papers the pane's hero and the tags already use */
export type Family = "now" | "house" | "yours";
export const CATEGORY_FAMILY: Record<Category, Family> = {
  req: "now", nudge: "now", quiet: "house", house: "house", yours: "yours",
};

/**
 * ⚠️ A NUDGE THAT HAS ALREADY BEEN NUDGED IS NOT A NUDGE — it is a silence, and the difference is
 * the whole of Gone quiet's second feeder.
 *
 * Both feeders reach `db.tsx`'s derivation through `replyTask`, which enforces one decision per
 * query: a stale window raises `no_response_close`, and the writer's own check-in date
 * (`query.nudgeDate`, written by the nudge journey's "If nothing comes back…" answer) raises
 * `nudge_overdue` — THE SAME TYPE a first nudge raises. So the type cannot tell them apart.
 *
 * The discriminator is `lastNudgeSentDate`, which `logNudge` always writes ("the nudge did
 * happen") while `nudgeDate` is absent where the writer declined a check-in. A `nudge_overdue`
 * on a query that has been nudged is the app asking again about a silence it already chased.
 *
 * ⚠️ AND IT IS READ FROM THE CARD, NOT RE-DERIVED HERE (Phase 2 — this is the whole of Phase 2's
 * change to this file). Phase 1 took a `nudgedBefore` boolean and made every caller reach for the
 * queries array to compute it: the tiles did it, the list did it, the board would have, and each
 * one was a fresh chance to answer differently. The derivation that RAISES the task has the query
 * in hand and records `reason` there; this reads it.
 *
 * ⚠️ ABSENT MEANS "NUDGE", AND THAT IS A DECISION RATHER THAN A DEFAULT. A `nudge_overdue` whose
 * reason did not travel is a chase the app cannot prove it has made before, and the honest reading
 * of an unproven chase is the ordinary one. The alternative — treating absence as "already
 * nudged" — would move a first nudge into Gone quiet on the strength of a missing field, which is
 * the app inventing history.
 */
export function taskCategory(card: BoardCard): Category {
  /* the writer's own item is theirs, whatever else it looks like — `cardBucket`'s own first law */
  if (cardBucket(card) === "note") return "yours";
  if (!isTaskType(card.taskType)) {
    /* ⚠️ NOT A `default`, AND THE DISTINCTION MATTERS. This is a card whose taskType is not in the
       census at all — a shape the app does not produce today. It goes to Housekeeping because a
       record the app cannot name is a record to correct, and it is REACHED only by data that has
       already escaped `TASK_TYPES`; the switch below stays exhaustive so a NEW declared type
       cannot arrive here silently. */
    return "house";
  }
  const t: TaskType = card.taskType;
  switch (t) {
    /* ⚠️ AN OFFER AND AN R&R ARE AGENT REQUESTS, and this is the one place the five categories are
       not a relabelling of the six buckets. `cardBucket` calls both `decide` — "the act is a
       judgement rather than a task" — and there is no Decide here; the column they belong to is
       captioned "with you", which is exactly what an offer and a revision are. */
    case "offer_received":
    case "revise_resubmit":
    case "partial_requested":
    case "full_requested":
      return "req";
    case "nudge_overdue":
      return card.reason === "nudge-again" ? "quiet" : "nudge";
    case "no_response_close":
      return "quiet";
    case "data_quality_poor":
    case "querying_unstarted":
    case "dream_agent_unqueried":
    case "materials_unrecorded":
    case "materials_unrecorded_bulk":
    case "weekly_review":
      return "house";
    default: {
      const unhandled: never = t;
      return unhandled;
    }
  }
}

/**
 * THE URGENT LENS — a send the writer owes, whose clock is running.
 *
 * ⚠️ IT IS "HAS A DATE", NOT "IS PAST A THRESHOLD", and the contract's own test says so
 * (`isUrgent = p === 'Send' && w !== '—'`). A request with no date on record is not less urgent;
 * it is UNKNOWN, and animating it would be the page asserting a deadline nobody recorded. The
 * anchor is `waitAnchorMs`'s — the request date for a send — so this and the card's own wait
 * figure cannot come to disagree about whether the clock has started.
 *
 * ⚠️ AND IT READS `days`, WHICH THE PAGE ALREADY DERIVES for every row. A second call to
 * `waitAnchorMs` here would be a second derivation of one fact.
 */
export function isUrgentCard(card: BoardCard, days: number | null | undefined): boolean {
  return cardBucket(card) === "send" && typeof days === "number" && Number.isFinite(days);
}
