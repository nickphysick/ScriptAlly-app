/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoActions — the DECISIONS behind completion, snoozing and dock entry, extracted from the page
 * that used to hold them (tasks-consolidation, extraction commit).
 *
 * ⚠️ WHY THIS FILE EXISTS. `quickDone`, `snoozeCard` and the dock entry were local closures inside
 * `ToDoPage.tsx` — a 2,247-line component about to be rebuilt. A choke point that lives only as a
 * closure inside the file being replaced **is not a choke point, it is a coincidence**: the next
 * rewrite can walk past it without anything failing. The snooze ceiling had already been through
 * exactly that once (a cap that lived in one menu's tier list, which every other path ignored,
 * and an offer surfaced reading "BACK 7 AUG").
 *
 * ⚠️ WHAT IS EXTRACTED, AND WHAT IS NOT. The DECISIONS are here — pure, total, unit-tested:
 * which ceiling applies, which write path a kind takes, what the toast says, what enters the
 * dock. The EFFECTS stay in the page, because they are React closures over `updateUserTask`,
 * `dismissTask`, `setOverlay` and `flash`; dragging those in would mean dependency-injecting four
 * providers to test a branch. The page becomes a thin caller: it asks this module what to do and
 * then does it, so a rebuild can replace every line of the doing without touching the deciding.
 *
 * ⚠️ THE INVARIANT THIS BUYS: there is ONE clamp, ONE completion-path map and ONE dock filter, and
 * `todoActions.test.ts` asserts the page routes through them rather than re-deciding inline.
 */
import { BoardCard } from "./todoBoard";

/* ── snooze ceilings ───────────────────────────────────────────────────────────────────────── */

/** A year. The ordinary ceiling — long enough to mean "not now", short enough to come back. */
export const SNOOZE_MAX_DAYS = 365;
/** An offer cannot be put off past tomorrow: it is the one kind with someone waiting on an answer. */
export const OFFER_SNOOZE_MAX_DAYS = 1;

export interface SnoozeClamp {
  days: number;
  when: string;
  /** True when the request was reduced — the caller says so rather than silently shortening. */
  clamped: boolean;
}

/**
 * ⚠️ THE CEILING, PER KIND — and it returns a NUMBER rather than a boolean so a caller cannot
 * accidentally read "capped" as "capped at tomorrow".
 *
 * - **offers → 1 day.** Someone is waiting on an answer; a week's silence is not a decision.
 * - **deadlines → never past the deadline itself.** Snoozing an expiring exclusive past its expiry
 *   is the app helping you miss it. The caller supplies the remaining days; a deadline already
 *   past clamps to 0, which the caller must read as "cannot be snoozed at all".
 * - **everything else → a year.**
 */
export function snoozeCeilingDays(card: BoardCard, daysUntilDeadline?: number): number {
  if (card.taskType === "offer_received") return OFFER_SNOOZE_MAX_DAYS;
  if (typeof daysUntilDeadline === "number") return Math.max(0, Math.min(SNOOZE_MAX_DAYS, daysUntilDeadline));
  return SNOOZE_MAX_DAYS;
}

/**
 * The dial's stops, and the only day-counts that get a name of their own.
 *
 * ⚠️ TWELVE STOPS: FINE WHERE PRECISION MATTERS, COARSE WHERE IT DOES NOT (Fix 4 revision; ref
 * design-refs/todo-weight-slider-v1.html). Five stops — 1, 3, 7, 14, 30 — made the writer round
 * their own intention to whichever was nearest, and the day they wanted was usually neither. Every
 * day of the first week is reachable because that is the range where a day is a real difference
 * ("after the weekend", "the day their reply is due"); past a month nobody is choosing between the
 * 61st and the 62nd, so the scale steps in months.
 *
 * ⚠️ THREE REGISTERS OF ONE FACT, AND ONLY ONE OF THEM IS STORED PER ROW BEYOND THE FIRST TWO.
 * `label` is the PROSE the page speaks ("back next week"); `tick` is the terse form, spoken to
 * assistive technology and lower-cased for the dial's Playfair title by `stopTitle`. They are
 * declared on the same row so a stop cannot gain one and lose the other — the alternative was a
 * second table in the component, which is how a tier ends up named two different things on two
 * surfaces.
 *
 * ⚠️ `axis` MARKS THE PRINTED RULER, and it is deliberately sparse. Twelve labels under a 246px
 * track collide into a grey smear; four — 1D · 1W · 1M · 3M — read as a scale. It lives on the
 * table rather than in a list of its own so the marks cannot drift off the stops they name, and
 * `Shift`+arrow jumps between exactly these, so the axis you can see is the axis the keyboard
 * travels.
 */
