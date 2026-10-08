/**
 * Query Centre v133 — the report's screenshots (reports/qc-v133/shots): the top of /queries and the same
 * crop of /agents at 1512 × 900 and 1280 × 800, to sit beside design-refs/qc-v133/ref-header-*@2x.png.
 * Not a lock: it asserts only that each header was on the page before it was photographed.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV133Shots
 */
import { test, expect } from "@playwright/test";
import { inkOpen } from "./inkLib";

test("v133 shots", async ({ page }) => {
  for (const [w, h] of [[1512, 900], [1280, 800]] as const) {
    await inkOpen(page, "/queries", w, { height: h, scope: "qc133shots" });
    await expect(page.locator('[data-qcv="open-header"]:not([data-loading])')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-qcv="court"]').first()).toBeVisible({ timeout: 20_000 });
    await page.locator('[aria-label="Close the guide"], [data-guide-close]').first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: `reports/qc-v133/shots/queries-${w}.png`, clip: { x: 0, y: 0, width: w, height: 640 } });
    await inkOpen(page, "/agents", w, { height: h, scope: "qc133shots" });
    await expect(page.locator('[data-cl15="header"]:not([data-loading])')).toBeVisible({ timeout: 20_000 });
    await page.locator('[aria-label="Close the guide"], [data-guide-close]').first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: `reports/qc-v133/shots/agents-${w}.png`, clip: { x: 0, y: 0, width: w, height: 640 } });
  }
});
