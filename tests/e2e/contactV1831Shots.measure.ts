/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3.1 — the report's screenshots beside each design-refs/contact-list-v18-3-1/screens/* file, and the
 * Query Centre's row hover for comparison (its tray is a different component, left unchanged). Read-only.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openContacts16 } from "./cl16Lib";
import { openRoute } from "./measure";

const DIR = "reports/contact-list-v18-3/shots-v18-3-1";
const clip = async (page: Page, sel: string, name: string, before = false) => {
  mkdirSync(DIR, { recursive: true });
  const b = await page.locator(sel).filter({ visible: true }).first().boundingBox();
  await page.screenshot({ path: `${DIR}/${name}.png`, clip: { x: 248, y: Math.max(0, b!.y - 24), width: page.viewportSize()!.width - 248, height: b!.height + (before ? 140 : 48) } });
};
const hoverRow = async (page: Page, i: number, wait: number) => {
  const row = page.locator(".aglist [data-clv='row'][data-agent-card]").filter({ visible: true }).nth(i);
  await row.scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(300);
  const b = await row.boundingBox(); await page.mouse.move(b!.x + 60, b!.y + 20); await page.waitForTimeout(wait);
  return row;
};
test("shots · hover closed and open, 1512 and 1280", async ({ page }) => {
  test.setTimeout(200_000);
  await openContacts16(page, { width: 1512, height: 900 });
  await hoverRow(page, 0, 200); await clip(page, ".aglist [data-clv='row'][data-agent-card]:hover", "01-hover-closed-1512");
  await hoverRow(page, 0, 900); await clip(page, ".aglist [data-clv='row'][data-agent-card]:hover", "02-hover-peek-1512");
  await hoverRow(page, 2, 900); await clip(page, ".aglist [data-clv='row'][data-agent-card]:hover", "x-hover-peek-not-queried-1512");
  await openContacts16(page, { width: 1280, height: 800 });
  await hoverRow(page, 0, 900); await clip(page, ".aglist [data-clv='row'][data-agent-card]:hover", "03-hover-peek-1280");
});
test("shots · the Query Centre's row hover (unchanged)", async ({ page }) => {
  test.setTimeout(200_000);
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    await openRoute(page, "/queries"); await page.setViewportSize(vp); await page.waitForTimeout(2500);
    const row = page.locator(".qc138-row").filter({ visible: true }).first();
    await row.scrollIntoViewIfNeeded(); const b = await row.boundingBox(); await page.mouse.move(b!.x + 80, b!.y + 20); await page.waitForTimeout(600);
    await clip(page, ".qc138-row:hover", `x-qc-row-hover-${vp.width}`);
  }
});
