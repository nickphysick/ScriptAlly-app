/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MonthGrid (To-do nudge desk v2 · Phase 3) — THE CALENDAR'S LIMITS. No day after `max` (today, for the nudge) and no
 * day before `min` (the day the query was sent) can be picked; the arrows stop at those months; Monday first. The rules
 * are called as the grid calls them, and the grid is rendered (`renderToStaticMarkup`).
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canPick, monthCells, monthNav, openingMonth } from "../../lib/monthGrid";
import { MonthGrid } from "./MonthGrid";

const today = new Date(2026, 10, 28);      // Sat 28 Nov 2026
const sent = new Date(2026, 5, 3);         // Wed 3 Jun 2026
const nov = new Date(2026, 10, 1), jun = new Date(2026, 5, 1);

describe("which days can be picked (logic)", () => {
  it("no day after today, no day before the send; the ends themselves can", () => {
    expect(canPick(new Date(2026, 10, 29), sent, today)).toBe(false);
    expect(canPick(new Date(2026, 5, 2), sent, today)).toBe(false);
    expect(canPick(today, sent, today)).toBe(true);
    expect(canPick(sent, sent, today)).toBe(true);
    expect(canPick(new Date(2026, 10, 28, 23, 30), sent, today), "any time on today").toBe(true);
  });
  it("the cells: November's after the 28th disabled, June's before the 3rd disabled; today and the pick marked; Monday first", () => {
    const n = monthCells(nov, { min: sent, max: today, today, value: new Date(2026, 10, 25) });
    expect(n.lead, "1 Nov 2026 is a Sunday: six blanks, Monday first").toBe(6);
    expect(n.cells.filter((c) => c.disabled).map((c) => c.day)).toEqual([29, 30]);
    expect(n.cells.find((c) => c.today)?.day).toBe(28);
    expect(n.cells.find((c) => c.picked)?.day).toBe(25);
    const j = monthCells(jun, { min: sent, max: today, today, value: null });
    expect(j.cells.filter((c) => c.disabled).map((c) => c.day)).toEqual([1, 2]);
  });
  it("the arrows stop at the send's month and at this month; it opens on the pick's month, else this month", () => {
    expect(monthNav(nov, sent, today)).toEqual({ prev: true, next: false });
    expect(monthNav(jun, sent, today)).toEqual({ prev: false, next: true });
    expect(openingMonth(null, sent, today).getMonth()).toBe(10);
    expect(openingMonth(new Date(2026, 7, 9), sent, today).getMonth()).toBe(7);
    expect(openingMonth(new Date(2027, 0, 9), sent, today).getMonth(), "never past max's month").toBe(10);
  });
});

describe("the grid renders its limits", () => {
  const html = renderToStaticMarkup(<MonthGrid month={nov} onMonth={() => {}} min={sent} max={today} today={today} value={null} onPick={() => {}} footnote="The day the nudge went. Later days aren’t open." />);
  it("days after today are disabled buttons; today is ringed; Next is disabled in this month", () => {
    expect(html).toMatch(/data-mg-day="29" disabled=""/);
    expect(html).toMatch(/data-mg-day="30" disabled=""/);
    expect(html).not.toMatch(/data-mg-day="28" disabled=""/);
    expect(html).toMatch(/data-mg-day="28"[^>]*data-today=""/);
    expect(html).toMatch(/data-mg="next" disabled=""/);
    expect(html).not.toMatch(/data-mg="prev" disabled=""/);
    expect(html).toContain(">November 2026<");
    expect(html).toContain("The day the nudge went. Later days aren’t open.");
    expect([...html.matchAll(/class="mg-wd"[^>]*>(\w)</g)].map((m) => m[1]).join("")).toBe("MTWTFSS");
  });
  it("a click on a day outside the limits is refused even if it reaches the button (canPick guards onPick)", () => {
    const src = readFileSync(join(__dirname, "MonthGrid.tsx"), "utf8");
    expect(src).toContain("onClick={() => { if (canPick(c.date, min, max)) onPick(c.date); }}");
  });
});
