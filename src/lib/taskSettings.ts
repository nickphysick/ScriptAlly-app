/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskSettings — the pure layer of the "What lands on your desk?" sheet (design ref
 * design-refs/todo-task-settings-v2.html). Type-level preferences are stored in the EXISTING
 * `User.mutedTaskRules: string[]` (allowlisted, no new field / no rules edit — recon gate a): a
 * switch OFF = its key present; ON = absent. The engine's ONE suppression point
 * (`todoHousekeeping.taskSurvivesMute`, applied in the `activeTasks` filter) already reads these
 * keys, so board, post-it counts, dashboard Over-to-you and the Walk-me-through sublabel all agree
 * by construction (recon gate b).
 *
 * Offers is the ONLY ALWAYS-ON row (no key — never a stored-but-ignored flag); everything else,
 * incl. "Your turn to send" (the send-family key), toggles. The Sunday-review key gates the CARD
 * only; the torn scrap ignores it.
 */
import { Agent, Query, TaskFlag } from "../types";
import { MUTED_UNTIL } from "./taskFlags";
import { agentPrimary } from "./agentDisplay";

/** The keys a switch can toggle — each an existing `mutedTaskRules` entry the engine already honours
 *  (dq_* & no_response_close via visibleAgentNeeds/isRuleMuted) or a new one (nudge_overdue,
 *  sunday_review) wired in this pack. */
export type TaskSettingKey =
  | "send" | "nudge_overdue" | "dq_materials" | "dq_mswl" | "no_response_close" | "sunday_review";

export type TaskSettingGroup = "urgent" | "housekeeping" | "rituals";

export interface TaskSettingRow {
  key?: TaskSettingKey; // absent = locked ALWAYS ON (no preference exists at all)
  title: string;
  sub: string;
  group: TaskSettingGroup;
  locked?: boolean;
}

/** Rows + copy verbatim from the ref (§2), plus the RITUALS row the pack specifies (absent from
 *  the reused ref file — added per the pack's explicit Phase 1/2/3 instruction). */
export const TASK_SETTING_ROWS: TaskSettingRow[] = [
  { group: "urgent", title: "Offers", sub: "An offer of representation always reaches your desk.", locked: true },
  { group: "urgent", key: "send", title: "Your turn to send", sub: "Requested fulls, partials, and R&R resubmissions waiting on you." },
  { group: "urgent", key: "nudge_overdue", title: "Nudge reminders", sub: "Check-back dates you’ve set, when they arrive." },
  { group: "urgent", key: "no_response_close", title: "Stale queries", sub: "Queries silent well past the agent’s usual reply time." },
  { group: "housekeeping", key: "dq_materials", title: "Missing materials lists", sub: "Agents whose submission requirements you haven’t recorded." },
  { group: "housekeeping", key: "dq_mswl", title: "Missing wish lists", sub: "Agents without a recorded wish list." },
  { group: "rituals", key: "sunday_review", title: "The Sunday review", sub: "The Sunday invitation card. The quiet “Last week in review” scrap stays either way." },
];

export const GROUP_LABEL: Record<TaskSettingGroup, string> = {
  urgent: "The work itself",
  housekeeping: "Housekeeping",
  rituals: "Rituals",
};

/** A switch is ON when its key is NOT in the muted set. */
export function typeIsOn(key: TaskSettingKey, muted?: string[] | null): boolean {
  return !(muted ?? []).includes(key);
}

/** The next `mutedTaskRules` array after flipping a switch — pure; the component writes it via
 *  updateUserProfile. ON removes the key; OFF adds it (deduped). */
export function setTypeMute(key: TaskSettingKey, muted: string[] | null | undefined, on: boolean): string[] {
  const cur = muted ?? [];
  return on ? cur.filter((k) => k !== key) : Array.from(new Set([...cur, key]));
}

// ── HIDDEN RIGHT NOW (Phase 3) ──────────────────────────────────────────────

