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
import { ledgerDetail } from "./todoLedger";
import { Activity, ActivityType, Query, QueryStatus, TaskFlag } from "../types";
import { defaultSentMaterials } from "./journeyMaterials";

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
 * Today progress: N = items committed to Today (still-on-list + completed-from-list);
 * M = the completed ones. A globally-cleared item that was NEVER committed to Today does not enter
 * this ratio. Empty list → total 0 (no "done" claim). Logic only — the component renders it.
 */
/**
 * VI P1 — the dashed invitation: how many ghost rows the Today card draws beneath the committed
 * items. The ref's two frames reconcile to ONE rule: empty = 3 (the taster), filling =
 * 5 − committed − done clamped to [1..3] (the box shrinks but never vanishes mid-fill), and it
 * disappears entirely at five committed.
 */
export function todayGhosts(committed: number, done: number): number {
  if (committed >= MAX_TODAY) return 0;
  return Math.max(1, Math.min(3, MAX_TODAY - committed - done));
}

export function todayProgress(committedOnList: number, doneFromList: number): { total: number; done: number; pct: number; empty: boolean } {
  const total = committedOnList + doneFromList;
  return { total, done: doneFromList, pct: total ? Math.round((doneFromList / total) * 100) : 0, empty: total === 0 };
}

/**
 * The duplicate-send guard's read (evening run B3) — the most recent SAME-TYPE MATERIALS_SENT on
 * this query, read from the log AT WRITE TIME (no new state). Partial/Full only; R&R resubmissions
 * are NEVER guarded (a resend of revisions is the point of the journey). Returns the prior send's
 * ISO date, or null when this would be the first of its type.
 */
export function priorSameTypeSend(
  activities: Activity[],
  queryId: string,
  targetStatus: QueryStatus,
  isResubmit: boolean,
): string | null {
  if (isResubmit) return null;
  if (targetStatus !== QueryStatus.PARTIAL_SENT && targetStatus !== QueryStatus.FULL_SENT) return null;
  const prior = activities
    .filter((a) => a.queryId === queryId && a.activityType === ActivityType.MATERIALS_SENT && a.resultingStatus === targetStatus)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return prior[0]?.date ?? null;
}

/** The guard's one confirm line (soft — resends are legitimate; OK proceeds, Cancel takes you back). */
export function duplicateSendPrompt(targetStatus: QueryStatus, agentName: string, priorISO: string): string {
  const typeWord = targetStatus === QueryStatus.PARTIAL_SENT ? "partial" : "full";
  const when = new Date(priorISO);
  const dateLabel = Number.isNaN(when.getTime()) ? "earlier" : when.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `You logged a ${typeWord} to ${agentName || "this agent"} on ${dateLabel} — log another?`;
}

/**
 * The send sheet's kicker (evening run B1; Deck v2 renamed the family "Agent waiting"). The
 * old composition doubled the lane chip (`due` IS the family string), so the kicker read the
 * same words twice. The INTENDED second segment is the row's DETAIL — the same fact
 * the ledger's DETAIL cell shows (REQUESTED {date} / R&R FROM {date}), read from the same pure
 * source (ledgerDetail) so sheet and ledger can never disagree. No readable detail → the single
 * label. A same-string second segment is impossible by construction AND guarded.
 */
