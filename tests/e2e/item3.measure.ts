import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { resolve } from "node:path";
test.setTimeout(300_000);
test("item 3 — card height, body scrollHeight, does it scroll, is it evident", async ({ page }) => {
  for (const h of [1000, 760]) {
    await openRoute(page, "/todo", { width: 1920, height: h });
    await page.locator(".tdg-row").first().click();
    await page.waitForTimeout(500);
    const read = async () => page.evaluate(() => {
      const vis = (e: Element) => e.getBoundingClientRect().height > 0;
      const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
      const b = g(".tdk-body"); const c = g(".tdk-w"); const outer = g(".tdk-scroll");
      const fades = [...(outer?.children ?? [])].filter((n) => (n as HTMLElement).getAttribute("aria-hidden") === "true")
        .map((n) => Number(getComputedStyle(n as HTMLElement).opacity));
      return {
        cardHeight: c ? Math.round(c.getBoundingClientRect().height) : null,
        bodyScrollHeight: b?.scrollHeight ?? null,
        bodyClientHeight: b?.clientHeight ?? null,
        overflow: b ? b.scrollHeight - b.clientHeight : null,
        scrollTop: b?.scrollTop ?? null,
        fadeOpacities: fades,
      };
    });
    const before = await read();
    const bb = await page.locator(".tdk-body").first().boundingBox();
    if (bb) { await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.wheel(0, 400); await page.waitForTimeout(400); }
    const after = await read();
    console.log(`h=${h} BEFORE ${JSON.stringify(before)}`);
    console.log(`h=${h} AFTER-WHEEL ${JSON.stringify(after)}`);
    if (before.overflow && before.overflow > 0) {
      expect(before.fadeOpacities.some((o) => o > 0), "overflow exists but no fade signals it").toBe(true);
      expect(after.scrollTop, "the body did not move under a real wheel").toBeGreaterThan(0);
    }
    await page.locator(".tdk-w").first().screenshot({ path: resolve(process.cwd(), `reports/pane/item3-${h}.png`) }).catch(() => {});
  }
});
