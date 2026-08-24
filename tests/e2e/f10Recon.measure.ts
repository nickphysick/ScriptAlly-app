import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
test.setTimeout(240_000);
test("does desktop + Attach already offer a package, and what does it write", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2200);
  const qc = page.locator(".qc-wpg");
  /* a query with no package, so the Attach menu is in its ordinary state */
  const rows = qc.locator(".f12-row");
  for (let i = 0; i < 12; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(500);
    if (!(await qc.locator(".qc-strip--packed").count()) && await qc.locator(".qc-mchip-add").count()) break;
  }
  await qc.locator(".qc-mchip-add").first().click();
  await page.waitForTimeout(600);
  const items = await page.evaluate(() =>
    [...document.querySelectorAll("[role='menuitem'], [role='menu'] button")]
      .map((e) => (e.textContent || "").trim()).filter(Boolean));
  console.log(`DESKTOP + ATTACH MENU: ${JSON.stringify(items)}`);
  /* the in-place affordances the pane already carries */
  const inplace = await qc.evaluate((r) =>
    [...r.querySelectorAll(".qp-inplace, .qp-stat, .qc-mname")].map((e) => ({
      cls: String(e.className).split(" ")[0], t: (e.textContent || "").trim().slice(0, 24),
      tip: e.getAttribute("title") })));
  console.log(`IN-PLACE EDITABLES: ${JSON.stringify(inplace)}`);
});
