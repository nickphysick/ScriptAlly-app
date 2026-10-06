/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * agentCardSave — THE save path for an agent edit, shared by the agent card and Housekeeping's fixes
 * (Agent card v1's ruling: "single-field fixes save through the same path"; Contact list v13 P5).
 *
 * What it does, in order — lifted from the card's own save so the two cannot drift:
 *   1. a SNAPSHOT first (the agent, its queries, its task flags and tasks) — no snapshot, no Undo;
 *   2. `commitAgentEdits` with the reply-time deadline fan-out riding the same batch;
 *   3. a save that clears the agent's LAST data-quality gap resolves the dashboard's flag;
 *   4. anything the caller adds after the commit (a reminder task) is captured by the snapshot's
 *      task set, so the Undo takes it back too.
 *
 * ⚠️ NEVER THROUGH `updateAgent`: that writer appends an activity, so an undo through it would append
 * a second entry — the house undo rule.
 */
import { doc } from "firebase/firestore";
import { db } from "./firebase";
import type { Agent, Query } from "../types";
import { commitAgentEdits, type AgentEditPatch, type SaveAgentResult } from "./saveAgentEdits";
import { computeAgentDeadlineWrites } from "./computeAgentDeadlineWrites";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { flagKeyForTask, type TaskFlagKey } from "./taskFlags";
import { applyPatch } from "./cardDraft";
import { restoreAgentSnapshot, takeAgentSnapshot, type AgentSnapshot } from "./agentCardSnapshot";

export interface CardSaveArgs {
  uid: string;
  agent: Agent;
  /** every query on the account — the agent's are found here */
  queries: readonly Query[];
  patch: AgentEditPatch;
  resolveTaskFlag: (key: TaskFlagKey) => Promise<unknown>;
  /** run after a successful commit, before the Undo is built (a reminder the save adds) */
  afterCommit?: () => Promise<void>;
}

export interface CardSaveOutcome {
  res: SaveAgentResult;
  /** restores the snapshot; absent when no snapshot could be taken (never an Undo that restores nothing) */
  undo?: () => Promise<boolean>;
}

export async function commitCardSave(a: CardSaveArgs): Promise<CardSaveOutcome> {
  const { uid, agent, patch } = a;
  const mine = a.queries.filter((q) => q.agentId === agent.id);
  let snap: AgentSnapshot | null = null;
  try { snap = await takeAgentSnapshot(uid, agent.id, mine.map((q) => q.id)); } catch { snap = null; }
  const extras = patch.responseTimeWeeks !== undefined
    ? computeAgentDeadlineWrites(
        mine,
        typeof patch.responseTimeWeeks === "number" ? patch.responseTimeWeeks : null,
        (queryId) => doc(db, "users", uid, "queries", queryId),
      )
    : [];
  const res = await commitAgentEdits(db, uid, agent.id, patch, extras);
  if ("error" in res) return { res };
  const after = applyPatch(agent, patch);
  if (agentDataQualityNeeds(agent).length > 0 && agentDataQualityNeeds(after).length === 0) {
    try { await a.resolveTaskFlag(flagKeyForTask("data_quality_poor", agent.id)); } catch { /* the save stands */ }
  }
  if (a.afterCommit) await a.afterCommit();
  if (!snap) return { res };
  const s = snap;
  return {
    res,
    undo: async () => {
      try { await restoreAgentSnapshot(s); return true; } catch { return false; }
    },
  };
}
