/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — the report's shots, one beside each reference screen (design-refs/dashboard-feed-v1/screens/),
 * at 2× like the references. Writes to reports/dashboard-feed-v1/shots/. Reads only.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/dashboard-feed-v1/shots";
test.use({ deviceScaleFactor: 2 });
test.setTimeout(300_000);

async function open(page: Page, width: number, height: number, collapsed: boolean) {
  await page.addInitScript(([c]) => {
    try { localStorage.setItem("scriptally:sidebar-collapsed", c ? "1" : "0"); localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* */ }
  }, [collapsed] as const);
  await openRoute(page, "/dashboard", { width, height });
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(1600);
}
/** the whole page: the scroller grown to its content for one picture */
async function full(page: Page, path: string) {
  const h = await page.evaluate(() => { const p = document.querySelector<HTMLElement>(".ws-wbody")!; return p.scrollHeight - p.clientHeight; });
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.width, height: vp.height + h });
  await page.waitForTimeout(600);
  await page.screenshot({ path });
  await page.setViewportSize(vp);
}

test("DF1 shots", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  for (const [w, h, tag] of [[1512, 982, "1512"], [1280, 800, "1280"]] as const) {
    await open(page, w, h, true);
    await page.screenshot({ path: `${OUT}/01-desk-${tag}@2x.png` });
    await full(page, `${OUT}/02-desk-full-${tag}@2x.png`);
    await open(page, w, h, true);
    await page.click('[data-df1-sw="in"]');
    for (let i = 0; i < 6; i++) { const e = page.locator('[data-df1="earlier"]'); if (await e.count()) await e.click(); }
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/03-feed-agents-${tag}@2x.png` });
    await page.click('[data-df1-sw="all"]');
    await page.click('[data-df1-q="closed"]');
    await page.evaluate(() => document.querySelector('[data-df1="queries-card"]')?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/04-queries-closed-${tag}@2x.png` });
  }
  await open(page, 1512, 982, false);
  await page.screenshot({ path: `${OUT}/05-sidebar-expanded-1512@2x.png` });
});
