import { describe, it, expect } from "vitest";
import { nextSort, sortRows, sortArrow, barPct } from "./ledgerSort";

const R = (id: string, sent: number, replies: number, requests: number) => ({ id, sent, replies, requests });
const ROWS = [R("a", 3, 1, 0), R("b", 7, 3, 2), R("c", 3, 2, 1)];

describe("nextSort", () => {
  it("⚠️ descending FIRST — the question is which is doing best", () => {
    expect(nextSort(null, "requests")).toEqual({ key: "requests", desc: true });
  });
  it("the same head reverses", () => {
    expect(nextSort({ key: "requests", desc: true }, "requests")).toEqual({ key: "requests", desc: false });
  });
  it("a different head starts descending again", () => {
    expect(nextSort({ key: "requests", desc: false }, "sent")).toEqual({ key: "sent", desc: true });
  });
});

describe("sortRows", () => {
  it("sorts descending and ascending — both directions", () => {
    expect(sortRows(ROWS, { key: "sent", desc: true }).map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(sortRows(ROWS, { key: "sent", desc: false }).map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("⚠️ TIES KEEP THEIR ORIGINAL ORDER, in both directions", () => {
    /* a and c are both on 3 sent. Ranking them by anything invisible makes the list shuffle. */
    expect(sortRows(ROWS, { key: "sent", desc: true }).map((r) => r.id).slice(1)).toEqual(["a", "c"]);
    expect(sortRows(ROWS, { key: "sent", desc: false }).map((r) => r.id).slice(0, 2)).toEqual(["a", "c"]);
  });

  it("⚠️ DOES NOT MUTATE — the rows come from a memo", () => {
    const before = ROWS.map((r) => r.id);
    sortRows(ROWS, { key: "requests", desc: true });
    expect(ROWS.map((r) => r.id)).toEqual(before);
  });

  it("no sort is the original order, copied", () => {
    const out = sortRows(ROWS, null);
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(out).not.toBe(ROWS);
  });
});

describe("sortArrow", () => {
  it("marks only the sorted column, and states the direction", () => {
    expect(sortArrow({ key: "sent", desc: true }, "sent")).toBe("▾");
    expect(sortArrow({ key: "sent", desc: false }, "sent")).toBe("▴");
    expect(sortArrow({ key: "sent", desc: true }, "requests")).toBe("");
    expect(sortArrow(null, "sent")).toBe("");
  });
});

describe("barPct", () => {
  it("is a proportion of the column's own maximum", () => {
    expect(barPct(7, 7)).toBe(100);
    expect(barPct(3, 7)).toBe(43);
  });
  it("⚠️ a zero maximum draws NOTHING rather than dividing by zero", () => {
    expect(barPct(0, 0)).toBe(0);
    expect(Number.isFinite(barPct(0, 0))).toBe(true);
  });
});
