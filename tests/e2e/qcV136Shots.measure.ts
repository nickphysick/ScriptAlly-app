/**
 * Query Centre v136 — the report's screenshots (reports/qc-v136/shots): the page at 1512 × 900 and
 * 1280 × 800 beside design-refs/qc-v136/ref-page-*@2x.png, and a crop of the bands beside ref-cards-*@2x.png.
 * Not a lock: it asserts only that each subject was on the page.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV136Shots
 */
import { test, expect } from "@playwright/test";
import { inkOpen } from "./inkLib";

test("v136 shots", async ({ page }) => {
  for (const [w, h] of [[1512, 900], [1280, 800]] as const) {
    await inkOpen(page, "/queries", w, { height: h, scope: "qc136shots" });
    await expect(page.locator('[data-qcv="open-header"]:not([data-loading])')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible({ timeout: 20_000 });
    await page.locator('[aria-label="Close the guide"], [data-guide-close]').first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: `reports/qc-v136/shots/page-${w}.png` });
    const b = await page.locator('[data-qcv="courts"]').boundingBox();
    expect(b, "the bands").not.toBeNull();
    await page.screenshot({ path: `reports/qc-v136/shots/cards-${w}.png`, clip: { x: b!.x - 16, y: b!.y - 16, width: b!.width + 32, height: b!.height + 90 } });
  }
});
