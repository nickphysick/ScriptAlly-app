/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard stat selectors — the ONE data source behind the v37 dashboard's stat renderings
 * (full-width cards, focus-slot minis, focused panels) and the greeting eyebrow. Pure functions
 * over the queries/agents collections so they are unit-testable; no component may re-derive
 * these numbers its own way.
 *
 * Canon respected here (do not re-invent):
 *  - Response counting: each query counts at most once — `hasAgentResponded` (derived by
 *    recomputeQuery) with the legacy status-set fallback for un-migrated docs.
 *  - Active = the non-terminal pipeline statuses (STATUS_ORDER journey).
 *  - "Awaiting a reply" = active queries whose ball-holder is the agent (Queried / Partial
 *    Sent / Full Sent) — mirrors getPrimaryAction's classification without storing it.
 *  - Agents/idle = agentBuckets (lib/lifecycle.ts): idle = no queries ∧ open/unknown ∧ not set aside.
 */
import { Activity, Agent, Query, QueryStatus } from "../types";
import { agentBuckets } from "./lifecycle";
import { agentPrimary, AGENT_NOT_SPECIFIED } from "./agentDisplay";
import { STATUS_ORDER } from "./statusOrder";
import { AGENT_RESPONSE_STATUSES } from "./queryDerivation";

/** Monday 00:00 (local) of the ISO week containing `d`. */
export const isoWeekStart = (d: Date): Date => {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // Mon=0 … Sun=6
  out.setDate(out.getDate() - dow);
  return out;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const parseWhen = (v: unknown): number | null => {
  if (!v && v !== 0) return null;
  // Firestore Timestamps (lastStatusChange / responseReceivedAt) arrive as objects.
  if (typeof v === "object" && v !== null) {
    const anyV = v as any;
    if (typeof anyV.toDate === "function") return anyV.toDate().getTime();
    if (typeof anyV.seconds === "number") return anyV.seconds * 1000;
    if (v instanceof Date) return v.getTime();
    return null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : null; // epoch ms
  const t = typeof v === "string" ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

/** Monday 00:00 of each of the trailing `bins` ISO weeks, oldest first (current week last). */
export const trailingWeekStarts = (now: Date, bins = 8): Date[] => {
  const cur = isoWeekStart(now).getTime();
  return Array.from({ length: bins }, (_, i) => new Date(cur - (bins - 1 - i) * WEEK_MS));
};

/** Sends per ISO week for the trailing `bins` weeks; index bins-1 = the current week. */
export const weeklySendSeries = (queries: Query[], now: Date, bins = 8): number[] => {
  const series = Array(bins).fill(0);
  const thisWeek = isoWeekStart(now).getTime();
  for (const q of queries) {
    const t = parseWhen(q.dateSent);
    if (t === null) continue;
    const diff = Math.round((thisWeek - isoWeekStart(new Date(t)).getTime()) / WEEK_MS);
    const idx = bins - 1 - diff;
    if (idx >= 0 && idx < bins) series[idx]++;
  }
  return series;
};

/** Sends in the current ISO week (the "+N this week" pill). */
export const sendsThisWeek = (queries: Query[], now: Date): number =>
  weeklySendSeries(queries, now, 1)[0];

const ACTIVE_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
]);

/** Active queries whose ball-holder is the agent (writer has sent; no agent move yet). */
const AWAITING_REPLY_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_SENT,
]);

/** Legacy fallback for docs recomputeQuery hasn't migrated — mirrors Dashboard's rule exactly. */
const LEGACY_RESPONSE_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
  QueryStatus.REJECTED,
]);

export const activeQueriesOf = (queries: Query[]): Query[] =>
  queries.filter((q) => ACTIVE_STATUSES.has(q.status));

export const awaitingReplyCount = (queries: Query[]): number =>
  queries.filter((q) => AWAITING_REPLY_STATUSES.has(q.status)).length;

export const responsesReceivedCount = (queries: Query[]): number =>
  queries.filter((q) =>
    q.hasAgentResponded !== undefined ? q.hasAgentResponded : LEGACY_RESPONSE_STATUSES.has(q.status),
  ).length;

export const responseRatePercent = (queries: Query[]): number =>
  queries.length > 0 ? Math.round((responsesReceivedCount(queries) / queries.length) * 100) : 0;

export const idleAgentCount = (agents: Agent[], queries: Query[]): number =>
  agentBuckets<Agent>(agents, queries).idle.length;

export const shownAgentCount = (agents: Agent[], queries: Query[]): number => {
  const b = agentBuckets<Agent>(agents, queries);
  return b.queried.length + b.idle.length;
};

