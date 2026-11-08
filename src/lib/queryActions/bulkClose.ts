/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE QUERY OF A BULK CLOSE, AND WHAT REALLY HAPPENED TO IT (undo and bulk close v1, Phase 2).
 *
 * `saveClose` is several writes in a row (lib/queryActions/closeSave + lib/recordResponse): the
 * response details, the closing rung in the query's log, the recompute that makes the query read
 * closed, the feed row, and then a follow-up that takes off a planned nudge and a "Consider
 * closing" plan. It can throw at any of them — including AFTER the close has landed — so a throw
 * says nothing about whether the query is closed. The tray used to count every throw as "couldn't
 * be closed" and offer no Undo for it, which left a closed query outside the Undo and the message.
 *
 * ⚠️ WHY A READ-BACK AND NOT ONE BATCH. The close goes through `recordQueryResponse`, the app's one
 * response path, whose recompute reads the log it has just written; folding that into a batch
 * would mean a second response path beside it. So when the save throws, the query is read back
 * from the server and judged on what is there:
 *   - it reads closed → closed: it goes in the Undo (from the snapshot taken before), and the log
 *     says the close landed and the follow-up failed;
 *   - it does not read closed but something was written → that query's snapshot is put back (all
 *     or nothing) and it is counted as not closed;
 *   - nothing was written → not closed;
 *   - the read-back itself fails, or the put-back does → UNKNOWN: shown as unknown, never as closed
 *     or failed, and its Undo stays available so the writer can still put it back.
 */
import type { DocumentData } from "firebase/firestore";
import { planRestore } from "./restorePlan";

export type BulkOutcome =
  | { kind: "closed"; followUpFailed: boolean }
  | { kind: "failed" }
  | { kind: "unknown" };

/** The statuses a close leaves a query in (`closeRecord`: no reply → No Response; withdraw and gone → Withdrawn). */
const CLOSED = new Set(["No Response", "Withdrawn", "Rejected"]);
export const readsClosed = (queryDoc: DocumentData | undefined): boolean => CLOSED.has(String(queryDoc?.status ?? ""));

export interface BulkCloseDeps<S extends { docs: Map<string, DocumentData> }> {
  /** the save itself (`saveClose` with the no-reply answers) */
  save: () => Promise<void>;
  /** the snapshot taken before the save */
  snap: S;
  /** the query document's path inside the snapshot */
  queryPath: string;
  /** what is on the server now, the same set the snapshot holds (`readSet`) */
  readNow: () => Promise<Map<string, DocumentData>>;
  /** put the snapshot back, all or nothing (`restoreSnapshot`) */
  restore: (s: S) => Promise<void>;
  log: (msg: string, e: unknown) => void;
}

export async function closeOne<S extends { docs: Map<string, DocumentData> }>(d: BulkCloseDeps<S>): Promise<BulkOutcome> {
  try {
    await d.save();
    return { kind: "closed", followUpFailed: false };
  } catch (saveErr) {
    let now: Map<string, DocumentData>;
    try {
      now = await d.readNow();
    } catch (readErr) {
      d.log("bulk close: the save failed and the query could not be read back", { saveErr, readErr });
      return { kind: "unknown" };
    }
    if (readsClosed(now.get(d.queryPath))) {
      d.log("bulk close: close landed, follow-up failed", saveErr);
      return { kind: "closed", followUpFailed: true };
    }
    const plan = planRestore(d.snap.docs, now);
    if (!plan.remove.length && !plan.write.length) {
      d.log("bulk close: the save failed before anything was written", saveErr);
      return { kind: "failed" };
    }
    try {
      await d.restore(d.snap);
    } catch (restoreErr) {
      d.log("bulk close: the save failed partway and putting it back failed too", { saveErr, restoreErr });
      return { kind: "unknown" };
    }
    d.log("bulk close: the save failed partway, so the query was put back", saveErr);
    return { kind: "failed" };
  }
}

/** The tray's line for a bulk close, in plain speech. Only what really happened is counted. */
export function bulkCloseMessage(closed: number, failed: number, unknown: number): string {
  const q = (n: number) => `${n} ${n === 1 ? "query" : "queries"}`;
  const tail = [
    failed ? `${failed} couldn't be closed` : "",
    unknown ? `${unknown} couldn't be checked — look at ${unknown === 1 ? "it" : "them"} in the Query Centre` : "",
  ].filter(Boolean);
  if (!closed && !unknown) return "Couldn't close those queries. Nothing was changed.";
  if (!closed) return [`Couldn't close those queries`, ...tail].join(" · ");
  return [`Closed ${q(closed)} · Moved to Closed`, ...tail].join(" · ");
}
