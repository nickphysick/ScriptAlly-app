import { test } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Screenshots of the Analytics page, for eyeballing. Not an assertion — a picture.
 *
 * ⚠️ IT SCROLLS ROW 3, NOT THE WINDOW. This page's scroller is `.wpg-scroll`; `fullPage: true`
 * would capture a viewport-height document and miss everything below the fold, which is most of
 * the page.
 *
 * ⚠️ AND IT CAPTURES THE CLAMPED POSITION RATHER THAN SKIPPING IT. The first version broke out of
 * the loop when the scroller could not reach the requested offset — which is exactly the last
 * screenful, the one worth seeing. It stops when the position stops CHANGING, not when it falls
 * short of a number.
 */
test("Analytics: screenshots", async ({ page }) => {
  for (const w of [1440, 1920]) {
    await openRoute(page, "/queries/analytics", { width: w, height: 950 });
    await page.screenshot({ path: `reports/analytics/page-${w}.png` });
    let last = -1;
    for (let n = 1; n <= 5; n++) {
      const at = await page.evaluate((top) => {
        const s = document.querySelector(".qa-wpg .wpg-scroll") as HTMLElement;
        s.scrollTop = top;
        return s.scrollTop;
      }, n * 620);
      if (at === last) break;
      last = at;
      await page.waitForTimeout(250);
      await page.screenshot({ path: `reports/analytics/page-${w}-scroll${n}.png` });
    }
  }
});
