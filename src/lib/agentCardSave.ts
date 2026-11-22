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
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Agent, Query } from "../types";
import { commitAgentEdits, type AgentEditPatch, type SaveAgentResult } from "./saveAgentEdits";
import { computeAgentDeadlineWrites } from "./computeAgentDeadlineWrites";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { flagKeyForTask, type TaskFlagKey } from "./taskFlags";
import { applyPatch } from "./cardDraft";
import { restoreAgentSnapshot, takeAgentSnapshot, type AgentSnapshot } from "./agentCardSnapshot";
import { restoreSnapshot, takeSnapshot, type Snapshot } from "./queryActions/snapshot";
import { writerExpectedWrite } from "./expectedDate";
import { dayIso } from "./queryActions/dates";
import type { OfferPlan } from "./cardOffers";

export interface CardSaveArgs {
  uid: string;
  agent: Agent;
  /** every query on the account — the agent's are found here */
  queries: readonly Query[];
  patch: AgentEditPatch;
  resolveTaskFlag: (key: TaskFlagKey) => Promise<unknown>;
  /** run after a successful commit, before the Undo is built (a reminder the save adds) */
  afterCommit?: () => Promise<void>;
  /** Card offers v1 — what the writer chose for the queries already out (`offerPlan`) */
  offers?: OfferPlan | null;
  /** Card offers v1 — the app's one close-as-no-reply path (`saveClose` with `noreplyAnswers`), for a query the plan closes */
  closeQuery?: (q: Query) => Promise<void>;
}

export interface CardSaveOutcome {
  res: SaveAgentResult;
  /** restores the snapshot; absent when no snapshot could be taken (never an Undo that restores nothing) */
  undo?: () => Promise<boolean>;
  /** Card offers v1 — queries whose write did not land (the agent's stands) */
  failed?: string[];
}

export async function commitCardSave(a: CardSaveArgs): Promise<CardSaveOutcome> {
  const { uid, agent, patch } = a;
  const mine = a.queries.filter((q) => q.agentId === agent.id);
  let snap: AgentSnapshot | null = null;
  try { snap = await takeAgentSnapshot(uid, agent.id, mine.map((q) => q.id)); } catch { snap = null; }
  /* Card offers v1 — a close writes activity rows, which the agent's snapshot does not hold: the query drawer's snapshot
     of those queries (their logs, feed rows, flags and tasks) rides beside it, so Undo puts back everything */
  const plan = a.offers ?? null;
  const closing = plan ? mine.filter((q) => plan.close.includes(q.id)) : [];
  const held = new Set([...(plan?.keep.map((k) => k.id) ?? []), ...closing.map((q) => q.id)]);
  let qsnap: Snapshot | null = null;
  if (closing.length) { try { qsnap = await takeSnapshot(uid, closing.map((q) => q.id)); } catch { qsnap = null; } }
  const extras = patch.responseTimeWeeks !== undefined
    ? computeAgentDeadlineWrites(
        /* a query kept on its dates, or closing, keeps its stored deadline too */
        mine.filter((q) => !held.has(q.id)),
        typeof patch.responseTimeWeeks === "number" ? patch.responseTimeWeeks : null,
        (queryId) => doc(db, "users", uid, "queries", queryId),
      )
    : [];
  const res = await commitAgentEdits(db, uid, agent.id, patch, extras);
  if ("error" in res) return { res };
  /* the queries' own writes, each on its own after the agent's: a query that fails is named, and the agent's write stands */
  const failed: string[] = [];
  const ref = (id: string) => doc(db, "users", uid, "queries", id);
  if (plan) {
    /* Update its dates: the reply date moves by itself (it is derived); a stored nudge that sat where the old window put it moves */
    for (const m of plan.moveNudge) { try { await updateDoc(ref(m.id), { nudgeDate: dayIso(new Date(m.nudgeMs)) }); } catch { failed.push(m.id); } }
    /* Keep them as they are: the old date, held as the query's own (stamped, so it wins on recency); the nudge stays */
    for (const k of plan.keep) { try { await updateDoc(ref(k.id), writerExpectedWrite(dayIso(new Date(k.expMs)))); } catch { failed.push(k.id); } }
    /* Close it as no reply: the app's one path (status, activity row, nudge removed, the Wall of no) */
    for (const q of closing) {
      if (!a.closeQuery) { failed.push(q.id); continue; }
      try { await a.closeQuery(q); } catch { failed.push(q.id); }
    }
  }
  const after = applyPatch(agent, patch);
  if (agentDataQualityNeeds(agent).length > 0 && agentDataQualityNeeds(after).length === 0) {
    try { await a.resolveTaskFlag(flagKeyForTask("data_quality_poor", agent.id)); } catch { /* the save stands */ }
  }
  if (a.afterCommit) await a.afterCommit();
  /* no snapshot, no Undo — and a close whose own snapshot could not be taken has no Undo either */
  if (!snap || (closing.length && !qsnap)) return { res, failed };
  const s = snap;
  const qs = qsnap;
  return {
    res,
    failed,
    undo: async () => {
      try { if (qs) await restoreSnapshot(qs); await restoreAgentSnapshot(s); return true; } catch { return false; }
    },
  };
}
