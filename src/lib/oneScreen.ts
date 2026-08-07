/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * oneScreen — the one-screen dashboard's derivation layer (ref design-refs/dashboard-one-screen.html
 * + design-refs/dashboard-one-screen-spec.md; every rule cited below by § is that spec's).
 *
 * ⚠️ EVERYTHING HERE IS DERIVED, NOTHING IS STORED. The weekly ledger, the pins, the achievement
 * pill, the goal progress — all pure functions over the collections. The two stored fields this
 * page introduces (`goalTarget`/`goalPeriod`) hold only the TARGET; progress derives (§6).
 */
import { Agent, Query, QueryStatus } from "../types";
import { isoWeekStart, responsesReceivedCount } from "./dashboardStats";

const WEEK_MS = 7 * 86400000;
const DAY_MS = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const parseWhen = (v: unknown): number | null => {
  if (typeof v !== "string" || !v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

const TERMINAL: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
]);

/** When a terminal query stopped being active — derived-field precedence, matching
 *  `activeWeeklySeries`' closedAtOf so the two lines can never disagree. */
const closedAt = (q: Query): number | null => {
  if (!TERMINAL.has(q.status)) return null;
  return parseWhen(q.lastStatusChange) ?? parseWhen(q.responseReceivedAt) ?? parseWhen(q.dateSent);
};

/* ══════════════════════════ §3 · THE LEDGER ══════════════════════════ */

export type Freq = "daily" | "weekly" | "monthly";

export interface LedgerPoint {
  /** First instant the period covers. */
  start: Date;
  /** Last instant it covers — where the closing position is read, and what a pin falls inside. */
  end: Date;
  /** "7 Aug" (daily / weekly Monday) · "Aug 26" (monthly). */
  label: string;
  /** ⚠️ A STOCK: active at the period's CLOSE. Never summed across periods. */
  active: number;
  /** ⚠️ FLOWS: summed across the period. */
  sent: number;
  closed: number;
}

/**
 * ⚠️ THE ONE DEFINITION OF "SENT", and every count of sends goes through it. A query is sent when
 * it carries a usable `dateSent` — a draft with no send date is not on the board. The header
 * counter and the chart's daily ledger both read THIS, so the number above the chart and the
 * number the line is drawn from cannot drift apart; they are the same predicate applied twice.
 */
export const sentAt = (q: Query): number | null => parseWhen(q.dateSent);
export const queriesSentCount = (queries: Query[]): number =>
  queries.reduce((n, q) => (sentAt(q) !== null ? n + 1 : n), 0);

const dayStart = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayEnd = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/**
 * ⚠️ THE DAILY ROW IS THE SOURCE OF TRUTH (§3) and every other frequency is aggregated FROM it —
 * weekly and monthly are never derived from the queries a second time. One pass over the data,
 * three views of it, so the three can never disagree about a day they all contain.
 *
 * ⚠️ IT RECONCILES BY CONSTRUCTION: active is cumulative sent minus cumulative closed read at the
 * period's close, so `active[i] − active[i−1] === sent[i] − closed[i]` is an identity at EVERY
 * frequency (the periods tile the timeline with no gaps, which is what makes the identity hold
 * through aggregation). Locked at all three.
 */
export const dailyLedger = (queries: Query[], now: Date): LedgerPoint[] => {
  const sends: number[] = [];
  const closes: number[] = [];
  for (const q of queries) {
    const s = sentAt(q); // the shared predicate — never a second reading of dateSent
    if (s === null) continue; // an unsent query is not on the board
    sends.push(s);
    const c = closedAt(q);
    if (c !== null) closes.push(Math.max(c, s)); // a close can never precede its own send
  }
  if (sends.length === 0) return [];

  const first = dayStart(new Date(Math.min(...sends)));
  const last = dayStart(now);
  const days = Math.round((last.getTime() - first.getTime()) / DAY_MS) + 1;

  const out: LedgerPoint[] = [];
  let cumSent = 0, cumClosed = 0;
  for (let i = 0; i < days; i++) {
    const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    const end = dayEnd(start);
    const from = start.getTime(), to = end.getTime();
    const sent = sends.filter((t) => t >= from && t <= to).length;
    const closed = closes.filter((t) => t >= from && t <= to).length;
    cumSent += sent; cumClosed += closed;
    out.push({ start, end, label: `${start.getDate()} ${MONTHS[start.getMonth()]}`, active: cumSent - cumClosed, sent, closed });
  }
  return out;
};

