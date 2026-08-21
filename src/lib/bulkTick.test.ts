/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE COHORT'S TICKS REACH THE MODEL (chase round, Phase 4).
 *
 * `BulkFillTable` named its first column's key `"letter"`. The model's key is `queryLetter`, so the
 * cell rendered unticked and `toggle` mapped the row array looking for a key nothing carried — an
 * IDENTICAL array, handed back through `onChange`. No error, no state change, no clue. A real
 * pointer click left `aria-pressed="false"` at 80, 250, 600, 1200 and 2500ms: it never flipped and
 * was not being wiped, which is the signature of a handler that ran and had nothing to change.
 *
 * The primary therefore read "Log 0 queries" for ever and the cohort journey could not be
 * completed at all — since `c147de53`.
 *
 * ⚠️ THE TYPE IS THE PRIMARY GUARD; THIS IS THE SECOND. `TICKS` is now typed `MaterialRow["key"]`,
 * so `"letter"` fails to compile — verified by reinstating it and reading
 *   Type '"letter"' is not assignable to type '"other" | "synopsis" | "queryLetter" | "sample"'.
 * These assert the BEHAVIOUR against the real row builder, because a key can be valid and still be
 * the wrong one for the column.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  recordSweepRow, toggleRowMaterial, rowHasAnswer, sweepAnsweredCount, sweepWrites,
  type RecordSweepRow,
} from "./materialsSweep";
import { sliceBetween } from "../test/sliceBetween";

const row = (queryId: string, asks: string[] = []): RecordSweepRow =>
  recordSweepRow({ queryId, agentName: `A-${queryId}`, dateSent: "2026-07-01T12:00:00.000Z" } as never,
    { sentOn: "1 Jul 2026", agentMaterials: asks });

/** the keys the table's tick columns name — read from the component, never restated here */
const tickKeys = (): string[] => {
  const src = readFileSync(join(__dirname, "../components/todo/BulkFillTable.tsx"), "utf8");
  /* ⚠️ THE END ANCHOR IS THE LINE, NOT "];" — the declaration's own type is `MaterialRow["key"]`,
     which CONTAINS "];", so the slice closed before the entries and the scan found none. The
     population floor below is what said so; without it this would have passed over an empty set. */
  const block = sliceBetween(src, "const TICKS:", "\n];", "the TICKS declaration");
  return [...block.matchAll(/key:\s*"([A-Za-z]+)"/g)].map((m) => m[1]);
};

describe("⚠️ a tick reaches the model", () => {
  it("every key the table's columns name is a key its rows carry", () => {
    const carried = new Set<string>(row("q1").rows.map((r) => r.key));
    const named = tickKeys();
    expect(named.length, "the tick columns vanished").toBeGreaterThan(0);
    for (const k of named) {
      expect(carried.has(k), `the table ticks "${k}" and no row carries that key`).toBe(true);
    }
  });

  /**
   * ⚠️ THE COUNT IS THE CLAIM, NOT THE FLAG. `rowHasAnswer` runs the row through
   * `materialsWantedFromRows`, which is what the primary's figure and the write set both read — so
   * this asserts the tick reaches the thing that decides whether the journey can be completed.
   */
  it("ticking the covering letter makes the row answered, and the primary's count move", () => {
    const rows = [row("q1"), row("q2")];
    expect(sweepAnsweredCount(rows)).toBe(0);
    const after = toggleRowMaterial(rows, "q1", "queryLetter");
    expect(rowHasAnswer(after[0]), "the tick did not reach the row").toBe(true);
    expect(sweepAnsweredCount(after), "the primary would still read Log 0 queries").toBe(1);
    /* and the untouched row stays untouched — the patch is by identity, not by index */
    expect(rowHasAnswer(after[1])).toBe(false);
  });

  it("ticking n rows makes the count n", () => {
    let rows = [row("q1"), row("q2"), row("q3")];
    rows = toggleRowMaterial(rows, "q1", "queryLetter");
    rows = toggleRowMaterial(rows, "q3", "synopsis");
    expect(sweepAnsweredCount(rows)).toBe(2);
  });

  it("a second tick turns it off again — the control is a toggle, not a latch", () => {
    let rows = [row("q1")];
    rows = toggleRowMaterial(rows, "q1", "queryLetter");
    rows = toggleRowMaterial(rows, "q1", "queryLetter");
    expect(sweepAnsweredCount(rows)).toBe(0);
  });

  /**
   * ⚠️ THE WRITE SET IS EXACTLY THE TICKED ROWS. The fault's real cost was not a dead column — it
   * was that the primary would have written nothing while saying it had. This is the assertion that
   * would have caught the whole thing from one end.
   */
  it("pressing writes materials for exactly the ticked rows and no others", () => {
    let rows = [row("q1"), row("q2"), row("q3")];
    rows = toggleRowMaterial(rows, "q2", "queryLetter");
    const writes = sweepWrites(rows);
    expect(writes.map((w) => w.queryId)).toEqual(["q2"]);
    expect(writes[0].materialsWanted).toContain("Query letter");
  });

  /**
   * ⚠️ AND THE TICKED STATE SURVIVES A RE-SORT. The table sorts oldest-first for display; a patch
   * applied against the sorted VIEW's index would move to whichever row later occupied that slot.
   * `toggleRowMaterial` takes the caller's array and patches by `queryId`, so the order it is
   * handed cannot matter — asserted by handing it the reverse.
   */
  it("a re-sort does not move the tick to another row", () => {
    const rows = [row("q1"), row("q2"), row("q3")];
    const ticked = toggleRowMaterial(rows, "q2", "queryLetter");
    const resorted = [...ticked].reverse();
    expect(resorted.filter(rowHasAnswer).map((r) => r.queryId)).toEqual(["q2"]);
    const again = toggleRowMaterial(resorted, "q3", "synopsis");
    expect(again.filter(rowHasAnswer).map((r) => r.queryId).sort()).toEqual(["q2", "q3"]);
  });
});
