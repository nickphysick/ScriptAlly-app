import { test } from "@playwright/test";
import { openRoute } from "./measure";
test("shot: the board, and the Examples drawer", async ({ page }) => {
  await openRoute(page, "/todo/noteboard", { width: 1440, height: 900 });
  await page.screenshot({ path: "reports/noteboard/board-1440.png" });
  await page.getByRole("button", { name: "Examples" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "reports/noteboard/drawer-1440.png" });
});
