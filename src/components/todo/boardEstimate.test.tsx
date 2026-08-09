/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Time estimates on Today (board-optimise pack, Phase 7; ref design-refs/board-features.html).
 *
 * These locks began life in boardFold.test.tsx, appended beneath Phase 6's. Phase 6 — the
 * collapsible columns and the reflow — was REVERTED on 7 Aug at Nick's call (the feature is
 * parked, not paused), so its suite went with it and the estimates moved here under their own
 * name rather than being left in a file named for something that no longer exists.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { TodoColumnId } from "../../lib/todoColumns";
import { TodoBoard } from "./TodoBoard";
import { ESTIMATE_LADDER, isLadderValue, estimateTotal, estimateHeadLabel } from "../../lib/todoEstimate";
import { cardMenu } from "../../lib/todoMenu";

const here = __dirname;
const rules = readFileSync(join(here, "..", "..", "..", "firestore.rules"), "utf8");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "\u2022", record: "", committed: false, done: false, ...over,
});
const cols = (over: Partial<Record<TodoColumnId, BoardCard[]>> = {}) =>
  ({ todo: [], today: [], snoozed: [], done: [], ...over }) as Record<TodoColumnId, BoardCard[]>;

describe("⚠️ time estimates live ONLY on Today, from a FIXED ladder", () => {
  const est = readFileSync(join(here, "..", "..", "lib", "todoEstimate.ts"), "utf8");
  const menu = readFileSync(join(here, "..", "..", "lib", "todoMenu.ts"), "utf8");

  it("the ladder is the ref's rungs, plus the one that clears", () => {
    expect(ESTIMATE_LADDER.map((r) => r.label)).toEqual(["5m", "10m", "25m", "45m", "1h+", "none"]);
    expect(ESTIMATE_LADDER.find((r) => r.label === "none")!.minutes).toBeNull();
    // a value from anywhere else is not an estimate at all
    expect(isLadderValue(37)).toBe(false);
    expect(isLadderValue(25)).toBe(true);
    expect(isLadderValue(undefined)).toBe(false);
  });

  it("⚠️ NEVER FREE TEXT — the menu offers rungs, and no input reaches the field", () => {
    expect(menu).toContain('leaf("est-25", "25m")');
    expect(est).not.toContain("<input");
    expect(est).not.toContain("parseFloat");
  });

  it("⚠️ the ladder is offered on TODAY only — planning is Today's job", () => {
    expect(menu).toContain('if (column === "today") {');
    const todayMenu = cardMenu(card({ userTaskId: "u1" }), "today").flatMap((g) => g.entries);
    expect(todayMenu.some((e) => e.id === "estimate")).toBe(true);
    for (const col of ["todo", "snoozed", "done"] as const) {
      const m = cardMenu(card({ userTaskId: "u1" }), col).flatMap((g) => g.entries);
      expect(m.some((e) => e.id === "estimate"), col).toBe(false);
    }
  });

  it("the chip renders on a Today card and NOWHERE else", () => {
    const withEst = card({ key: "e", userTaskId: "u1", estimateMin: 25, title: "Redraft" });
    const onToday = renderToStaticMarkup(
      <TodoBoard columns={cols({ today: [withEst] })} onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
    );
    expect(onToday).toContain("~25 MIN");
    const onBoard = renderToStaticMarkup(
      <TodoBoard columns={cols({ todo: [withEst] })} onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
    );
    expect(onBoard).not.toContain("~25 MIN");
  });

  it("⚠️ THE HEAD SUMS ONLY WHAT CARRIES ONE, AND NEVER GUESSES", () => {
    expect(estimateTotal([25, undefined, 10, undefined])).toBe(35);
    expect(estimateTotal([undefined, undefined])).toBe(0);
    expect(estimateHeadLabel(35, 2)).toBe("EST. 35 MIN");
    expect(estimateHeadLabel(0, 3)).toBeNull();   // three cards, none estimated → no figure
    expect(estimateHeadLabel(90, 2)).toBe("EST. 1H 30 MIN");
  });

  /* ⚠️ THE "THAT'S A FULL DAY" BRANCH IS RETIRED WITH `goodDay` (tasks-consolidation P2 follow-up,
     9 Aug). It advised on the size of the day's COMMITMENT, and committing work to a day is what
     the consolidation removed — plus the copy law independently: this app reports and never
     appraises. What the head does now is state a figure, which the case above covers. */
  it("the head states a FIGURE and never a verdict — the appraisal branch is extinct", () => {
    expect(estimateHeadLabel(35, 6)).toBe("EST. 35 MIN");
    const lib = readFileSync(join(here, "..", "..", "lib", "todoEstimate.ts"), "utf8");
    expect(lib).not.toContain("count > goodDay");
  });

  it("the write rides the ONE existing path, and 'none' clears the field", () => {
    const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    expect(page).toContain('const mins = item.id === "est-none" ? null : Number(item.id.slice(4));');
    expect(page).toContain("updateUserTask(card.userTaskId, { estimateMin: mins })");
    const db = readFileSync(join(here, "..", "..", "lib", "db.tsx"), "utf8");
    expect(db).toContain("patch.estimateMin = estimateMin === null ? deleteField() : estimateMin");
  });

  it("the rules allow it, bounded, on create and update", () => {
    expect(rules).toContain("data.estimateMin is int && data.estimateMin > 0 && data.estimateMin <= 600");
    expect(rules).toContain("'tags', 'estimateMin'");
  });
});
