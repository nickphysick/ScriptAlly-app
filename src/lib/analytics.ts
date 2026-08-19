/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * analytics — every figure the Analytics page states, derived at read time.
 *
 * ⚠️ PURE. No React, no Firebase, no clock of its own: `nowMs` is a parameter on every selector
 * that needs it. The page reads `queries`, `activities` and `agents` off the db context and passes
 * them in; nothing here writes, stamps or caches anything.
 *
 * ⚠️ DERIVED OVER STORED, AND WHERE A STORED FIELD IS READ IT IS ITSELF A DERIVATION.
 * `Query.fullSentDate` and its siblings are written by `recomputeQuery` ALONE, from the activity
 * log. So this module reads the LOG first and falls back to those fields — one mechanism with a
 * documented fallback, rather than two rules that agree until a document goes un-recomputed.
 *
 * ⚠️ IT REPORTS, IT NEVER APPRAISES. No copy here grades the writer's figures. The one interpretive
 * passage — READING_THE_NUMBERS — is reference material about what querying convention reads each
 * transition as, and it is deliberately written so that it says the same thing whatever the numbers
 * are. A verdict word (`good`, `slow`, `only`, `still`) belongs nowhere in this file.
 */
import { Query, Activity, Agent, QueryStatus } from "../types";
import { AGENT_RESPONSE_STATUSES, getActivityTime, normalizeResultingStatus } from "./queryDerivation";
import { agentPrimary, agentSecondary } from "./agentDisplay";

/* ────────────────────────────────── constants ────────────────────────────────── */

/**
 * ⚠️ THE SAMPLE-SIZE GUARD, AND IT IS A FEATURE RATHER THAN A LIMITATION.
 *
 * Below this many queries a percentage is noise dressed as a measurement: two requests from six
 * queries is "33%", which reads as a rate and is nothing of the kind. Under the guard the figure
 * is stated as the fraction it actually is — `2 of 6` — which is the same information without the
 * false precision.
 *
 * ⚠️ DO NOT "FIX" THIS BY SHOWING THE PERCENTAGE ANYWAY. The whole point is that the app declines
 * to state a rate it cannot support.
 */
export const MIN_SAMPLE = 20;

/** A day in milliseconds — the one place the number is written. */
export const DAY_MS = 86400000;

/**
 * ⚠️ CHART FILLS ONLY. These never touch `StatusDot`, which owns every status glyph in the app and
 * is locked; a chart that recoloured a dot would put two palettes on one page.
 *
 * The scheme is Burgundy & Sage and it carries meaning: WARM is outgoing (the writer's action),
 * SAGE is incoming (the agent's), WARM NEUTRAL is settled. Nothing here is a warning colour and
 * nothing is red — a query that has been out a long time is a fact, not an alarm.
 */
export const CHART = {
  sent: "#f5e2da",
  sentEdge: "#7c3a2a",
  resp: "#a9bca4",
  open: "#efd5ca",
  inplay: "#8a9e88",
  offer: "#7c3a2a",
  pass: "#ded5ca",
  elapsed: "#efe9e2",
  dotFill: "#f5e2da",
  dotEdge: "#7c3a2a",
  lateFill: "#efd5ca",
  lateEdge: "#7c3a2a",
  /** The late dot's edge is drawn heavier rather than in another colour — weight, not alarm. */
  lateEdgeWidth: 1.7,
  dotEdgeWidth: 1.1,
  grid: "#f0e8dc",
  axis: "#9c8878",
} as const;

/* ────────────────────────────────── range ────────────────────────────────── */

export type AnalyticsRange = "all" | "6m" | "3m";

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "6m", label: "Last 6 months" },
  { value: "3m", label: "Last 3 months" },
];

const RANGE_MONTHS: Record<AnalyticsRange, number | null> = { all: null, "6m": 6, "3m": 3 };

/** A half-open window `[fromMs, toMs)`; `fromMs === null` means "everything up to now". */
export interface RangeWindow {
  fromMs: number | null;
  toMs: number;
}

const shiftMonths = (ms: number, months: number): number => {
  const d = new Date(ms);
  d.setMonth(d.getMonth() - months);
  return d.getTime();
};

export function rangeWindow(range: AnalyticsRange, nowMs: number): RangeWindow {
  const months = RANGE_MONTHS[range];
  return { fromMs: months === null ? null : shiftMonths(nowMs, months), toMs: nowMs };
}

