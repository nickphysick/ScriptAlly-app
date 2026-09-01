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
import { resolveExpectedDate } from "./expectedDate";
import { queryBucket } from "./queryAmbient";

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

/* ⚠️ THE MONTH GRID'S MATHS IS RETIRED (calendar timeline pack, Phase 3) — `monthGridDays`,
   `monthLabel`, `shiftMonth` and `sameMonth`, along with the `.off` dimming and the "torn row"
   law they served. A rolling seven-day window starts where it is told and runs forward, so there
   is no month to be a subset of, no padding to whole weeks and no other-month day to dim. The
   window is `windowDays` in `todoTimeline`. Recover from the commit before this one if a
   far-horizon month view is ever wanted back — it is one of Nick's open questions.

   ⚠️ AND `weekDays`/`weekLabel`/`shiftWeek` ARE NOT COMING BACK EITHER, despite a week view being
   back. Those served a week of seven CELLS showing what the month already showed; this is a week
   of rows and spans. The name collides; the thing does not. */

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

/* ⚠️ THE FOLD IS RETIRED (calendar timeline pack, Phase 3) — `CAL_CELL_CAP`, `CAL_CELL_FLOOR`,
   `CAL_PIP_H`, `CAL_CELL_CHROME`, `CAL_MORE_H`, `FoldMetrics`, `FOLD_FALLBACK`, `FoldResult`,
   `foldFor`, `calFoldCap`, `calFoldCapFolded` and `foldMetricsFrom`, with the measured-pill
   machinery and `data-fold-short` that reported when the floor could not be honoured.

   ⚠️ THE WHOLE FAMILY EXISTED BECAUSE A DAY CELL HAD A FIXED HEIGHT. A timeline row grows to hold
   what it holds — lanes are packed, and the board scrolls — so there is nothing to overflow, no
   "+N MORE" to count and no density floor to fall short of. Three packs of careful arithmetic,
   every value of it measured and correct, about a box that no longer exists. */

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

/* ⚠️ `cellSlots` IS RETIRED WITH THE FOLD (Phase 3). It divided a cell's fixed number of slots
   between the live work and the record, live work first. A lane holds every occupant it is given,
   so there is no division left to make — but the ORDER it encoded survives as a fact about the
   render: bands are drawn beneath chips, so a span never covers the work sitting on it. */

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

/* ⚠️ THE HOVER PEEK IS RETIRED (Phase 3) — `PEEK_DELAY_MS`, `PEEK_SCALE`, `PEEK_OPACITY`,
   `PEEK_PAD`, `PEEK_LIFT`, `PeekRect` and `peekBox`, with the portal, the two clamps and the
   parked-pointer guard. It was the answer to "+N MORE": a way to unfold a cell that was hiding
   something. Nothing is hidden now, so the answer has no question. */

/* ⚠️ THE VIEW MODES AND THE EVENT-KIND VOCABULARY ARE RETIRED (Phase 3) — `CalMode`,
   `upcomingGridDays`, `CalKind`, `CalKindRule`, `CAL_KINDS`, `CAL_KIND_ORDER`, `allKinds`,
   `itemKind`, `recordKind`, `itemInKinds`, `recordInKinds` and `expectedInKinds`.

   ⚠️ `Upcoming only` WAS A MONTH-BOUNDED RANGE, and a rolling window that starts at today already
   is one — the mode's whole job was to stop a month showing three weeks of finished days, which a
   seven-day window starting today cannot do.

   ⚠️ THE KINDS ARE SUPERSEDED RATHER THAN DELETED IN SPIRIT. `CAL_KINDS` named EVENTS by their
   place in the querying story (queries · materials · responses · nudges · closures · tasks), which
   is the right vocabulary for a month of history. A timeline's rows are relationships, so the
   useful question is which LAYER you are looking at — your turn, waiting, on the record, your
   tasks, carried — and that is `TIMELINE_FILTERS` in `todoTimeline`. Five, not six, and each one
   names a thing on the board rather than a category of event.

   `TODO_FACETS` is untouched by both, as it always was: the board and the sidebar badge keep it. */