/** The rule keys that appear in the hidden list as "MUTED AS A RULE" — the fork-created housekeeping
 *  + stale rule-mutes (dq_* & no_response_close). nudge_overdue / sunday_review are settings-only
 *  preferences (no board "set aside" path) and are NOT listed — their switch is their control. */
const HIDDEN_RULE_KEYS: ReadonlySet<string> = new Set(["dq_materials", "dq_mswl", "dq_responseTime", "no_response_close"]);
const RULE_TITLE: Record<string, string> = {
  dq_materials: "Missing submission material details",
  dq_mswl: "Missing wish lists",
  dq_responseTime: "Missing reply windows",
  no_response_close: "Stale queries",
};

export type HiddenKind = "rule" | "dismissed" | "snoozed";
export interface HiddenItem {
  id: string; // stable key for React + restore targeting
  kind: HiddenKind;
  label: string; // bold lead
  meta: string; // "MUTED AS A RULE" / "DISMISSED" / "SNOOZED UNTIL 24 Jul"
  /** How to restore: a rule key (remove from mutedTaskRules) OR a flag key (unset snoozedUntil). */
  restore: { rule: string } | { flag: { taskType: string; queryId?: string; agentId?: string } };
}

const shortDate = (iso: string): string => {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const flagSubject = (f: TaskFlag, agents: Agent[], queries: Query[]): string => {
  const q = f.queryId ? queries.find((x) => x.id === f.queryId) : undefined;
  const ag = agents.find((a) => a.id === (q ? q.agentId : f.agentId ?? f.queryId));
  return ag ? agentPrimary(ag) : "A query";
};

const kindLabel: Record<string, string> = {
  offer_received: "offer", nudge_overdue: "nudge", no_response_close: "stale query",
  partial_requested: "request", full_requested: "request", revise_resubmit: "R&R", data_quality_poor: "record gap",
};

/**
 * Every individually-hidden item, newest-first: rule-mutes (no stored date), permanent dismisses
 * (snoozedUntil === MUTED_UNTIL — the fork's "Never just this"), and live snoozes (a finite future
 * snoozedUntil). Snoozes ARE listed with their return date (the pack lists all three kinds; the
 * ref's setfoot excluded them — pack wins, and a listed snooze gains an early Restore).
 */
export function hiddenItems(
  mutedTaskRules: string[] | null | undefined,
  taskFlags: TaskFlag[],
  agents: Agent[],
  queries: Query[],
  nowMs: number,
): HiddenItem[] {
  const rules: HiddenItem[] = (mutedTaskRules ?? [])
    .filter((r) => HIDDEN_RULE_KEYS.has(r))
    .map((r) => ({ id: `rule-${r}`, kind: "rule" as const, label: RULE_TITLE[r] ?? r, meta: "MUTED AS A RULE", restore: { rule: r } }));

  const flags: HiddenItem[] = taskFlags
    .filter((f) => !!f.snoozedUntil)
    .map((f) => {
      const su = f.snoozedUntil!;
      const permanent = su === MUTED_UNTIL;
      const ms = Date.parse(su);
      const future = !Number.isNaN(ms) && ms > nowMs;
      if (!permanent && !future) return null; // an expired snooze is not "hidden" any more
      const subject = flagSubject(f, agents, queries);
      const kindTxt = kindLabel[f.taskType] ?? "task";
      return {
        id: `flag-${f.id}`,
        kind: (permanent ? "dismissed" : "snoozed") as HiddenKind,
        label: `${subject} — ${kindTxt}`,
        meta: permanent ? "DISMISSED" : `SNOOZED UNTIL ${shortDate(su)}`,
        restore: { flag: { taskType: f.taskType, ...(f.queryId ? { queryId: f.queryId } : {}), ...(f.agentId ? { agentId: f.agentId } : {}) } },
        _sort: permanent ? Number.MAX_SAFE_INTEGER : ms,
      } as HiddenItem & { _sort: number };
    })
    .filter((x): x is HiddenItem & { _sort: number } => x != null)
    .sort((a, b) => b._sort - a._sort)
    .map(({ _sort, ...rest }) => rest);

  return [...rules, ...flags];
}