/**
 * The window immediately BEFORE the current one — the same length, ending where this one starts.
 *
 * ⚠️ `null` ON ALL TIME, and that is not a missing case. "All time" has nothing before it, so a
 * previous-period figure would be a comparison against an empty set reported as zero.
 */
export function previousWindow(range: AnalyticsRange, nowMs: number): RangeWindow | null {
  const months = RANGE_MONTHS[range];
  if (months === null) return null;
  return { fromMs: shiftMonths(nowMs, months * 2), toMs: shiftMonths(nowMs, months) };
}

export function previousWindowLabel(range: AnalyticsRange): string | null {
  const months = RANGE_MONTHS[range];
  return months === null ? null : `previous ${months} months`;
}

/* ────────────────────────────────── guards ────────────────────────────────── */

/** True when the denominator is too small for a percentage to mean anything. */
export const guarded = (denominator: number, min = MIN_SAMPLE): boolean => denominator < min;

/**
 * A percentage, or the raw fraction when the sample is too small to support one.
 *
 * ⚠️ A ZERO DENOMINATOR IS ALSO GUARDED — `0 of 0` states the truth; `0%` implies a measurement
 * was taken.
 */
export function safePct(n: number, d: number, min = MIN_SAMPLE): string {
  return guarded(d, min) ? `${n} of ${d}` : `${Math.round((n / d) * 100)}%`;
}

/**
 * ⚠️ MEDIAN, NEVER MEAN, for every wait figure on this page. One query that sat with an agent for
 * two years drags a mean far past anything the writer will actually experience next; the median
 * says what the middle of their own history looks like, which is the question being asked.
 */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const a = [...values].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

/* ────────────────────────────────── outcomes ────────────────────────────────── */

/**
 * Where a query stands now — the donut's roles and the aging chart's population.
 *
 * ⚠️ `pass` HOLDS BOTH REJECTED AND WITHDRAWN, and its label says so ("Pass or withdrawn"). The
 * two are different acts — the agent declined, or the writer stepped away — and the app knows
 * which, but the donut has five roles and a sixth that is empty on nearly every account would be
 * a slice of the pie reserved for almost nobody. What it must never do is call a withdrawal a
 * pass, so the label names both and the note says which is which.
 */
export type AnalyticsOutcome = "open" | "partial" | "full" | "offer" | "pass" | "elapsed";

/**
 * ⚠️ AN EXHAUSTIVE SWITCH CLOSED WITH `never`, per the house idiom. A default branch here would
 * silently absorb the next QueryStatus anyone adds into whichever role happened to be last —
 * and because everything on this page is a count, that shows up as a figure that is quietly
 * wrong rather than as an error. The next status fails to compile until it says where it belongs.
 */