export function sendKicker(card: BoardCard, ctx: { queries: Query[]; taskFlags: TaskFlag[] }, now: number): string {
  const base = "Agent waiting";
  const d = ledgerDetail(card, ctx, now);
  if (d.label === "—" || d.label.trim().toLowerCase() === base.toLowerCase()) return base;
  return `${base} · ${d.label}`;
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
/**
 * ⚠️ THE OLD OPTION LIST, KEPT ONLY FOR `assumedSendItem`'s "something else" EXTRAS — which the
 * journey no longer renders (journeys pack, Phase 3). It offered a synopsis on every send, so
 * nothing that WRITES or DISPLAYS may read it: `defaultSentMaterials` is what a send records and
 * `journeyMaterials` is what a step offers. Left in place rather than deleted because
 * `assumedSendItem` still computes `extras` for callers this pack did not audit; it goes the day
 * that function is retired.
 */
export function materialOptsForTask(taskType?: string): string[] {
  if (taskType === "partial_requested") return ["First pages", "Synopsis", "Covering email"];
  if (taskType === "revise_resubmit") return ["Revised manuscript", "Revision letter"];
  return ["Full manuscript", "Synopsis", "Covering email"];
}

/**
 * The one-tap confirm's ASSUMED item (journey-logic P2; ref §2 "Off it goes"): what the agent
 * requested, pre-confirmed — one tap logs exactly that. Partial sends seed the sample from the
 * agent's own materials list where held (the same `materialsWanted` field the housekeeping journey
 * fills); unknown → the honest fallback, never invented specifics. `extras` = the remaining
 * tick-list items offered behind "+ I sent something else too" (+ the free "Something else").
 */
export function assumedSendItem(
  taskType: string | undefined,
  agentMaterials: string[] | undefined,
  who: string,
): { label: string; sub: string; extras: string[] } {
  const others = (label: string) =>
    [...materialOptsForTask(taskType).filter((m) => m.toLowerCase() !== label.toLowerCase()), "Something else"];
  if (taskType === "partial_requested") {
    const sample = (agentMaterials ?? []).find((m) => /page|sample|partial|chapter/i.test(m));
    if (sample) return { label: sample, sub: `what ${who} requested`, extras: others(sample).filter((m) => m !== "First pages") };
    return { label: "Partial", sub: `the sample ${who} asked for`, extras: others("First pages") };
  }
  if (taskType === "revise_resubmit") {
    return { label: "Revised manuscript", sub: `what ${who} asked to see again`, extras: others("Revised manuscript") };
  }
  return { label: "Full manuscript", sub: `what ${who} requested`, extras: others("Full manuscript") };
}

/** The nudge's default check-back window (days) when the flow doesn't surface the field. */
export const DEFAULT_CHECKBACK_DAYS = 14;

/**
 * THE journey timestamp rule (journey-logic pass Phase 1 — the shared construction point every
 * journey uses; ref todo-offer-send-journeys.html header note):
 *   · no day picked (or the pick IS today) → `nowIso` — the true moment of the write;
 *   · a back-dated day → that date at 12:00 NOON LOCAL — never midnight, never date-only
 *     (a date-only string parses as midnight UTC, which renders as 01:00 BST and can shift the
 *     displayed DAY entirely in negative-offset timezones — the timeline artefact this kills).
 * Accepts the day pickers' YYYY-MM-DD; anything unparseable falls back to `nowIso`.
 */
export function journeyEventISO(day: string | undefined, nowIso: string): string {
  if (!day || !day.trim()) return nowIso;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day.trim());
  if (!m) return nowIso;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  const now = new Date(nowIso);
  if (y === now.getFullYear() && mo === now.getMonth() && d === now.getDate()) return nowIso;
  return new Date(y, mo, d, 12, 0, 0, 0).toISOString();
}

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
  /* ⚠️ `writerExpectedDate` JOINS THE PAYLOAD (write round, Phase 1). The send form has asked for it
     since the steer round and REQUIRED it since the finish round, and it was discarded here: the
     payload had no member, so `markSentWriteArgs` had nothing to pass and `recordMaterialsSent` —
     which accepts and writes the field — was never given it. The form compelled an answer, the strip
     stated it had been recorded, and nothing was written. */
  | { kind: "mark-sent"; cardKey: string; label?: string; queryId: string; targetStatus: QueryStatus; sentDate: string; isResubmit: boolean; method?: string; materials?: string[]; writerExpectedDate?: string; note?: string }
  | { kind: "nudge"; cardKey: string; label?: string; queryId: string; checkBackDate: string; note?: string; nudgeDate?: string; method?: string }
  | { kind: "snooze"; cardKey: string; label?: string; taskType: string; relatedRecordId: string; days: number }
  | { kind: "mute-item"; cardKey: string; label?: string; taskType: string; relatedRecordId: string }
  | { kind: "mute-rule"; cardKey: string; label?: string; rule: string }
  | { kind: "close"; cardKey: string; label?: string; queryId: string; prevStatus: QueryStatus };

/** The EXACT args the one mark-sent write path takes — quick-✓ and the journey both build their
 *  payload then pass through here, so the two can never write differently. */
export function markSentWriteArgs(p: Extract<StagedPayload, { kind: "mark-sent" }>): {
  queryId: string; targetStatus: QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT;
  sentDate: string; isResubmit: boolean; writerExpectedDate?: string; note?: string;
} {
  return {
    queryId: p.queryId,
    targetStatus: p.targetStatus as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT,
    sentDate: p.sentDate,
    isResubmit: p.isResubmit,
    /* ⚠️ OMITTED WHEN UNANSWERED, never defaulted. `recordMaterialsSent` writes the field only when
       the key is present, so an absent expectation leaves the query's column untouched rather than
       stamping today — which is the difference between "not asked" and "answered with a guess". */
    ...(p.writerExpectedDate ? { writerExpectedDate: p.writerExpectedDate } : {}),
    ...(p.note ? { note: p.note } : {}),
  };
}

/** The EXACT args the one nudge write path (logNudge) takes. Phase 1: the journey's picked day now
 *  REACHES the write as `eventDate` (via the shared noon rule) — it was display-only before, so a
 *  back-dated nudge logged at write time. `method` stays display-only (the write path has no home
 *  for it). */
export function nudgeWriteArgs(p: Extract<StagedPayload, { kind: "nudge" }>, nowIso: string): [string, { checkBackDate: string; note?: string; eventDate: string }] {
  return [p.queryId, { checkBackDate: p.checkBackDate, ...(p.note ? { note: p.note } : {}), eventDate: journeyEventISO(p.nudgeDate, nowIso) }];
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
    queryId: a.queryId, targetStatus: a.targetStatus, sentDate: journeyEventISO(undefined, a.nowIso), isResubmit: a.isResubmit,
    /* ⚠️ THE PRE-TICKED ROWS, NOT THE OLD OPTION LIST. This wrote `["Full manuscript", "Synopsis",
       "Covering email"]` — a claim that a synopsis was sent, on every quick send, when none was.
       A one-tap confirm records what the agent asked for; anything conditional needs the journey,
       because it needs a decision the tap never offered. */
    method: a.method || "Email", materials: defaultSentMaterials(a.taskType),
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
  /** The Sunday review's staged stale-close — the EXISTING close path (updateQueryStatus →
   *  NO_RESPONSE) at Save; staging only defers, never re-shapes. */
  close: (p: Extract<StagedPayload, { kind: "close" }>) => Promise<void>;
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
      else if (item.kind === "close") await h.close(item);
      else await h.muteRule(item);
      ok.push(item.cardKey);
    } catch {
      failed.push(item.cardKey);
    }
  }
  return { ok, failed };
}
