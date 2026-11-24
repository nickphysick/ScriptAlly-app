/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v154 (design-refs/query-centre-v154.html) — the card's Next box, by state. Every figure is one the
 * slip already had: the reply date is `expectedMs` (or `replyMs` once a nudge has reset the window), the bar is the
 * share of that window gone, and the planned nudge is `Query.nudgeDate` (written by the log and nudge journeys).
 * Nothing here invents a reminder: with no `nudgeDate` still to come, the line is simply absent.
 */
import { whereItStands, type QcRow } from "./qcSummary";
import { anyToMs } from "./qcStages";
import { shortDate } from "./qc151";
import { nextFact } from "./qc153";
import { nudgeMsOf, reminderOf, stateOf, type StateInput } from "./queryState";
import type { RowAct } from "./qc1512";
import type { DrawerMode } from "./queryActions/drawerStore";

const sod = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ── the Next box ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type NextBox154 =
  /** with the agent, inside the reply window: the date, the share of the window gone, and the planned nudge if any */
  | { kind: "wait"; due: string; bar: number; nudgeOn: string | null }
  /** past the reply date (Nudge due): words only, the nudge is the hover's */
  | { kind: "over" }
  /** v157 — gone quiet: "Gone quiet · Nudge or close", and when it went quiet (the last nudge, else the reply date) */
  | { kind: "quiet"; line: string | null }
  /** every other state: the slip's own Next copy */
  | { kind: "other"; value: string; line: string | null; hot: boolean };

export const NEXT_WAIT_LABEL = "Reply expected by";
export const OVERDUE_VALUE = "Past expected";
export const OVERDUE_LINE = "Send nudge now";
export const nudgeOnLine = (date: string): string => `Nudge on ${date}`;

/* ── v157 · gone quiet ─────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Is the card gone quiet? The page's own test, unchanged: the stamped state (lib/queryState `stateOf`) where the row
 * carries one, else the old four-set rule `rowAct` also falls back to (lib/qcSummary `whereItStands`). Both need the
 * agent's court, so an offer or a closed card is never quiet.
 */
export function isQuietCard(r: QcRow, nowMs: number): boolean {
  const st = stateOf(r);
  return st ? st === "quiet" : whereItStands(r, nowMs) === "quiet";
}
export const QUIET_LABEL = "Gone quiet";
export const QUIET_VALUE = "Nudge or close";
/** the arrow chip's name and tooltip on a quiet card; it opens the card, whose footer offers both */
export const QUIET_CHIP = "Nudge or close";
export const quietNudgedLine = (date: string): string => `nudged ${date}`;
export const quietSinceLine = (date: string): string => `since ${date}`;
/**
 * The quiet box's line: "nudged {date}" when the query has been nudged since it was last sent anything (lib/queryState
 * `nudgeMsOf`, the same test the page stamps as `nudged`), with that nudge's date; otherwise "since {date}" with the
 * reply date (`expectedMs`). Neither date: no line.
 */
export function quietLine(r: QcRow, nowMs: number): string | null {
  const nudged = nudgeMsOf({ ...(r as unknown as StateInput), nrmn: false }, nowMs);
  if (nudged != null) return quietNudgedLine(shortDate(nudged, nowMs));
  return r.expectedMs != null ? quietSinceLine(shortDate(r.expectedMs, nowMs)) : null;
}

/** v157 — what one press of the card's arrow chip does: a quiet card's opens the card (never a journey); otherwise a
 *  navy or nudge act runs its journey, and anything else opens the card. `rowAct` itself is unchanged. */
export type ChipPress = { kind: "open" } | { kind: "act"; mode: DrawerMode };
export const chipPress = (quiet: boolean, cta: RowAct | null): ChipPress => (quiet || !cta ? { kind: "open" } : { kind: "act", mode: cta.mode });

export function nextBox154(r: QcRow, nowMs: number): NextBox154 {
  if (isQuietCard(r, nowMs)) return { kind: "quiet", line: quietLine(r, nowMs) };
  const st = stateOf(r);
  const live = r.court === "agent";
  if (live && (st === "nudge" || (st == null && r.pastExpected))) return { kind: "over" };
  const due = st === "agent" ? (r as { replyMs?: number | null }).replyMs ?? r.expectedMs : r.expectedMs;
  const waiting = live && (st === "agent" || (st == null && !r.pastExpected));
  if (waiting && due != null && sod(due) >= sod(nowMs)) {
    const from = r.stageStartMs ?? r.sentMs;
    const bar = from != null && due > from ? Math.min(1, Math.max(0, (nowMs - from) / (due - from))) : 0;
    /* the planned nudge (`Query.nudgeDate`), shown only while it is still to come: never "now", never a pass */
    /* Controls: entry v1 — read through the agent's latest reply entry (lib/queryState `reminderOf`, Nick's ruling 2) */
    const n = r.query ? reminderOf(r as unknown as Parameters<typeof reminderOf>[0]) : null;
    const nudgeOn = n != null && sod(n) >= sod(nowMs) ? shortDate(n, nowMs) : null;
    return { kind: "wait", due: shortDate(due, nowMs), bar, nudgeOn };
  }
  const f = nextFact(r, nowMs);
  return { kind: "other", value: f.value, line: f.line, hot: f.hot };
}
