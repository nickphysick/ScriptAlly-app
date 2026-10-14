/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.3 — the report's screenshots (reports/qc-v138-3/shots), named beside each
 * design-refs/query-centre-v138-3/screens/* file, plus a closed row and an offer row open at both widths, the lab's
 * four reference cases, and a census of events whose stage could not be mapped to a glyph. Asserts only that it saw rows.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { refCases } from "./qc1383Cases";

const OUT = "reports/qc-v138-3/shots";
const init = () => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); sessionStorage.setItem("sa.qc138.folded", "[]"); } catch { /* */ } };

async function idOf(page: Page, tone: "over" | "wait" | "closed" | "offer"): Promise<string | null> {
  return page.evaluate((tn) => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const rows = [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getBoundingClientRect().height > 0);
    return rows.find((r) => {
      if (tn === "closed") return r.dataset.court === "closed";
      if (tn === "offer") return r.dataset.status === "Offer";
      if (r.dataset.court === "closed" || r.dataset.due == null) return false;
      const d = new Date(Number(r.dataset.due)); d.setHours(0, 0, 0, 0);
      return tn === "over" ? d.getTime() < t0.getTime() : d.getTime() >= t0.getTime() && r.dataset.court === "agent";
    })?.dataset.qid ?? null;
  }, tone);
}
async function openPeek(page: Page, id: string) {
  const row = page.locator(`.qcv-group[data-v138] [data-qcv="row"][data-qid="${id}"]`);
  await page.evaluate((qid) => {
    const r = document.querySelector<HTMLElement>(`.qcv-group[data-v138] [data-qcv="row"][data-qid="${qid}"]`)!;
    (r.closest<HTMLElement>(".wpg-scroll")!).style.scrollBehavior = "auto";
    r.scrollIntoView({ block: "center" });
  }, id);
  await page.waitForTimeout(400);
  await page.mouse.move(2, 2); await page.waitForTimeout(200);
  const b = (await row.boundingBox())!;
  await page.mouse.move(b.x + 300, b.y + 18);
  await page.waitForTimeout(1500);
  return row;
}

test("shots", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.addInitScript(init);
  const unmapped: Record<string, { id: string; name: string; events: string[] }> = {};
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    const w = vp.width;
    await openRoute(page, "/queries", vp);
    await page.locator('.qcv-group[data-v138] [data-qcv="row"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    /* 01 · the bands, at the top of the list */
    await page.evaluate(() => { const b = document.querySelector<HTMLElement>('.qcv-group[data-v138] .qc138-band'); b?.scrollIntoView({ block: "center" }); });
    await page.mouse.move(2, 2); await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/01-bands-${w}.png` });
    for (const [name, tone] of [["02-open-overdue", "over"], ["04-open-waiting", "wait"], ["05-open-closed", "closed"], ["06-open-offer", "offer"]] as const) {
      const id = await idOf(page, tone);
      if (id) { await openPeek(page, id); await page.screenshot({ path: `${OUT}/${name}-${w}.png` }); }
    }
    /* the census: every row's peek, opened in turn */
    if (w === 1512) {
      const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getBoundingClientRect().height > 0).map((r) => r.dataset.qid!));
      expect(ids.length).toBeGreaterThan(10);
      for (const id of ids) {
        const row = page.locator(`.qcv-group[data-v138] [data-qcv="row"][data-qid="${id}"]`);
        await row.scrollIntoViewIfNeeded();
        await page.mouse.move(2, 2);
        const b = await row.boundingBox(); if (!b) continue;
        await page.mouse.move(b.x + 300, b.y + 18);
        await row.locator('[data-qcv="peek-chain"]').waitFor({ timeout: 4000 }).catch(() => {});
        const r = await row.evaluate((el) => ({ name: el.dataset.name ?? "", bad: [...el.querySelectorAll<HTMLElement>('[data-qcv="peek-stop"][data-unmapped]')].map((s) => s.querySelector('[data-qcv="peek-name"]')?.textContent ?? "") }));
        if (r.bad.length) unmapped[id] = { id, name: r.name, events: r.bad };
      }
    }
  }
  mkdirSync("reports/qc-v138-3", { recursive: true });
  writeFileSync("reports/qc-v138-3/glyph-census.json", JSON.stringify(Object.values(unmapped), null, 1));
  console.log("UNMAPPED", Object.keys(unmapped).length);
});

test("lab: the four reference cases", async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });
  await page.addInitScript(init);
  await page.addInitScript((c) => { (window as unknown as { __SA_QC138_PEEK_LAB: unknown }).__SA_QC138_PEEK_LAB = c; }, refCases());
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    await openRoute(page, "/queries", vp);
    const lab = page.locator('[data-qc138="peek-lab"]').filter({ visible: true }).first();
    await lab.waitFor({ timeout: 30_000 });
    await page.waitForTimeout(900);
    await lab.screenshot({ path: `${OUT}/03-lab-cases-${vp.width}.png` });
  }
});
