import { test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
/** the mockup, from disk, at both widths — no auth, so this half never depends on the app */
test.use({ storageState: { cookies: [], origins: [] } });
test("mockup shots", async ({ page }) => {
  const ref = pathToFileURL(join(process.cwd(), "design-refs/todo-materials-contract.html")).href;
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto(ref);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `reports/port/mockup-${w}.png` });
  }
});
