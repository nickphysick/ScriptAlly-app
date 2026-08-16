import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(300_000);
test("the To-do page, deployed", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: resolve(process.cwd(), "reports/pane/todo-white-card.png") });
  /* and the journey open on it, so the white ground is visible under a journey too */
  await page.locator(".tdg-row").filter({ hasText: /^Send/ }).first().click();
  await page.waitForTimeout(400);
  await page.locator(".tdk-prime").click({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(process.cwd(), "reports/pane/todo-white-journey.png") });
});
