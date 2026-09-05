/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ PROPERTIES, NOT EXAMPLES — and the hide rule's two halves asserted against each other: a row
 * is hidden iff an option it CARRIES is off, so `rowPasses` and `rowCarries` must agree about what
 * a row carries. Two derivations against each other, never a literal on both sides.
 */
import { describe, it, expect } from "vitest";
import {
  rowFacets, rowPasses, rowCarries, emptyOff, hiddenCount, FACET_SECTIONS,
  moveGroupOf, MOVE_GROUP_ORDER, MOVE_GROUP_LABEL, type FacetFacts, type FacetOff,
} from "./calendarFacets";
import { QueryStatus } from "../types";

const base: FacetFacts = {
  isTask: false, isClosed: false, status: QueryStatus.QUERIED,
  isUrgent: false, isQuiet: false, hasReminder: false, wasNudged: false,
  writerHolds: false, nextDatedIn: null, daysSinceActive: 3,
};

describe("the facet model", () => {
  it("attention flags CO-OCCUR — a row can be overdue, nudged and gone quiet at once", () => {
    const fx = rowFacets({ ...base, isUrgent: true, wasNudged: true, isQuiet: true });
    expect(fx.att).toEqual(["overdue", "quiet", "nudged"]);
  });

  it("⚠️ a closed row has NO move — nobody owes anything on it", () => {
    const fx = rowFacets({ ...base, isClosed: true, writerHolds: true });
    expect(fx.move).toEqual([]);
    expect(fx.oc).toBe("shut");
    /* so the Whose-move section cannot hide it */
    const off = { ...emptyOff(), move: new Set(["you", "them", "offer"]) } as FacetOff;
    expect(rowPasses(fx, off)).toBe(true);
  });

  it("⚠️ an offer outranks the holder — the offer IS the move", () => {
    expect(rowFacets({ ...base, status: QueryStatus.OFFER, writerHolds: true }).move).toEqual(["offer"]);
  });

  it("a task is always the writer's", () => {
    const fx = rowFacets({ ...base, isTask: true, status: null });
    expect(fx.move).toEqual(["you"]);
    expect(fx.status).toBe("Task");
    expect(fx.type).toBe("task");
  });

  it("⚠️ hidden iff a CARRIED option is off — the two derivations agree", () => {
    const fx = rowFacets({ ...base, isUrgent: true, wasNudged: true });
    for (const sec of FACET_SECTIONS) {
      for (const o of sec.options) {
        const off = { ...emptyOff(), [sec.key]: new Set([o.key]) } as FacetOff;
        expect(rowPasses(fx, off), `${sec.key}:${o.key}`).toBe(!rowCarries(fx, sec.key, o.key));
      }
    }
  });

  it("⚠️ everything ticked hides nothing — the empty state is the whole board", () => {
    for (const facts of [base, { ...base, isTask: true, status: null },
                         { ...base, isClosed: true }, { ...base, isUrgent: true }]) {
      expect(rowPasses(rowFacets(facts as FacetFacts), emptyOff())).toBe(true);
    }
    expect(hiddenCount(emptyOff())).toBe(0);
  });

  it("⚠️ no record sinks to `older`, never to `today`", () => {
    expect(rowFacets({ ...base, daysSinceActive: null }).act).toBe("older");
    expect(rowFacets({ ...base, daysSinceActive: 0 }).act).toBe("today");
    expect(rowFacets({ ...base, daysSinceActive: 7 }).act).toBe("week");
    expect(rowFacets({ ...base, daysSinceActive: 30 }).act).toBe("month");
    expect(rowFacets({ ...base, daysSinceActive: 31 }).act).toBe("older");
  });

  it("the move grouping covers every row exactly once", () => {
    expect(MOVE_GROUP_ORDER.length).toBe(4);
    expect(Object.keys(MOVE_GROUP_LABEL).sort()).toEqual([...MOVE_GROUP_ORDER].sort());
    expect(moveGroupOf(rowFacets({ ...base, isClosed: true }))).toBe("shut");
    expect(moveGroupOf(rowFacets({ ...base, writerHolds: true }))).toBe("you");
    expect(moveGroupOf(rowFacets({ ...base }))).toBe("them");
    expect(moveGroupOf(rowFacets({ ...base, status: QueryStatus.OFFER }))).toBe("offer");
  });

  it("⚠️ the status section is the enum's own names — no R&R, no folded Closed", () => {
    const st = FACET_SECTIONS.find((s) => s.key === "status")!;
    expect(st.options.map((o) => o.key)).toContain("Revise & Resubmit");
    expect(st.options.map((o) => o.key)).not.toContain("R&R");
    expect(st.options.length).toBe(9);
  });
});
