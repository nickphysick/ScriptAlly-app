/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scoutStore — Discover v1's reads and writes. The derivations are `scout.ts`; this is only Firestore.
 *
 * ⚠️ UNDO IS A SNAPSHOT, NEVER A COMPENSATING WRITE. Before a decision is written, the document it replaces is held
 *    (an expired pass is a real document, and adding that agent overwrites it). Undo puts the held document back, or
 *    deletes the new one when there was none — and, for an add, deletes the agent and the AGENT_ADDED feed row
 *    `addAgent` wrote, by the ids it was given.
 * ⚠️ THE CATALOGUE'S `contributedByCount` +1 WAITS UNTIL THE ADD STANDS. The rules allow a client a +1 and nothing
 *    else, so a client can never take a bump back. Bumping at once would make Undo a lie (the agent gone, the count
 *    still up). So the bump is held while the toast offers Undo, and sent when the toast goes without one — or when
 *    the page is left, or the tab hides. A tab closed inside those seconds loses a +1: an undercount, never an
 *    invented one.
 */
import { collection, deleteDoc, doc, increment, onSnapshot, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import type { Agent } from "../types";
import { buildSubmission, submissionId, type ScoutDecision } from "./scout";

/* ── Subscriptions ───────────────────────────────────────────────────────── */

export function subscribeScout(
  uid: string,
  onDecisions: (ds: ScoutDecision[]) => void,
  onShares: (ids: Set<string>) => void,
): () => void {
  const offD = onSnapshot(collection(db, "users", uid, "scoutDecisions"), (snap) => {
    const out: ScoutDecision[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<ScoutDecision, "id">) }));
    onDecisions(out);
  }, (e) => console.error("[Discover] scoutDecisions:", e));
  const offS = onSnapshot(collection(db, "users", uid, "scoutShares"), (snap) => {
    const ids = new Set<string>();
    snap.forEach((d) => ids.add(d.id));
    onShares(ids);
  }, (e) => console.error("[Discover] scoutShares:", e));
  return () => { offD(); offS(); };
}

/* ── Decisions ───────────────────────────────────────────────────────────── */

const decisionRef = (uid: string, caId: string) => doc(db, "users", uid, "scoutDecisions", caId);

export async function writeDecision(uid: string, d: ScoutDecision): Promise<void> {
  const { id, ...fields } = d;
  await setDoc(decisionRef(uid, id), fields);
}

/** Put a decision document back as it was: the held copy, or nothing. */
export async function restoreDecision(uid: string, caId: string, before: ScoutDecision | undefined): Promise<void> {
  if (before) await writeDecision(uid, before);
  else await deleteDoc(decisionRef(uid, caId));
}

/** "Bring back": the pass is deleted, and the agent rejoins the queue. */
export async function bringBack(uid: string, caId: string): Promise<void> {
  await deleteDoc(decisionRef(uid, caId));
}

/** Undo an add: the agent, its AGENT_ADDED feed row (addAgent's own id), and the decision as it was. */
export async function undoAdd(uid: string, agentId: string, caId: string, before: ScoutDecision | undefined): Promise<void> {
  cancelIncrement(caId);
  await deleteDoc(doc(db, "users", uid, "agents", agentId));
  await deleteDoc(doc(db, "users", uid, "activities", `act-added-agent-${agentId}`));
  await restoreDecision(uid, caId, before);
}

/* ── The held +1 ─────────────────────────────────────────────────────────── */

const pending = new Map<string, ReturnType<typeof setTimeout>>();

async function bump(caId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "communityAgents", caId), { contributedByCount: increment(1) });
  } catch (e) {
    console.error("[Discover] contributedByCount:", e);
  }
}

/** Hold the +1 for `ms`, then send it. */
export function scheduleIncrement(caId: string, ms: number): void {
  cancelIncrement(caId);
  pending.set(caId, setTimeout(() => { pending.delete(caId); void bump(caId); }, ms));
}
export function cancelIncrement(caId: string): void {
  const t = pending.get(caId);
  if (t !== undefined) { clearTimeout(t); pending.delete(caId); }
}
/** Send every held +1 now (the page was left, or the tab hid). */
export function flushIncrements(): void {
  for (const [caId, t] of [...pending]) { clearTimeout(t); pending.delete(caId); void bump(caId); }
}
export const pendingIncrements = (): string[] => [...pending.keys()];

/* ── Sharing ─────────────────────────────────────────────────────────────── */

/**
 * Share agents to the community catalogue: one batch per agent — the submission (public fields only) and the
 * writer's echo. A submission cannot be taken back by the client (the rules give it no read, update or delete), so
 * nothing here offers to; the sheet says so before the writer presses Share.
 */
export async function shareAgents(uid: string, agents: readonly Agent[], nowMs: number): Promise<{ shared: string[]; failed: string[] }> {
  const shared: string[] = [];
  const failed: string[] = [];
  for (const a of agents) {
    const b = writeBatch(db);
    b.set(doc(db, "agentSubmissions", submissionId(uid, a.id)), buildSubmission(a, uid, nowMs));
    b.set(doc(db, "users", uid, "scoutShares", a.id), { at: new Date(nowMs).toISOString() });
    try { await b.commit(); shared.push(a.id); } catch (e) { console.error("[Discover] share:", e); failed.push(a.id); }
  }
  return { shared, failed };
}
