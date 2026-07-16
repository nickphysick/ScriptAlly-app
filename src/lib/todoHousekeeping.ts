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
import { Agent } from "../types";
import { AgentDataNeed, agentDataQualityNeeds, AgentDataQualityInput } from "./agentDataQuality";
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
  agentId?: string; // set for dq_* rules (the write target)
  queryId?: string; // set for no_response_close (the write target)
}

export interface HkGroup {
  rule: HkRule;
  meta: HkRuleMeta;
  members: HkMember[];
}

/**
 * Expand the flat per-record housekeeping cards into per-RULE groups. One data-quality agent-card
 * joins one group per un-muted gap it has (so a triple-gap agent appears in three groups); one
 * no_response card joins the stale-query group. Muted rules produce no group. Order is HK_RULE_ORDER.
 */
export function groupHousekeeping(hkCards: BoardCard[], agents: Agent[], muted?: string[] | null): HkGroup[] {
  const byRule = new Map<HkRule, HkMember[]>();
  const push = (rule: HkRule, m: HkMember) => {
    const list = byRule.get(rule) ?? [];
    list.push(m);
    byRule.set(rule, list);
  };

  for (const card of hkCards) {
    if (card.taskType === "data_quality_poor") {
      const agent = agents.find((a) => a.id === card.relatedRecordId);
      if (!agent) continue;
      for (const need of visibleAgentNeeds(agent, muted)) {
        push(ruleForNeed(need), { card, agentName: card.who || agent.name || "an agent", agentId: agent.id });
      }
    } else if (card.taskType === "no_response_close") {
      if (isRuleMuted("no_response_close", muted)) continue;
      push("no_response_close", { card, agentName: card.who || "an agent", queryId: card.relatedRecordId });
    }
  }

  return HK_RULE_ORDER.filter((r) => byRule.has(r)).map((r) => ({ rule: r, meta: HK_RULES[r], members: byRule.get(r)! }));
}

/**
 * The total GAP count across groups — the number the ribbon tile + Housekeeping lane badge show
 * (the underlying workload: sum of members, never the pile count; the mockup's 25 = 12 + 9 + 4).
 * Muted rules/needs are already excluded by groupHousekeeping, so this is the un-muted gap count.
 */
export function hkGapCount(groups: HkGroup[]): number {
  return groups.reduce((n, g) => n + g.members.length, 0);
}
