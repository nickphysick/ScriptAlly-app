/**
 * Query Centre v132 — the report's screenshots (reports/qc-v132/shots), at 1280 and 1512, each named for
 * the reference PNG it sits beside (design-refs/qc-v132/). Not a lock: it asserts only that each subject
 * was on the page before it was photographed.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV132Shots
 */
import { test, expect, Page } from "@playwright/test";
import { inkOpen } from "./inkLib";

const OUT = "reports/qc-v132/shots";
async function open(page: Page, w: number) {
  await inkOpen(page, "/queries", w, { scope: "qc132shots" });
  await expect(page.locator('[data-qcv="ru"]:not([data-sk])')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible({ timeout: 20_000 });
  /* the page guide is a once-per-writer card; it is closed so it does not sit over the subject */
  await page.locator('[aria-label="Close the guide"], [data-guide-close]').first().click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(500);
}
const top = (page: Page, sel: string, block: "start" | "center" = "start") => page.locator(sel).first().evaluate((e, b) => e.scrollIntoView({ block: b as ScrollLogicalPosition }), block);

test("v132 shots", async ({ page }) => {
  for (const w of [1280, 1512]) {
    await open(page, w);
    await top(page, '[data-qcv="ru"]', "center"); await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/ru-${w}.png` });
    await page.locator('[data-qcv="court"][data-court="agent"] [data-qcv="court-pick"]').click(); await page.waitForTimeout(400);
    await top(page, '[data-qcv="ru"]', "center"); await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/ru-agents-${w}.png` });
    await page.locator('[data-qcv="court"][data-court="agent"] [data-qcv="court-pick"]').click(); await page.waitForTimeout(300);

    await page.locator('[data-qcv="ws-group"]').evaluate((e) => e.scrollIntoView({ block: "center" })); await page.waitForTimeout(200);
    await page.locator('[data-qcv="ws-group"]').click(); await page.waitForTimeout(250);
    await page.getByRole("menuitemradio", { name: /^Urgency$/ }).first().click(); await page.waitForTimeout(500);
    await page.locator('[data-qcv="ws-bar"]').evaluate((e) => { const sc = e.closest(".wpg-scroll")!; sc.scrollTop += e.getBoundingClientRect().top - sc.getBoundingClientRect().top - 90; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/ws-${w}.png` });

    const row = page.locator('.qcw-list [data-qcv="row"]').nth(1);
    await row.hover(); await page.waitForTimeout(200);
    await row.locator('[data-qcv="sent-tile"]').nth(0).hover(); await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/ws-hover-${w}.png` });

    const pkg = page.locator('.qcw-list [data-qcv="row-pkg"]').first();
    expect(await pkg.count(), "a package chip to photograph").toBeGreaterThan(0);
    await pkg.scrollIntoViewIfNeeded(); await pkg.hover(); await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/ws-package-${w}.png` });

    const add = page.locator('.qcw-list [data-qcv="row-add"]').first();
    expect(await add.count(), "a + Add to photograph").toBeGreaterThan(0);
    await add.scrollIntoViewIfNeeded(); await add.hover(); await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/ws-unrecorded-${w}.png` });
    await page.mouse.move(4, 4);

    await page.locator('[data-qcv="ws-bar"]').evaluate((e) => { const sc = e.closest(".wpg-scroll")!; sc.scrollTop += e.getBoundingClientRect().top - sc.getBoundingClientRect().top - 90; });
    await page.locator('[data-qcv="ws-density"] [data-d="compact"]').click(); await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/ws-compact-${w}.png` });
    await page.locator('[data-qcv="ws-density"] [data-d="comfortable"]').click(); await page.waitForTimeout(250);

    await page.locator('[data-qcv="ws-pill"][data-k="past"]').click(); await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/ws-pill-overdue-${w}.png` });
    await page.locator('[data-qcv="ws-pill"][data-k="past"]').click(); await page.waitForTimeout(300);

    await page.locator('[data-qcv="find"] input').fill("zzqqxx"); await page.waitForTimeout(450);
    await expect(page.locator('[data-qcv="dead"]')).toBeVisible();
    await page.screenshot({ path: `${OUT}/ws-dead-${w}.png` });
    await page.locator('[data-qcv="dead-clear"]').click(); await page.waitForTimeout(300);
    await page.locator('[data-qcv="ws-group"]').click(); await page.waitForTimeout(250);
    await page.getByRole("menuitemradio", { name: /^No grouping$/ }).first().click(); await page.waitForTimeout(300);
  }
});
