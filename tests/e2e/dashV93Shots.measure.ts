/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v93 — the report's shots (set DB93_SHOTS=1). Not a lock. The founding card's stats are seeded through the
 * dev-only `window.__SA_FOUNDING_STATS` aid.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { STATS, openDash } from "./db93Lib";

const OUT = "reports/dashboard-v93/shots";

test("DB93 shots", async ({ page }) => {
  test.skip(!process.env.DB93_SHOTS, "set DB93_SHOTS=1");
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [w, h] of [[1280, 650], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) {
    await openDash(page, { width: w, height: h }, { __SA_FOUNDING_STATS: STATS["6"] });
    await page.screenshot({ path: `${OUT}/page-${w}x${h}.png` });
  }
  const vp = { width: 1440, height: 900 };
  for (const k of ["0", "1", "6", "11", "25"]) {
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS[k] });
    const box = await page.locator('[data-d58="panel"]').first().boundingBox();
    if (box) await page.screenshot({ path: `${OUT}/card-${k}-1440x900.png`, clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } });
  }
  await openDash(page, vp, { __SA_FOUNDING_STATS: STATS["6"] });
  const want = new Set(["nudge", "close", "send", "other"]);
  const n = Number((await page.locator('[data-d71="pos-text"]').first().textContent())?.split(" OF ")[1] ?? 1);
  for (let i = 0; i < n && want.size; i++) {
    const kind = await page.locator('[data-d71="task"]').first().getAttribute("data-kind");
    if (kind && want.has(kind)) {
      want.delete(kind);
      await page.mouse.move(2, 2);
      const box = await page.locator('[data-d71="task"]').first().boundingBox();
      if (box) await page.screenshot({ path: `${OUT}/task-${kind}-1440x900.png`, clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } });
    }
    await page.locator('[data-d71="next"]').click();
    await page.waitForTimeout(120);
  }
  await page.locator('[data-d93="how"]:visible').first().click();
  await page.locator('[data-d93="panel"].on').waitFor({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/how-it-works-1440x900.png` });
});
