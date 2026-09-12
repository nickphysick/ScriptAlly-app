/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIST ROW'S DATE CELLS — list round, Phase 2.
 *
 * ⚠️ THE UNIT FUNCTION IS COMPARED AGAINST THE CONTRACT'S OWN COPY, RUN — never against a table typed
 * here. The contract carries `function unit(d){…}` in its script; this reads it out of the file and
 * evaluates it, so a divergence on ANY day from 0 to 4,000 fails naming the day. A literal on both
 * sides is a test that agrees with itself.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { overdueUnit, overdueCell, dueChip } from "./listCells";
import type { DueFact } from "./taskDue";

const REF = readFileSync("design-refs/todo-list-view-contract.html", "utf8");
const UNIT_SRC = REF.match(/function unit\(d\)\{[^\n]*\}/)?.[0];
const contractUnit = (): ((d: number) => [number | string, string]) => {
  expect(UNIT_SRC, "the contract no longer carries `function unit(d)` — re-read it before trusting this").toBeTruthy();
  return new Function(`${UNIT_SRC}; return unit;`)() as (d: number) => [number | string, string];
};
const said = (d: number) => { const u = overdueUnit(d); return `${u.figure} ${u.unit}`; };

describe("Overdue by — the contract's unit function", () => {
  it("is the contract's own function, at every day from 0 to 4,000", () => {
    const ref = contractUnit();
    const wrong: string[] = [];
    for (let d = 0; d <= 4000; d++) {
      const [v, u] = ref(d);
      const app = overdueUnit(d);
      if (String(v) !== app.figure || u !== app.unit) wrong.push(`${d}: contract ${v} ${u} · app ${app.figure} ${app.unit}`);
    }
    expect(wrong.slice(0, 8), `${wrong.length} days disagree`).toEqual([]);
  });

  /**
   * ⚠️ THE BRIEF'S SIX PROBE DAYS, AND A FALSE PREMISE THEY CARRY. 13/14, 62/63 and 547/548 were
   * offered as the unit boundaries — "weeks under 9, months under 18" read as raw quotients. The
   * contract ROUNDS before it compares, so its boundaries fall at 13/14, 59/60 and 531/532: 62 and 63
   * are both "2 months", 547 and 548 both "1½ years". The contract's function wins; both sets are
   * asserted, the six against the function as well as by value.
   */
  it("the six probe days — each the contract's answer", () => {
    const ref = contractUnit();
    const table: Record<number, string> = {
      13: "13 days", 14: "2 weeks", 62: "2 months", 63: "2 months", 547: "1½ years", 548: "1½ years",
    };
    for (const [d, want] of Object.entries(table)) {
      expect(said(Number(d)), `${d} days`).toBe(want);
      expect(ref(Number(d)).join(" "), `${d} days, the contract's own`).toBe(want);
    }
  });

  it("and the boundaries where the contract's rounding actually puts them", () => {
    expect([said(13), said(14)]).toEqual(["13 days", "2 weeks"]);
    expect([said(59), said(60)]).toEqual(["8 weeks", "2 months"]);
    expect([said(531), said(532)]).toEqual(["17 months", "1½ years"]);
    expect([said(1), said(7), said(21)]).toEqual(["1 day", "7 days", "3 weeks"]);
  });
});

describe("the Overdue-by cell", () => {
  const TODAY = "2026-09-11";
  const f = (ymd: string | null, owner: DueFact["owner"] = "owed"): DueFact => ({ ymd, owner, source: ymd ? "ask" : "none" });

  it("four states: no date · due today · ahead (muted, 'to go') · overdue with its owner", () => {
    expect(overdueCell(f(null), TODAY)).toEqual({ kind: "none" });
    expect(overdueCell(f(TODAY), TODAY)).toEqual({ kind: "today" });
    expect(overdueCell(f("2026-09-15"), TODAY)).toEqual({ kind: "ahead", figure: "4", unit: "days to go" });
    expect(overdueCell(f("2026-09-12"), TODAY)).toEqual({ kind: "ahead", figure: "1", unit: "day to go" });
    expect(overdueCell(f("2026-04-02"), TODAY)).toEqual({ kind: "over", figure: "5", unit: "months", owner: "owed" });
    expect(overdueCell(f("2024-05-21", "theirs"), TODAY)).toEqual({ kind: "over", figure: "2¼", unit: "years", owner: "theirs" });
  });

  /**
   * ⚠️ COLOUR IS OWNERSHIP, NEVER MAGNITUDE — asserted as a property over the whole range. The cell
   * carries the owner it was handed and nothing derived from the size of the number, so no stylesheet
   * rule CAN key a colour to magnitude: there is no field to key it on.
   */
  it("the owner the cell carries is the owner it was handed, at every distance", () => {
    for (const days of [1, 13, 14, 60, 400, 900, 3000]) {
      const ymd = new Date(Date.UTC(2026, 8, 11 - days)).toISOString().slice(0, 10);
      for (const owner of ["owed", "theirs"] as const) {
        const c = overdueCell(f(ymd, owner), TODAY);
        expect(c.kind).toBe("over");
        expect(c.kind === "over" && c.owner, `${days} days, ${owner}`).toBe(owner);
        expect(Object.keys(c).sort()).toEqual(["figure", "kind", "owner", "unit"]);
      }
    }
  });
});

describe("the Due chip — month, day, and the year only when it is not this year", () => {
  it("this year states no year; another year states it; no day is its own chip", () => {
    expect(dueChip("2026-04-02", "2026-09-11")).toEqual({ kind: "date", mon: "Apr", day: "2", year: null });
    expect(dueChip("2024-05-21", "2026-09-11")).toEqual({ kind: "date", mon: "May", day: "21", year: "2024" });
    expect(dueChip("2027-01-05", "2026-09-11")).toEqual({ kind: "date", mon: "Jan", day: "5", year: "2027" });
    expect(dueChip(null, "2026-09-11")).toEqual({ kind: "none" });
  });

  it("the month is the contract's own three letters", () => {
    const months = Array.from({ length: 12 }, (_, i) => dueChip(`2026-${String(i + 1).padStart(2, "0")}-01`, "2026-09-11"));
    const table = REF.match(/const MON=\[([^\]]+)\]/)?.[1] ?? "";
    expect(table, "the contract's MON table").toBeTruthy();
    const refMonths = table.split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
    expect(months.map((m) => m.kind === "date" ? m.mon : "")).toEqual(refMonths);
  });
});
