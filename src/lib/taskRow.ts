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
import { completionVia } from "./todoActions";
import { liveFamily } from "./todoFamily";

/* ── the kind pill ─────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE TONE IS THE FAMILY NOW, NOT THE KIND (rail + workspace, Phase 3). Nine per-kind hues
 * became five family tones, and the WORDS did not change — the pill still says Offer, Chase,
 * Data gap, Stale, because that is what a pill is for. Nine hues were never legible as nine
 * meanings; the words always were. The paint lives in `todoFamily`'s FAMILY_PILL with every other
 * colour vocabulary in this app, so the row component restates no hex.
 */
export type PillTone = "urgent" | "housekeeping" | "yours" | "done" | "snoozed";

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
  /* ⚠️ THE TWO STATES ARE STILL CONSULTED FIRST, and the live case now DEFERS TO `liveFamily`
     rather than re-deciding. That is the whole gain: the pill, the group heading and the sidebar
     badge cannot file one card three ways, because there is one answer to "what family is this"
     and this reads it. The nine-branch ladder that used to sit here was a fourth derivation of
     facts `liveFamily` already holds. */
  const tone: PillTone =
    column === "done" || c.done ? "done"
    : column === "snoozed" ? "snoozed"
    : liveFamily(c);
  return { label: c.kind, tone };
}

/* ── the title's two weights ───────────────────────────────────────────────────────────────── */

export interface RowTitleParts {
  before: string;
  /** The emphasised span — empty when there is nothing to emphasise. */
  name: string;
  after: string;
}

/**
 * ⚠️ THE NAME IS BOLD INSIDE A REGULAR TITLE, AND THE SPLIT IS DATA-BACKED (Phase 3). `BoardCard`
 * carries `who` — "the emphasised name (agent / subject) inside the title", its own words — so
 * this finds that substring rather than guessing at one. No markup is built and nothing is parsed:
 * the caller renders three plain strings.
 *
 * ⚠️ THE VERB IS NOT SEPARABLE AND SO IT IS NOT BOLDED. The ref bolds the verb as well, but its
 * fixtures carry `<b>` inside the title string; the app composes the title as one sentence
 * ("Send your full to Bethany Carter") and records only the NAME as a distinct field. Bolding a
 * leading word count would be a guess that breaks on the first title that does not start with its
 * verb — "Bethany Carter has made an offer". One weight change, on the half the data can prove.
 *
 * Absent `who`, or a `who` that does not occur in the title, yields the whole title unemphasised:
 * a user's own task has no subject, and a fabricated emphasis is worse than none.
 */
