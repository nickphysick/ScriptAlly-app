/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Activity feed drawer v2 — the report's shots, written to reports/feed-drawer-v2/shots. No assertions beyond each
 * drawer being open.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";
import { openDrawer, openQc } from "./qc126Lib";

const OUT = "reports/feed-drawer-v2/shots";
test("feed drawer v2 shots", async ({ page }) => {
  test.setTimeout(400_000);
  mkdirSync(OUT, { recursive: true });
  await page.addInitScript(() => {
    try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ }
  });
  const feed = async (vp: { width: number; height: number }) => {
    await openRoute(page, "/dashboard", vp);
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-d58="tab"]').click({ timeout: 6000 });
    await expect(page.locator('[data-d58="drawer"]')).toBeVisible();
    await page.waitForTimeout(900);
  };
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    await feed(vp);
    await page.locator('[data-d58="drawer-range"]').selectOption("all");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/feed-${vp.width}.png` });
    if (vp.width === 1512) {
      await page.locator('[data-d58="ev-done"]').first().evaluate((e) => e.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/feed-lower-1512.png` });
    }
    await page.keyboard.press("Escape");
  }
  await openQc(page, { width: 1512, height: 900 });
  await openDrawer(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/birds-eye-1512.png` });
  await page.keyboard.press("Escape");
  await openRoute(page, "/agents", { width: 1512, height: 900 });
  await page.locator(".clv-row").first().waitFor({ timeout: 25_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.mouse.click(5, 5).catch(() => {});
  for (let i = 0; i < 3 && !(await page.locator('[data-hdr="housekeeping"]').isVisible().catch(() => false)); i++) {
    await page.keyboard.press("h");
    await page.locator('[data-hdr="housekeeping"]').waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/housekeeping-1512.png` });
});
