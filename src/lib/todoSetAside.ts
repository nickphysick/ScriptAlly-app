/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.1 §I — WHAT THE SET-ASIDE POPOVER MAY OFFER FOR ONE TASK, from the task's own facts. Pure, so the rules
 * that stop something important being lost are unit-locked rather than remembered:
 *   · a date already gone (a send-by, an offer's answer-by) cannot be snoozed past — the snooze would hide it;
 *   · a date ahead caps every snooze at it (`clampSnooze` sees every path, so no write can exceed it);
 *   · an offer waits a day at most and can never be dismissed — it needs an answer;
 *   · material an agent asked for cannot be dismissed — it stays until it is sent or the query ends;
 *   · a task put off twice says so, and never blocks the third snooze.
 *
 * ⚠️ EXCLUSIVES HAVE NO PRODUCER. The pack names an exclusive's end as a deadline; no stored field records one
 *    (`exclusive_expiring` is a declared type nothing raises — lib/todoJourneys.ts), so no cap is built for it.
 */
import type { Activity, Query } from "../types";
import { QueryStatus } from "../types";
import { snoozeCeilingDays } from "./todoActions";
import type { BoardCard } from "./todoBoard";

const DAY = 86400000;
const ymdOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const noonOf = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const toYmd = (v: unknown): string | null => {
  if (!v) return null;
  const ms = typeof v === "string" ? Date.parse(v) : typeof v === "number" ? v
    : typeof (v as { toMillis?: () => number }).toMillis === "function" ? (v as { toMillis: () => number }).toMillis()
    : typeof (v as { seconds?: number }).seconds === "number" ? (v as { seconds: number }).seconds * 1000 : NaN;
  return Number.isFinite(ms) ? ymdOf(new Date(ms)) : null;
};
/** whole local days from one day to another */
export const daysBetween = (fromYmd: string, toYmdS: string): number => Math.round((noonOf(toYmdS).getTime() - noonOf(fromYmd).getTime()) / DAY);

/** the four snooze presets, resolved from today: Tomorrow · Monday (a week, on a Monday) · In a week · In a month */
export interface Preset { k: "tom" | "mon" | "week" | "month"; label: string; days: number; ymd: string }
export function presets(todayYmd: string): Preset[] {
  const t = noonOf(todayYmd);
  const toMon = ((8 - t.getDay()) % 7) || 7;
  const month = new Date(t.getFullYear(), t.getMonth() + 1, t.getDate(), 12);
  /* "the same date next month" — where that day does not exist (31 Jan → Feb), the month's last day */
  if (month.getDate() !== t.getDate()) month.setDate(0);
  const at = (n: number) => ymdOf(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n, 12));
  const monthDays = daysBetween(todayYmd, ymdOf(month));
  return [
    { k: "tom", label: "Tomorrow", days: 1, ymd: at(1) },
    { k: "mon", label: "Monday", days: toMon, ymd: at(toMon) },
    { k: "week", label: "In a week", days: 7, ymd: at(7) },
    { k: "month", label: "In a month", days: monthDays, ymd: ymdOf(month) },
  ];
}

const SEND_TYPES = new Set(["partial_requested", "full_requested", "revise_resubmit", "offer_send_full"]);

export interface SetAsideRules {
  /** the furthest a snooze may go, in days (0: it cannot be snoozed at all) */
  ceiling: number;
  /** the deadline behind the ceiling, where there is one */
  deadline: { ymd: string; what: "send-by date" | "answer-by date"; passed: boolean } | null;
  /** an offer (one day at most; never dismissed) */
  offer: boolean;
  /** why there is no "Dismiss this task" — an offer needs an answer; asked-for material stays until sent */
  noDismiss: "offer" | "material" | null;
  /** a "worth a nudge" task: the popover offers to plan the nudge instead */
  nudge: boolean;
  /** how many times it has been put off (≥ 2 says so) */
  putOff: number;
}

/** the rules for one card, from its query and its flag's count */
export function setAsideRules(card: BoardCard, q: Query | undefined, snoozeCount: number, todayYmd: string): SetAsideRules {
  const t = card.taskType ?? "";
  const offer = t === "offer_received";
  let deadline: SetAsideRules["deadline"] = null;
  const dl = offer ? toYmd(q?.offerResponseDeadline) : SEND_TYPES.has(t) ? toYmd(q?.expectedSendDate) : null;
  if (dl) deadline = { ymd: dl, what: offer ? "answer-by date" : "send-by date", passed: dl < todayYmd };
  const days = deadline ? daysBetween(todayYmd, deadline.ymd) : undefined;
  const ceiling = deadline?.passed ? 0 : snoozeCeilingDays({ taskType: t } as BoardCard, days);
  return {
    ceiling, deadline, offer,
    noDismiss: offer ? "offer" : SEND_TYPES.has(t) ? "material" : null,
    nudge: t === "nudge_overdue",
    putOff: snoozeCount,
  };
}

/** a query's stage noun, for the passed send-by line */
export const askedFor = (status: string | undefined): string =>
  status === QueryStatus.PARTIAL_REQUESTED ? "partial" : status === QueryStatus.FULL_REQUESTED ? "full" : status === QueryStatus.REVISE_RESUBMIT ? "revision" : "material";

/* ── what brought a dismissed task back (§I.2), as a fact ── */
const REPLIES = new Set<string>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED]);
const WRITER: Record<string, string> = {
  nudge_sent: "a nudge", partial_sent: "a partial sent", full_sent: "your full sent", resubmitted: "a resubmission",
  closed_no_reply: "a close", withdrawn: "a withdrawal",
};
/** "Back · Sophie replied on 14 Oct." / "Back · You logged a nudge on 14 Oct." */
export function backFact(act: Pick<Activity, "resultingStatus" | "eventKey" | "date">, first: string, dayMonth: (iso: string) => string): string {
  const on = dayMonth(act.date);
  const k = act.eventKey ? WRITER[act.eventKey] : undefined;
  if (k) return `Back · You logged ${k} on ${on}.`;
  if (act.resultingStatus && REPLIES.has(act.resultingStatus)) return `Back · ${first || "The agent"} replied on ${on}.`;
  return `Back · Something new was logged on ${first ? `${first}’s` : "the"} query on ${on}.`;
}
