/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 — screenshots for the report and for looking while building. Not a lock (the locks are rs5.measure.ts).
 *   RS5_MS=rs5-ms-full|rs5-ms-early|rs5-ms-empty · RS5_SIZES=1512x900,1280x800 · RS5_AT=<selector to scroll to the top>
 *   RS5_STEPS=<n more screens down> · RS5_CLICK=<selector> · RS5_TAG=<file name>
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/responses-v5/shots";
const MS = process.env.RS5_MS ?? "rs5-ms-full";
const SIZES = (process.env.RS5_SIZES ?? "1512x900,1280x800").split(",").map((s) => { const [w, h] = s.split("x").map(Number); return { width: w, height: h }; });
const SCROLLER = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-rsp="page"]'))`;

for (const size of SIZES) {
  test(`responses v5 shots @${size.width}`, async ({ page }) => {
    test.setTimeout(240_000);
    mkdirSync(DIR, { recursive: true });
    await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, MS);
    await openRoute(page, "/queries/responses", size);
    await page.waitForTimeout(1500);
    const at = process.env.RS5_AT;
    if (at) {
      await page.evaluate(`(() => { const s = ${SCROLLER}; const el = s && s.querySelector(${JSON.stringify(at)}); if (s && el) s.scrollTop += el.getBoundingClientRect().top - s.getBoundingClientRect().top - 20; })()`);
      await page.waitForTimeout(700);
    }
    if (process.env.RS5_CLICK) { await page.locator(process.env.RS5_CLICK).first().click(); await page.waitForTimeout(900); }
    const tag = `${process.env.RS5_TAG ?? "top"}-${size.width}`;
    await page.screenshot({ path: `${DIR}/${tag}.png` });
    const steps = Number(process.env.RS5_STEPS ?? "0");
    for (let i = 1; i <= steps; i++) {
      await page.evaluate(`(() => { const s = ${SCROLLER}; if (s) s.scrollTop += ${size.height - 160}; })()`);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${DIR}/${tag}-s${i}.png` });
    }
  });
}
