/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 — the report's screens, beside refs 01–27 (design-refs/query-centre-v152/screens), at 1280 × 800 and
 * 1512 × 900, over the q152- fixtures (seeded and removed in the same run). Writes nothing it does not undo: screen 11
 * saves a step and presses Undo before the run goes on.
 *
 *   bash tests/e2e/qc152Run.sh "node scripts/emu-e2e-inner.mjs tests/e2e/qc152Shots.measure.ts --project=measure --workers=1"
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(600_000);
const OUT = "reports/qc-v152/screens";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
const CARD = "[data-qp='panel'] [data-qc152='card']";

test.beforeAll(() => { execSync("node tests/e2e/seedQc152.mjs", { stdio: "pipe" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { stdio: "pipe" }); });

async function open(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  });
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'][data-id^='q152-']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
}
async function card(page: Page, key: string) {
  await page.evaluate((id) => {
    const r = document.querySelector<HTMLElement>(`[data-qc151='row'][data-id='${id}']`);
    r?.scrollIntoView({ block: "center" });
    (r?.querySelector<HTMLElement>("td") ?? r)?.click();
  }, `q152-${key}`);
  await page.locator(`${CARD}[data-id='q152-${key}']`).waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1100);
}
const tap = (page: Page, sel: string) => page.locator(sel).first().click({ timeout: 8000 }).catch(() => {});
const esc = async (page: Page, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); } };

for (const vp of SIZES) {
  test(`screens @ ${vp.width}`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${vp.width}.png` });
    await open(page, vp);
    await shot("01-list-states");
    await page.evaluate(() => document.querySelector("[data-qc1511='group'][data-k='quiet']")?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(400); await shot("02-list-gone-quiet");
    await tap(page, ".qc1511-q[data-k='you']"); await page.waitForTimeout(500); await shot("03-filter-your-move");
    await tap(page, ".qc1511-q[data-k='all']"); await page.waitForTimeout(400);
    await card(page, "materials"); await shot("04-card-materials-requested");
    await card(page, "long");
    const w = page.locator(`${CARD} [data-qc152='wait'][tabindex]`).nth(1);
    await w.hover().catch(() => {}); await page.waitForTimeout(300); await shot("05-wait-tip");
    await tap(page, `${CARD} [data-qc152='chip']`); await page.waitForTimeout(300); await shot("06-chip-detail");
    await page.mouse.click(5, 5);
    const b = page.locator(`${CARD} [data-qc152='msg'][data-side='them'] [data-qc152='bubble']`).first();
    await b.hover().catch(() => {}); await page.waitForTimeout(300); await shot("07-edit-on-hover");
    await card(page, "fullreq");
    await tap(page, `${CARD} [data-qc152='reply-btn']`); await page.waitForTimeout(500); await shot("08-reply-mark-full-sent");
    await tap(page, "[data-qp='panel'] [data-qc152='mat-chip'][data-kind='full']"); await page.waitForTimeout(300); await shot("09-material-version");
    await tap(page, "[data-qc152='mat-editor'] [data-qc152='mat-done']");
    await tap(page, "[data-qp='panel'] [data-qc152='see-changes']"); await page.waitForTimeout(400); await shot("10-what-changes");
    await tap(page, "[data-qp='panel'] [data-qc152='save']"); await page.waitForTimeout(700); await shot("11-after-save");
    await tap(page, "[data-qad-undo]"); await page.waitForTimeout(2000);
    await card(page, "agent"); await shot("12-card-with-the-agent");
    await tap(page, `${CARD} [data-qc152='reply-btn']`); await page.waitForTimeout(500); await shot("13-record-response");
    await esc(page, 2);
    await card(page, "nudge"); await shot("14-card-nudge-due");
    await card(page, "quiet"); await shot("15-card-gone-quiet");
    await card(page, "closed"); await shot("16-card-closed");
    await card(page, "long");
    await tap(page, `${CARD} [data-qc152='pencil']`); await page.waitForTimeout(500); await shot("17-what-needs-changing");
    await tap(page, "[data-qp='panel'] [data-qc152='fork-fix']"); await page.waitForTimeout(500); await shot("18-fix-a-mistake");
    await tap(page, "[data-qp='panel'] [data-qc152='fix-step'][data-t='preq'] [data-qc152='remove']"); await page.waitForTimeout(300); await shot("19-remove-warning");
    await tap(page, "[data-qp='panel'] [data-qc152='remove-no']");
    await tap(page, "[data-qp='panel'] [data-qc152='fix-step'][data-t='psent'] [data-qc152='date-btn']"); await page.waitForTimeout(300); await shot("20-calendar-greyed");
    await esc(page);
    await tap(page, "[data-qp='panel'] [data-qc152='pkg-btn']"); await page.waitForTimeout(300); await shot("21-package-picker");
    await esc(page);
    await tap(page, "[data-qp='panel'] [data-qc152='fix-step'][data-t='psent'] [data-qc152='mat-chip']"); await page.waitForTimeout(300); await shot("22-sample-editor");
    await esc(page, 3);
    await card(page, "fullreq");
    await tap(page, `${CARD} [data-qc152='pencil']`); await tap(page, "[data-qp='panel'] [data-qc152='fork-details']"); await page.waitForTimeout(400); await shot("23-edit-details");
    await tap(page, "[data-qp='panel'] [data-qc152='agent-btn']"); await page.waitForTimeout(300); await shot("24-details-agent-picker");
    await esc(page, 3);
    await card(page, "materials");
    await tap(page, `${CARD} [data-qc152='tab'][data-tab='agent']`); await page.waitForTimeout(300); await shot("25-agent-tab");
    await tap(page, `${CARD} [data-qc152='tab'][data-tab='materials']`); await page.waitForTimeout(300); await shot("26-materials-tab");
    await page.evaluate(() => { (window as unknown as { __SA_QC152_FREE?: boolean }).__SA_QC152_FREE = true; });
    await card(page, "closed"); await card(page, "materials");
    await tap(page, `${CARD} [data-qc152='reply-btn']`); await tap(page, "[data-qp='panel'] [data-qc152='mat-chip']"); await page.waitForTimeout(300); await shot("27-free-plan-material");
  });
}