/* ══ CARRIED-TASK ORIGIN GHOSTS (finishing pack, Phase 5; ref calendar-month-focus-v5.html) ════
 *
 * ⚠️ THE PROBLEM IS THAT AN UNACTIONED DATED ITEM TELEPORTS. Roll-forward puts the live work on
 * TODAY — which is right, because that is where the work is — but it leaves the month saying
 * nothing happened on the day it fell due. A reader scanning August sees a clean fortnight and one
 * busy today, when what actually happened is that something has been waiting a fortnight.
 *
 * ⚠️ THE GHOST CARRIES NO STATE AND NOTHING TO CLEAN UP. It is derived at render from the item's
 * own `rolledFrom` — no ghost record, no carry flag, no write. If the item leaves the feed the
 * ghost vanishes in the same render, because there was never anything else holding it up.
 *
 * ⚠️ AND A GHOST IS NEVER DEDUPED AGAINST THE RECORD. The dedupe exists because a completed card
 * and a record entry can be two readings of ONE activity; a carried task is not an activity at all
 * — nothing happened on its origin day, which is precisely what the ghost says. Feeding ghosts to
 * `dedupeAgainstRecord` would let a record entry on the origin day delete the mark for a task that
 * is still outstanding. Asserted, because the two touch the same cells.
 */
export interface GhostItem {
  key: string;
  /** The origin day it renders on. */
  ymd: string;
  /** The live item it points at — which lives on today. */
  of: CalendarItem;
}

/**
 * The ghosts belonging to one day: every carried item whose ORIGIN is that day.
 *
 * ⚠️ IT READS TODAY'S ITEMS, because that is where carried work renders. Passing the day's own
 * items instead would find nothing, forever, and look like a feature nobody switched on.
 */
export function ghostsFor(ymd: string, todayItems: CalendarItem[]): GhostItem[] {
  return todayItems
    .filter((it) => it.rolledFrom === ymd)
    .map((it) => ({ key: `ghost-${it.key}`, ymd, of: it }));
}

/**
 * Whole days between two dates.
 *
 * ⚠️ MIDDAY ANCHORS, so a DST shift cannot round a whole day off. Both dates are parsed at 12:00
 * local; the offset between them is at most an hour either way, which `Math.round` absorbs. Parsed
 * at midnight, an hour's shift lands the difference at 13.958 days and floors to 13.
 */
