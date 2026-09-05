/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drawer cut 2 · §5 — the evidence shots. 1440 and 1920: the drawer at rest on each tab; the desk
 * open at the fork on a rung near the BOTTOM (the clamped case); the consequence preview.
 * Precondition: seedCorrection.mjs. The preview is CANCELLED — nothing commits.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync } from "node:fs";

const SHOTS = "reports/query-drawer-2-shots";

async function openDrawer(page: import("@playwright/test").Page, width: number) {
  await openRoute(page, "/queries", { width, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const card = page.locator('[data-qcc-id="cor-undo"]');
  await expect(card, "no cor-undo card — was seedCorrection run?").toBeVisible();
  await card.click();
  await expect(page.locator(".qpn[data-on='true']")).toBeVisible();
  await expect(page.locator(".qpn .tl-more").first()).toBeVisible({ timeout: 20_000 });
}

for (const width of [1440, 1920]) {
  test(`the drawer's three tabs and the desk, at ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openDrawer(page, width);

    await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SHOTS}/tracking-${width}.png` });

    await page.locator(".qpn-tab", { hasText: "Agent" }).click();
    await expect(page.locator(".qat-hero")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/agent-${width}.png` });

    await page.locator(".qpn-tab", { hasText: "Notes" }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SHOTS}/notes-${width}.png` });

    /* back to Tracking; the desk at the fork on the LAST rung — the clamped case */
    await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
    await page.locator(".qpn .tl-more").last().click();
    await expect(page.locator(".qcd .cor-q")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/desk-fork-${width}.png` });

    /* through the mistake branch to the consequence preview, then Cancel */
    await page.locator(".qcd .cor-branch", { hasText: "correcting a mistake" }).click();
    await expect(page.locator(".qcd .qcd-step")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/desk-edit-${width}.png` });
    const dateField = page.locator(".qcd input[type='date']").first();
    if (await dateField.count()) {
      const target = await page.evaluate(() => {
        const d = new Date(); d.setDate(d.getDate() - 80);
        return d.toISOString().slice(0, 10);
      });
      await dateField.fill(target);
      await page.locator(".qcd button", { hasText: /^Save$/ }).click();
      await expect(page.locator(".qcd .cor-q")).toBeVisible({ timeout: 10_000 });
      await page.screenshot({ path: `${SHOTS}/desk-consequence-${width}.png` });
      await page.locator(".qcd button", { hasText: "Cancel" }).first().click();
    }
    await expect(page.locator(".qcd")).toHaveCount(0);
  });
}
