/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoCalendar — the Calendar page's pure layer (tasks-pages pack, Phase 3; ref
 * design-refs/tasks-pages.html, the CALENDAR frame).
 *
 * ⚠️ EVERY ITEM APPEARS ON ITS ACTION DATE, AND NOTHING HERE IS STORED:
 *  · a user TASK on its due date (dueYmd — the two-natures law's own field);
 *  · an AGENT task on the day it landed on your desk — the request's `lastStatusChange` audit
 *    stamp, the SAME basis the board's REQUESTED figures read, falling back to dateSent;
 *  · a SNOOZED item on its return date (the flag's own snoozedUntil);
 *  · notes never calendar — a dated user card IS a task (two-natures), so the old butter
 *    "dated notes" family was structurally empty and is RETIRED (tasks-audit P4; themes.md).
 *  · housekeeping (sweeps, data-quality, stale) has NO action date — a standing pile is not an
 *    appointment — so it never reaches the calendar. The legend says the same by omission.
 *
 * ⚠️ ROLL-FORWARD IS DERIVED FROM THE CLOCK, NEVER WRITTEN: anything live whose action date has
 * passed renders on TODAY, and the day it left keeps a single "{n} ROLLED FORWARD ↗" marker —
 * the marker, not the items. Nothing moves at midnight because nothing is anywhere: the same
 * derivation just answers differently on the next read.
 *
 * ⚠️ COMPLETED ITEMS STAY ON THE DAY THEY WERE FINISHED, struck through, derived from the
 * activity log (the SAME clearing union the Done column reads: CLEARING_ACTIVITY_TYPES +
 * completed user tasks). They never roll.
 */
import { Activity, ActivityType, Agent, Query, QueryStatus, TaskFlag, UserTask } from "../types";
import { HOLDING_REPLY_TYPE } from "./holdingReply";
import type { TaskType } from "./todoActions";
import { BoardCard, terseDoneLabel } from "./todoBoard";
import { BoardColumns } from "./todoColumns";
import { agentPrimary, agentSecondary } from "./agentDisplay";
import { CLEARING_ACTIVITY_TYPES } from "./clearedToday";
import { flagSleeps } from "./taskFlags";

export type CalFamily = "agent" | "task" | "snoozed" | "done";

export interface CalendarItem {
  key: string;
  /** The day it RENDERS on — post roll-forward. */
  ymd: string;
  label: string;
  family: CalFamily;
  /** Present on live items — the pip opens the item sheet on it. Completed items carry none. */
  card?: BoardCard;
  struck?: boolean;
  /**
   * The activity a DONE item was built from, when it was built from one.
   *
   * ⚠️ CARRIED, NOT PARSED BACK OUT OF `key`. The key already embeds it, but it embeds a fallback
   * too (`a.id ?? queryId-date`), so parsing would be lossy in exactly the case where the id is
   * missing — and that is the case where dedupe must NOT fire. A second encoding of one fact is
   * how two readings of it come to disagree.
   */
  activityId?: string;
  /**
   * The day this item was originally due, when the clock has since rolled it onto today.
   *
   * ⚠️ KEPT, NOT RECOMPUTED. It is `action` — the value the roll-forward branch already had one
   * line above the marker it used to feed. Deriving it a second time at render (`cardActionYmd`
   * is exported and pure, and the page has `queries`) would work and is rejected: two readings of
   * one fact is how they come to disagree.
   */
  rolledFrom?: string;
}

export interface CalendarDayData {
  items: CalendarItem[];
  /** Live items that LEFT this day for today — rendered as one marker, never as the items. */
  rolled: number;
}

/* ── date arithmetic (local, ymd-string in and out) ────────────────────────────────────────── */

const parseYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const toYmd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isoToYmd = (iso: string | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : toYmd(d);
};

/** Monday-start: 0 for Monday … 6 for Sunday (the ref's DOW row starts MON). */
const mondayIndex = (d: Date): number => (d.getDay() + 6) % 7;

/** The full Monday-start weeks covering the anchor's month — 35 or 42 cells, never a torn row. */
export function monthGridDays(anchorYmd: string): string[] {
  const anchor = parseYmd(anchorYmd);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex(first));
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - mondayIndex(last)));
  const days: string[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(toYmd(d));
  return days;
}

