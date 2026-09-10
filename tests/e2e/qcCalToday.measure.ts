import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ THE TODAY LINE AND THE TODAY DOT ARE THE SAME DATE, so they are the same x. This asserts
 * EQUALITY, not proximity — two marks for one day that disagree by any visible amount are a reader
 * being shown two "todays".
 *
 * ⚠️ AND THE COMPARISON IS BETWEEN THEIR CENTRES. The dot is a numeral in a disc placed by its
 * LEFT edge; the line is a 1.5px border. Comparing box lefts would compare a disc's edge against a
 * hairline and report a difference that is only the disc's own width.
 */
const WIDTHS = [1280, 1536, 1710, 1920, 2520];

const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const live = [...document.querySelectorAll<HTMLElement>(".wpg.qc-wpg")].filter((e) => e.getBoundingClientRect().height > 0)[0];
  const q = (s: string) => live.querySelector<HTMLElement>(s);
  const dot = q(".tl-dt.now");
  const line = q(".tl-todayline");
  const lane = q(".tl-rrow .tl-c-tl") ?? q(".tl-c-tl");
  if (!dot || !line || !lane) return null;
  const db = dot.getBoundingClientRect(), lb = line.getBoundingClientRect(), nb = lane.getBoundingClientRect();
  return {
    dotCentre: +(db.x + db.width / 2).toFixed(2),
    lineCentre: +(lb.x + lb.width / 2).toFixed(2),
    delta: +((lb.x + lb.width / 2) - (db.x + db.width / 2)).toFixed(2),
    laneW: +nb.width.toFixed(2),
    halfDay: +(nb.width / 90 / 2).toFixed(2),
    dotLeftStyle: dot.getAttribute("style"),
    lineLeftStyle: line.getAttribute("style"),
  };
});

for (const w of WIDTHS) {
  for (const dens of ["comfortable", "compact"] as const) {
    test(`today line === today dot at ${w} · ${dens}`, async ({ page }) => {
      await openRoute(page, "/queries", { width: w, height: 1000 });
      await page.evaluate(() => {
        const l = [...document.querySelectorAll<HTMLElement>(".wpg.qc-wpg")].filter((e) => e.getBoundingClientRect().height > 0)[0];
        l.setAttribute("data-qc-live", "1");
      });
      await page.locator('[data-qc-live] .qvs button:has-text("Calendar")').first().click();
      await page.waitForTimeout(1300);
      if (dens === "compact") {
        await page.locator('[data-qc-live] .qcc-denspill button:has-text("Compact")').first().click();
        await page.waitForTimeout(700);
      }
      const m = await read(page);
      expect(m, "no today dot or line on the board — the case has no subject").not.toBeNull();
      console.log(`TODAY ${w} ${dens} delta=${m!.delta} lane=${m!.laneW} halfDay=${m!.halfDay} dotStyle=${m!.dotLeftStyle} lineStyle=${m!.lineLeftStyle}`);
      expect(Math.abs(m!.delta), `the line and the dot are ${m!.delta}px apart — one date, two x's`).toBeLessThanOrEqual(0.5);
    });
  }
}
