import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
test("frame shots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  const ref = pathToFileURL(join(process.cwd(), "design-refs/todo-frame-contract.html")).href;
  for (const [w, h] of [[1440, 900], [1920, 1080], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(ref); await page.waitForTimeout(900);
    await page.screenshot({ path: `reports/frame/contract-${w}.png` });
  }
  for (const [w, h] of [[1440, 900], [1920, 1080], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/todo"); await page.waitForTimeout(7000);
    await page.screenshot({ path: `reports/frame/page-${w}.png` });
  }
});
