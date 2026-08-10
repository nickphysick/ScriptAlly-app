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
import { cardMenu, MenuItemId } from "./todoMenu";
import { TaskGroupId } from "./todoGroups";

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

/* ── the split button's weight (Fix 4 revision; ref design-refs/todo-weight-slider-v1.html) ───── */

export type SplitWeight = "filled" | "outlined";

/**
 * ⚠️ WEIGHT FOLLOWS THE GROUP, NEVER THE ROW — and that is the whole argument. The page has
 * already sorted urgency into groups and SAID SO in each heading ("An agent is waiting, or a date
 * is" against "none of it urgent"). Weighting per row would put that same judgement in a second
 * place, and two judgements about one thing eventually disagree. Ten filled-ink buttons stacked
 * down Housekeeping was the page shouting at you about tidying.
 *
 * ⚠️ IT ASKS "IS THIS THE URGENT GROUP", NOT "IS IT ONE OF THE QUIET ONES". A list of the quiet
 * groups is a list that a NEW group joins by being forgotten — and the forgotten default would be
 * filled ink, which is the loud one. Stated positively, anything added later is outlined until
 * someone deliberately says otherwise.
 *
 * ⚠️ THIS SUPERSEDES THE SPLITGUARD REF, which draws every split filled. The weight sheet is the
 * later artefact and gives its reason; a reasoned value beats an unreasoned one.
 *
 * Both weights keep the identical 118px footprint and all four guards, so a row moving between
 * groups changes colour and nothing else — no reflow, no width change, the column still aligned.
 */
export function splitWeight(group: TaskGroupId): SplitWeight {
  return group === "now" ? "filled" : "outlined";
}

/* ── the split button's menu (fix pack Fix 4; ref design-refs/todo-splitguard-v1.html) ────────── */

export interface SplitItem {
  id: MenuItemId;
  glyph: string;
  label: string;
  /** The number key that fires it directly, where it has one. */
  hint?: string;
  /** ⚠️ A VERB THAT DOES NOT APPLY IS GREYED, NEVER ABSENT — an absent row is a puzzle, a greyed
   *  one is an answer. `why` becomes the control's title so the answer is readable. */
  enabled: boolean;
  why?: string;
}

export interface SplitSection {
  head: "SNOOZE" | "THIS QUERY" | null;
  /** The last section sits below a dead zone and a rule; nothing destructive is within a
   *  pointer's drift of the caret. */
  danger?: true;
  items: SplitItem[];
}

/**
 * ⚠️ THE SHAPE IS THE REF'S; THE PERMISSIONS ARE `cardMenu`'s. This function decides what the
 * split's menu LOOKS like — the two sections, the order, the dead zone's contents — and asks the
 * existing menu model whether each verb is live. That keeps one answer to "may this card do this"
 * across the row, the ⋯ grammar and the keyboard, which is the property the whole page is built
 * on; a second permission table here is exactly how an offer comes to be dismissible on one
 * surface and not another.
 *
 * ⚠️ "EDIT LAST ENTRY" MAPS TO `edit-task`, AND IS GREY ON A DERIVED CARD. There is no primitive
 * for editing a query's last activity, and inventing one is not a fix-pack's job. On a writer's
 * own item the row IS their entry, so the verb is honest and live; on an agent-derived card there
 * is no entry of yours to edit, and grey says so.
 *
 * ⚠️ "STOP SHOWING THIS KIND" IS THE MUTE, NOT A SECOND DISMISS. It reaches `hideType` through
 * `dismiss-rule`, the same leaf the sweep fork already used; `laterHideKey` is what decides
 * whether the card's type HAS a rule to mute, and returns null for offers.
 */
export function splitMenu(
  card: BoardCard,
  column: TodoColumnId,
  hideKey: string | null,
): SplitSection[] {
  const model = cardMenu(card, column);
  const live = (id: MenuItemId): boolean =>
    model.some((g) => g.entries.some((e) =>
      e.kind === "leaf" ? e.id === id && !e.disabled : e.sub.some((sx) => sx.id === id && !sx.disabled)));
  const isOffer = card.taskType === "offer_received";

  return [
    {
      head: "SNOOZE",
      items: [
        { id: "snooze-1", glyph: "◷", label: "Tomorrow", hint: "1", enabled: live("snooze-1") },
        {
          id: "snooze-7", glyph: "◷", label: "Next week", hint: "2", enabled: live("snooze-7"),
          why: isOffer ? "An offer has a reply-by date that is not yours to move." : undefined,
        },
      ],
    },
    {
      head: "THIS QUERY",
      items: [
        { id: "open-query", glyph: "↗", label: "Open the query", enabled: live("open-query") },
        {
          id: "edit-task", glyph: "✎", label: "Edit last entry", enabled: live("edit-task"),
          why: live("edit-task") ? undefined : "There is no entry of yours on this one to edit.",
        },
      ],
    },
    {
      head: null,
      danger: true,
      items: [
        {
          id: "dismiss-week", glyph: "×", label: "Dismiss", enabled: live("dismiss-week"),
          why: isOffer ? "An offer has a reply-by date that is not yours to move." : undefined,
        },
        {
          id: "dismiss-rule", glyph: "⊘", label: "Stop showing this kind", enabled: !!hideKey,
          why: hideKey ? undefined : "This kind has no standing rule to mute.",
        },
      ],
    },
  ];
}

/** The two number keys the menu answers directly — one source, so the hint and the handler agree. */
export const SPLIT_NUMBER_KEYS: Record<string, MenuItemId> = { "1": "snooze-1", "2": "snooze-7" };
