/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT CARD'S UNDO, BY SNAPSHOT (Agent card v1 §4: "Undo must restore everything Save wrote").
 * Before a save the card reads every document the save can touch — the agent, each of the agent's
 * queries (the reply-time fan-out rewrites their `responseDeadline`), the agent's task flags (a
 * save that clears the last data-quality gap resolves the dashboard task's flag), and the agent's
 * To-do tasks (a save that closes the door with a new reopening date adds the reopen reminder —
 * decision 13). Undo reads the same set again and puts it back with the drawer's own pure planner
 * (`planRestore`): a document that exists now and did not before is DELETED, one that changed is
 * WRITTEN BACK WHOLE, one that is unchanged is left alone.
 *
 * ⚠️ WHY NOT THE OLD LIST UNDO. `undoSave` restored by merging `updateAgent(prev)`: it could not
 * remove a field the save added (a first `mswlCheckedAt`, a `reopensOn`, a rating), it logged an
 * activity the save never logged (the house undo rule forbids compensating entries), and it never
 * restored a deadline the fan-out moved. A snapshot does all three by construction, and cannot drift
 * from whatever the save's writers do.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";
import { planRestore } from "./queryActions/restorePlan";

export interface AgentSnapshot { uid: string; agentId: string; queryIds: string[]; docs: Map<string, DocumentData> }

async function readSet(uid: string, agentId: string, queryIds: string[]): Promise<Map<string, DocumentData>> {
  const out = new Map<string, DocumentData>();
  const aRef = doc(db, "users", uid, "agents", agentId);
  const a = await getDoc(aRef);
  if (a.exists()) out.set(aRef.path, a.data());
  await Promise.all(queryIds.map(async (qid) => {
    const qRef = doc(db, "users", uid, "queries", qid);
    const q = await getDoc(qRef);
    if (q.exists()) out.set(qRef.path, q.data());
  }));
  const [flags, tasks] = await Promise.all([
    getDocs(query(collection(db, "users", uid, "taskFlags"), where("agentId", "==", agentId))),
    getDocs(query(collection(db, "users", uid, "tasks"), where("agentId", "==", agentId))),
  ]);
  flags.forEach((d) => out.set(d.ref.path, d.data()));
  tasks.forEach((d) => out.set(d.ref.path, d.data()));
  return out;
}

export async function takeAgentSnapshot(uid: string, agentId: string, queryIds: string[]): Promise<AgentSnapshot> {
  const ids = [...new Set(queryIds.filter(Boolean))];
  return { uid, agentId, queryIds: ids, docs: await readSet(uid, agentId, ids) };
}

/**
 * Put the set back: what the save created goes FIRST (a resolved flag, a reminder), the queries
 * next, and the agent LAST, so a listener that re-derives from the agent sees its queries already
 * restored.
 */
export async function restoreAgentSnapshot(s: AgentSnapshot): Promise<void> {
  const now = await readSet(s.uid, s.agentId, s.queryIds);
  const plan = planRestore(s.docs, now);
  const isAgent = (p: string) => p === `users/${s.uid}/agents/${s.agentId}`;
  for (const p of plan.remove) await deleteDoc(doc(db, p));
  for (const w of [...plan.write].sort((a, b) => Number(isAgent(a.path)) - Number(isAgent(b.path)))) {
    await setDoc(doc(db, w.path), w.data as DocumentData);
  }
}
