/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoHousekeeping — the PURE model behind Phase 5 "housekeeping at scale": the rule catalogue, the
 * two mute scopes, and the by-RULE grouping the Housekeeping column renders (one card per rule, not
 * per record).
 *
 * A "rule" is a single fixable gap, finer than the engine task type: the `data_quality_poor` task
 * (one per agent) spans up to THREE rules — a missing reply window, a missing materials list, a
 * missing wish list — so a batch drawer fixes ONE homogeneous field across many agents. The
 * `no_response_close` task is its own rule (a decision, not data to fill — never assistable).
 *
 * Mute has two scopes, matching the stores that already exist:
 *   · ITEM  — "stop asking about THIS agent" → a TaskFlag snoozed to MUTED_UNTIL (taskFlags.ts).
 *   · RULE  — "stop asking about reply windows everywhere" → the rule key in User.mutedTaskRules.
 * Muting only silences the reminder; it never deletes the underlying gap. The rule mute is applied
 * once, at the engine's task filter (db.tsx) via `taskSurvivesMute`, so it propagates to every
 * consumer (board + dashboard attention chip) from a single point.
 *
 * Nothing here is stored; unit-locked in todoHousekeeping.test.ts.
 */
import { Agent, Query, TaskFlag } from "../types";
import { AgentDataNeed, agentDataQualityNeeds, AgentDataQualityInput } from "./agentDataQuality";
import { isFlagSuppressing } from "./taskFlags";
import { BoardCard } from "./todoBoard";

/** A fixable housekeeping gap. The three `dq_*` map 1:1 to an AgentDataNeed; the fourth is a query decision. */
export type HkRule = "dq_responseTime" | "dq_materials" | "dq_mswl" | "no_response_close";

/** The single agent field a data-quality rule writes (absent for the query-decision rule). */
export type HkField = "responseTimeWeeks" | "materialsWanted" | "mswlNotes";

export interface HkRuleMeta {
  rule: HkRule;
  need?: AgentDataNeed; // the three dq_* rules only
  taskType: "data_quality_poor" | "no_response_close";
  label: string; // short pill label, e.g. "Reply windows"
  title: (n: number) => string; // group-card headline, e.g. "3 agents have no reply window"
  field?: HkField;
  assistable: boolean; // Pro "Find these for me" supported (web-findable facts, not a decision)
}

const plur = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const HK_RULES: Record<HkRule, HkRuleMeta> = {
  no_response_close: {
    rule: "no_response_close",
    taskType: "no_response_close",
    label: "Stale queries",
    title: (n) => `${n} ${plur(n, "query has", "queries have")} gone quiet`,
    assistable: false,
  },
  dq_responseTime: {
    rule: "dq_responseTime",
    need: "responseTime",
    taskType: "data_quality_poor",
    label: "Reply windows",
    title: (n) => `${n} ${plur(n, "agent has", "agents have")} no reply window`,
    field: "responseTimeWeeks",
    assistable: true,
  },
  dq_materials: {
    rule: "dq_materials",
    need: "materials",
    taskType: "data_quality_poor",
    label: "Materials wanted",
    title: (n) => `${n} ${plur(n, "agent is", "agents are")} missing a materials list`,
    field: "materialsWanted",
    assistable: true,
  },
  dq_mswl: {
    rule: "dq_mswl",
    need: "mswl",
    taskType: "data_quality_poor",
    label: "Wish lists",
    title: (n) => `${n} ${plur(n, "agent has", "agents have")} no wish list`,
    field: "mswlNotes",
    assistable: true,
  },
};

/** Stable render order — the query decision first (most consequential), then the data gaps. */
export const HK_RULE_ORDER: HkRule[] = ["no_response_close", "dq_responseTime", "dq_materials", "dq_mswl"];

const NEED_TO_RULE: Record<AgentDataNeed, HkRule> = {
  responseTime: "dq_responseTime",
  materials: "dq_materials",
  mswl: "dq_mswl",
};

/** The rule a per-field agent need belongs to. */
export function ruleForNeed(need: AgentDataNeed): HkRule {
  return NEED_TO_RULE[need];
}

// ── mute ─────────────────────────────────────────────────────────────────────

export function isRuleMuted(rule: string, muted?: string[] | null): boolean {
  return !!muted && muted.includes(rule);
}

/** An agent's data-quality needs, minus any rule the writer has muted app-wide. */
export function visibleAgentNeeds(agent: AgentDataQualityInput, muted?: string[] | null): AgentDataNeed[] {
  return agentDataQualityNeeds(agent).filter((n) => !isRuleMuted(ruleForNeed(n), muted));
}