export function outcomeFor(status: QueryStatus): AnalyticsOutcome {
  switch (status) {
    case QueryStatus.QUERIED:
      return "open";
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.PARTIAL_SENT:
      return "partial";
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.FULL_SENT:
    case QueryStatus.REVISE_RESUBMIT:
      return "full";
    case QueryStatus.OFFER:
      return "offer";
    case QueryStatus.REJECTED:
    case QueryStatus.WITHDRAWN:
      return "pass";
    case QueryStatus.NO_RESPONSE:
      return "elapsed";
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}

/* ────────────────────────────────── rows ────────────────────────────────── */

/**
 * Millis, or `null` when there is no date at all.
 *
 * ⚠️ IT WRAPS THE CANONICAL PARSER RATHER THAN REPLACING IT. `getActivityTime` already handles
 * every date shape the two stores use and returns `0` for an unparseable one, so it sorts first
 * and never wins a "latest". This page needs to tell absence apart from 1970 — a query with no
 * send date must be excluded from a wait, not counted as fifty-six years old — so the only thing
 * added here is that distinction.
 */
export const whenMs = (v: unknown): number | null => {
  const t = getActivityTime(v);
  return t === 0 ? null : t;
};

/** One query, with everything the page's selectors need already resolved. */
export interface AnalyticsRow {
  id: string;
  agentId: string;
  /** The agent's display name, or the agency once a record has no name (the identity-anchor rule). */
  agentName: string;
  /** The line beneath it — never a gendered pronoun, never "Unnamed agent". */
  agentSub: string;
  status: QueryStatus;
  outcome: AnalyticsOutcome;
  sentMs: number | null;
  /** When the agent FIRST acted, from the earliest incoming rung of the log. */
  respondedMs: number | null;
  /**
   * Whether the agent has acted at all — which is a DIFFERENT question from when.
   *
   * ⚠️ A RESPONSE WITH NO DERIVABLE DATE IS STILL A RESPONSE. Counting only dated ones would make
   * a pre-log account look like nobody had ever replied to it.
   */
  hasResponded: boolean;
  /** Days from send to first response; `null` unless both dates exist and the order is sane. */
  replyDays: number | null;
  /** Earliest activity date per status — the one mechanism every stage date below comes from. */
  stageMs: Partial<Record<QueryStatus, number>>;
  fullSentMs: number | null;
  /** The agency's own stated reply window, in weeks. `null` when the agent record does not state one. */
  windowWeeks: number | null;
  /** Whole days since the query went out; `null` for an undated (provisional) import. */
  daysOut: number | null;
  /** Reached the "material requested" rung at any point — including queries that later closed. */
  reachedRequest: boolean;
  /** Reached the full-manuscript rung. An offer implies the book was read, so it is included. */
  reachedFull: boolean;
  reachedOffer: boolean;
}

/**
 * ⚠️ THE ENRICHMENT IS DONE ONCE AND EVERY SELECTOR READS THE RESULT. Each selector re-deriving
 * from raw queries is how two panels on one page come to disagree about the same query.
 *
 * ⚠️ SCOPE IS THE CALLER'S. This takes whatever set it is given; the page filters to the active
 * manuscript before calling. Passing the wrong set is a visible bug, whereas a manuscript filter
 * buried in here would be an invisible one.
 */
export function buildRows(
  queries: Query[],
  activities: Activity[],
  agents: Agent[],
  nowMs: number,
): AnalyticsRow[] {
  const agentById = new Map(agents.map((a) => [a.id, a]));

  /* Earliest dated activity per (query, status). Earliest rather than latest because these are
     ARRIVALS — when a rung was first reached — and a re-recorded event must not move the date. */
  const stageByQuery = new Map<string, Partial<Record<QueryStatus, number>>>();
  for (const a of activities) {
    const status = normalizeResultingStatus(a.resultingStatus);
    if (!status || !a.queryId) continue;
    const t = whenMs(a.date);
    if (t === null) continue;
    let stages = stageByQuery.get(a.queryId);
    if (!stages) { stages = {}; stageByQuery.set(a.queryId, stages); }
    const prev = stages[status];
    if (prev === undefined || t < prev) stages[status] = t;
  }

  return queries.map((q) => {
    const stageMs = stageByQuery.get(q.id) ?? {};
    const agent = agentById.get(q.agentId);

    const sentMs = whenMs(q.dateSent);

    /* The first incoming rung, over the canonical response set — imported, never restated, so
       this page and `recomputeQuery`'s own `responseReceivedAt` cannot disagree about what
       counts as the agent having acted. */
    let respondedMs: number | null = null;
    for (const status of AGENT_RESPONSE_STATUSES) {
      const t = stageMs[status];
      if (t !== undefined && (respondedMs === null || t < respondedMs)) respondedMs = t;
    }
    /**
     * ⚠️ THE LOG ONLY — `responseReceivedAt` IS DELIBERATELY NOT A FALLBACK HERE, and it was one
     * until real data was looked at.
     *
     * The field is derived by `recomputeQuery` today, but legacy values from the stamping era
     * survive on any document that has not been recomputed since, and on this app's own dev
     * account most of them are EQUAL TO `dateSent`. Read as a response date, each of those is a
     * nought-day wait — a true-looking figure that measured nothing. Measured on the harness
     * account: nine such queries dragged the median to `0 days`, while `dashboardStats`'
     * `medianReplyDays`, which reads the log alone, said 24. Two derivations, one page, and the
     * one on screen was the wrong one.
     *
     * So the wait comes from the log, exactly as `medianReplyDays` takes it — the two now agree by
     * CONSTRUCTION rather than by fixture. What is lost is a date for responses logged before the
     * log existed, and `hasResponded` below carries those instead: "responded, date unknown" is
     * the honest pair, and it is the pair `recomputeQuery`'s own docstring names.
     */

    /* ⚠️ THE ORDER CHECK IS NOT PEDANTRY. An imported query can carry a response dated before its
       own send date; a negative wait would enter the median and the histogram as a real figure. */
    const replyDays =
      sentMs !== null && respondedMs !== null && respondedMs >= sentMs
        ? Math.round((respondedMs - sentMs) / DAY_MS)
        : null;

    const fullSentMs = stageMs[QueryStatus.FULL_SENT] ?? whenMs(q.fullSentDate);
    const partialRequestedMs = stageMs[QueryStatus.PARTIAL_REQUESTED] ?? whenMs(q.partialRequestedDate);
    const fullRequestedMs = stageMs[QueryStatus.FULL_REQUESTED] ?? whenMs(q.fullRequestedDate);
    const offerMs = stageMs[QueryStatus.OFFER] ?? whenMs(q.offerDate);

    /* ⚠️ THE FUNNEL READS HISTORY, NOT THE CURRENT STATUS, and that is the difference between a
       true figure and a flattering one. A query that drew a full request and was then declined
       still reached the full-manuscript rung; counting only live queries would quietly delete
       every request the writer has ever had the moment it closed. */
    const reachedOffer = offerMs !== null || q.status === QueryStatus.OFFER;
    /* An offer means the book was read, so it sits inside the full stage — which also keeps the
       cascade monotonic, so a transition can never exceed 100% and read as a rendering fault. */
    const reachedFull =
      reachedOffer ||
      fullRequestedMs !== null ||
      fullSentMs !== null ||
      q.status === QueryStatus.FULL_REQUESTED ||
      q.status === QueryStatus.FULL_SENT ||
      q.status === QueryStatus.REVISE_RESUBMIT;
    const reachedRequest =
      reachedFull ||
      partialRequestedMs !== null ||
      q.status === QueryStatus.PARTIAL_REQUESTED ||
      q.status === QueryStatus.PARTIAL_SENT;

    return {
      id: q.id,
      agentId: q.agentId,
      agentName: agent ? agentPrimary(agent) : "Agent not on file",
      agentSub: agent ? agentSecondary(agent) : "",
      status: q.status,
      outcome: outcomeFor(q.status),
      sentMs,
      respondedMs,
      /* the stored flag is `recomputeQuery`'s own answer; the rung's existence is the same answer
         derived here, and either is enough — this is "did they act", not "when" */
      hasResponded: q.hasAgentResponded === true || respondedMs !== null,
      replyDays,
      stageMs,
      fullSentMs,
      /* ⚠️ A STATED WINDOW OF ZERO IS NOT A WINDOW. `responseTimeWeeks === 0` is the deficiency
         value the Edit Agent drawer already treats as "not stated"; dividing by it would give
         Infinity and put every such query at the far end of the aging chart. */
      windowWeeks: agent && typeof agent.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0
        ? agent.responseTimeWeeks
        : null,
      daysOut: sentMs === null ? null : Math.floor((nowMs - sentMs) / DAY_MS),
      reachedRequest,
      reachedFull,
      reachedOffer,
    };
  });
}

/**
 * ⚠️ RANGE FILTERS ON THE SEND DATE, and an UNDATED query is in "all time" only.
 *
 * A provisional import has no send date, so there is no honest way to place it inside a
 * three-month window — but it was still sent, so dropping it from the all-time total would
 * understate the writer's own history. In range it counts; in a window it cannot be placed.
 */
export function inWindow(row: AnalyticsRow, w: RangeWindow): boolean {
  if (w.fromMs === null) return true;
  return row.sentMs !== null && row.sentMs >= w.fromMs && row.sentMs < w.toMs;
}

export const rowsInWindow = (rows: AnalyticsRow[], w: RangeWindow): AnalyticsRow[] =>
  rows.filter((r) => inWindow(r, w));

/* ────────────────────────────────── stat strip ────────────────────────────────── */

export interface StatSet {
  sent: number;
  /** Awaiting a first response — the queries that have gone out and had nothing back. */
  open: number;
  requests: number;
  partials: number;
  fulls: number;
  offers: number;
  /** Responses with a derivable wait — the denominator behind the median, not the response count. */
  responded: number;
  /** `null` when nothing has been sent; the guard decides how it is rendered. */
  ratePercent: number | null;
  medianReplyDays: number | null;
}

export function statSet(rows: AnalyticsRow[]): StatSet {
  const sent = rows.length;
  const requests = rows.filter((r) => r.reachedRequest).length;
  const waits = rows.map((r) => r.replyDays).filter((d): d is number => d !== null);
  return {
    sent,
    open: rows.filter((r) => r.outcome === "open").length,
    requests,
    partials: rows.filter((r) => r.reachedRequest && !r.reachedFull).length,
    fulls: rows.filter((r) => r.reachedFull).length,
    offers: rows.filter((r) => r.reachedOffer).length,
    responded: waits.length,
    ratePercent: sent > 0 ? Math.round((requests / sent) * 100) : null,
    medianReplyDays: median(waits),
  };
}

/* ────────────────────────────────── journey funnel ────────────────────────────────── */

export interface FunnelStage {
  key: "queried" | "requested" | "full" | "offer";
  /** Which status this stage's `StatusDot` renders — the real component, never a recreation. */
  dotStatus: QueryStatus;
  name: string;
  count: number;
  description: string;
}

/**
 * The four rungs, UK-aware: what goes out first here is a letter, a synopsis and opening
 * chapters, and the second rung splits between a partial and a straight-to-full request.
 */
export function funnelStages(rows: AnalyticsRow[]): FunnelStage[] {
  const sent = rows.length;
  const requests = rows.filter((r) => r.reachedRequest).length;
  const fulls = rows.filter((r) => r.reachedFull).length;
  const offers = rows.filter((r) => r.reachedOffer).length;
  const partials = requests - fulls;
  return [
    {
      key: "queried",
      dotStatus: QueryStatus.QUERIED,
      name: "Queried",
      count: sent,
      description: "Letter, synopsis and opening chapters out with agents",
    },
    {
      key: "requested",
      dotStatus: QueryStatus.PARTIAL_REQUESTED,
      name: "Material requested",
      count: requests,
      description: requests
        ? `Asked to read more — ${partials} partial · ${fulls} straight to full`
        : "Agents who asked to read more",
    },
    {
      key: "full",
      dotStatus: QueryStatus.FULL_REQUESTED,
      name: "Full manuscript",
      count: fulls,
      description: "Reading the whole book",
    },
    {
      key: "offer",
      dotStatus: QueryStatus.OFFER,
      name: "Offer",
      count: offers,
      description: "Offers of representation",
    },
  ];
}

/** Each transition, already guarded. `label` is a percentage or a `n of d` fraction. */
export function funnelTransitions(stages: FunnelStage[]): { from: FunnelStage; to: FunnelStage; label: string }[] {
  const out: { from: FunnelStage; to: FunnelStage; label: string }[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    out.push({ from: stages[i], to: stages[i + 1], label: safePct(stages[i + 1].count, stages[i].count) });
  }
  return out;
}

/**
 * ⚠️ STATIC REFERENCE COPY, AND IT NEVER LOOKS AT THE WRITER'S FIGURES. It says what querying
 * convention reads each transition as — a fact about the practice, true on an account with two
 * queries and on one with two hundred. The moment a sentence here starts describing THIS
 * writer's numbers it becomes an appraisal, which this page does not do.
 */
export const READING_THE_NUMBERS: { dotStatus: QueryStatus; label: string; text: string }[] = [
  {
    dotStatus: QueryStatus.QUERIED,
    label: "Queried → requested",
    text: "Querying convention reads this transition as a measure of the letter and the opening chapters — the material every agent sees first.",
  },
  {
    dotStatus: QueryStatus.PARTIAL_REQUESTED,
    label: "Requested → full",
    text: "Read as a measure of the sample material — whether the pages hold an agent who already liked the pitch.",
  },
  {
    dotStatus: QueryStatus.FULL_REQUESTED,
    label: "Full → offer",
    text: "Read as a measure of the manuscript as a whole. Fulls sit with agents far longer than queries do.",
  },
];

/** The footnote under the funnel — attributed, hedged, and about the practice rather than the user. */
export const FUNNEL_REFERENCE_NOTE =
  "querying communities commonly cite 5–10% queried-to-requested as a working rate. The figure is self-reported, varies widely by genre and list fit, and only settles once a fair number of queries are out.";

/* ────────────────────────────────── monthly timeline ────────────────────────────────── */

/** Year·month as a single sortable integer, so month arithmetic never crosses a year wrongly. */
export const monthKey = (ms: number): number => {
  const d = new Date(ms);
  return d.getFullYear() * 12 + d.getMonth();
};

export const monthLabel = (key: number): string =>
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    ((key % 12) + 12) % 12
  ];

