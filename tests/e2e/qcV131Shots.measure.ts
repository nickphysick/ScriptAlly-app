/**
 * Query Centre v131 — before/after shots at 1440 for the report (not a lock). One build per run:
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> QC_SHOT_TAG=after  npx playwright test qcV131Shots
 *   QC_SHOT_TAG=ref renders the reference file instead (no sign-in).
 * Four states: top · the With-you desk section chosen · Find "marsh" · scrolled into the second group.
 */
import { test, expect, Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { inkOpen } from "./inkLib";

const TAG = process.env.QC_SHOT_TAG ?? "after";
const OUT = resolve("reports/query-centre-v131/shots");
const REF = resolve("design-refs/query-centre/query-centre-v131.html");

async function scroller(page: Page) {
  return page.evaluateHandle(() => document.querySelector<HTMLElement>(".wpg-scroll") ?? document.scrollingElement!);
}

test("v131 shots", async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(OUT, { recursive: true });
  const shot = (n: string) => page.screenshot({ path: `${OUT}/${TAG}-${n}-1440.png` });

  if (TAG === "ref") {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`file://${REF}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await shot("top");
    const dc = page.locator(".desk2 .dc, .desk2 [data-k], .desk2 > *").first();
    if (await dc.count()) { await dc.click({ trial: false }).catch(() => {}); await page.waitForTimeout(300); }
    await shot("desk");
    const f = page.locator("#qf");
    if (await f.count()) { await f.fill("marsh"); await page.waitForTimeout(400); }
    await shot("find");
    if (await f.count()) { await page.locator("#qf").fill(""); await page.waitForTimeout(300); }
    await page.evaluate(() => {
      const g = document.querySelectorAll<HTMLElement>(".grp, .grp3")[1];
      if (g) window.scrollBy(0, g.getBoundingClientRect().top + 400);
    });
    await page.waitForTimeout(300);
    await shot("group2");
    return;
  }

  await inkOpen(page, "/queries", 1440);
  await expect(page.locator('[data-qcv="row"]').first()).toBeVisible();
  await page.waitForTimeout(600);
  await shot("top");

  const pick = page.locator('[data-qcv="court"][data-court="you"] [data-qcv="court-pick"], [data-qcv="court"][data-court="you"]').first();
  await expect(pick, "a With-you desk section").toBeVisible();
  await pick.click();
  await page.waitForTimeout(500);
  const sc = await scroller(page);
  await sc.evaluate((s: HTMLElement) => { s.scrollTop = 0; });
  await shot("desk");

  const find = page.locator('[data-qcv="find"] input').first();
  await find.scrollIntoViewIfNeeded();
  await find.fill("marsh");
  await page.waitForTimeout(500);
  await sc.evaluate((s: HTMLElement) => {
    const l = document.querySelector<HTMLElement>('[data-qcv="lbanner"], [data-qcv="showing"]');
    if (l) s.scrollTop += l.getBoundingClientRect().top - s.getBoundingClientRect().top - 24;
  });
  await page.waitForTimeout(300);
  await shot("find");
  await find.fill("");
  await page.waitForTimeout(500);

  const moved = await sc.evaluate((s: HTMLElement) => {
    const g = [...document.querySelectorAll<HTMLElement>('[data-qcv="grp"], [data-qcv="gband"]')].filter((e) => e.getBoundingClientRect().height > 0);
    const second = g.find((e, i) => i > 0 && !g[0].contains(e) && !e.contains(g[0]));
    if (!second) return false;
    s.scrollTop += second.getBoundingClientRect().top - s.getBoundingClientRect().top + 400;
    return true;
  });
  expect(moved, "a second group to scroll into").toBe(true);
  await page.waitForTimeout(400);
  await shot("group2");
});