/**
 * Roll the daily rows up. ⚠️ THE TWO KINDS OF NUMBER ROLL UP DIFFERENTLY: sent and closed are
 * flows and SUM; active is a stock and takes the period's CLOSING value. Summing active would
 * report a 3-query month as 90.
 */
export const aggregateLedger = (daily: LedgerPoint[], freq: Freq): LedgerPoint[] => {
  if (freq === "daily" || daily.length === 0) return daily;
  const keyOf = (d: Date) => freq === "weekly"
    ? isoWeekStart(d).getTime()
    : new Date(d.getFullYear(), d.getMonth(), 1).getTime();

  const out: LedgerPoint[] = [];
  for (const row of daily) {
    const k = keyOf(row.start);
    const open = out[out.length - 1];
    if (open && keyOf(open.start).valueOf() === k) {
      open.sent += row.sent;
      open.closed += row.closed;
      open.active = row.active; // the closing position, rewritten as the period advances
      open.end = row.end;
      continue;
    }
    const bucketStart = new Date(k);
    out.push({
      start: bucketStart,
      end: row.end,
      label: freq === "weekly"
        ? `${bucketStart.getDate()} ${MONTHS[bucketStart.getMonth()]}`
        : `${MONTHS[bucketStart.getMonth()]} ${String(bucketStart.getFullYear()).slice(2)}`,
      active: row.active, sent: row.sent, closed: row.closed,
    });
  }
  return out;
};

/** How each frequency names one of its periods in prose. */
export const periodLabel = (freq: Freq, label: string): string =>
  freq === "weekly" ? `Week of ${label}` : label;

/**
 * ⚠️ THE RANGE IS A WINDOW OF DAYS, NOT A COUNT OF POINTS (§3) — which is precisely why range and
 * frequency are two independent controls. "Last 8 weeks" is the same 56 days of history whether
 * it is drawn as 56 daily points or 8 weekly ones; slicing N points instead would make the range
 * mean something different at each frequency.
 */
export interface RangeStop { p: number; days: number; label: string }
export const RANGE_STOPS: RangeStop[] = [
  { p: 0, days: 14, label: "Last 2 weeks" },
  { p: 14, days: 30, label: "Last month" },
  { p: 34, days: 56, label: "Last 8 weeks" },
  { p: 52, days: 91, label: "Last 3 months" },
  { p: 70, days: 182, label: "Last 6 months" },
  { p: 86, days: 365, label: "Last year" },
  { p: 100, days: 0, label: "Everything" }, // 0 = no cutoff
];
export const DEFAULT_RANGE_DAYS = 56;

/** The slider is continuous but SNAPS, so every position it can rest at means something. */
export const nearestStop = (v: number): RangeStop =>
  RANGE_STOPS.reduce((a, b) => (Math.abs(b.p - v) < Math.abs(a.p - v) ? b : a));
export const stopForDays = (days: number): RangeStop =>
  RANGE_STOPS.find((s) => s.days === days) ?? RANGE_STOPS[2];

export const rangeWindow = (rows: LedgerPoint[], days: number): LedgerPoint[] => {
  if (days <= 0 || rows.length === 0) return rows;
  const cutoff = rows[rows.length - 1].end.getTime() - days * DAY_MS;
  const win = rows.filter((r) => r.end.getTime() >= cutoff);
  return win.length >= 2 ? win : rows.slice(-2); // a line needs two points
};

/**
 * ⚠️ A NEW ACCOUNT OPENS ON DAILY. Under a month of history makes one or two weekly points, and
 * a two-point line says nothing at all — the grain has to match the record.
 */
export const DAILY_UNTIL_DAYS = 28;
export const defaultFreq = (daily: LedgerPoint[]): Freq =>
  daily.length < DAILY_UNTIL_DAYS ? "daily" : "weekly";

/** The headline chip: the range's first-to-last movement, in words at zero. */
export const rangeChip = (view: LedgerPoint[]): string => {
  if (view.length < 2) return "";
  const diff = view[view.length - 1].active - view[0].active;
  if (diff > 0) return `↑ +${diff} over this range`;
  if (diff < 0) return `↓ ${diff} over this range`;
  return "Level over this range";
};

