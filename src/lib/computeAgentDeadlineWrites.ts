/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prompt 3 — responseTimeWeeks deadline fan-out (pure, unit-testable, no Firestore runtime dep).
 *
 * `responseDeadline` is denormalised onto each query at send-time and never recomputed, so editing
 * an agent's turnaround (`responseTimeWeeks`) leaves existing queries on stale deadlines. When the
 * turnaround changes to a NEW NUMBER this rebuilds the deadline — but ONLY for **QUERIED queries
 * that already carry a stored deadline**:
 *
 *   - QUERIED is the one status whose deadline IS, by construction (`addQuery`), `dateSent + weeks`
 *     — it's the agent's first-response window, which is exactly what `responseTimeWeeks` measures.
 *     Partial/Full Sent waits run on a different, writer-chosen clock anchored to the materials-sent
 *     date; recomputing those from `responseTimeWeeks` would stamp a confidently-wrong date.
 *     Partial/Full Requested and R&R are the writer's turn (no agent-response deadline pending).
 *     Offer/Closed/Rejected/Withdrawn — the agent already responded; the deadline is moot.
 *   - "currently carries a stored deadline" — we never RETROACTIVELY add one; a turnaround edit must
 *     not invent follow-up nudges the writer never opted into.
 *
 * `newWeeks === null` ("Not set") → returns `[]`: non-destructive — existing concrete deadlines the
 * writer may be tracking/reminded on are left intact, and new queries fall back to the live compute
 * (activityUtils.ts:109). So the fan-out fires only on a numeric change.
 *
 * `DocumentReference` is a type-only import (erased at build); the ref factory is INJECTED so this
 * stays testable without a live Firestore handle. The returned `AgentExtraWrite[]` drops straight
 * into `commitAgentEdits`' `extraWrites`, so the agent doc + every deadline update commit atomically.
 */
import { DocumentReference } from "firebase/firestore";
import { QueryStatus } from "../types";
import { AgentExtraWrite } from "./saveAgentEdits";
import { computeResponseDeadline } from "./responseDeadline";

/** The narrow slice of a query the fan-out reads — so callers/tests pass plain objects, not full docs. */
export interface DeadlineQuery {
  id: string;
  status: QueryStatus;
  dateSent?: string;
  responseDeadline?: string | null;
}

/**
 * Build the per-query `responseDeadline` recomputes for a numeric turnaround change.
 *
 * @param queriesForAgent  queries already scoped to the edited agent
 * @param newWeeks         the staged turnaround; `null` ("Not set") yields no writes
 * @param refFor           query-id → Firestore ref (injected to keep this pure/testable)
 */
export function computeAgentDeadlineWrites(
  queriesForAgent: DeadlineQuery[],
  newWeeks: number | null,
  refFor: (queryId: string) => DocumentReference,
): AgentExtraWrite[] {
  // "Not set" → no query changes (non-destructive). Also defend the numeric contract: a fan-out is
  // only meaningful for a non-negative integer turnaround.
  if (newWeeks === null || !Number.isInteger(newWeeks) || newWeeks < 0) return [];

  const writes: AgentExtraWrite[] = [];
  for (const q of queriesForAgent) {
    if (q.status !== QueryStatus.QUERIED) continue; // QUERIED only — the first-response window
    if (!q.responseDeadline) continue; // recompute existing only; never add one
    if (!q.dateSent) continue; // need the anchor; skip a malformed query rather than throw
    writes.push({
      ref: refFor(q.id),
      data: { responseDeadline: computeResponseDeadline(q.dateSent, newWeeks) },
    });
  }
  return writes;
}
