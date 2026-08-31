import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo } from "./calControls";
import { mkdirSync } from "node:fs";

/* a review aid: one board per width, plus the two non-default ranges at 1440 */
test("board shots", async ({ page }) => {
  mkdirSync("reports/calendar-v40", { recursive: true });
  for (const w of [1920, 1440, 1280, 1024, 900, 768]) {
    await openRoute(page, "/todo/calendar", { width: w, height: 900 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `reports/calendar-v40/board-${w}.png` });
  }
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(700);
  for (const [i, name] of [[0, "1month"], [2, "6months"]] as const) {
    await setRangeTo(page, i);
    await page.screenshot({ path: `reports/calendar-v40/board-1440-${name}.png` });
  }
  expect(true).toBe(true);
});
