/**
 * queryAmbient — the ONE derivation of a query's open-state numbers (days waiting, expected
 * reply, days since the agent's request). Both the reading-pane Tracking block and the command
 * bar consume this, so the two can never disagree (ref queries-workspace-v2.html: the bar's
 * ambient status reads the same state the CTA engine reads — computed once, here).
 *
 * Whose turn it is (ballHolder + markKind) still comes from getPrimaryAction (the CTA engine,
 * Queries.tsx) and is PASSED IN — this module never re-derives it. Pure + unit-tested.
 */

import { Query, QueryStatus } from "../types";

/**
 * Filter-bar STATUS bucket — the derived state the CTA engine (getPrimaryAction, Queries.tsx)
 * distinguishes, as a pure status→bucket map: Waiting = agent's court, Your move = writer owes
 * materials, Closed = terminal. Kept in step with getPrimaryAction's ball-holder switch.
 */
export type QueryBucket = "waiting" | "move" | "closed";
export function queryBucket(status: QueryStatus): QueryBucket {
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.REVISE_RESUBMIT:
      return "move";
    case QueryStatus.QUERIED:
    case QueryStatus.PARTIAL_SENT:
    case QueryStatus.FULL_SENT:
      return "waiting";
    default:
      return "closed";
  }
}

/**
 * Masthead pulse line — `Tracking {scope} · {n} queries · {m} awaiting your move`. `m` reuses
 * the CTA engine's writer's-turn bucket (`queryBucket === "move"`), never a fresh count, so the
 * masthead and the filter bar's "Your move" pill can't disagree. Pure; the slab uppercases it.
 */
export function queriesPulse(queries: Pick<Query, "status">[], scope: string): string {
  const n = queries.length;
  const m = queries.filter((q) => queryBucket(q.status as QueryStatus) === "move").length;
  return `Tracking ${scope} · ${n} ${n === 1 ? "query" : "queries"} · ${m} awaiting your move`;
}

export const DAY = 86400000;
/** Stage response windows in WEEKS (not per-agent) — expected reply = send date + window. */
export const STAGE_RESPONSE_WINDOWS = { query: 8, partial: 12, full: 12 } as const;
type SendStage = keyof typeof STAGE_RESPONSE_WINDOWS;

export type BallHolder = "writer" | "agent" | null;
export type MarkKind = "partial" | "full" | "resubmit" | undefined;

const getTime = (val: any): number => {
  if (val == null) return NaN;
  if (typeof val === "object" && typeof val.toDate === "function") return val.toDate().getTime();
  if (typeof val === "object" && "seconds" in val) return val.seconds * 1000;
  return new Date(val).getTime();
};

