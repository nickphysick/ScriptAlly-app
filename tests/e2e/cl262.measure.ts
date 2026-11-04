/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 (design-refs/contact-list-v26-2/) — the CL262 locks, at 1512 × 900 and 1280 × 800. Helpers:
 * cl262Lib.ts. Mutations: `CL262_MUTATE=<lock>`.
 */
import { test } from "@playwright/test";
import { SIZES, openCard, shotDir } from "./cl262Lib";

test.describe.configure({ mode: "serial" });

test("CL262 shots — the card", async ({ page }) => {
  test.setTimeout(240_000);
  for (const [name, stand] of [["01-card-you", "you"], ["02-card-none", "none"], ["xx-card-agent", "agent"], ["xx-card-closed", "closed"]] as const) {
    await openCard(page, SIZES[0], { stand });
    await page.screenshot({ path: `${shotDir()}/${name}-1512.png` });
  }
  await openCard(page, SIZES[0], { stand: "you" });
  await page.locator("[data-cl262='tab'][data-tab='history']").first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shotDir()}/03-card-history-1512.png` });
  await openCard(page, SIZES[1], { stand: "you" });
  await page.screenshot({ path: `${shotDir()}/09-card-1280.png` });
});

test("CL262 shots — editing", async ({ page }) => {
  test.setTimeout(300_000);
  const pen = (k: string) => page.evaluate((key) => (document.querySelector(`[data-cl262='pen'][data-k='${key}']`) as HTMLElement | null)?.click(), k);
  await openCard(page, SIZES[0], { stand: "none" });
  await pen("genres"); await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir()}/04-edit-genres-1512.png` });
  await openCard(page, SIZES[0], { stand: "you" });
  await pen("materials"); await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir()}/05-edit-materials-1512.png` });
  await openCard(page, SIZES[0], { stand: "agent" });
  await pen("how"); await page.waitForTimeout(400);
  await page.locator("[data-cl262='sec'][data-k='how'] [data-ae='weeks'] button[data-d='1']").first().click();
  await page.locator("[data-cl262='sec'][data-k='how'] [data-ae='weeks'] button[data-d='1']").first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shotDir()}/06-edit-how-also-1512.png` });
  await openCard(page, SIZES[0], { stand: "you" });
  await page.locator("[data-cl262='edit-all']").first().click(); await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir()}/07-edit-all-1512.png` });
});