export const monthYear = (key: number): number => Math.floor(key / 12);

/**
 * ⚠️ AN ALL-TIME SPAN IS CAPPED, AND THE CAP IS REPORTED RATHER THAN APPLIED SILENTLY. A writer
 * with four years of history would get forty-eight bars two pixels wide. `omittedMonths` is
 * non-zero when the cap bit, so the panel can say so — a truncation nobody states reads as
 * "this is everything".
 */
export const MAX_TIMELINE_MONTHS = 24;

export interface MonthlySeries {
  months: number[];
  sent: number[];
  received: number[];
  omittedMonths: number;
}

export function monthlySeries(rows: AnalyticsRow[], range: AnalyticsRange, nowMs: number): MonthlySeries {
  const endK = monthKey(nowMs);
  const months = RANGE_MONTHS[range];

  let startK: number;
  if (months !== null) {
    startK = endK - (months - 1);
  } else {
    const dated = rows.map((r) => r.sentMs).filter((m): m is number => m !== null);
    startK = dated.length ? Math.min(...dated.map(monthKey)) : endK;
  }

  const uncapped = endK - startK + 1;
  const omittedMonths = Math.max(0, uncapped - MAX_TIMELINE_MONTHS);
  if (omittedMonths > 0) startK = endK - (MAX_TIMELINE_MONTHS - 1);

  const keys: number[] = [];
  for (let k = startK; k <= endK; k++) keys.push(k);

  const sent = keys.map((k) => rows.filter((r) => r.sentMs !== null && monthKey(r.sentMs) === k).length);
  const received = keys.map(
    (k) => rows.filter((r) => r.respondedMs !== null && monthKey(r.respondedMs) === k).length,
  );
  return { months: keys, sent, received, omittedMonths };
}

