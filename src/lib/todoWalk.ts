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

/** The focus flow's material tick-list per request type (was TaskCaptureForm's inline map). */
export function materialOptsForTask(taskType?: string): string[] {
  if (taskType === "partial_requested") return ["First pages", "Synopsis", "Covering email"];
  if (taskType === "revise_resubmit") return ["Revised manuscript", "Revision letter"];
  return ["Full manuscript", "Synopsis", "Covering email"];
}

/** The nudge's default check-back window (days) when the flow doesn't surface the field. */
export const DEFAULT_CHECKBACK_DAYS = 14;

/**
 * A staged (not-yet-written) focus-flow change. Two families:
 *  · CAPTURES (mark-sent, nudge) — carry everything apply() needs to write, PLUS display/audit
 *    fields (method/materials/nudgeDate) the review screen shows. The proven write paths
 *    (recordMaterialsSent / logNudge) take none of the audit fields — extending them would be a
 *    write-path change, which the pack bars.
 *  · STANCES (snooze, mute-item, mute-rule) — deferrable taskFlags/mutedTaskRules writes. Staging
 *    them keeps Back honest: a staged stance un-stages; nothing persists before review-Save.
 * `label` is display-only (the review row's text), set at stage time.
 */
export type StagedPayload =
  | { kind: "mark-sent"; cardKey: string; label?: string; queryId: string; targetStatus: QueryStatus; sentDate: string; isResubmit: boolean; method?: string; materials?: string[] }
  | { kind: "nudge"; cardKey: string; label?: string; queryId: string; checkBackDate: string; note?: string; nudgeDate?: string; method?: string }
  | { kind: "snooze"; cardKey: string; label?: string; taskType: string; relatedRecordId: string; days: number }
  | { kind: "mute-item"; cardKey: string; label?: string; taskType: string; relatedRecordId: string }
  | { kind: "mute-rule"; cardKey: string; label?: string; rule: string };

/** The EXACT args the one mark-sent write path takes — quick-✓ and the journey both build their
 *  payload then pass through here, so the two can never write differently. */
export function markSentWriteArgs(p: Extract<StagedPayload, { kind: "mark-sent" }>): { queryId: string; targetStatus: QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT; sentDate: string; isResubmit: boolean } {
  return { queryId: p.queryId, targetStatus: p.targetStatus as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT, sentDate: p.sentDate, isResubmit: p.isResubmit };
}

/** The EXACT args the one nudge write path (logNudge) takes. */
export function nudgeWriteArgs(p: Extract<StagedPayload, { kind: "nudge" }>): [string, { checkBackDate: string; note?: string }] {
  return [p.queryId, { checkBackDate: p.checkBackDate, ...(p.note ? { note: p.note } : {}) }];
}

/**
 * Quick-✓'s stated defaults for a send card — "the honest fastest version of actually doing it":
 * today · the query's own method (else Email) · EVERYTHING they asked for. The result is a normal
 * StagedPayload, so the write goes through markSentWriteArgs → recordMaterialsSent — byte-identical
 * to the journey with the same inputs (unit-locked). Defaults are stated, never silent: the receipt
 * derives from this payload.
 */
export function quickSendPayload(a: { cardKey: string; label?: string; taskType?: string; queryId: string; targetStatus: QueryStatus; isResubmit: boolean; method?: string | null; nowIso: string }): Extract<StagedPayload, { kind: "mark-sent" }> {
  return {
    kind: "mark-sent", cardKey: a.cardKey, ...(a.label ? { label: a.label } : {}),
    queryId: a.queryId, targetStatus: a.targetStatus, sentDate: a.nowIso, isResubmit: a.isResubmit,
    method: a.method || "Email", materials: materialOptsForTask(a.taskType),
  };
}

/** Quick-✓ nudge defaults — today · the query's method (else Email) · check back in 14 days. */
export function quickNudgePayload(a: { cardKey: string; label?: string; queryId: string; method?: string | null; nowIso: string }): Extract<StagedPayload, { kind: "nudge" }> {
  return {
    kind: "nudge", cardKey: a.cardKey, ...(a.label ? { label: a.label } : {}),
    queryId: a.queryId, checkBackDate: new Date(new Date(a.nowIso).getTime() + DEFAULT_CHECKBACK_DAYS * 86400000).toISOString(),
    nudgeDate: a.nowIso.slice(0, 10), method: a.method || "Email",
  };
}

const receiptDate = (iso: string): string => {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/**
 * The receipt's log line, derived from the ACTUAL payload — never a hardcoded claim. "everything
 * they asked for" only when the materials really are the request's full set (`allMaterials`).
 */
export function receiptLine(p: StagedPayload, todayYmd: string, allMaterials?: string[]): string {
  if (p.kind === "mark-sent") {
    const day = p.sentDate.slice(0, 10) === todayYmd ? `today (${receiptDate(p.sentDate)})` : receiptDate(p.sentDate);
    const mats = p.materials ?? [];
    const everything = !!allMaterials && allMaterials.length > 0 && mats.length === allMaterials.length && allMaterials.every((m) => mats.includes(m));
    return `Logged: ${day} · via ${(p.method || "email").toLowerCase()} · ${everything ? "everything they asked for" : mats.join(", ") || "no materials listed"}.`;
  }
  if (p.kind === "nudge") {
    const day = (p.nudgeDate ?? "") === todayYmd ? `today (${receiptDate(p.nudgeDate!)})` : p.nudgeDate ? receiptDate(p.nudgeDate) : "today";
    return `Logged: ${day} · via ${(p.method || "email").toLowerCase()} · check back ${receiptDate(p.checkBackDate)}.`;
  }
  return "";
}

export interface StagedHandlers {
  markSent: (p: Extract<StagedPayload, { kind: "mark-sent" }>) => Promise<void>;
  nudge: (p: Extract<StagedPayload, { kind: "nudge" }>) => Promise<void>;
  snooze: (p: Extract<StagedPayload, { kind: "snooze" }>) => Promise<void>;
  muteItem: (p: Extract<StagedPayload, { kind: "mute-item" }>) => Promise<void>;
  muteRule: (p: Extract<StagedPayload, { kind: "mute-rule" }>) => Promise<void>;
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
      else if (item.kind === "nudge") await h.nudge(item);
      else if (item.kind === "snooze") await h.snooze(item);
      else if (item.kind === "mute-item") await h.muteItem(item);
      else await h.muteRule(item);
      ok.push(item.cardKey);
    } catch {
      failed.push(item.cardKey);
    }
  }
  return { ok, failed };
}
