/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 — the report's screenshots, beside each design-refs/contact-list-v16/screens file. Runs only
 * with `CL16_SHOTS=1` (a routine run writes none). `CL16_SHOT=<name>` takes one.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DIR16, openContacts16, setScroll16 } from "./cl16Lib";

const ON = process.env.CL16_SHOTS === "1";
const ONLY = process.env.CL16_SHOT ?? "";
const OUT = `${DIR16}/shots`;
const want = (n: string) => !ONLY || ONLY === n;

test.describe("Contact list v16 · shots", () => {
  test.skip(!ON, "CL16_SHOTS=1 writes the report's screenshots");
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }, { width: 1024, height: 768 }]) {
    test(`top and list · ${vp.width}`, async ({ page }) => {
      test.setTimeout(300_000);
      mkdirSync(OUT, { recursive: true });
      await openContacts16(page, vp);
      if (want("01-top")) await page.screenshot({ path: `${OUT}/01-top-${vp.width}.png` });
      if (want("02-full-list")) {
        await page.evaluate(() => { const h = [...document.querySelectorAll<HTMLElement>('[data-cl16="list-heading"]')].find((e) => e.getBoundingClientRect().height > 0); h?.scrollIntoView({ block: "start" }); });
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${OUT}/02-full-list-${vp.width}.png` });
      }
      if (want("03-pinned")) { await setScroll16(page, 1700); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/03-pinned-${vp.width}.png` }); }
    });
  }
});
