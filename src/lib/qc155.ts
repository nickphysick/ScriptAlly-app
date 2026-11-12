/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v155 (design-refs/query-centre-v155.html) — the states the list page had never drawn: nothing needs
 * you (quiet), no queries yet (day one) and loading. This file holds the quiet state's condition and its words.
 *
 * ⚠️ THE CONDITION IS THE DATA'S, NEVER THE HEADINGS'. It reads each row's stamped state (lib/queryState `qs`), so it
 *    holds under any grouping: grouped by status or package there are no "Offers" headings to look for, and the writer
 *    still has nothing to do.
 * ⚠️ "WITH AGENTS" IS THE WATCH-AND-WAIT SET (state `agent`): gone quiet is past its window and is not counted, as the
 *    ref counts only the Watch and wait group. The date is the one the card's Next box shows for that query (its own
 *    reply date before its stage's, lib/qc154 `nextBox154`), formatted as the card formats it.
 */
import type { QcRow } from "./qcSummary";
import { shortDate } from "./qc151";
import { stateOf, type QueryState } from "./queryState";

/** the three groups that need the writer: their presence is what ends the quiet state */
export const NEEDS_YOU_155: ReadonlySet<QueryState> = new Set<QueryState>(["offer", "materials", "nudge"]);

export const QUIET_HEAD_155 = "Nothing needs you today.";
export const QUIET_NONE_155 = "Nothing is out with agents right now.";
export const FIRST_TITLE_155 = "No queries yet";
export const FIRST_HEAD_155 = "No queries yet.";
/** the day-one body, in its three runs: the two links sit between them */
export const FIRST_BODY_155 = {
  lead: "Log your first query and it will appear here, with the date a reply is expected. Already keeping a tracker somewhere? ",
  importLink: "Bring it in with Smart import",
  mid: " or ",
  templateLink: "use our template",
  tail: ".",
} as const;

/** a row's state, falling back to its court for an unstamped row (the phone's) */
const needsYou = (r: QcRow): boolean => {
  const s = stateOf(r);
  return s ? NEEDS_YOU_155.has(s) : r.court === "you";
};

/** PURE — the quiet state shows: there are queries, the view is the List, nothing narrows it, and none needs you */
export function quietNow155(i: { rows: readonly QcRow[]; view: "list" | "birds"; filtersOn: boolean }): boolean {
  return i.rows.length > 0 && i.view === "list" && !i.filtersOn && !i.rows.some(needsYou);
}

const sod = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** the waiting query's reply date, as its card's Next box reads it; null when it has none still to come */
const replyMs = (r: QcRow, nowMs: number): number | null => {
  const due = (r as { replyMs?: number | null }).replyMs ?? r.expectedMs;
  return due != null && sod(due) >= sod(nowMs) ? due : null;
};

/** PURE — the quiet panel's body */
export function quietBody155(rows: readonly QcRow[], nowMs: number): string {
  const waiting = rows.filter((r) => stateOf(r) === "agent");
  if (!waiting.length) return QUIET_NONE_155;
  const n = waiting.length;
  const head = n === 1 ? "1 query is with an agent." : `${n} queries are with agents.`;
  const dues = waiting.map((r) => replyMs(r, nowMs)).filter((t): t is number => t != null);
  return dues.length ? `${head} The next reply is expected by ${shortDate(Math.min(...dues), nowMs)}.` : head;
}
