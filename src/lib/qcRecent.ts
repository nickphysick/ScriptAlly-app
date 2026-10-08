/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "RECENTLY UPDATED" (Query Centre v132 §1) — the section's set, its order, and the one sentence that
 * says what moved this week.
 *
 * ⚠️ A MOVE IS A STATUS CHANGE, DATED BY THE STAGE IT REACHED. `movedAt` is the day the query entered
 * the stage it stands at (`stageStartMs`, from `stageHistory`), falling back to the send for a query
 * that has not moved since. `lastMs` is not used: it counts any activity, a note included, and the
 * sentence's verb says what STATUS was reached — a date for something else would sit beside it.
 *
 * ⚠️ AN UNDATED MOVE IS NEVER "THIS WEEK". Where nothing dates the stage, `movedAt` is null: the query
 * sorts last and is left out of the week's count rather than given a day it may not have.
 */
import { QueryStatus } from "../types";
import { MONTHS_SHORT } from "./dates";
import { rowsForTile, type QcRow, type TileCourt } from "./qcSummary";

const DAY = 86_400_000;
/** "This week" is the last seven days, today included. */
export const WEEK_DAYS = 7;
/** "Also moved" lists this many; the rest are "and N more". */
export const ALSO_MOVED = 5;

/**
 * What a query's move says, by the status it reached. ⚠️ ONE ENTRY PER STATUS, and the type requires
 * every one: the brief's table named eight, and the other four are Nick's (8 Oct) — "no longer has
 * your query" rather than "was withdrawn", because it must read in both of the sentence's forms.
 */
export const MOVE_VERB: Record<QueryStatus, string> = {
  [QueryStatus.QUERIED]: "has your query",
  [QueryStatus.PARTIAL_SENT]: "has your partial",
  [QueryStatus.FULL_SENT]: "has your full",
  [QueryStatus.PARTIAL_REQUESTED]: "asked for a partial",
  [QueryStatus.FULL_REQUESTED]: "asked for the full",
  [QueryStatus.OFFER]: "made an offer",
  [QueryStatus.REJECTED]: "passed",
  [QueryStatus.NO_RESPONSE]: "closed with no reply",
  [QueryStatus.REVISE_RESUBMIT]: "asked for a revision",
  [QueryStatus.RESUBMITTED]: "has your revision",
  [QueryStatus.SIGNED]: "signed with you",
  [QueryStatus.WITHDRAWN]: "no longer has your query",
};
/** The verb as a row's second line: "Made an offer". */
export const moveLine = (s: QueryStatus): string => MOVE_VERB[s].charAt(0).toUpperCase() + MOVE_VERB[s].slice(1);

/** When the query moved to where it stands: the stage's start, else the send; null when nothing dates it. */
export const movedAt = (r: QcRow): number | null => r.stageStartMs ?? r.sentMs ?? null;

/** "5 Oct". */
export const moveDate = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

/** The section's set — every query, or the chosen court's — newest move first, undated last. */
export function recentRows(rows: readonly QcRow[], court: TileCourt | null): QcRow[] {
  const set = court ? rowsForTile(rows, court) : rows.slice();
  return set.sort((a, b) => {
    const x = movedAt(a), y = movedAt(b);
    if (x == null || y == null) return x == null ? (y == null ? a.agentName.localeCompare(b.agentName) : 1) : -1;
    return y - x || a.agentName.localeCompare(b.agentName);
  });
}

/** Moved within the last seven days. */
export const movedThisWeek = (r: QcRow, nowMs: number): boolean => {
  const t = movedAt(r);
  return t != null && t <= nowMs && nowMs - t <= WEEK_DAYS * DAY + DAY / 2;
};

export type Sentence =
  | { kind: "week"; count: number; named: { name: string; verb: string }[]; more: number }
  | { kind: "last"; name: string; verb: string; date: string }
  | { kind: "none" };

const COUNT_WORD = ["", "One thing", "Two things", "Three things", "Four things", "Five things"];

/** The one sentence over the section's set (already newest first). */
export function recentSentence(rows: readonly QcRow[], nowMs: number): Sentence {
  const ordered = recentRows(rows, null);
  const week = ordered.filter((r) => movedThisWeek(r, nowMs));
  if (week.length) {
    return { kind: "week", count: week.length, named: week.slice(0, 3).map((r) => ({ name: r.agentName, verb: MOVE_VERB[r.status] })), more: Math.max(0, week.length - 3) };
  }
  const last = ordered.find((r) => movedAt(r) != null);
  return last ? { kind: "last", name: last.agentName, verb: MOVE_VERB[last.status], date: moveDate(movedAt(last)!) } : { kind: "none" };
}

/** The sentence as runs, names bold — the component renders them; a test reads them back. */
export function sayRuns(s: Sentence): { text: string; bold?: boolean }[] {
  if (s.kind === "none") return [{ text: "Nothing has moved yet." }];
  if (s.kind === "last") return [{ text: "Nothing has moved this week. The last change was " }, { text: s.name, bold: true }, { text: `, who ${s.verb} on ${s.date}.` }];
  const out: { text: string; bold?: boolean }[] = [
    { text: s.count <= 5 ? COUNT_WORD[s.count] : `${s.count} things`, bold: true },
    { text: " moved this week: " },
  ];
  s.named.forEach((p, i) => {
    if (i > 0) out.push({ text: i === s.named.length - 1 ? " and " : ", " });
    out.push({ text: p.name, bold: true }, { text: ` ${p.verb}` });
  });
  if (s.more > 0) out.push({ text: `, and ${s.more} more` });
  out.push({ text: "." });
  return out;
}
