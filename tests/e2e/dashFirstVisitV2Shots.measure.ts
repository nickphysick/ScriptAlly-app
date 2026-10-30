/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2 — shots beside the reference (design-refs/dashboard-first-visit-v2/screens/*).
 * FV2_SHOTS=<name>[,<name>] picks which; each state is set up by its seeder before the run.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/dashboard-first-visit-v2/shots";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }];
const PICK = (process.env.FV2_SHOTS ?? "pre").split(",");
const MS = process.env.FV2_MS ?? "db60-pre";

async function open(page: Page, vp: { width: number; height: number }, flags: Record<string, unknown> = {}) {
  await page.addInitScript(([m, f]) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
  }, [MS, flags] as const);
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE", m.type(), m.text().slice(0, 300)); });
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(800);
}

for (const name of PICK) {
  for (const vp of SIZES) {
    test(`shot ${name} ${vp.width}`, async ({ page }) => {
      test.setTimeout(120_000);
      if (name === "tour") execSync("node tests/e2e/seedFv2.mjs tour-reset", { stdio: "ignore" });
      await open(page, vp);
      mkdirSync(DIR, { recursive: true });
      if (name === "tour") {
        for (let i = 1; i <= 3; i++) {
          await page.locator(`[data-fv2="tour"][data-stop="${i}"] [data-pck="card"]:not([style*="hidden"])`).waitFor({ timeout: 15_000 });
          await page.waitForTimeout(400);
          await page.screenshot({ path: `${DIR}/tour-${i}-${vp.width}.png` });
          if (i < 3) await page.locator('[data-fv2="tour-next"]').click();
        }
        await page.locator('[data-fv2="tour-skip"]').click();
        /* the flag is written on Skip: give the write time to land before the page closes */
        await page.waitForTimeout(3000);
        return;
      }
      if (name === "example") {
        await page.locator('[data-fv2="example-link"]').click();
        await page.locator('[data-fv2="example"] [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 15_000 });
        await page.waitForTimeout(1600);
      }
      await page.screenshot({ path: `${DIR}/${name}-${vp.width}.png` });
    });
  }
}
