/**
 * v58 — RETIRED: the four-tier load order (owed → dated → silences → closed) was v58's own
 * sort law; v64's board opens grouped by ATTENTION and sorted by URGENCY, both from the facet
 * model, and the writer can regroup and re-sort from the panel. Successors: calTool63 c2 (every
 * grouping's counts sum to the rows drawn), c3 (sort changes order, default restores), c5 (the
 * facet census sums to the board — the tab-count claim's heir).
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("the board opens on Attention/Urgency, and the tab strip's heirs are mounted", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const firstBar = g.querySelector(".tl-grp .tl-gdiv .gp > span:not(.gico)")?.textContent?.trim() ?? null;
    return { tabs: g.querySelectorAll(".tl-tabs").length, firstBar,
      urgentFirst: (g.querySelector(".tl-grp") as HTMLElement | null)?.dataset.sec ?? null };
  });
  expect(r.tabs, "the tab strip is back").toBe(0);
  /* urgency's first group is the writer's own pile — the owed-first tier's heir */
  expect(r.urgentFirst, "the board does not open on the Urgent group").toBe("over");
});
