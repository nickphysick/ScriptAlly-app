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
      /* ⚠️ ROLL-FORWARD: the item renders TODAY; the origin day keeps one marker. */
      day(action).rolled += 1;
      day(input.today).items.push({ key: `cal-${c.key}`, ymd: input.today, label: c.title, family, card: c });
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
    });
  }

  return byDay;
}

/** Busy days fold past this many pips to "+N MORE" (the ref draws 3 + the fold). */
export const CAL_CELL_CAP = 3;

/* ══ THE FOLD THRESHOLD (tasks-viewport pack, Phase 3) ══════════════════════════════════════ */

/**
 * A pip's own height plus its top margin.
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
/** The date line at the cell's head, plus the cell's vertical padding and border. */
export const CAL_CELL_CHROME = 26;

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
export function calFoldCap(rowPx: number): number {
  if (!rowPx || rowPx <= 0) return CAL_CELL_CAP;
  const room = rowPx - CAL_CELL_CHROME;
  /* one row is reserved for the "+N MORE" line itself whenever anything folds — counting it here
     would let a cell promise a pip it then has to take back to make room for the fold line */
  const fits = Math.floor(room / CAL_PIP_H);
  return Math.max(1, Math.min(CAL_CELL_CAP, fits));
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

export function cellSlots<T, R>(items: readonly T[], recs: readonly R[], cap: number): CellSlots<T, R> {
  const cells = Math.max(0, cap);
  const total = items.length + recs.length;
  /* ⚠️ THE COUNTER TAKES A SLOT, AND UNTIL NOW IT DID NOT (fixes pack, Phase 1). `calFoldCap`'s
     own comment claimed a row was reserved for "+N MORE"; the arithmetic never reserved one, so a
     day at exactly the cap drew `cap` pips AND a counter into room for `cap`. The cell is a
     fixed-height flex column, so the overflow was absorbed by SHRINKING every pip — the failure is
     silent and looks like an empty month.
     The ref's rule, and now the code's: everything fits, or one slot goes to the counter. */
  const room = total <= cells ? cells : Math.max(0, cells - 1);
  const shownItems = items.slice(0, room);
  const shownRecs = recs.slice(0, Math.max(0, room - shownItems.length));
  const overflow = total - shownItems.length - shownRecs.length;
  return { shownItems, shownRecs, overflow: Math.max(0, overflow) };
}
