import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
test("shots: 1280 and 2300 with the three papers, and the drawer", async ({ page }) => {
  await openRoute(page, "/todo/noteboard", { width: 1280, height: 900 });
  /* the three papers must be IN the shot, or it does not evidence what the report claims */
  for (const p of ["NBPAPER yellow", "NBPAPER pink", "NBPAPER sage"]) {
    await expect(page.locator(".nb-note").filter({ hasText: p }).first()).toBeVisible();
  }
  await page.screenshot({ path: "reports/noteboard-finish/board-1280.png" });
  await page.setViewportSize({ width: 2300, height: 1000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "reports/noteboard-finish/board-2300.png" });
  await page.getByRole("button", { name: "Examples" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "reports/noteboard-finish/drawer-2300.png" });
});