export const SNOOZE_STOPS: { days: number; label: string; tick: string; axis?: string }[] = [
  { days: 1, label: "tomorrow", tick: "TOMORROW", axis: "1D" },
  { days: 2, label: "in two days", tick: "2 DAYS" },
  { days: 3, label: "in three days", tick: "3 DAYS" },
  { days: 4, label: "in four days", tick: "4 DAYS" },
  { days: 5, label: "in five days", tick: "5 DAYS" },
  { days: 6, label: "in six days", tick: "6 DAYS" },
  { days: 7, label: "next week", tick: "1 WEEK", axis: "1W" },
  { days: 14, label: "in two weeks", tick: "2 WEEKS" },
  { days: 21, label: "in three weeks", tick: "3 WEEKS" },
  { days: 30, label: "in a month", tick: "1 MONTH", axis: "1M" },
  { days: 60, label: "in two months", tick: "2 MONTHS" },
  { days: 90, label: "in three months", tick: "3 MONTHS", axis: "3M" },
];

/**
 * The dial's Playfair title, DERIVED from the tick rather than stored beside it — "3 WEEKS" reads
 * as a system tag and "3 weeks" reads as an answer, but they are the same fact and a fourth column
 * would be a fourth chance to disagree.
 */
export function stopTitle(tick: string): string {
  return tick.charAt(0) + tick.slice(1).toLowerCase();
}

/**
 * ⚠️ THE RESOLVED DATE, WHICH IS WHAT A RECEIPT AND A COMMIT BUTTON MUST BOTH SAY. "Snoozed until
 * next week" is a promise about a date the writer then has to work out; "Snoozed until 31 August"
 * is the answer. One formatter, so the button they press and the receipt they read cannot state
 * different days.
 *
 * ⚠️ AT ONE DAY IT IS A WEEKDAY. "Tomorrow" is a relative word that stops being true the moment
 * the toast is still on screen at midnight, and "11 August" makes you count; "Tuesday" is legible
 * and exact at that range. Past a week a weekday would be ambiguous, so the date takes over.
 */
