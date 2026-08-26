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
import { queryBucket } from "./queryAmbient";
import { resolveExpectedDate } from "./expectedDate";
import { STATUS_ORDER } from "./statusOrder";
import {
  CalendarItem, RecordItem, GhostItem, RecordDir,
  EXPECTED_PILL, pillLabel, draggableTask, toYmd,
} from "./todoCalendar";

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
export type TimelineFilter = TimelineKind | "wait";
export const TIMELINE_FILTERS: readonly TimelineFilter[] = ["turn", "wait", "rec", "task", "ghost"];
export const FILTER_LABEL: Record<TimelineFilter, string> = {
  turn: "Your turn",
  wait: "Waiting",
  rec: "On the record",
  task: "Your tasks",
  ghost: "Carried",
};
export const allFilters = (): TimelineFilter[] => [...TIMELINE_FILTERS];

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
  /** No live query — the row is history. Sinks below live rows in every sort. */
  closed: boolean;
}

export type BandSource = "agent" | "writer";

export interface TimelineBand {
  key: string;
  rowKey: string;
  fromIdx: number;
  toIdx: number;
  /** Began before the window — clamped to the left edge and marked, never drawn off-screen. */
  openLeft: boolean;
  /** Ends after the window — the same, at the other edge. */
  openRight: boolean;
  /**
   * The end is behind today.
   *
   * ⚠️ A PASSED WINDOW SHOWS NOTHING NEW — no "expired" pill, no copy, no colour. The fact is
   * "open, no reply", which the query and any nudge card already carry; an expiry state would be
   * the app editorialising about an agent being late. This flag exists so the band can be drawn
   * faded as a closed span, and for nothing else.
   */
  passed: boolean;
  source: BandSource;
  /** The resolved end, as a ymd — the fact the band was drawn from, carried rather than re-derived. */
  endYmd: string;
  queryId: string;
  label: string;
  lane: number;
}

/* ── the view's own options ────────────────────────────────────────────────────────────────── */

export type ShowMode = "active" | "all" | "needs";
export const SHOW_LABEL: Record<ShowMode, string> = {
  active: "Active only",
  all: "Everything",
  needs: "Needs me",
};
export const SHOW_ORDER: readonly ShowMode[] = ["active", "all", "needs"];

export type RowSort = "soonest" | "waiting" | "name" | "stage";
export const SORT_LABEL: Record<RowSort, string> = {
  soonest: "Soonest",
  waiting: "Longest waiting",
  name: "Agent name",
  stage: "Journey stage",
};
export const SORT_ORDER: readonly RowSort[] = ["soonest", "waiting", "name", "stage"];

export interface TimelineView {
  show: ShowMode;
  sort: RowSort;
  kinds: TimelineFilter[];
  search: string;
}

