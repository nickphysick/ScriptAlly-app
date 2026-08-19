/** Ground truth: what do the cohort's agencies actually ask for? Read off the Contact list. */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

const WHO = ["Elinor Hale", "Tom Ellery", "Marcus Reed", "Priya Nair", "Joan Whitfield"];

test("agent requirements", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await ensureSignedIn(page);
  await page.goto("/agents");
  await page.waitForTimeout(6500);
  /* ⚠️ COUNT DISTINCT SUMMARIES ACROSS EVERY CARD. A per-name lookup matched a shared ancestor
     five times and returned the same string — evidence that looked conclusive and was not. */
  const r = await page.evaluate(() => {
    const lines = [...document.querySelectorAll("[class*='agl-mat'], [class*='agl-asks'], [class*='agl-sum']")]
      .map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter((t) => /covering letter|synopsis|chapter|page|word/i.test(t));
    return { count: lines.length, distinct: [...new Set(lines)], sample: lines.slice(0, 6) };
  });
  const report = ["── what each agency asks for (from the Contact list)",
    `  materials lines found: ${r.count}`,
    `  DISTINCT summaries:    ${r.distinct.length}`,
    ...r.distinct.slice(0, 8).map((d) => `    · ${d.slice(0, 70)}`)].join("\n");
  writeFileSync("run-artifacts/agent-asks.txt", report);
  console.log("\n" + report + "\n");
});
