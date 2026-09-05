import { test } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync } from "node:fs";
test("crop the Query sent rung — 1440", async ({ page }) => {
  mkdirSync("reports/drawer3-fix", { recursive: true });
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator('[data-qcc-id="cor-move-b"]').click();
  await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
  await page.locator(".qpn .tl-more").first().waitFor();
  const box = await page.evaluate(() => {
    const qpn = [...document.querySelectorAll<HTMLElement>(".qpn")].find((e) => e.getBoundingClientRect().height > 0)!;
    const r = qpn.querySelector<HTMLElement>(".tl-ev")!.getBoundingClientRect();
    return { x: r.left - 4, y: r.top - 4, width: r.width + 8, height: Math.min(r.height + 8, 150) };
  });
  await page.screenshot({ path: "reports/drawer3-fix/rung-before.png", clip: box });
});
