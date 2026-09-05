/**
 * RETIRED AS A SWEEP: the width×range sweep drove a range control v58 removed, and its
 * card-object claims are calFid63 (4)'s (hairline, radius, white, two lines). What survives is
 * its best idea — the BAND VOCABULARY comes from the app's own sources, never a list typed in a
 * test — retargeted to the v63 band: every status word on the board is a QueryStatus, and every
 * holder is one of Query Centre's four turn words.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";
import { openRoute } from "./measure";

test("every band word on the board comes from the app's own vocabulary", async ({ page }) => {
  const types = readFileSync(join(process.cwd(), "src/types.ts"), "utf8");
  const statuses = [...types.matchAll(/^\s+[A-Z_]+ = "([^"]+)",$/gm)].map((m) => m[1]);
  expect(statuses.length, "no statuses parsed out of types.ts").toBeGreaterThan(8);
  const allowed = new Set([...statuses, "Task"]);
  const holders = new Set(["With the agent", "With you", "Offer", "No response", "Closed", "Overdue"]);

  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...g.querySelectorAll<HTMLElement>(".tl-p")]
      .filter((c) => c.getBoundingClientRect().height > 1)
      .map((c) => ({ sw: c.querySelector(".tl-sw")?.textContent?.trim() ?? null,
        sh: c.querySelector(".tl-sh")?.textContent?.trim() ?? null }));
  });
  expect(r.length, "no cards").toBeGreaterThan(5);
  for (const c of r) {
    if (c.sw) expect(allowed.has(c.sw), `a band says "${c.sw}", which is nobody's vocabulary`).toBe(true);
    if (c.sh) expect(holders.has(c.sh), `a holder says "${c.sh}"`).toBe(true);
  }
});
