/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2, Phase 4 — THE AGENT'S QUERIES AS THE QUERY CARD'S THREADS. For each query to the open agent, its own
 * activity log (users/{uid}/queries/{id}/activity, the Query Centre's listener) and the query card's own derivation
 * (`buildCardView`, the To-do preview's second caller) — so History's bubbles are the Tracking tab's, step for step.
 *
 * ⚠️ ONE LISTENER PER QUERY OF THE OPEN AGENT ONLY, never one per row; they close when the card closes or pages.
 * ⚠️ A CARD WITH NO DATABASE (a test render) gets no threads: History says so rather than guessing.
 */
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";
import { db as fsdb } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { packagesUnlocked } from "../../../lib/entitlements";
import { quietWeeksOf } from "../../../lib/queryState";
import { buildCardView, stampedCardRows } from "../../queries/centre/qcCardView";
import type { Query } from "../../../types";
import type { ThreadReadProps } from "../../queries/centre/QcThreadRead";

export type AgentThread = Omit<ThreadReadProps, "first" | "initials"> & { manuscriptId: string; title: string; lastMs: number; loaded: boolean };

export function useAgentThreads(agentId: string, toAgent: readonly Query[], titleOf: (id: string) => string, nowMs: number): AgentThread[] {
  const db = useScriptAllyDb();
  const uid = db.currentUser?.id ?? null;
  const ids = toAgent.map((q) => q.id).sort().join("|");
  const [logs, setLogs] = useState<Record<string, Record<string, unknown>[]>>({});
  useEffect(() => {
    setLogs({});
    if (!uid || !ids) return undefined;
    const offs = ids.split("|").map((id) => onSnapshot(
      fsQuery(collection(fsdb, "users", uid, "queries", id, "activity"), orderBy("createdAt", "asc")),
      (s) => setLogs((x) => ({ ...x, [id]: s.docs.map((d) => ({ id: d.id, ...d.data() })) })),
      () => setLogs((x) => ({ ...x, [id]: [] })),
    ));
    return () => { for (const off of offs) off(); };
  }, [uid, ids, agentId]);
  const quietWeeks = quietWeeksOf(db.currentUser);
  const free = !packagesUnlocked(db.entitlement);
  return useMemo(() => {
    if (!toAgent.length) return [];
    const rows = stampedCardRows(db.queries, db.agents, db.activities, quietWeeks, nowMs);
    const ag = db.agents.find((a) => a.id === agentId) ?? null;
    const out: AgentThread[] = [];
    for (const q of toAgent) {
      const row = rows.find((r) => r.id === q.id);
      if (!row) continue;
      const log = logs[q.id];
      const v = buildCardView({ row, q, ag, ms: db.manuscripts.find((m) => m.id === q.manuscriptId) ?? null, events: log ?? [], packages: db.packages,
        queries: db.queries, manuscripts: db.manuscripts, nowMs, quietWeeks, desk: true, free }).v152;
      if (!v) continue;
      out.push({ queryId: q.id, manuscriptId: q.manuscriptId, title: titleOf(q.manuscriptId), steps: v.steps, nowMs, state: v.state, replyMs: v.replyMs,
        agentWeeks: v.agentWeeks, lastMs: row.lastMs, loaded: log != null });
    }
    /* newest query first */
    return out.sort((a, b) => b.lastMs - a.lastMs);
  }, [toAgent, logs, db.queries, db.agents, db.activities, db.manuscripts, db.packages, agentId, quietWeeks, free, nowMs, titleOf]);
}
