/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Overnight fixes v1, Part 6: the "Listen-channel overflow" investigation. A measurement, not a lock: it records what
 * one browser page asks the Firestore emulator for (tests/e2e/listenTally.ts: Listen opens, targets added and
 * removed), at five moments:
 *   1. after the first load (/queries);
 *   2. after visiting every workspace page once;
 *   3. after opening and closing the query panel 20 times;
 *   4. after opening and closing the agent card 20 times;
 *   5. after 5 minutes idle (sampled each minute).
 * "Open targets" = targets added − targets removed. A count that keeps rising across 2–5 is the fault.
 * Readings go to reports/overnight-fixes-v1/listeners.json.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { byPath, record, type Tally } from "./listenTally";

const VP = { width: 1440, height: 900 };
const PAGES = ["/dashboard", "/queries", "/queries/analytics", "/queries/responses", "/queries/packages", "/todo", "/todo/corkboard",
  "/agents", "/agents/discover", "/manuscripts", "/manuscripts/comps", "/manuscripts/versions", "/your-notes"];
const IDLE_MIN = Number(process.env.ONF_IDLE_MIN ?? 5);

const snap = (t: Tally, label: string) => ({ label, opens: t.opens.length, added: t.adds.length, removed: t.removes, open: t.adds.length - t.removes, commits: t.commits.length });

/** SPA navigation through the app's own router: a click on the rail would do the same, a goto would reload */
async function spa(page: Page, path: string) {
  await page.evaluate((p) => { window.history.pushState({}, "", p); window.dispatchEvent(new PopStateEvent("popstate")); }, path);
  await page.waitForTimeout(1500);
}

async function cycle(page: Page, rowSel: string, panelSel: string, n: number) {
  let opened = 0;
  for (let i = 0; i < n; i++) {
    const ok = await page.evaluate(({ rowSel, i }) => {
      const rows = [...document.querySelectorAll<HTMLElement>(rowSel)].filter((e) => e.getBoundingClientRect().height > 0);
      const r = rows[i % Math.max(1, Math.min(rows.length, 5))];
      if (!r) return false;
      r.scrollIntoView({ block: "center" });
      (r.querySelector<HTMLElement>("td, [data-cl26='name']") ?? r).click();
      return true;
    }, { rowSel, i });
    if (!ok) break;
    const shown = await page.locator(panelSel).first().waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false);
    if (shown) opened++;
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    /* a guard or a second layer: Escape again, then make sure it is gone */
    if (await page.locator(panelSel).first().isVisible().catch(() => false)) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
  }
  return opened;
}

test("Part 6 · listen targets across load, every page, 20 panels, 20 cards and idle", async ({ page }) => {
  test.setTimeout((IDLE_MIN * 60 + 600) * 1000);
  const t = record(page);
  const rows: ReturnType<typeof snap>[] = [];
  await openRoute(page, "/queries", VP);
  rows.push(snap(t, "1 · after load (/queries)"));
  for (const p of PAGES) await spa(page, p);
  rows.push(snap(t, `2 · after ${PAGES.length} workspace pages`));
  await spa(page, "/queries");
  const qOpened = await cycle(page, "[data-qc151='row']", "[data-side-panel], [data-qcv='panel'], [data-qp='panel']", 20);
  rows.push({ ...snap(t, `3 · after the query panel ×20 (opened ${qOpened})`) });
  await spa(page, "/agents");
  const aOpened = await cycle(page, ".aglist [data-clv='row'], .aglist [data-cl26='row']", "[data-cl262='panel'] .cl262-card, [data-cl262='panel']", 20);
  rows.push({ ...snap(t, `4 · after the agent card ×20 (opened ${aOpened})`) });
  for (let m = 1; m <= IDLE_MIN; m++) { await page.waitForTimeout(60_000); rows.push(snap(t, `5 · idle ${m} min`)); }
  const out = { rows, top: byPath(t).slice(0, 25), requests: t.requests };
  mkdirSync("reports/overnight-fixes-v1", { recursive: true });
  writeFileSync("reports/overnight-fixes-v1/listeners.json", JSON.stringify(out, null, 1));
  for (const r of rows) console.log(`[listen] ${JSON.stringify(r)}`);
  console.log(`[listen] top: ${JSON.stringify(out.top.slice(0, 15))}`);
});
