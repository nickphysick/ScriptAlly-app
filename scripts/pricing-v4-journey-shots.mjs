/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pricing v4 review shots: "Which plan suits me best?" driven through its five screens in the app's
 * /pricing and in design-refs/pricing-page-v2.html, in the same window and with the same answers —
 * case (a): Getting ready · a novel of 80,000 to 110,000 · I don't know · Not sure yet — the clock
 * pinned at 24 Oct 2026. Each screen is shot as the questions' own box, app beside ref.
 *
 *   node scripts/pricing-v4-journey-shots.mjs <app base url> [width height]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const [base, w = "1440", h = "900"] = process.argv.slice(2);
const OUT = `reports/pricing-v4/phase3/journey-${w}`;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const sides = {
  app: { url: base + "/pricing", link: ".mk-pv4suit", box: ".mk-pv4how", next: ".mk-jynext", idk: ".mk-jyidk" },
  ref: { url: "file://" + resolve("design-refs/pricing-page-v2.html"), link: ".suit-link", box: ".suit", next: ".jy-step:not([hidden]) .jy-next", idk: ".jy-idk" },
};
for (const [side, s] of Object.entries(sides)) {
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  await page.clock.setFixedTime(new Date("2026-10-24T12:00:00"));
  await page.route("**/api/waitlist", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, count: 37, cap: 100 }) }));
  await page.goto(s.url, { waitUntil: "load" });
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}html{scroll-behavior:auto!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.click(s.link);
  await page.waitForTimeout(600);
  const box = page.locator(s.box);
  const pick = (t) => page.locator(`${s.box} button`, { hasText: t }).first().click();
  const shot = (n) => box.screenshot({ path: `${OUT}/${n}-${side}.png` });
  await pick("Getting ready"); await shot("1-stage"); await page.click(s.next);
  await pick("A novel"); await pick("80,000 to 110,000"); await shot("2-kind"); await page.click(s.next);
  await page.click(s.idk); await shot("3-agents"); await page.click(s.next);
  await pick("Not sure yet"); await shot("4-pace"); await page.click(s.next);
  await page.waitForTimeout(200); await shot("5-result");
  await page.close();
}
await browser.close();
console.log("shots in", OUT);
