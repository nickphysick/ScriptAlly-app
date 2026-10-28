/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD ON THE PHONE v1 — the report's shots, at 390×844 and 375×667, named after the ref screen each sits beside.
 * Not a lock: it writes images and asserts only that it found what it photographs.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DIR, PHONES, openDash, tag } from "./dm1Lib";

test.setTimeout(600_000);
const OUT = `${DIR}/shots`;
const scrollTo = (page: Page, sel: string) => page.evaluate((s) => {
  const port = [...document.querySelectorAll<HTMLElement>(".ws-wbody")].find((e) => e.getBoundingClientRect().height > 0)!;
  const el = document.querySelector<HTMLElement>(s);
  if (!el) { port.scrollTop = port.scrollHeight; return; }
  port.scrollTop += el.getBoundingClientRect().top - port.getBoundingClientRect().top - 60;
}, sel);

test("DM1 shots", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  for (const vp of PHONES) {
    const t = tag(vp);
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${t}.png` });
    await openDash(page, vp);
    await expect(page.locator('[data-dm1="top"]').first()).toBeVisible();
    await shot("01-top");
    await scrollTo(page, '[data-dm1="upnext"]'); await page.waitForTimeout(300); await shot("02-up-next");
    await scrollTo(page, "__bottom__"); await page.waitForTimeout(300); await shot("03-bottom");
    await openDash(page, vp);
    const c = (await page.locator('[data-dm1="chart"]').first().boundingBox())!;
    await page.mouse.move(c.x + (c.width - 48) * 0.5, c.y + 40); await page.mouse.down(); await page.waitForTimeout(150);
    await shot("04-chart-scrub"); await page.mouse.up();
    await page.waitForTimeout(1200);
    await page.locator('[data-dm1="top"] [aria-label="Add"]').first().click(); await page.waitForTimeout(200); await shot("05-plus-menu");
    await page.keyboard.press("Escape");
    await page.locator('[data-dm1="top"] [aria-label="Search"]').first().click(); await page.waitForTimeout(300); await shot("06-search");
    await page.keyboard.press("Escape");
    await page.locator('[data-dm1="top"] [aria-label="Feedback"]').first().click(); await page.waitForTimeout(500); await shot("07-feedback-sheet");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.locator('[data-dm1="card-with"]').first().click(); await page.waitForTimeout(3000); await shot("08-tile-click-through");
  }
});