export function rowTitleParts(c: BoardCard): RowTitleParts {
  const i = c.who ? c.title.indexOf(c.who) : -1;
  if (i === -1) return { before: c.title, name: "", after: "" };
  return { before: c.title.slice(0, i), name: c.who, after: c.title.slice(i + c.who.length) };
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
  /* ⚠️ A WRITER'S OWN ITEM IS COMPLETED, NOT "ACTIONED" (icon-cluster P2). The split button never
     drew this branch — `cardMenu` offers a user task no primary, so the button simply did not
     render and the word was never needed. The cluster has a FIXED first slot, so the deed is
     always named; "Action" there would promise a flow that does not exist. Kept in the same
     position as `rowPrimaryIcon`'s `task` branch so the two stay line for line. */
  if (completionVia(c) === "user-task") return "Complete";
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

/* ── the reversal glyph (rail + workspace, Phase 3) ───────────────────────────────────────────── */

/**
 * ⚠️ THE VARYING FIRST GLYPH IS RETIRED, AND THE CUT FALLS ON KIND-VERSUS-STATE. It used to name
 * every row's primary deed in seven marks; the workspace pane made all seven redundant at once,
 * because on the three KIND groups the deed is now something an existing control already does:
 *
 *   urgent, housekeeping  →  it fired `openDock`, which CLICKING THE ROW does
 *   yours                 →  it fired the tick, which THE CHECKBOX IN LANE 1 does
 *
 * A control whose only job is to repeat its neighbour is what the icon-cluster rewrite existed to
 * remove; it had simply reappeared one layer up once the pane made the row's deed visible.
 *
 * ⚠️ WHAT SURVIVES IS TWO STATE GROUPS WITH ONE CONSTANT GLYPH EACH — Done undoes, Snoozed
 * returns. Neither varies WITHIN its group, so the objection that killed the varying glyph does
 * not reach them: there is nothing to learn, because on any row that has one it is always the
 * same mark. Both are reversals of a state rather than acts on a record, which is why they are
 * the two that have no other home on the row.
 *
 * ⚠️ AND `↵` NO LONGER FOLLOWS IT. The key used to be bound to this glyph's deed exactly; it is
 * bound to OPEN now, on every group, because that is the row's deed on all five. A key that meant
 * open on three groups and reverse on two would be worse than any icon asymmetry — an icon has a
 * glyph and a tooltip to explain itself, and a key has neither.
 */
export type ReversalIcon = "undo" | "return";

export function rowReversalIcon(c: BoardCard, column: TodoColumnId): ReversalIcon | null {
  if (column === "done" || c.done) return "undo";
  if (column === "snoozed") return "return";
  return null;
}

/* ── the split button's menu (fix pack Fix 4; ref design-refs/todo-splitguard-v1.html) ────────── */

export interface SplitItem {
  id: MenuItemId;
  glyph: string;
  label: string;
  /**
   * ⚠️ THE KEY, PRINTED — AND THIS FIELD IS BACK FOR A DIFFERENT REASON THAN IT LEFT. It once
   * carried `1` and `2` beside two preset snooze rows, and went when the presets did. It returns
   * because the cluster made the menu the place the GLYPHS are taught: a row that names the deed
   * in words and shows its key is what rescues anyone who never learns the clock.
   */
  hint?: string;
  /**
   * ⚠️ SOME ROWS OPEN A SURFACE RATHER THAN PERFORMING A VERB. Stated on the model instead of
   * pattern-matched on the id in the renderer, because "which id means open the dial" is exactly
   * the kind of knowledge that ends up in two places and then disagrees.
   */
  opens?: "dial";
  /** ⚠️ A VERB THAT DOES NOT APPLY IS GREYED, NEVER ABSENT — an absent row is a puzzle, a greyed
   *  one is an answer. `why` becomes the control's title so the answer is readable. */
  enabled: boolean;
  why?: string;
}

export interface SplitSection {
  head: "THIS QUERY" | "THIS ROW" | null;
  /** The last section sits below a dead zone and a rule; nothing destructive is within a
   *  pointer's drift of the row above it. */
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
      head: "THIS QUERY",
      items: [
        { id: "open-query", glyph: "↗", label: "Open the query", hint: "O", enabled: live("open-query") },
        {
          id: "edit-task", glyph: "✎", label: "Edit last entry", hint: "E", enabled: live("edit-task"),
          why: live("edit-task") ? undefined : "There is no entry of yours on this one to edit.",
        },
      ],
    },
    {
      /* ⚠️ THE MENU DELIBERATELY DUPLICATES SNOOZE AND DISMISS IN PLAIN LANGUAGE, and that is the
         safety net rather than a redundancy. The cluster asks the writer to learn a clock and a
         cross; anyone who never does can reach the same two deeds here, in words, with their keys
         beside them. That is also why the keys are printed: the menu is where the glyphs are
         taught, and a shortcut nobody is told about is a shortcut nobody has. */
      head: "THIS ROW",
      items: [
        {
          /* ⚠️ IT OPENS THE DIAL — it does not snooze. `snooze-1` is only what the PERMISSION is
             asked about; `opens` is what actually happens, so there is exactly one snooze surface
             in the app and this row is a fourth door onto it rather than a second control. */
          id: "snooze-1", glyph: "◷", label: "Snooze…", hint: "S", opens: "dial",
          enabled: live("snooze-1"),
          why: live("snooze-1") ? undefined : "A finished task has nothing left to put off.",
        },
      ],
    },
    {
      head: null,
      danger: true,
      items: [
        {
          id: "dismiss-week", glyph: "×", label: "Dismiss", hint: "X", enabled: live("dismiss-week"),
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
