/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1 — the shots beside design-refs/help-system-v1/screens 13 and 14, at 1512 × 900 and 1280 × 800 (@2x),
 * on the target named by SA_E2E_BASE_URL. The harness account; its guide state is not touched.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/help-centre-v1/shots";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
test.use({ deviceScaleFactor: 2 });

const go = async (page: Page, route: string, vp: { width: number; height: number }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem("sa.guide.autoOpened", "1"); sessionStorage.setItem("sa.help.from", "/agents"); } catch { /* none */ } });
  await openRoute(page, route, vp);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(5, vp.height - 5);
  await page.waitForTimeout(600);
};
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${OUT}/${name}-${w}@2x.png` });
const scrollStage = (page: Page, y: number) => page.evaluate((dy) => { const s = document.querySelector<HTMLElement>("#app-stage-scroll"); if (s) s.scrollTop = dy; }, y);

test("HC1 shots", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  for (const vp of SIZES) {
    const w = vp.width;
    await go(page, "/help", vp);
    await shot(page, "13-help-centre", w);
    await scrollStage(page, 640); await page.waitForTimeout(300);
    await shot(page, "13-help-centre-browse", w);
    await scrollStage(page, 0);
    const input = page.locator("[data-hc='search-input']").filter({ visible: true }).first();
    await input.fill("partial"); await page.waitForTimeout(300);
    await shot(page, "13-help-centre-search", w);
    await input.fill("zzqxv"); await page.waitForTimeout(300);
    await shot(page, "13-help-centre-no-result", w);
    await input.fill("");
    await go(page, "/help/add-an-agent", vp);
    await shot(page, "14-article", w);
    await scrollStage(page, 520); await page.waitForTimeout(300);
    await shot(page, "14-article-steps", w);
    await go(page, "/help/status-key", vp);
    await shot(page, "14-article-status-key", w);
    await go(page, "/help/add-an-agent", vp);
    await page.locator("[data-hc='showme-go']").filter({ visible: true }).first().click();
    await page.locator("[data-pck='spot'] [data-pck='card']").waitFor({ timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(700);
    await shot(page, "14-show-me-lands", w);
    await page.keyboard.press("Escape");
  }
});
