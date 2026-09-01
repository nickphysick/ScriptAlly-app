/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoTimeline — the Calendar's week view, derived (calendar timeline pack, Phase 2;
 * refs design-refs/timeline-week-ref.html for structure, timeline-event-catalogue.html for what
 * shows and what can be done to it).
 *
 * ⚠️ THIS IS A VIEW LAYER OVER AN UNCHANGED DATA LAYER. `calendarDays`, `recordDays`,
 * `expectedDays`, `ghostsFor`, `dedupeAgainstRecord`, `pillLabel` and `draggableTask` are
 * untouched by this module and by this pack; the three placement functions simply receive seven
 * day-strings where they used to receive thirty-five. Nothing here writes, stores or re-derives a
 * fact — every label, family, direction and date comes from the same functions the month grid read.
 *
 * ⚠️ ROWS ARE RELATIONSHIPS, NOT DATES. That is the whole reason the month grid could not answer
 * "how long has this been quiet": a query's silence is a SPAN, and a grid of days has nowhere to
 * draw one. One row per agent, plus a permanent "Your tasks" row pinned above them all.
 *
 * ⚠️ ONE PASS, TWO PROJECTIONS. `timelineRows` and `timelineBands` are the two halves the pack
 * names, and they are both views of `timelineWeek`'s single derivation rather than two walks over
 * the data. They HAVE to be: lanes are packed across a row's items and bands together, so two
 * independent passes would assign a chip and a band the same lane and draw them on top of each
 * other. The page calls `timelineWeek` once.
 */
import { Agent, Query, QueryStatus } from "../types";
import { BoardCard } from "./todoBoard";
import { agentPrimary, agentSecondary } from "./agentDisplay";
import { agentTurn, isTerminalStatus, matchesAgentSearch } from "./agentList";
import { isBoardClosed } from "./timelineGroups";
import { computeResponseDeadline } from "./responseDeadline";
import { queryBucket } from "./queryAmbient";
import { STATUS_ORDER } from "./statusOrder";
import {
  CalendarItem, RecordItem, GhostItem, RecordDir,
  pillLabel, draggableTask, toYmd,
} from "./todoCalendar";
import { rowGroupOf, queryGroup, type RowGroup, type QueryFacts } from "./timelineGroups";
import { rowSentence, rowNote, agentSurname, type RowCopy, type RowNote } from "./timelineCopy";
import {
  laneBars, statusIndex, sideOf, namedEndFor,
  type Segment, type BarNode, type BarWindow,
} from "./journeyBars";
import type { Activity, Manuscript, TaskFlag } from "../types";

/* ── the window ────────────────────────────────────────────────────────────────────────────── */

const parseYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/**
 * The window's days, in order.
 *
 * ⚠️ THIS REPLACES `monthGridDays`, AND IT IS DELIBERATELY NOT MONTH-AWARE. A month grid had to
 * pad to whole Monday-start weeks or draw a torn row; a rolling window starts where it is told and
 * runs `days` forward, so there are no other-month days, no lead-in, and nothing to dim. The `.off`
 * and `.lead` states go with it.
 */
/**
 * A stored ISO date as a ymd, or null.
 *
 * ⚠️ IT TAKES `unknown` BECAUSE THE FIELDS DO. `lastStatusChange` is `Timestamp | string` and
 * several of these are optional, so a signature promising `string | undefined` would be a claim
 * about the record that the record does not make. An unparseable value is null, which is the
 * honest answer for "there is no date here" and the one the grouping already handles.
 */
const ymdOf = (v: unknown): string | null => {
  if (!v) return null;
  const iso = typeof v === "string" ? v
    : typeof (v as { toDate?: () => Date }).toDate === "function" ? (v as { toDate: () => Date }).toDate().toISOString()
    : null;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : toYmd(d);
};

/** whole days between two ymds, midday-anchored so a DST shift cannot round one off */
const ymdGap = (from: string, to: string): number =>
  Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);

