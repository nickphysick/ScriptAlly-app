/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The five journey screens, app and ref, same window and same answers (Getting ready · a novel of
 * 80,000 to 110,000 · 40 agents · a few at a time), clock pinned to 21 Oct 2026.
 *
 *   node scripts/pricing-v3-journey-shots.mjs <baseUrl> <outDir> [w×h]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const [base, out, size = "1440x900"] = process.argv.slice(2);
const [w, h] = size.split("x").map(Number);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const SIDES = {
  app: { url: base + "/pricing", card: ".mk-jy", next: ".mk-jynext",
    pick: ["Getting ready", "A novel", "80,000 to 110,000", null, "A few at a time"] },
  ref: { url: "file://" + resolve("design-refs/pricing-page-v1.html"), card: ".calc.jy", next: ".jy-step:not([hidden]) .jy-next",
    pick: ["Getting ready", "A novel", "80,000 to 110,000", null, "A few at a time"] },
};
for (const [name, s] of Object.entries(SIDES)) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.clock.setFixedTime(new Date("2026-10-21T12:00:00"));
  await page.goto(s.url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  const card = page.locator(s.card);
  await card.scrollIntoViewIfNeeded();
  const btn = (t) => page.locator(`${s.card} button:visible`, { hasText: t }).first();
  const shot = async (n) => { await page.waitForTimeout(150); await card.screenshot({ path: `${out}/${name}-${w}-jy${n}.png` }); };
  await btn("Getting ready").click(); await shot(1); await page.locator(s.next).first().click();
  await btn("A novel").click(); await btn("80,000 to 110,000").click(); await shot(2); await page.locator(s.next).first().click();
  await shot(3); await page.locator(s.next).first().click();
  await btn("A few at a time").click(); await shot(4); await page.locator(s.next).first().click();
  await shot(5);
  await page.close();
}
await browser.close();
