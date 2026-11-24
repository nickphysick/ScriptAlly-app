/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §1 — THE SIX STATES. Every live query is in exactly one; the state colours the list's group
 * header and the card's band.
 *
 *   offer      an open offer                                        (the agent waits on you)
 *   materials  a partial, full or revision asked for and not sent    (the agent waits on you)
 *   nudge      past the reply date, not nudged, and the agent does not treat no reply as a no; or the writer's own
 *              reminder (`nudgeDate`) has come and no nudge is logged (yours to nudge)
 *   agent      inside the reply time, or inside the quiet window after a nudge (you wait on the agent)
 *   quiet      the quiet window has passed with no reply             (going cold)
 *   closed     passed, no response, withdrawn, signed
 *
 * ⚠️ ONE SHARED FUNCTION (Nick, v152 recon B). The Query Centre's desktop list, Birds-eye and card read it; the old
 *    four-set rule (`whereItStands`, lib/qcSummary) and `buildQcRows`' `court` are left exactly as they were for every
 *    other reader, which the v152 report lists so they can be moved later.
 *
 * ⚠️ THE NUDGE (Query card v161, Nick's ruling): only a LOGGED nudge is a nudge — `lastNudgeSentDate`. `nudgeDate` is
 *    the writer's reminder (`logDefaults` writes one at log time) and never counts as a nudge, whatever its date: a
 *    reminder that has come means "nudge due" (`remindedMs`). Two guards stay on both: a date still in the future does
 *    not count yet, and one from before the latest send belongs to an earlier stage.
 *
 * ⚠️ THE EDGES are `nudgePhase`'s: the reply date itself is still inside the reply time (`<`), and the last day of the
 *    window is still inside it (`>`). An undated stage keeps the 84-day rule (CLOSE_UNDATED_DAYS).
 */
import { QueryStatus } from "../types";
import { courtOf } from "./qcSummary";
import { CLOSE_UNDATED_DAYS } from "./nudgeWindow";
import { anyToMs } from "./qcStages";
import { nudgeSetAtMs } from "./reminderStamp";
import { queryClock, CLOCK_DEFAULTS, CLOCK_QUIET_PATH, QUIET_CHOICES } from "./queryClock";

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
/* Non-workspace v1, Phase 3: the window is the query clock's (lib/queryClock) — stored at workspacePrefs.clock, with the
   v153.3 leaf still honoured. These names stay so every reader is unchanged. */
export const QUIET_WEEKS = QUIET_CHOICES;
export const DEFAULT_QUIET_WEEKS = CLOCK_DEFAULTS.quietWeeks;
export const QUIET_WEEKS_PATH = CLOCK_QUIET_PATH;
/** The one write that sets the window (Settings → Preferences → A query's clock), a single leaf */
export const quietWeeksPaths = (w: number): Record<string, number> => ({ [QUIET_WEEKS_PATH]: w });
export function quietWeeksOf(user: { todoPrefs?: unknown; workspacePrefs?: unknown } | null | undefined): number {
  return queryClock(user).quietWeeks;
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
  /** Controls: entry v1 — the latest agent-reply entry this wait (QcRow `heardMs`): it ends Gone quiet for the window */
  heardMs?: number | null;
  /** …and its new date (QcRow `replyDateMs`): a reminder set to fall before it reads as due on it */
  replyDateMs?: number | null;
  /** …and the entry itself (QcRow `reply`): a reminder SET after it stays put (follow-up 2, lib/reminderStamp) */
  reply?: { ms: number } | null;
}
export interface Ctx { quietWeeks: number; nowMs: number }

/** a date that counts this stage: not on a day still to come, not before the latest send (the header's two guards).
 *  ⚠️ BY DAY, NOT BY INSTANT (v161): a step is stored at noon of its day (lib/qc152Write stepTime), so a nudge logged
 *  "today" before noon was an instant in the future and did not count until midday. */
function thisStage(r: StateInput, ms: number | null, nowMs: number): number | null {
  const sod = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  if (ms == null || sod(ms) > sod(nowMs)) return null;
  const sends = [r.sentMs, anyToMs(r.query.dateSent), anyToMs(r.query.partialSentDate), anyToMs(r.query.fullSentDate)]
    .filter((t): t is number => t != null);
  const lastSend = sends.length ? Math.max(...sends) : null;
  return lastSend != null && ms < lastSend ? null : ms;
}
/** the latest LOGGED nudge this stage, or null. A reminder (`nudgeDate`) is never a nudge (v161). */
export function nudgeMsOf(r: StateInput, nowMs: number): number | null {
  return thisStage(r, anyToMs(r.query.lastNudgeSentDate), nowMs);
}
/** Controls: entry v1 — the writer's reminder read through the agent's latest reply entry: one that falls before the new
 *  reply date the agent gave reads as due on that date (Nick's ruling 2; lib/agentReply `replyReminderMs`) */
export function reminderOf(r: Pick<StateInput, "query" | "replyDateMs" | "reply">): number | null {
  /* a day ("YYYY-MM-DD") is that LOCAL day at noon, never UTC midnight (the evening before, west of Greenwich) */
  const raw = r.query.nudgeDate;
  const t = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`).getTime() : anyToMs(raw);
  if (t == null) return null;
  /* follow-up 2 — set after the entry: where the writer put it. No stamp counts as set before. */
  const setAt = nudgeSetAtMs(r.query);
  if (setAt != null && r.reply && setAt > r.reply.ms) return t;
  return r.replyDateMs != null && t < r.replyDateMs ? r.replyDateMs : t;
}
/** the writer's own reminder, when its day has come this stage and no nudge is logged: the query is nudge due (v161) */
export function remindedMs(r: StateInput, nowMs: number): number | null {
  if (nudgeMsOf(r, nowMs) != null) return null;
  return thisStage(r, reminderOf(r), nowMs);
}

export function queryState(r: StateInput, c: Ctx): QueryState {
  const base = clockState(r, c);
  if (base !== "quiet" || r.heardMs == null) return base;
  /* Controls: entry v1 — A REPLY ENTRY ENDS GONE QUIET. The agent has written (a chaser, a holding reply, a note), so
     the silence the state names is over until a full quiet window passes from it again. With no new date it moves
     nothing else: past the reply date it is still nudge due. */
  if (c.nowMs - r.heardMs > heardWindow(r, c)) return base;
  const nudge = nudgeMsOf(r, c.nowMs);
  if (nudge != null && r.heardMs >= nudge) return "agent";
  return r.expectedMs != null && r.expectedMs < c.nowMs ? "nudge" : "agent";
}
/** how long a reply entry holds Gone quiet off: the quiet window, or the undated stage's own mark */
function heardWindow(r: StateInput, c: Ctx): number {
  return r.expectedMs == null && nudgeMsOf(r, c.nowMs) == null ? CLOSE_UNDATED_DAYS * DAY : c.quietWeeks * 7 * DAY;
}
function clockState(r: StateInput, c: Ctx): QueryState {
  const court = courtOf(r.status as QueryStatus);
  if (court === "closed") return "closed";
  if (court === "offer") return "offer";
  if (court === "you") return "materials";
  const win = c.quietWeeks * 7 * DAY;
  const nudge = nudgeMsOf(r, c.nowMs);
  if (nudge != null) return c.nowMs - nudge > win ? "quiet" : "agent";
  /* v161 — the writer's reminder has come and nothing is logged: nudge due while the reply date is still ahead */
  const reminded = remindedMs(r, c.nowMs) != null;
  if (r.expectedMs == null) {
    const inStage = r.stageStartMs != null ? (c.nowMs - r.stageStartMs) / DAY : 0;
    return inStage > CLOSE_UNDATED_DAYS ? "quiet" : reminded ? "nudge" : "agent";
  }
  if (!(r.expectedMs < c.nowMs)) return reminded ? "nudge" : "agent";
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
  const from0 = r.expectedMs ?? (r.stageStartMs != null ? r.stageStartMs + CLOSE_UNDATED_DAYS * DAY : null);
  /* Controls: entry v1 — after a reply entry, quiet counts from when its window ran out */
  const from = r.heardMs != null && from0 != null ? Math.max(from0, r.heardMs + heardWindow(r, c)) : from0;
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
