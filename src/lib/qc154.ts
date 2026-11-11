/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v154 (design-refs/query-centre-v154.html) — the card's Next box, by state. Every figure is one the
 * slip already had: the reply date is `expectedMs` (or `replyMs` once a nudge has reset the window), the bar is the
 * share of that window gone, and the planned nudge is `Query.nudgeDate` (written by the log and nudge journeys).
 * Nothing here invents a reminder: with no `nudgeDate` still to come, the line is simply absent.
 */
import type { QcRow } from "./qcSummary";
import { anyToMs } from "./qcStages";
import { shortDate } from "./qc151";
import { nextFact } from "./qc153";
import { stateOf } from "./queryState";

const sod = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ── the Next box ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type NextBox154 =
  /** with the agent, inside the reply window: the date, the share of the window gone, and the planned nudge if any */
  | { kind: "wait"; due: string; bar: number; nudgeOn: string | null }
  /** past the reply date (Nudge due): words only, the nudge is the hover's */
  | { kind: "over" }
  /** every other state: the slip's own Next copy */
  | { kind: "other"; value: string; line: string | null; hot: boolean };

export const NEXT_WAIT_LABEL = "Reply expected by";
export const OVERDUE_VALUE = "Response overdue";
export const OVERDUE_LINE = "Send nudge now";
export const nudgeOnLine = (date: string): string => `Nudge on ${date}`;

export function nextBox154(r: QcRow, nowMs: number): NextBox154 {
  const st = stateOf(r);
  const live = r.court === "agent";
  if (live && (st === "nudge" || (st == null && r.pastExpected))) return { kind: "over" };
  const due = st === "agent" ? (r as { replyMs?: number | null }).replyMs ?? r.expectedMs : r.expectedMs;
  const waiting = live && (st === "agent" || (st == null && !r.pastExpected));
  if (waiting && due != null && sod(due) >= sod(nowMs)) {
    const from = r.stageStartMs ?? r.sentMs;
    const bar = from != null && due > from ? Math.min(1, Math.max(0, (nowMs - from) / (due - from))) : 0;
    /* the planned nudge (`Query.nudgeDate`), shown only while it is still to come: never "now", never a pass */
    const n = anyToMs((r.query as { nudgeDate?: unknown } | undefined)?.nudgeDate);
    const nudgeOn = n != null && sod(n) >= sod(nowMs) ? shortDate(n, nowMs) : null;
    return { kind: "wait", due: shortDate(due, nowMs), bar, nudgeOn };
  }
  const f = nextFact(r, nowMs);
  return { kind: "other", value: f.value, line: f.line, hot: f.hot };
}
