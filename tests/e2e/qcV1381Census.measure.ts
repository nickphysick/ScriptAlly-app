/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.1 — a census for the report: every row's peek is opened in turn (Closed unfolded) and any
 * whose events fold into a "+n more" stop is recorded. Asserts only that it saw rows.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test("peek census", async ({ page }) => {
  test.setTimeout(900_000);
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); sessionStorage.setItem("sa.qc138.folded", "[]"); } catch { /* */ } });
  await openRoute(page, "/queries", { width: 1512, height: 900 });
  const rows = page.locator('.qcv-group[data-v138] [data-qcv="row"]');
  await rows.first().waitFor();
  const n = await rows.count();
  const out: { id: string; name: string; stops: number; more: string | null }[] = [];
  for (let i = 0; i < n; i += 1) {
    const r = rows.nth(i);
    await r.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await r.hover({ position: { x: 300, y: 18 } });
    await r.locator('[data-qcv="peek-chain"]').waitFor({ timeout: 4000 }).catch(() => {});
    out.push(await r.evaluate((el) => ({
      id: el.dataset.qid ?? "", name: el.dataset.name ?? "",
      stops: el.querySelectorAll('[data-qcv="peek-stop"]').length,
      more: el.querySelector('[data-kind="more"] [data-qcv="peek-name"]')?.textContent ?? null,
    })));
  }
  mkdirSync("reports/qc-v138-1", { recursive: true });
  writeFileSync("reports/qc-v138-1/peek-census.json", JSON.stringify({ rows: out.length, more: out.filter((x) => x.more), empty: out.filter((x) => x.stops === 0) }, null, 1));
  console.log("CENSUS", out.length, "more:", out.filter((x) => x.more).length, "empty:", out.filter((x) => x.stops === 0).length);
  expect(out.length).toBeGreaterThan(10);
});
