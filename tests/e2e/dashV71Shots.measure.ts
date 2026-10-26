/** DASHBOARD v71 — report shots only (day one; the page at the reference sizes). Not a lock. */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

/* the pre-query manuscript exists only while seeded (DB60's own seeder), and is cleaned after */
const seed = (mode: "" | "--clean") => execSync(`node tests/e2e/seedDash60.mjs ${mode}`, { stdio: "pipe" }).toString().trim();
test.beforeAll(() => { seed(""); });
test.afterAll(() => { seed("--clean"); });

const go = async (page: import("@playwright/test").Page, vp: { width: number; height: number }, ms: string, flags: Record<string, unknown>, name: string) => {
  await page.addInitScript(([f, m]) => { Object.assign(window, f); try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* */ } }, [flags, ms] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `reports/dashboard-v71/shots/${name}-${vp.width}x${vp.height}.png` });
};
test("DB71 shots — day one", async ({ page }) => {
  test.setTimeout(240000);
  mkdirSync("reports/dashboard-v71/shots", { recursive: true });
  for (const vp of [{ width: 1512, height: 900 }, { width: 1440, height: 900 }, { width: 1280, height: 800 }]) await go(page, vp, "db60-pre", { __SA_DASH_NO_AGENTS: true }, "day-one");
});