/* ══════════════════════════ §H · THE HEADER COUNTERS ══════════════════════════ */

export interface HeaderCounter {
  key: "sent" | "agents" | "responses";
  label: string;
  n: number;
  /** ⚠️ ABSENT when there is nothing to report. Never "↑ 0", never "0%" — a chip that reports
   *  nothing is worse than no chip, because it reads as a measurement rather than a silence. */
  chip?: string;
}

/** The chips look back a ROLLING month, not a calendar one — on the 1st, a calendar reading would
 *  blank a chip that had twenty sends behind it the day before. */
export const COUNTER_WINDOW_DAYS = 30;

/**
 * The three header figures, all derived at read time (no stored counters, ever).
 *
 * ⚠️ THE RESPONSE RATE DIVIDES BY QUERIES **SENT**, not by every query on file. Dividing by all
 * queries lets an unsent draft quietly pull the rate down — a writer with drafts in the system is
 * shown a rate lower than reality. Beside a "Queries sent" counter reading the sent figure, the
 * two would visibly disagree.
 *
 * ⚠️ `dashboardStats.responseRatePercent` STILL DIVIDES BY ALL QUERIES and is therefore
 * understated wherever it is used. That is a bug in the shared selector, not a local deviation
 * here; fixing it at source and checking each caller is a tracked follow-up. Until it lands, two
 * things named "response rate" disagree — deliberately, and not indefinitely.
 */
export const headerCounters = (queries: Query[], agents: Agent[], now: Date): HeaderCounter[] => {
  const since = now.getTime() - COUNTER_WINDOW_DAYS * 86400000;

  const sent = queriesSentCount(queries);
  const sentRecently = queries.reduce((n, q) => {
    const t = sentAt(q);
    return t !== null && t >= since ? n + 1 : n;
  }, 0);

  const addedRecently = agents.reduce((n, a) => {
    const t = parseWhen(a.dateAdded);
    return t !== null && t >= since ? n + 1 : n;
  }, 0);

  const responses = responsesReceivedCount(queries);
  /* the rate is omitted outright when there is nothing to divide or nothing to report */
  const rate = sent > 0 && responses > 0 ? Math.round((responses / sent) * 100) : null;

  return [
    { key: "sent", label: "Queries sent", n: sent, ...(sentRecently > 0 ? { chip: `↑ ${sentRecently}` } : {}) },
    { key: "agents", label: "Agents on file", n: agents.length, ...(addedRecently > 0 ? { chip: `↑ ${addedRecently}` } : {}) },
    { key: "responses", label: "Responses", n: responses, ...(rate !== null ? { chip: `${rate}%` } : {}) },
  ];
};

/* ══════════════════════════ §3 · Y-SCALE ══════════════════════════ */

/**
 * ⚠️ THE MINIMUM SPAN IS THE POINT (§3): a dynamic axis that hugs the data makes a beginner's
 * two-to-three queries look like a cliff. Floor at 0, ~25% padding, and never a span under 5 —
 * do not "optimise" it away.
 */
export const MIN_SPAN = 5;
export const yScale = (values: number[]): { lo: number; hi: number } => {
  let lo = Math.min(...values), hi = Math.max(...values);
  const pad = Math.max(1, Math.round((hi - lo) * 0.25));
  lo -= pad; hi += pad;
  if (lo < 0) { hi += -lo; lo = 0; }
  if (hi - lo < MIN_SPAN) {
    const need = MIN_SPAN - (hi - lo);
    hi += Math.ceil(need / 2);
    lo = Math.max(0, lo - Math.floor(need / 2));
    if (hi - lo < MIN_SPAN) hi = lo + MIN_SPAN;
  }
  return { lo, hi };
};

/* ══════════════════════════ §3 · MONOTONE CUBIC PATH ══════════════════════════ */

/**
 * Fritsch–Carlson monotone cubic through pixel-space points.
 *
 * ⚠️ NEVER CATMULL-ROM OR BASIS SPLINES (§3): those overshoot between points and draw values that
 * never happened. This curve passes exactly through every point and stays within neighbour bounds
 * — the tangent clamp (h > 3 → rescale) is the part that guarantees it; do not remove it as a
 * simplification.
 */
