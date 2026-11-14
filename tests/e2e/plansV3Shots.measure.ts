/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plans v3 — the report's screenshots. Writes only to reports/plans-v3/shots/; reads, never writes the account.
 * Run against dev (ALLOW_LIVE_FIRESTORE=1, SA_E2E_BASE_URL=https://scriptally-dev.web.app): the route as the e2e
 * account sees it at 1440 and 390 with "Compare every feature" closed and open, and `#/plans-lab` (served by the dev
 * build, absent from production) for the founding view at 390 and the three after-launch viewers.
 * ⚠️ AT 390 THE ROUTE IS THE PHONE'S OWN PLAN PAGE (`PlanPhone`, untouched by this run); the 390 route shot records
 * that, and the lab's 390 shots show this page at that width.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/plans-v3/shots";
mkdirSync(OUT, { recursive: true });

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  /* this page's art only, and capped: a shell image that never fires `load` hung the first run for 3 minutes */
  await page.evaluate(() => Promise.race([
    Promise.all([...document.querySelectorAll(".pl-page img")].map((i) => ((i as HTMLImageElement).complete ? null : new Promise((r) => { (i as HTMLImageElement).onload = (i as HTMLImageElement).onerror = r; })))),
    new Promise((r) => setTimeout(r, 5000)),
  ]));
  await page.waitForTimeout(500);
  await page.mouse.move(2, 2);
}
/** The whole plane, not just the viewport: the page scrolls inside `.acct-plane`. */
async function shootPlane(page: Page, name: string) {
  const h = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".pl-page .acct-plane")].find((e) => (e as HTMLElement).offsetParent !== null) as HTMLElement | undefined;
    return p ? p.scrollHeight : 0;
  });
  const vp = page.viewportSize()!;
  if (h > vp.height) await page.setViewportSize({ width: vp.width, height: Math.min(h + 160, 4000) });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize(vp);
}
const openCompare = (page: Page) => page.locator(".pl-page .pl3-more > details[data-plans='compare'] > summary").first().click();

test("plans v3 shots · dev route, as the e2e account", async ({ page }) => {
  test.setTimeout(180_000);
  await openRoute(page, "/plans", { width: 1440, height: 900 });
  await settle(page);
  const state = await page.locator(".pl-page").first().getAttribute("data-plans-state");
  const bundle = await page.evaluate(() => [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src")).find((u) => /index-/.test(u ?? "")));
  console.log("route viewer:", state, "| bundle:", bundle);
  await shootPlane(page, "dev-route-1440-closed");
  await openCompare(page);
  await settle(page);
  await shootPlane(page, "dev-route-1440-open");
  /* 390: the phone's own plan page, which is what the account sees there */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/plans");
  await page.waitForTimeout(3000);
  await settle(page);
  console.log("route 390 draws this page:", await page.locator(".pl-page").count());
  await page.screenshot({ path: `${OUT}/dev-route-390-phone-plan-page.png`, fullPage: true });
});

test("plans v3 shots · dev lab, this page at 390 (founding) and the after-launch viewers", async ({ page }) => {
  test.setTimeout(180_000);
  const lab = async (q: string, width: number) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/#/plans-lab?${q}`);
    await page.locator(".pl-page .pl3 [data-plan]").first().waitFor({ timeout: 30_000 });
    await settle(page);
  };
  await lab("v=founding", 390);
  await shootPlane(page, "dev-lab-founding-390-closed");
  await openCompare(page);
  await settle(page);
  await shootPlane(page, "dev-lab-founding-390-open");
  for (const v of ["trial&days=9", "free", "pro"]) {
    await lab(`v=${v}`, 1440);
    await shootPlane(page, `dev-lab-${v.split("&")[0]}-1440`);
  }
  await lab("v=free&sell=1", 1440);
  await shootPlane(page, "dev-lab-free-selling-on-1440");
});
