import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
/** /todo and /queries at both widths, plus every journey the account can reach */
test("frame2 shots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  for (const [w, h] of [[1440, 900], [1920, 1080]] as const) {
    for (const [route, name] of [["/queries", "queries"], ["/todo", "todo"]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(route); await page.waitForTimeout(7000);
      await page.screenshot({ path: `reports/frame2/${name}-${w}.png` });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo"); await page.waitForTimeout(7000);
  const pills = await page.evaluate(() => {
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    return [...new Set([...document.querySelectorAll(".tlc .row .pill")].filter(vis)
      .map((p) => (p.textContent || "").trim()))];
  });
  for (const kind of pills) {
    await page.evaluate((k) => {
      const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
        .find((r) => ((r.querySelector(".pill") || {}) as HTMLElement).textContent?.trim() === k);
      (row as HTMLElement | undefined)?.click();
    }, kind);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `reports/frame2/journey-${kind.toLowerCase().replace(/\s+/g, "-")}.png` });
  }
  console.log("\nJOURNEYS: " + pills.join(" · ") + "\n");
});
