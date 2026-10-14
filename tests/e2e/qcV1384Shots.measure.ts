/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.4 — the report's screenshots: the five acceptance cases through the peek lab at 1512, 1280 and
 * 1100, and a census of real rows whose date label fell back to its title. Asserts only that it saw rows.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { CASES_1384 } from "./qc1384Cases";

const OUT = "reports/qc-v138-4/shots";
const init = () => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); sessionStorage.setItem("sa.qc138.folded", "[]"); } catch { /* */ } };

test("cases", async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });
  await page.addInitScript(init);
  await page.addInitScript((c) => { (window as unknown as { __SA_QC138_PEEK_LAB: unknown }).__SA_QC138_PEEK_LAB = c; }, CASES_1384);
  for (const vp of [{ width: 1512, height: 1700 }, { width: 1280, height: 1700 }, { width: 1100, height: 2100 }]) {
    await openRoute(page, "/queries", vp);
    const lab = page.locator('[data-qc138="peek-lab"]').filter({ visible: true }).first();
    await lab.waitFor({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await lab.screenshot({ path: `${OUT}/cases-${vp.width}.png` });
  }
});

test("census: date labels that fell back to a title", async ({ page }) => {
  test.setTimeout(900_000);
  await page.addInitScript(init);
  const found: { id: string; name: string; titles: string[] }[] = [];
  let opened = 0;
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    await openRoute(page, "/queries", vp);
    await page.locator('.qcv-group[data-v138] [data-qcv="row"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(800);
    const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getBoundingClientRect().height > 0).map((r) => r.dataset.qid!));
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) {
      const row = page.locator(`.qcv-group[data-v138] [data-qcv="row"][data-qid="${id}"]`);
      await row.scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2);
      const b = await row.boundingBox(); if (!b) continue;
      await page.mouse.move(b.x + 300, b.y + 18);
      await row.locator('[data-qcv="peek-chain"]').waitFor({ timeout: 4000 }).catch(() => {});
      if (await row.locator('[data-qcv="peek-label"]').count()) opened += 1;
      const r = await row.evaluate((el) => ({
        name: el.dataset.name ?? "",
        titles: [
          ...[...el.querySelectorAll<HTMLElement>('[data-qcv="peek-stop"][title]')].map((m) => `marker: ${m.title}`),
          ...[...el.querySelectorAll<HTMLElement>('[data-qcv="peek-label"][title]')].filter((l) => !l.classList.contains("past") && !l.classList.contains("last")).map((l) => `name only: ${l.title}`),
        ],
      }));
      if (r.titles.length) found.push({ id: `${vp.width} ${id}`, ...r });
    }
  }
  mkdirSync("reports/qc-v138-4", { recursive: true });
  writeFileSync("reports/qc-v138-4/title-census.json", JSON.stringify({ peeksOpened: opened, fellBack: found }, null, 1));
  console.log("TITLES", found.length, "of", opened, "peeks");
  /* a census that opened nothing found nothing for the wrong reason */
  expect(opened).toBeGreaterThan(20);
});
