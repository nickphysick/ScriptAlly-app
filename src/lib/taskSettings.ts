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
 * incl. "Your turn to send" (the send-family key), toggles.
 */
import { Agent, Query, TaskFlag } from "../types";
import { formatDate } from "./dates";
import { MUTED_UNTIL, dismissalHolds, flagDismissed, flagSleeps, subjectChange, subjectDatesChanges } from "./taskFlags";
import { agentPrimary } from "./agentDisplay";

/** The keys a switch can toggle — each an existing `mutedTaskRules` entry the engine already honours
 *  (dq_* & no_response_close via visibleAgentNeeds/isRuleMuted) or a new one (nudge_overdue)
 *  wired in this pack. (`sunday_review` went with the weekly review, 27 Sep.) */
export type TaskSettingKey =
  | "send" | "nudge_overdue" | "dq_materials" | "dq_mswl" | "no_response_close";

export type TaskSettingGroup = "urgent" | "housekeeping";

export interface TaskSettingRow {
  key?: TaskSettingKey; // absent = locked ALWAYS ON (no preference exists at all)
  title: string;
  sub: string;
  group: TaskSettingGroup;
  locked?: boolean;
}

/** Rows + copy verbatim from the ref (§2). (The RITUALS row — the Sunday review — went with the
 *  weekly review, 27 Sep.) */
export const TASK_SETTING_ROWS: TaskSettingRow[] = [
  { group: "urgent", title: "Offers", sub: "An offer of representation always reaches your desk.", locked: true },
  { group: "urgent", key: "send", title: "Your turn to send", sub: "Requested fulls, partials, and R&R resubmissions waiting on you." },
  { group: "urgent", key: "nudge_overdue", title: "Nudge reminders", sub: "Check-back dates you’ve set, when they arrive." },
  { group: "urgent", key: "no_response_close", title: "Stale queries", sub: "Queries silent well past the agent’s usual reply time." },
  { group: "housekeeping", key: "dq_materials", title: "Missing materials lists", sub: "Agents whose submission requirements you haven’t recorded." },
  { group: "housekeeping", key: "dq_mswl", title: "Missing wish lists", sub: "Agents without a recorded wish list." },
];

export const GROUP_LABEL: Record<TaskSettingGroup, string> = {
  urgent: "The work itself",
  housekeeping: "Housekeeping",
};

/* ⚠️ `typeIsOn` AND `setTypeMute` ARE GONE. They were the retired settings sheet's switch ↔
   `mutedTaskRules` mapping, and nothing else ever called them: the board's set-aside panel removes
   a rule key directly as the inverse of the hiding, and `TASK_SETTING_ROWS` survives because the
   ledger reads it for the rules' plain-English names.
   ⚠️ `HIDDEN_RULE_KEYS` IS GONE with `hiddenItems` (To-do list v5.1 §I.7): it hid two of the rule keys —
   `nudge_overdue` and `send` — from the list, so those switched-off rules had no way back from the board. */

// ── SET ASIDE (To-do list v5.1 §I.7 — replaces Phase 3's `hiddenItems`) ──────────────────────────

/* ⚠️ THE ONE LIST OF WHAT IS SET ASIDE. Three kinds, three return rules, one derivation every surface reads (the desk's
   Set aside tab, the header's "Set aside · k", the phone page's panel):
   · SNOOZE — a flag sleeping until a day after today. Back on its day; "Bring it back now" clears it.
   · DISMISS — a flag with `skippedAt` that still HOLDS (taskFlags.dismissalHolds: nothing newer on its subject), and the
     legacy permanent mutes (`snoozedUntil === MUTED_UNTIL`, the old `dismissedTasks` migration) — which ARE dismissals
     and are never shown as a date ("back 1 Jan 3000" would be a plausible number stating something untrue).
   · RULE — every key in `mutedTaskRules`, each "for every agent". `mutedTaskRules` is a bare string[]: it records no
     time, so no "since" date is ever shown for one.
   ⚠️ EACH KIND RESTORES THROUGH ITS OWN FIELD. Phase 3's panel restored everything by clearing `snoozedUntil`, so a
      restored DISMISSAL kept its `skippedAt` and stayed hidden — "Restore" did nothing, silently. */

/** the rule keys the engine honours, by name — "Switched off" rows, and the words "Stop asking about …" uses */
export const RULE_TITLE: Record<string, string> = {
  send: "Your turn to send",
  nudge_overdue: "Nudge reminders",
  no_response_close: "Stale queries",
  dq_materials: "Missing submission details",
  dq_mswl: "Missing wishlists",
  dq_responseTime: "Missing reply times",
};
/** the same rule, in a sentence: "Stop asking about missing reply times, for every agent" */
export const RULE_PLAIN: Record<string, string> = {
  dq_materials: "missing submission details",
  dq_mswl: "missing wishlists",
  dq_responseTime: "missing reply times",
};

