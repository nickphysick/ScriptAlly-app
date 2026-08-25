import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(240_000);
test("F-AQ — does the pane's in-place grammar trip the band's focus reveal?", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2500);
  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");
  for (let i = 0; i < 25; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(300);
    if (await qc.locator(".qc-stat").count()) break;
  }
  const inplace = await qc.evaluate((r) =>
    [...r.querySelectorAll(".qp-inplace")].map((e) => ({
      text: (e as HTMLElement).innerText.trim().slice(0, 22),
      insideAttach: !!(e as HTMLElement).closest(".qc-attach"),
    })));
  console.log(`in-place controls on a packaged query: ${JSON.stringify(inplace)}`);

  await qc.evaluate((r) => (r.querySelector(".qp-inplace") as HTMLElement)?.focus());
  await page.waitForTimeout(500);
  const after = await qc.evaluate((r) => ({
    acts: getComputedStyle(r.querySelector(".qc-stat-acts")!).opacity,
    focused: (document.activeElement as HTMLElement)?.className?.toString().slice(0, 30),
  }));
  console.log(`after focusing an in-place control: ${JSON.stringify(after)}`);
  await page.screenshot({ path: resolve(process.cwd(), "reports/band/faq.png") });
});
