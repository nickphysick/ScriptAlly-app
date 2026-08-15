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

  it("⚠️ NEVER FREE TEXT — the derivation takes rungs, and no input reaches the field", () => {
    expect(est).not.toContain("<input");
    expect(est).not.toContain("parseFloat");
  });

  /**
   * ⚠️ THE LADDER IS NOT OFFERED ANYWHERE, AND THAT IS THE ASSERTION NOW (15 Aug). It used to be
   * "offered on TODAY only". It wrote `UserTask.estimateMin`, and the only two surfaces that ever
   * DISPLAYED that field are both gone — `.tdg-stats`' total was retired as a duplicate, and
   * `estimateChip` lives in `TodoBoard.tsx`, which is mounted nowhere. A menu that writes a figure
   * the writer can never read back is neither "shown somewhere" nor "not offered"; it is now the
   * second. Not a permanent no: estimates belong with a "what can I get done today" view, which
   * this app does not have.
   */
  it("⚠️ the ladder is offered NOWHERE — a field nothing displays is not offered", () => {
    const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(decls(menu)).not.toContain("est-");
    expect(decls(menu)).not.toContain('"estimate"');
    /* ⚠️ COMPARED AS STRINGS ON PURPOSE. `MenuItemId` no longer contains "estimate", so a typed
       `e.id === "estimate"` is a compile error rather than a runtime check — and a lock that
       cannot be written is a lock that stops running. This asserts the RENDERED model, which is
       what a user meets, and keeps failing loudly if the id ever comes back. */
    for (const col of ["today", "todo", "snoozed", "done"] as const) {
      const ids = cardMenu(card({ userTaskId: "u1" }), col).flatMap((g) => g.entries).map((e) => String(e.id));
      expect(ids.some((id) => id === "estimate" || id.startsWith("est-")), col).toBe(false);
    }
  });

  /* ⚠️ `TodoBoard` IS MOUNTED NOWHERE — this exercises a real function of an unmounted component,
     which is why the chip could not be the estimate's "somewhere it is displayed". Left standing
     because retiring that component is its own pass; noted so the green is not read as reach. */
  it("the chip renders on a Today card and NOWHERE else (in the unmounted board)", () => {
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

  /**
   * ⚠️ `UserTask.estimateMin` IS NOW WRITTEN BY NOTHING AND READ BY NOTHING. Its presence in the
   * type, in the rules allowlist and in any existing document is NOT evidence that the feature
   * exists — which is exactly what a future reader would otherwise conclude. The `db.tsx` path and
   * the rules clause are deliberately left intact: they are the cheap half, and re-adding a
   * bounded field to deployed rules is the expensive half.
   */
  it("⚠️ nothing writes the field — the handler went with the menu items", () => {
    const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(decls(page)).not.toContain("est-none");
    expect(decls(page)).not.toContain("estimateMin: mins");
    /* the write PATH survives, unused — reinstating is one line, not a rules deploy */
    const db = readFileSync(join(here, "..", "..", "lib", "db.tsx"), "utf8");
    expect(db).toContain("patch.estimateMin = estimateMin === null ? deleteField() : estimateMin");
  });

  it("the rules allow it, bounded, on create and update", () => {
    expect(rules).toContain("data.estimateMin is int && data.estimateMin > 0 && data.estimateMin <= 600");
    expect(rules).toContain("'tags', 'estimateMin'");
  });
});