/** Active-pipeline mix for the segmented bar, in journey order, zero stages dropped. */
export const pipelineMix = (queries: Query[]): { status: QueryStatus; count: number }[] => {
  const order = [
    QueryStatus.QUERIED,
    QueryStatus.PARTIAL_REQUESTED,
    QueryStatus.PARTIAL_SENT,
    QueryStatus.FULL_REQUESTED,
    QueryStatus.FULL_SENT,
    QueryStatus.REVISE_RESUBMIT,
  ];
  return order
    .map((status) => ({ status, count: queries.filter((q) => q.status === status).length }))
    .filter((s) => s.count > 0);
};

const TERMINAL_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.OFFER,
  QueryStatus.REJECTED,
  QueryStatus.WITHDRAWN,
  QueryStatus.NO_RESPONSE,
]);

/** When a terminal query stopped being active — the derived audit fields, oldest-truth first.
 *  A terminal doc with no usable timestamp closes at its dateSent (conservative: it never
 *  contributes to the historical active line). */
const closedAtOf = (q: Query): number | null => {
  if (!TERMINAL_STATUSES.has(q.status)) return null; // still active — never closed
  return parseWhen(q.lastStatusChange) ?? parseWhen(q.responseReceivedAt) ?? parseWhen(q.dateSent);
};

/**
 * Active-count sampled at the END of each of the trailing `bins` ISO weeks (the last sample is
 * clamped to `now`, so it always equals the live active count). A query is active at time T when
 * it was sent by T and had not reached a terminal status by T. Uses only derived fields
 * (status + dateSent + lastStatusChange/responseReceivedAt) — no hand-rolled status logic.
 */
export const activeWeeklySeries = (queries: Query[], now: Date, bins = 8): number[] => {
  const starts = trailingWeekStarts(now, bins);
  return starts.map((ws, i) => {
    const sampleAt = i === bins - 1 ? now.getTime() : ws.getTime() + WEEK_MS - 1;
    let n = 0;
    for (const q of queries) {
      const sent = parseWhen(q.dateSent);
      if (sent === null || sent > sampleAt) continue;
      const closed = closedAtOf(q);
      if (closed !== null && closed <= sampleAt) continue;
      n++;
    }
    return n;
  });
};

export interface AgentStatusSummary {
  id: string;
  name: string;
  /** Agency (empty string when unknown) — the hover panel's sub-line. */
  agency: string;
  /** The agent's most advanced ACTIVE status (STATUS_ORDER journey), or null when idle. */
  status: QueryStatus | null;
  /** The ranked query's response deadline (ISO), when one exists. */
  respondBy: string | null;
}

/** One entry per agent shown on the Agents card (agentBuckets order: queried then idle). */
export const agentStatusSummaries = (agents: Agent[], queries: Query[]): AgentStatusSummary[] => {
  const buckets = agentBuckets<Agent>(agents, queries);
  const rank = (s: QueryStatus) => STATUS_ORDER.indexOf(s);
  const summarise = (a: Agent): AgentStatusSummary => {
    const base = { id: a.id, name: a.name, agency: a.agency || "" };
    const active = queries.filter((q) => q.agentId === a.id && ACTIVE_STATUSES.has(q.status));
    if (active.length === 0) return { ...base, status: null, respondBy: null };
    const best = active.reduce((top, q) => (rank(q.status) > rank(top.status) ? q : top));
    return { ...base, status: best.status, respondBy: best.responseDeadline ?? null };
  };
  return [...buckets.queried, ...buckets.idle].map(summarise);
};

/* ── hover-panel selectors (locked designs S1·A·A·A, 4 Jul) ── */

/** "MON".."SUN" day chip from a query's dateSent. */
export const dayChip = (when: unknown): string => {
  const t = parseWhen(when);
  if (t === null) return "—";
  return new Date(t).toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
};

export interface WeekRecipient {
  id: string;
  agentName: string;
  agency: string;
  day: string;
}

/** The queries sent in the ISO week starting `weekStart`, as panel rows ordered by send time. */
export const weekRecipients = (queries: Query[], agents: Agent[], weekStart: Date): WeekRecipient[] => {
  const from = weekStart.getTime();
  const to = from + WEEK_MS;
  return queries
    .map((q) => ({ q, t: parseWhen(q.dateSent) }))
    .filter((x): x is { q: Query; t: number } => x.t !== null && x.t >= from && x.t < to)
    .sort((a, b) => a.t - b.t)
    .map(({ q, t }) => {
      const agent = agents.find((a) => a.id === q.agentId);
      return {
        id: q.id,
        agentName: agent ? agentPrimary(agent) : AGENT_NOT_SPECIFIED,
        agency: agent && agent.name?.trim() ? agent.agency || "" : "",
        day: dayChip(t),
      };
    });
};

/** Footer for the recipients panel: `▲ +1 VS PRIOR WEEK · 10 TOTAL` (total = cumulative sends
 *  through the hovered week). Delta omitted for the oldest bin (prior week underivable). */
