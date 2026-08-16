/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ITEM 6 — THE REPORT'S SCREENSHOT. One card, deployed, 1920. Run it with every report.
 *
 * ⚠️ IT EXISTS BECAUSE THREE REPORTS THIS WEEK SAID AN ITEM LANDED WHILE THE PAGE SHOWED OTHERWISE,
 * and every one of them was backed by a real measurement. A measured value can be true of the wrong
 * element — `.tdk` and `.wpg-plate` are both "the padding" until you look — and an image cannot.
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

test.setTimeout(240_000);

test("report shot — one card, 1920, deployed", async ({ page }) => {
  const dir = resolve(process.cwd(), "reports/pane");
  mkdirSync(dir, { recursive: true });
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  /* the send card — the one carrying every section, so the shot shows the most of the card */
  const send = page.locator(".tdg-row").filter({ hasText: /^Send/ }).first();
  if (await send.count()) { await send.click(); await page.waitForTimeout(600); }
  await page.locator(".tdk-w").first().screenshot({ path: resolve(dir, "report-card-1920.png") });
  await page.screenshot({ path: resolve(dir, "report-page-1920.png") });
  console.log("→ reports/pane/report-card-1920.png + report-page-1920.png");
});