/* ────────────────────────────────── event marks ────────────────────────────────── */

export interface EventMark {
  queryId: string;
  kind: "full" | "offer";
  label: string;
  atMs: number;
  monthKey: number;
  agentName: string;
  agentSub: string;
}

/**
 * Fulls and offers, pinned to the month each ARRIVED.
 *
 * ⚠️ ONE QUERY CAN PRODUCE BOTH, and both are emitted. A full requested in March and an offer in
 * July are two things that happened in two months; collapsing them to the later one would erase
 * the request from the timeline entirely.
 */
export function eventMarks(rows: AnalyticsRow[]): EventMark[] {
  const marks: EventMark[] = [];
  for (const r of rows) {
    const full = r.stageMs[QueryStatus.FULL_REQUESTED];
    if (full !== undefined) {
      marks.push({ queryId: r.id, kind: "full", label: "Full requested", atMs: full, monthKey: monthKey(full), agentName: r.agentName, agentSub: r.agentSub });
    }
    const offer = r.stageMs[QueryStatus.OFFER];
    if (offer !== undefined) {
      marks.push({ queryId: r.id, kind: "offer", label: "Offer", atMs: offer, monthKey: monthKey(offer), agentName: r.agentName, agentSub: r.agentSub });
    }
  }
  return marks.sort((a, b) => a.atMs - b.atMs);
}