export const monotonePath = (p: [number, number][]): string => {
  const n = p.length;
  if (n === 0) return "";
  if (n < 3) return p.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(p[i + 1][0] - p[i][0]); m.push((p[i + 1][1] - p[i][1]) / dx[i]); }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = Math.hypot(a, b);
    if (h > 3) { const s = 3 / h; t[i] = s * a * m[i]; t[i + 1] = s * b * m[i]; }
  }
  let d = "M" + p[0][0].toFixed(1) + " " + p[0][1].toFixed(1);
  for (let i = 0; i < n - 1; i++) {
    const c1x = p[i][0] + dx[i] / 3, c1y = p[i][1] + t[i] * dx[i] / 3;
    const c2x = p[i + 1][0] - dx[i] / 3, c2y = p[i + 1][1] - t[i + 1] * dx[i] / 3;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p[i + 1][0].toFixed(1)} ${p[i + 1][1].toFixed(1)}`;
  }
  return d;
};

/* ══════════════════════════ §3 · EVENT PINS ══════════════════════════ */

export interface ChartEvent {
  /** ⚠️ THE REAL MOMENT IT HAPPENED — not a period key. Which point carries the pin depends on
      the frequency being drawn, so binding is the VIEW's job (`bindEvents`), never the event's. */
  on: number;
  kind: "First request" | "First full" | "Offer";
  /** "<b>…</b>"-free plain text — the card renders the name bold itself. */
  who: string;
  text: string;
}

/**
 * The notable moments (§3): the first request of any kind, the first full request, and offers.
 * Derived from the queries' own derived date fields — never from parsing activity strings.
 */
export const chartEvents = (
  queries: Query[],
  agentName: (q: Query) => string,
): ChartEvent[] => {
  const out: ChartEvent[] = [];

  let firstReq: { t: number; q: Query } | null = null;
  let firstFull: { t: number; q: Query } | null = null;
  for (const q of queries) {
    const p = parseWhen(q.partialRequestedDate), f = parseWhen(q.fullRequestedDate);
    const req = p !== null && f !== null ? Math.min(p, f) : p ?? f;
    if (req !== null && (!firstReq || req < firstReq.t)) firstReq = { t: req, q };
    if (f !== null && (!firstFull || f < firstFull.t)) firstFull = { t: f, q };
  }
  /* The first full EATS the first request when they are the same moment — one pin per fact, and
     "your first full" is the stronger statement of the two. */
  if (firstReq && (!firstFull || firstReq.t < firstFull.t)) {
    const name = agentName(firstReq.q);
    out.push({ on: firstReq.t, kind: "First request", who: name, text: "asked for pages — the first anyone had." });
  }
  if (firstFull) {
    const name = agentName(firstFull.q);
    out.push({ on: firstFull.t, kind: "First full", who: name, text: "asked for the full manuscript — your first." });
  }
  for (const q of queries) {
    if (q.status !== QueryStatus.OFFER) continue;
    const t = parseWhen(q.lastStatusChange) ?? parseWhen(q.responseReceivedAt);
    if (t === null) continue;
    out.push({ on: t, kind: "Offer", who: agentName(q), text: "made an offer of representation." });
  }
  return out;
};

/**
 * Bind events to the points that CONTAIN them — one pin per point, earliest wins. Events outside
 * the window simply do not appear; they are not clamped to the edge, which would put a pin on a
 * date it did not happen.
 */
export const bindEvents = (view: LedgerPoint[], events: ChartEvent[]): Map<number, ChartEvent> => {
  const map = new Map<number, ChartEvent>();
  for (const e of [...events].sort((a, b) => a.on - b.on)) {
    const i = view.findIndex((r) => e.on >= r.start.getTime() && e.on <= r.end.getTime());
    if (i >= 0 && !map.has(i)) map.set(i, e);
  }
  return map;
};

/* ══════════════════════════ §2 · GREETING FACTS ══════════════════════════ */

/** "Querying since March 2024" — the earliest send. Null before the first query. */
export const tenureLine = (queries: Query[]): string | null => {
  const sends = queries.map((q) => parseWhen(q.dateSent)).filter((t): t is number => t !== null);
  if (!sends.length) return null;
  const d = new Date(Math.min(...sends));
  return `Querying since ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
};

