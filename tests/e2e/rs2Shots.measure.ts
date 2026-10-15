/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 — screenshots for the report and for looking while building (`RS2_SHOT=<name>` picks one; unset takes
 * the top at both widths). Not a lock: the RS2 locks are rs2.measure.ts.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/responses-v2/shots";
const MS = process.env.RS2_MS ?? "seed-ms-1";
const SIZES = (process.env.RS2_SIZES ?? "1512x900,1280x800").split(",").map((s) => { const [w, h] = s.split("x").map(Number); return { width: w, height: h }; });

for (const size of SIZES) {
  test(`responses shots @${size.width}`, async ({ page }) => {
    test.setTimeout(240_000);
    mkdirSync(DIR, { recursive: true });
    await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, MS);
    await openRoute(page, "/queries/responses", size);
    await page.waitForTimeout(1500);
    if (process.env.RS2_CLICK) {
      await page.locator(process.env.RS2_CLICK).first().scrollIntoViewIfNeeded();
      await page.locator(process.env.RS2_CLICK).first().click();
      await page.waitForTimeout(900);
    }
    if (process.env.RS2_CLICK2) { await page.locator(process.env.RS2_CLICK2).first().click(); await page.waitForTimeout(900); }
    const tag = `${process.env.RS2_TAG ?? "top"}-${size.width}`;
    await page.screenshot({ path: `${DIR}/${tag}.png` });
    const scroll = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-rsp="page"]'))`;
    const steps = Number(process.env.RS2_STEPS ?? "0");
    for (let i = 1; i <= steps; i++) {
      await page.evaluate(`(() => { const s = ${scroll}; if (s) s.scrollTop += ${size.height - 160}; })()`);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${DIR}/${tag}-s${i}.png` });
    }
  });
}