const fmtShort = (ms: number | null): string => {
  if (ms == null || Number.isNaN(ms)) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export interface AmbientStatus {
  mode: "waiting" | "writer" | "closed";
  /** Waiting: days since the relevant send. */
  nDays: number;
  sentMs: number | null;
  expMs: number | null;
  /** 0–100 progress toward the expected-reply date. */
  widthPct: number;
  overdue: boolean;
  /** Days elapsed BEYOND the expected-reply date (0 within window). Derived; no stored field. */
  daysOverdue: number;
  /** Writer: what's owed ("partial" | "full" | "resubmission"). */
  sendWhat: "partial" | "full" | "resubmission";
  /** Writer: the agent's request in words ("partial requested" etc.). */
  eventLabel: string;
  /** Writer: days since that request (null when undated). */
  writerDaysAgo: number | null;
}

/** Derive the open-state numbers for a query, given the CTA engine's ball-holder + markKind. */
export function queryAmbientStatus(
  query: Query,
  ballHolder: BallHolder,
  markKind: MarkKind,
  now: number = Date.now(),
): AmbientStatus {
  const base: AmbientStatus = {
    mode: "closed", nDays: 0, sentMs: null, expMs: null, widthPct: 0, overdue: false, daysOverdue: 0,
    sendWhat: "resubmission", eventLabel: "", writerDaysAgo: null,
  };

  if (ballHolder === "agent") {
    const st = query.status as QueryStatus;
    const stage: SendStage = st === QueryStatus.QUERIED ? "query" : st === QueryStatus.PARTIAL_SENT ? "partial" : "full";
    const sendIso = st === QueryStatus.QUERIED ? query.dateSent : st === QueryStatus.PARTIAL_SENT ? query.partialSentDate : query.fullSentDate;
    const mDays = STAGE_RESPONSE_WINDOWS[stage] * 7;
    const sentMs = sendIso ? getTime(sendIso) : NaN;
    if (!Number.isNaN(sentMs)) {
      const nDays = Math.max(0, Math.floor((now - sentMs) / DAY));
      return { ...base, mode: "waiting", nDays, sentMs, expMs: sentMs + mDays * DAY, widthPct: Math.max(0, Math.min(1, nDays / mDays)) * 100, overdue: nDays > mDays, daysOverdue: Math.max(0, nDays - mDays) };
    }
    // P4 — no stage send date to derive from: fall back to the stored responseDeadline OVERRIDE (a
    // legitimate user input — "Set an expected date"). Drives the readout's overdue/expected; without
    // a send anchor there is still no progress bar (sentMs null).
    const overrideMs = query.responseDeadline ? getTime(query.responseDeadline) : NaN;
    if (!Number.isNaN(overrideMs)) {
      return { ...base, mode: "waiting", sentMs: null, expMs: overrideMs, overdue: now > overrideMs, daysOverdue: Math.max(0, Math.floor((now - overrideMs) / DAY)) };
    }
    // Undated import, no override — the pill reads "waiting" but there is no bar/date.
    return { ...base, mode: "waiting", sentMs: null, expMs: null };
  }

  if (ballHolder === "writer") {
    const sendWhat = markKind === "partial" ? "partial" : markKind === "full" ? "full" : "resubmission";
    const st = query.status as QueryStatus;
    const eventLabel = st === QueryStatus.PARTIAL_REQUESTED ? "partial requested"
      : st === QueryStatus.FULL_REQUESTED ? "full requested"
      : "revise & resubmit";
    const reqIso = st === QueryStatus.PARTIAL_REQUESTED ? query.partialRequestedDate
      : st === QueryStatus.FULL_REQUESTED ? query.fullRequestedDate
      : (query.lastStatusChange ?? query.dateSent);
    const reqMs = reqIso ? getTime(reqIso) : NaN;
    const writerDaysAgo = Number.isNaN(reqMs) ? null : Math.max(0, Math.floor((now - reqMs) / DAY));
    return { ...base, mode: "writer", sendWhat, eventLabel, writerDaysAgo };
  }

  return base;
}

// ── Escalation state machine (grace/overdue) — derived, never stored (no isGrace/isCalm flag). ──

export type Escalation = "within" | "overdue" | "grace";

export interface EscalationInput {
  /** Query.nudgeDate — the follow-up reminder (check-back) date the last nudge set. */
  reminderMs: number | null;
  /** Query.lastNudgeSentDate — when the last nudge actually fired. */
  lastNudgeMs: number | null;
  now: number;
}

/**
 * The Tracking readout's escalation for an agent-waiting query:
 *  - within  — inside the response window (calm; unchanged).
 *  - overdue — past expected-by AND (never nudged since it lapsed, OR the latest nudge's reminder
 *              has itself lapsed). The loud treatment.
 *  - grace   — past expected-by, a nudge fired SINCE it lapsed, and that nudge's follow-up reminder
 *              is still in the FUTURE — a horizon to wait on, so the escalation stands down (warm).
 *
 * A nudge with no future reminder grants no grace (nothing to wait on). All live-derived from
 * expected-by, now, the latest nudge + its reminder — no stored flag; a nudge never moves this via
 * status/response (it doesn't touch the overdue clock, which reads dateSent + window).
 */
export function deriveEscalation(a: AmbientStatus, input: EscalationInput): Escalation {
  if (a.mode !== "waiting" || !a.overdue) return "within";
  const { reminderMs, lastNudgeMs, now } = input;
  const nudgedSinceExpected = lastNudgeMs != null && a.expMs != null && lastNudgeMs >= a.expMs;
  const reminderFuture = reminderMs != null && reminderMs > now;
  return nudgedSinceExpected && reminderFuture ? "grace" : "overdue";
}

export interface TrackingBar {
  /** Elapsed-position fill, 0–100. */
  fillPct: number;
  /** Expected-by marker position, or null when the bar END is the expected date (within-window). */
  markerPct: number | null;
  /** Whether a hatch/overdue zone renders beyond the marker (overdue only). */
  overdueZone: boolean;
  /** Grace only: a faded tick where the ORIGINAL expected lapsed (bar end = the reminder horizon). */
  graceTickPct: number | null;
}

/**
 * Derived bar geometry — no magic percentages. within: 0→expected, fill = elapsed/window, no marker.
 * overdue: 0→now, expected marker at window/(window+daysPast), hatch beyond. grace: 0→reminder
 * (the new horizon), faded tick where expected lapsed. Undated → an empty (hidden) bar.
 */
export function trackingBar(state: Escalation, a: AmbientStatus, reminderMs: number | null, now: number): TrackingBar {
  const empty: TrackingBar = { fillPct: 0, markerPct: null, overdueZone: false, graceTickPct: null };
  if (a.sentMs == null || a.expMs == null) return empty;
  const windowMs = a.expMs - a.sentMs;
  if (windowMs <= 0) return empty;
  const pct = (n: number) => Math.max(0, Math.min(100, n * 100));

  if (state === "grace" && reminderMs != null && reminderMs > a.sentMs) {
    const span = reminderMs - a.sentMs;
    return {
      fillPct: pct((now - a.sentMs) / span),
      markerPct: null,
      overdueZone: false,
      graceTickPct: pct(windowMs / span), // original expected, faded
    };
  }
  if (state === "overdue") {
    const span = Math.max(now - a.sentMs, windowMs); // sent→now
    return { fillPct: 100, markerPct: pct(windowMs / span), overdueZone: true, graceTickPct: null };
  }
  // within — the bar IS the window; the end is the expected date, so no mid-bar marker.
  return { fillPct: pct((now - a.sentMs) / windowMs), markerPct: null, overdueZone: false, graceTickPct: null };
}

/** Count the nudge activities in the per-query log (drives the re-escalation "nudged N×" copy). */
export function nudgeCount(events: { type?: unknown }[] | null | undefined, nudgeType: string): number {
  return (events || []).filter((e) => e.type === nudgeType).length;
}

// ── Suggested fork action (the single pulsing chip) — derived, never stored. ─────────────────────

/**
 * "Hugely overdue" threshold, in ONE clearly-named place so it's tunable without hunting: overdue by
 * more than HUGELY_OVERDUE_WINDOW_MULT× the agent's stated response window, floored at
 * HUGELY_OVERDUE_FLOOR_WEEKS so a tiny or unstated window doesn't flip a query to "close" prematurely.
 */
export const HUGELY_OVERDUE_WINDOW_MULT = 3;
export const HUGELY_OVERDUE_FLOOR_WEEKS = 12;

/**
 * True when a waiting query is "hugely" overdue — more than max(mult × window, floor) weeks BEYOND its
 * expected reply. `agentWindowWeeks` is the per-agent `responseTimeWeeks` (readable per query); when
 * absent or tiny the floor guards, so agents with no stated window fall back to the 12-week floor.
 */
export function isHugelyOverdue(daysOverdue: number, agentWindowWeeks: number | null | undefined): boolean {
  const weeks = agentWindowWeeks && agentWindowWeeks > 0
    ? Math.max(HUGELY_OVERDUE_WINDOW_MULT * agentWindowWeeks, HUGELY_OVERDUE_FLOOR_WEEKS)
    : HUGELY_OVERDUE_FLOOR_WEEKS;
  return daysOverdue > weeks * 7;
}

export type SuggestedAction = "nudge" | "close" | null;

/**
 * The ONE fork chip that pulses, chosen by rule (nothing stored):
 *  - overdue, not hugely overdue → "nudge" (chase it).
 *  - overdue AND hugely overdue → "close" (time to let go).
 *  - grace (nudged, reminder ahead) → null (you're waiting on the agent).
 *  - within window → null.
 */
export function suggestedAction(escal: Escalation, daysOverdue: number, agentWindowWeeks: number | null | undefined): SuggestedAction {
  if (escal !== "overdue") return null;
  return isHugelyOverdue(daysOverdue, agentWindowWeeks) ? "close" : "nudge";
}

/**
 * TWS P4 — the ONE elapsed-time label, applied to every elapsed value on the Tracking pane (overdue
 * badge, "waiting {n}", "asked {n} ago"): ≤28 days → "{n} days"; beyond → "{round(n/7)} weeks".
 * (Large values yield large week counts — acceptable per spec; a months tier is a future option.)
 */
export function elapsedLabel(days: number): string {
  const n = Math.max(0, Math.round(days));
  if (n <= 28) return `${n} ${n === 1 ? "day" : "days"}`;
  const w = Math.round(n / 7);
  return `${w} ${w === 1 ? "week" : "weeks"}`;
}

/** Command-bar centre text — mono uppercase; `bold` is the burgundy fragment (writer's move). */
export function commandBarStatus(a: AmbientStatus): { bold?: string; text: string } | null {
  if (a.mode === "waiting") {
    if (a.sentMs == null) return { text: "Waiting to hear back" };
    const parts = [`Waiting to hear back · ${a.nDays} ${a.nDays === 1 ? "day" : "days"}`];
    if (a.expMs != null) parts.push(`expected ~${fmtShort(a.expMs)}`);
    return { text: parts.join(" · ") };
  }
  if (a.mode === "writer") {
    const tail = a.writerDaysAgo == null
      ? a.eventLabel
      : `${a.eventLabel} ${a.writerDaysAgo} ${a.writerDaysAgo === 1 ? "day" : "days"} ago`;
    return { bold: "Your move", text: `· ${tail}` };
  }
  return null; // closed / Offer — no ambient status
}
