/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One-time migration for the derived-status model.
 *
 * Existing per-query activity docs already carry their produced status in `type` (the reading
 * pane has always rendered from it), so for most data "inferring resultingStatus" is just
 * normalising that field. Docs with no usable `type` fall back — THIS ONCE, dry-run/migration
 * only — to keyword inference over the note text. Live derivation never parses strings.
 *
 * DRY-RUN (read-only, run first — against an export/emulator/read-only session, never blind
 * against production):
 *   const { dryRunDerivedStatusMigration } = await import("./lib/migrateDerivedStatus");
 *   console.table(await dryRunDerivedStatusMigration(userId));
 *
 * APPLY (only after the mismatch list has been reviewed):
 *  - match    → recomputeQuery only (populates hasAgentResponded / revisionRound / dates).
 *  - mismatch → the STORED status is treated as the trustworthy value: stamp a healing activity
 *    (same `act-status-…` convention as the historical backfill) dated after the log's latest
 *    entry so derivation reproduces the current status, then recomputeQuery. Statuses are never
 *    silently changed by migration.
 */
import { collection, doc, getDocs, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { QueryStatus } from "../types";
import {
  deriveQueryFields,
  getActivityTime,
  normalizeResultingStatus,
  DerivableActivity,
} from "./queryDerivation";
import { recomputeQuery, subcollectionDocToDerivable } from "./recomputeQuery";

/** Keyword → status inference for legacy docs without a usable `type`. Migration-only. */
const NOTE_KEYWORDS: [string, QueryStatus][] = [
  ["partial manuscript requested", QueryStatus.PARTIAL_REQUESTED],
  ["requested a partial", QueryStatus.PARTIAL_REQUESTED],
  ["partial manuscript sent", QueryStatus.PARTIAL_SENT],
  ["full manuscript requested", QueryStatus.FULL_REQUESTED],
  ["requested a full", QueryStatus.FULL_REQUESTED],
  ["full manuscript sent", QueryStatus.FULL_SENT],
  ["resubmitted", QueryStatus.FULL_SENT],
  ["revise", QueryStatus.REVISE_RESUBMIT],
  ["offer of representation", QueryStatus.OFFER],
  ["rejection", QueryStatus.REJECTED],
  ["rejected", QueryStatus.REJECTED],
  ["withdrew", QueryStatus.WITHDRAWN],
  ["withdrawn", QueryStatus.WITHDRAWN],
  ["no response", QueryStatus.NO_RESPONSE],
  ["query sent", QueryStatus.QUERIED],
];

function inferFromNote(note: unknown): QueryStatus | null {
  if (typeof note !== "string") return null;
  const lower = note.toLowerCase();
  for (const [kw, status] of NOTE_KEYWORDS) {
    if (lower.includes(kw)) return status;
  }
  return null;
}

function toDerivable(id: string, data: Record<string, unknown>): DerivableActivity {
  const typed = subcollectionDocToDerivable(id, data);
  if (typed.resultingStatus) return typed;
  return { ...typed, resultingStatus: inferFromNote(data.note) };
}

export interface MigrationRow {
  queryId: string;
  agent: string;
  stored: string;
  derived: string;
  match: boolean;
  activityDocs: number;
  statusBearing: number;
}

/** Read-only: derived vs stored status for every query. Writes nothing. */
export async function dryRunDerivedStatusMigration(userId: string): Promise<MigrationRow[]> {
  const queriesSnap = await getDocs(collection(db, "users", userId, "queries"));
  const rows: MigrationRow[] = [];
  for (const qDoc of queriesSnap.docs) {
    const q = qDoc.data() as Record<string, unknown>;
    const actsSnap = await getDocs(collection(db, "users", userId, "queries", qDoc.id, "activity"));
    const derivables = actsSnap.docs.map((d) => toDerivable(d.id, d.data()));
    const derived = deriveQueryFields(derivables);
    const stored = String(q.status ?? "");
    rows.push({
      queryId: qDoc.id,
      agent: String((q as any).agentId ?? ""),
      stored,
      derived: derived.status,
      match: stored === derived.status,
      activityDocs: actsSnap.size,
      statusBearing: derivables.filter((d) => normalizeResultingStatus(d.resultingStatus) !== null).length,
    });
  }
  return rows;
}

/**
 * Apply after dry-run review. Stamps healing activities on mismatched queries so derivation
 * reproduces the STORED status, then recomputes every query. Idempotent.
 */
export async function applyDerivedStatusMigration(userId: string): Promise<{ healed: number; recomputed: number }> {
  const rows = await dryRunDerivedStatusMigration(userId);
  let healed = 0;
  for (const row of rows) {
    if (!row.match) {
      const stored = normalizeResultingStatus(row.stored);
      if (!stored) continue; // unrecognisable stored status — surface in dry-run, never guess
      const actsSnap = await getDocs(collection(db, "users", userId, "queries", row.queryId, "activity"));
      const latest = Math.max(0, ...actsSnap.docs.map((d) => getActivityTime(d.data().createdAt)));
      const healId = `act-status-${stored.replace(/\s+/g, "-").toLowerCase()}-${row.queryId}`;
      await setDoc(
        doc(db, "users", userId, "queries", row.queryId, "activity", healId),
        {
          type: stored,
          resultingStatus: stored,
          // Dated 1ms after the latest existing entry so it deterministically derives as current.
          createdAt: Timestamp.fromMillis(latest > 0 ? latest + 1 : Date.now()),
          note: `Status reconciled during derived-status migration`,
        },
        { merge: true }
      );
      healed++;
    }
    await recomputeQuery(userId, row.queryId);
  }
  return { healed, recomputed: rows.length };
}
