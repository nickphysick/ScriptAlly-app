import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";

/** /queries and /todo at the same width, one file each, so the match is visible not just asserted. */
test("qc shots", async ({ page }) => {
  await ensureSignedIn(page);
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const [route, name] of [["/queries", "queries"], ["/todo", "todo"]] as const) {
      await page.goto(route);
      await page.waitForTimeout(7000);
      await page.screenshot({ path: `reports/qc-match/${name}-${w}.png` });
    }
  }
});
