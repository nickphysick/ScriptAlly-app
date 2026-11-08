/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crash reporting v1, Phase 1 — each page fails on its own, measured on the rendered app.
 *
 * The unit suite (src/components/pageBoundary.test.tsx) holds the boundary's state machine; it
 * cannot hold this, because React's server renderer does not use error boundaries. These cases use
 * the dev crash trigger, which exists in non-production builds only:
 *
 *   SA_E2E_BASE_URL=dev ALLOW_LIVE_FIRESTORE=1 npx playwright test tests/e2e/pageBoundary.measure.ts
 *
 * Red-before: with the page boundaries removed (StagePage ignoring `name`), case 1 fails — the top
 * level takes the whole screen and the sidebar goes with it.
 */
import { expect, test, type Page } from "@playwright/test";
import { openRoute } from "./measure";

const SIDEBAR = "#ws-sidebar";
const TOP_LEVEL = "text=Something went wrong";
const fallback = (name: string) => `[data-boundary-fallback="${name}"]`;
const nav = (page: Page, label: string) => page.locator(`${SIDEBAR} button.ws-ni[aria-label="${label}"]`).click();

test.describe("a crash in one page stays in that page", () => {
  test("1 · the Query Centre falls over; the sidebar and the Contact list still work; coming back finds a fresh page", async ({ page }) => {
    await openRoute(page, "/queries?qh-crash=queries");
    await expect(page.locator(fallback("queries"))).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(fallback("queries"))).toContainText("This page hit a problem");
    await expect(page.locator(TOP_LEVEL)).toHaveCount(0);
    await expect(page.locator(SIDEBAR)).toBeVisible();

    await nav(page, "Contact list");
    await expect(page).toHaveURL(/\/agents$/);
    await expect(page.locator('[data-boundary-fallback]:visible')).toHaveCount(0);

    await nav(page, "Query Centre");
    await expect(page.locator(fallback("queries"))).toHaveCount(0);
    await expect(page.locator(TOP_LEVEL)).toHaveCount(0);
  });

  test("2 · Try again remounts just that page", async ({ page }) => {
    await openRoute(page, "/agents?qh-crash=agents");
    const fb = page.locator(fallback("agents"));
    await expect(fb).toBeVisible({ timeout: 20_000 });
    await fb.getByRole("button", { name: "Try again" }).click();
    await expect(fb).toHaveCount(0);
    await expect(page.locator(SIDEBAR)).toBeVisible();
    await expect(page.locator(TOP_LEVEL)).toHaveCount(0);
  });

  test("3 · a panel falls over on its own: one line, Close and Try again", async ({ page }) => {
    await openRoute(page, "/dashboard?qh-crash=panel:feedback");
    const fb = page.locator(fallback("panel:feedback"));
    await expect(fb).toBeVisible({ timeout: 20_000 });
    await expect(fb).toContainText("This panel hit a problem.");
    await expect(page.locator(SIDEBAR)).toBeVisible();
    await expect(page.locator('[data-boundary-fallback="dashboard"]')).toHaveCount(0);
    await fb.getByRole("button", { name: "Close" }).click();
    await expect(fb).toHaveCount(0);
  });

  test("4 · the top-level boundary still catches a crash outside every page", async ({ page }) => {
    await openRoute(page, "/dashboard");
    await page.goto("/dashboard?qh-crash=app");
    await expect(page.locator(TOP_LEVEL)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(SIDEBAR)).toHaveCount(0);
  });
});
