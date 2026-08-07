/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THIS FILE USED TO LOCK THE CORNER POP-UP — its geometry, its elevation pair, its collapse,
 * its launcher and its slide. The corner is RETIRED (workspace pack, Phase 3): Today is a route
 * now, `/todo/today`, and a floating copy of it on the list page would be a second surface owning
 * the same commitment. The two would disagree the first time one of them was wrong.
 *
 * The file is KEPT rather than deleted, and rewritten to lock the RETIREMENT, because the corner
 * is exactly the kind of thing that comes back: it was genuinely useful, and "put Today in the
 * corner" is a reasonable-sounding idea that would quietly reintroduce the second surface. These
 * assertions are what stop that happening by accident.
 *
 * The behaviour it protected did not die — it moved. `TodoTodayPage` renders the day's list from
 * the SAME `todaySplit` derivation, so what is asserted here is that exactly one implementation
 * exists, on the page that owns it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const today = readFileSync(join(here, "TodoTodayPage.tsx"), "utf8");
const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");

describe("the corner pop-up is retired — component, state and styles", () => {
  it("the source really is the To-do page (anchor)", () => {
    expect(page).toContain("ToDoPage");
    expect(page.length).toBeGreaterThan(1000);
  });

  it("neither renderer survives", () => {
    expect(page).not.toContain("function renderTodayCorner");
    expect(page).not.toContain("function renderTodayPanel");
    expect(page).not.toContain("{renderTodayCorner()}");
  });

  it("its markup family is gone", () => {
    for (const cls of [
      "tdb-today2", "tdb-tdpop", "tdb-tprog", "tdb-tcommit", "tdb-ghostbox",
      "tdb-donerow", "tdb-pbtn", "tdb-sbtn",
    ]) {
      expect(page, `${cls} still rendered`).not.toContain(cls);
    }
  });

  it("its stylesheet rules went with it — a rule nothing renders is not a style", () => {
    for (const sel of [".tdb-today2", ".tdb-tdpop"]) {
      expect(css, `${sel} still styled`).not.toContain(sel);
    }
  });

  it("its persisted collapse state went too — nothing is left to restore", () => {
    expect(page).not.toContain("sa.todoTodayMin");
    expect(page).not.toContain("toggleTodayMin");
  });
});

describe("the behaviour moved rather than died", () => {
  it("Today is a page, rendering the day from the ONE derivation", () => {
    expect(today).toContain("todaySplit(board, today)");
    expect(today).toContain("Today’s list");
    /* ⚠️ SUPERSEDED 7 Aug 2026 (tasks-viewport P2): the cleared work used to sit under its own
       "{n} cleared today" band. It settles IN PLACE among the rows now, struck through with its
       time and an Undo, and the count moved into the section head's "{n} open · {n} done" — one
       figure per region rather than a count band and a head that both speak. What this test
       protects is unchanged: the day's cleared work lives on the Today PAGE, visible, not in a
       corner toggle. */
    expect(today).toContain("tdt-row done");
    expect(today).toContain("clearedAtLabel(c.whenMs)");
    expect(today).toContain("todayListCount(committed.length, done.length)");
  });

  it("the tour stop moved with it — a selector matching nothing SKIPS SILENTLY, it does not fail", () => {
    expect(tour).not.toContain('sel: ".tdb-today2"');
    expect(tour).toContain("Today has its own page.");
  });
});
