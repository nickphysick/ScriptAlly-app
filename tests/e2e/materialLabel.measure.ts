/** PHASE C ON THE PAGE — the reader sees "Covering letter"; the store still says "Query letter". */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("covering letter reaches the page", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  const out: string[] = [];
  for (const route of ["/queries", "/manuscripts", "/agents"]) {
    await page.goto(route);
    await page.waitForTimeout(5000);
    const r = await page.evaluate(() => {
      const t = document.body.innerText || "";
      return {
        covering: (t.match(/covering letter/gi) || []).length,
        query: (t.match(/query letter/gi) || []).length,
      };
    });
    out.push(`  ${route.padEnd(14)} "covering letter" ×${r.covering}   "query letter" ×${r.query}`);
  }
  const report = ["── material label on the page (1440×900)", ...out, `  page errors: ${errors.length}`].join("\n");
  writeFileSync("run-artifacts/material-label.txt", report);
  console.log("\n" + report + "\n");
});