/* ────────────────────────────────── status breakdown ────────────────────────────────── */

export type DonutRole = "open" | "inplay" | "offer" | "pass" | "elapsed";

export interface DonutSegment {
  key: DonutRole;
  label: string;
  note: string;
  colour: string;
  count: number;
  /** Share of the total, 0–100, rounded. Shares may not sum to exactly 100 after rounding. */
  percent: number;
}

/**
 * ⚠️ FIVE ROLES, AND THE SIX OUTCOMES FOLD INTO THEM — `partial` and `full` are both "requests in
 * play". They are genuinely different things, and the page says so twice already: the stat strip
 * splits them (`1 partial · 4 full`) and the funnel gives the full its own rung. What the donut
 * answers is "where does everything stand", and at that altitude both are the same answer — an
 * agent is reading something of yours.
 *
 * ⚠️ IT WAS BUILT AS SIX AND THAT WAS VISIBLY WRONG, which is the reason for this note. Two
 * segments carrying the SAME fill sat side by side on the ring, so the donut drew what looked like
 * one region split by a hairline for no stated reason, and the list spent two rows on a
 * distinction the colour did not make. Either they differ in colour or they are one role; one
 * role is the truthful answer here.
 */
const DONUT_ROLES: { key: DonutRole; outcomes: AnalyticsOutcome[]; label: string; note: string; colour: string }[] = [
  { key: "open", outcomes: ["open"], label: "Still out", note: "Awaiting a first response", colour: CHART.open },
  { key: "inplay", outcomes: ["partial", "full"], label: "Requests in play", note: "Material with agents now", colour: CHART.inplay },
  { key: "offer", outcomes: ["offer"], label: "Offer", note: "Offers of representation", colour: CHART.offer },
  { key: "pass", outcomes: ["pass"], label: "Pass or withdrawn", note: "Closed — the agent passed, or you withdrew", colour: CHART.pass },
  { key: "elapsed", outcomes: ["elapsed"], label: "Window elapsed", note: "Closed once the agency's stated window passed", colour: CHART.elapsed },
];

