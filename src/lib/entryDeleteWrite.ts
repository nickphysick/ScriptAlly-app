/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "It never happened" — the write (fix-delete-entry). The decisions are `lib/entryDelete` (pure); this reads the
 * query's two stores, asks it, and writes ONE batch: the log entries go, their feed rows go, and the journey
 * fields those entries owned are cleared. `recomputeQuery` then derives its own ten fields, as it always did —
 * its contract is untouched, and so are the rules (every field cleared here is one a journey already writes).
 *
 * ⚠️ ONE BATCH, so a feed row can never outlive its entry or the other way round.
 */
import { collection, deleteField, doc, getDoc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { getActivityTime } from "./queryDerivation";
import { computeRecomputedFields, recomputeQuery } from "./recomputeQuery";
import { feedRowsFor, journeyFieldsToClear, offerGone, type FeedMatch, type FeedRow, type LogEntry } from "./entryDelete";

export interface EntryDeleteResult {
  /** the status the remaining log derives */
  status: string;
  /** the journey fields cleared */
  cleared: string[];
  /** how each deleted entry's feed row was found */
  feed: FeedMatch["how"];
  /** other queries whose offer marks were cleared (the deleted entry was this query's last offer) */
  others: string[];
}

/** The other queries that carry this query's offer mark — read BEFORE the write, so an undo snapshot can hold them. */
export async function offerMarkedBy(userId: string, queryId: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, "users", userId, "queries"), where("offerRefQueryId", "==", queryId)));
  return snap.docs.map((d) => d.id);
}

export async function deleteTimelineEntries(userId: string, queryId: string, ids: readonly string[]): Promise<EntryDeleteResult> {
  const queryRef = doc(db, "users", userId, "queries", queryId);
  const [logSnap, feedSnap, qSnap] = await Promise.all([
    getDocs(collection(db, "users", userId, "queries", queryId, "activity")),
    getDocs(query(collection(db, "users", userId, "activities"), where("queryId", "==", queryId))),
    getDoc(queryRef),
  ]);
  const before: LogEntry[] = logSnap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, kind: String(x.resultingStatus ?? x.type ?? ""), eventKey: typeof x.eventKey === "string" ? x.eventKey : undefined, timeMs: getActivityTime(x.createdAt) };
  });
  const feed: FeedRow[] = feedSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id, logEntryId: typeof x.logEntryId === "string" ? x.logEntryId : undefined,
      resultingStatus: typeof x.resultingStatus === "string" ? x.resultingStatus : undefined,
      activityType: typeof x.activityType === "string" ? x.activityType : undefined,
      eventKey: typeof x.eventKey === "string" ? x.eventKey : undefined, timeMs: getActivityTime(x.date),
    };
  });
  const gone = new Set(ids);
  const match = feedRowsFor(before, ids, feed);
  const status = computeRecomputedFields(logSnap.docs.filter((d) => !gone.has(d.id)).map((d) => ({ id: d.id, data: d.data() }))).status;
  /* The measurement harness proves the lock by skipping this clear (D1's mutation). Development builds only: the
     MODE literal is replaced at build time, so a production bundle carries neither the flag nor the branch. */
  const skip = import.meta.env.MODE === "development" && typeof window !== "undefined" && (window as unknown as { __SA_SKIP_ENTRY_CLEAR?: boolean }).__SA_SKIP_ENTRY_CLEAR === true;
  const cleared = skip ? [] : journeyFieldsToClear(before, ids, status, new Set(Object.keys(qSnap.data() ?? {})));
  const others = !skip && offerGone(before, ids) ? await offerMarkedBy(userId, queryId) : [];

  /* …and its second mutation: the feed row looked for under the log entry's own id, as it was before the fix */
  const sameIdOnly = import.meta.env.MODE === "development" && typeof window !== "undefined" && (window as unknown as { __SA_SKIP_FEED_MATCH?: boolean }).__SA_SKIP_FEED_MATCH === true;
  const rows = sameIdOnly ? [...ids] : match.rows;

  const batch = writeBatch(db);
  for (const id of ids) batch.delete(doc(db, "users", userId, "queries", queryId, "activity", id));
  for (const id of rows) batch.delete(doc(db, "users", userId, "activities", id));
  if (cleared.length) batch.update(queryRef, Object.fromEntries(cleared.map((f) => [f, deleteField()])));
  for (const o of others) batch.update(doc(db, "users", userId, "queries", o), { offerRefQueryId: deleteField(), offerTold: deleteField(), offerToldOn: deleteField() });
  await batch.commit();
  await recomputeQuery(userId, queryId);
  return { status, cleared, feed: match.how, others };
}
