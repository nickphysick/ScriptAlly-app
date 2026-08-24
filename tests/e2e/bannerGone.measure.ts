import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
test.setTimeout(180_000);
test("the banner goes when the last flagged row does", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  const bar = await qc.evaluate((r) => (r.querySelector(".qc-needbar") as HTMLElement | null)?.innerText ?? null);
  const rows = await qc.locator(".f12-row").count();
  console.log(`rows: ${rows} · banner: ${JSON.stringify(bar)}`);
  expect(bar, "the banner outlived the rows it was about").toBeNull();
});
