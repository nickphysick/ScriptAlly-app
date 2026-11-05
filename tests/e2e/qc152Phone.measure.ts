/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 L14 — PHONES ARE UNCHANGED. The phone's Queries page and an open query's sheet, read at 390 × 844 and
 * 360 × 780 (their text, every element's data attributes, a screenshot) on the v151.2 build (QC152_BASE=1) and on this
 * one; `qc152PhoneDiff.mjs` compares the two readings. v152 is desktop only, so they must be the same.
 * (phoneAppV2Queries PA2-3 is red on the v151.2 build itself — it waits for a chip selector the phone no longer draws.)
 */
import { test } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openPhone } from "./pa2Lib";

test.setTimeout(300_000);
const BASE = process.env.QC152_BASE === "1";
const DIR = "reports/qc-v152/phone";
test.beforeAll(() => { execSync("node tests/e2e/seedQc152.mjs", { stdio: "pipe" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { stdio: "pipe" }); });

for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 780 }]) {
  test(`phone Queries @ ${vp.width}`, async ({ page }) => {
    mkdirSync(DIR, { recursive: true });
    await openPhone(page, "/queries", vp);
    await page.waitForTimeout(3000);
    const read = () => page.evaluate(() => {
      const root = document.querySelector("main") ?? document.body;
      const attrs = [...root.querySelectorAll<HTMLElement>("*")].flatMap((e) => Object.entries(e.dataset).filter(([k]) => !/^(id|key)$/i.test(k)).map(([k, v]) => `${k}=${v}`));
      return { text: (root as HTMLElement).innerText.replace(/\s+/g, " ").trim(), attrs: attrs.sort().join("|") };
    });
    const list = await read();
    await page.screenshot({ path: `${DIR}/${BASE ? "base" : "v152"}-list-${vp.width}.png` });
    /* an open query: the phone's own sheet */
    /* v152.1: the phone's cards carry no row id, so v152's click found nothing and this "sheet" was the list again; the
       card is opened by its agent's name, and the reading must differ from the list's or nothing opened */
    const name = page.getByText("Jonathan Vale", { exact: true }).first();
    await name.scrollIntoViewIfNeeded().catch(() => {});
    await name.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const sheet = await read();
    if (sheet.text === list.text) throw new Error("the query's sheet did not open (its reading is the list's)");
    await page.screenshot({ path: `${DIR}/${BASE ? "base" : "v152"}-sheet-${vp.width}.png` });
    writeFileSync(`${DIR}/${BASE ? "base" : "v152"}-${vp.width}.json`, JSON.stringify({ list, sheet }, null, 1));
  });
}
