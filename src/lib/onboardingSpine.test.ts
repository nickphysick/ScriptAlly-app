/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The spine's branch-honesty rules, asserted as properties of the model rather than promised in a
 * component.
 */
import { describe, it, expect } from "vitest";
import {
  SPINE_LABELS, spineFor, spineIndex, stepOfLabel, subStepLabel, OnboardingBranch,
} from "./onboardingSpine";

const BRANCHES: OnboardingBranch[] = [null, "A", "B"];

describe("the path each branch actually walks", () => {
  it("the opening question shows the full path", () => {
    expect(spineFor(null).map((s) => s.id)).toEqual(["you", "book", "list"]);
  });

  /** Branch A is manuscript-led and ends there — a step nobody will walk is not a step. */
  it("branch A is two steps, not three with one greyed out", () => {
    expect(spineFor("A").map((s) => s.id)).toEqual(["you", "book"]);
  });

  it("branch B is three", () => {
    expect(spineFor("B").map((s) => s.id)).toEqual(["you", "book", "list"]);
  });

  it("labels come from one table, verbatim from the ref", () => {
    expect(SPINE_LABELS).toEqual({ you: "You", book: "Your book", list: "Your list" });
    for (const b of BRANCHES) {
      for (const s of spineFor(b)) expect(s.label).toBe(SPINE_LABELS[s.id]);
    }
  });
});

describe("⚠️ THE SPINE MAY SHORTEN. IT MAY NEVER LENGTHEN.", () => {
  /**
   * A progress indicator that grows because of a choice the writer just made turns their own
   * decision into a punishment. Committing to a branch can only ever take steps away.
   */
  it("no branch is longer than the path shown before one was chosen", () => {
    const undecided = spineFor(null).length;
    for (const b of BRANCHES) {
      expect(spineFor(b).length, `branch ${b} lengthens the spine`).toBeLessThanOrEqual(undecided);
    }
  });

  /** And every branch's steps are a PREFIX of what was shown — not a different set of the same size. */
  it("every branch walks the steps it was shown, in order", () => {
    const undecided = spineFor(null).map((s) => s.id);
    for (const b of BRANCHES) {
      const ids = spineFor(b).map((s) => s.id);
      expect(ids, `branch ${b} substitutes a step rather than dropping one`)
        .toEqual(undecided.slice(0, ids.length));
    }
  });
});

describe("⚠️ the capture choice cannot change the count — structurally", () => {
  /**
   * Smart Import, the template and by-hand all live INSIDE "Your list". The guarantee is not that
   * `spineFor` returns the same number for each; it is that there is no argument it could take
   * which would distinguish them. This asserts the shape of the function, which is the only form
   * of the claim that cannot rot: a test that called it three ways with three capture choices
   * would be testing a parameter that does not exist.
   */
  it("takes the branch and nothing else", () => {
    expect(spineFor.length).toBe(1);
  });

  it("entering and completing the list step is the same count throughout", () => {
    const steps = spineFor("B");
    expect(spineIndex(steps, "list")).toBe(2);
    expect(steps.length).toBe(3);
    // The same call, made again after any amount of sub-flow, returns the same path.
    expect(spineFor("B")).toEqual(steps);
  });
});

describe("where a step sits", () => {
  it("finds a step on its own branch", () => {
    expect(spineIndex(spineFor("B"), "list")).toBe(2);
    expect(spineIndex(spineFor("A"), "book")).toBe(1);
  });

  /** ⚠️ -1, NOT 0. "Your list" is not step one of branch A; it is not on branch A at all. */
  it("reports a step that is not on this branch as absent", () => {
    expect(spineIndex(spineFor("A"), "list")).toBe(-1);
  });
});

describe("the strings a person reads", () => {
  /** ⚠️ ONE-BASED. "Step 0 of 3" is a developer's off-by-one leaking onto a writer's screen. */
  it("counts from one", () => {
    expect(stepOfLabel(0, 3)).toBe("Step 1 of 3");
    expect(stepOfLabel(2, 3)).toBe("Step 3 of 3");
  });

  it("says two when the branch is two", () => {
    expect(stepOfLabel(1, spineFor("A").length)).toBe("Step 2 of 2");
  });

  it("carries a sub-position without inventing a step", () => {
    expect(subStepLabel(2, "Reviewing 2 of 3")).toBe("Step 3 · Reviewing 2 of 3");
  });
});
