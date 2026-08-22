/**
 * PAPER-RUN SHOTS — the four states the report claims, at 1280 and 2300.
 *   SA_E2E_BASE_URL=http://localhost:4193 npx playwright test nbPaperShot
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/noteboard";
const OUT = "reports/noteboard-paper";

for (const width of [1280, 2300]) {
  test(`shots at ${width}: populated (no examples), a link, the composer`, async ({ page }) => {
    await openRoute(page, ROUTE, { width, height: 1000 });
    await expect(page.locator(".nb-board")).toBeVisible();
    /* the populated board carries no examples — the claim the shot evidences */
    expect(await page.locator("[data-example]").count()).toBe(0);
    await expect(page.locator(".nb-note").filter({ hasText: "NBLINK" }).first()).toBeVisible();
    await page.screenshot({ path: `${OUT}/board-${width}.png` });

    await page.locator(".nb-ghost").click();
    await page.waitForTimeout(400);
    await expect(page.locator(".nb-compose")).toBeVisible();
    await page.screenshot({ path: `${OUT}/composer-${width}.png` });
    await page.locator(".nb-ccancel").click();
  });
}