/**
 * Engine filter — does this derived task survive the writer's app-wide rule mutes? Applied at the
 * task-emission filter in db.tsx so muting silences the reminder everywhere from one place.
 * `data_quality_poor` dies only when ALL its remaining gaps are muted; `no_response_close` when its
 * own rule is muted; every other task type is unaffected.
 */
export function taskSurvivesMute(taskType: string, agent: Agent | undefined, muted?: string[] | null): boolean {
  if (taskType === "no_response_close") return !isRuleMuted("no_response_close", muted);
  if (taskType === "data_quality_poor") return !agent || visibleAgentNeeds(agent, muted).length > 0;
  return true;
}

// ── grouping ─────────────────────────────────────────────────────────────────

export interface HkMember {
  card: BoardCard;
  agentName: string;
  agency?: string; // batch-row second line
  agentId?: string; // the write target (dq_* rules)
  queried: boolean; // has ≥1 query — sorts first in a group (burgundy pip)
}

export interface HkGroup {
  rule: HkRule;
  meta: HkRuleMeta;
  members: HkMember[];
}

/**
 * Expand the flat per-record housekeeping cards into per-RULE groups — DATA-QUALITY RULES ONLY. One
 * agent-card joins one group per un-muted gap it has (a triple-gap agent appears in three groups).
 * `no_response_close` (stale) is DELIBERATELY NOT GROUPED — closing a query is a real one-off
 * decision, never batched; stale cards render individually in the lane. Muted rules produce no
 * group. Every agent is included, queried or not (good data on an unqueried agent decides whether
 * to query them); QUERIED agents sort first within each group (stable). Order is HK_RULE_ORDER.
 */
export function groupHousekeeping(hkCards: BoardCard[], agents: Agent[], muted?: string[] | null, queries?: Query[]): HkGroup[] {
  const byRule = new Map<HkRule, HkMember[]>();
  const push = (rule: HkRule, m: HkMember) => {
    const list = byRule.get(rule) ?? [];
    list.push(m);
    byRule.set(rule, list);
  };

  const queriedIds = new Set((queries ?? []).map((q) => q.agentId));
  for (const card of hkCards) {
    if (card.taskType !== "data_quality_poor") continue; // stale (no_response_close) stays individual
    const agent = agents.find((a) => a.id === card.relatedRecordId);
    if (!agent) continue;
    for (const need of visibleAgentNeeds(agent, muted)) {
      push(ruleForNeed(need), {
        card,
        agentName: card.who || agent.name || "an agent",
        ...(agent.agency ? { agency: agent.agency } : {}),
        agentId: agent.id,
        queried: queriedIds.has(agent.id),
      });
    }
  }

  return HK_RULE_ORDER.filter((r) => byRule.has(r)).map((r) => ({
    rule: r,
    meta: HK_RULES[r],
    members: byRule.get(r)!.slice().sort((a, b) => Number(b.queried) - Number(a.queried)), // queried-first, stable
  }));
}

/**
 * The total GAP count across groups — the number the ribbon tile + Housekeeping lane badge show
 * (the underlying workload: sum of members, never the pile count). Stale queries left grouping
 * (individual cards), so the lane/tile total = hkGapCount(groups) + the stale-card count — the page
 * adds them; the mockup's 25 = 12 + 9 (gaps) + 4 (stale).
 */
export function hkGapCount(groups: HkGroup[]): number {
  return groups.reduce((n, g) => n + g.members.length, 0);
}

export interface MutedMember {
  agentId: string;
  agentName: string;
}

/**
 * Item-MUTED members for one data-quality rule — agents that still have the gap but whose
 * `data_quality_poor` flag is snoozed (incl. the far-future indefinite mute), so the engine filtered
 * them out of the live board. Feeds the batch drawer's "n muted — show" link; Unmute clears the
 * snooze (`upsertTaskFlag(…, { snoozedUntil: null })`) and the engine resurfaces them. Muting never
 * deleted anything — the gap was on the profile all along.
 */
export function mutedMembersForRule(rule: HkRule, agents: Agent[], taskFlags: TaskFlag[], now: number): MutedMember[] {
  const need = HK_RULES[rule].need;
  if (!need) return []; // stale is never batched, so it has no batch-drawer muted list
  return agents
    .filter((a) => agentDataQualityNeeds(a).includes(need))
    .filter((a) => {
      const f = taskFlags.find((fl) => fl.taskType === "data_quality_poor" && fl.agentId === a.id);
      return !!f && isFlagSuppressing(f, now);
    })
    .map((a) => ({ agentId: a.id, agentName: a.name || a.agency || "an agent" }));
}
