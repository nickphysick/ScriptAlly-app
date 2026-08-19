import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

/**
 * The mockup and the page, at the same two widths, so the port can be looked at rather than
 * only asserted. The mockup is opened from disk as its own document — it is a standalone page,
 * which is the point.
 */
test("port shots", async ({ page }) => {
  const ref = pathToFileURL(join(process.cwd(), "design-refs/todo-materials-contract.html")).href;
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto(ref);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `reports/port/mockup-${w}.png` });
  }
  await ensureSignedIn(page);
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto("/todo");
    await page.waitForTimeout(6500);
    await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
      const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
        .find((r) => /^Send your full/.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
      (row as HTMLElement | undefined)?.click();
    });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `reports/port/page-${w}.png` });
  }
});
