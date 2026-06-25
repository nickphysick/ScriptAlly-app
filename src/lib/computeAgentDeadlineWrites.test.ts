/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prompt 3 tests — the deadline fan-out (`computeAgentDeadlineWrites`) and the batch chunker
 * (`chunkExtraWrites`). Both are pure; they are the LOCAL proof. The multi-doc atomic commit through
 * `commitAgentEdits` needs the Firestore emulator (no Java in this repo — see agentIdentityRule.test.ts),
 * so the chunking MATH is proven here and the commit wiring is verified in Nick's walkthrough.
 */
import { describe, it, expect } from "vitest";
import type { DocumentReference } from "firebase/firestore";
import { QueryStatus } from "../types";
import {
  computeAgentDeadlineWrites,
  DeadlineQuery,
} from "./computeAgentDeadlineWrites";
import { computeResponseDeadline } from "./responseDeadline";
import { chunkExtraWrites, AgentExtraWrite } from "./saveAgentEdits";

// A sentinel ref factory — the helper never touches Firestore, so a tagged object is enough to
// assert "keyed by query ref".
const refFor = (queryId: string) => ({ __id: queryId } as unknown as DocumentReference);

const SENT = "2026-01-01T00:00:00.000Z";
const DEADLINE = computeResponseDeadline(SENT, 6); // an arbitrary pre-existing stored deadline

const q = (over: Partial<DeadlineQuery> & { id: string }): DeadlineQuery => ({
  status: QueryStatus.QUERIED,
  dateSent: SENT,
  responseDeadline: DEADLINE,
  ...over,
});

describe("computeAgentDeadlineWrites", () => {
  it("recomputes deadlines ONLY for QUERIED queries that already carry one", () => {
    const queries: DeadlineQuery[] = [
      q({ id: "queried-with-deadline" }), // ✓ included
      q({ id: "queried-no-deadline", responseDeadline: null }), // ✗ never add one
      q({ id: "partial-sent", status: QueryStatus.PARTIAL_SENT }), // ✗ different clock
      q({ id: "full-sent", status: QueryStatus.FULL_SENT }), // ✗ different clock
      q({ id: "partial-requested", status: QueryStatus.PARTIAL_REQUESTED }), // ✗ writer's turn
      q({ id: "rr", status: QueryStatus.REVISE_RESUBMIT }), // ✗ writer's turn
      q({ id: "offer", status: QueryStatus.OFFER }), // ✗ already responded
      q({ id: "rejected", status: QueryStatus.REJECTED }), // ✗ already responded
      q({ id: "queried-no-datesent", dateSent: undefined }), // ✗ no anchor → skip, don't throw
    ];

    const writes = computeAgentDeadlineWrites(queries, 8, refFor);

    expect(writes.map(w => (w.ref as any).__id)).toEqual(["queried-with-deadline"]);
    expect(writes[0].data).toEqual({ responseDeadline: computeResponseDeadline(SENT, 8) });
  });

  it("uses the canonical formula (dateSent + newWeeks), not the old stored value", () => {
    const writes = computeAgentDeadlineWrites([q({ id: "a", dateSent: "2026-03-10T00:00:00.000Z" })], 12, refFor);
    expect(writes).toHaveLength(1);
    expect(writes[0].data).toEqual({
      responseDeadline: computeResponseDeadline("2026-03-10T00:00:00.000Z", 12),
    });
  });

  it("returns [] for null ('Not set') — non-destructive, leaves existing deadlines intact", () => {
    expect(computeAgentDeadlineWrites([q({ id: "a" }), q({ id: "b" })], null, refFor)).toEqual([]);
  });

  it("returns [] for a negative or non-integer turnaround (defends the numeric contract)", () => {
    expect(computeAgentDeadlineWrites([q({ id: "a" })], -1, refFor)).toEqual([]);
    expect(computeAgentDeadlineWrites([q({ id: "a" })], 6.5, refFor)).toEqual([]);
  });

  it("returns [] when the agent has no queries", () => {
    expect(computeAgentDeadlineWrites([], 8, refFor)).toEqual([]);
  });

  it("keys every write by the query's ref so it drops straight into extraWrites", () => {
    const queries = [q({ id: "one" }), q({ id: "two" })];
    const writes = computeAgentDeadlineWrites(queries, 4, refFor);
    expect(writes.map(w => (w.ref as any).__id)).toEqual(["one", "two"]);
  });
});

describe("chunkExtraWrites (500-op batch cap)", () => {
  const make = (n: number): AgentExtraWrite[] =>
    Array.from({ length: n }, (_, i) => ({ ref: refFor(`q${i}`), data: { responseDeadline: DEADLINE } }));

  it("no extra writes → a single empty chunk (one agent-only batch)", () => {
    expect(chunkExtraWrites([])).toEqual([[]]);
  });

  it("keeps the common case in ONE batch: 499 extras + the agent doc = 500 ops", () => {
    const chunks = chunkExtraWrites(make(499));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(499);
  });

  it("spills the 500th extra into a second batch (agent doc reserves a slot)", () => {
    const chunks = chunkExtraWrites(make(500));
    expect(chunks.map(c => c.length)).toEqual([499, 1]);
  });

  it("chunks a large fan-out, first batch ≤ cap-1 and the rest ≤ cap", () => {
    for (const n of [999, 1000, 1234]) {
      const chunks = chunkExtraWrites(make(n));
      // First batch shares with the agent doc.
      expect(chunks[0].length).toBeLessThanOrEqual(499);
      // No batch exceeds the cap; total + order preserved.
      const flat: AgentExtraWrite[] = [];
      chunks.forEach(c => {
        expect(c.length).toBeLessThanOrEqual(500);
        flat.push(...c);
      });
      expect(flat).toHaveLength(n);
      expect(flat.map(w => (w.ref as any).__id)).toEqual(make(n).map(w => (w.ref as any).__id));
    }
  });
});
