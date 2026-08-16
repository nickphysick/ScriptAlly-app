import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(240_000);
test("the calendar, opaque and anchored", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);
  await page.locator(".tdg-row").filter({ hasText: /^Send/ }).first().click();
  await page.waitForTimeout(400);
  await page.locator(".tdk-prime").click(); await page.waitForTimeout(600);
  await page.locator(".pj-seg button", { hasText: "Another date" }).first().click();
  await page.waitForTimeout(600);
  /* ⚠️ SCOPED TO THE OPEN POPOVER. `.cal-d` is ALSO the Calendar PAGE's day cell — the two surfaces
     share the prefix, and the page's grid is mounted-but-hidden, so an unscoped selector resolves
     to a cell nobody can click. Recorded in reports/found.md. */
  await page.locator(".cal.open .cal-d:not(.blank)").nth(15).click({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(process.cwd(), "reports/pane/cal-after.png"), clip: { x: 1100, y: 480, width: 760, height: 500 } });
});
