/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1 — screenshots of the staged journey at 1440×860, for the side-by-side with the ref's screens. Writes
 * nothing: it walks to the check and closes. `LAQ_OUT` names the folder (default reports/log-a-query-v1/shots).
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { openLog, panel, settledReady, shot, OUT } from "./laqLib";

async function walk(page: Page) {
  const id = await settledReady(page);
  await page.locator(`[data-qls="agent"][data-id="${id}"]`).click();
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  if (await page.locator('[data-qls="package"]').count()) await page.locator('[data-qls="package"]').first().click();
  else await page.locator('[data-qls="pieces-continue"]').click();
  if (await page.locator('[data-qls="root"][data-step="how"]').count()) await page.locator('[data-qls="how-opt"]').first().click();
  await page.locator('[data-qls="root"][data-step="check"]').waitFor();
}

/* the safety net: a log whose Undo could not run (a toast that expired on a slow machine) is removed after the file */
test.afterAll(() => { execSync("node tests/e2e/seedLaq.mjs --clean --clean-today", { stdio: "inherit" }); });

test("the stages, screenshot by screenshot", async ({ page }) => {
  test.setTimeout(600_000);
  await openLog(page);
  await shot(page, "01-agent");
  await page.locator('[data-qls="busy"]').click().catch(() => {});
  await shot(page, "02-agent-already-querying");
  await page.locator('[data-qls="find"]').fill("jane doe");
  await shot(page, "03-agent-not-on-list");
  await page.locator('[data-qls="find"]').fill("");
  await page.locator(`[data-qls="agent"][data-id="${await settledReady(page)}"]`).click();
  await shot(page, "04-sent");
  await page.locator('[data-qls="when-opt"][data-k="earlier"]').click();
  await shot(page, "05-sent-calendar");
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await shot(page, "06-materials-packages");
  const choose = page.locator('[data-qls="choose-pieces"]');
  if (await choose.count()) await choose.click();
  await shot(page, "07-materials-pieces");
  const sample = page.locator('[data-qls="piece"][data-k="sample"]');
  if ((await sample.getAttribute("data-on")) !== "1") await sample.click();
  await page.locator('[data-qls="vr"][data-k="sample"]').click();
  await shot(page, "08-pieces-menu");
  await page.keyboard.press("Escape");
  await page.locator('[data-qls="pieces-continue"]').click();
  await shot(page, "09-how");
  await page.locator('[data-qls="how-opt"]').first().click();
  await shot(page, "10-check");
  await page.locator('[data-qls="add-note"]').click();
  await page.locator('[data-qls="note"]').fill("Met at the York festival; mentioned a soft spot for seaside settings.");
  await shot(page, "12-check-note");
  const t0 = Date.now();
  await page.locator('[data-qls="log"]').click();
  await page.locator('[data-qls="stamp"]').waitFor({ state: "visible", timeout: 120_000 });
  console.log(`[laq] click → stamp ${Date.now() - t0}ms`);
  await page.waitForTimeout(120);
  await panel(page).screenshot({ path: `${OUT}/13-stamp.png`, animations: "allow" });
  await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 120_000 });
  await page.waitForTimeout(2400);
  await shot(page, "14-celebration");
  await page.locator('[data-qls="undo"]').click();
  await page.locator('[data-qls="root"][data-step="check"]').waitFor({ timeout: 120_000 });
  await shot(page, "14b-after-undo");
});

test("the milestone and the batch", async ({ page }) => {
  test.setTimeout(600_000);
  execSync('node tests/e2e/seedLaq.mjs --to 24 --book "Murphy\'s Day Out"', { stdio: "ignore" });
  try {
    await openLog(page);
    await walk(page);
    await page.locator('[data-qls="log"]').click();
    await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForTimeout(2600);
    await shot(page, "16-milestone-25");
    await page.locator('[data-qls="undo"]').click();
    await page.locator('[data-qls="root"][data-step="check"]').waitFor({ timeout: 120_000 });
  } finally {
    execSync("node tests/e2e/seedLaq.mjs --clean", { stdio: "ignore" });
  }
  const firstName = ((await page.locator('[data-qls="step"][data-k="who"] [data-qls="step-value"]').textContent()) ?? "").trim();
  await page.locator('[data-qls="log-more"]').click();
  await page.locator('[data-qls="root"][data-step="who"]').waitFor({ timeout: 120_000 });
  await page.waitForTimeout(300);
  await panel(page).screenshot({ path: `${OUT}/17-batch-next-agent.png` });
  await page.locator(`[data-qls="agent"][data-id="${await settledReady(page)}"]`).click();
  if (await page.locator('[data-qls="root"][data-step="how"]').count()) await page.locator('[data-qls="how-opt"]').first().click();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  await panel(page).screenshot({ path: `${OUT}/18-batch-check.png` });
  /* best effort: on a slow machine the 4.2s toast can be gone by now; the afterAll's --clean-today removes the query then */
  if (await page.locator('[data-qls="toast-undo"]').click({ timeout: 3_000 }).then(() => true, () => false)) {
    await page.locator('[data-qls="step"][data-k="who"] [data-qls="step-value"]', { hasText: firstName }).waitFor({ timeout: 120_000 });
  }
});
