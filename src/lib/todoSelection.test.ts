/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { EMPTY_SEL, applySelectClick, moveFocus } from "./todoSelection";

const ORDER = ["a", "b", "group-dq_mswl", "c", "d"];

describe("applySelectClick — the ledger selection reducer", () => {
  it("plain click toggles and re-anchors", () => {
    const s1 = applySelectClick(EMPTY_SEL, ORDER, "b", false);
    expect(s1).toEqual({ selected: ["b"], anchor: "b" });
    expect(applySelectClick(s1, ORDER, "b", false)).toEqual({ selected: [], anchor: "b" });
  });
  it("shift-click ADDS the inclusive span from the anchor (either direction); anchor holds", () => {
    const s1 = applySelectClick(EMPTY_SEL, ORDER, "a", false);
    const s2 = applySelectClick(s1, ORDER, "c", true);
    expect(s2.selected).toEqual(["a", "b", "group-dq_mswl", "c"]);
    expect(s2.anchor).toBe("a");
    const up = applySelectClick(applySelectClick(EMPTY_SEL, ORDER, "d", false), ORDER, "group-dq_mswl", true);
    expect(up.selected).toEqual(["d", "group-dq_mswl", "c"]);
  });
  it("a batch parent is ONE key — the whole span counts it once", () => {
    const s = applySelectClick(applySelectClick(EMPTY_SEL, ORDER, "b", false), ORDER, "d", true);
    expect(s.selected.filter((k) => k === "group-dq_mswl")).toHaveLength(1);
  });
  it("children are never selectable BY CONSTRUCTION — a key outside the order is a no-op", () => {
    expect(applySelectClick(EMPTY_SEL, ORDER, "child-x", false)).toBe(EMPTY_SEL);
    expect(applySelectClick(EMPTY_SEL, ORDER, "child-x", true)).toBe(EMPTY_SEL);
  });
  it("stale keys prune on the next interaction (a filtered-out row leaves the selection)", () => {
    const s1 = { selected: ["gone", "a"], anchor: "a" };
    expect(applySelectClick(s1, ORDER, "b", false).selected).toEqual(["a", "b"]);
  });
  it("shift with a stale/absent anchor degrades to a plain toggle", () => {
    const s = applySelectClick({ selected: [], anchor: "gone" }, ORDER, "c", true);
    expect(s).toEqual({ selected: ["c"], anchor: "c" });
  });
});

describe("moveFocus — the clamped keyboard walker", () => {
  it("enters the list from either end; clamps at both; empty list is inert", () => {
    expect(moveFocus(-1, 1, 5)).toBe(0);
    expect(moveFocus(-1, -1, 5)).toBe(4);
    expect(moveFocus(0, -1, 5)).toBe(0);
    expect(moveFocus(4, 1, 5)).toBe(4);
    expect(moveFocus(2, 1, 5)).toBe(3);
    expect(moveFocus(3, -1, 0)).toBe(-1);
  });
});
