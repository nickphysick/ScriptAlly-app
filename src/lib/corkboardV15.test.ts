/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corkboard v15 — the pure layer (ref design-refs/corkboard-v15/). Everything the v15 page states is a function of its
 * arguments in lib/corkboard, so these hold the page's figures, sections, columns, "who your notes are about", the
 * quiet rule and the three day-one examples without a browser. The rendered page is tests/e2e/corkboardV15.measure.ts's.
 */
import { describe, it, expect } from "vitest";
import {
  aboutRows, aboutOf, addedWhen, columnCount, dealColumns, DAY_ONE_EXAMPLES, figureRows, figures, findPieces, inFigure,
  quietBoard, sectionLine, sortBoard, wallSections, FIGURE_CHIP,
} from "./corkboard";
import type { UserTask } from "../types";

const n = (id: string, over: Partial<UserTask> = {}): UserTask => ({
  id, userId: "u", text: `note ${id}`, done: false, createdAt: `2026-11-${String(10 + id.length).padStart(2, "0")}T09:00:00Z`, updatedAt: "", ...over,
});

describe("the header's three figures", () => {
  const notes = [
    n("a", { agentId: "ag1" }), n("b", { queryId: "q1" }), n("c", { manuscriptId: "m1" }),
    n("d", { dueDate: "2026-11-22" }), n("e", { pinned: true, agentId: "ag2" }), n("f"),
  ];
  it("linked counts agents and queries, never a manuscript", () => {
    expect(figures(notes)).toEqual({ linked: 3, onTodo: 1, pinned: 1 });
    expect(inFigure(notes[2], "linked")).toBe(false);
    expect(inFigure(notes[1], "linked")).toBe(true);
  });
  it("a figure at zero is not shown, and one linked note is singular", () => {
    expect(figureRows({ linked: 0, onTodo: 2, pinned: 0 }).map((r) => r.k)).toEqual(["onTodo"]);
    expect(figureRows({ linked: 1, onTodo: 0, pinned: 0 })[0].words).toBe("linked to an agent");
    expect(figureRows({ linked: 4, onTodo: 1, pinned: 2 }).map((r) => r.words)).toEqual(["linked to agents", "on your to-do list", "pinned to top"]);
    expect(figureRows({ linked: 0, onTodo: 0, pinned: 0 })).toEqual([]);
  });
  it("each figure's filter chip is the ref's", () => {
    expect(FIGURE_CHIP).toEqual({ linked: "Linked to agents", onTodo: "On your to-do list", pinned: "Pinned to top" });
  });
});

describe("the wall", () => {
  const notes = [n("a"), n("bb", { pinned: true }), n("ccc"), n("dddd", { pinned: true })];
  it("pinned is always first, in every order, and the sections keep the sort's order", () => {
    for (const s of ["mine", "new", "old", "colour"] as const) {
      const sorted = sortBoard(notes, s, ["a", "ccc", "bb", "dddd"], () => "butter");
      const { pinned, rest } = wallSections(sorted);
      expect(sorted.slice(0, 2).every((x) => x.pinned), s).toBe(true);
      expect([...pinned, ...rest].map((x) => x.id)).toEqual(sorted.map((x) => x.id));
    }
  });
  it("columns: 4 from 1240, 3 from 900, 2 from 580, else 1", () => {
    expect([1600, 1240, 1239, 900, 899, 580, 579, 300].map(columnCount)).toEqual([4, 4, 3, 3, 2, 2, 1, 1]);
  });
  it("the deal is row-major: note i goes to column i mod n, and nothing is lost", () => {
    const ids = Array.from({ length: 10 }, (_, i) => i);
    expect(dealColumns(ids, 4)).toEqual([[0, 4, 8], [1, 5, 9], [2, 6], [3, 7]]);
    expect(dealColumns(ids, 3)).toEqual([[0, 3, 6, 9], [1, 4, 7], [2, 5, 8]]);
    expect(dealColumns(ids, 2).flat().sort((a, b) => a - b)).toEqual(ids);
    expect(dealColumns([], 4)).toEqual([[], [], [], []]);
  });
  it("the section line names the count, the total while filtering, and the order", () => {
    expect(sectionLine(12, null, "new")).toBe("12 notes, newest first");
    expect(sectionLine(1, 14, "mine")).toBe("1 of 14 note, my order");
  });
});

describe("who your notes are about", () => {
  const agentOfQuery = (q: string) => ({ q1: "ag1", q2: "ag2" } as Record<string, string>)[q];
  const name = (a: string) => ({ ag1: "Clara Beaumont", ag2: "Tom Ellery", ag3: "Ann Ash" } as Record<string, string>)[a] ?? a;
  it("a query's note counts under its agent; most notes first, then A to Z; manuscripts and loose notes are no one's", () => {
    const notes = [n("1", { queryId: "q1" }), n("2", { agentId: "ag1" }), n("3", { queryId: "q2" }), n("4", { agentId: "ag3" }), n("5", { manuscriptId: "m" }), n("6"), n("7", { queryId: "gone" })];
    const rows = aboutRows(notes, agentOfQuery, name);
    expect(rows.map((r) => [r.agentId, r.notes.length])).toEqual([["ag1", 2], ["ag3", 1], ["ag2", 1]]);
    expect(aboutOf(notes[0], agentOfQuery)).toBe("ag1");
    expect(aboutOf(notes[4], agentOfQuery)).toBeNull();
  });
});

describe("the quiet rule", () => {
  it("is true while no note has a link, a tag or a to-do date", () => {
    expect(quietBoard([n("a"), n("b", { pinned: true })])).toBe(true);
    expect(quietBoard([])).toBe(true);
    for (const over of [{ agentId: "x" }, { queryId: "x" }, { manuscriptId: "x" }, { tags: ["t"] }, { dueDate: "2026-11-20" }]) {
      expect(quietBoard([n("a"), n("b", over)]), JSON.stringify(over)).toBe(false);
    }
    expect(quietBoard([n("a", { tags: [] })])).toBe(true);
  });
});

describe("day one", () => {
  it("is exactly the three examples, in their papers", () => {
    expect(DAY_ONE_EXAMPLES).toEqual([
      { body: "Check each agent’s submission guidelines before you send. They all ask for something slightly different.", paper: "butter" },
      { body: "Send queries in small batches, five or so at a time. Then you can change the letter if it isn’t landing.", paper: "blush" },
      { body: "Address each agent by name, and say in a line why you chose them.", paper: "powder" },
    ]);
  });
});

describe("find and when", () => {
  it("find marks every match, case-insensitively, and the pieces join back to the words", () => {
    const p = findPieces("The Letter and the letter", "letter");
    expect(p.filter((x) => x.hit).map((x) => x.t)).toEqual(["Letter", "letter"]);
    expect(p.map((x) => x.t).join("")).toBe("The Letter and the letter");
    expect(findPieces("abc", "  ")).toEqual([{ t: "abc", hit: false }]);
  });
  it("added: Today, Yesterday, n days ago under a week, then the date", () => {
    const now = new Date(2026, 10, 18, 12);
    expect(addedWhen(new Date(2026, 10, 18, 8).toISOString(), now)).toBe("Today");
    expect(addedWhen(new Date(2026, 10, 17, 23).toISOString(), now)).toBe("Yesterday");
    expect(addedWhen(new Date(2026, 10, 12, 9).toISOString(), now)).toBe("6 days ago");
    expect(addedWhen(new Date(2026, 10, 11, 9).toISOString(), now)).toBe("11 Nov");
    expect(addedWhen(undefined, now)).toBe("");
  });
});
