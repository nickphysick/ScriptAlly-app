/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The calendar legend + the butter decision (tasks-audit pack, Phase 4).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CAL_PIP, CAL_LEGEND } from "../../lib/todoFamily";

const here = __dirname;
const page = readFileSync(join(here, "TodoCalendarPage.tsx"), "utf8");
const family = readFileSync(join(here, "..", "..", "lib", "todoFamily.ts"), "utf8");
const cal = readFileSync(join(here, "..", "..", "lib", "todoCalendar.ts"), "utf8");
const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");

describe("⚠️ the legend ships, and names exactly the LIVE families", () => {
  it("a legend row renders beneath the grid, from the one record", () => {
    expect(page).toContain('className="cal-legend"');
    expect(page).toContain("CAL_LEGEND.map");
    // the legend follows the grid in the JSX
    expect(page.indexOf("cal-legend")).toBeGreaterThan(page.indexOf("cal-grid"));
  });

  it("exactly the four live families, in the ref's order", () => {
    expect(CAL_LEGEND.map((l) => l.label)).toEqual([
      "AGENT DEADLINES", "YOUR TASKS", "SNOOZED RETURNS", "COMPLETED",
    ]);
    expect(CAL_LEGEND.map((l) => l.family)).toEqual(Object.keys(CAL_PIP));
  });
});

describe("⚠️ the butter 'dated notes' family is RETIRED — no dead render path", () => {
  it("the type, the tone and the legend row all went together", () => {
    expect(Object.keys(CAL_PIP)).not.toContain("note");
    // the LEGEND ENTRY is extinct (the retirement comment may name the family in prose)
    expect(family).not.toContain('label: "DATED NOTES"');
    expect(cal).not.toContain('"note" : "task"');   // the placement branch is gone
    expect(cal).toContain('"agent" | "task" | "snoozed" | "done"');
  });

  it("themes.md carries the retirement and its one condition", () => {
    expect(themes).toContain('The butter "dated notes" family is RETIRED');
    expect(themes).toContain("note-ORIGIN");
  });
});
