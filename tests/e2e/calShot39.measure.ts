import { test } from "@playwright/test";
import { openRoute } from "./measure";
import { resolve } from "node:path";
test("v39 board", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(process.cwd(), "reports/calendar-v39/board-1440.png") });
});
