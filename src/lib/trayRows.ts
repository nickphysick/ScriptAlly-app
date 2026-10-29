/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.2 §F — the tray row's words and the overdue dial's marks, pure.
 *
 * ⚠️ ROWS LEAD WITH THE AGENT (F.2): a query or agent task's bold line is the agent's name and its italic line says what
 *    is wanted, then the agency. Own tasks and housekeeping's "Every agent" rows keep v5.1's lines. The status words are
 *    the Query Centre's own (`STAGE_NAME`), read and never restated.
 */
import { STAGE_NAME } from "./qcSummary";
import type { QueryStatus } from "../types";
import type { TrayItem } from "./todoTray";

export interface RowLines { bold: string; italic: string; agentLed: boolean }

/** the row's two lines (F.2) */
export function rowLines(i: TrayItem): RowLines {
  const name = (i.agent?.name ?? "").trim();
  if (i.userTask || i.sweep || !i.agent || !name) return { bold: i.deed, italic: i.sub, agentLed: false };
  const agency = (i.agent.agency ?? "").trim();
  const status = i.query?.status ? STAGE_NAME[i.query.status as QueryStatus] ?? String(i.query.status) : "";
  const what = i.bucket === "chase" ? `Nudge${status ? ` · ${status}` : ""}`
    : i.bucket === "close" ? `Consider closing${status ? ` · ${status}` : ""}`
    : i.deed;
  return { bold: name, italic: [what, agency].filter(Boolean).join(" · "), agentLed: true };
}

/** how late, for the tray dial's tag (F.3): "+5 d" under 14 days, "+3 wk" under 60, "+4 mo" beyond (days / 30.4) */
export function lateTag(days: number): string | null {
  if (!Number.isFinite(days) || days <= 0) return null;
  if (days < 14) return `+${Math.round(days)} d`;
  if (days < 60) return `+${Math.round(days / 7)} wk`;
  return `+${Math.round(days / 30.4)} mo`;
}

/** v7 S5 — the same lateness in words, for a row's date read as text: "2 days overdue" · "4 wk overdue" · "3 mo overdue"
 *  (lateTag's thresholds, so the figure cannot drift from the tag it replaced) */
export function lateWords(days: number): string | null {
  const t = lateTag(days);
  if (!t) return null;
  const [n, u] = t.slice(1).split(" ");
  return `${n} ${u === "d" ? (n === "1" ? "day" : "days") : u} overdue`;
}

const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** the overdue dial's spoken label (F.5): "Overdue since 20 June" (the year when it is not this one) */
export function overdueLabel(ymd: string, todayYmd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const ty = Number(todayYmd.slice(0, 4));
  return `Overdue since ${d} ${MONTH[m - 1]}${y !== ty ? ` ${y}` : ""}`;
}