/* ══════════════════════════ §7 · THE ACHIEVEMENT PILL ══════════════════════════ */

export interface Achievement {
  /** Which rule fired — the component keys tone off this. */
  key: "record" | "streak" | "milestone" | "fastest" | "awaiting";
  /** Plain-text head; `strong` is the bolded fragment. */
  pre: string;
  strong: string;
  post: string;
}

const WINDOW_MS = 14 * DAY_MS;
export const MILESTONES = [10, 20, 25, 50, 100];

const ordinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * §7, verbatim: the highest-priority TRUE fact. Facts only — never encouragement, never
 * consolation. Rules 1–4 each carry a 14-day window; rule 5 is always true. On a bad month the
 * slot simply shows a lower-priority fact; it never comments on the month.
 */
export const achievementPill = (queries: Query[], now: Date): Achievement => {
  const sends = queries
    .map((q) => parseWhen(q.dateSent))
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);

  /* 1 · Best month yet — ≥3 COMPLETED months of history, the latest completed month strictly
     beats every earlier one, that month ≥3 sent, shown for 14 days after it closes. */
  if (sends.length) {
    const monthKey = (t: number) => { const d = new Date(t); return d.getFullYear() * 12 + d.getMonth(); };
    const thisMonth = monthKey(now.getTime());
    const byMonth = new Map<number, number>();
    for (const t of sends) {
      const k = monthKey(t);
      if (k >= thisMonth) continue; // only completed months
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
    }
    if (byMonth.size >= 3) {
      const latest = Math.max(...byMonth.keys());
      const latestN = byMonth.get(latest)!;
      const beatsAll = [...byMonth.entries()].every(([k, n]) => k === latest || latestN > n);
      const monthClose = new Date(Math.floor(latest / 12), (latest % 12) + 1, 1).getTime();
      if (beatsAll && latestN >= 3 && latest === thisMonth - 1 && now.getTime() - monthClose <= WINDOW_MS) {
        return { key: "record", pre: "Best month yet — ", strong: `${latestN} sent in ${MONTHS_FULL[latest % 12]}`, post: "" };
      }
    }
  }

  /* 2 · Streak — consecutive weeks with ≥1 send, ≥4. The CURRENT week may still be pending: a
     streak is not broken until a whole week passes without a send, so counting starts at this
     week if it has a send, else last week. */
  if (sends.length) {
    const weeks = new Set(sends.map((t) => isoWeekStart(new Date(t)).getTime()));
    const thisWk = isoWeekStart(now).getTime();
    let cursor = weeks.has(thisWk) ? thisWk : thisWk - WEEK_MS;
    let streak = 0;
    while (weeks.has(cursor)) { streak++; cursor -= WEEK_MS; }
    if (streak >= 4) {
      return { key: "streak", pre: "", strong: `${streak} weeks`, post: " running with a query out" };
    }
  }

  /* 3 · Milestone — the highest round number crossed within the last 14 days. */
  for (const m of [...MILESTONES].reverse()) {
    if (sends.length >= m) {
      const at = sends[m - 1];
      if (now.getTime() - at <= WINDOW_MS) {
        const days = Math.floor((now.getTime() - at) / DAY_MS);
        const frame = days < 7 ? "this week" : "last week";
        return { key: "milestone", pre: "", strong: `${ordinal(m)} query`, post: ` sent ${frame}` };
      }
      break; // sends are sorted: lower milestones crossed even earlier
    }
  }

  /* 4 · Fastest reply yet — a NEW personal best within the last 30 days. The best must have been
     set in the window; matching an old record is not news. */
  {
    const replies = queries
      .map((q) => {
        const s = parseWhen(q.dateSent), r = parseWhen(q.responseReceivedAt);
        return s !== null && r !== null && r > s ? { days: Math.max(1, Math.round((r - s) / DAY_MS)), at: r } : null;
      })
      .filter((x): x is { days: number; at: number } => x !== null);
    if (replies.length >= 2) {
      const best = replies.reduce((a, b) => (b.days < a.days ? b : a));
      const priorBest = Math.min(...replies.filter((r) => r !== best).map((r) => r.days));
      if (best.days < priorBest && now.getTime() - best.at <= 30 * DAY_MS) {
        return { key: "fastest", pre: "Fastest reply yet — ", strong: `${best.days} days`, post: "" };
      }
    }
  }

  /* 5 · Fallback, always true. */
  const awaiting = queries.filter((q) => !TERMINAL.has(q.status) && q.dateSent &&
    (q.status === QueryStatus.QUERIED || q.status === QueryStatus.PARTIAL_SENT || q.status === QueryStatus.FULL_SENT)).length;
  return { key: "awaiting", pre: "", strong: String(awaiting), post: ` ${awaiting === 1 ? "query" : "queries"} awaiting a reply` };
};