export function windowDays(startYmd: string, days: number): string[] {
  const out: string[] = [];
  const d = parseYmd(startYmd);
  for (let i = 0; i < Math.max(0, days); i += 1) {
    out.push(toYmd(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Shift the window by whole weeks — the pager. */
export function shiftWindow(startYmd: string, days: number, delta: number): string {
  const d = parseYmd(startYmd);
  d.setDate(d.getDate() + days * delta);
  return toYmd(d);
}

/* ── what a row holds ──────────────────────────────────────────────────────────────────────── */

/**
 * The row head's mark — whose move it is, derived from `agentTurn` and therefore from the CTA
 * engine, which is what the Queries command bar and every To-do flow already read.
 *
 * ⚠️ NOT THE REF'S THREE DOTS. The mockup draws `out`/`half`/`you` and applies them
 * inconsistently to its own sample — two rows in the same waiting state carry different marks.
 * Reading a mark off a drawing rather than off the engine is how a second definition of "whose
 * turn" gets into the app; `agentTurn` is the one that already exists.
 */
export type RowDot = "you" | "them" | "quiet" | "self";

/** An item is a point on the timeline; a band is a span. The five together are the filter set. */
export type TimelineKind = "turn" | "task" | "rec" | "ghost";
export type TimelineFilter = "turn" | "wait" | "rec" | "task";
/**
 * ⚠️ FOUR, AND `Carried` IS THE ONE THAT WENT. It filtered the origin marks a carried item left
 * behind — a signpost saying "this fell due here and is still outstanding". The bar says that
 * better and says it where the work is: a your-move stretch carries its own duration, and a
 * long-standing one draws the hatched overrun back to the date it was expected. A ghost was the
 * month grid's way of expressing a span it had no way to draw.
 *
 * ⚠️ AND THE FIRST TWO ARE RENAMED FROM THE CONTROL'S POINT OF VIEW. "Your turn" and "Waiting"
 * named the writer's state and the agent's in two different grammars; a bar has two SIDES, and
 * `Your move` / `Their move` is one grammar naming both.
 */
export const FILTER_LABEL: Record<TimelineFilter, string> = {
  turn: "Your move",
  wait: "Their move",
  rec: "Record",
  task: "Your tasks",
};

export interface TimelineItem {
  key: string;
  /** 0-based column in the window. */
  idx: number;
  ymd: string;
  kind: TimelineKind;
  /** `pillLabel`'s output, unchanged — the grid's two-word vocabulary is not re-derived here. */
  label: string;
  /** The lane it was packed into; 0 is the row's first line. */
  lane: number;
  /**
   * The last column this chip may run into before the next occupant of its lane begins.
   *
   * ⚠️ THE REF HAS NO SUCH BOUND AND ITS OWN SAMPLE NEVER EXPOSES THE GAP. There, every chip in a
   * row shares one `top` and carries `max-width: calc((100 − left)% − 10px)` — all the width there
   * is — so two items on nearby days overlap. It never shows because the two record chips that
   * would collide with a band both fall on negative day indices and are clipped out before they
   * render. A chip is given the room that is actually free instead.
   */
  spanTo: number;
  /** Record entries only — direction is authorship, and it is the only thing that varies the dot. */
  dir?: RecordDir;
  /** The live card, where there is one: the task pane's input, passed through untouched. */
  card?: BoardCard;
  queryId?: string;
  /** Carried work: the day it fell due. The live item itself sits on today. */
  rolledFrom?: string;
  struck?: boolean;
  /** `draggableTask`, unchanged — only a writer's own task has a date that is input. */
  draggable: boolean;
}

export interface TimelineRow {
  key: string;
  /** null on the pinned "Your tasks" row — it belongs to no agent, which is the point of it. */
  agentId: string | null;
  name: string;
  agency: string;
  dot: RowDot;
  items: TimelineItem[];
  /** How many lanes the row's occupants packed into; at least 1, so an empty row still has height. */
  lanes: number;
  /**
   * The manuscripts this relationship spans, one per lane, in lane order.
   *
   * ⚠️ THE KEY IS AGENT × MANUSCRIPT AND THE HEAD IS PER AGENT. Two books with one agency is two
   * LANES under one name, not two rows — a row is a relationship, and you have one relationship
   * with an agency however many books you have sent them. The head names the books only when there
   * is more than one, because naming the single obvious one is a line that says nothing.
   */
  manuscripts: { id: string; title: string }[];
  /** No live query — the row is history. Sinks below live rows in every sort. */
  closed: boolean;
  /**
   * Which group the board files this row under — `null` on the pinned "Your tasks" row alone,
   * which sits ABOVE the groups and belongs to none of them.
   */
  group: RowGroup | null;
  /**
   * What the row head's `StatusDot` draws — `null` on the pinned "Your tasks" row alone.
   *
   * ⚠️ A STATUS, NOT A DRAWING. `dot` (below) is whose-move and is expressed as a 10px CSS disc;
   * this is the query's real status and is rendered through the LOCKED component, which owns the
   * ring, the glyph, the pulse and the palette. Nothing about any of those is restated on this
   * page — that is the difference between the two fields and the reason both exist.
   */
  status: QueryStatus | null;
  /**
   * What the head says about this relationship, in the writer's own words.
   *
   * ⚠️ EMPTY ONLY ON THE PINNED ROW. Every other row has something true to say; a row that cannot
   * say anything would be a row with no query, which is the pinned one by definition.
   */
  sentence: string;
  /**
   * What to do about this relationship, in a hand — or `null` where nothing is being asked.
   *
   * ⚠️ `null` IS THE COMMON CASE AND IS THE POINT. The note is set in Caveat, which implies a
   * person wrote it, and the person it implies is the writer; scrawling on a row where nothing is
   * being asked of them puts words in their mouth about work they have not got.
   */
  note: RowNote | null;
  /**
   * The sort key SOONEST orders by — see `pressingFrom`. `null` where the row has nothing live.
   *
   * ⚠️ IT IS ON THE ROW SO THE LOCK CAN READ IT OFF THE PAGE. The seeded ordering cases passed
   * while the live board was visibly out of order, which is the "right number about the wrong
   * subject" failure: the only way to tell them apart is to assert the PAINTED order against the
   * key the painted rows actually carry.
   */
  pressingAt: number | null;
  /**
   * WHICH QUERY EACH PART OF THIS ROW IS ABOUT — the row's subject, made visible.
   *
   * ⚠️ THEY ARE ON THE ROW SO A LOCK CAN READ THEM OFF THE PAGE, and that is the only way this
   * class of bug is catchable. All three shipped variants looked correct in isolation: a true deed,
   * a true caption, a true sort key, each about a query the reader could not see. Nothing about the
   * rendered words says which query they came from, so a probe reading appearance can only ever
   * ask whether they LOOK consistent. These say it outright, and the assertion is that each is one
   * of the queries this row actually draws.
   *
   * `null` where that part of the row says nothing — the pinned task rows have no query at all.
   */
  subjects: { deed: string | null; caption: string | null; sort: string | null };
}

/* ⚠️ `TimelineBand`, `BandSource` AND THE `ExpectedItem` IT CARRIED ARE RETIRED (bars pack,
   Phase 3). A band was a whole reply window drawn as one span, which is what a grid of cells
   forces; a `Segment` is a piece of one continuous journey between two interruptions, and it
   carries which side holds the move. The window is still resolved by `resolveExpectedDate` and it
   is still the thing the bar runs to — it is drawn as the bar's own end rather than as an object
   of its own. `expectedLine` keeps its caller: the workspace's Know column. */

/* ── the view's own options ────────────────────────────────────────────────────────────────── */

/* ⚠️ THE SHOW MODES ARE RETIRED — `ShowMode`, `SHOW_LABEL`, `SHOW_ORDER` and `TimelineView.show`.
   They answered "which relationships do I want to see" with three modes, and the row rule answers
   it now with one sentence: a row appears when it has something in the visible week. `Active only`
   was that rule minus the closed rows, and a closed row only ever appears because its CLOSURE is
   in view — which is news, and news the writer should see. `Everything` showed relationships with
   nothing in the week at all, which is the empty row this pack exists to remove. `Needs me` is the
   `Your move` filter with a different name. Three controls, one rule, and the rule is shorter. */

/**
 * ⚠️ THREE SORTS, AND `name` AND `stage` ARE RETIRED (v36, Phase 6). A–Z answers "where is this
 * agent in an alphabet", which is a question about a list rather than about work; journey stage
 * answers one the GROUPS already answer, and answering it twice lets a sort disagree with the
 * heading three inches above it.
 */
export type RowSort = "soonest" | "waiting" | "active";
export const SORT_LABEL: Record<RowSort, string> = {
  soonest: "Soonest",
  waiting: "Longest waiting",
  active: "Recently active",
};
export const SORT_ORDER: readonly RowSort[] = ["soonest", "waiting", "active"];

/**
 * What each sort MEANS, in the writer's own terms — rendered beside its name in the control.
 *
 * ⚠️ A SORT NAME IS NOT A DEFINITION. "Soonest" could mean the soonest thing you must do, the
 * soonest reply expected, or the soonest anything happens; the three give different orders and a
 * reader has no way to tell which they got. The definition ships with the control.
 */
export const SORT_MEANING: Record<RowSort, string> = {
  soonest: "What is due first — a named date, or an ask already past.",
  waiting: "Longest since you sent anything, whatever has happened since.",
  active: "Most recently recorded first.",
};

/**
 * ⚠️ `kinds` IS RETIRED (Porcelain, Phase 2), AND THE FIELD WENT WITH THE CONTROL RATHER THAN
 * OUTLIVING IT. Four chips each subtracted a class of thing from a board whose whole claim is
 * that it shows the relationship entire — and a board you have silently switched a quarter of off
 * is one that lies by omission. Leaving the field behind, permanently set to "all", would have
 * left a filter nothing could reach and nothing could clear: exactly how a retired control comes
 * back as a bug six months later.
 *
 * `TimelineKind` and `FILTER_LABEL` SURVIVE and are not the same thing — an item still HAS a kind
 * and the focus band still names it. What went is the ability to filter BY it.
 */
export interface TimelineView {
  sort: RowSort;
  search: string;
}

/**
 * ⚠️ THE DEFAULT ORDER IS A NAMED CONSTANT so the reset and the initial state cannot disagree.
 * A reset that restores a literal typed at the call site is a second copy of the default, and the
 * two drift the first time one of them is retuned.
 */
export const DEFAULT_SORT: RowSort = "soonest";

export const defaultView = (): TimelineView => ({
  sort: DEFAULT_SORT,
  search: "",
});

/**
 * ⚠️ THE DAY READS ARE PASSED IN AS FUNCTIONS, NOT RE-DERIVED HERE — and that is what keeps the
 * dedupe holding. The page composes one reading of a day (`dedupeAgainstRecord`, then the kind
 * filters), and this module consumes it; deriving the day again here would be a second reading of
 * one fact, which is how two of them come to disagree. It is also why "the dedupe still holds" is
 * true by construction rather than by a check: a done card superseded by a record entry never
 * reaches this module at all.
 */
export interface TimelineData {
  queries: readonly Query[];
  agents: readonly Agent[];
  /** for the status join the side derivation needs — the page's own feed, unwindowed */
  activities: readonly Activity[];
  /** lane titles; the head names them only when a relationship spans more than one */
  manuscripts: readonly Manuscript[];
  /** a snooze is a waypoint on the bar and nothing else */
  taskFlags: readonly TaskFlag[];
  itemsFor: (ymd: string) => CalendarItem[];
  recordFor: (ymd: string) => RecordItem[];
  /**
   * ⚠️ THERE IS NO `expectedFor` HERE, AND ITS ABSENCE IS THE POINT. On the month grid a reply
   * window was a pill on its own day, because a grid of cells cannot draw a span. Here the span is
   * the band, so a chip as well would state one fact twice — the law the record dedupe exists for.
   * `expectedDays` consequently loses its only caller; reported, not quietly kept alive.
   */
  ghostsOn: (ymd: string) => GhostItem[];
  today: string;
}

/* ── identity ──────────────────────────────────────────────────────────────────────────────── */

/**
 * The base for a row with nothing dated about it.
 *
 * ⚠️ ONE SCALE, NOT TWO TIERS. An undated agent-held row sorts after every dated one, and among
 * themselves by longest waiting — and both facts are ONE number rather than a second comparator
 * that could disagree with the first. The base is beyond any real date, and the row's own
 * `waitingFrom` is added to it, so the longest wait (the smallest `waitingFrom`) gets the smallest
 * key inside the block.
 */
const PRESSING_BASE = 8.64e15;
const PRESSING_NONE = Number.POSITIVE_INFINITY;

export const YOU_ROW = "you";
export const YOU_ROW_NAME = "Your tasks";
const agentRowKey = (agentId: string): string => `agent-${agentId}`;
/**
 * ⚠️ ONE ROW PER DATED TASK, and the key is the task's own id.
 *
 * They used to share one aggregate row called "Your tasks", which could hold no deed (whose task
 * would it tick off?), no name (which task is it?) and no useful count — the group heading read
 * "1" beside four chips. A relationship earns a row because it is one thing with one state; a
 * dated task is one thing with one state in exactly the same way, and it is the only kind of row
 * on this board the writer can finish outright.
 */
const taskRowKey = (id: string): string => `task-${id}`;
export const TASK_ROW_AGENCY = "Your task";

/**
 * Which row an item belongs to.
 *
 * ⚠️ A RECORD ENTRY CARRIES NO `agentId` — only the display strings — so it is joined through its
 * `queryId`, here, in the view. `recordDays` is not given a new field for this: the join is the
 * view's business, and widening a data type to save one lookup is how a layer starts owning
 * something that is not its own.
 */
const ownerOf = (queryId: string | undefined, byQuery: Map<string, Query>): string | null => {
  if (!queryId) return null;
  const q = byQuery.get(queryId);
  return q?.agentId || null;
};

/* ── lane packing ──────────────────────────────────────────────────────────────────────────── */

interface Occupant { start: number; end: number; lane: number; spanTo: number }

/**
 * Greedy interval packing: each occupant takes the first lane whose previous occupant has ended.
 *
 * ⚠️ AND A CHIP'S FREE WIDTH FALLS OUT OF THE SAME PASS. A point item occupies ONE column for
 * packing purposes, but it renders a label that wants more; `spanTo` is the column before the next
 * occupant of its own lane begins, or the window's last column. So a chip gets the room that is
 * actually free, a lane is spent only on a genuine overlap, and nothing has to guess how wide a
 * word is.
 *
 * Occupants must arrive sorted by `start`; the caller sorts once for both purposes.
 */
function packLanes(occ: Occupant[], days: number): number {
  const lastEnd: number[] = [];
  const lastAt: (Occupant | undefined)[] = [];
  for (const o of occ) {
    let lane = 0;
    while (lane < lastEnd.length && lastEnd[lane] >= o.start) lane += 1;
    o.lane = lane;
    /* the occupant already in this lane stops where this one begins */
    const prev = lastAt[lane];
    if (prev) prev.spanTo = Math.max(prev.end, o.start - 1);
    lastEnd[lane] = o.end;
    lastAt[lane] = o;
    o.spanTo = days - 1;
  }
  return Math.max(1, lastEnd.length);
}

/* ── the derivation ────────────────────────────────────────────────────────────────────────── */

interface Draft {
  key: string;
  agentId: string | null;
  name: string;
  agency: string;
  dot: RowDot;
  closed: boolean;
  items: TimelineItem[];
  manuscripts: { id: string; title: string }[];
  /** everything the row held BEFORE the filters — see the emptying rule below */
  held: number;
  hasLive: boolean;
  /**
   * What the GROUPING reads — one entry per LIVE query, and `lastClosed` for a row with none.
   *
   * ⚠️ BUILT FROM EVERY QUERY THE RELATIONSHIP HOLDS, NOT FROM WHAT IS IN VIEW. A partial
   * requested six weeks ago still needs the writer today, at a seven-day window that cannot draw
   * it. Deriving the group from the drawn lanes would have moved a row between groups as the
   * range slider moved, which is the range deciding what is urgent.
   */
  facts: QueryFacts[];
  lastClosed: string | null;
  /** the lead query's facts — the sentence and the note both read these, so they cannot disagree */
  copy: RowCopy | null;
  /** the query `copy` and `sentence` were built from — the caption's subject */
  captionQueryId: string | null;
  /** the query `pressingAt` was taken from — the sort key's subject, filled by the bar pass */
  sortQueryId?: string | null;
  /** every query this row DRAWS, with its own copy — the deed asks the one that earned the group */
  copies: { q: Query; copy: RowCopy }[];
  /** what the row's own StatusDot draws — null only on the pinned row, which holds no query */
  status: QueryStatus | null;
  /** the row head's sentence, in the writer's words — "" only on the pinned row */
  sentence: string;
  /** sort keys, all derived */
  soonest: number;
  waitingFrom: number;
  stage: number;
  /** the newest recorded event on this row, ms — `-Infinity` where nothing is on the record */
  lastActive: number;
  /** what is pressing, as one comparable key in ms — see `pressingFrom` */
  pressingAt?: number;
  order: number;
}

export interface TimelineWeek {
  rows: TimelineRow[];
  /** the journey bars' pieces — one bar per agent × manuscript, cut by its own interruptions */
  segments: Segment[];
  nodes: BarNode[];
}

/**
 * The whole week in one pass — rows, their items, and the journey bars beneath them.
 */
export function timelineWeek(
  data: TimelineData,
  windowStart: string,
  days: number,
  view: TimelineView = defaultView(),
): TimelineWeek {
  const win = windowDays(windowStart, days);
  const idxOf = new Map(win.map((ymd, i) => [ymd, i]));
  const last = win.length ? win[win.length - 1] : windowStart;
  const byQuery = new Map(data.queries.map((q) => [q.id, q]));
  const byAgent = new Map(data.agents.map((a) => [a.id, a]));
  const search = view.search.trim().toLowerCase();

  /* which (agent, manuscript) pairs have a journey worth drawing, and which query speaks for each */
  const laneOf = new Map<string, Map<string, Query>>();
  for (const q of data.queries) {
    if (!q.agentId) continue;
    const key = agentRowKey(q.agentId);
    const per = laneOf.get(key) ?? new Map<string, Query>();
    const msId = q.manuscriptId || "";
    const held = per.get(msId);
    /* ⚠️ ONE QUERY SPEAKS FOR A LANE, and a live one always outranks a finished one. A writer who
       queried the same agency about the same book twice has one relationship about that book; the
       bar draws the journey that is still running, or the most recent one if none is. */
    if (!held) per.set(msId, q);
    else {
      const heldLive = !isTerminalStatus(held.status);
      const qLive = !isTerminalStatus(q.status);
      const newer = String(q.dateSent ?? "") > String(held.dateSent ?? "");
      if ((qLive && !heldLive) || (qLive === heldLive && newer)) per.set(msId, q);
    }
    laneOf.set(key, per);
  }

  /**
   * THE ROW'S SUBJECT — the queries a row actually DRAWS, and the only set a row-level derivation
   * may read.
   *
   * ⚠️ THREE VARIANTS OF ONE DISEASE SHIPPED BEFORE THIS EXISTED, each fixed at its own seam and
   * each leaving the next one writable: the deed asked of the row's LEAD while the GROUP came from
   * whichever query earned it; the sort key minimised over EVERY query the agent holds while the
   * row drew one per manuscript; and the deed's repair then searched the same everything-set again.
   * The missing idea was not a fix, it was a NOUN. A row draws one query per manuscript, so that
   * set is what the row's words are about, and a derivation handed it cannot quietly pick another.
   *
   * ⚠️ IT IS BUILT BEFORE `rowFor` SO THAT `mine` NEED NOT EXIST. Naming the whole set inside the
   * draft is what made all three variants a single keystroke each; with only `drawn` in scope, the
   * fourth is not a slip you can make without writing `allQueriesFor` and reading why it is there.
   */
  const drawnFor = (agentId: string): Query[] =>
    [...(laneOf.get(agentRowKey(agentId)) ?? new Map<string, Query>()).values()];

  /**
   * Every query this agent holds, drawn or not.
   *
   * ⚠️ IT EXISTS SO THAT NEEDING IT IS A DECISION WITH A NAME ON IT. A derivation that genuinely
   * wants the whole relationship — how long you have known an agency, how many times you have
   * written to them — says so at the call site, and a reader can see that it did. Nothing in the
   * row derivation reads it today; that is the point, not an oversight.
   */
  const allQueriesFor = (agentId: string): Query[] =>
    data.queries.filter((q) => q.agentId === agentId) as Query[];

  const drafts = new Map<string, Draft>();
  const you: Draft = {
    key: YOU_ROW, agentId: null, name: YOU_ROW_NAME,
    /* ⚠️ NO SECOND LINE. The ref prints a manuscript title here, which is only true of a writer
       with exactly one book; the row holds tasks from every manuscript and from none. A row that
       has nothing to say on its second line says nothing (the rows-omit-themselves law). */
    agency: "",
    dot: "self", closed: false, items: [], manuscripts: [], held: 0, hasLive: true,
    /* ⚠️ THE PINNED ROW BELONGS TO NO GROUP, and this is how it says so rather than by a flag.
       It holds no query, so it has no facts and no closure — and it is prepended ABOVE the groups
       rather than filed inside one. Handing it empty facts would file it under a closure that has
       outstayed its week and delete it, which is why the group is assigned per row below and the
       pinned row is exempted there in one place. */
    facts: [], lastClosed: null, copy: null, captionQueryId: null, copies: [], status: null, sentence: "",
    soonest: Infinity, waitingFrom: Infinity, stage: -1, lastActive: -Infinity, order: -1,
  };
  drafts.set(YOU_ROW, you);

  /** the task's own row, made on demand and named by the task */
  const taskRowFor = (id: string, title: string): Draft => {
    const key = taskRowKey(id);
    const cur = drafts.get(key);
    if (cur) return cur;
    const d: Draft = {
      key, agentId: null, name: title, agency: TASK_ROW_AGENCY,
      dot: "self", closed: false, items: [], manuscripts: [], held: 0, hasLive: true,
      facts: [], lastClosed: null, copy: null, captionQueryId: null, copies: [], status: null, sentence: "",
      soonest: Infinity, waitingFrom: Infinity, stage: -1, lastActive: -Infinity, order: drafts.size,
    };
    drafts.set(key, d);
    return d;
  };

  const rowFor = (agentId: string | null): Draft => {
    if (!agentId) return you;
    const key = agentRowKey(agentId);
    const cur = drafts.get(key);
    if (cur) return cur;
    const agent = byAgent.get(agentId);
    /* ⚠️ THE DRAWN SET, AND `drawn` IS DELIBERATELY NOT DEFINED HERE. See `drawnFor`: every
       shipped variant of this bug was one identifier away, and the identifier is the one that is
       now absent. Anything that genuinely wants the whole relationship calls `allQueriesFor` and
       says so. */
    const drawn = drawnFor(agentId);
    const hasLive = drawn.some((q) => !isTerminalStatus(q.status));
    const turn = agent ? agentTurn(agent, drawn as Query[]) : null;
    /**
     * ⚠️ ONE QUERY SPEAKS FOR THE ROW HEAD, and it is the most advanced LIVE one — falling back to
     * the most advanced terminal one when nothing is live, which is what lets a closed row say HOW
     * it ended rather than only that it did. Chosen once here so the dot, the status and the
     * sentence cannot describe three different journeys under one name.
     */
    /**
     * ⚠️ ONE SET OF FACTS FOR THE SENTENCE AND THE NOTE. The head says what is happening and the
     * note says what to do about it, and if the two derived their dates separately they could
     * disagree about the same query on the same row — a head reading "reply expected by 15 Sept"
     * above a note reading "due 3 days ago".
     */
    const copyOf = (q: Query, a: Agent | undefined): RowCopy => ({
      surname: agentSurname(agentPrimary(a)),
      status: q.status as QueryStatus,
      /* ⚠️ ONE FUNCTION, AND THIS SITE IS THE ONE THAT WAS WRONG. It resolved the reply window
         from `Math.min(...sends)` — the EARLIEST thing you sent — while the bar three inches to
         its right resolved the same window from `Math.max`. So a relationship that ran a query in
         January and a full in August had its scrawl measuring from January and its bar from
         August, and the scrawl printed day-counts nobody could reconcile. `namedEndFor` is the
         single source and it takes the latest send, because the reply you are waiting for is to
         the last thing you sent. */
      expectedYmd: namedEndFor(q as Query, a ?? null, { today: data.today }).window,
      nudgeYmd: isTerminalStatus(q.status) ? null : ymdOf(q.nudgeDate),
      nudgedOnYmd: ymdOf(q.lastNudgeSentDate),
      lastWordYmd: ymdOf(q.lastStatusChange) ?? ymdOf(q.dateSent),
      closedYmd: isTerminalStatus(q.status)
        ? (ymdOf(q.rejectedDate) ?? ymdOf(q.lastStatusChange))
        : null,
    });
    const lead = (() => {
      const live = drawn.filter((q) => !isTerminalStatus(q.status));
      const pool = live.length ? live : drawn;
      let best: Query | null = null;
      let at = -Infinity;
      for (const q of pool) {
        const i = STATUS_ORDER.indexOf(q.status as QueryStatus);
        if (i > at) { at = i; best = q as Query; }
      }
      return best;
    })();
    /**
     * ⚠️ THE QUERIES THIS ROW HOLDS, SO THE DEED CAN BE ASKED OF THE ONE THAT EARNED THE GROUP.
     *
     * A row's GROUP is the earliest group any of its queries earns; its COPY was the LEAD query's
     * — the most advanced status. Those are different queries whenever a relationship holds more
     * than one, so a row could be filed under "Needs you now" because query B is writer-held while
     * the deed was asked of query A, which is agent-held and has nothing to say. The answer was a
     * generic "Open the query": a dash wearing a costume. The copies travel with the row so the
     * deed can be asked of the query the group is actually about.
     */
    /**
     * ⚠️ THE AGENCY'S POLICY AND ITS CLOCK, READ FROM THE AGENT ON THIS ROW.
     *
     * `noResponseMeansNo` is the agency's published rule; the window is its stated reply time from
     * the day the query went out, through `computeResponseDeadline` — the canonical util, so this
     * cannot drift from the deadline the rest of the app computes. Both together are a closure;
     * either one alone is not, which is why they travel as a pair.
     */
    const silenceOf = (q: { dateSent?: string | null }) =>
      (agent?.noResponseMeansNo
        ? {
          statesNoMeansNo: true,
          windowPassed: (() => {
            const iso = q.dateSent ? computeResponseDeadline(q.dateSent, agent.responseTimeWeeks) : "";
            return !!iso && iso.slice(0, 10) <= data.today;
          })(),
        }
        : { statesNoMeansNo: false, windowPassed: false });
    const copies: { q: Query; copy: RowCopy }[] = drawn.map((q) => ({ q: q as Query, copy: copyOf(q as Query, agent) }));
    const d: Draft = {
      key,
      agentId,
      name: agentPrimary(agent),
      agency: agentSecondary(agent),
      dot: turn === "you" ? "you" : turn === "them" ? "them" : "quiet",
      closed: !hasLive,
      items: [], manuscripts: [], held: 0, hasLive,
      soonest: Infinity,
      waitingFrom: Infinity,
      /* ⚠️ THE NEWEST RECORDED EVENT ON THIS ROW, filled by the record pass below. `-Infinity` is
         "nothing on the record", which SINKS in RECENTLY ACTIVE rather than tying with every other
         empty row — the same asymmetry `soonest` and `waitingFrom` already use. */
      lastActive: -Infinity,
      /* journey stage — the most advanced LIVE query's place in the canonical order. Derived from
         `STATUS_ORDER`, never a second list of statuses written out here. */
      stage: drawn.reduce((best, q) => {
        if (isTerminalStatus(q.status)) return best;
        return Math.max(best, STATUS_ORDER.indexOf(q.status as QueryStatus));
      }, -1),
      /**
       * The status the row's own `StatusDot` draws.
       *
       * ⚠️ THE SAME RANKING AS `stage`, NOT A SECOND ONE. `stage` is that ranking's INDEX and this
       * is the status at it, so a row cannot be sorted by one journey depth and marked with
       * another. Written as one reduce over the same `STATUS_ORDER` rather than as
       * `STATUS_ORDER[stage]` at the call site, because the closed case has no index to read.
       *
       * ⚠️ AND A CLOSED ROW TAKES ITS TERMINAL STATUS, which is the whole reason the row head can
       * say how a relationship ended rather than only that it did. Rejected, Withdrawn and No
       * Response are three different endings and `StatusDot` already draws them apart.
       */
      status: lead ? (lead.status as QueryStatus) : null,
      /**
       * The row's own sentence.
       *
       * ⚠️ IT DESCRIBES THE SAME QUERY THE DOT DRAWS. Both read `lead` — the most advanced query
       * by the ranking `stage` already uses — so a head cannot show one journey's mark above
       * another journey's words. Choosing them separately is how two true statements come to sit
       * on one line describing different things.
       *
       * ⚠️ AND THE EXPECTED DATE COMES FROM `resolveExpectedDate`, the same resolver the bars use.
       * Its rule is subtle — recency between the writer's date and the agency's reply, with the
       * agency window as a floor — and a second copy here would eventually disagree with the bar
       * drawn beside it.
       */
      copy: lead ? copyOf(lead, agent) : null,
      /* the caption's subject: the same query `copy` and `sentence` are built from */
      captionQueryId: lead ? lead.id : null,
      copies,
      /**
       * ⚠️ `pressingAt` IS **NOT** COMPUTED HERE, and the absence is the fix (v36 part two).
       *
       * It used to take `Math.min` over ALL of `drawn` — every live query this agent holds. But a
       * row DRAWS one query per manuscript (see `per` in the bar pass), so an agent with three
       * queries on one book showed one lane and sorted by whichever of the three was most
       * pressing, including the two the reader cannot see. Measured on the deployed board: Rachel
       * Lin sorted on 7 Aug beside her own bar reading "reply expected 29 Sept".
       *
       * It is filled in the bar pass instead, from the same `per` map the lanes come from — so
       * the key and the evidence for it are the same queries. Third variant of one disease: the
       * deed bug was lead-vs-earner, this is all-vs-drawn.
       */
      /* the head's sentence and the note read the SAME facts — see `copyOf` above */
      sentence: lead ? rowSentence(copyOf(lead, agent), data.today) : "",
      order: drafts.size,
      facts: drawn
        /* ⚠️ `isBoardClosed`, NOT `isTerminalStatus` — see its own note. A No Response query has
           not ended: the writer can still nudge it and can still choose to close it, so it stays
           a LIVE fact and its row keeps its place under `With agents` rather than dropping into
           `Closed`, where nothing can be done with it. */
        .filter((q) => !isBoardClosed(q.status as QueryStatus, silenceOf(q)))
        .map((q) => ({
          status: q.status as QueryStatus,
          nudgeYmd: ymdOf(q.nudgeDate),
          /* the snooze the writer set on THIS query — the same lookup the bars make for its waypoint */
          backYmd: ymdOf(
            data.taskFlags.find((f) => f.queryId === q.id && !!f.snoozedUntil)?.snoozedUntil,
          ),
        })),
      /* ⚠️ THE CLOSURE DATE COMES FROM `recomputeQuery`'s OUTPUT, never from a scan of the feed.
         `rejectedDate` is the specific answer where there is one and `lastStatusChange` the general
         one; both have a single writer, so this cannot disagree with what the record says. */
      lastClosed: drawn
        .filter((q) => isTerminalStatus(q.status))
        .map((q) => ymdOf(q.rejectedDate) ?? ymdOf(q.lastStatusChange))
        .filter((x): x is string => !!x)
        .sort()
        .pop() ?? null,
    };
    drafts.set(key, d);
    return d;
  };

  /* ⚠️ EVERY AGENT WITH A QUERY GETS A CANDIDATE ROW BEFORE ANY ITEM IS PLACED, because the
     catalogue's inclusion rule is "a live query, an open band, OR any item in the visible week" —
     the first clause is what keeps a query you sent visible when nothing about it is scheduled
     (no agency window, no date of your own, so no band and no card). The emptying rule below is
     what stops that becoming a page of blank rows. */
  for (const q of data.queries) if (q.agentId) rowFor(q.agentId);

  /* ⚠️ DECLARED ABOVE ITS CONSUMER. `push` reads this from the enclosing scope, and `tsc` cannot
     see a temporal-dead-zone read through a closure — the shape that put a clean typecheck and
     seven thousand green tests over a page that threw on every render. The order is the guard. */
  const rowMatches = (row: Draft): boolean => {
    if (!search) return true;
    if (row.key === YOU_ROW) return YOU_ROW_NAME.toLowerCase().includes(search);
    const agent = row.agentId ? byAgent.get(row.agentId) : undefined;
    return agent ? matchesAgentSearch(agent, search) : false;
  };

  const itemMatches = (it: TimelineItem): boolean =>
    it.label.toLowerCase().includes(search) ||
    (it.card?.title ?? "").toLowerCase().includes(search);

  const push = (row: Draft, it: TimelineItem) => {
    row.held += 1;
    /* a ghost is a fact about a task, so it rides the task filter rather than growing a fifth */
    /* ⚠️ THE CARD'S OWN TITLE AS WELL AS THE PILL. `pillLabel` summarises a derived card to two
       words — "Send full" — so a search over labels alone cannot find "the full for P. Kaur",
       which is what the writer actually saw on the To-do list. Both, or the search is a search of
       the abbreviation. */
    if (search && !rowMatches(row) && !itemMatches(it)) return;
    row.items.push(it);
    /* ⚠️ `soonest` READS WHAT IS VISIBLE and `waitingFrom` reads the relationship — the asymmetry
       is deliberate. "Soonest" is an ordering of what is on screen, so an invisible item must not
       decide it; "longest waiting" is a fact about an agency's silence, and switching the bands
       off does not make an agent less waited-on. */
    if (it.idx < row.soonest) row.soonest = it.idx;
    /**
     * ⚠️ A TASK ROW'S PRESSING KEY IS ITS DUE DATE, IN THE SAME SCALE AS AN AGENT'S.
     *
     * ONE LIST interleaves tasks with relationships, so a task needs a key on the same axis or it
     * cannot take its place among them — and a task with no key would sort as "nothing pressing",
     * which is the opposite of what a dated task is. `pressingAt` is milliseconds everywhere else,
     * so this is the item's own day at noon, matching how every other date on this board is
     * turned into a comparable number.
     *
     * The EARLIEST item on the row wins, which is the same rule an agent row uses: what is
     * pressing is the nearest thing, not the most recent.
     */
    if (row.key.startsWith("task-")) {
      const ymd = win[it.idx];
      const at = ymd ? new Date(`${ymd}T12:00:00`).getTime() : NaN;
      if (Number.isFinite(at) && (row.pressingAt === undefined || row.pressingAt === null || at < row.pressingAt)) {
        row.pressingAt = at;
        row.sortQueryId = null;
      }
    }
  };

  /* ── items, day by day ──────────────────────────────────────────────────────────────────── */
  win.forEach((ymd, idx) => {
    for (const it of data.itemsFor(ymd)) {
      /* a writer's own card is a task wherever it sits — including a snoozed one coming back —
         and everything else derived from a query is the writer's turn */
      const isTask = !!it.card?.userTaskId || it.family === "task";
      const kind: TimelineKind = it.family === "done" ? "rec" : isTask ? "task" : "turn";
      /**
       * ⚠️ A QUERY'S WORK IS THE BAR NOW, NOT A CHIP BESIDE IT — and leaving both drew every fact
       * twice. A your-turn card IS the bar's your-move stretch; a completed or recorded item IS a
       * node on it. Rendering the chip as well put one event on the row in two places, inflated
       * every count, and cost each row a whole lane of height for pills nobody needed.
       *
       * ⚠️ THE ITEM IS NOT DISCARDED, ONLY THE CHIP. The card it carries is what the workspace
       * opens, and the page still finds it by `queryId` — this decides what is DRAWN, which is the
       * view's business, and touches nothing the pane reads.
       */
      /* ghosts arrive in their own loop below, so this branch only ever sees the three above */
      if (kind !== "task") continue;
      const owner = it.card?.agentId ?? ownerOf(it.card?.relatedRecordId, byQuery);
      /* ⚠️ THE TASK'S OWN WORDS NAME ITS ROW — `it.label`, never `pillLabel`'s summary. A writer's
         own task already has a title they wrote; summarising it on their behalf is the one thing
         this board must not do to the one row that is entirely theirs. */
      const taskId = it.card?.userTaskId ?? it.key;
      const target = isTask ? taskRowFor(taskId, it.label) : rowFor(owner);
      push(target, {
        /* ⚠️ A TASK'S CHIP CARRIES THE WRITER'S OWN WORDS. `pillLabel` summarises a DERIVED card
           to two words, which is right for a card the app raised and wrong for a line the writer
           typed — and on a per-task row the chip is the only place those words appear beside a
           date. Everything else still goes through the shared summariser. */
        key: it.key, idx, ymd, kind, label: isTask ? it.label : pillLabel(it), lane: 0, spanTo: idx,
        ...(it.card ? { card: it.card } : {}),
        ...(it.card?.relatedRecordId ? { queryId: it.card.relatedRecordId } : {}),
        ...(it.rolledFrom ? { rolledFrom: it.rolledFrom } : {}),
        ...(it.struck ? { struck: true } : {}),
        draggable: draggableTask(it),
      });
    }
    /* ⚠️ THE RECORD IS A NODE ON THE BAR, NOT A CHIP BESIDE IT. `recordFor` is still read — by
       the bar derivation, which places each entry as an event IN the journey rather than as a pill
       floating above it. That is the whole change: one object that tells the story left to right,
       instead of one pill per fact. */
    /**
     * ⚠️ A GHOST SURVIVES ONLY FOR THE WRITER'S OWN TASKS, and it files under `Your tasks`.
     *
     * An origin mark says "this fell due here and is still outstanding". For a QUERY that is now
     * the bar's job and the bar does it better: a your-move stretch carries its own duration, and
     * a long-standing one draws the overrun back to the date it was expected. Keeping the mark as
     * well would put one fact on the row twice — the same doubling the record chips had.
     *
     * For a writer's own task there is no bar, so the mark is the only thing that can say it, and
     * it lands on THAT TASK'S OWN ROW — the same row its live chip is on, which is the whole point
     * of the mark: it says "this fell due here and is still outstanding", and a reader can only
     * read that if the origin and the live item are on one line.
     */
    for (const g of data.ghostsOn(ymd)) {
      const isTask = !!g.of.card?.userTaskId || g.of.family === "task";
      if (!isTask) continue;
      push(taskRowFor(g.of.card?.userTaskId ?? g.of.key, g.of.label), {
        key: g.key, idx, ymd, kind: "ghost", label: pillLabel(g.of), lane: 0, spanTo: idx,
        ...(g.of.card ? { card: g.of.card } : {}),
        ...(g.of.rolledFrom ? { rolledFrom: g.of.rolledFrom } : {}),
        draggable: false,
      });
    }
  });

  /* ── the journey bars, one per agent × manuscript ───────────────────────────────────────── */
  /**
   * ⚠️ THE BAND IS RETIRED AND A SEGMENT IS NOT THE SAME THING. A band was a whole reply window
   * drawn as one span; a segment is a PIECE of one continuous journey, between two interruptions,
   * carrying which side holds the move. The bar is the sequence; the segments are what the breaks
   * leave of it. Everything a band knew — the send, the resolved window, the source — the bar
   * still reads, from the same functions, and draws as one object instead of one pill per fact.
   *
   * ⚠️ LANES ARE MANUSCRIPTS NOW, NOT PACKING. The greedy interval packing that kept two chips off
   * each other still runs for the ITEMS; a lane index on a bar means "this book", which is why two
   * manuscripts with one agency is two lanes under one head.
   */
  const statusOf = statusIndex(data.activities);
  const msTitle = new Map(data.manuscripts.map((m) => [m.id, m.title]));
  const barWin: BarWindow = { days: win, today: data.today, past: last < data.today };

  const segments: Segment[] = [];
  const nodes: BarNode[] = [];

  for (const [rowKey, per] of laneOf) {
    const agentId = rowKey.slice("agent-".length);
    const row = rowFor(agentId);
    /* stable lane order: the manuscript titles, so the head reads the same way twice running */
    const pairs = [...per.entries()].sort((a, b) =>
      (msTitle.get(a[0]) ?? "").localeCompare(msTitle.get(b[0]) ?? "", "en-GB", { sensitivity: "base" }));
    pairs.forEach(([msId, q], laneIdx) => {
      const agent = q.agentId ? byAgent.get(q.agentId) : undefined;
      const recs = win.flatMap((ymd, i) =>
        data.recordFor(ymd).filter((r) => r.queryId === q.id).map((r) => ({ r, i })))
        .sort((a, b) => a.i - b.i)
        .map((x) => x.r);
      /* ⚠️ THE NEWEST RECORDED EVENT FEEDS `RECENTLY ACTIVE`, and it reads the same `recordFor` the
         bar's own nodes come from — never a second scan of the feed, which is how two surfaces come
         to disagree about when something last happened. */
      for (const r of recs) {
        const t = new Date(`${r.ymd}T12:00:00`).getTime();
        if (Number.isFinite(t) && t > row.lastActive) row.lastActive = t;
      }

      /**
       * ⚠️ WHAT IS PRESSING, FROM THE QUERIES THE ROW ACTUALLY DRAWS.
       *
       * `q` is this LANE's query — the one `per` kept, and the one whose bar and tooltip the
       * reader is looking at. Minimising here rather than over every query the agent holds is the
       * whole fix: the key and the evidence for it are now the same queries, so a row can no
       * longer sort by a date it does not show.
       *
       * See `pressingFrom` for the three cases and why they share one scale rather than bucketing.
       */
      if (!isTerminalStatus(q.status)) {
        const named = namedEndFor(q as Query, agent ?? null, { today: data.today }).end;
        const key = (() => {
          if (named) return new Date(`${named.ymd}T12:00:00`).getTime();
          if (sideOf(q.status as QueryStatus) === "yours") {
            /* ⚠️ DUE ON RECEIPT. Nobody named a date, but the agency asked — so it was due the day
               it arrived and has been past ever since. The longer past, the more pressing, which
               falls out of the scale rather than needing a tier. */
            const asked = ymdOf(q.lastStatusChange) ?? ymdOf(q.dateSent);
            return asked ? new Date(`${asked}T12:00:00`).getTime() : PRESSING_BASE;
          }
          /* ⚠️ UNDATED AND WITH THE AGENT: nothing is being asked, so it sorts after everything
             dated — and among its own kind by longest waiting, in the same number. */
          const sent = ymdOf(q.dateSent);
          return PRESSING_BASE + (sent ? new Date(`${sent}T12:00:00`).getTime() : 0);
        })();
        if (row.pressingAt === undefined || key < row.pressingAt) {
          row.pressingAt = key;
          /* ⚠️ THE KEY AND THE QUERY IT CAME FROM ARE WRITTEN TOGETHER, so they cannot come apart.
             Recording the winner separately is how a sort key and its evidence drift. */
          row.sortQueryId = q.id;
        }
      }
      /* the card's own words for a your-move stretch — `pillLabel`'s output, never re-summarised */
      const card = win.flatMap((ymd) => data.itemsFor(ymd))
        .find((it) => it.card?.relatedRecordId === q.id);
      const flag = data.taskFlags.find((f) => f.queryId === q.id && !!f.snoozedUntil) ?? null;

      const bars = laneBars({
        rowKey, lane: laneIdx, query: q, agent: agent ?? null, records: recs,
        statusOf: (id) => statusOf.get(id) ?? null,
        flag,
        ...(card ? { moveLabel: pillLabel(card) } : {}),
      }, barWin);

      const drawn = bars.segments.length + bars.nodes.length;
      if (drawn > 0) {
        row.held += 1;
        if (row.manuscripts.every((m) => m.id !== msId)) {
          row.manuscripts.push({ id: msId, title: msTitle.get(msId) ?? "" });
        }
        const sends = [q.dateSent, q.partialSentDate, q.fullSentDate]
          .map((iso) => (iso ? new Date(iso as string).getTime() : NaN))
          .filter((t) => !Number.isNaN(t));
        if (sends.length) {
          const sentMs = Math.min(...sends);
          if (row.waitingFrom === Infinity || sentMs < row.waitingFrom) row.waitingFrom = sentMs;
        }
      }

      /* ⚠️ THE FILTERS NARROW WHICH SIDES ARE DRAWN, not which rows exist — a bar is the row's
         whole story, so hiding "their move" hides those stretches and leaves the rest of the
         journey standing. The nodes belong to the bar and travel with it. */
      const wantTheirs = true;
      const wantYours = true;
      const searchOk = (text: string) => !search || rowMatches(row) || text.toLowerCase().includes(search);
      const keep = bars.segments.filter((sg) =>
        (sg.side === "theirs" ? wantTheirs : wantYours) && searchOk(sg.label));
      /* ⚠️ THE THREE PARTS ARE FILTERED SEPARATELY, and gating the nodes on the segments surviving
         was a real fault: a closure on the window's first day leaves NO drawable stretch — the
         piece before it is narrower than the floor — so the whole event vanished with it. An event
         is a fact about a day; whether a stretch fits beside it is a question about pixels. */
      const keepNodes = bars.nodes.filter((n) => searchOk(n.caption));
      if (!keep.length && !keepNodes.length) return;
      segments.push(...keep);
      nodes.push(...keepNodes);
      const first = Math.min(...[...keep.map((sg) => sg.from), ...keepNodes.map((n) => n.at)]);
      if (first < row.soonest) row.soonest = first;
      /* the row's dot follows the lane that is the writer's move, if any */
      if (keep.some((sg) => sg.side === "yours")) row.dot = "you";
      else if (row.dot !== "you" && sideOf(q.status) === "theirs") row.dot = "them";
    });
  }

  /* ── which rows survive ─────────────────────────────────────────────────────────────────── */
  /**
   * ⚠️ A FILTER REMOVES WHAT IT HIDES; IT DOES NOT REMOVE A ROW THAT HAD NOTHING TO HIDE.
   * `held` counts everything the row carried BEFORE the filters, so a row emptied BY a filter goes
   * (which is what a filter is for) while a live-but-quiet relationship — a query out, no window
   * resolvable, nothing scheduled — stays as an empty row, because that is a fact the writer needs
   * and no filter was hiding it.
   *
   * ⚠️ "Needs me" DOES NOT GET THAT EXEMPTION. It is a question about work, and an empty row is not
   * work; keeping quiet rows in it would answer a different question from the one asked.
   */
  /**
   * ⚠️ ONE RULE: A ROW APPEARS WHEN IT HAS SOMETHING IN THE VISIBLE WEEK.
   *
   * Three things went to get here. The three SHOW MODES, which asked the same question with
   * different scopes. The nothing-to-hide EXEMPTION, which kept a live relationship on screen with
   * nothing on it — written when a quiet query really did draw nothing, and made pointless by the
   * bar, whose dashed rail says "no reply time recorded" in the row rather than leaving it blank.
   * And the PINNED row's standing exemption, which drew "Your tasks" every week whether or not the
   * writer had any.
   *
   * ⚠️ AN EMPTY ROW IS THE APP SAYING NOTHING, LOUDLY — it costs 80px, it draws a name, and what
   * it communicates is that the reader should keep looking. The empty WEEK still says one line;
   * that is a different thing, said once.
   */
  const kept: Draft[] = [];
  for (const row of drafts.values()) {
    const alive = row.items.length
      + segments.filter((sg) => sg.rowKey === row.key).length
      + nodes.filter((n) => n.rowKey === row.key).length;
    if (alive > 0) kept.push(row);
  }

  /* ── order ──────────────────────────────────────────────────────────────────────────────── */
  const rest = kept.filter((r) => !r.key.startsWith("task-") && r.key !== YOU_ROW);
  /**
   * ONE COMPARABLE KEY FOR "what is pressing", in ms.
   *
   * ⚠️ ONE KEY, NOT TWO TIERS. An earlier rule bucketed dated rows above undated ones, which put a
   * sixty-day debt BELOW an appointment five weeks out — the older ask was the more pressing thing
   * and the sort said otherwise. Three cases, one scale:
   *
   *   · a named end            → that date. It is when this becomes due.
   *   · no named end, YOURS    → the day the ask arrived. It was due on receipt, so it is already
   *                              past, and the longer it has been past the more pressing it is —
   *                              which falls out of the scale rather than needing a tier.
   *   · no named end, THEIRS   → undated. Nothing is being asked, so it sorts after everything
   *                              dated, and among themselves by longest waiting.
   *
   * ⚠️ THE UNDATED AGENT-HELD ROWS TAKE `Infinity` MINUS THEIR WAIT, so "after the dated" and
   * "longest waiting first among themselves" are one number rather than a second comparator that
   * could disagree with the first.
   */
  const pressingFrom = (d: Draft): number => d.pressingAt ?? PRESSING_NONE;

  const cmp: Record<RowSort, (a: Draft, b: Draft) => number> = {
    /* ⚠️ COMPARED, NOT SUBTRACTED. Both keys are `Infinity` on a row that holds nothing, and
       `Infinity - Infinity` is NaN while `Infinity - 3` is Infinity — neither of which is a
       comparator's answer. Subtraction would have let an empty row tie with every other one
       instead of sinking, silently, in the two sorts that are the page's defaults. */
    soonest: (a, b) => {
      const x = pressingFrom(a); const y = pressingFrom(b);
      return x === y ? 0 : x < y ? -1 : 1;
    },
    /* longest waiting first: the OLDEST send wins, and a row with no send sinks */
    waiting: (a, b) => (a.waitingFrom === b.waitingFrom ? 0 : a.waitingFrom < b.waitingFrom ? -1 : 1),
    /* most recently recorded first; a row with nothing on the record sinks */
    active: (a, b) => (a.lastActive === b.lastActive ? 0 : a.lastActive > b.lastActive ? -1 : 1),
  };
  rest.sort((a, b) => {
    /* ⚠️ A CLOSED ROW SINKS BELOW EVERY LIVE ONE, IN EVERY SORT — it is history sitting among
       work, and no sort key should be able to lift it back up. */
    if (a.closed !== b.closed) return a.closed ? 1 : -1;
    const c = cmp[view.sort](a, b);
    if (c !== 0) return c;
    /* ⚠️ THE TIE-BREAK IS THE INPUT ORDER, STATED. `Array.prototype.sort` is stable in every engine
       this ships to, and relying on that silently is how a "stable sort" claim survives a rewrite
       that is not. Two rows with equal keys keep the order they arrived in, provably. */
    return a.order - b.order;
  });

  /* ⚠️ THE PINNED ROW IS PINNED, NOT EXEMPT. It is prepended only if it survived the one rule —
     prepending it unconditionally was how it kept drawing itself empty after the exemption went. */
  /* ── groups ─────────────────────────────────────────────────────────────────────────────── */
  /**
   * ⚠️ THE GROUP IS ASSIGNED AFTER THE SORT, WHICH IS WHY "sort applies within groups" NEEDS NO
   * CODE. `rest` is already in the view's order; the page buckets it by `GROUP_ORDER` and each
   * bucket comes out in that same order. A second ordering pass inside each group would be a
   * second thing to keep in step, and the two would eventually disagree.
   *
   * ⚠️ AND A `null` GROUP MEANS THE ROW IS NOT DRAWN — today's closures never leave the board.
   * Dropping here rather than in the survival rule above keeps that rule about FILTERS, which is
   * what it says it is about.
   */
  const grouped = rest
    .map((r) => ({ r, group: rowGroupOf(r.facts, r.lastClosed, data.today, ymdGap) }))
    .filter((x): x is { r: Draft; group: RowGroup } => x.group !== null);

  /**
   * ⚠️ THE TASK ROWS PIN ABOVE THE GROUPS, EACH ON ITS OWN LINE. There used to be exactly one —
   * an aggregate called "Your tasks" that could hold no deed (whose task would it tick off?), no
   * name (which task is it?) and no useful count, so its heading read "1" beside four chips.
   *
   * ⚠️ AND THEY KEEP THE VIEW'S OWN ORDER AMONG THEMSELVES, by `soonest`, so the nearest date is
   * first. `you` survives only as the home for anything a task cannot be keyed by, and is
   * prepended only if it kept an item — prepending it unconditionally was how it drew itself empty
   * after its exemption went.
   */
  const taskRows = kept
    .filter((r) => r.key.startsWith("task-"))
    .sort((a, b) => (a.soonest === b.soonest ? a.order - b.order : a.soonest - b.soonest));
  const ordered = [
    ...(kept.includes(you) ? [you] : []),
    ...taskRows,
    ...grouped.map((x) => x.r),
  ];
  const groupOf = new Map(grouped.map((x) => [x.r.key, x.group]));
  /* ⚠️ THE NOTE IS DECIDED WHERE THE GROUP IS, not where the facts are. Whether a row is written
     on is the question "is something being asked of the writer", and `timelineGroups` answers that
     once; deriving it again from statuses would be a second answer to a settled question, able to
     disagree with the group heading three inches above it. */
  /**
   * ⚠️ THE DEED IS ASKED OF THE QUERY THAT EARNED THE GROUP, not of the row's lead.
   *
   * Where a row holds several queries the two are different: the group is the earliest any of them
   * earns, the lead is the most advanced. Asking the lead put a row in an asking group with a deed
   * its own copy could not name — and the fallback was a generic that says nothing a dash does not.
   * The first query whose own group matches the row's is the one the heading is about.
   */
  /* ⚠️ THE NOTE AND THE QUERY IT IS ABOUT ARE BUILT TOGETHER. The deed's subject was the thing
     nothing recorded, so nothing could check it — the repair that made the deed ask the group's
     EARNER left the answer to "which query is this sentence about" implicit, and an implicit
     answer is one no lock can read. `copies` is now the DRAWN set, so the earner is drawn by
     construction; this records which one it was so that claim is measurable rather than argued. */
  const noteOf = new Map<string, { note: RowNote | null; deedQueryId: string | null }>(
    grouped.map((x) => {
      const earner = x.r.copies.find((c) => queryGroup({
        status: c.q.status as QueryStatus,
        nudgeYmd: ymdOf(c.q.nudgeDate),
        backYmd: ymdOf(data.taskFlags.find((f) => f.queryId === c.q.id && !!f.snoozedUntil)?.snoozedUntil),
      }, data.today) === x.group);
      const copy = earner ? earner.copy : x.r.copy;
      const note = copy ? rowNote(copy, x.group, data.today) : null;
      return [x.r.key, {
        note,
        /* the subject is only claimed where a deed was actually written */
        deedQueryId: note ? (earner ? earner.q.id : x.r.captionQueryId) : null,
      }] as [string, { note: RowNote | null; deedQueryId: string | null }];
    }),
  );

  /* ── lanes ──────────────────────────────────────────────────────────────────────────────── */
  /**
   * ⚠️ TWO KINDS OF LANE, AND THEY ARE NOT THE SAME MECHANISM. A BAR's lane is a MANUSCRIPT — it
   * means "this book", and it is assigned where the bars are built. An ITEM's lane is PACKING —
   * it means "the first line where this chip does not collide", and it is assigned here by the
   * same greedy pass as before. A row's height takes whichever needs more room.
   *
   * ⚠️ SO ITEMS PACK ROUND THE BARS RATHER THAN BESIDE THEM: a chip is given a lane at or below
   * the bars', which is what stops a task chip landing on top of a journey it has nothing to do
   * with. Bars occupy their own lanes wholly, so they enter the pass as full-width occupants.
   */
  const rows: TimelineRow[] = [];
  for (const row of ordered) {
    const mine = segments.filter((sg) => sg.rowKey === row.key);
    const barLanes = mine.length ? Math.max(...mine.map((sg) => sg.lane)) + 1 : 0;
    const occ: (Occupant & { it?: TimelineItem })[] = row.items
      .map((it) => ({ start: it.idx, end: it.idx, lane: 0, spanTo: it.idx, it }))
      .sort((a, b) => (a.start - b.start) || (a.end - b.end));
    const packed = packLanes(occ, Math.max(1, win.length));
    for (const o of occ) {
      o.it!.lane = o.lane + barLanes;
      o.it!.spanTo = Math.max(o.it!.idx, o.spanTo);
    }
    rows.push({
      key: row.key, agentId: row.agentId, name: row.name, agency: row.agency,
      group: groupOf.get(row.key) ?? null, status: row.status, sentence: row.sentence,
      note: noteOf.get(row.key)?.note ?? null,
      pressingAt: row.pressingAt ?? null,
      subjects: {
        deed: noteOf.get(row.key)?.deedQueryId ?? null,
        caption: row.sentence ? row.captionQueryId : null,
        sort: row.pressingAt == null ? null : (row.sortQueryId ?? null),
      },
      dot: row.dot, items: row.items,
      lanes: Math.max(1, barLanes + (row.items.length ? packed : 0)),
      manuscripts: row.manuscripts, closed: row.closed,
    });
  }
  const keys = new Set(rows.map((r) => r.key));
  /* ⚠️ A BAR WHOSE ROW DID NOT SURVIVE IS DROPPED HERE, not left to render against nothing. The
     row rules and the bar derivation are one pass, so this cannot go stale — but a segment
     pointing at a row that was filtered out is exactly the shape that draws in the wrong place. */
  return {
    rows,
    segments: segments.filter((sg) => keys.has(sg.rowKey)),
    nodes: nodes.filter((n) => keys.has(n.rowKey)),
  };
}

/** The rows — a projection of `timelineWeek`, which is the one derivation. */
export function timelineRows(
  data: TimelineData, windowStart: string, days: number, view?: TimelineView,
): TimelineRow[] {
  return timelineWeek(data, windowStart, days, view).rows;
}

/** The bars' pieces — the same pass, so a bar and a chip can never be given the same lane. */
export function timelineSegments(
  data: TimelineData, windowStart: string, days: number, view?: TimelineView,
): Segment[] {
  return timelineWeek(data, windowStart, days, view).segments;
}
