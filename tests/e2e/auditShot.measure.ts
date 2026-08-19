import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
test("audit shot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/todo");
  await page.waitForTimeout(6500);
  await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
    const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
      .find((r) => /^Send your full/.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
    (row as HTMLElement | undefined)?.click();
  });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: "reports/audit/send-rest.png" });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("[class*='tdk-'] button")]
      .find((x) => /^(Record|Action|Close|Send|Mark|Log|Chase)/.test((x.textContent ?? "").trim()));
    (b as HTMLElement | undefined)?.click();
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "reports/audit/send-journey.png" });
});
