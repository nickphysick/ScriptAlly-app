/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 — the report's screens, beside refs 01–76 (design-refs/query-centre-v152-2/screens), at 1280 × 800
 * and 1512 × 900, over the q152- fixtures (seeded and removed in the same run). Writes nothing it does not remove.
 *
 *   bash tests/e2e/qc152Run.sh "QC1522_SHOTS=list node scripts/emu-e2e-inner.mjs tests/e2e/qc1522Shots.measure.ts --project=measure --workers=1"
 *   QC1522_SHOTS = list | card | all (default all)
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(900_000);
const OUT = "reports/qc-v152-2/screens";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
const WHICH = process.env.QC1522_SHOTS ?? "all";
export const CARD = "[data-qp='panel'] [data-qc152='card']";

test.beforeAll(() => { execSync("node tests/e2e/seedQc152.mjs", { stdio: "pipe" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { stdio: "pipe" }); });

export async function openQc(page: Page, vp: { width: number; height: number }, group = "attention", plan: "free" | "pro" | null = null) {
  await page.addInitScript(([g, p]) => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: g, sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); localStorage.removeItem("sa.pinList.queries");
      if (p) (window as unknown as { __SA_QC_PLAN?: string }).__SA_QC_PLAN = p;
    } catch { /* private mode */ }
  }, [group, plan] as const);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'][data-id^='q152-']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
}
const scroller = (page: Page, y: number) => page.evaluate((top) => {
  const t = document.querySelector<HTMLElement>("[data-qc151='page']");
  let el: HTMLElement | null = t;
  while (el && !(el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
  el?.scrollTo({ top, behavior: "instant" as ScrollBehavior });
}, y);

for (const vp of SIZES) {
  test(`list screens @ ${vp.width}`, async ({ page }) => {
    test.skip(WHICH !== "all" && WHICH !== "list");
    mkdirSync(OUT, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${vp.width}.png` });
    await openQc(page, vp);
    await shot("01-list-top");
    await page.evaluate(() => document.querySelector("[data-qc1522='divider']")?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(300);
    await shot("02-list-action-groups");
    await page.locator("[data-qc151='group']").first().click();
    await page.waitForTimeout(400);
    await shot("03-group-menu");
    await page.keyboard.press("Escape");
    await openQc(page, vp, "status"); await page.evaluate(() => document.querySelector("[data-qc1522='divider']")?.scrollIntoView({ block: "start" })); await page.waitForTimeout(300);
    await shot("04-grouped-by-status");
    await openQc(page, vp, "package"); await page.evaluate(() => document.querySelector("[data-qc1522='divider']")?.scrollIntoView({ block: "start" })); await page.waitForTimeout(300);
    await shot("05-grouped-by-package");
    await openQc(page, vp, "attention", "free");
    await page.evaluate(() => document.querySelector("[data-qc1522='divider']")?.scrollIntoView({ block: "start" })); await page.waitForTimeout(300);
    await page.locator("[data-qc151='group']").first().click(); await page.waitForTimeout(400);
    await shot("06-group-menu-free");
    await page.keyboard.press("Escape");
    await openQc(page, vp);
    await page.evaluate(() => {
      const t = [...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")][3] ?? document.querySelector<HTMLElement>("[data-qc1511='group']");
      const rows = t?.querySelectorAll<HTMLElement>("[data-qc151='row']");
      (rows && rows.length > 1 ? rows[1] : t)?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
    await shot("07-sticky-header");
    void scroller;
  });
}
