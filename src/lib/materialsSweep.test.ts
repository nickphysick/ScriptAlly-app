/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The bulk record gap — the two fill actions, the count, and the caveat that pays for them.
 *
 * ⚠️ ROWS COME FROM `recordSweepRow`, the thing that really builds them. A literal `RecordSweepRow`
 * would be a shape the system may not produce.
 */
import { describe, it, expect } from "vitest";
import {
  SWEEP_VISIBLE_ROWS, SWEEP_CAVEAT, recordSweepRow, fillFromAsks, copyFirstDown,
  sweepAnsweredCount, sweepActLabel, sweepWrites, rowHasAnswer, sweepRowSummary,
} from "./materialsSweep";

const gap = (id: string, ms = 1) => ({ queryId: id, agentName: `Agent ${id}`, sentMs: ms });

/** Three queries whose agencies ask for genuinely DIFFERENT things. */
const cohort = () => [
  recordSweepRow(gap("q1", 1), { sentOn: "1 January 2026", agentMaterials: ["Query letter", "Synopsis"] }),
  recordSweepRow(gap("q2", 2), { sentOn: "2 February 2026", agentMaterials: ["Query letter", "First 50 pages"] }),
  recordSweepRow(gap("q3", 3), { sentOn: "3 March 2026", agentMaterials: [] }),
];

describe("a fresh cohort", () => {
  it("⚠️ opens with NOTHING ticked on any row", () => {
    const rows = cohort();
    expect(sweepAnsweredCount(rows)).toBe(0);
    for (const r of rows) expect(rowHasAnswer(r)).toBe(false);
  });

  it("carries each agency's own requirements separately, behind the button", () => {
    const [a, b, c] = cohort();
    expect(a.asks.map((r) => r.key).sort()).toEqual(["queryLetter", "synopsis"]);
    expect(b.asks.map((r) => r.key).sort()).toEqual(["queryLetter", "sample"].sort());
    expect(c.asks).toHaveLength(0);
  });

  it("shows five before the disclosure — the rest are one press away, never gone", () => {
    expect(SWEEP_VISIBLE_ROWS).toBe(5);
  });
});

describe("⚠️ fill from what EACH agent asks for", () => {
  it("produces DIFFERENT values per row — this is not one template for all", () => {
    const filled = fillFromAsks(cohort());
    const [a, b] = filled.map(sweepRowSummary);
    expect(a).toBe("Covering letter · Synopsis");
    expect(b).toBe("Covering letter · 50 pages");
    expect(a).not.toBe(b);
  });

  it("leaves a row whose agency states nothing ALONE rather than emptying it", () => {
    const filled = fillFromAsks(cohort());
    expect(sweepRowSummary(filled[2])).toBeNull();
    expect(rowHasAnswer(filled[2])).toBe(false);
  });

  it("skips a skipped row", () => {
    const rows = cohort().map((r, i) => (i === 0 ? { ...r, skipped: true } : r));
    expect(rowHasAnswer(fillFromAsks(rows)[0])).toBe(false);
  });

  it("the sample carries the agency's own unit and amount, not a default", () => {
    const filled = fillFromAsks(cohort());
    const s = filled[1].rows.find((r) => r.kind === "qty");
    expect(s && s.kind === "qty" && s.unit).toBe("Pages");
    expect(s && s.kind === "qty" && s.amount).toBe("50");
  });
});

describe("copy the first row down", () => {
  it("propagates the first row's answers to the rest", () => {
    const filled = fillFromAsks(cohort());
    const copied = copyFirstDown(filled);
    expect(sweepRowSummary(copied[1])).toBe(sweepRowSummary(copied[0]));
    expect(sweepRowSummary(copied[2])).toBe(sweepRowSummary(copied[0]));
  });

  it("leaves the first row itself untouched, and skips skipped rows", () => {
    const filled = fillFromAsks(cohort());
    const before = sweepRowSummary(filled[0]);
    const rows = filled.map((r, i) => (i === 2 ? { ...r, skipped: true } : r));
    const copied = copyFirstDown(rows);
    expect(sweepRowSummary(copied[0])).toBe(before);
    expect(rowHasAnswer(copied[2])).toBe(false);
  });

  it("does nothing when every row is skipped, rather than throwing", () => {
    const rows = cohort().map((r) => ({ ...r, skipped: true }));
    expect(() => copyFirstDown(rows)).not.toThrow();
    expect(sweepAnsweredCount(copyFirstDown(rows))).toBe(0);
  });
});

describe("the count and its label", () => {
  it("tracks what is actually answered", () => {
    expect(sweepAnsweredCount(cohort())).toBe(0);
    expect(sweepAnsweredCount(fillFromAsks(cohort()))).toBe(2); // the third states nothing
    expect(sweepAnsweredCount(copyFirstDown(fillFromAsks(cohort())))).toBe(3);
  });

  it("⚠️ agrees in number", () => {
    expect(sweepActLabel(1)).toBe("Record 1 query");
    expect(sweepActLabel(6)).toBe("Record 6 queries");
    expect(sweepActLabel(0)).toBe("Record 0 queries");
  });

  it("⚠️ writes ONLY the answered rows — a skipped or empty row writes nothing at all", () => {
    const writes = sweepWrites(fillFromAsks(cohort()));
    expect(writes.map((w) => w.queryId)).toEqual(["q1", "q2"]);
    for (const w of writes) expect(w.materialsWanted.length).toBeGreaterThan(0);
  });

  it("⚠️ and every write carries STORED tokens, never display labels", () => {
    const writes = sweepWrites(fillFromAsks(cohort()));
    expect(writes[0].materialsWanted).toEqual(["Query letter", "Synopsis"]);
    expect(writes[0].materialsWanted).not.toContain("Covering letter");
  });
});

describe("the caveat", () => {
  it("says requirements are not evidence, and never urges", () => {
    expect(SWEEP_CAVEAT).toMatch(/not proof of what you sent/i);
    expect(SWEEP_CAVEAT).not.toMatch(/\b(just|simply|quickly|easy|only)\b/i);
  });

  it("⚠️ carries no gendered pronoun for the agent", () => {
    expect(SWEEP_CAVEAT).not.toMatch(/\b(his|her|hers)\b/i);
  });
});
