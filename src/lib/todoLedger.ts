/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoLedger — the pure layer of the To-do LEDGER view (workbench pack Phase 3; ref
 * design-refs/todo-ledger-v1.html, normative whole). The ledger CONSUMES the board's derivations —
 * BoardCard (assembleBoard), HkGroup (groupHousekeeping), queryAmbientStatus, hkGroupProgress,
 * agentDataQualityNeeds — and only re-projects them into rows; it never re-derives an engine fact.
 *
 * Ledger-specific derivers (cards keep their OWN titles; these are the terse row voice):
 *   ledgerTitle    — "Review offer" / "Send full" / "Consider closing" / …
 *   ledgerDetail   — the right-aligned DETAIL cell: label + tone + a sortable ms key
 *   sortLedgerDo / sortLedgerHk — DETAIL ↓ defaults (due-soonest / longest-quiet)
 *   batchChildren  — the FULL cohort for an expanded batch row: gap agents (NOT RECORDED, ADD →)
 *                    plus complete agents (✓ RECORDED {date} where TaskFlag.resolvedAt was stamped
 *                    — UNDATED otherwise; the approved degrade, no invented dates)
 *   truncateRows   — "SHOW ALL {n} →" section caps (top-level rows only; children never count)
 *
 * Engine-honesty reconcile (mock ↔ model): the ref sketches a live-snoozed row ("WAKES 21 JUL").
 * In the live engine a snoozed task is HIDDEN (Task Settings' hidden list owns it) — the only
 * visible-while-snoozed cards are quiet OFFERS (exempt from snooze-hiding), so WAKES renders for
 * those; an expired snooze surfaces as SNOOZED ×n with its quiet-days detail. Deviation reported.
 */
import { BoardCard } from "./todoBoard";
import { HkGroup, hkGroupProgress } from "./todoHousekeeping";
import { queryAmbientStatus } from "./queryAmbient";
import { agentDataQualityNeeds, AgentDataNeed } from "./agentDataQuality";
import { flagMatchesTask } from "./taskFlags";
import { agentInitials, agentPrimary } from "./agentDisplay";
import { Agent, Query, TaskFlag } from "../types";

/** "31 Jul" — en-GB short date; empty on unparsable input. */
const dShort = (iso?: string | null): string => {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const msOf = (iso?: string | null): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
};

/** The terse ledger row title per task type (cards keep their own fuller titles). */
export function ledgerTitle(card: BoardCard): string {
  switch (card.taskType) {
    case "offer_received": return "Review offer";
    case "partial_requested": return "Send partial";
    case "full_requested": return "Send full";
    case "revise_resubmit": return "Resubmit R&R";
    case "nudge_overdue": return "Send a nudge";
    case "no_response_close": return "Consider closing";
    default: return card.title; // user tasks / notes — the writer's own words
  }
}

export interface LedgerDetail {
  label: string;
  /** hot = deadline ink (bold burgundy-deep) · dim = faded "not recorded" grammar · plain */
  tone: "hot" | "dim" | "plain";
  /** DETAIL ↓ sort key — ascending = sooner-due (do) ; for hk stale, bigger quiet sorts first. */
  sortMs: number;
}

const FAR = Number.MAX_SAFE_INTEGER;

/**
 * The DETAIL cell per row type. Consumes the SAME sources the card copy reads (responseDeadline,
 * lastStatusChange, queryAmbientStatus, snoozedUntil) so ledger and card can never disagree.
 */
export function ledgerDetail(
  card: BoardCard,
  ctx: { queries: Query[]; taskFlags: TaskFlag[] },
  now: number,
): LedgerDetail {
  const q = card.relatedRecordId ? ctx.queries.find((x) => x.id === card.relatedRecordId) : undefined;
  const flag = card.taskType && card.relatedRecordId
    ? ctx.taskFlags.find((f) => flagMatchesTask(f, card.taskType!, card.relatedRecordId!))
    : undefined;
  switch (card.taskType) {
    case "offer_received": {
      // a quiet offer (the "I need time" stance) shows its wake date — the one visible-while-snoozed case
      const wake = card.quiet ? msOf(flag?.snoozedUntil) : null;
      if (wake != null) return { label: `WAKES ${dShort(flag!.snoozedUntil!)}`.toUpperCase(), tone: "plain", sortMs: wake };
      const reply = msOf(q?.responseDeadline);
      // A2: a bare type echo is banned — an unreadable/absent date is a dim "—" (sort key unchanged)
      if (reply == null) return { label: "—", tone: "dim", sortMs: FAR };
      return { label: `REPLY BY ${dShort(q!.responseDeadline!)}`.toUpperCase(), tone: "hot", sortMs: reply };
    }
    case "partial_requested":
    case "full_requested": {
      const t = msOf(q?.lastStatusChange);
      return t == null
        ? { label: "—", tone: "dim", sortMs: FAR }
        : { label: `REQUESTED ${dShort(q!.lastStatusChange!)}`.toUpperCase(), tone: "plain", sortMs: t };
    }
    case "revise_resubmit": {
      const t = msOf(q?.lastStatusChange);
      return t == null
        ? { label: "—", tone: "dim", sortMs: FAR }
        : { label: `R&R FROM ${dShort(q!.lastStatusChange!)}`.toUpperCase(), tone: "plain", sortMs: t };
    }
    case "nudge_overdue":
    case "no_response_close": {
      const a = q ? queryAmbientStatus(q, "agent", undefined, now) : null;
      const days = a && a.sentMs != null ? a.nDays : null;
      if (days == null) return { label: "NO REPLY YET", tone: "plain", sortMs: FAR };
      // sortMs = the implied send moment — earlier send ⇒ longer quiet ⇒ sorts first ascending
      return { label: `QUIET ${days} DAYS`, tone: "plain", sortMs: now - days * 86400000 };
    }
    default: {
      // user tasks / notes: the card's own chip (deadline label or "Note · 6 Jul") is the detail
      return { label: card.due.toUpperCase(), tone: card.warn ? "hot" : "plain", sortMs: FAR };
    }
  }
}

/** DETAIL ↓ in Urgent: offers pinned first (the board's law), then due-soonest ascending. */
export function sortLedgerDo(cards: BoardCard[], ctx: { queries: Query[]; taskFlags: TaskFlag[] }, now: number): BoardCard[] {
  const key = new Map(cards.map((c) => [c.key, ledgerDetail(c, ctx, now).sortMs]));
  const rank = (c: BoardCard) => (c.taskType === "offer_received" ? 0 : 1);
  return [...cards].sort((a, b) => rank(a) - rank(b) || (key.get(a.key)! - key.get(b.key)!));
}

/** DETAIL ↓ in Housekeeping: longest-quiet first (stale rows; batch parents keep their place above). */
export function sortLedgerHk(cards: BoardCard[], ctx: { queries: Query[]; taskFlags: TaskFlag[] }, now: number): BoardCard[] {
  const key = new Map(cards.map((c) => [c.key, ledgerDetail(c, ctx, now).sortMs]));
  return [...cards].sort((a, b) => key.get(a.key)! - key.get(b.key)!); // earlier send-moment = longer quiet
}

/** The batch parent's TASK cell copy (A2 — the ref's wording; one source, never inline). */
export function batchTaskCopy(rule: HkGroup["rule"]): string {
  switch (rule) {
    case "dq_materials": return "Add material requirements";
    case "dq_mswl": return "Add wish lists";
    case "dq_responseTime": return "Add reply windows";
    default: return "Tidy up";
  }
}

export interface LedgerChild {
  agentId?: string;
  name: string;
  agency?: string;
  initials: string;
  done: boolean;
  /** "17 Jul" when the flow stamped resolvedAt; empty = the approved UNDATED ✓ RECORDED degrade. */
  doneDate: string;
}

/**
 * The expanded batch row's FULL cohort — every agent, partitioned by the RECORD truth
 * (agentDataQualityNeeds), recorded-first like the ref. Gap agents ride the group's own member
 * order (queried-first); item-muted gap agents still appear (the gap is a data fact — muting
 * silenced the TASK, not the record).
 */
export function batchChildren(group: HkGroup, agents: Agent[], taskFlags: TaskFlag[]): LedgerChild[] {
  const need = group.meta.need as AgentDataNeed | undefined;
  if (!need) return group.members.map((m) => ({ agentId: m.agentId, name: m.agentName, agency: m.agency, initials: m.card.initials, done: false, doneDate: "" }));
  const memberIds = new Set(group.members.map((m) => m.agentId).filter(Boolean));
  const done: LedgerChild[] = [];
  const gapExtra: LedgerChild[] = [];
  for (const a of agents) {
    if (memberIds.has(a.id)) continue;
    const hasGap = agentDataQualityNeeds(a).includes(need);
    const child: LedgerChild = {
      agentId: a.id,
      name: agentPrimary(a),
      agency: a.agency || undefined,
      initials: agentInitials(a),
      done: !hasGap,
      doneDate: !hasGap ? dShort(taskFlags.find((f) => flagMatchesTask(f, "data_quality_poor", a.id))?.resolvedAt) : "",
    };
    (hasGap ? gapExtra : done).push(child);
  }
  const members: LedgerChild[] = group.members.map((m) => ({ agentId: m.agentId, name: m.agentName, agency: m.agency, initials: m.card.initials, done: false, doneDate: "" }));
  return [...done, ...members, ...gapExtra];
}

/** The batch parent's DETAIL: the cohort progress bar caption — "{complete} OF {total}". */
export function batchDetail(group: HkGroup, agentCount: number): { pct: number; caption: string } {
  const p = hkGroupProgress(agentCount, group.members.length);
  return { pct: p.pct, caption: `${p.complete} OF ${p.total}` };
}

export const LEDGER_SECTION_CAP = 8;

/** Section truncation — top-level rows only (children never count against the cap). */
export function truncateRows<T>(rows: T[], expanded: boolean, cap: number = LEDGER_SECTION_CAP): { visible: T[]; hidden: number } {
  if (expanded || rows.length <= cap) return { visible: rows, hidden: 0 };
  return { visible: rows.slice(0, cap), hidden: rows.length - cap };
}
