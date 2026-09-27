/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNDO BY SNAPSHOT — ruling 4: undo deletes exactly the records the save created and restores what
 * it changed, and never writes a compensating entry.
 *
 * Before a journey saves, the drawer reads every document the save can touch — the query itself,
 * its authoritative `activity` log, and the global feed rows projected from it — for every query the
 * save involves (one, or the whole book's for an accepted offer). Undo reads the same set again and
 * puts it back: a document that exists now and did not before is DELETED, one that existed and has
 * changed or gone is WRITTEN BACK WHOLE, one that is unchanged is left alone.
 *
 * ⚠️ WHY A SNAPSHOT AND NOT EACH WRITER'S OWN INVERSE. The journeys call the existing writers
 * (`recordQueryResponse`, `recordMaterialsSent`, `addQuery`, …), several of which fan out — a
 * recompute, a feed twin under a different id, a stamped expectation. An inverse per writer is one
 * more thing to keep in step with each of them, and the day it drifts the undo leaves residue. A
 * snapshot cannot drift: whatever the writers did, the set is put back as it was read.
 *
 * ⚠️ AND IT RESTORES DERIVED FIELDS BY RESTORING THE DOCUMENT, SO NOTHING IS RECOMPUTED AFTER. The
 * query's status, stage dates and response flags are written back exactly as they were read, beside
 * the log they were derived from; running `recomputeQuery` over the restored log would only rewrite
 * the same values.
 */
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";
import { planRestore, type DocSnap } from "./restorePlan";
export { planRestore };

export interface Snapshot { uid: string; queryIds: string[]; docs: Map<string, DocumentData> }

const chunk = <T,>(xs: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

async function readSet(uid: string, queryIds: string[]): Promise<Map<string, DocumentData>> {
  const out = new Map<string, DocumentData>();
  await Promise.all(queryIds.map(async (qid) => {
    const qRef = doc(db, "users", uid, "queries", qid);
    const q = await getDoc(qRef);
    if (q.exists()) out.set(qRef.path, q.data());
    const nested = await getDocs(collection(db, "users", uid, "queries", qid, "activity"));
    nested.forEach((d) => out.set(d.ref.path, d.data()));
  }));
  for (const ids of chunk(queryIds, 10)) {
    const feed = await getDocs(query(collection(db, "users", uid, "activities"), where("queryId", "in", ids)));
    feed.forEach((d) => out.set(d.ref.path, d.data()));
  }
  return out;
}

export async function takeSnapshot(uid: string, queryIds: string[]): Promise<Snapshot> {
  const ids = [...new Set(queryIds.filter(Boolean))];
  return { uid, queryIds: ids, docs: await readSet(uid, ids) };
}

/**
 * Put the set back. Documents that the save created are deleted FIRST — for a logged query that
 * includes the query itself, whose activity rows go before it so no row is ever left pointing at a
 * query that does not exist. The query documents are written back LAST, after their logs, so a
 * listener that recomputes on the query sees the finished log.
 */
export async function restoreSnapshot(s: Snapshot): Promise<void> {
  const now = await readSet(s.uid, s.queryIds);
  const plan = planRestore(s.docs, now);
  const isQuery = (p: string) => /\/queries\/[^/]+$/.test(p);
  const rm = [...plan.remove].sort((a, b) => Number(isQuery(a)) - Number(isQuery(b)));
  for (const p of rm) await deleteDoc(doc(db, p));
  const wr = [...plan.write].sort((a, b) => Number(isQuery(a.path)) - Number(isQuery(b.path)));
  for (const w of wr) await setDoc(doc(db, w.path), w.data as DocumentData);
}
