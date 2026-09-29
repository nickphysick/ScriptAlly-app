/** Living headers — the report screenshots: both pages at 1440 (empty · one · many) and the hero at 1280/1920 at the longest count. Writes reports/living-headers/shots/. */
import { test } from "@playwright/test";
import { openApp } from "./pageHeaderV2Lib";
test.describe.configure({ timeout: 600_000 });
async function setCount(page: import("@playwright/test").Page, n: number) {
  await page.evaluate((n) => { (window as unknown as { __SA_LH_COUNT: number }).__SA_LH_COUNT = n; window.dispatchEvent(new Event("sa:lh-count")); }, n);
  await page.waitForTimeout(700);
}
test("shots", async ({ page }) => {
  const dir = "reports/living-headers/shots";
  for (const [route, tag] of [["/queries", "qc"], ["/agents", "contact"]] as const) {
    await openApp(page, route, { width: 1440, height: 900 });
    for (const [n, st] of [[0, "empty"], [1, "one"], [27, "many"]] as const) {
      await setCount(page, n);
      await page.screenshot({ path: `${dir}/${tag}-1440-${st}.png` });
    }
    for (const w of [1280, 1920]) {
      await openApp(page, route, { width: w, height: 900 });
      await setCount(page, 148);
      const hd = page.locator('[data-probe="page-header"]').filter({ visible: true }).first();
      await hd.screenshot({ path: `${dir}/${tag}-${w}-hero-148.png` });
    }
  }
});
