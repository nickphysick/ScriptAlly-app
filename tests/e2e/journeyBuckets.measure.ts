import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(300_000);
const CASES = [
  { tag: /^Chase/, id: "chase", expect: ["When", "Come back to it", "Anything to remember"] },
  { tag: /^Close/, id: "close", expect: ["How it ended", "Anything to remember"] },
];
test("phase 3 — the shorter journeys", async ({ page }) => {
  for (const c of CASES) {
    await openRoute(page, "/todo", { width: 1920, height: 1000 });
    await liftMotionSuppression(page);
    const row = page.locator(".tdg-row").filter({ hasText: c.tag }).first();
    if (!(await row.count())) { console.log(`${c.id}: NO CARD ON DEV`); continue; }
    await row.click(); await page.waitForTimeout(450);
    await page.locator(".tdk-prime").click({ timeout: 10_000 });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const vis = (e: Element) => e.getBoundingClientRect().height > 0;
      const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
      const prime = g(".pj-prime");
      const rect = prime?.getBoundingClientRect();
      return {
        preline: (g(".tdk-pre")?.textContent ?? "").trim(),
        steps: [...document.querySelectorAll(".pj-n h4")].map((h) => (h.textContent ?? "").trim()),
        summary: (g(".pj-sum .t")?.textContent ?? "").trim(),
        prime: (prime?.textContent ?? "").trim(),
        primeDisabled: prime ? (prime as HTMLButtonElement).disabled : null,
        primeOnScreen: rect ? rect.y + rect.height <= window.innerHeight : null,
        inert: [...document.querySelectorAll("[inert]")].length,
      };
    });
    console.log(`${c.id}: ${JSON.stringify(r)}`);
    await page.locator(".tdk-w").first().screenshot({ path: resolve(process.cwd(), `reports/pane/journey-${c.id}.png`) });
    expect(r.steps, `${c.id} step stack`).toEqual(c.expect);
    expect(r.inert, `${c.id}: something is inert`).toBe(0);
    expect(r.primeOnScreen, `${c.id}: the commit is below the fold`).toBe(true);
  }
});