/**
 * ⚠️ ZERO ROLES DROP OUT. A donut segment of nothing is a legend row asserting a category the
 * writer has never been in; the list is the legend, so an absent role is simply absent.
 */
export function statusBreakdown(rows: AnalyticsRow[]): DonutSegment[] {
  const total = rows.length;
  return DONUT_ROLES.map(({ outcomes, ...role }) => {
    const count = rows.filter((r) => outcomes.includes(r.outcome)).length;
    return { ...role, count, percent: total > 0 ? Math.round((count / total) * 100) : 0 };
  }).filter((s) => s.count > 0);
}

/* ────────────────────────────────── reply times ────────────────────────────────── */

export interface ReplyBucket {
  label: string;
  loDays: number;
  hiDays: number;
  count: number;
}

/**
 * ⚠️ QUERY WAITS ONLY, AND FULL WAITS NEVER JOIN THEM. A full sits with an agent for months as a
 * matter of course; folding those into the same distribution would drag the median for the thing
 * the writer is actually asking about — how long a query takes to come back. The fulls have their
 * own panel and their own clock.
 *
 * ⚠️ A QUERY WITH NO RESPONSE ENTERS NO BUCKET. "Still waiting" is not a long wait that has
 * finished; counting it would make an unanswered query look like a slow answer.
 */
export function replyBuckets(rows: AnalyticsRow[]): ReplyBucket[] {
  const waits = rows.map((r) => r.replyDays).filter((d): d is number => d !== null);
  const spec: { label: string; loDays: number; hiDays: number }[] = [
    { label: "< 1 wk", loDays: 0, hiDays: 7 },
    { label: "1–2 wk", loDays: 7, hiDays: 14 },
    { label: "2–4 wk", loDays: 14, hiDays: 30 },
    { label: "1–2 mo", loDays: 30, hiDays: 60 },
    { label: "2–3 mo", loDays: 60, hiDays: 90 },
    { label: "3 mo +", loDays: 90, hiDays: Number.POSITIVE_INFINITY },
  ];
  return spec.map((b) => ({ ...b, count: waits.filter((d) => d >= b.loDays && d < b.hiDays).length }));
}

export const REPLY_HISTOGRAM_NOTE =
  "Query responses only. Full manuscripts sit on their own timeline — see “Fulls under consideration”.";

/* ────────────────────────────────── aging ────────────────────────────────── */

export interface AgingPoint {
  queryId: string;
  agentName: string;
  agentSub: string;
  sentMs: number;
  daysOut: number;
  windowWeeks: number;
  /** Days out as a fraction of the agency's own stated window. 1 is the window itself. */
  fraction: number;
  pastWindow: boolean;
}

export interface AgingSet {
  points: AgingPoint[];
  pastWindow: number;
  /**
   * ⚠️ OPEN QUERIES THE CHART CANNOT PLACE, COUNTED AND REPORTED. The axis is normalised to each
   * agency's stated window, so a query whose agent has never stated one has no position on it.
   * Dropping those silently would make the panel understate how much is still out.
   */
  withoutStatedWindow: number;
}

export function agingSet(rows: AnalyticsRow[]): AgingSet {
  const open = rows.filter((r) => r.outcome === "open" && r.sentMs !== null && r.daysOut !== null);
  const points: AgingPoint[] = open
    .filter((r) => r.windowWeeks !== null)
    .map((r) => {
      const fraction = (r.daysOut as number) / ((r.windowWeeks as number) * 7);
      return {
        queryId: r.id,
        agentName: r.agentName,
        agentSub: r.agentSub,
        sentMs: r.sentMs as number,
        daysOut: r.daysOut as number,
        windowWeeks: r.windowWeeks as number,
        fraction,
        pastWindow: fraction >= 1,
      };
    })
    .sort((a, b) => a.fraction - b.fraction);
  return {
    points,
    pastWindow: points.filter((p) => p.pastWindow).length,
    withoutStatedWindow: open.length - points.length,
  };
}

/* ────────────────────────────────── on the horizon ────────────────────────────────── */

export const HORIZON_DAYS = 28;

export interface HorizonRow {
  queryId: string;
  agentName: string;
  agentSub: string;
  closesMs: number;
  daysLeft: number;
}

export interface HorizonSet {
  soon: HorizonRow[];
  /** Already past their stated window — stated separately, never mixed into the countdown. */
  past: number;
}

