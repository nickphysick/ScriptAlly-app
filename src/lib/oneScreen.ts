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
import { Query, QueryStatus } from "../types";
import { isoWeekStart } from "./dashboardStats";

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

/* ══════════════════════════ §3 · THE WEEKLY LEDGER ══════════════════════════ */

export interface LedgerWeek {
  /** Monday of the ISO week, local midnight. */
  start: Date;
  /** "3 Aug" */
  label: string;
  /** Active at the END of the week (the last week samples at `now`). */
  active: number;
  sent: number;
  closed: number;
}

/**
 * The full weekly history, first-send week → current week.
 *
 * ⚠️ IT RECONCILES BY CONSTRUCTION (§3): active is cumulative sent minus cumulative closed
 * sampled at week end, so `active[i] − active[i−1] === sent[i] − closed[i]` is an identity, not a
 * hope. The chart's deltas and the Net column are the same numbers read twice.
 */
export const weeklyLedger = (queries: Query[], now: Date): LedgerWeek[] => {
  const sends: number[] = [];
  const closes: number[] = [];
  for (const q of queries) {
    const s = parseWhen(q.dateSent);
    if (s === null) continue; // an unsent query is not on the board
    sends.push(s);
    const c = closedAt(q);
    if (c !== null) closes.push(Math.max(c, s)); // a close can never precede its own send
  }
  if (sends.length === 0) return [];

  const first = isoWeekStart(new Date(Math.min(...sends)));
  const current = isoWeekStart(now);
  const bins = Math.round((current.getTime() - first.getTime()) / WEEK_MS) + 1;

  const out: LedgerWeek[] = [];
  let cumSent = 0, cumClosed = 0;
  for (let i = 0; i < bins; i++) {
    const start = new Date(first.getTime() + i * WEEK_MS);
    const end = i === bins - 1 ? now.getTime() : start.getTime() + WEEK_MS - 1;
    const from = start.getTime();
    const sent = sends.filter((t) => t >= from && t <= end).length;
    const closed = closes.filter((t) => t >= from && t <= end).length;
    cumSent += sent; cumClosed += closed;
    out.push({
      start,
      label: `${start.getDate()} ${MONTHS[start.getMonth()]}`,
      active: cumSent - cumClosed,
      sent,
      closed,
    });
  }
  return out;
};

/** The view for a range: 8 weeks, 26 weeks (6 months), or everything. */
export type LedgerRange = "8" | "26" | "all";
export const ledgerView = (ledger: LedgerWeek[], range: LedgerRange): LedgerWeek[] =>
  range === "all" ? ledger : ledger.slice(-parseInt(range, 10));

/** The headline chip: the range's first-to-last movement, in words at zero. */
export const rangeChip = (view: LedgerWeek[]): string => {
  if (view.length < 2) return "";
  const diff = view[view.length - 1].active - view[0].active;
  if (diff > 0) return `↑ +${diff} over this range`;
  if (diff < 0) return `↓ ${diff} over this range`;
  return "Level over this range";
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
  /** Key into the ledger by week-start time. */
  weekStart: number;
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
  const wk = (t: number) => isoWeekStart(new Date(t)).getTime();

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
    out.push({ weekStart: wk(firstReq.t), kind: "First request", who: name, text: "asked for pages — the first anyone had." });
  }
  if (firstFull) {
    const name = agentName(firstFull.q);
    out.push({ weekStart: wk(firstFull.t), kind: "First full", who: name, text: "asked for the full manuscript — your first." });
  }
  for (const q of queries) {
    if (q.status !== QueryStatus.OFFER) continue;
    const t = parseWhen(q.lastStatusChange) ?? parseWhen(q.responseReceivedAt);
    if (t === null) continue;
    out.push({ weekStart: wk(t), kind: "Offer", who: agentName(q), text: "made an offer of representation." });
  }
  return out;
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
