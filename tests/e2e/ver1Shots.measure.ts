/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v1 — the report's shots beside design-refs/versions-v1/screens/*. VER1_SHOTS=1 writes them; VER1_ONLY=<nn>
 * takes one. 07 (no versions) needs a book with none: it is taken on ms21-filled's SECOND manuscript, which has none.
 */
import { test } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { OTHER_MS_ID } from "./ms21Fixture.mjs";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { ctxFor, openVersions, VPS } from "./ver1Lib";

const OUT = resolve(process.cwd(), "reports/versions-v1/shots");
test.skip(process.env.VER1_SHOTS !== "1", "VER1_SHOTS=1 writes the report's screenshots");
test.setTimeout(300_000);
const want = (n: string) => !process.env.VER1_ONLY || n.startsWith(process.env.VER1_ONLY);

for (const vp of VPS) {
  test(`shots ${vp.width}`, async ({ browser, baseURL }) => {
    await assertLocalBundleIsDev();
    if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
    const ctx = await ctxFor(browser, baseURL!, vp, 2);
    const page = await ctx.newPage();
    const scroller = page.locator(".wpg-scroll:visible").first();
    const at = async (sel: string, off = 0) => { await page.evaluate(([s, o]) => { const el = document.querySelector(s as string) as HTMLElement | null; const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.offsetHeight > 0); if (el && sc) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - (o as number); }, [sel, off] as const); await page.waitForTimeout(400); };
    await openVersions(page);
    if (want("01")) await page.screenshot({ path: `${OUT}/01-top-${vp.width}@2x.png` });
    if (want("02")) { await at('[data-ver1="list"]', 40); await page.screenshot({ path: `${OUT}/02-list-${vp.width}@2x.png` }); }
    if (want("03")) { await at(".ver1-tb", 0); await page.screenshot({ path: `${OUT}/03-compare-cards-${vp.width}@2x.png` }); }
    if (want("04")) { await at(".ver1-lg", 40); await page.screenshot({ path: `${OUT}/04-league-${vp.width}@2x.png` }); }
    if (want("05")) { await scroller.evaluate((e) => { e.scrollTop = 0; }); await page.locator('[data-ver1="change"]').click(); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/05-change-menu-${vp.width}@2x.png` }); await page.keyboard.press("Escape"); }
    if (want("06")) { await page.locator('[data-ver1="row"]').first().click(); await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}/06-insights-${vp.width}@2x.png` }); await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
    if (want("08")) { await openVersions(page, { free: true }); await page.screenshot({ path: `${OUT}/08-free-${vp.width}@2x.png` }); await page.evaluate(() => sessionStorage.removeItem("sa.dev.versionsFree")); }
    if (want("07")) {
      await page.evaluate((id) => localStorage.setItem("scriptally_active_manuscript_id", id), OTHER_MS_ID);
      await page.goto("/manuscripts/versions"); await page.waitForSelector('[data-ver1="page"][data-state="fresh"]', { timeout: 30_000 }); await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/07-fresh-${vp.width}@2x.png` });
    }
    await ctx.close();
  });
}
