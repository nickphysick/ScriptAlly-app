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
  collection, doc, getDoc, getDocs, query, where, writeBatch,
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
    /* a query's task flags go with it on a delete, so an undo of that delete brings them back —
       the drawer itself writes none */
    const flags = await getDocs(query(collection(db, "users", uid, "taskFlags"), where("queryId", "in", ids)));
    flags.forEach((d) => out.set(d.ref.path, d.data()));
    /* and a stored task attached to the query: the drawer writes none (K4), so any that appears
       between the snapshot and the undo is exactly what the undo must take away again */
    const tasks = await getDocs(query(collection(db, "users", uid, "tasks"), where("queryId", "in", ids)));
    tasks.forEach((d) => out.set(d.ref.path, d.data()));
  }
  return out;
}

/** The packages a snapshot's queries point at — `packageId` or `sentPackageId` (Part B's stamp rule). */
export function packagesIn(s: Snapshot): string[] {
  const out = new Set<string>();
  for (const qid of s.queryIds) {
    const d = s.docs.get(`users/${s.uid}/queries/${qid}`);
    for (const k of ["packageId", "sentPackageId"]) if (typeof d?.[k] === "string" && d[k]) out.add(d[k]);
  }
  return [...out];
}

/** The packages these queries point at NOW, read from the server — the after-state an undo reverses. */
export async function packagesHeldBy(uid: string, queryIds: string[]): Promise<string[]> {
  const out = new Set<string>();
  await Promise.all(queryIds.map(async (qid) => {
    const d = (await getDoc(doc(db, "users", uid, "queries", qid))).data();
    for (const k of ["packageId", "sentPackageId"]) if (typeof d?.[k] === "string" && d[k]) out.add(d[k]);
  }));
  return [...out];
}

export async function takeSnapshot(uid: string, queryIds: string[]): Promise<Snapshot> {
  const ids = [...new Set(queryIds.filter(Boolean))];
  return { uid, queryIds: ids, docs: await readSet(uid, ids) };
}


/** What is on the server now, read as the snapshot was — the after-state an undo compares against. */
export async function readCurrent(s: Snapshot): Promise<Map<string, DocumentData>> {
  return readSet(s.uid, s.queryIds);
}

/** Firestore's limit on the writes one batch may carry. */
export const RESTORE_BATCH_LIMIT = 500;

/** The undo was refused or failed before it committed: nothing was changed, so it can be tried again. */
export class UndoFailedError extends Error {
  constructor(message: string, readonly cause?: unknown) { super(message); this.name = "UndoFailedError"; }
}

/**
 * Put the set back — ALL OF IT IN ONE BATCH (undo and bulk close v1, 8 Nov 2026).
 *
 * ⚠️ ONE COMMIT, SO A FAILURE CHANGES NOTHING. This used to delete and write documents one at a
 * time, so a refused write partway left the query half restored: its log rewound and its status
 * not, or the other way round. A `writeBatch` lands every delete and write or none of them, and an
 * undo that fails can simply be tried again from the same snapshot.
 *
 * The order inside the batch is the old order — documents the save created are deleted first, the
 * query documents are written last — but it no longer matters to anyone reading: a batch reaches
 * every listener as one change, so no listener can see a log without its query, or the other way
 * round. It is kept because it reads in the order the restore makes sense.
 *
 * ⚠️ NO CHUNKING. A plan larger than one batch is refused before anything is written, because two
 * commits would put back the all-or-nothing this exists for. Measured on the harness account the
 * largest snapshot is 358 documents (a whole book, for an accepted offer) and the largest RESTORE
 * plan is far smaller — a book needs about 165 live queries before a "Signed" undo passes 500.
 */
export async function restoreSnapshot(s: Snapshot): Promise<void> {
  let plan: ReturnType<typeof planRestore>;
  try {
    plan = planRestore(s.docs, await readSet(s.uid, s.queryIds));
  } catch (e) {
    throw new UndoFailedError("Couldn't read what to put back, so nothing was changed.", e);
  }
  const isQuery = (p: string) => /\/queries\/[^/]+$/.test(p);
  const rm = [...plan.remove].sort((a, b) => Number(isQuery(a)) - Number(isQuery(b)));
  const wr = [...plan.write].sort((a, b) => Number(isQuery(a.path)) - Number(isQuery(b.path)));
  if (rm.length + wr.length === 0) return;
  if (rm.length + wr.length > RESTORE_BATCH_LIMIT) {
    throw new UndoFailedError(`This undo would change ${rm.length + wr.length} documents, more than one batch can hold (${RESTORE_BATCH_LIMIT}), so nothing was changed.`);
  }
  const batch = writeBatch(db);
  for (const p of rm) batch.delete(doc(db, p));
  for (const w of wr) batch.set(doc(db, w.path), w.data as DocumentData);
  try {
    await batch.commit();
  } catch (e) {
    throw new UndoFailedError("The undo was refused, so nothing was changed.", e);
  }
}
