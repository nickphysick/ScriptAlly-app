/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pricing v3 review shots: the app's /pricing and design-refs/pricing-page-v1.html, in the same
 * browser at the same window, so the two can be read side by side.
 *
 *   node scripts/pricing-v3-shots.mjs <baseUrl> <outDir> [w×h …]
 *
 * ⚠️ THE REF IS SHOT AS-IS. Its nav is a stand-in and its counter is hardcoded; the app's are real.
 * Those are the two known differences, and the report reads past them.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const [base, out, ...sizes] = process.argv.slice(2);
const ref = "file://" + resolve("design-refs/pricing-page-v1.html");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const s of sizes.length ? sizes : ["1440x900"]) {
  const [w, h] = s.split("x").map(Number);
  for (const [name, url] of [["app", base + "/pricing"], ["ref", ref]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(name === "app" ? 1500 : 300);
    await page.screenshot({ path: `${out}/${name}-${w}x${h}-top.png` });
    await page.screenshot({ path: `${out}/${name}-${w}x${h}-full.png`, fullPage: true });
    await page.close();
  }
}
await browser.close();
