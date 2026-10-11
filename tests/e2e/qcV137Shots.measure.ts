/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v137 — the report's shots, written to reports/qc-v137/shots. `QC137_SHOT=<name>` takes one.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/qc-v137/shots";
const ONLY = process.env.QC137_SHOT ?? "";
const want = (n: string) => !ONLY || ONLY === n;
async function qc(page: import("@playwright/test").Page, vp: { width: number; height: number }) {
  await openRoute(page, "/queries", vp);
  await page.locator('[data-qcv="row"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}
const scrollBy = (page: import("@playwright/test").Page, y: number) => page.evaluate((yy) => {
  const s = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
  if (s) s.scrollTop = yy;
}, y);

test("qc v137 shots", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    if (want(`top-${vp.width}`)) { await qc(page, vp); await page.screenshot({ path: `${OUT}/top-${vp.width}.png` }); }
    if (want(`pinned-${vp.width}`)) { await qc(page, vp); await scrollBy(page, 1400); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/pinned-${vp.width}.png` }); }
  }
  if (want("filtered-1512")) {
    await qc(page, { width: 1512, height: 900 });
    await page.locator('[data-qcv="strip-cell"][data-k="you"]').click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/filtered-1512.png` });
  }
  if (want("top-1920")) { await qc(page, { width: 1920, height: 1080 }); await page.screenshot({ path: `${OUT}/top-1920.png` }); }
  if (want("top-1024")) { await qc(page, { width: 1024, height: 768 }); await page.screenshot({ path: `${OUT}/top-1024.png` }); }
  if (want("list-1024")) { await qc(page, { width: 1024, height: 768 }); await scrollBy(page, 700); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/list-1024.png` }); }
  for (const route of ["/agents", "/dashboard"]) {
    const n = `lip-${route.slice(1)}`;
    if (!want(n)) continue;
    await openRoute(page, route, { width: 1512, height: 900 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { for (const s of document.querySelectorAll<HTMLElement>(".wpg-scroll, .ws-wbody, .os-root, [data-d58='page']")) if (s.scrollHeight > s.clientHeight + 4) s.scrollTop = 300; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${n}.png` });
  }
});
