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

/* ⚠️ RETARGETED by the `calendar` session (timeline pack, Phase 3), flagged in
   reports/calendar-timeline.md.

   THE FIRST LAW HAS NO SUBJECT: there is no legend. `CAL_LEGEND` named the four CARD families and
   `CAL_PIP` painted them; the timeline's grammar is five kinds — your turn, waiting, on the
   record, your tasks, carried — which the filter chips name in words. Neither map has a
   PRODUCTION consumer any more; both are left in `todoFamily.ts` untouched, because deleting a
   shared map on the strength of one page's redesign is not this session's call.

   THE SECOND LAW SURVIVES AND IS THE ONE WORTH KEEPING: legend and map may not disagree about
   which families exist. It is a claim about the two records, not about a page, so it is asserted
   exactly as it was. */
describe("⚠️ the family map and its legend still agree, though nothing renders them", () => {
  it("⚠️ the legend has no render site — stated, so its absence is not read as a regression", () => {
    expect(page).not.toContain("cal-legend");
    expect(page).not.toContain("CAL_LEGEND");
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
