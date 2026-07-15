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
    // Undated import — the pill still reads "waiting" but there is no bar/date.
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
