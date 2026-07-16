/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoWalk — pure selection logic for the Today's-list helpers.
 *   · choosePicks — "Help me pick": ≤4 Do-next (the column is already pressing-first, deadline-ordered)
 *     then 1–2 Housekeeping, capped at 5; if nothing urgent, ≤3 Housekeeping. Never a UserTask.
 *   · rolledOverCards — committed items whose day has passed (surfaced once in the gold Keep/Clear bar).
 * Pure + unit-tested; the component animates + writes, it never re-derives the choice by hand.
 */

import { BoardCard } from "./todoBoard";
import { QueryStatus } from "../types";

export const MAX_TODAY = 5;
const MAX_DO = 4;
const MAX_HK_TOPUP = 2;
const MAX_HK_IF_EMPTY = 3;

export function choosePicks(opts: { doCards: BoardCard[]; hkCards: BoardCard[]; committedCount: number; max?: number }): string[] {
  const max = opts.max ?? MAX_TODAY;
  const room = max - opts.committedCount;
  if (room <= 0) return [];
  const doAvail = opts.doCards.filter((c) => !c.committed);
  const hkAvail = opts.hkCards.filter((c) => !c.committed);
  if (doAvail.length === 0) return hkAvail.slice(0, Math.min(MAX_HK_IF_EMPTY, room)).map((c) => c.key);
  const picks = doAvail.slice(0, Math.min(MAX_DO, room));
  const rest = room - picks.length;
  return [...picks, ...hkAvail.slice(0, Math.min(MAX_HK_TOPUP, rest))].map((c) => c.key);
}

/** Committed items whose committedDate is a day BEFORE today — the roll-over set (surfaced once). */
export function rolledOverCards(cards: BoardCard[], today: string): BoardCard[] {
  return cards.filter((c) => c.committedDate != null && c.committedDate < today);
}

/**
 * Today's-list progress: N = items committed to today's list (still-on-list + completed-from-list);
 * M = the completed ones. A globally-cleared item that was NEVER committed to Today does not enter
 * this ratio. Empty list → total 0 (no "done" claim). Logic only — the component renders it.
 */
export function todayProgress(committedOnList: number, doneFromList: number): { total: number; done: number; pct: number; empty: boolean } {
  const total = committedOnList + doneFromList;
  return { total, done: doneFromList, pct: total ? Math.round((doneFromList / total) * 100) : 0, empty: total === 0 };
}

/**
 * A walkthrough step is STAGEABLE only where its write is deferrable (Back genuinely un-does it):
 * mark-sent (partial/full/R&R → recordMaterialsSent) and nudge (→ logNudge). Every other type —
 * offer (record), housekeeping, a UserTask — performs an immediate side-effecting write, so it gets
 * an "open" step (launches the drawer, which writes immediately) and never enters the staged set.
 */
const MARK_SENT_TASK_TYPES: ReadonlySet<string> = new Set(["partial_requested", "full_requested", "revise_resubmit"]);
export type WalkStepKind = "mark-sent" | "nudge" | "open";
export function walkStepKind(card: BoardCard): WalkStepKind {
  if (card.taskType === "nudge_overdue") return "nudge";
  if (card.taskType && MARK_SENT_TASK_TYPES.has(card.taskType)) return "mark-sent";
  return "open";
}
export const isStageable = (card: BoardCard): boolean => walkStepKind(card) !== "open";

/**
 * A staged (not-yet-written) walkthrough change. Carries everything apply() needs to write later,
 * PLUS the capture's method + materials for the review screen. Those two are DISPLAY/AUDIT only —
 * the proven write path (recordMaterialsSent, shared with MarkSentPopover) takes neither; the
 * materials tick-list is the Save-gate, exactly as in the popover. Extending the write path to
 * persist them would be a write-path change, which this pack bars.
 */
export type StagedPayload =
  | { kind: "mark-sent"; cardKey: string; queryId: string; targetStatus: QueryStatus; sentDate: string; isResubmit: boolean; method?: string; materials?: string[] }
  | { kind: "nudge"; cardKey: string; queryId: string; checkBackDate: string; note?: string };

export interface StagedHandlers {
  markSent: (p: Extract<StagedPayload, { kind: "mark-sent" }>) => Promise<void>;
  nudge: (p: Extract<StagedPayload, { kind: "nudge" }>) => Promise<void>;
}

/**
 * Write each staged change through the existing handlers, ISOLATING per-item failure — one throw
 * never aborts the rest, and the caller reports partial failures (never a silent partial success).
 */
export async function applyStaged(items: StagedPayload[], h: StagedHandlers): Promise<{ ok: string[]; failed: string[] }> {
  const ok: string[] = [];
  const failed: string[] = [];
  for (const item of items) {
    try {
      if (item.kind === "mark-sent") await h.markSent(item);
      else await h.nudge(item);
      ok.push(item.cardKey);
    } catch {
      failed.push(item.cardKey);
    }
  }
  return { ok, failed };
}
