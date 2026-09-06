import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
test("does Log new query still open anything?", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const before = await page.evaluate(() => document.body.innerText.length);
  await page.locator(".wsh-cta").first().click();
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    len: document.body.innerText.length,
    createPane: !!document.querySelector(".qcp, .qcp-root, [class*='qcp']"),
    stepStack: !!document.querySelector("[class*='stepstack'], [class*='qc-step']"),
    saysLogging: /logging new query/i.test(document.body.innerText),
    panelWide: !!document.querySelector(".qpn--wide"),
  }));
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ before, ...after }));
});
