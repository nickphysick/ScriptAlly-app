/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v56 — the report's screenshots (no locks). `TD56_SHOTS=dev-before|dev-after` against dev:
 *   ALLOW_LIVE_FIRESTORE=1 SA_E2E_BASE_URL=https://scriptally-dev.web.app TD56_SHOTS=dev-after \
 *     npm run e2e -- tests/e2e/todoV56Shots.measure.ts --project=measure --workers=1
 * reads only (no writes). `TD56_SHOTS=ref` shoots the ref's header and slim bar from the local file, at the same widths.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(240_000);
const TAG = process.env.TD56_SHOTS ?? "dev-after";
const OUT = `reports/todo-list-v56/dev-shots`;
mkdirSync(OUT, { recursive: true });
const SIZES = [{ width: 1440, height: 900 }, { width: 1717, height: 1000 }] as const;
const REF = resolve("design-refs/todo-list-v56/todo-navy-header-v1.html");

const toScroll = async (page: Page, root: string, y: number | "end") => {
  await page.evaluate(([rs, v]) => {
    const r = [...document.querySelectorAll<HTMLElement>(rs as string)].find((e) => e.getBoundingClientRect().width > 0)!;
    const sc = (r.closest<HTMLElement>(".wpg-scroll") ?? r.querySelector<HTMLElement>(".wpg-scroll"))!;
    sc.scrollTop = v === "end" ? sc.scrollHeight : (v as number);
  }, [root, y] as const);
  await page.waitForTimeout(900);
  await page.mouse.move(2, 2);
};
const ready = async (page: Page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1500); await page.mouse.move(2, 2); };

for (const vp of SIZES) {
  test(`shots · ${TAG} (${vp.width})`, async ({ page }) => {
    if (TAG === "ref") {
      await page.setViewportSize(vp);
      await page.goto(`file://${REF}`);
      await ready(page);
      await page.locator("#nvh").screenshot({ path: `${OUT}/ref-header-${vp.width}.png` });
      await page.evaluate(() => document.getElementById("slim")?.classList.add("shown"));
      await page.waitForTimeout(400);
      await page.locator("#slim").screenshot({ path: `${OUT}/ref-slim-${vp.width}.png` });
      return;
    }
    await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
    await openRoute(page, "/queries", vp);
    await expect(page.locator(".qc151.qc153 [data-qc1531='header']").first()).toBeVisible({ timeout: 60_000 });
    await ready(page);
    await page.screenshot({ path: `${OUT}/${TAG}-qc-rest-${vp.width}.png` });
    await toScroll(page, ".qc151.qc153", 600);
    await page.screenshot({ path: `${OUT}/${TAG}-qc-scrolled-${vp.width}.png` });
    await openRoute(page, "/agents", vp);
    await expect(page.locator(".cl27 [data-clq='header']").first()).toBeVisible({ timeout: 60_000 });
    await ready(page);
    await page.screenshot({ path: `${OUT}/${TAG}-cl-rest-${vp.width}.png` });
    await toScroll(page, ".cl27", 600);
    await page.screenshot({ path: `${OUT}/${TAG}-cl-scrolled-${vp.width}.png` });
    await openRoute(page, "/todo", vp);
    await expect(page.locator('[data-tws="page"]:visible [data-tws-row]').first()).toBeVisible({ timeout: 60_000 });
    await ready(page);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${TAG}-todo-rest-${vp.width}.png` });
    await toScroll(page, '[data-tws="page"]', "end");
    await page.screenshot({ path: `${OUT}/${TAG}-todo-scrolled-${vp.width}.png` });
  });
}

test(`shots · ${TAG} · the ring alone (1280)`, async ({ page }) => {
  test.skip(TAG === "ref", "the ref's narrow state is a container query on its own page");
  await openRoute(page, "/todo", { width: 1280, height: 800 });
  await expect(page.locator('[data-tws="page"]:visible [data-tws-row]').first()).toBeVisible({ timeout: 60_000 });
  await ready(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${TAG}-todo-rest-1280.png` });
});