export type SetAsideKind = "snooze" | "dismiss" | "rule";
export interface SetAsideItem {
  id: string;
  kind: SetAsideKind;
  /** the flag behind a snooze or a dismissal */
  flag?: TaskFlag;
  /** a dismissal from the old permanent mute: no date is stored, and none is shown */
  legacy?: boolean;
  /** a snooze's return (ISO) */
  until?: string;
  /** a dismissal's moment (ISO); absent for a legacy mute */
  at?: string;
  /** whether the subject dates changes (a query does; an agent does not — back only when brought back) */
  datesChanges?: boolean;
  /** a switched-off rule's key */
  rule?: string;
  /** the rule's name, or the subject's */
  label: string;
  who: string;
  /** how to bring it back: a rule leaves `mutedTaskRules`; a flag has ONE field cleared */
  restore: { rule: string } | { flag: { taskType: string; queryId?: string; agentId?: string }; patch: { snoozedUntil?: null; skippedAt?: null; unbumpSnooze?: boolean } };
}

const flagSubject = (f: TaskFlag, agents: Agent[], queries: Query[]): { who: string; exists: boolean } => {
  const q = f.queryId ? queries.find((x) => x.id === f.queryId) : undefined;
  const ag = agents.find((a) => a.id === (q ? q.agentId : f.agentId ?? f.queryId));
  const exists = f.taskType === "user_task" ? true : f.agentId ? !!agents.find((a) => a.id === f.agentId) : !!q;
  return { who: ag ? agentPrimary(ag) : "", exists };
};

export function setAsideItems(
  user: { mutedTaskRules?: string[] | null } | null | undefined,
  taskFlags: TaskFlag[],
  agents: Agent[],
  queries: Query[],
  nowMs: number,
  activities: readonly { queryId?: string; date: string }[] = [],
): SetAsideItem[] {
  const rules: SetAsideItem[] = (user?.mutedTaskRules ?? [])
    .filter((r) => r in RULE_TITLE)
    .map((r) => ({ id: `rule-${r}`, kind: "rule" as const, rule: r, label: RULE_TITLE[r], who: "For every agent", restore: { rule: r } }));

  const snoozes: SetAsideItem[] = [];
  const dismissals: SetAsideItem[] = [];
  for (const f of taskFlags) {
    /* an offer's snooze is the "I need time" quiet reminder — the card stays on the board, so it is not set aside */
    if (f.taskType === "offer_received" || f.resolvedAt) continue;
    const { who, exists } = flagSubject(f, agents, queries);
    if (!exists) continue; // nothing to bring back
    const key = { taskType: f.taskType, ...(f.queryId ? { queryId: f.queryId } : {}), ...(f.agentId ? { agentId: f.agentId } : {}) };
    if (flagDismissed(f)) {
      if (!dismissalHolds(f, subjectChange(f, activities)?.ms)) continue; // something newer: it is back
      dismissals.push({ id: `flag-${f.id}`, kind: "dismiss", flag: f, at: f.skippedAt, datesChanges: subjectDatesChanges(f), label: f.taskType, who, restore: { flag: key, patch: { skippedAt: null } } });
    } else if (f.snoozedUntil === MUTED_UNTIL) {
      dismissals.push({ id: `flag-${f.id}`, kind: "dismiss", flag: f, legacy: true, datesChanges: false, label: f.taskType, who, restore: { flag: key, patch: { snoozedUntil: null } } });
    } else if (flagSleeps(f, nowMs)) {
      snoozes.push({ id: `flag-${f.id}`, kind: "snooze", flag: f, until: f.snoozedUntil, label: f.taskType, who, restore: { flag: key, patch: { snoozedUntil: null, unbumpSnooze: true } } });
    }
  }
  snoozes.sort((a, b) => Date.parse(a.until!) - Date.parse(b.until!));
  dismissals.sort((a, b) => (b.at ? Date.parse(b.at) : -Infinity) - (a.at ? Date.parse(a.at) : -Infinity));
  return [...snoozes, ...dismissals, ...rules];
}

const KIND_WORD: Record<string, string> = {
  offer_received: "offer", nudge_overdue: "nudge", no_response_close: "stale query", partial_requested: "request",
  full_requested: "request", revise_resubmit: "R&R", data_quality_poor: "record gap", materials_unrecorded: "record gap",
  materials_unrecorded_bulk: "record gap", user_task: "your task",
};
/** the panel's bold lead: "Tom Ellery — nudge", or the rule's name */
export const setAsideLabel = (i: SetAsideItem): string =>
  i.kind === "rule" ? i.label : `${i.who || "A query"} — ${KIND_WORD[i.flag?.taskType ?? ""] ?? "task"}`;
/** the panel's mono line: what it is and, only where one is stored, when */
export const setAsideMeta = (i: SetAsideItem): string => {
  if (i.kind === "rule") return "SWITCHED OFF · FOR EVERY AGENT";
  if (i.kind === "snooze") { const ms = Date.parse(i.until!); return `SNOOZED UNTIL ${formatDate(new Date(ms), { day: "numeric", month: "short" })}`; }
  if (i.legacy || !i.at) return "DISMISSED";
  return `DISMISSED ${formatDate(new Date(Date.parse(i.at)), { day: "numeric", month: "short" })}`;
};
