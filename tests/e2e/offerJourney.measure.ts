import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(300_000);

test("the offer journey — selector, then each branch", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);
  const row = page.locator(".tdg-row").filter({ hasText: /^Decide.*offer/ }).first();
  if (!(await row.count())) { console.log("NO OFFER CARD ON DEV"); return; }
  await row.click(); await page.waitForTimeout(450);
  await page.locator(".tdk-prime").click({ timeout: 10_000 });
  await page.waitForTimeout(600);

  const read = () => page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    const prime = g(".pj-prime");
    const r = prime?.getBoundingClientRect();
    return {
      preline: (g(".tdk-pre")?.textContent ?? "").trim(),
      branches: [...document.querySelectorAll(".pj-branch b")].map((b) => (b.textContent ?? "").trim()),
      steps: [...document.querySelectorAll(".pj-n h4")].map((h) => (h.textContent ?? "").trim()),
      rows: [...document.querySelectorAll(".pj-orow")].map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 52)),
      summary: (g(".pj-sum .t")?.textContent ?? "").trim(),
      prime: prime ? (prime.textContent ?? "").trim() : null,
      primeDisabled: prime ? (prime as HTMLButtonElement).disabled : null,
      primeOnScreen: r ? r.y + r.height <= window.innerHeight : null,
      hint: (g(".pj-hint")?.textContent ?? "").trim(),
      backs: [...document.querySelectorAll(".pj-back")].map((b) => (b.textContent ?? "").trim()),
      inert: [...document.querySelectorAll("[inert]")].length,
    };
  });

  const sel = await read();
  console.log("SELECTOR:", JSON.stringify(sel, null, 1));
  await page.locator(".tdk-w").first().screenshot({ path: resolve(process.cwd(), "reports/pane/offer-selector.png") });
  expect(sel.branches, "the three branches").toHaveLength(3);
  expect(sel.prime, "the selector must offer no deed").toBeNull();
  expect(sel.inert).toBe(0);
  expect(sel.backs, "the selector's way back is to the card").toEqual(["Back to the task"]);

  for (const [label, file] of [["Let your other agents know", "offer-notify"], ["Record your decision", "offer-decide"], ["I need time to decide", "offer-time"]] as const) {
    await page.locator(".pj-branch", { hasText: label }).first().click();
    await page.waitForTimeout(450);
    const r = await read();
    console.log(`${file}:`, JSON.stringify(r, null, 1));
    await page.locator(".tdk-w").first().screenshot({ path: resolve(process.cwd(), `reports/pane/${file}.png`) });
    expect(r.prime, `${file}: a branch must offer its deed`).not.toBeNull();
    expect(r.primeOnScreen, `${file}: the commit is below the fold`).toBe(true);
    expect(r.inert, `${file}: something is inert`).toBe(0);
    /* ⚠️ ONE BACK CONTROL — two stacked is what the first walk found, and the top one discarded
       the branch the writer had chosen. */
    expect(r.backs, `${file}: the way back must be single, and go up ONE level`).toEqual(["Back to the three"]);
    await page.locator(".pj-back").first().click();
    await page.waitForTimeout(400);
  }
});