export const defaultView = (): TimelineView => ({
  show: "active",
  sort: "soonest",
  kinds: allFilters(),
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

export const YOU_ROW = "you";
export const YOU_ROW_NAME = "Your tasks";
const agentRowKey = (agentId: string): string => `agent-${agentId}`;

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
  bands: TimelineBand[];
  /** everything the row held BEFORE the filters — see the emptying rule below */
  held: number;
  hasLive: boolean;
  /** sort keys, all derived */
  soonest: number;
  waitingFrom: number;
  stage: number;
  order: number;
}

export interface TimelineWeek { rows: TimelineRow[]; bands: TimelineBand[] }

/**
 * The whole week in one pass — rows, their items, and the bands beneath them.
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
  const on = new Set(view.kinds);
  const search = view.search.trim().toLowerCase();

  const drafts = new Map<string, Draft>();
  const you: Draft = {
    key: YOU_ROW, agentId: null, name: YOU_ROW_NAME,
    /* ⚠️ NO SECOND LINE. The ref prints a manuscript title here, which is only true of a writer
       with exactly one book; the row holds tasks from every manuscript and from none. A row that
       has nothing to say on its second line says nothing (the rows-omit-themselves law). */
    agency: "",
    dot: "self", closed: false, items: [], bands: [], held: 0, hasLive: true,
    soonest: Infinity, waitingFrom: Infinity, stage: -1, order: -1,
  };
  drafts.set(YOU_ROW, you);

  const rowFor = (agentId: string | null): Draft => {
    if (!agentId) return you;
    const key = agentRowKey(agentId);
    const cur = drafts.get(key);
    if (cur) return cur;
    const agent = byAgent.get(agentId);
    const mine = data.queries.filter((q) => q.agentId === agentId);
    const hasLive = mine.some((q) => !isTerminalStatus(q.status));
    const turn = agent ? agentTurn(agent, mine as Query[]) : null;
    const d: Draft = {
      key,
      agentId,
      name: agentPrimary(agent),
      agency: agentSecondary(agent),
      dot: turn === "you" ? "you" : turn === "them" ? "them" : "quiet",
      closed: !hasLive,
      items: [], bands: [], held: 0, hasLive,
      soonest: Infinity,
      waitingFrom: Infinity,
      /* journey stage — the most advanced LIVE query's place in the canonical order. Derived from
         `STATUS_ORDER`, never a second list of statuses written out here. */
      stage: mine.reduce((best, q) => {
        if (isTerminalStatus(q.status)) return best;
        return Math.max(best, STATUS_ORDER.indexOf(q.status as QueryStatus));
      }, -1),
      order: drafts.size,
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
    if (!on.has(it.kind)) return;
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
  };

  /* ── items, day by day ──────────────────────────────────────────────────────────────────── */
  win.forEach((ymd, idx) => {
    for (const it of data.itemsFor(ymd)) {
      /* a writer's own card is a task wherever it sits — including a snoozed one coming back —
         and everything else derived from a query is the writer's turn */
      const isTask = !!it.card?.userTaskId || it.family === "task";
      const kind: TimelineKind = it.family === "done" ? "rec" : isTask ? "task" : "turn";
      const owner = it.card?.agentId ?? ownerOf(it.card?.relatedRecordId, byQuery);
      push(rowFor(isTask ? null : owner), {
        key: it.key, idx, ymd, kind, label: pillLabel(it), lane: 0, spanTo: idx,
        ...(it.card ? { card: it.card } : {}),
        ...(it.card?.relatedRecordId ? { queryId: it.card.relatedRecordId } : {}),
        ...(it.rolledFrom ? { rolledFrom: it.rolledFrom } : {}),
        ...(it.struck ? { struck: true } : {}),
        draggable: draggableTask(it),
      });
    }
    for (const r of data.recordFor(ymd)) {
      push(rowFor(ownerOf(r.queryId, byQuery)), {
        key: r.key, idx, ymd, kind: "rec", label: pillLabel(r), lane: 0, spanTo: idx,
        dir: r.dir, queryId: r.queryId, draggable: false,
      });
    }
    for (const g of data.ghostsOn(ymd)) {
      const isTask = !!g.of.card?.userTaskId || g.of.family === "task";
      const owner = g.of.card?.agentId ?? ownerOf(g.of.card?.relatedRecordId, byQuery);
      push(rowFor(isTask ? null : owner), {
        key: g.key, idx, ymd, kind: "ghost", label: pillLabel(g.of), lane: 0, spanTo: idx,
        ...(g.of.card ? { card: g.of.card } : {}),
        ...(g.of.rolledFrom ? { rolledFrom: g.of.rolledFrom } : {}),
        draggable: false,
      });
    }
  });

  /* ── bands ──────────────────────────────────────────────────────────────────────────────── */
  /* ⚠️ THE EXPECTED DATE IS THE BAND'S END, NOT ALSO A CHIP. On the month grid it was a pill on
     its own day because a grid cannot draw a span; here the span is the whole point, and drawing
     both would state one fact twice — the same law the record dedupe exists for. `expectedFor`
     is consequently NOT read for chips; it is read for nothing, and the page stops calling it. */
  for (const q of data.queries) {
    if (queryBucket(q.status) !== "waiting") continue;
    const agent = q.agentId ? byAgent.get(q.agentId) : undefined;
    /* the send anchor — the latest of the three stage sends. These are `recomputeQuery`'s own
       output from the activity feed, so this IS the send activity, read once and shared, rather
       than a second scan of `activities`. */
    const sends = [q.dateSent, q.partialSentDate, q.fullSentDate]
      .map((iso) => (iso ? new Date(iso as string).getTime() : NaN))
      .filter((t) => !Number.isNaN(t));
    if (!sends.length) continue; // a band needs a start, and a send is the only honest one
    const sentMs = Math.max(...sends);
    /* ⚠️ `null` FOR THE REPLY-STATED WINDOW, INHERITED AND DELIBERATE. An agent's window stated
       inside a holding reply lives in the query's NESTED events, which only the reading pane
       loads; the global feed this page holds carries no `replyWeeks`. Composing one from what is
       here would be inventing data — so a query whose latest statement is a reply resolves from
       the agency's standing weeks or the writer's own date, the same answer the To-do board gives
       for the same query. */
    const resolved = resolveExpectedDate(q, sentMs, agent?.responseTimeWeeks ?? null, null);
    if (resolved.ms == null || (resolved.source !== "agent" && resolved.source !== "writer")) continue;
    const fromYmd = toYmd(new Date(sentMs));
    const toYmdEnd = toYmd(new Date(resolved.ms));
    if (toYmdEnd < win[0] || fromYmd > last) continue; // wholly outside the window
    const row = rowFor(q.agentId || null);
    row.held += 1;
    if (row.waitingFrom === Infinity || sentMs < row.waitingFrom) row.waitingFrom = sentMs;
    if (!on.has("wait")) continue;
    if (search && !rowMatches(row) && !EXPECTED_PILL.toLowerCase().includes(search)) continue;
    const fromIdx = idxOf.get(fromYmd) ?? 0;
    const toIdx = idxOf.get(toYmdEnd) ?? win.length - 1;
    row.bands.push({
      key: `band-${q.id}`,
      rowKey: row.key,
      fromIdx: Math.max(0, fromIdx),
      toIdx: Math.min(win.length - 1, toIdx),
      openLeft: fromYmd < win[0],
      openRight: toYmdEnd > last,
      passed: toYmdEnd < data.today,
      source: resolved.source,
      endYmd: toYmdEnd,
      queryId: q.id,
      label: EXPECTED_PILL,
      lane: 0,
    });
    const start = Math.max(0, fromIdx);
    if (start < row.soonest) row.soonest = start;
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
  const kept: Draft[] = [];
  for (const row of drafts.values()) {
    if (row.key === YOU_ROW) { kept.push(row); continue; } // pinned: always, even empty
    const alive = row.items.length + row.bands.length;
    /* ⚠️ "Needs me" IS A QUESTION ABOUT WORK, so it takes none of the exemptions below: an empty
       row is not work, and keeping quiet relationships in it would answer a different question
       from the one asked. */
    if (view.show === "needs") {
      if (row.items.some((i) => i.kind === "turn" || i.kind === "task")) kept.push(row);
      continue;
    }
    if (alive > 0) { kept.push(row); continue; }
    /* nothing survived. Whether the row does depends on whether a FILTER is why. */
    if (row.held > 0) continue;                       // a filter took it — the row goes with it
    if (search && !rowMatches(row)) continue;         // so does a search it does not answer
    /* ⚠️ "Everything" MEANS EVERY RELATIONSHIP, including one that ended and left nothing in this
       week — that is the mode's whole job, and it is the only place a closed agent appears. */
    if (view.show === "all" || row.hasLive) kept.push(row);
  }

  /* ── order ──────────────────────────────────────────────────────────────────────────────── */
  const rest = kept.filter((r) => r.key !== YOU_ROW);
  const cmp: Record<RowSort, (a: Draft, b: Draft) => number> = {
    /* ⚠️ COMPARED, NOT SUBTRACTED. Both keys are `Infinity` on a row that holds nothing, and
       `Infinity - Infinity` is NaN while `Infinity - 3` is Infinity — neither of which is a
       comparator's answer. Subtraction would have let an empty row tie with every other one
       instead of sinking, silently, in the two sorts that are the page's defaults. */
    soonest: (a, b) => (a.soonest === b.soonest ? 0 : a.soonest < b.soonest ? -1 : 1),
    /* longest waiting first: the OLDEST send wins, and a row with no band sinks */
    waiting: (a, b) => (a.waitingFrom === b.waitingFrom ? 0 : a.waitingFrom < b.waitingFrom ? -1 : 1),
    name: (a, b) => a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }),
    /* furthest along the journey first; a row with no live query is -1 and sinks */
    stage: (a, b) => b.stage - a.stage,
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

  const ordered = [you, ...rest];

  /* ── lanes, packed across items AND bands together ──────────────────────────────────────── */
  const rows: TimelineRow[] = [];
  const bands: TimelineBand[] = [];
  for (const row of ordered) {
    const occ: (Occupant & { it?: TimelineItem; bd?: TimelineBand })[] = [
      ...row.items.map((it) => ({ start: it.idx, end: it.idx, lane: 0, spanTo: it.idx, it })),
      ...row.bands.map((bd) => ({ start: bd.fromIdx, end: bd.toIdx, lane: 0, spanTo: bd.toIdx, bd })),
    ].sort((a, b) => (a.start - b.start) || (a.end - b.end));
    const lanes = packLanes(occ, Math.max(1, win.length));
    for (const o of occ) {
      if (o.it) { o.it.lane = o.lane; o.it.spanTo = Math.max(o.it.idx, o.spanTo); }
      if (o.bd) o.bd.lane = o.lane;
    }
    rows.push({
      key: row.key, agentId: row.agentId, name: row.name, agency: row.agency,
      dot: row.dot, items: row.items, lanes, closed: row.closed,
    });
    bands.push(...row.bands);
  }
  return { rows, bands };
}

/** The rows — a projection of `timelineWeek`, which is the one derivation. */
export function timelineRows(
  data: TimelineData, windowStart: string, days: number, view?: TimelineView,
): TimelineRow[] {
  return timelineWeek(data, windowStart, days, view).rows;
}

/** The bands — the same pass, so a band and a chip can never be given the same lane. */
export function timelineBands(
  data: TimelineData, windowStart: string, days: number, view?: TimelineView,
): TimelineBand[] {
  return timelineWeek(data, windowStart, days, view).bands;
}
