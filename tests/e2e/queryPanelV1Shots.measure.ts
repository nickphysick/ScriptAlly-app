/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query panel v1 — the report's shots (reports/query-panel-v1/shots). `QP1_SHOT=<name>` takes one.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/query-panel-v1/shots";
const only = process.env.QP1_SHOT;
const want = (n: string) => !only || only === n;
const ROW = '.qcw-list [data-qcv="row"]';

async function qc(page: import("@playwright/test").Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(ROW, { timeout: 30_000 });
  await page.waitForTimeout(700);
}
const openRow = async (page: import("@playwright/test").Page, court: string) => {
  const row = page.locator(`${ROW}[data-court="${court}"] .qcw-agt`).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForSelector('[data-qp="panel"]');
  await page.waitForTimeout(500);
};

test("query panel v1 shots", async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    for (const court of ["agent", "you", "closed"]) {
      const n = `open-${court}-${vp.width}`;
      if (!want(n)) continue;
      await qc(page, vp); await openRow(page, court);
      await page.screenshot({ path: `${OUT}/${n}.png` });
    }
  }
  for (const [n, court, door] of [["step-resp", "agent", "resp"], ["step-nudge", "agent", "nudge"], ["step-close", "agent", "close"], ["step-sent", "you", "sent"], ["step-reopen", "closed", ""]] as const) {
    if (!want(n)) continue;
    await qc(page, { width: 1512, height: 900 }); await openRow(page, court);
    const b = door ? page.locator(`[data-qp="panel"] [data-door="${door}"]`).first() : page.locator('[data-qp="panel"] [data-qcv="open-action"]').first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(900); }
    await page.screenshot({ path: `${OUT}/${n}-1512.png` });
  }
  if (want("dashboard-1512")) {
    await qc(page, { width: 1512, height: 900 });
    const id = await page.locator(`${ROW}[data-court="agent"]`).first().getAttribute("data-qid");
    await openRoute(page, "/dashboard", { width: 1512, height: 900 });
    await page.waitForTimeout(2500);
    await page.evaluate((q) => (window as unknown as { __saQueryPanel: { open: (id: string) => void } }).__saQueryPanel.open(q!), id);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/dashboard-1512.png` });
  }
  if (want("narrow-800")) {
    await qc(page, { width: 800, height: 900 }); await openRow(page, "agent");
    await page.screenshot({ path: `${OUT}/narrow-800.png` });
  }
});
