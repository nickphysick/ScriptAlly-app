import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
/** the contract from disk and the page beside it, at both widths */
test("list shots", async ({ page }) => {
  /* ⚠️ SIGN IN AT DESKTOP WIDTH FIRST. The sign-in wait keys on `.ws-panel`, which is hidden below
     the mobile breakpoint — the contract loop below leaves the viewport at 390, and doing it the
     other way round times out on a page that is working. */
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  const ref = pathToFileURL(join(process.cwd(), "design-refs/todo-tasklist-contract.html")).href;
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(ref);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `reports/list-port/contract-${w}.png` });
  }
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/todo");
    await page.waitForTimeout(7000);
    await page.screenshot({ path: `reports/list-port/page-${w}.png` });
  }
});
