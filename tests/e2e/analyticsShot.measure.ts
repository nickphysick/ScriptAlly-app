import { test } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Screenshots of the Analytics page, for eyeballing. Not an assertion — a picture.
 *
 * ⚠️ IT SCROLLS ROW 3, NOT THE WINDOW. This page's scroller is `.wpg-scroll`; `fullPage: true`
 * would capture a viewport-height document and miss everything below the fold, which is most of
 * the page.
 */
test("Analytics: screenshots", async ({ page }) => {
  for (const w of [1440, 1920]) {
    await openRoute(page, "/queries/analytics", { width: w, height: 950 });
    await page.screenshot({ path: `reports/analytics/page-${w}.png` });
    for (const [n, y] of [[1, 700], [2, 1400], [3, 2100]] as const) {
      const moved = await page.evaluate((top) => {
        const s = document.querySelector(".qa-wpg .wpg-scroll") as HTMLElement;
        s.scrollTop = top;
        return s.scrollTop;
      }, y);
      if (moved < y - 20 && n > 1) break; // reached the end — no more to show
      await page.waitForTimeout(250);
      await page.screenshot({ path: `reports/analytics/page-${w}-scroll${n}.png` });
    }
  }
});
