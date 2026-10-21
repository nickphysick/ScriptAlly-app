/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cards-sort-search v1 §B — the Cards view's sort fields are each page's own headings' keys, and the month jumps follow
 * the list's order. The rendered chip and its one-state claim are tests/e2e/css1.measure.ts (L6–L8).
 */
import { describe, expect, it } from "vitest";
import { CL_SORT_FIELDS, QC_SORT_FIELDS, monthJumpsOf } from "./cardsSort";
import { HEADINGS } from "./qc138";

describe("the Query Centre's fields", () => {
  it("are Due date first, then every sortable heading in its order, then Last changed (no heading)", () => {
    const heads = HEADINGS.map((h) => h.key).filter((k) => k !== "due");
    expect(QC_SORT_FIELDS.map((f) => f.key)).toEqual(["due", ...heads, "changed"]);
  });
  it("each field's two directions are the two directions", () => {
    for (const f of [...QC_SORT_FIELDS, ...CL_SORT_FIELDS]) expect(f.order.map((o) => o.reversed).sort()).toEqual([false, true]);
  });
});

describe("the Contact list's fields", () => {
  it("are its four sortable headings, in their order", () => {
    expect(CL_SORT_FIELDS.map((f) => f.key)).toEqual(["surname", "added", "reply", "status"]);
  });
});

describe("month jumps", () => {
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = Date.UTC(2026, 9, 21);
  it("one per month in the list's order, naming the first row; the year only when it is not this one; undated rows none", () => {
    const rows = [{ id: "a", t: Date.UTC(2026, 9, 3) }, { id: "b", t: Date.UTC(2026, 9, 1) }, { id: "c", t: null }, { id: "d", t: Date.UTC(2025, 5, 9) }];
    expect(monthJumpsOf(rows, (r) => r.t, (r) => r.id, now, M)).toEqual([
      { key: "m:2026-10", label: "Oct", n: 2, firstId: "a" },
      { key: "m:2025-06", label: "Jun ’25", n: 1, firstId: "d" },
    ]);
  });
});
