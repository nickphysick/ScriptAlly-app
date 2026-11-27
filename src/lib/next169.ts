/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172 — the list row's Next box says what to DO, in the app's own action words (lib/qc1512 `rowAct`),
 * with the fact behind it underneath. ("Wait for a reply" and "Add a reply date" went in as proposed, not ruled.)
 *
 *   Offer                        Answer the offer        offered 96 days ago
 *   Partial / full asked for     Send your partial/full  asked 99 days ago   (or "send by 4 Dec" / "4 days past your send-by date")
 *   Revise & resubmit            Send your revision      asked 141 days ago
 *   With the agent, in time      Wait for a reply        reply due 12 Dec (+ the window bar, and any nudge you've planned)
 *   With the agent, no date      Add a reply date        so we know when to nudge
 *   Your nudge reminder is due   Nudge                   your reminder, 26 Nov
 *   Past the reply date          Nudge                   reply was due 4 Oct, 7 wks ago
 *   Nudged, waiting again        Wait for a reply        nudged 2 Nov, reply due 30 Nov
 *   Gone quiet, not nudged       Nudge                   quiet for 3 wks
 *   Gone quiet, nudged or 8+ wks Consider closing        nudged 9 Oct, still nothing  /  no reply in 12 wks
 *   Closed                       Closed                  (the stage it closed at)
 */
import { QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { rowAct } from "./qc1512";
import { isClosedRow, shortDate } from "./qc151";
import { nudgeMsOf, reminderOf, stateOf } from "./queryState";

const DAY = 86_400_000;
const sod = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const days = (a: number, b: number) => Math.round((sod(b) - sod(a)) / DAY);
const span = (n: number) => (n >= 14 ? `${Math.round(n / 7)} wks` : `${n} ${n === 1 ? "day" : "days"}`);
const ago = (ms: number | null | undefined, now: number) => {
  if (ms == null) return null; const n = days(ms, now); return n <= 0 ? "today" : `${span(n)} ago`;
};

export interface Next169 { value: string; line: string | null; hot: boolean; bar: number | null }

export function next169(r: QcRow, nowMs: number): Next169 {
  const x = r as QcRow & { replyMs?: number | null; quietDays?: number | null; closeLeads?: boolean };
  if (isClosedRow(r) || r.court === "closed") return { value: "Closed", line: null, hot: false, bar: null };
  const act = rowAct(r, nowMs);
  const st = stateOf(r);
  const asked = ago(r.stageStartMs, nowMs);
  if (r.court === "offer" || r.status === QueryStatus.OFFER) return { value: "Answer the offer", line: asked ? `offered ${asked}` : null, hot: true, bar: null };
  if (r.court === "you" || r.withYou) {
    const by = r.expectedMs;
    const line = by != null ? (sod(by) < sod(nowMs) ? `${span(days(by, nowMs))} past your send-by date` : `send by ${shortDate(by, nowMs)}`) : asked ? `asked ${asked}` : null;
    return { value: act?.label ?? "Send it", line, hot: true, bar: null };
  }
  /* with the agent */
  const nudged = nudgeMsOf(r as never, nowMs);
  const due = st ? x.replyMs ?? r.expectedMs : r.expectedMs;
  if (st === "quiet") {
    const q = x.quietDays ?? 0;
    return x.closeLeads === false
      ? { value: "Nudge", line: q > 0 ? `quiet for ${span(q)}` : "quiet from today", hot: true, bar: null }
      : { value: "Consider closing", line: nudged != null ? `nudged ${shortDate(nudged, nowMs)}, still nothing` : `no reply in ${span(q || 56)}`, hot: true, bar: null };
  }
  /* nudge due before the reply date: the writer's own reminder has come round */
  if (act?.mode === "nudge" && (due == null || sod(due) >= sod(nowMs))) {
    const rem = reminderOf(r as never);
    return { value: "Nudge", line: rem != null ? `your reminder, ${shortDate(rem, nowMs)}` : "time for a nudge", hot: true, bar: null };
  }
  if (due == null) return { value: "Add a reply date", line: "so we know when to nudge", hot: false, bar: null };
  if (sod(due) < sod(nowMs)) return { value: "Nudge", line: `reply was due ${shortDate(due, nowMs)}, ${span(days(due, nowMs))} ago`, hot: true, bar: null };
  const from = nudged ?? r.stageStartMs ?? r.sentMs;
  const bar = from != null && due > from ? Math.min(1, Math.max(0, (nowMs - from) / (due - from))) : null;
  const line = nudged != null ? `nudged ${shortDate(nudged, nowMs)}, reply due ${shortDate(due, nowMs)}` : sod(due) === sod(nowMs) ? "reply due today" : `reply due ${shortDate(due, nowMs)}`;
  return { value: "Wait for a reply", line, hot: false, bar };
}
