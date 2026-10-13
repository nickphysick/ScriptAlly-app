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
      if (want("04-filtered")) {
        await setScroll16(page, 0);
        await page.locator('.aglist [data-cl16="strip-cell"][data-k="live"]').filter({ visible: true }).first().click();
        await page.waitForTimeout(700);
        await page.evaluate(() => { const h = [...document.querySelectorAll<HTMLElement>('[data-cl16="strip-wrap"]')].find((e) => e.getBoundingClientRect().height > 0); h?.scrollIntoView({ block: "start" }); });
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${OUT}/04-filtered-${vp.width}.png` });
        await page.locator('.aglist [data-cl16="strip-cell"][data-k="all"]').filter({ visible: true }).first().click();
      }
      if (want("05-full-screen")) {
        await setScroll16(page, 0);
        await page.keyboard.press("f"); await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/05-full-screen-${vp.width}.png` });
        await page.keyboard.press("f"); await page.waitForTimeout(500);
      }
    });
  }

  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    test(`agent panel · ${vp.width}`, async ({ page }) => {
      test.setTimeout(400_000);
      mkdirSync(OUT, { recursive: true });
      await openContacts16(page, vp);
      const row = (stand: string) => page.locator(`.aglist [data-clv="row"][data-stand="${stand}"]`).filter({ visible: true }).first();
      const panel = page.locator('[data-ap="panel"]');
      const shot = async (n: string) => { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${n}-${vp.width}.png` }); };
      const tab = (t: string) => panel.locator(`[data-ap-tab="${t}"]`).click();
      /* a "your move" agent: a request to send */
      await page.evaluate(() => { const h = [...document.querySelectorAll<HTMLElement>('[data-cl16="list-heading"]')].find((e) => e.getBoundingClientRect().height > 0); h?.scrollIntoView({ block: "start" }); });
      if (await row("you").count()) {
        await row("you").click({ position: { x: 120, y: 30 } });
        await panel.waitFor({ timeout: 10_000 });
        if (want("06-agent-with-you")) await shot("06-agent-with-you");
        await tab("queries"); if (want("08-agent-queries")) await shot("08-agent-queries");
        if (await panel.locator('[data-ap="ledger-entry"]').count()) {
          await panel.locator('[data-ap="ledger-entry"]').first().click();
          await page.locator('[data-qp="panel"]').waitFor({ timeout: 10_000 });
          if (want("09-agent-query")) await shot("09-agent-query");
          await page.locator('[data-qcv="open-back"]').click();
          await panel.waitFor({ timeout: 10_000 });
        }
        await tab("notes"); if (want("10-agent-notes")) await shot("10-agent-notes");
        await tab("profile");
        await panel.locator('[data-ap="edit"]').click();
        await panel.locator('[data-ap="edit"], [data-ap-act="edit"]').first().waitFor();
        if (want("11-act-edit")) await shot("11-act-edit");
        await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      }
      /* an agent with a query out: Record a response */
      if (await row("agent").count()) {
        await row("agent").click({ position: { x: 120, y: 30 } });
        await page.waitForTimeout(500);
        await panel.locator('[data-ap="primary"]').click();
        if (want("13-act-response")) await shot("13-act-response");
        await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      }
      /* an agent not yet queried: the profile, then Log a query */
      await row("none").click({ position: { x: 120, y: 30 } });
      await page.waitForTimeout(500);
      if (want("07-agent-not-queried")) await shot("07-agent-not-queried");
      if (await panel.locator('[data-ap="primary"][data-act="log"]').count()) {
        await panel.locator('[data-ap="primary"]').click();
        if (want("12-act-log")) await shot("12-act-log");
        await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      }
    });
  }
});
