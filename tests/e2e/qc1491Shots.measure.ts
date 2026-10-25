/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149.1 — the report's screenshots (not a lock): the panel's Tracking and Agent tabs for a With you, a
 * With the agent, a Gone quiet and a Closed query at 1512×900, and the list at 1920×1080 with the panel open.
 * The With you query is the seeded one (tests/e2e/seedQc1491.mjs), which carries every part of the story.
 */
import { test } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openQc } from "./nb1Lib";
import { rows, tap } from "./qc149Lib";

test.setTimeout(600_000);
const DIR = "reports/qc-v149-1/screens";
const CARD = "[data-qp='panel'] [data-qc149c='card']";
test.beforeAll(() => { execSync("node tests/e2e/seedQc1491.mjs", { stdio: "ignore" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc1491.mjs --clean", { stdio: "ignore" }); });

test("screens", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  await openQc(page, { width: 1512, height: 900 });
  const all = await rows(page);
  const pick: Record<string, string | undefined> = {
    you: "qc1491-q1",
    agent: all.find((r) => r.where === "agent" && !r.id.startsWith("qc1491"))?.id,
    quiet: all.find((r) => r.where === "quiet" && !r.id.startsWith("qc1491"))?.id,
    closed: all.find((r) => r.where === "closed" && !r.id.startsWith("qc1491"))?.id,
  };
  for (const [w, id] of Object.entries(pick)) {
    if (!id) continue;
    const sel = `.qc138-sheet [data-qcv='row'][data-id="${id}"]`;
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.locator(`${sel} [data-qcv='row-name']`).first().click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${DIR}/${w}-tracking-1512.png` });
    await tap(page, `${CARD} [data-qc149c='tab'][data-tab='agent']`); await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/${w}-agent-1512.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(700);
  }
  await openQc(page, { width: 1920, height: 1080 });
  await page.locator(".qc138-sheet [data-qcv='row'][data-id='qc1491-q1'] [data-qcv='row-name']").first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${DIR}/list-1920-panel-open.png` });
});