export function monthLabel(anchorYmd: string): string {
  return parseYmd(anchorYmd).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/* ⚠️ `weekDays`, `weekLabel` and `shiftWeek` ARE RETIRED (record-layer P6) along with the week
   view they served — traced to zero remaining callers before removal. The `weekLabel` still in the
   dashboard files is a DIFFERENT symbol: a local const in DeskStats and an object property in
   StatCards, neither of which ever imported this module. */
export function shiftMonth(anchorYmd: string, delta: number): string {
  const d = parseYmd(anchorYmd);
  return toYmd(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

export function sameMonth(aYmd: string, bYmd: string): boolean {
  const a = parseYmd(aYmd);
  const b = parseYmd(bYmd);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/* ── placement ─────────────────────────────────────────────────────────────────────────────── */

export interface CalendarInput {
  /** The live columns — the SAME assembleBoardColumns output every Tasks surface reads. */
  cols: BoardColumns;
  flags: TaskFlag[];
  queries: Query[];
  agents: Agent[];
  userTasks: UserTask[];
  activities: Activity[];
  today: string;
  nowMs: number;
}

/** A live card's ACTION date, per source — null = not a calendar citizen (housekeeping piles). */
export function cardActionYmd(c: BoardCard, queries: Query[]): string | null {
  if (c.userTaskId || c.nature) return c.dueYmd ?? null; // a user card without a date is a note — not dated work
  if (c.stream === "do" && c.relatedRecordId) {
    const q = queries.find((x) => x.id === c.relatedRecordId);
    if (!q) return null;
    // the day it LANDED: the request's audit stamp, the same basis the REQUESTED figures read
    const landed = isoToYmd(q.lastStatusChange as string | undefined) ?? isoToYmd(q.dateSent);
    return landed;
  }
  return null; // hk piles (stale, data-quality, sweeps) have no action date
}

/* the butter "note" branch is RETIRED (tasks-audit P4): notes never board (boardEligible) and a
   dated user card is a task by law — the branch was a door onto a room that cannot exist. */
const liveFamilyOf = (c: BoardCard): CalFamily =>
  c.userTaskId || c.nature ? "task" : "agent";

/**
 * The whole month's placement in one pass. Returns per-day items (live, rolled-in, completed)
 * plus the origin days' roll-forward counts.
 */
export function calendarDays(input: CalendarInput, visible: string[]): Map<string, CalendarDayData> {
  const byDay = new Map<string, CalendarDayData>();
  const day = (ymd: string): CalendarDayData => {
    let d = byDay.get(ymd);
    if (!d) { d = { items: [], rolled: 0 }; byDay.set(ymd, d); }
    return d;
  };

  // live items — To do + Today columns (the same cards the board renders)
  for (const c of [...input.cols.todo, ...input.cols.today]) {
    const action = cardActionYmd(c, input.queries);
    if (!action) continue;
    /* ⚠️ ON ITS RETURN DAY the pip wears the parchment RETURNED family, not its urgent pink
       (audit item 6) — today's cell says "this came back", not "this just landed". */
    const family = c.returnedToday ? "snoozed" as const : liveFamilyOf(c);
    if (action < input.today) {
      /* ⚠️ ROLL-FORWARD: the item renders TODAY, and carries the day it came from.
         ⚠️ `rolled` IS STILL COUNTED AND NO LONGER DRAWN (pill pack, Phase 4). The grid's
         "{n} ROLLED FORWARD ↗" marker is gone: it was bookkeeping about a MOVE placed on a day
         where nothing happened, which reads as an event on a calendar. The count survives on the
         data — nothing else consumed it, and removing it would be a second change wearing the
         first one's clothes — but the provenance now travels WITH the item, to the one place a
         reader is looking at it. */
      day(action).rolled += 1;
      day(input.today).items.push({ key: `cal-${c.key}`, ymd: input.today, label: c.title, family, card: c, rolledFrom: action });
    } else {
      day(action).items.push({ key: `cal-${c.key}`, ymd: action, label: c.title, family, card: c });
    }
  }

  // snoozed returns — on the flag's own date (future by construction; expired flags left the set)
  for (const f of input.flags) {
    /* sleeping only, never offers — the same two laws the Snoozed column obeys (tasks-audit P1):
       a returned flag's item is already a lane card (one pip), and an offer's flag is its quiet
       reminder, not a put-away. */
    if (!flagSleeps(f, input.nowMs) || !f.snoozedUntil || f.taskType === "offer_received") continue;
    const ymd = isoToYmd(f.snoozedUntil);
    if (!ymd) continue;
    const card = input.cols.snoozed.find((c) => c.key === `snz-${f.id}`);
    if (!card) continue; // a note's snooze never boards (boardEligible) — and never calendars
    day(ymd).items.push({ key: `cal-snz-${f.id}`, ymd, label: card.title, family: "snoozed", card });
  }

  // completed — on the day they were finished, struck, from the log. They never roll.
  const inRange = new Set(visible);
  for (const t of input.userTasks) {
    if (!t.done || !t.completedAt) continue;
    const ymd = isoToYmd(t.completedAt);
    if (!ymd || !inRange.has(ymd)) continue;
    day(ymd).items.push({ key: `cal-done-task-${t.id}`, ymd, label: t.text || "Task", family: "done", struck: true });
  }
  for (const a of input.activities) {
    if (!CLEARING_ACTIVITY_TYPES.has(a.activityType)) continue;
    const ymd = isoToYmd(a.date);
    if (!ymd || !inRange.has(ymd)) continue;
    const qq = input.queries.find((x) => x.id === a.queryId);
    const agn = qq ? input.agents.find((x) => x.id === qq.agentId) : undefined;
    day(ymd).items.push({
      key: `cal-done-act-${a.id ?? `${a.queryId}-${a.date}`}`,
      ymd, label: terseDoneLabel(a, agn ? agentPrimary(agn) : undefined), family: "done", struck: true,
      ...(a.id ? { activityId: a.id } : {}),
    });
  }

  return byDay;
}

/** Busy days fold past this many pips to "+N MORE" (the ref draws 3 + the fold). */
export const CAL_CELL_CAP = 3;

/**
 * ⚠️ THE DENSITY FLOOR: a cell never shows fewer than two occupants — one pip plus the counter's
 * line — at any supported width (dedupe pack, Phase 3, Nick's ruling).
 *
 * A one-pip month is not a calendar; it is a list of counters. Measured before this change, at
 * 1000px wide the collapsed layout gave `rowPx 66` and a cap of **1**, so every busy day read
 * "1 item and eleven you cannot see".
 *
 * ⚠️ THIS CONSTANT CANNOT CREATE SPACE — it only states the rule. The room has to come from
 * `.cal-grid`'s `min-height` at the collapsed width, which was raised to 600px in the same change
 * (derived: a folded cell needs `2 × CAL_PIP_H + CAL_MORE_H = 62px` of room, so
 * `rowPx >= 33 + 62 = 95`, so `6 × 95 + 13 = 583` — 600 with margin). If the two ever disagree the
 * cell OVERFLOWS rather than squashing, because `.cal-pip` is `flex: none` — a loud failure, and
 * the acceptance run asserts against it at every width. The floor and the CSS are reconciled by
 * measurement, never by this comment.
 */
export const CAL_CELL_FLOOR = 2;

/* ══ THE FOLD THRESHOLD (tasks-viewport pack, Phase 3) ══════════════════════════════════════ */

/**
 * A pip's own height plus its top margin.
 *
 * ⚠️ 27, RE-MEASURED — the pill grammar changed the box (pill pack, Phase 5). The label went
 * 8.5px/12.75 to 10px/15 and the padding 3px 6px to 3px 9px, so the flow height a stack divides by
 * moved from 24.75 to 27 (browser-measured at 1000, 1440 and 1920, all three identical). Leaving
 * this at 25 would have been the SAME fault this constant was created to fix, one pack later: a
 * cap promising room the cell does not have.
 *
 * ⚠️ AND IT DOES NOT MOVE ALONE. At 27 the collapsed width's grid floor was 1.2px short of two
 * pips plus the counter, so `.cal-grid`'s `min-height` went 600 -> 620 in the same change. The two
 * are one decision; changing either by itself re-opens the gap.
 *
 * ⚠️ 25, NOT 19 — MEASURED, after the `cal-` collision was fixed (fixes pack, Phase 1). The old
 * value was taken from the ref's `.pip2` and understated the shipped pip by about six pixels:
 * the browser reports `font-size: 8.5px / line-height: 12.75px`, `padding: 3px 6px` and a 1px
 * border, which is 20.75px, plus the 4px `margin-top` — **24.75px**. Rounded UP, because the
 * error that matters is over-promising: a cap one too high puts a pip into space that does not
 * exist, and a fixed-height flex column answers that by SHRINKING every pip rather than dropping
 * the last, which is silent and illegible. One too few is merely one fewer.
 */
export const CAL_PIP_H = 25;
/**
 * The date line at the cell's head, plus the cell's vertical padding and border.
 *
 * ⚠️ 33, NOT 26 — the numeral moved into a fixed 20px box (fixes pack, Phase 3) so the head row
 * grew from ~13px to 20px, and the cell's border is now right+bottom only. 20 + 12 padding + 1
 * border = 33. **It is a claim about a rendered cell, so it is verified by measurement, not by
 * this arithmetic** — `tests/e2e/calFold.measure.ts` reports the real `.cal-d` and cell heights,
 * and the acceptance run checks that no cell overflows.
 */
export const CAL_CELL_CHROME = 35;

/**
 * The "+N MORE" line's own height — browser-measured at 12px (6px mono + 3px padding-top).
 *
 * ⚠️ IT IS NOT A PIP, AND RESERVING A WHOLE PIP SLOT FOR IT COSTS A ROW. The first version of the
 * counter's reservation took one slot out of the cap, which is 25px for a 12px line: on a 900px
 * viewport that turned a two-pip cell into a ONE-pip cell, measured. The fold reserves the
 * counter's real height instead.
 */
export const CAL_MORE_H = 11;

/**
 * ⚠️ THE FOLD DERIVES FROM THE CELL, NOT FROM A CONSTANT. `CAL_CELL_CAP` was a flat 3 whatever
 * the screen did — right on a desktop, and on a short laptop it asked a 44px row to hold three
 * 19px pips, so the third was sheared in half. A clipped pip is worse than an honest fold: the
 * fold says "there are more", a half-pip says the app is broken.
 *
 * So the cap is a function of the row height the grid actually resolved to, and the page measures
 * that rather than guessing. At least ONE pip always shows — a cell that folds everything says
 * only "+3 MORE", which tells you a day is busy but not what it holds.
 *
 * `rowPx` of 0 (before the first measure, and in any test with no layout) yields the default cap,
 * so nothing renders emptier than it used to while the measurement settles.
 */
/**
 * The cell's real metrics, read from a rendered sample rather than assumed.
 *
 * ⚠️ THE CONSTANTS WERE A HAND-KEPT COPY OF THE STYLESHEET, AND THEY WENT STALE SILENTLY. When the
 * numeral box and the cell's padding moved by 8.75px in this very pack, `CAL_CELL_CHROME = 35`
 * became wrong by that amount and **the whole suite stayed green** — nothing tied the number to the
 * CSS it described. That is why the pill's height is now measured: the fold asking the page what a
 * pill costs cannot drift from what a pill costs.
 *
 * ⚠️ `chrome` IS EVERYTHING THE CELL SPENDS BEFORE THE FIRST PILL — its vertical padding plus the
 * numeral row — measured as `clientHeight - (available for pills)`, so it needs no list of terms to
 * keep in step. Add a subtitle to the cell tomorrow and this follows without an edit.
 */
export interface FoldMetrics {
  /** a pill's own box plus its top margin — what one costs in the flow */
  pipH: number;
  /** the "+N MORE" line's height, including its padding */
  moreH: number;
  /** the cell's padding and numeral row — everything above the first pill */
  chrome: number;
}

/**
 * The declared values, used ONLY until a real cell has been measured.
 *
 * ⚠️ A FALLBACK, NOT A SOURCE OF TRUTH. Before the first measurement — the initial render, and any
 * test with no layout — there is no rendered pill to ask, and rendering emptier than necessary for
 * one frame is worse than using the last known good numbers. Once `foldMetricsFrom` has read a
 * cell, these are never consulted again.
 */
export const FOLD_FALLBACK: FoldMetrics = { pipH: CAL_PIP_H, moreH: CAL_MORE_H, chrome: CAL_CELL_CHROME };

/**
 * How many pills fit, and whether the floor could be honoured.
 *
 * ⚠️ `fits` IS THE HONEST ANSWER AND `cap` IS THE RULED ONE. `CAL_CELL_FLOOR` is a product ruling —
 * a one-pill month is close to information-free — and it cannot create space. Keeping both means
 * the caller can render the ruling *and* know when the cell cannot afford it, instead of the fold
 * quietly returning 2 into a cell with room for 1 and the pills overflowing to say so.
 */
export interface FoldResult {
  /** what the ruling says to draw */
  cap: number;
  /** what actually fits — below `cap` when the floor is unsatisfiable */
  fits: number;
  /** pixels short of honouring the floor; 0 when it is satisfiable */
  shortfall: number;
}

/** The cap, the honest fit, and the shortfall — one derivation, three answers. */
export function foldFor(rowPx: number, m: FoldMetrics = FOLD_FALLBACK, withCounter = false): FoldResult {
  if (!rowPx || rowPx <= 0) {
    const cap = withCounter ? Math.max(CAL_CELL_FLOOR, CAL_CELL_CAP - 1) : CAL_CELL_CAP;
    return { cap, fits: cap, shortfall: 0 };
  }
  const room = rowPx - m.chrome - (withCounter ? m.moreH : 0);
  const fits = Math.max(0, Math.floor(room / m.pipH));
  const cap = Math.max(CAL_CELL_FLOOR, Math.min(CAL_CELL_CAP, fits));
  /* what honouring the floor would cost beyond the room there is */
  const shortfall = fits >= CAL_CELL_FLOOR ? 0
    : Math.max(0, Math.round((CAL_CELL_FLOOR * m.pipH + (withCounter ? m.moreH : 0) + m.chrome - rowPx) * 100) / 100);
  return { cap, fits: Math.min(fits, CAL_CELL_CAP), shortfall };
}

export function calFoldCap(rowPx: number, m: FoldMetrics = FOLD_FALLBACK): number {
  return foldFor(rowPx, m, false).cap;
}

/**
 * How many pips fit ALONGSIDE the "+N MORE" line — the cap for a day that folds.
 *
 * ⚠️ TWO CAPS, BECAUSE THE COUNTER IS SHORTER THAN A PIP. A single cap has to assume the worst and
 * reserve a full pip's height for a 12px line, which measurably costs a row. Asking the question
 * twice — "how many fit alone" and "how many fit beside the counter" — lets a cell show everything
 * when it can and still show as much as possible when it cannot. At the sizes that ship these are
 * often the SAME number, which is exactly the row the single-cap version was throwing away.
 */
export function calFoldCapFolded(rowPx: number, m: FoldMetrics = FOLD_FALLBACK): number {
  return foldFor(rowPx, m, true).cap;
}

/**
 * Read the cell's real metrics off a rendered cell. Returns null when there is nothing to read —
 * an empty month has no pill, and inventing one would be the assumption this replaces.
 *
 * ⚠️ IT TAKES THE CELL, NOT THE DOCUMENT. Every workspace page stays mounted, so a query across the
 * document can return a hidden page's zero-sized copy — which has already produced a false chain
 * reading and an unclickable-button hunt in this repo. The caller passes the element it is
 * rendering into.
 */
export function foldMetricsFrom(
  cell: { clientHeight: number; paddingY: number; headH: number },
  pill: { height: number; marginTop: number } | null,
  moreH: number | null,
): FoldMetrics | null {
  if (!pill || pill.height <= 0) return null;
  return {
    pipH: pill.height + pill.marginTop,
    moreH: moreH && moreH > 0 ? moreH : FOLD_FALLBACK.moreH,
    chrome: cell.paddingY + cell.headH,
  };
}

/* ══ THE RECORD LAYER (record-layer pack, Phase 2; ref design-refs/calendar-month-focus-v2.html) ═
 *
 * ⚠️ THE CALENDAR SHOWED FORWARD WORK ONLY, AND THAT IS WHY IT COULD NOT ANSWER "WHAT HAPPENED IN
 * AUGUST". A partial sent on the 12th is a card until its task is done, and then it is nothing —
 * the day empties, because every citizen of the grid above is a LIVE card from the shared feed.
 * This layer is the other half: the querying record, derived from `activities`, recessive beneath
 * the live work, and never a card.
 *
 * ⚠️ IT IS DERIVED AND IT READS NOTHING NEW. `activities` is already loaded unwindowed
 * (`db.tsx:521` snapshots the whole collection) and the page already holds it, so the record costs
 * one pass over an array in memory — no new query, no new hook, no new field.
 *
 * ⚠️ THE GLOBAL FEED IS COARSE, AND THAT SHAPES THIS WHOLE FILE. `ActivityType` has twelve members;
 * every agent reply — partial requested, full requested, R&R, rejection — is ONE `STATUS_CHANGED`
 * row whose meaning lives in `resultingStatus`. So the rule is two tables rather than one list: the
 * TYPE names the event where it can, and where it cannot it defers to the STATUS. Both tables are
 * `Record<…>` over their enum, so a new member of either fails the build until somebody says which
 * side of the record it falls on — the exhaustiveness guard this codebase already uses for task
 * kinds, for the same reason: the next kind should not ship classified by a default.
 *
 * ⚠️ AND THE SAFE DEFAULT IS EXCLUSION. A missing row is recoverable — the entry is still in the
 * query's own timeline. A noisy record is not: once agent edits and manuscript renames are on the
 * grid, the record stops being the querying story and becomes an audit log, which is a different
 * (and unasked-for) product. Anything ambiguous is `null` here, with its reason beside it.
 */

/** Who authored the event. Colour follows this and nothing else. */
export type RecordDir = "out" | "in";

export interface RecordSpec {
  /** The pip's words. Plain and factual — no adjectives, no verdicts, no speed or quality. */
  label: string;
  dir: RecordDir;
}

/** The marker for a type that carries no meaning of its own — its `resultingStatus` names it. */
export const BY_STATUS = "by-status" as const;
export type RecordRule = RecordSpec | typeof BY_STATUS | null;

/**
 * The global feed's `activityType` universe: the enum, plus the one type written into it by cast.
 * `HOLDING_REPLY_TYPE` is Title Case because that is the GLOBAL feed's spelling — the per-query
 * nested twin is "Holding reply". Quoting the constant rather than the literal keeps the two apart.
 */
export type RecordType = ActivityType | typeof HOLDING_REPLY_TYPE;

/**
 * ⚠️ THE WHITELIST, STATED ONCE. `null` is a decision, not an omission — each carries its reason.
 *
 * ⚠️ DIRECTION HERE IS AUTHORSHIP, AND IT IS DELIBERATELY *NOT* `statusDirection`. That function
 * (StatusDot.tsx) classifies PIPELINE direction and says so in its own comment: it calls an Offer
 * "out" because an offer moves the writer's side forward, and it collapses Rejected, Withdrawn and
 * No Response into one "closed". Both are right for a list spine and wrong here. An offer is
 * something the AGENT sent you; painting it as writer-authored is exactly the quiet untruth this
 * layer exists to avoid, and a two-valued `dir` cannot hold "closed" at all. So the tables declare
 * label and direction together, and `StatusDot` is untouched.
 */
export const RECORD_TYPES: Record<RecordType, RecordRule> = {
  /* the conversation, in the writer's hand */
  [ActivityType.QUERY_SENT]: { label: "Query sent", dir: "out" },
  [ActivityType.NUDGE_SENT]: { label: "Nudge sent", dir: "out" },
  /* the writer's answer to an offer. These keep their OWN label rather than deferring: an offer
     declined stamps `resultingStatus: WITHDRAWN`, so refining it by status would file the most
     consequential decision in the record under the generic word "Closed". */
  [ActivityType.OFFER_ACCEPTED]: { label: "Offer accepted", dir: "out" },
  [ActivityType.OFFER_DECLINED]: { label: "Offer declined", dir: "out" },
  /* the agency's holding line — they replied, with no decision yet */
  [HOLDING_REPLY_TYPE]: { label: "Holding reply", dir: "in" },

  /* generic types: the status names the event (see RECORD_STATUS) */
  [ActivityType.STATUS_CHANGED]: BY_STATUS,
  [ActivityType.MATERIALS_SENT]: BY_STATUS,

  /* ⚠️ NOT THE RECORD — reference data and its upkeep. Adding an agent, correcting an agency's
     name or renaming a manuscript are things the writer did to their FILES, not to a submission.
     The querying record is what passed between the writer and an agency. */
  [ActivityType.AGENT_ADDED]: null,
  [ActivityType.AGENT_UPDATED]: null,
  [ActivityType.AGENT_DELETED]: null,
  [ActivityType.MANUSCRIPT_ADDED]: null,
  [ActivityType.MANUSCRIPT_UPDATED]: null,
  [ActivityType.MANUSCRIPT_DELETED]: null,
};

/**
 * ⚠️ THE THREE CLOSURES SHARE ONE WORD AND DIFFER IN AUTHORSHIP. "Closed" is what the pack asks
 * for and it is true of all three; which of them it was is one click away in the expanded row, and
 * on the grid a month of the word "Rejected" would be a running commentary rather than a record.
 * The DIRECTION still separates them, because that part is a fact: a rejection came from the
 * agency; a withdrawal and a no-response close are both the writer's own act.
 */
export const RECORD_STATUS: Record<QueryStatus, RecordSpec | null> = {
  [QueryStatus.QUERIED]: { label: "Query sent", dir: "out" },
  [QueryStatus.PARTIAL_REQUESTED]: { label: "Partial requested", dir: "in" },
  [QueryStatus.PARTIAL_SENT]: { label: "Partial sent", dir: "out" },
  [QueryStatus.FULL_REQUESTED]: { label: "Full requested", dir: "in" },
  [QueryStatus.FULL_SENT]: { label: "Full sent", dir: "out" },
  [QueryStatus.REVISE_RESUBMIT]: { label: "Revise & resubmit", dir: "in" },
  [QueryStatus.OFFER]: { label: "Offer received", dir: "in" },
  [QueryStatus.REJECTED]: { label: "Closed", dir: "in" },
  [QueryStatus.WITHDRAWN]: { label: "Closed", dir: "out" },
  [QueryStatus.NO_RESPONSE]: { label: "Closed", dir: "out" },
};

export interface RecordItem {
  key: string;
  ymd: string;
  label: string;
  dir: RecordDir;
  queryId: string;
  activityId: string;
  /** Display name — `agentPrimary`, the same helper every other agent-naming surface reads. */
  agent: string;
  /** `agentSecondary` — the agency, or the canonical stand-in once the agency IS the primary. */
  agency: string;
  /** The day panel resolves the title; carrying the id keeps this layer off the manuscript list. */
  manuscriptId: string;
  /** What the entry says, verbatim from the log. Never re-worded here. */
  note: string;
  /** What accompanied it, where the log recorded any ("QL v2 + Syn v4", an agent's quote). */
  detail: string;
  /** 1-based position in THIS query's record — "Exchange 2". */
  exchange: number;
  /** Whole days since the previous exchange on this query. Absent on the first. */
  gapDays?: number;
  /** Did the direction flip since the previous exchange — i.e. is this a reply to it? */
  turned: boolean;
}

/**
 * ⚠️ THE EXCHANGE LINE REPORTS AND DOES NOT JUDGE. It states position, elapsed days and who moved
 * — never a verdict on any of them. "You replied in 1 day" is a fact; "quick turnaround" is an
 * opinion the app has no standing to hold, and a writer reading their own record does not need it.
 *
 * The turn is only claimed when the direction actually FLIPPED. Two sends in a row are not a
 * reply to anything, so they read as elapsed time and nothing more.
 */
export function exchangeLine(r: Pick<RecordItem, "exchange" | "gapDays" | "turned" | "dir">): string {
  const head = `Exchange ${r.exchange}`;
  if (r.gapDays === undefined) return head;
  const days = `${r.gapDays} ${r.gapDays === 1 ? "day" : "days"}`;
  if (!r.turned) return `${head} · ${days} later`;
  return `${head} · ${r.dir === "out" ? "you" : "they"} replied in ${days}`;
}

/**
 * Resolve one activity to its record spec, or null when it is not of the record.
 *
 * The rule in one sentence: **the type names the event unless the type is generic, in which case
 * the status does** — and anything the tables leave unclassified is excluded.
 */
export function recordSpecFor(
  activityType: string,
  resultingStatus?: string,
): RecordSpec | null {
  const rule = RECORD_TYPES[activityType as RecordType];
  if (rule === undefined || rule === null) return null;
  if (rule !== BY_STATUS) return rule;
  /* generic type — the status is the whole meaning. A pre-migration row carrying none cannot be
     classified, and an unclassifiable row is excluded rather than guessed at. */
  if (!resultingStatus) return null;
  return RECORD_STATUS[resultingStatus as QueryStatus] ?? null;
}

/**
 * The record for the visible days. Pure: one pass over the activities already in memory.
 *
 * `range` is the visible day list — the same array `calendarDays` receives, so the two placement
 * functions cannot come to disagree about which days are on screen.
 *
 * ⚠️ AN ORPHANED ACTIVITY IS EXCLUDED. Every record row offers OPEN QUERY, so a row whose query no
 * longer exists is a control that cannot work; and its agent could not be named either, since
 * `Activity` carries no `agentId` and the agent is only reachable through the query.
 */
export function recordDays(
  activities: Activity[],
  queries: Query[],
  agents: Agent[],
  range: readonly string[],
): Map<string, RecordItem[]> {
  const byDay = new Map<string, RecordItem[]>();
  const visible = new Set(range);
  if (visible.size === 0) return byDay;

  const queryById = new Map(queries.map((q) => [q.id, q]));
  const agentById = new Map(agents.map((a) => [a.id, a]));

  /* sort by the activity's own date so a day reads in the order the events happened; the id is the
     tie-break, so two events stamped at the same instant keep a stable order between renders */
  const ordered = [...activities].sort((a, b) => {
    const d = String(a.date ?? "").localeCompare(String(b.date ?? ""));
    return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
  });

  /* ⚠️ THE EXCHANGE COUNT SEQUENCES OVER THE WHOLE QUERY, NOT OVER THE VISIBLE DAYS. Exchange 3
     is the third thing that passed between the writer and the agency — it does not become
     "exchange 1" because the reader happens to be looking at September. So the run below walks
     EVERY eligible activity and the range filter is applied afterwards, when the item is placed. */
  const seen = new Map<string, { n: number; ms: number; dir: RecordDir }>();

  for (const act of ordered) {
    const spec = recordSpecFor(act.activityType as string, act.resultingStatus as string | undefined);
    if (!spec) continue;
    const query = queryById.get(act.queryId);
    if (!query) continue;

    const prev = seen.get(act.queryId);
    const exchange = (prev?.n ?? 0) + 1;
    const ms = new Date(act.date).getTime();
    const gapDays = prev && !Number.isNaN(ms) && !Number.isNaN(prev.ms)
      ? Math.max(0, Math.round((ms - prev.ms) / 86400000))
      : undefined;
    const turned = !!prev && prev.dir !== spec.dir;
    seen.set(act.queryId, { n: exchange, ms, dir: spec.dir });

    const ymd = isoToYmd(act.date);
    if (!ymd || !visible.has(ymd)) continue;

    const agent = agentById.get(query.agentId);
    const list = byDay.get(ymd) ?? [];
    list.push({
      key: `rec-${act.id}`,
      ymd,
      label: spec.label,
      dir: spec.dir,
      queryId: act.queryId,
      activityId: act.id,
      agent: agent ? agentPrimary(agent) : "",
      agency: agent ? agentSecondary(agent) : "",
      manuscriptId: act.manuscriptId ?? "",
      note: act.description ?? "",
      detail: act.details ?? "",
      exchange,
      ...(gapDays === undefined ? {} : { gapDays }),
      turned,
    });
    byDay.set(ymd, list);
  }
  return byDay;
}

/**
 * ⚠️ THE RECORD'S TONES ARE CALENDAR-LOCAL, AND THE SHAPE IS THE REASON — not just the fence.
 *
 * `todoFamily.CAL_PIP` is the one place colour vocabulary lives, and its own comment says so, so
 * this looks at first like the wrong home. Three things say otherwise, and the first is the one
 * that would still hold if the fence lifted:
 *
 *  1. THE SHAPES DO NOT MATCH. A `CAL_PIP` entry is `{ bg, tx, bd }` — a filled, bordered chip.
 *     The record layer has NO fill and NO border by design; it is a dot and a muted word. Putting
 *     it in that map means writing `bg: "transparent", bd: "transparent"`, which encodes "there is
 *     no fill here" in a vocabulary whose every other entry means "this is the fill". That is a
 *     map lying about its own contents.
 *  2. IT IS NOT A PIP FAMILY. `CalPipFamily` classifies LIVE work by who it belongs to. The record
 *     is a different layer, not a fifth family — and widening the union would invite a `CAL_PIP`
 *     consumer to treat a past event as a live card.
 *  3. TWO LOCKS OUTSIDE THIS SESSION'S TERRITORY ASSERT THE FOUR (`tasksAuditLegend.test.tsx`
 *     requires legend and map to have identical keys; `todoCalendar.test.ts` names the four
 *     exactly). Both are right, and neither is mine to edit.
 *
 * The legend still renders FROM a record rather than from literals in the page — the rule that
 * matters — it simply reads two records now, each owning the layer it describes.
 */
export const REC_TONE: Record<RecordDir, { dot: string }> = {
  out: { dot: "#b9a48f" },
  in: { dot: "#8a9e88" },
};

/** The record's own legend rows, in the order the layer reads. */
export const REC_LEGEND: { dir: RecordDir; label: string }[] = [
  { dir: "out", label: "YOU SENT" },
  { dir: "in", label: "THEY REPLIED" },
];

/* ⚠️ NO `REC_INK` CONSTANT. The record's muted ink does not vary by item, so it lives in the
   stylesheet with every other fixed colour on this page; only the DOT varies (by direction), which
   is why that one is data-driven and inline. A constant nothing reads is a slot a later change
   fills without anyone deciding it should exist. */

/**
 * ⚠️ THE CELL'S SLOT ARITHMETIC IS A FUNCTION, NOT A LINE OF JSX — because a source-string lock
 * proves the expression was written and never that it computes the right thing. The two layers
 * share one cap, and the order is the rule: LIVE WORK TAKES ITS SLOTS FIRST, the record takes what
 * is left, and the fold counts everything that did not fit. A busy day therefore never pushes
 * today's work under a "+N MORE" to make room for last week's history.
 *
 * `cap` comes from `calFoldCap`, which is untouched by this pack: it answers "how many pips fit",
 * and a record pip is a pip — same box, same `CAL_PIP_H`.
 */
export interface CellSlots<T, R> { shownItems: T[]; shownRecs: R[]; overflow: number }

export function cellSlots<T, R>(
  items: readonly T[], recs: readonly R[], cap: number, capFolded = Math.max(0, cap - 1),
): CellSlots<T, R> {
  const cells = Math.max(0, cap);
  const total = items.length + recs.length;
  /* ⚠️ THE COUNTER TAKES A SLOT, AND UNTIL NOW IT DID NOT (fixes pack, Phase 1). `calFoldCap`'s
     own comment claimed a row was reserved for "+N MORE"; the arithmetic never reserved one, so a
     day at exactly the cap drew `cap` pips AND a counter into room for `cap`. The cell is a
     fixed-height flex column, so the overflow was absorbed by SHRINKING every pip — the failure is
     silent and looks like an empty month.
     The ref's rule, and now the code's: everything fits, or one slot goes to the counter. */
  const room = total <= cells ? cells : Math.max(0, Math.min(capFolded, cells));
  const shownItems = items.slice(0, room);
  const shownRecs = recs.slice(0, Math.max(0, room - shownItems.length));
  const overflow = total - shownItems.length - shownRecs.length;
  return { shownItems, shownRecs, overflow: Math.max(0, overflow) };
}

/**
 * ⚠️ ONE FACT, ONE PIP — the record supersedes the done card that reports the same activity.
 *
 * A send, a nudge and a close each leave ONE `Activity`, and the calendar was drawing it twice:
 * once as a struck done item (`calendarDays` reads `CLEARING_ACTIVITY_TYPES` off the feed) and once
 * as a record entry (`recordDays` reads the same feed). Measured on 12 August: "12 ITEMS · 6 ON THE
 * RECORD" — six activities, twelve pips, half the cell's cap spent restating what the other half
 * already said.
 *
 * ⚠️ THE MATCH IS THE ACTIVITY ID, NOT THE TASK TYPE. Both sides derive from the same documents, so
 * this is an identity rather than a guess — and it is what makes the near-misses safe. An activity
 * the record layer EXCLUDED (an orphan; a `STATUS_CHANGED` with no `resultingStatus`) has no record
 * entry to supersede it, so its done card survives, which is the direction that must never be
 * wrong. Matching on type would have hidden those.
 *
 * ⚠️ AND IT TAKES THE DAY'S RECORD AS AN ARGUMENT RATHER THAN A FLAG. The caller passes whatever is
 * on screen, so when the layer is hidden it passes `[]`, nothing is superseded and every done card
 * returns — no `if (showRecord)` anywhere, and therefore no way for the two states to drift. A cell
 * cannot go blank because a hidden layer superseded a visible one.
 *
 * The Done FACET still governs whatever survives: this is presentation of the same feed, and the
 * board is untouched.
 */
export function dedupeAgainstRecord(
  items: readonly CalendarItem[],
  recordItems: readonly RecordItem[],
): CalendarItem[] {
  /* ⚠️ THE RESTORE IS STRUCTURAL, NOT GUARDED — and that is deliberate. An empty record supersedes
     nothing because there is nothing in the set to match, so the hidden-layer behaviour cannot be
     removed by deleting a check. A `recordItems.length === 0` early return sat here and was a pure
     no-op: verified by deleting it and watching all 101 tests still pass, which is the honest way to
     find out that a guard is decoration. One guard now, and it is the one doing the work. */
  const shown = new Set(recordItems.map((r) => r.activityId).filter(Boolean));
  if (shown.size === 0) return [...items];
  return items.filter((i) => !(i.family === "done" && i.activityId && shown.has(i.activityId)));
}

/* ══ THE PILL GRAMMAR (pill pack, Phase 2) ══════════════════════════════════════════════════
 *
 * ⚠️ SUMMARISATION IS A GRID-RENDER CONCERN, AND THIS IS THE ONLY FUNCTION THAT DOES IT.
 * Nothing upstream is shortened: `calendarDays` and `recordDays` keep full labels, the day panel
 * reads them unchanged, and `FocusFlow` receives the same card it always did. The design ref makes
 * the opposite choice — it shortens at the data layer — and copying that here would degrade the
 * TO-DO LIST, which reads the same `assembleBoardColumns` output. One vocabulary, applied at one
 * call site, on one surface.
 *
 * ⚠️ THE RECORD SIDE IS ALREADY THIS GRAMMAR, so it is returned untouched rather than re-derived.
 * `RECORD_TYPES`/`RECORD_STATUS` were written two packs ago as two-word labels — "Query sent",
 * "Partial requested", "Holding reply", "Offer received", "Closed" — and a second table restating
 * them is how two readings of one vocabulary come to disagree. The lock asserts that equality
 * rather than assuming it.
 *
 * ⚠️ A WRITER'S OWN TASK IS NEVER SUMMARISED. "Book the library room" is their sentence, not the
 * app's to abbreviate; it is returned whole and the CELL truncates it with an ellipsis, so the
 * tooltip and the panel still carry every word. That is also why this function does no slicing —
 * cutting the string here would put a shortened value where a full one is expected.
 */

/**
 * The two-word vocabulary for a query task, keyed on the board's own `taskType`.
 *
 * ⚠️ `Partial<>`, DELIBERATELY. Only the five "do" kinds reach the calendar at all — housekeeping
 * has no action date (`cardActionYmd` returns null for it) — and giving a pill to a kind that
 * cannot render would assert a surface that does not exist. The lock derives which kinds calendar
 * by CALLING `cardActionYmd`, and checks this table against that, so neither list is hand-written
 * on both sides.
 *
 * ⚠️ `offer_received` NOW HAS ITS ROW — the gap this table reported is CLOSED (finishing pack).
 * It was absent because the originating pack's table had no card row for an offer and inventing
 * product copy overnight is not this session's call; Nick ruled `Decide on offer`, which is what
 * the card is: an offer is in hand and the decision is the writer's. It is not "Accept offer" —
 * the app does not presume the answer — and it stays in the writer's-turn family for that reason.
 */
export const PILL_BY_TASK: Partial<Record<TaskType, string>> = {
  partial_requested: "Send partial",
  full_requested: "Send full",
  /* ⚠️ "resubmission", NOT "pages". The pack suggested `Send pages`; this app's noun for R&R
     materials is `resubmission` — `queryAmbient.ts:114` types it (`"partial" | "full" |
     "resubmission"`), `nudgeState.ts:76` says "send your resubmission first", and the Queries
     command bar reads "Record your resubmission". And "pages" is actively WRONG here: it collides
     with the opening sample, whose label was deliberately retired FROM "Sample pages" because that
     name asserts a unit the data does not carry. */
  revise_resubmit: "Send resubmission",
  nudge_overdue: "Nudge due",
  offer_received: "Decide on offer",
};

/** The snoozed family's pill — a return is a return whatever came back. */
export const PILL_SNOOZED = "Task returns";

/**
 * The grid's label for one item. Full fidelity in, two words out — and only here.
 *
 * Returns the item's OWN text for a writer's task and for anything the table does not cover, so an
 * unknown kind degrades to the truth rather than to an invented summary.
 */
export function pillLabel(item: CalendarItem | RecordItem): string {
  /* a record entry: `family` is the discriminator, and the record's label is already two words */
  if (!("family" in item)) return item.label;
  if (item.family === "snoozed") return PILL_SNOOZED;
  /* the writer's own words, and completed work's own words — never summarised on their behalf */
  if (item.family === "task" || item.family === "done") return item.label;
  const t = item.card?.taskType as TaskType | undefined;
  return (t && PILL_BY_TASK[t]) || item.label;
}

/* ══ THE HOVER PEEK (finishing pack, Phase 2; ref calendar-month-focus-v5.html) ═══════════════
 *
 * ⚠️ THE PEEK IS PORTALLED, SO IT SPENDS NO CELL CUSHION. The reclaim pack left exactly +4.0px in
 * a cell at 1280 and above; a peek that grew the cell, or that added so much as a pill's margin to
 * it, would spend a budget three packs went into earning. It is `position: fixed` over the grid and
 * the cell underneath is untouched.
 *
 * ⚠️ AND IT IS A PEEK, NOT A READING SURFACE — `pointer-events: none`, no actions, clicks pass
 * through to the cell. Anything else and it becomes a second day panel with a worse shape.
 */

/** How long the pointer must rest on a populated cell before it opens. */
export const PEEK_DELAY_MS = 450;
/** The peek's footprint as a multiple of the cell's own. */
export const PEEK_SCALE = 1.6;
/** Parchment at not-quite-opaque, so it reads as laid over the month rather than cut into it. */
export const PEEK_OPACITY = 0.97;
/** Breathing room between the peek and the grid's edge, both axes. */
export const PEEK_PAD = 4;
/** How far above the cell's own top edge it starts, before clamping. */
export const PEEK_LIFT = 10;

export interface PeekRect { left: number; top: number; width: number; height: number }

/**
 * Where the peek goes — pure, so the clamping is testable without a browser.
 *
 * ⚠️ EDGE CELLS GROW INWARD. A cell in the first or last column would otherwise put a 1.6×
 * footprint half outside the month; clamping the left edge to the grid's box turns "centred on the
 * cell" into "as centred as it can be while staying on the page", which is the ref's behaviour.
 *
 * ⚠️ AND THE HEIGHT IS PASSED IN, MEASURED, NEVER ASSUMED. The peek holds every item on the day
 * with no cap, so its height is whatever that many pills come to — the one number this function
 * cannot derive. Callers pass 0 on the first pass and re-clamp once it has been laid out.
 */
export function peekBox(
  cell: { left: number; top: number; width: number },
  grid: { left: number; top: number; right: number; bottom: number },
  peekH = 0,
  scale = PEEK_SCALE,
): PeekRect {
  const width = Math.round(cell.width * scale);
  const centred = cell.left - (width - cell.width) / 2;
  const maxLeft = grid.right - width - PEEK_PAD;
  /* ⚠️ `Math.min` BEFORE `Math.max`, so a peek wider than the grid pins to the LEFT edge rather
     than to a negative one. Reversed, an over-wide peek would be clamped off the left of the page. */
  const left = Math.max(grid.left + PEEK_PAD, Math.min(centred, maxLeft));
  const wanted = cell.top - PEEK_LIFT;
  const maxTop = grid.bottom - peekH - PEEK_PAD;
  const top = Math.max(grid.top + PEEK_PAD, Math.min(wanted, maxTop));
  return { left, top, width, height: peekH };
}

/* ══ VIEW MODES (finishing pack, Phase 3; ref calendar-month-focus-v5.html) ════════════════════
 *
 * ⚠️ THIS REPLACES "THE RECORD" TOGGLE, WHOSE MEANING WAS OPAQUE. A control labelled with the name
 * of a layer asks the reader to know what that layer is before they can decide whether they want
 * it. The two modes name what you get instead of what gets switched.
 */
export type CalMode = "both" | "upcoming";

/**
 * The visible days in `Upcoming only` — whole weeks, from the week containing today.
 *
 * ⚠️ MONTH-BOUNDED, NOT A ROLLING FIVE WEEKS, and the inventory is the reason. The existing
 * machinery is `monthGridDays(anchor)` → `monthLabel(anchor)` → `sameMonth(ymd, anchor)`: a
 * month-bounded range keeps ALL THREE unchanged, because what is shown is still a subset of the
 * anchor's own month. A rolling five weeks spans two months, so it would need a second labelling
 * rule for a title naming two of them AND a second dimming rule, since `sameMonth` would then dim
 * a third of the grid as "not this month" when those days are exactly what the mode exists to
 * show. Two new rules against none is not a close call.
 *
 * ⚠️ WHOLE WEEKS ARE PRESERVED — a week is dropped only when ALL of it is behind today. So the
 * first surviving row still carries its pre-today days, which the page dims rather than deletes:
 * a row starting on a Thursday because that is when today falls would misrepresent the week.
 *
 * ⚠️ A PAST MONTH LEGITIMATELY YIELDS NOTHING. Navigating to July and asking what is still ahead
 * in it has an honest answer, and the answer is nothing — so this returns `[]` and the page states
 * it. Clamping to "the last week anyway" would put a week of finished days under a heading that
 * promises upcoming work.
 */
export function upcomingGridDays(anchorYmd: string, todayYmd: string): string[] {
  const all = monthGridDays(anchorYmd);
  const out: string[] = [];
  for (let i = 0; i < all.length; i += 7) {
    const week = all.slice(i, i + 7);
    /* the week survives if ANY of it is today or later — i.e. if its last day is */
    if (week[week.length - 1] >= todayYmd) out.push(...week);
  }
  return out;
}

/* ══ KIND FILTERS (finishing pack, Phase 4; ref calendar-month-focus-v5.html) ══════════════════
 *
 * ⚠️ THIS SUPERSEDES A RECORDED RULING, DELIBERATELY AND WITH ITS REASON. The standing lock said
 * "the calendar uses `TODO_FACETS` as the single shared vocabulary", and that was right when the
 * calendar was a projection of TASKS: the same four buckets the board and the sidebar badge read,
 * narrowing the same live cards. The record layer changed what the page IS. It now shows EVENTS —
 * things that happened, in both directions, most of which are not tasks and never were — and a
 * vocabulary built for live work cannot name them. "Urgent" has no meaning applied to a query sent
 * three weeks ago. So the calendar gets its own event-kind filters, and **`TODO_FACETS` is
 * untouched**: the board keeps it, the sidebar badge keeps it, and this control is calendar-local.
 *
 * ⚠️ ONE CONST STATES BOTH VOCABULARIES, which is the point of putting it beside `RECORD_TYPES`.
 * The calendar has two of them — record labels (from the activity log) and card pills (from the
 * board's task types) — and a kind is a claim about BOTH. Split across two files they would drift;
 * here, adding a record label or a task type without filing it under a kind is visible in one
 * screen, and the lock below asserts the coverage rather than trusting the eye.
 */
export type CalKind =
  | "queries" | "materials" | "responses" | "nudges" | "closures" | "tasks";

export interface CalKindRule {
  label: string;
  /** Record labels (as `RECORD_STATUS`/`RECORD_TYPES` emit them) that belong to this kind. */
  record: string[];
  /** Board task types whose CARD belongs to this kind. */
  task: TaskType[];
  /** Live families that belong to this kind regardless of task type. */
  family?: CalFamily[];
}

/**
 * ⚠️ THE LABELS ARE THE MATCH KEY, NOT A SECOND ENUM. `RECORD_STATUS` and `RECORD_TYPES` already
 * decide what an entry is CALLED, and every one of those strings is a closed set this file owns.
 * Matching on the label means a new record label that nobody files here fails the coverage lock
 * loudly, instead of being silently filtered out of — or into — a kind it was never considered for.
 */
export const CAL_KINDS: Record<CalKind, CalKindRule> = {
  queries: { label: "Queries sent", record: ["Query sent"], task: [] },
  /* the writer sending what was asked for — the three materials, and nothing else */
  materials: { label: "Materials sent", record: ["Partial sent", "Full sent"], task: ["partial_requested", "full_requested", "revise_resubmit"] },
  /* the agency moving: a request, a holding line, or an offer */
  responses: {
    label: "Agent responses",
    record: ["Partial requested", "Full requested", "Revise & resubmit", "Holding reply", "Offer received"],
    task: [],
  },
  nudges: { label: "Nudges", record: ["Nudge sent"], task: ["nudge_overdue"] },
  /* ⚠️ THE WRITER'S ANSWER TO AN OFFER IS A CLOSURE, NOT A RESPONSE. `Offer accepted` and
     `Offer declined` end the conversation; `Offer received` starts the last part of it. They read
     as a pair and belong on opposite sides of this line — which is exactly why `RECORD_TYPES`
     keeps the two answers' own labels rather than filing them under the generic "Closed". */
  closures: { label: "Closures", record: ["Closed", "Offer accepted", "Offer declined"], task: [] },
  /* ⚠️ THE WRITER'S OWN WORK, whatever shape it arrives in: their own dated tasks, anything
     returning from a snooze, and the offer decision — which is a decision only they can make. */
  tasks: { label: "Your tasks", record: [], task: ["offer_received"], family: ["task", "snoozed"] },
};

/** Every kind, in the order the checklist draws them. */
export const CAL_KIND_ORDER: CalKind[] = ["queries", "materials", "responses", "nudges", "closures", "tasks"];

/** All of them — the default, and what "nothing is filtered" means. */
export const allKinds = (): CalKind[] => [...CAL_KIND_ORDER];

/**
 * ⚠️ A DONE ITEM IS FILED BY WHAT IT WAS, and when that cannot be told, it is KEPT.
 *
 * Completed cards carry no `taskType` — they are built from the activity log — so the only handle
 * on them is their label, which `terseDoneLabel` wrote. Rather than guess, an item no kind claims
 * survives every filter: a filter that silently swallows what it does not recognise reports a
 * quieter month than the writer has, which is the one direction this must not fail in.
 */
export function itemKind(item: CalendarItem): CalKind | null {
  for (const k of CAL_KIND_ORDER) {
    const rule = CAL_KINDS[k];
    if (rule.family?.includes(item.family)) return k;
    const t = item.card?.taskType as TaskType | undefined;
    if (t && rule.task.includes(t)) return k;
  }
  /* a done item: match on the label the record uses for the same event */
  for (const k of CAL_KIND_ORDER) {
    if (CAL_KINDS[k].record.some((l) => item.label.toLowerCase().startsWith(l.toLowerCase()))) return k;
  }
  return null;
}

/** The record's kind — its label is already one of the closed set. */
export function recordKind(r: RecordItem): CalKind | null {
  for (const k of CAL_KIND_ORDER) if (CAL_KINDS[k].record.includes(r.label)) return k;
  return null;
}

/** Kept when its kind is on, or when nothing claims it. */
export const itemInKinds = (item: CalendarItem, on: CalKind[]): boolean => {
  const k = itemKind(item);
  return k === null || on.includes(k);
};
export const recordInKinds = (r: RecordItem, on: CalKind[]): boolean => {
  const k = recordKind(r);
  return k === null || on.includes(k);
};