export function daysSince(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T12:00:00`).getTime();
  const b = new Date(`${toYmd}T12:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * The live row's provenance line in the day panel — fact, and nothing more.
 *
 * ⚠️ NO ESCALATION, NO URGENCY, NO VERDICT. "12 days waiting" is a fact; "12 days overdue" is a
 * judgement wearing a number, and this app reports. The house copy law forbids "overdue" outright
 * and every quality or speed adjective with it — the writer decides what a fortnight means.
 *
 * ⚠️ AND THE DAY COUNT OMITS ITSELF AT ZERO rather than reading "0 days waiting": an item that
 * fell due today has not waited, and a zero there states a duration that has not happened.
 */
export function carriedLine(rolledFrom: string, today: string, turn = "Your turn"): string {
  const d = daysSince(rolledFrom, today);
  const parts = [turn, `Since ${shortCalDate(rolledFrom)}`];
  if (d > 0) parts.push(`${d} day${d === 1 ? "" : "s"} waiting`);
  return parts.join(" · ");
}

/** "7 Aug" — the same shape the panel's other dates take. */
/**
 * ⚠️ THE YEAR APPEARS ONLY WHEN IT IS NOT THIS ONE — the house convention the query list already
 * follows ("14 Mar", and "30 Jun 2024" when it is not the current year).
 *
 * Without it a 2024 date renders as "15 Apr" and reads as five months ago. Measured on the board:
 * a card said "overdue since 15 Apr · 29 months", and the two halves looked like they disagreed by
 * two years — the SPAN was right and the DATE was hiding its year. That sent me looking for a
 * second span bug that did not exist, which is the more expensive half of this: a date that omits
 * a distinguishing part does not merely under-inform, it makes correct numbers beside it look
 * wrong.
 */
export function shortCalDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  const base = `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/* ══ DRAGGING YOUR OWN TASKS (proposals pack, Phase 2; ref calendar-proposals-v6.html) ═════════
 *
 * ⚠️ ONLY WRITER-OWNED PILLS DRAG — YOU CANNOT DRAG A FACT. A send, a nudge, a record entry, a
 * ghost, an expected date: every one is DERIVED from something that happened or was asked for, and
 * moving the pill would either lie about the record or silently rewrite a derivation at the wrong
 * end. A writer's own task is the one thing on the grid whose date is INPUT — the two-natures law's
 * own field (`UserTask.dueDate`) — so it is the one thing a hand can move. The drop writes through
 * `updateUserTask`, the existing writer; nothing auto-fires.
 */
export const draggableTask = (it: CalendarItem): boolean =>
  /* family "task" excludes snoozed returns (family "snoozed" — flag-derived) and everything
     agent-shaped; `struck` excludes completed items, which are the log's, not the writer's to move;
     `userTaskId` is the write's own key, so a pill this returns true for can always be written */
  it.family === "task" && !it.struck && !!it.card?.userTaskId;


/* ══ EXPECTED DATES (proposals pack, Phase 3; ref calendar-proposals-v6.html) ══════════════════
 *
 * ⚠️ THE GAP THIS CLOSES: `resolveExpectedDate()` existed and nothing surfaced it on the calendar,
 * so "when will I hear back" had no answer on the page shaped to answer it.
 *
 * ⚠️ RESOLVED, NEVER READ RAW — `responseDeadline` and `writerExpectedDate` are consumed only
 * through the resolver, whose D4 recency rule and provenance are the whole point of that module.
 *
 * ⚠️ NO REPLY-STATED WINDOW AT THIS LEVEL, MATCHING EVERY OTHER LIST SURFACE. The window an agent
 * states inside a holding reply lives in the query's NESTED events, which only the reading pane
 * loads (`QueryTimeline` is the one caller that passes `events`; the command bar's siblings and
 * `todoBoard` omit them, byte-identically to the pre-holding-reply behaviour). The GLOBAL feed
 * this page holds does not carry `replyWeeks`, so composing a window from it would be inventing
 * data. Consequence, stated: a query whose latest statement is a reply resolves here from the
 * agent's standing weeks or the writer's date — the same answer the To-do board gives for the
 * same query — and "reply"-sourced items cannot arise. The pack renders nothing for them anyway.
 */
export interface ExpectedItem {
  key: string;
  ymd: string;
  queryId: string;
  /** Display name — `agentPrimary`, like every agent-naming surface. Panel only; never the pill. */
  agent: string;
  source: "agent" | "writer";
  /** agent-source: the stated window and the send it counts from. */
  weeks?: number;
  fromYmd?: string;
  /** writer-source: when they said so. Absent on a legacy unstamped date — then the clause OMITS
   *  itself rather than inventing a moment (the rows-omit-themselves law). */
  setYmd?: string;
}

/* ⚠️ `expectedDays` IS RETIRED (Phase 3) AND ITS TWO NEIGHBOURS ARE NOT. It placed a "Reply
   window" pill on the window's own day, because a grid of cells cannot draw a span; the band is
   that span, so the pill would state one fact twice. `ExpectedItem` and `expectedLine` survive
   with a real caller — `timelineWeek` builds the item onto each band, so this construction moved
   rather than being duplicated, and `expectedLine` is still the ONE producer of that copy. */

/** The pill's one label — no agent name on a pill; the grid is a density map. */
export const EXPECTED_PILL = "Reply window";

/**
 * The panel row's source line — the source stated AS FACT, because the two mean different things.
 *
 * ⚠️ "Their", NOT THE PACK'S "Her" — the no-gendered-pronouns law outranks a pack's example copy.
 * The app never stores an agent's pronouns, and a wrong guess misgenders a real person; they/them
 * is the standing rule for every surface an agent is named on. Deviation flagged in the report.
 */
export function expectedLine(x: ExpectedItem): string {
  if (x.source === "agent") {
    const parts: string[] = [];
    parts.push(typeof x.weeks === "number"
      ? `Their stated ${x.weeks} ${x.weeks === 1 ? "week" : "weeks"}`
      : "Their stated window");
    if (x.fromYmd) parts.push(`from ${shortCalDate(x.fromYmd)}`);
    return parts.join(" · ");
  }
  return x.setYmd ? `Your date · set ${shortCalDate(x.setYmd)}` : "Your date";
}
