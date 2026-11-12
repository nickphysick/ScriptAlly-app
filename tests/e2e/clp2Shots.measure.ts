/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v2 — the report's screenshots: the Contact list header (and the first rows, for the fit
 * stars) at 1440 and 1280 on the emulator's harness account, and the reference mock at the same widths. No assertions.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/contact-list-principles-v2/shots";
const REF = resolve("design-refs/contact-list-principles-v2/contact-list-principles-v4.html");

async function clip(page: Page, sel: string, extra = 260) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) return undefined;
  return { x: 0, y: Math.max(0, b.y - 24), width: page.viewportSize()!.width, height: b.height + 48 + extra };
}

for (const w of [1440, 1280]) {
  test(`shots · the header at ${w}`, async ({ page }) => {
    test.setTimeout(120_000);
    mkdirSync(DIR, { recursive: true });
    await page.addInitScript(() => {
      try { for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* private */ }
    });
    await openApp(page, "/agents", { width: w, height: 900 });
    await page.locator(".aglist [data-cl26='row']").first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.mouse.move(3, 3);
    await page.screenshot({ path: `${DIR}/header-${w}.png`, clip: await clip(page, ".aglist [data-cl27='header']") });
  });
  test(`shots · the mock at ${w}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(`file://${REF}`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${DIR}/mock-${w}.png` });
  });
}
