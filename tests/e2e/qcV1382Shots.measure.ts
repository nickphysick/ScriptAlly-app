/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.2 — the report's screenshots (reports/qc-v138-2/shots), named beside each
 * design-refs/query-centre-v138-2/screens/* file, plus a closed row and a no-date row, and a census of rows whose
 * summary had to truncate (`data-tight`) at each width. Writes images and the census; asserts only that it saw rows.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/qc-v138-2/shots";
const init = () => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); sessionStorage.setItem("sa.qc138.folded", "[]"); } catch { /* */ } };

async function idOf(page: Page, tone: "over" | "wait" | "closed" | "nodate"): Promise<string | null> {
  return page.evaluate((tn) => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const rows = [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getBoundingClientRect().height > 0);
    return rows.find((r) => {
      if (tn === "closed") return r.dataset.court === "closed";
      if (r.dataset.court === "closed") return false;
      if (tn === "nodate") return r.dataset.due == null;
      if (r.dataset.due == null) return false;
      const d = new Date(Number(r.dataset.due)); d.setHours(0, 0, 0, 0);
      /* waiting: the agent's court, not yet due (your move not yet due takes the same tint, but is not the case shown) */
      return tn === "over" ? d.getTime() < t0.getTime() : d.getTime() >= t0.getTime() && r.dataset.court === "agent";
    })?.dataset.qid ?? null;
  }, tone);
}
async function peekShot(page: Page, id: string, path: string) {
  const row = page.locator(`.qcv-group[data-v138] [data-qcv="row"][data-qid="${id}"]`);
  await row.scrollIntoViewIfNeeded();
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
  await page.screenshot({ path });
}

test("shots", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.addInitScript(init);
  const tight: Record<string, { id: string; name: string; head: string; line: string }[]> = {};
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    const w = vp.width;
    await openRoute(page, "/queries", vp);
    await page.locator('.qcv-group[data-v138] [data-qcv="row"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    for (const [name, tone] of [["01-peek-overdue", "over"], ["02-peek-waiting", "wait"], ["04-peek-closed", "closed"], ["05-peek-nodate", "nodate"]] as const) {
      const id = await idOf(page, tone);
      if (id) await peekShot(page, id, `${OUT}/${name}-${w}.png`);
    }
    /* the census: every row's summary, opened in turn */
    const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getBoundingClientRect().height > 0).map((r) => r.dataset.qid!));
    expect(ids.length).toBeGreaterThan(10);
    tight[w] = [];
    for (const id of ids) {
      const row = page.locator(`.qcv-group[data-v138] [data-qcv="row"][data-qid="${id}"]`);
      await row.scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2);
      const b = await row.boundingBox(); if (!b) continue;
      await page.mouse.move(b.x + 300, b.y + 18);
      await row.locator('[data-qcv="peek-summary"] .qc138-sumc').waitFor({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(120);
      const r = await row.evaluate((el) => {
        const c = el.querySelector<HTMLElement>(".qc138-sumc");
        return c ? { tight: c.hasAttribute("data-tight"), name: el.dataset.name ?? "", head: c.querySelector("[data-qcv='peek-sum-head']")?.textContent ?? "", line: c.querySelector("[data-qcv='peek-sum-line']")?.textContent ?? "" } : null;
      });
      if (r?.tight) tight[w].push({ id, name: r.name, head: r.head, line: r.line });
    }
  }
  mkdirSync("reports/qc-v138-2", { recursive: true });
  writeFileSync("reports/qc-v138-2/summary-census.json", JSON.stringify(tight, null, 1));
  console.log("TIGHT", JSON.stringify(Object.fromEntries(Object.entries(tight).map(([k, v]) => [k, v.length]))));
});
