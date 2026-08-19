/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * COMPLETION SAFETY — which kinds may write, and the guard that stops the next one inheriting one.
 *
 * ⚠️ THE SUBJECT IS THE WRITE, NOT THE STRING. Asserting `completionVia(x) === "none"` proves a
 * label; what matters is that no path reachable from a record-gap card performs a STATUS write. So
 * the write-bearing paths are named once here and every assertion is phrased against that set —
 * if a future edit makes `mark-sent` mean something harmless, or adds a fifth writing path, these
 * fail rather than quietly passing.
 *
 * ⚠️ AND `mark-sent` IS RECONCILED AGAINST `sendSpecFor`, NOT AGAINST A LITERAL LIST. Two
 * derivations answering "is this a send" are asserted against EACH OTHER — the pattern
 * `agentList.test.ts` set — because a hand-written list on both sides goes green the day someone
 * changes both in the same wrong direction.
 */
import { describe, it, expect } from "vitest";
import { TASK_TYPES, isTaskType, completionVia, isTickable, type CompletionVia, type TaskType } from "./todoActions";
import { sendSpecFor } from "./todoDock";
import type { BoardCard } from "./todoBoard";

/** The completion paths that mutate a query. `close-query` writes a status; `mark-sent` writes one
 *  and appends an activity. The other two touch no query at all. */
const WRITES_TO_QUERY: ReadonlySet<CompletionVia> = new Set<CompletionVia>(["mark-sent", "close-query"]);

/** A card as the board really builds one: a kind plus the record it points at. */
const card = (taskType: string, over: Partial<BoardCard> = {}): BoardCard =>
  ({ key: "k", stream: "hk", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
     hk: true, initials: "•", record: "", committed: false, done: false,
     taskType, relatedRecordId: "rec1", ...over }) as BoardCard;

describe("the census", () => {
  it("every declared kind is recognised, and nothing else is", () => {
    for (const t of TASK_TYPES) expect(isTaskType(t)).toBe(true);
    expect(isTaskType("brand_new_kind")).toBe(false);
    expect(isTaskType(undefined)).toBe(false);
    expect(isTaskType("")).toBe(false);
  });

  it("⚠️ `exclusive_expiring` is absent — it survives only in fixtures, and the census states what the app can produce", () => {
    expect((TASK_TYPES as readonly string[])).not.toContain("exclusive_expiring");
  });
});

describe("every kind declares a completion path explicitly", () => {
  it("no kind resolves to undefined — the switch covers the union", () => {
    for (const t of TASK_TYPES) {
      const via = completionVia(card(t));
      expect(via, `${t} has no completion path`).toBeTruthy();
    }
  });

  it("⚠️ the FALLBACK IS INERT — an unknown kind completes nothing and draws no tick", () => {
    expect(completionVia(card("brand_new_kind"))).toBe("none");
    expect(isTickable(card("brand_new_kind"))).toBe(false);
    // …and so does a card with no kind at all
    expect(completionVia(card(undefined as unknown as string))).toBe("none");
  });
});

describe("⚠️ which kinds may write to a query", () => {
  /** Derived, never listed: whatever currently maps to a write-bearing path. */
  const writers = TASK_TYPES.filter((t) => WRITES_TO_QUERY.has(completionVia(card(t))));

  it("`mark-sent` is EXACTLY the kinds `sendSpecFor` calls sends — two derivations, one answer", () => {
    const viaCompletion = TASK_TYPES.filter((t) => completionVia(card(t)) === "mark-sent").sort();
    const viaSendSpec = TASK_TYPES.filter((t) => sendSpecFor(card(t)) !== null).sort();
    expect(viaCompletion).toEqual(viaSendSpec);
    // and it is a real, non-empty set — an empty-equals-empty pass would prove nothing
    expect(viaCompletion.length).toBeGreaterThan(0);
  });

  it("the writing set is small and named — anything joining it is a deliberate act", () => {
    expect(writers.slice().sort()).toEqual(
      ["full_requested", "no_response_close", "partial_requested", "revise_resubmit"],
    );
  });

  it("⚠️ NO MATERIALS KIND REACHES A WRITE-BEARING PATH", () => {
    for (const t of ["materials_unrecorded", "materials_unrecorded_bulk"] as TaskType[]) {
      expect(WRITES_TO_QUERY.has(completionVia(card(t))), `${t} can write`).toBe(false);
      expect(isTickable(card(t))).toBe(false);
    }
  });

  it("⚠️ a DECISION is not a send — an offer completes in its own journey, not by a tick", () => {
    expect(WRITES_TO_QUERY.has(completionVia(card("offer_received")))).toBe(false);
  });

  it("housekeeping and prompt kinds write nothing", () => {
    for (const t of ["data_quality_poor", "querying_unstarted", "dream_agent_unqueried", "weekly_review"] as TaskType[]) {
      expect(WRITES_TO_QUERY.has(completionVia(card(t))), `${t} can write`).toBe(false);
    }
  });

  it("a card with no record to point at never writes, whatever its kind", () => {
    for (const t of TASK_TYPES) {
      expect(completionVia(card(t, { relatedRecordId: undefined }))).toBe("none");
    }
  });

  it("the writer's own task still completes — this did not become inert by accident", () => {
    expect(completionVia(card("materials_unrecorded", { userTaskId: "u1" }))).toBe("user-task");
    expect(WRITES_TO_QUERY.has("user-task")).toBe(false);
  });
});
