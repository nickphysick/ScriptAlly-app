/**
 * Query Centre v134 — the report's screenshots (reports/qc-v134/shots), named for the reference PNG each
 * sits beside (design-refs/qc-v134/). Not a lock: it asserts only that each subject was on the page.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV134Shots
 */
import { test, expect, Page } from "@playwright/test";
import { inkOpen } from "./inkLib";

const OUT = "reports/qc-v134/shots";
const centre = async (page: Page, sel: string) => { await page.locator(sel).first().evaluate((e) => e.scrollIntoView({ block: "center" })); await page.waitForTimeout(500); };

test("v134 shots", async ({ page }) => {
  for (const [w, h] of [[1512, 900], [1280, 800]] as const) {
    await inkOpen(page, "/queries", w, { height: h, scope: "qc134shots" });
    await expect(page.locator('[data-qcv="open-header"]:not([data-loading])')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible({ timeout: 20_000 });
    await page.locator('[aria-label="Close the guide"], [data-guide-close]').first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/header-desk-${w}.png` });
    if (w === 1512) {
      await page.locator('[data-qcv="oh-face"]').nth(1).hover();
      await expect(page.locator('[data-qcv="tip"].on')).toBeVisible();
      await page.screenshot({ path: `${OUT}/faces-hover-${w}.png`, clip: { x: 248, y: 64, width: w - 248, height: 420 } });
      await page.mouse.move(4, 4);
      await page.locator('[data-qcv="court"][data-court="agent"] [data-qcv="court-pick"]').click();
      await centre(page, '[data-qcv="courts"]');
      await page.mouse.move(4, 4);
      await page.screenshot({ path: `${OUT}/desk-selected-${w}.png` });
      await page.locator('[data-qcv="court"][data-court="agent"] [data-qcv="court-pick"]').click();
      await page.waitForTimeout(300);
    }
    await centre(page, '[data-qcv="ru"]');
    await page.mouse.move(4, 4);
    await page.screenshot({ path: `${OUT}/band-${w}.png` });
    await centre(page, '[data-qcv="banner"]');
    await page.screenshot({ path: `${OUT}/banner-${w}.png` });
  }
});