export const sentWeekFooter = (series: number[], idx: number): string => {
  const cumulative = series.slice(0, idx + 1).reduce((a, b) => a + b, 0);
  const total = `${cumulative} TOTAL`;
  if (idx <= 0) return total;
  const delta = series[idx] - series[idx - 1];
  const deltaLabel = delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : `· ±0`;
  return `${deltaLabel} VS PRIOR WEEK · ${total}`;
};

export interface OutcomeGroup {
  key: string;
  label: string;
  /** Which status the group's StatusDot renders (the real component, never a recreation). */
  dotStatus: QueryStatus;
  count: number;
}

/**
 * Responses grouped by outcome, per the canonical once-per-query rule. Precedence per query:
 * Offer > Revise & resubmit (current) > Full requested (derived stage date or current stage) >
 * Partial requested (ditto) > Pass (Rejected). A legacy responder matching none of these (e.g.
 * withdrawn with a bare hasAgentResponded flag) is skipped — the header count stays canonical,
 * so group sums may undercount in that rare shape rather than guess. Zero groups drop out.
 */
export const outcomeGroups = (queries: Query[]): OutcomeGroup[] => {
  const responded = queries.filter((q) =>
    q.hasAgentResponded !== undefined ? q.hasAgentResponded : LEGACY_RESPONSE_STATUSES.has(q.status),
  );
  const counts = { offers: 0, rr: 0, fulls: 0, partials: 0, passes: 0 };
  for (const q of responded) {
    if (q.status === QueryStatus.OFFER) counts.offers++;
    else if (q.status === QueryStatus.REVISE_RESUBMIT) counts.rr++;
    else if (q.fullRequestedDate || q.status === QueryStatus.FULL_REQUESTED || q.status === QueryStatus.FULL_SENT) counts.fulls++;
    else if (q.partialRequestedDate || q.status === QueryStatus.PARTIAL_REQUESTED || q.status === QueryStatus.PARTIAL_SENT) counts.partials++;
    else if (q.status === QueryStatus.REJECTED) counts.passes++;
  }
  const groups: OutcomeGroup[] = [
    { key: "offers", label: "Offers", dotStatus: QueryStatus.OFFER, count: counts.offers },
    { key: "rr", label: "Revise & resubmit", dotStatus: QueryStatus.REVISE_RESUBMIT, count: counts.rr },
    { key: "fulls", label: "Fulls requested", dotStatus: QueryStatus.FULL_REQUESTED, count: counts.fulls },
    { key: "partials", label: "Partials requested", dotStatus: QueryStatus.PARTIAL_REQUESTED, count: counts.partials },
    { key: "passes", label: "Passes", dotStatus: QueryStatus.REJECTED, count: counts.passes },
  ];
  return groups.filter((g) => g.count > 0);
};

/**
 * Median days from dateSent to the FIRST agent-response activity (resultingStatus in the
 * canonical AGENT_RESPONSE_STATUSES), rounded; null when no query has a derivable pair —
 * the panel then omits its footer entirely (never estimate).
 */
export const medianReplyDays = (queries: Query[], activities: Activity[]): number | null => {
  const byQuery = new Map<string, number>();
  for (const a of activities) {
    if (!a.resultingStatus || !AGENT_RESPONSE_STATUSES.has(a.resultingStatus)) continue;
    const t = parseWhen(a.date);
    if (t === null || !a.queryId) continue;
    const prev = byQuery.get(a.queryId);
    if (prev === undefined || t < prev) byQuery.set(a.queryId, t);
  }
  const spans: number[] = [];
  for (const q of queries) {
    const sent = parseWhen(q.dateSent);
    const first = byQuery.get(q.id);
    if (sent === null || first === undefined || first < sent) continue;
    spans.push((first - sent) / 86400000);
  }
  if (spans.length === 0) return null;
  spans.sort((a, b) => a - b);
  const mid = Math.floor(spans.length / 2);
  const median = spans.length % 2 ? spans[mid] : (spans[mid - 1] + spans[mid]) / 2;
  return Math.round(median);
};

/** Ball-holder split for the mix panel footer: `2 WITH AGENTS · 1 WAITING ON YOU`. */
export const ballHolderSplit = (queries: Query[]): string => {
  const active = activeQueriesOf(queries);
  const withAgents = active.filter((q) => AWAITING_REPLY_STATUSES.has(q.status)).length;
  const onYou = active.length - withAgents;
  return `${withAgents} WITH ${withAgents === 1 ? "AGENT" : "AGENTS"} · ${onYou} WAITING ON YOU`;
};

/* ── agent icon grid (pure sizing — the Agents card renders every agent it can) ──
   Rules (owner-locked): max 8 icons per row before wrapping; icons centred both axes in the
   available box; sized as large as the box height allows WITHOUT growing the container; as
   volume grows the size shrinks — and once the roster cannot fit at the legibility floor, the
   grid caps at its capacity and the final slot becomes a "+N" overflow chip, so the container
   still never grows and nothing is ever silently cut off (adversarial-review fix, 4 Jul). */
