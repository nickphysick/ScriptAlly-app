/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query actions v1 — the post-deploy smoke (brief P7): both sessions' pages on the deployed site.
 * The drawer through a REAL door (the Query Centre's "+ Log a query"), and the Submission packages
 * page loading with its list or its empty state (the harness's default manuscript has no packages,
 * so the composer-open empty state with an inert Example card is correct there).
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, openRoute } from "./measure";

test("the drawer opens from the Query Centre's own Log button", async ({ page }) => {
  test.setTimeout(180_000);
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const log = page.getByRole("button", { name: /Log a query/ }).first();
  await expect(log).toBeVisible({ timeout: 20_000 });
  await log.click();
  await expect(page.locator('[data-qad-drawer="log"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-qad-agent-input]")).toBeVisible();
  await page.screenshot({ path: "reports/query-actions-v1/shots/dev-log-door.png" });
});

test("the Submission packages page loads", async ({ page }) => {
  test.setTimeout(180_000);
  await ensureSignedIn(page);
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 900 });
  await expect(page.locator("body")).not.toContainText("Something went wrong", { timeout: 15_000 });
  await expect(page.getByText(/package/i).first()).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: "reports/query-actions-v1/shots/dev-packages.png" });
});
