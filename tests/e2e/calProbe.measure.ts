import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(240_000);
test("the calendar on the page — fill, anchor, selected day", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);
  await page.locator(".tdg-row").filter({ hasText: /^Send/ }).first().click();
  await page.waitForTimeout(400);
  await page.locator(".tdk-prime").click(); await page.waitForTimeout(600);
  const other = page.locator(".pj-seg button", { hasText: "Another date" }).first();
  await other.click(); await page.waitForTimeout(600);
  console.log(JSON.stringify(await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const cal = [...document.querySelectorAll(".cal")].find(vis) as HTMLElement | undefined;
    const btn = [...document.querySelectorAll(".pj-seg button")].find(b => /another date|^\d/i.test(b.textContent ?? "")) as HTMLElement | undefined;
    if (!cal) return { cal: null };
    const cs = getComputedStyle(cal);
    const c = cal.getBoundingClientRect(); const b = btn?.getBoundingClientRect();
    const day = cal.querySelector(".cal-d:not(.blank)") as HTMLElement | null;
    return {
      rect: { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width) },
      anchorRect: b ? { x: Math.round(b.x), y: Math.round(b.y), bottom: Math.round(b.bottom) } : null,
      background: cs.backgroundColor, border: cs.borderTopColor, radius: cs.borderRadius, shadow: cs.boxShadow.slice(0, 40),
      parent: cal.parentElement?.tagName.toLowerCase(),
      rootDefinesPaper: getComputedStyle(document.documentElement).getPropertyValue("--paper").trim(),
      bodyDefinesPaper: getComputedStyle(document.body).getPropertyValue("--paper").trim(),
      calSeesPaper: cs.getPropertyValue("--paper").trim(),
      dayBg: day ? getComputedStyle(day).backgroundColor : null,
      useThisDateInside: !!cal.querySelector(".cal-f button"),
    };
  }), null, 2));
  await page.screenshot({ path: resolve(process.cwd(), "reports/pane/cal-before.png") });
});
