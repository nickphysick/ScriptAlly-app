/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Header v3 — the report's shots: the top of every workspace route at 1512 × 900 and 1280 × 800, and `/queries` at
 * 390 × 844. Written to reports/header-v3/shots. No assertions beyond the header being on screen.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { KILL, SIZES, open } from "./hp2Lib";
/* the lists are restated: importing a measure file runs its tests in this one's scope */
const ROUTES = ["/queries", "/agents", "/manuscripts/comps", "/manuscripts/packages", "/todo", "/queries/analytics", "/agents/discover", "/manuscripts", "/todo/calendar", "/todo/noteboard"];

const OUT = "reports/header-v3/shots";
test("header v3 shots", async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  await page.addInitScript((css) => {
    try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ }
    const put = () => { const s = document.createElement("style"); s.textContent = css; document.documentElement.appendChild(s); };
    if (document.documentElement) put(); else document.addEventListener("readystatechange", put, { once: true });
  }, KILL);
  for (const vp of SIZES) for (const route of ROUTES) {
    await open(page, route, vp);
    await expect(page.locator(".ws-window [data-hp3]:visible").first()).toBeVisible();
    await page.screenshot({ path: `${OUT}/${route.slice(1).replace(/\//g, "-")}-${vp.width}.png`, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 520) } });
    if (route === "/queries") await page.screenshot({ path: `${OUT}/queries-${vp.width}-full.png` });
  }
  /* a phone: sign-in happens at a desktop width (the shared opener cannot open a phone's), then the page is reloaded small */
  await open(page, "/queries", { width: 1280, height: 800 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload(); await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/queries-390.png` });
});