export function snoozeDateLabel(days: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return days === 1
    ? d.toLocaleDateString("en-GB", { weekday: "long" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

/**
 * ⚠️ WHICH STOPS THE DIAL MAY REACH — the ceiling applied to the TIERS, so the knob physically
 * stops rather than sliding past a limit and being silently pulled back. An offer's ceiling is
 * one day, so its dial has a single stop and says why; a deadline's is whatever days remain.
 *
 * ALWAYS AT LEAST ONE STOP WHERE ANY SNOOZE IS POSSIBLE AT ALL: a ceiling between two tiers (a
 * deadline four days out) keeps every tier below it, and the caller may still write the exact
 * ceiling through the date picker. A ceiling of 0 — a deadline already past — returns none, which
 * the caller must read as "this cannot be put off", never as "put it off by nothing".
 */
export function reachableStops(card: BoardCard, daysUntilDeadline?: number): { days: number; label: string; tick: string }[] {
  const ceiling = snoozeCeilingDays(card, daysUntilDeadline);
  return SNOOZE_STOPS.filter((s) => s.days <= ceiling);
}

/**
 * ⚠️ A NAME ONLY WHERE THE NUMBER EARNS IT. An exact stop gets the stop's words; anything else —
 * which in practice means a deadline clamp, where the ceiling is whatever days remain — gets the
 * day count stated plainly. The first draft rounded 4 days up to "next week", so a clamp that
 * wrote 4 days announced 7: the label has to describe the write, not the tier it fell between.
 */
export function snoozeWhenLabel(days: number): string {
  const stop = SNOOZE_STOPS.find((s) => s.days === days);
  if (stop) return stop.label;
  if (days <= 0) return "not at all";
  return `in ${days} days`;
}

/**
 * ⚠️ THE CHOKE POINT. Every snooze — menu tier, drag dial, keyboard, batch — passes through here,
 * and the ceiling is applied HERE rather than in any caller's option list. A cap that lives in one
 * menu's tiers is a cap every other path walks past; that is not hypothetical, it shipped.
 *
 * It also re-labels: a request clamped from "next week" to tomorrow must not keep saying "next
 * week", or the toast lies about what was written.
 */
export function clampSnooze(card: BoardCard, days: number, when: string, daysUntilDeadline?: number): SnoozeClamp {
  const ceiling = snoozeCeilingDays(card, daysUntilDeadline);
  if (days <= ceiling) return { days, when, clamped: false };
  return { days: ceiling, when: snoozeWhenLabel(ceiling), clamped: true };
}

/**
 * ⚠️ THE SAME CEILING, FOR CALLERS THAT HOLD A TASK TYPE RATHER THAN A CARD. FocusFlow's staged
 * runner and its sweep snooze both had their OWN copy of the offer cap — so the rule lived in
 * three places at once, which is three chances to disagree about a cap that has already shipped
 * wrong. One ceiling, two shapes of caller.
 */
export function clampSnoozeDays(taskType: string | undefined, days: number): number {
  if (taskType === "offer_received") return Math.min(days, OFFER_SNOOZE_MAX_DAYS);
  return Math.min(days, SNOOZE_MAX_DAYS);
}

/* ── which write path a snooze takes ───────────────────────────────────────────────────────── */

export type SnoozeVia = "user-task-flag" | "dismiss-task" | "none";

/**
 * A writer's own item carries its snooze on a task flag; an engine-raised one goes through
 * `dismissTask` with a fixed-snooze reason. A card with neither an id nor a task type cannot be
 * snoozed at all, and saying so here stops the caller writing a half-formed key.
 */
export function snoozeVia(card: BoardCard): SnoozeVia {
  if (card.userTaskId) return "user-task-flag";
  if (card.taskType && card.relatedRecordId) return "dismiss-task";
  return "none";
}

/** The lane an overlay belongs to — the card's own stream, defaulted rather than assumed. */
export function cardLane(card: BoardCard): "do" | "hk" | "nt" {
  return card.stream === "nt" ? "nt" : card.stream === "hk" ? "hk" : "do";
}

/* ── which write path a completion takes ───────────────────────────────────────────────────── */

export type CompletionVia =
  | "user-task"        // the writer's own item — a plain done/completedAt write
  | "close-query"      // no_response_close — a status change, not a tick
  | "log-nudge"        // nudge_overdue — the nudge's own isolated path
  | "mark-sent"        // the query's own send flow owns it
  | "none";            // nothing to complete — the kind has no honest arm

/**
 * ⚠️ EVERY `taskType` THE ENGINE CAN PUT ON A CARD, DECLARED ONCE. `Task.taskType` is a bare
 * `string` in `types.ts`, so nothing has ever forced a new kind to say how it completes — which is
 * precisely how a status write became the thing you got for free by not thinking about it.
 *
 * ⚠️ THIS IS A CENSUS, NOT A WISH LIST. Each entry is pushed by the derivation engine in `db.tsx`
 * or built as a card elsewhere; `exclusive_expiring` is deliberately ABSENT because it survives
 * only in test fixtures, and listing it here would assert a kind the app cannot produce.
 */
export const TASK_TYPES = [
  "offer_received",
  "partial_requested",
  "full_requested",
  "revise_resubmit",
  "nudge_overdue",
  "no_response_close",
  "data_quality_poor",
  "querying_unstarted",
  "dream_agent_unqueried",
  "materials_unrecorded",
  "materials_unrecorded_bulk",
  "weekly_review",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const isTaskType = (v: unknown): v is TaskType =>
  typeof v === "string" && (TASK_TYPES as readonly string[]).includes(v);

/**
 * ⚠️ ONE MAP FROM KIND TO WRITE PATH. `quickDone` grew this as an if-ladder inside the page, so
 * "which kinds can be ticked" was answerable only by reading a 90-line function. Stated once, it
 * is also what the row can ask before it draws a tick at all — a tick that does nothing is worse
 * than no tick.
 *
 * ⚠️ THE FALLBACK IS INERT, AND THAT IS THE WHOLE POINT OF THIS SHAPE. It used to be `mark-sent` —
 * a STATUS write — so every task type ever added shipped with a write attached until somebody
 * remembered to opt out. Two kinds had already reached it that way and both had to be closed by
 * hand (`cardJourney`'s send fall-through, then the materials pair). A default that writes is a
 * default that is wrong in the expensive direction; unknown now completes nothing.
 *
 * ⚠️ AND THE SWITCH IS EXHAUSTIVE OVER `TaskType`, so the next kind FAILS TO COMPILE until it
 * declares how it finishes. That is the guard the two hand-fixes above were substituting for.
 *
 * ⚠️ `mark-sent` IS NOW EXACTLY THE THREE KINDS THAT ARE REALLY SENDS — the same three
 * `sendSpecFor` recognises, and the same three whose statuses `getPrimaryAction` answers
 * "mark-sent" for. Everything else that reached it by default was ALREADY a no-op: `quickDone`
 * refuses when `getPrimaryAction(q.status).kind !== "mark-sent"`, so an offer card drew a tick and
 * then silently did nothing. No write changes here; what changes is that a tick which could never
 * write no longer renders.
 */
export function completionVia(card: BoardCard): CompletionVia {
  if (card.userTaskId) return "user-task";
  if (!card.relatedRecordId) return "none";
  /* An unrecognised or absent kind completes nothing — see the inert-fallback note above. */
  if (!isTaskType(card.taskType)) return "none";

  switch (card.taskType) {
    case "no_response_close":
      return "close-query";
    case "nudge_overdue":
      return "log-nudge";

    /* the three genuine sends */
    case "partial_requested":
    case "full_requested":
    case "revise_resubmit":
      return "mark-sent";

    /* ⚠️ A DECISION IS NOT A SEND. `getPrimaryAction(Offer)` answers "record", so this never
       wrote; it only drew a tick that refused. The offer's own journey is where it completes. */
    case "offer_received":
      return "none";

    /* ⚠️ RECORD GAPS COMPLETE BY RECORDING, NOT BY TICKING. A tick here would aim a send at the
       query a single card points at, or at an id no query has for the bulk card. */
    case "materials_unrecorded":
    case "materials_unrecorded_bulk":
      return "none";

    /* Housekeeping and prompts: fixed by editing the record they point at, never by a tick.
       `data_quality_poor` normally arrives collapsed into a sweep, which carries no
       `relatedRecordId` and is already inert — this covers the loose card whose agent did not
       resolve, which `groupHousekeeping` skips and leaves in the lane. */
    case "data_quality_poor":
    case "querying_unstarted":
    case "dream_agent_unqueried":
    case "weekly_review":
      return "none";

    default: {
      /* The compile-time guard. Adding a member to TASK_TYPES without a case fails here. */
      const unhandled: never = card.taskType;
      return unhandled;
    }
  }
}

/** Whether the row should render a tick at all — the derived answer, never a per-row guess. */
export function isTickable(card: BoardCard): boolean {
  return completionVia(card) !== "none";
}

/* ── dock entry ────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ DOCK ENTRY IS `dockQueue` IN lib/todoDock — ALREADY A SEAM, and deliberately not duplicated
 * here. This re-export exists so a reader looking for "how does something get into the dock"
 * finds the answer in the module named for actions, rather than concluding there are two filters.
 * There is one, and it is that one.
 */
export { dockQueue } from "./todoDock";
