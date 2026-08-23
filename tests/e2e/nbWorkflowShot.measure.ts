/**
 * WORKFLOW v2 SHOTS — four states at two widths, each asserting its claim before it shoots.
 *   SA_E2E_BASE_URL=http://localhost:4195 npx playwright test nbWorkflowShot
 * Board must start EMPTY: the cases pin their own notes through the real composer.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const OUT = "reports/noteboard-workflow";
const ROUTE = "/todo/noteboard";

const pin = async (page: import("@playwright/test").Page, body: string) => {
  await page.locator(".tpl-tools .tdb-addb").filter({ hasText: "Pin a note" }).locator("visible=true").first().click();
  await page.locator(".nb-compose textarea").fill(body);
  await page.locator(".nb-compose .nb-csave").click();
  await page.waitForTimeout(900);
};

for (const width of [1280, 2300]) {
  test(`shots at ${width}: zero, one, four notes, and the drawer`, async ({ page }) => {
    await openRoute(page, ROUTE, { width, height: 1200 });

    /* zero — the empty arrangement, CTA above the panels */
    expect(await page.locator(".nb-note:not(.nb-example)").count(), "board not empty").toBe(0);
    await expect(page.locator(".nb-wf-cta")).toBeVisible();
    await page.screenshot({ path: `${OUT}/zero-${width}.png`, fullPage: true });

    /* the drawer, from the empty state's own Browse examples */
    await page.locator(".nb-wf-cta").getByRole("button", { name: "Browse examples" }).click();
    await page.waitForTimeout(600);
    await expect(page.locator(".nb-drawer")).toBeVisible();
    await page.screenshot({ path: `${OUT}/drawer-${width}.png` });
    await page.locator(".nb-drawer-x").click();
    await page.waitForTimeout(400);

    /* one — the below-board arrangement, no CTA */
    await pin(page, "WFSHOT one");
    expect(await page.locator(".nb-wf-cta").count(), "a CTA row survived a note").toBe(0);
    await expect(page.locator(".nb-wf-sep")).toBeVisible();
    await page.screenshot({ path: `${OUT}/one-note-${width}.png`, fullPage: true });

    /* four — the workflow still there */
    for (const n of ["two", "three", "four"]) await pin(page, `WFSHOT ${n}`);
    expect(await page.locator(".nb-note:not(.nb-example)").count()).toBeGreaterThanOrEqual(4);
    await expect(page.locator(".nb-wf-sep")).toBeVisible();
    await page.screenshot({ path: `${OUT}/four-notes-${width}.png`, fullPage: true });
  });
}