export interface AgentGridLayout {
  cols: number;
  rows: number;
  /** Icon edge in px (square glyph). */
  size: number;
  /** How many agent glyphs to render (== count unless overflowing). */
  shown: number;
  /** Agents beyond capacity, represented by the "+N" chip (0 = no chip). */
  overflow: number;
}

export const AGENT_GRID_MAX_PER_ROW = 8;
export const AGENT_GRID_GAP = 5;
/** The legibility floor — small enough to pack, big enough to read, hover and focus, and tall
 *  enough that the +N chip fits an icon row without growing it. */
export const AGENT_GRID_MIN_SIZE = 14;

const EMPTY_GRID: AgentGridLayout = { cols: 0, rows: 0, size: 0, shown: 0, overflow: 0 };

export const agentGridLayout = (count: number, boxW: number, boxH: number, gap = AGENT_GRID_GAP): AgentGridLayout => {
  if (count <= 0 || boxW <= 0 || boxH <= 0) return EMPTY_GRID;
  const cols = Math.min(AGENT_GRID_MAX_PER_ROW, count);
  const rows = Math.ceil(count / AGENT_GRID_MAX_PER_ROW);
  const fit = (r: number, c: number) =>
    Math.min(
      Math.floor((boxH - (r - 1) * gap) / r),
      Math.floor((boxW - (c - 1) * gap) / c),
    );
  const size = fit(rows, cols);
  if (size >= AGENT_GRID_MIN_SIZE) return { cols, rows, size, shown: count, overflow: 0 };

  // Overflow mode: cap the rows to what the box fits at the floor; the last slot is the chip.
  const maxRows = Math.max(1, Math.floor((boxH + gap) / (AGENT_GRID_MIN_SIZE + gap)));
  const cappedRows = Math.min(rows, maxRows);
  const shown = Math.max(0, cappedRows * AGENT_GRID_MAX_PER_ROW - 1);
  return {
    cols: Math.min(AGENT_GRID_MAX_PER_ROW, shown + 1),
    rows: cappedRows,
    size: Math.max(AGENT_GRID_MIN_SIZE, fit(cappedRows, AGENT_GRID_MAX_PER_ROW)),
    shown,
    overflow: count - shown,
  };
};

/* ── tooltip label builders (pure — one formatting source for every stat hover) ── */

/** "W/C 23 JUN" — week-commencing label, en-GB, uppercase, no year. */
export const wcLabel = (weekStart: Date): string =>
  `W/C ${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}`;

export const sentTooltip = (weekStart: Date, n: number): string =>
  `${wcLabel(weekStart)} · ${n} SENT`;

export const activeTooltip = (weekStart: Date, n: number): string =>
  `${wcLabel(weekStart)} · ${n} ACTIVE`;

export const agentTooltip = (name: string, status: QueryStatus | null): string =>
  `${name.toUpperCase()} · ${status ? String(status).toUpperCase() : "NO ACTIVE QUERIES"}`;

export const overflowTooltip = (n: number): string =>
  `+${n} MORE ${n === 1 ? "AGENT" : "AGENTS"}`;

export const responsesTooltip = (answered: number, total: number, pct: number): string =>
  `${answered} OF ${total} ${total === 1 ? "QUERY" : "QUERIES"} ANSWERED · ${pct}%`;

const WEEK_WORDS = [
  "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

/**
 * "WEEK NINE OF QUERYING" — ISO weeks since the user's earliest query activity (earliest
 * dateSent), spelled as a word when ≤ twelve, numeric after; `week one` when underivable.
 */
export const weekOfQuerying = (queries: Query[], now: Date): string => {
  const times = queries.map((q) => parseWhen(q.dateSent)).filter((t): t is number => t !== null);
  if (times.length === 0) return "week one";
  const earliest = isoWeekStart(new Date(Math.min(...times))).getTime();
  const diff = Math.round((isoWeekStart(now).getTime() - earliest) / WEEK_MS);
  const n = Math.max(1, diff + 1);
  return `week ${n <= 12 ? WEEK_WORDS[n - 1] : n}`;
};

/** The attention chip's text — singular at exactly 1. */
export const chipText = (n: number): string =>
  n === 1 ? "1 thing needs your attention" : `${n} things need your attention`;

/** Greeting salutation by local hour: morning < 12 ≤ afternoon < 18 ≤ evening. */
export const salutation = (now: Date): "Good morning" | "Good afternoon" | "Good evening" => {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/** "Friday 3 July" (en-GB, no ordinal suffix — v37 top bar + eyebrow format). */
export const longDate = (now: Date): string =>
  now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
