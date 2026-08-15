/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useDockActivity — the docked query's OWN activity rows (v14 close-the-gap, Phase 4).
 *
 * ⚠️ WHY THIS EXISTS, MEASURED RATHER THAN GUESSED. The dock's Tracking read `Nothing logged yet.`
 * on every card. `dockTimeline` filters the GLOBAL `users/{uid}/activities` feed by `queryId` — and
 * that feed is a best-effort PROJECTION twin (`recordResponse`: "SECONDARY write — best-effort …
 * failures here must never block undo"). The AUTHORITATIVE rows live in the per-query
 * subcollection, which is what the Query Centre subscribes to.
 *
 * Proven on the deployed dev site before any code changed: for `seed-query-9` the Query Centre
 * renders "Query sent · via Email — 5 JUN" and "Full requested — 5 JUN", while the dock for the
 * SAME query renders "Nothing logged yet." Same query, same account, two stores, one of them empty.
 *
 * ⚠️ SO THIS IS A SECOND SOURCE, NOT A SECOND DERIVATION — the distinction the baked decision
 * draws. `activityEventLabel` remains the one label derivation and is untouched; what changes is
 * which store it is handed. Reading the authoritative rows is what the Query Centre already does,
 * and this is that listener, scoped to the one docked card.
 *
 * ⚠️ ONE QUERY AT A TIME, DELIBERATELY. The pane shows one card, so this subscribes to one
 * subcollection and tears down on change — never a fan-out over the whole queue, which would open
 * a listener per card for rows nobody is looking at.
 */
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

/** The shape `activityEventLabel` needs, plus what the row renders. Deliberately loose: these are
 *  subcollection docs written by several generations of the app. */
export interface DockActivityDoc {
  id: string;
  type?: unknown;
  activityType?: unknown;
  resultingStatus?: unknown;
  createdAt?: string;
  date?: string;
  note?: string;
  via?: string;
}

export function useDockActivity(userId: string | undefined, queryId: string | undefined): DockActivityDoc[] {
  const [rows, setRows] = useState<DockActivityDoc[]>([]);
  useEffect(() => {
    if (!userId || !queryId) { setRows([]); return; }
    /* ⚠️ CLEARED ON THE WAY IN, not only on the way out — without this the previous card's rows
       stay on screen for the round trip and the writer reads another query's history as this
       one's. A stale timeline is worse than an empty one. */
    setRows([]);
    const unsub = onSnapshot(
      fsQuery(collection(db, "users", userId, "queries", queryId, "activity"), orderBy("createdAt", "asc")),
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as DockActivityDoc)),
      (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/queries/${queryId}/activity`),
    );
    return () => unsub();
  }, [userId, queryId]);
  return rows;
}