/* ══════════════════════════ §6 · QUERYING GOALS ══════════════════════════ */

export type GoalPeriod = "quarter" | "month" | "year";

export interface GoalState {
  target: number;
  period: GoalPeriod;
  /** Sends inside the current period — derived from dateSent, never stored (§6). */
  done: number;
  sentence: string;
}

/** The current period's start, local. */
export const goalPeriodStart = (period: GoalPeriod, now: Date): Date => {
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
};

export const goalState = (
  queries: Query[],
  target: number | undefined,
  period: GoalPeriod | undefined,
  now: Date,
): GoalState | null => {
  if (!target || target < 1) return null;
  const p: GoalPeriod = period ?? "quarter";
  const from = goalPeriodStart(p, now).getTime();
  const done = queries.filter((q) => {
    const t = parseWhen(q.dateSent);
    return t !== null && t >= from && t <= now.getTime();
  }).length;
  const word = p === "quarter" ? "this quarter" : p === "month" ? "this month" : "this year";
  return { target, period: p, done, sentence: `Query ${target} agents ${word}` };
};

/** The meter is ALWAYS 25 blocks (§6) — done/target scales onto them, full blocks rounded down
 *  so the meter never claims more than has happened. */
export const GOAL_BLOCKS = 25;
export const goalBlocksFilled = (done: number, target: number): number => {
  if (target <= 0) return 0;
  return Math.min(GOAL_BLOCKS, Math.floor((done / target) * GOAL_BLOCKS));
};

/* ══════════════════════════ §9 · FIRST-RUN STATES ══════════════════════════ */

export type RunStage = "day-one" | "early-days" | "settled";

/**
 * §9: "day one" is nothing at all — no manuscript, no queries. "Early days" is the first
 * fortnight from the first send. Everything else is the settled page.
 *
 * ⚠️ EARLY DAYS SUPPRESSES THE ACHIEVEMENT PILL even though §7's fallback is always true — §9 is
 * explicit ("pills = tenure + agents only (no achievement until one is true)"), and a day-three
 * account being told "2 queries awaiting a reply" as an achievement is the kind of padding the
 * facts-only rule exists to stop. The two sections conflict; §9 is the specific one and wins.
 */
export const runStage = (queries: Query[], manuscripts: unknown[], now: Date): RunStage => {
  const sends = queries.map((q) => parseWhen(q.dateSent)).filter((t): t is number => t !== null);
  if (sends.length === 0 && manuscripts.length === 0) return "day-one";
  if (sends.length === 0) return "early-days"; // a manuscript but no sends: still before the line
  const first = Math.min(...sends);
  return now.getTime() - first <= 14 * DAY_MS ? "early-days" : "settled";
};

/** The §9 chart chip for early days — "{n} awaiting a reply" instead of range movement. */
export const awaitingChip = (queries: Query[]): string => {
  const n = queries.filter((q) => !TERMINAL.has(q.status) && q.dateSent).length;
  return `${n} awaiting a reply`;
};

/* ══════════════════════════ §12 · TOUR VISIBILITY ══════════════════════════ */

/**
 * §12: auto-run once when never completed; the chip stays for the first 7 days of membership —
 * DERIVED from the account's creation time, never stored as a flag — and is suppressed entirely
 * below the two-column breakpoint (the caller passes `wideEnough`).
 */
export const tourAutoRuns = (tourCompletedAt: string | undefined, wideEnough: boolean): boolean =>
  wideEnough && !tourCompletedAt;

export const tourChipShows = (accountCreatedAt: string | undefined, now: Date, wideEnough: boolean): boolean => {
  if (!wideEnough) return false;
  const t = parseWhen(accountCreatedAt);
  if (t === null) return false; // no creation time on record → no chip, never a guess
  return now.getTime() - t <= 7 * DAY_MS;
};
