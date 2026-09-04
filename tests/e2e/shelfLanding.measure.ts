/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE LANDING, IN ITS LIST FORM — measured for the first time ═══════════════════════════════
 *
 * ⚠️ THE CAROUSEL'S STAGE WAS A FIXED `tileH + 108` AND STARTED SCROLLING AT 850px OF VIEWPORT.
 * The list has no fixed stage, so the honest question is where IT starts — reported, not asserted:
 * a threshold tuned to today's shelf fails the next book added as though it were a regression.
 *
 * ⚠️ AND THE ROW CONTROLS ARE CHECKED IN A BROWSER. "Rows are real buttons, not clickable cells" is
 * asserted at source in `manuscriptShelfList.test.tsx`; that they are actually REACHABLE is a claim
 * only a rendered page can make.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const ROW = ".msv-wpg .wpg-scroll";

test("the landing: the list, the promos, and where it starts scrolling", async ({ page }) => {
  await openRoute(page, "/manuscripts", { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  const shape = await page.evaluate(() => {
    const list = document.querySelector(".msv-wpg .msl") as HTMLElement | null;
    if (!list) return { error: "no shelf list" };
    const rows = [...list.querySelectorAll(".msl-table tbody tr")];
    const opens = [...list.querySelectorAll(".msl-open")] as HTMLElement[];
    const promos = [...document.querySelectorAll(".msv-wpg .mpr-tile")];
    return {
      rows: rows.length,
      /* ⚠️ EVERY ROW HAS EXACTLY ONE CONTROL, and it is a BUTTON — a clickable cell would be
         unreachable by keyboard and announce nothing. */
      opens: opens.length,
      openTags: [...new Set(opens.map((o) => o.tagName))],
      openTabbable: opens.filter((o) => o.tabIndex >= 0).length,
      /* Each names its book: six rows of "Open" tell a screen-reader user nothing. */
      openNames: opens.map((o) => o.getAttribute("aria-label")),
      /* The add control is beneath the table, not a row in it. */
      addInsideTable: !!list.querySelector("tbody .msl-add"),
      hasAdd: !!list.querySelector(".msl-add"),
      promoCount: promos.length,
      promoNames: promos.map((p) => p.querySelector(".mpr-name")?.textContent?.trim() ?? ""),
      /* ⚠️ THE MARKER'S CLASS, READ OFF THE RENDERED PAGE. The source lock proves the function
         takes no argument; this proves what actually reached the DOM. */
      markerClasses: [...document.querySelectorAll(".wcb-marker")].map((m) => m.className),
      listH: Math.round(list.getBoundingClientRect().height),
    };
  });
  console.log("LANDING " + JSON.stringify(shape));
  const s = shape as unknown as Record<string, never> & {
    rows: number; opens: number; openTags: string[]; openTabbable: number;
    addInsideTable: boolean; promoCount: number; markerClasses: string[];
  };
  expect((shape as { error?: string }).error).toBeUndefined();
  expect(s.opens, "a row has no Open control").toBe(s.rows);
  expect(s.openTags, "a row's control is not a button").toEqual(["BUTTON"]);
  expect(s.openTabbable, "a row's control is not keyboard-reachable").toBe(s.rows);
  expect(s.addInsideTable, "the add control is announced as a manuscript").toBe(false);
  /* ⚠️ ONE CLASS, WHEREVER THE MARKER FELL. If more than one distinct value reached the DOM, the
     chart has started colouring by position — a verdict wearing a colour. */
  expect(new Set(s.markerClasses).size, `the marker carries state: ${s.markerClasses.join(" | ")}`)
    .toBeLessThanOrEqual(1);

  /* ── where the landing starts scrolling ── */
  const heights: { h: number; overflow: number }[] = [];
  for (const h of [1100, 1000, 950, 900, 850, 800, 760, 720, 680]) {
    await page.setViewportSize({ width: 1440, height: h });
    await page.waitForTimeout(200);
    heights.push({ h, overflow: await page.evaluate((sel) => {
      const r = document.querySelector(sel) as HTMLElement | null;
      return r ? r.scrollHeight - r.clientHeight : -1;
    }, ROW) });
  }
  const first = heights.filter((x) => x.overflow > 4).sort((a, b) => b.h - a.h)[0] ?? null;
  console.log("LANDING_HEIGHTS " + JSON.stringify({ heights, startsScrollingAt: first?.h ?? null }));
  expect(heights.length).toBe(9);
});
