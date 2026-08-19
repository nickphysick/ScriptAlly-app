import { test } from "@playwright/test";
import { openRoute } from "./measure";

/** Screenshots of the Analytics page, for eyeballing. Not an assertion — a picture. */
test("Analytics: screenshots", async ({ page }) => {
  for (const w of [1440, 1920]) {
    await openRoute(page, "/queries/analytics", { width: w, height: 950 });
    await page.screenshot({ path: `reports/analytics/page-${w}.png`, fullPage: false });
  }
});
