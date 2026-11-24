/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * hkSave — THE housekeeping batch save. The focus-flow group sheet AND the quick rail's card-flip
 * both call this one function (the pack's "same batch save — do not build a third"): writes ONLY
 * filled rows through the existing `updateAgent`, per-row error isolation, provenance attached when
 * a found value is saved UNEDITED (withProvenance), the agent's dq flag resolved when this was its
 * last gap (feeds "cleared today"), and previous values captured for a single Undo-all.
 */
import { Agent } from "../types";
import { agentSweepActivity } from "./feedHouse";
import type { ActivityInput } from "./activityWrite";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { flagKeyForTask, TaskFlagKey } from "./taskFlags";
import { HkGroup, HK_RULES } from "./todoHousekeeping";
import { withProvenance, AssistFound } from "./assistFill";

export interface HkSaveDeps {
  agents: Agent[];
  updateAgent: (id: string, fields: Partial<Agent>, opts?: { quiet?: boolean }) => Promise<void>;
  resolveTaskFlag: (key: TaskFlagKey) => void | Promise<void>;
  /**
   * Feed wording v1 — a sweep of SEVERAL agents writes ONE row for the lot ("You updated 6 agents' details"), so each
   * agent's own write goes quiet. Absent: every agent narrates its own row, as before. A sweep of one is always an
   * ordinary update.
   */
  addActivity?: (act: ActivityInput) => Promise<unknown>;
  /** the Undo takes the sweep's row back with the values */
  deleteActivity?: (id: string) => Promise<void>;
}

export interface HkSaveResult {
  ok: number;
  failed: number;
  /** Restores the captured previous values through the same updateAgent (best effort). */
  undo?: () => Promise<void>;
}

export async function saveHkRows(
  group: HkGroup,
  rows: Record<string, string>,
  noMeansNo: Record<string, boolean>,
  found: Record<string, AssistFound>,
  nowIso: string,
  deps: HkSaveDeps,
): Promise<HkSaveResult> {
  const prevs: { agentId: string; patch: Partial<Agent> }[] = [];
  let ok = 0;
  let failed = 0;
  const filled = group.members.filter((m) => m.agentId && (rows[m.agentId] ?? "").trim()).length;
  const sweep = filled >= 2 && !!deps.addActivity;
  for (const m of group.members) {
    const id = m.agentId ?? "";
    const v = (rows[id] ?? "").trim();
    if (!v || !m.agentId) continue; // writes ONLY filled rows
    const agent = deps.agents.find((a) => a.id === m.agentId);
    try {
      let patch: Partial<Agent> =
        group.rule === "dq_responseTime" ? { responseTimeWeeks: Number(v), noResponseMeansNo: !!noMeansNo[id] }
        : group.rule === "dq_materials" ? { materialsWanted: v.split(",").map((s) => s.trim()).filter(Boolean) }
        : { mswlNotes: v };
      // Provenance persists ONLY when the found value is saved unedited — an edited value is the writer's own.
      const f = found[id];
      if (f && v === f.value) patch = withProvenance(patch, HK_RULES[group.rule].field!, f, agent?.fieldSources, nowIso);
      if (agent) {
        const prev: Partial<Agent> = {};
        if (group.rule === "dq_responseTime") { prev.responseTimeWeeks = agent.responseTimeWeeks ?? 0; prev.noResponseMeansNo = agent.noResponseMeansNo ?? false; }
        else if (group.rule === "dq_materials") prev.materialsWanted = (agent.materialsWanted ?? []) as Agent["materialsWanted"];
        else prev.mswlNotes = agent.mswlNotes ?? "";
        if (patch.fieldSources) prev.fieldSources = agent.fieldSources ?? {};
        prevs.push({ agentId: m.agentId, patch: prev });
      }
      await deps.updateAgent(m.agentId, patch, sweep ? { quiet: true } : undefined);
      // Fully-fixed agent (this was their last gap) → resolvedAt feeds "cleared today".
      if (agent && agentDataQualityNeeds(agent).length === 1) deps.resolveTaskFlag(flagKeyForTask("data_quality_poor", m.agentId));
      ok++;
    } catch {
      failed++;
    }
  }
  /* the sweep's one row, once the agents have landed — narration, so a failure never fails the save */
  let sweepId: string | null = null;
  if (sweep && ok >= 2) {
    sweepId = "act-sweep-" + Math.random().toString(36).slice(2, 11);
    try { await deps.addActivity!({ id: sweepId, ...agentSweepActivity(ok, nowIso) }); } catch { sweepId = null; }
  }
  const undo = prevs.length
    ? async () => {
        for (const u of prevs) { try { await deps.updateAgent(u.agentId, u.patch, sweep ? { quiet: true } : undefined); } catch { /* best effort */ } }
        if (sweepId && deps.deleteActivity) { try { await deps.deleteActivity(sweepId); } catch { /* best effort */ } }
      }
    : undefined;
  return { ok, failed, undo };
}
