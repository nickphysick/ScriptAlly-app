/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskRow — WHAT A ROW SAYS ABOUT ITS KIND (tasks-consolidation, Phase 3; ref
 * design-refs/tasks-states.html, sheet 1).
 *
 * ⚠️ THIS MODULE ANSWERS "WHAT IS THIS", NEVER "WHAT MAY I DO WITH IT". The permissions — which
 * verb slots fill at all — are `cardMenu`'s, and they stay there: the row asks the menu, so the
 * two can never disagree about what a card allows. What lives HERE is presentation the menu has
 * no opinion about: which tone the kind pill wears, what the primary verb is CALLED once the menu
 * has said there is one, and how far along its journey the thing is.
 *
 * ⚠️ THE PILL'S TEXT IS `card.kind` — THE VOCABULARY THE APP ALREADY DERIVES. It is the same
 * string the facet chips drew, the same one the snoozed band carries, and the same one the
 * sidebar badge's counting law is written against. A per-kind label table here would be a second
 * vocabulary, and this repo has twice paid for exactly that (see todoFamily's head note). The
 * tone is per-kind; the words are not ours to invent.
 *
 * ⚠️ THE REF DRAWS TWO KINDS THIS APP CANNOT RAISE, and neither is built: DEADLINE (there is no
 * expiring-exclusive task type) and DISMISSED (the ledger's, reached from Task settings, not a
 * group on this page). The shell renders what exists, never what is planned — a row for a kind
 * nothing can produce teaches the wrong shape of the app. Their entries are absent rather than
 * present-and-unreachable, and their verbs (Review, Restore) are recorded in the report.
 */
import { BoardCard } from "./todoBoard";
import { isSweepCard, TodoColumnId } from "./todoColumns";

/* ── the kind pill ─────────────────────────────────────────────────────────────────────────── */

export type PillTone = "offer" | "wait" | "rr" | "sweep" | "stale" | "yours" | "note" | "snoozed" | "done";

export interface RowPill {
  /** The words — always the card's own derived `kind`. */
  label: string;
  tone: PillTone;
}

/**
 * ⚠️ STATE BEATS KIND, AND THAT ORDER IS THE POINT. A finished thing is finished whatever it was,
 * and a sleeping one reads as sleeping — so `done` and `snoozed` are consulted before the task
 * type. It is the same precedence `cardFamily` uses for the band families, restated for the finer
 * per-kind set rather than re-derived from scratch.
 *
 * ⚠️ A SNOOZED CARD KEEPS ITS OWN KIND IN THE WORDS ("AGENT WAITING · 🕐"), and only its TONE
 * changes. The ref draws a bare "SNOOZED" pill; the band grammar locked in tasksAuditGrammar says
 * the kind survives snoozing, with its reason — a row that forgets what it is while it sleeps
 * tells you nothing about what returns. Prose with a reason beats an unreasoned artefact, so the
 * words stay and the tone is what carries the state.
 *
 * Returns null where the card has no kind at all: an empty pill is chrome with nothing in it,
 * which reads as a load failure rather than an absence.
 */
export function rowPill(c: BoardCard, column: TodoColumnId): RowPill | null {
  if (!c.kind) return null;
  const tone: PillTone =
    column === "done" || c.done ? "done"
    : column === "snoozed" ? "snoozed"
    : c.nature === "note" ? "note"
    : c.userTaskId || c.nature === "task" ? "yours"
    : isSweepCard(c) ? "sweep"
    : c.taskType === "no_response_close" ? "stale"
    : c.taskType === "offer_received" ? "offer"
    : c.taskType === "revise_resubmit" ? "rr"
    : "wait";
  return { label: c.kind, tone };
}

/* ── the primary verb's name ───────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE NAME ONLY — WHETHER THERE IS A PRIMARY AT ALL IS THE MENU'S ANSWER. This is called after
 * `cardMenu` has offered a leaf, so a kind that cannot act simply never reaches here.
 *
 * The verbs are the ref's: a sweep is STARTed (it is a walk, not a single act), a stale query is
 * CLOSEd (the one-minute act the card exists to offer), a sleeping card RETURNs, a finished one
 * UNDOes. Everything else opens the dock, which is "Action" — the same word the ⋯ menu's own
 * weighted first line uses, so the button and the menu name one thing once.
 */
export function rowPrimaryLabel(c: BoardCard, column: TodoColumnId): string {
  if (column === "done" || c.done) return "Undo";
  if (column === "snoozed") return "Return";
  if (isSweepCard(c)) return "Start";
  if (c.taskType === "no_response_close") return "Close";
  return "Action";
}

/* ── the journey ───────────────────────────────────────────────────────────────────────────── */

export type StageState = "done" | "now" | "todo";

export interface RowJourney {
  stages: [StageState, StageState, StageState];
  /** What the meter NAMES — the stage, not a percentage. */
  label: string;
}

/**
 * ⚠️ THREE STAGES, AND THEY ARE THE SUBMISSION'S OWN — query out, partial in hand, full in hand.
 * The meter names the stage rather than counting a percentage, because "60%" of a submission is
 * not a thing anybody can act on.
 *
 * ⚠️ IT IS A FUNCTION OF THE TASK TYPE, NOT OF THE QUERY. The engine only raises a
 * `full_requested` task for a query that IS at full-requested — the status is what produced the
 * task — so reading the query again to place the marker would be a second derivation of a fact
 * the first one already carries, and the two could drift. This is the same argument
 * `todoGroups` is built on.
 *
 * An offer shows all three lit: there is no further stage to reach, and a meter with a step still
 * ahead of it would imply there is.
 *
 * Everything else has no journey — a housekeeping sweep is a pile rather than a path, a writer's
 * own task has a shape only they know, and a stale query's story is its silence. The reserved
 * track simply stays empty, which the ref draws too.
 */
export function rowJourney(c: BoardCard, column: TodoColumnId): RowJourney | null {
  if (column === "done" || column === "snoozed" || c.done) return null;
  switch (c.taskType) {
    case "offer_received":
      return { stages: ["done", "done", "done"], label: "OFFER ON THE TABLE" };
    case "partial_requested":
      return { stages: ["done", "now", "todo"], label: "PARTIAL REQUESTED" };
    case "full_requested":
      return { stages: ["done", "done", "now"], label: "FULL REQUESTED" };
    case "revise_resubmit":
      return { stages: ["done", "done", "now"], label: "REVISION IN HAND" };
    default:
      /* ⚠️ `nudge_overdue` IS THE ONE LIVE KIND THE REF DOES NOT DRAW, and it deliberately gets no
         journey rather than an invented one. Its card is about SILENCE — how long since anything
         came back — which is a duration, not a position on a path; the age lane already states
         it. Flagged in the report so the omission reads as a decision. */
      return null;
  }
}
