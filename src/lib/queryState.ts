/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §1 — THE SIX STATES. Every live query is in exactly one; the state colours the list's group
 * header and the card's band.
 *
 *   offer      an open offer                                        (the agent waits on you)
 *   materials  a partial, full or revision asked for and not sent    (the agent waits on you)
 *   nudge      past the reply date, not nudged, and the agent does not treat no reply as a no (yours to nudge)
 *   agent      inside the reply time, or inside the quiet window after a nudge (you wait on the agent)
 *   quiet      the quiet window has passed with no reply             (going cold)
 *   closed     passed, no response, withdrawn, signed
 *
 * ⚠️ ONE SHARED FUNCTION (Nick, v152 recon B). The Query Centre's desktop list, Birds-eye and card read it; the old
 *    four-set rule (`whereItStands`, lib/qcSummary) and `buildQcRows`' `court` are left exactly as they were for every
 *    other reader, which the v152 report lists so they can be moved later.
 *
 * ⚠️ THE NUDGE (Nick's ruling): `lastNudgeSentDate`, falling back to `nudgeDate`. `nudgeDate` is the PLANNED nudge
 *    (`logDefaults` writes one at log time), so two guards stop a plan reading as a nudge already sent: a date still in
 *    the future is no nudge yet, and a nudge from before the latest send belongs to an earlier stage.
 *
 * ⚠️ THE EDGES are `nudgePhase`'s: the reply date itself is still inside the reply time (`<`), and the last day of the
 *    window is still inside it (`>`). An undated stage keeps the 84-day rule (CLOSE_UNDATED_DAYS).
 */
import { QueryStatus } from "../types";
import { courtOf } from "./qcSummary";
import { CLOSE_UNDATED_DAYS } from "./nudgeWindow";
import { anyToMs } from "./qcStages";

const DAY = 86_400_000;

export type QueryState = "offer" | "materials" | "nudge" | "agent" | "quiet" | "closed";
/** the list's "Who it's with" order (§1.5) */
export const STATE_ORDER: readonly QueryState[] = ["offer", "materials", "nudge", "agent", "quiet", "closed"];
export const STATE_LABEL: Record<QueryState, string> = {
  offer: "Offers", materials: "Materials requested", nudge: "Nudge due", agent: "With the agent", quiet: "Gone quiet", closed: "Closed",
};
/** the card band's mono caps (§2.2) */
export const STATE_BAND: Record<QueryState, string> = {
  offer: "OFFER", materials: "MATERIALS REQUESTED", nudge: "NUDGE DUE", agent: "WITH THE AGENT", quiet: "GONE QUIET", closed: "CLOSED",
};

/** the quiet window, in weeks (§1.4): the setting's choices and its default */
export const QUIET_WEEKS = [2, 3, 4, 6, 8] as const;
export const DEFAULT_QUIET_WEEKS = 4;
export const QUIET_WEEKS_PATH = "todoPrefs.queries.quietWeeks";
/** v153.3 — the one write that sets the window (Settings → Preferences → Queries), a single leaf */
export const quietWeeksPaths = (w: number): Record<string, number> => ({ [QUIET_WEEKS_PATH]: w });
export function quietWeeksOf(user: { todoPrefs?: unknown } | null | undefined): number {
  const v = ((user?.todoPrefs as { queries?: { quietWeeks?: unknown } } | undefined)?.queries?.quietWeeks);
  return typeof v === "number" && (QUIET_WEEKS as readonly number[]).includes(v) ? v : DEFAULT_QUIET_WEEKS;
}

export interface StateInput {
  status: QueryStatus | string;
  /** the reply date (agent's court), from the page's one clock (`expectedFor`) */
  expectedMs: number | null;
  /** the day it reached its stage */
  stageStartMs?: number | null;
  /** the latest send (query, partial or full) */
  sentMs?: number | null;
  query: { lastNudgeSentDate?: string | null; nudgeDate?: string | null; dateSent?: unknown; partialSentDate?: unknown; fullSentDate?: unknown };
  /** the agent's "no reply means no", the query's override already applied */
  nrmn: boolean;
}
export interface Ctx { quietWeeks: number; nowMs: number }

/** the latest nudge this stage, or null (see the header's two guards) */
export function nudgeMsOf(r: StateInput, nowMs: number): number | null {
  const ms = anyToMs(r.query.lastNudgeSentDate) ?? anyToMs(r.query.nudgeDate);
  if (ms == null || ms > nowMs) return null;
  const sends = [r.sentMs, anyToMs(r.query.dateSent), anyToMs(r.query.partialSentDate), anyToMs(r.query.fullSentDate)]
    .filter((t): t is number => t != null);
  const lastSend = sends.length ? Math.max(...sends) : null;
  return lastSend != null && ms < lastSend ? null : ms;
}

export function queryState(r: StateInput, c: Ctx): QueryState {
  const court = courtOf(r.status as QueryStatus);
  if (court === "closed") return "closed";
  if (court === "offer") return "offer";
  if (court === "you") return "materials";
  const win = c.quietWeeks * 7 * DAY;
  const nudge = nudgeMsOf(r, c.nowMs);
  if (nudge != null) return c.nowMs - nudge > win ? "quiet" : "agent";
  if (r.expectedMs == null) {
    const inStage = r.stageStartMs != null ? (c.nowMs - r.stageStartMs) / DAY : 0;
    return inStage > CLOSE_UNDATED_DAYS ? "quiet" : "agent";
  }
  if (!(r.expectedMs < c.nowMs)) return "agent";
  /* v152.2 (Nick, 6 Nov) — "no reply means no" counts at the Queried stage only: a partial or full the agent asked for
     is still waiting on them, whatever their silence policy for queries */
  if (r.nrmn && r.status === QueryStatus.QUERIED) return "quiet";
  return c.nowMs - r.expectedMs > win ? "quiet" : "nudge";
}

/** when a reply is expected now: after a nudge it is the nudge date plus the quiet window (§1.2) */
export function replyExpectedMs(r: StateInput, c: Ctx): number | null {
  if (courtOf(r.status as QueryStatus) !== "agent") return r.expectedMs;
  const nudge = nudgeMsOf(r, c.nowMs);
  return nudge != null ? nudge + c.quietWeeks * 7 * DAY : r.expectedMs;
}

/** a Gone quiet query's "N days quiet", counted from the reply date (§1.5) */
export function daysQuiet(r: StateInput, c: Ctx): number | null {
  const from = r.expectedMs ?? (r.stageStartMs != null ? r.stageStartMs + CLOSE_UNDATED_DAYS * DAY : null);
  return from == null ? null : Math.max(0, Math.floor((c.nowMs - from) / DAY));
}

/**
 * v152.2 §3.2 — on a Gone quiet query, does Close it lead (else Nudge)? The quiet window decides when a query is Gone
 * quiet; this decides what it asks for: a nudged query, or one 8 weeks past its reply date (an undated stage counts
 * from its own day, and is past the 84-day mark by the time it is quiet), leads with Close it.
 */
export const CLOSE_LEADS_DAYS = 56;
export function closeLeads(r: StateInput, c: Ctx): boolean {
  if (queryState(r, c) !== "quiet") return false;
  if (nudgeMsOf(r, c.nowMs) != null) return true;
  if (r.expectedMs == null) return true;
  return c.nowMs - r.expectedMs >= CLOSE_LEADS_DAYS * DAY;
}

/** the quick filters' sets (§1.5): Your move covers Offers, Materials requested and Nudge due */
export type QuickKey = "you" | "agent" | "quiet" | "closed";
export const quickOf = (s: QueryState): QuickKey =>
  s === "offer" || s === "materials" || s === "nudge" ? "you" : s;

/** header and band colours (§1.1, §1.3): blues are yours, stone theirs, stone fading to white going cold, grey done */
export const STATE_HEAD: Record<QueryState, { bg: string; fg: string }> = {
  offer: { bg: "#2a3a52", fg: "#ffffff" },
  materials: { bg: "#2a3a52", fg: "#ffffff" },
  nudge: { bg: "#c5d0dd", fg: "#1c130f" },
  agent: { bg: "#e3dbcf", fg: "#1c130f" },
  quiet: { bg: "linear-gradient(90deg, #e3dbcf 0%, #ece6dd 40%, #fff 100%)", fg: "#1c130f" },
  closed: { bg: "#f1efec", fg: "#8a8076" },
};
export const QUIET_BAND = "linear-gradient(90deg, #e3dbcf 0%, #ece6dd 18%, #fff 42%)";

/* ── the page's rows (v152 §1.6): the state rides on the row, computed once where the rows are built ─────────────── */

/** a row the v152 page has stamped; other readers' rows carry none of this and keep the old rule */
export type Stamped = { qs?: QueryState; quietDays?: number | null; replyMs?: number | null; closeLeads?: boolean; nudged?: boolean };
export type StampableRow = { status: QueryStatus | string; expectedMs: number | null; stageStartMs?: number | null; sentMs?: number | null; query: StateInput["query"] & { agentId?: string; nrmnOverride?: boolean } };

export function stampRows<T extends StampableRow>(
  rows: readonly T[], agents: readonly { id: string; noResponseMeansNo?: boolean }[], c: Ctx,
): (T & Stamped)[] {
  const nrmnOf = new Map(agents.map((a) => [a.id, !!a.noResponseMeansNo]));
  return rows.map((r) => {
    const o = r.query.nrmnOverride;
    const inp: StateInput = { ...r, nrmn: typeof o === "boolean" ? o : nrmnOf.get(r.query.agentId ?? "") ?? false };
    const qs = queryState(inp, c);
    return { ...r, qs, quietDays: qs === "quiet" ? daysQuiet(inp, c) : null, replyMs: replyExpectedMs(inp, c),
      closeLeads: qs === "quiet" && closeLeads(inp, c), nudged: nudgeMsOf(inp, c.nowMs) != null };
  });
}

/** the row's quick-filter set: the stamped state where there is one, else the caller's old rule */
export const quickOfRow = (r: object, fallback: () => QuickKey): QuickKey => { const s = (r as Stamped).qs; return s ? quickOf(s) : fallback(); };
/** the stamped state, read from a row typed only as `QcRow` */
export const stateOf = (r: object): QueryState | undefined => (r as Stamped).qs;
/** the group header's title cell for Gone quiet (§1.3) */
export const QUIET_BAND_HEAD = "linear-gradient(90deg, #e3dbcf 0%, #ece6dd 40%, #fff 100%)";
