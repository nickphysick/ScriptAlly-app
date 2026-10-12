/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query panel v2 — the report's shots (reports/query-panel-v2/shots), each beside its `ref-*@2x.png` in
 * design-refs/query-panel-v2. `QP2_SHOTS=1` writes them; a routine run writes none. Nothing is saved: every
 * action is opened, photographed and left.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const OUT = "reports/query-panel-v2/shots";
const ROW = '.qcw-list [data-qcv="row"]';
const PANEL = '[data-qp="panel"]';

async function open(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); sessionStorage.setItem("sa.betaStrip", "1"); } catch { /* */ } });
  await openRoute(page, "/queries", vp);
  await expect(page.locator(ROW).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
}
const row = async (page: Page, sel: string) => {
  const r = page.locator(sel).first();
  await r.evaluate((e) => e.scrollIntoView({ block: "center" })); await page.waitForTimeout(250);
  await r.locator('[data-qcv="row-agent"], .qcw-agt').first().click();
  await expect(page.locator(PANEL)).toBeVisible(); await page.waitForTimeout(600);
};
const tab = async (page: Page, name: string) => { await page.locator(`${PANEL} [role="tab"]`, { hasText: new RegExp(`^${name}`) }).click(); await page.waitForTimeout(400); };
const shot = (page: Page, name: string) => page.screenshot({ path: `${OUT}/${name}.png` });
const leave = async (page: Page) => { for (let i = 0; i < 4 && (await page.locator(`${PANEL} [data-qp-step]`).count()); i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(450); const d = page.locator("[data-qad-discard] .disc").first(); if (await d.isVisible().catch(() => false)) { await d.click(); await page.waitForTimeout(350); } } };

test("shots", async ({ page }) => {
  test.skip(!process.env.QP2_SHOTS, "QP2_SHOTS=1 writes the report's shots");
  test.setTimeout(600_000);
  page.setDefaultTimeout(12_000);
  mkdirSync(OUT, { recursive: true });
  execSync("node tests/e2e/seedQp1Save.mjs", { stdio: "inherit" });
  try {
    for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
      await open(page, vp);
      const w = vp.width;
      /* the four states */
      await row(page, `${ROW}[data-qid="qp1s-q"]`); await tab(page, "Tracking"); await shot(page, `track-waiting-${w}`);
      await row(page, `${ROW}[data-qid="thin-q-close"]`); await shot(page, `track-year-${w}`);
      await row(page, `${ROW}[data-court="you"]:not([data-status="Offer"])`); await shot(page, `track-you-${w}`);
      if (w === 1512) {
        await row(page, `${ROW}[data-status="Offer"]`); await shot(page, `track-offer-${w}`);
        await row(page, `${ROW}[data-court="closed"]`); await shot(page, `track-closed-${w}`);
        /* both tabs */
        await row(page, `${ROW}[data-qid="seed-query-10"]`);
        await tab(page, "Agent"); await shot(page, `agent-${w}`);
        await tab(page, "Notes"); await shot(page, `notes-${w}`);
        await tab(page, "Tracking");
        /* the correction fork and its preview */
        await page.locator(`${PANEL} .qlg-fix`).first().click({ force: true }); await page.waitForTimeout(600); await shot(page, `act-correct-${w}`);
        await page.locator(`${PANEL} .cor-branch`, { hasText: /correcting a mistake/ }).first().click(); await page.waitForTimeout(500);
        const date = page.locator(`${PANEL} .cor-sheet input[type="date"]`).first();
        if (await date.count()) { const v = await date.inputValue(); const d = new Date(`${v}T12:00:00`); d.setDate(d.getDate() - 2); await date.fill(d.toISOString().slice(0, 10)); await page.waitForTimeout(300); await shot(page, `act-correct-details-${w}`); await page.locator(`${PANEL} .cor-save`).first().click(); await page.waitForTimeout(900); await shot(page, `act-correct-preview-${w}`); }
        await leave(page); await page.keyboard.press("Escape"); await page.waitForTimeout(400); await leave(page);
        /* the response journey and its review */
        await row(page, `${ROW}[data-qid="seed-query-10"]`);
        await page.locator(`${PANEL} [data-door="resp"]`).click(); await page.waitForTimeout(700);
        await page.locator(`${PANEL} [data-qp-step] button`, { hasText: /^Full requested$/ }).click(); await page.waitForTimeout(500); await shot(page, `act-response-${w}`);
        for (let i = 0; i < 6; i++) { const p = page.locator(`${PANEL} [data-qad-primary]`); const l = (await p.innerText()).trim(); if (!/^Next/.test(l) || (await p.isDisabled())) break; await p.click(); await page.waitForTimeout(500); }
        await shot(page, `act-review-${w}`);
        await leave(page);
        /* the top-right picker, with a query open */
        await page.locator(".ws-pagebar .ws-capr").filter({ visible: true }).first().click(); await page.waitForTimeout(300);
        await page.locator(".ws-capi", { hasText: /^Record a response/ }).first().click(); await page.waitForTimeout(900);
        await shot(page, `act-picker-${w}`);
        await leave(page);
      }
    }
    /* one at 800 wide: the panel is the whole screen */
    await open(page, { width: 800, height: 900 });
    await page.locator(`${ROW} [data-qcv="row-agent"], ${ROW} .qcw-agt`).first().click();
    await expect(page.locator(PANEL)).toBeVisible(); await page.waitForTimeout(600);
    await shot(page, "track-800");
  } finally { execSync("node tests/e2e/seedQp1Save.mjs --clean", { stdio: "inherit" }); }
});