/** Open queries whose stated window closes within four weeks, soonest first. */
export function horizonSet(rows: AnalyticsRow[], nowMs: number): HorizonSet {
  const open = rows.filter(
    (r) => r.outcome === "open" && r.sentMs !== null && r.windowWeeks !== null,
  );
  const withEnd = open.map((r) => {
    const closesMs = (r.sentMs as number) + (r.windowWeeks as number) * 7 * DAY_MS;
    return {
      queryId: r.id,
      agentName: r.agentName,
      agentSub: r.agentSub,
      closesMs,
      daysLeft: Math.round((closesMs - nowMs) / DAY_MS),
    };
  });
  return {
    soon: withEnd.filter((h) => h.daysLeft > 0 && h.daysLeft <= HORIZON_DAYS).sort((a, b) => a.daysLeft - b.daysLeft),
    past: withEnd.filter((h) => h.daysLeft <= 0).length,
  };
}

/* ────────────────────────────────── fulls ────────────────────────────────── */

export interface FullRow {
  queryId: string;
  agentName: string;
  agentSub: string;
  fullSentMs: number;
  dwellDays: number;
}

/**
 * Fulls currently with an agent, longest first.
 *
 * ⚠️ `FULL_SENT` ONLY. A full that has been REQUESTED is not yet out, and a Revise & Resubmit has
 * come back — neither is under consideration, and counting either would put a manuscript on an
 * agent's desk that is not on it.
 */
export function fullsUnderConsideration(rows: AnalyticsRow[], nowMs: number): FullRow[] {
  return rows
    .filter((r) => r.status === QueryStatus.FULL_SENT && r.fullSentMs !== null)
    .map((r) => ({
      queryId: r.id,
      agentName: r.agentName,
      agentSub: r.agentSub,
      fullSentMs: r.fullSentMs as number,
      dwellDays: Math.max(0, Math.floor((nowMs - (r.fullSentMs as number)) / DAY_MS)),
    }))
    .sort((a, b) => b.dwellDays - a.dwellDays);
}

export const FULLS_NOTE =
  "Fulls commonly sit for months — their waits are kept apart from query waits so neither skews the other.";

/* ────────────────────────────────── latest responses ────────────────────────────────── */

export interface ResponseRow {
  queryId: string;
  agentName: string;
  agentSub: string;
  status: QueryStatus;
  outcome: AnalyticsOutcome;
  sentMs: number | null;
  respondedMs: number;
  replyDays: number | null;
  /** Which status the row's chip renders through `StatusDot`. */
  dotStatus: QueryStatus;
  chipLabel: string;
}

const RESPONSE_CHIP: Record<AnalyticsOutcome, { dotStatus: QueryStatus; label: string }> = {
  open: { dotStatus: QueryStatus.QUERIED, label: "Queried" },
  partial: { dotStatus: QueryStatus.PARTIAL_REQUESTED, label: "Partial request" },
  full: { dotStatus: QueryStatus.FULL_REQUESTED, label: "Full request" },
  offer: { dotStatus: QueryStatus.OFFER, label: "Offer" },
  pass: { dotStatus: QueryStatus.REJECTED, label: "Pass" },
  elapsed: { dotStatus: QueryStatus.NO_RESPONSE, label: "Window elapsed" },
};

export function latestResponses(rows: AnalyticsRow[], limit = 7): ResponseRow[] {
  return rows
    .filter((r) => r.respondedMs !== null)
    .sort((a, b) => (b.respondedMs as number) - (a.respondedMs as number))
    .slice(0, limit)
    .map((r) => ({
      queryId: r.id,
      agentName: r.agentName,
      agentSub: r.agentSub,
      status: r.status,
      outcome: r.outcome,
      sentMs: r.sentMs,
      respondedMs: r.respondedMs as number,
      replyDays: r.replyDays,
      dotStatus: RESPONSE_CHIP[r.outcome].dotStatus,
      chipLabel: RESPONSE_CHIP[r.outcome].label,
    }));
}

/* ────────────────────────────────── early state ────────────────────────────────── */

/**
 * ⚠️ A ROADMAP, NOT A DEFICIENCY. It says when each figure firms up, because that is useful; it
 * does not say the writer has too few queries, because that is a judgement about how they are
 * going about their own submissions.
 */
export const EARLY_STATE_HINT =
  "percentages appear once about 20 queries are out. Reply-time and window charts fill in as agents respond; the journey card takes shape with every send.";

export const isEarlyState = (rows: AnalyticsRow[]): boolean => rows.length < MIN_SAMPLE;
