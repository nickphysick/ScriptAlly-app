/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.5 — a working screenshot: QC1385_SHOT="<route> <w> <h> <name> [scrollY]" (several, ';'-separated).
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

test("shot", async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  for (const spec of (process.env.QC1385_SHOT ?? "/queries 1512 900 top").split(";")) {
    const [route, w, h, name, y, hover] = spec.trim().split(/\s+/);
    await openRoute(page, route, { width: +w, height: +h });
    await page.waitForTimeout(1500);
    if (y) await page.evaluate((top) => { const s = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) s.scrollTop = top; }, +y);
    await page.waitForTimeout(500);
    if (hover) { const click = hover.startsWith("click="); const sel = click ? hover.slice(6) : hover; const l = page.locator(sel).first(); if (click) await l.click(); else await l.hover(); await page.waitForTimeout(600); }
    await page.screenshot({ path: `reports/qc-v138-5/work-${name}.png` });
  }
});
