/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE LIST COLUMN AND FILTERS (Part E, Part 3) ══════════════════════════════════════════════
 *
 *   node tests/e2e/seedBookVersions.mjs 3
 *   node tests/e2e/seedQueryVersions.mjs
 *   node tests/e2e/seedPartE4.mjs
 *
 * ⚠️ THE CENSUS IS AT SCOPE ALL, AND IT REPORTS ITS COUNT. The list is manuscript-scoped: a default
 * sweep sees `seed-ms-1`'s 34 queries and silently omits the other 12, which is exactly where a
 * stale render survives. The fixture holds three manuscripts — 3 versions, 1 version, 0 versions —
 * so scope All is the only setting that exercises the gate's open AND closed sides in one pass.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/** Widen to every manuscript, and PROVE the control existed — a guarded click is a silent no-op. */
async function scopeAll(page: import("@playwright/test").Page) {
  const filters = page.getByRole("button", { name: /filter/i }).first();
  await expect(filters, "no Filters control — the census cannot be widened").toBeVisible({ timeout: 20_000 });
  await filters.click();
  await page.waitForTimeout(400);
  const all = page.getByRole("button", { name: /^all manuscripts$/i }).first();
  await expect(all, "no 'All manuscripts' option — scope was never widened").toBeVisible({ timeout: 10_000 });
  await all.click();
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
}

const readList = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const rows = [...document.querySelectorAll('[id^="query-row-"]')];
    return {
      rendered: rows.length,
      withChip: rows.filter((r) => r.querySelector(".f12-ver")).length,
      chips: [...new Set(rows.map((r) => (r.querySelector(".f12-ver") as HTMLElement | null)?.innerText.replace(/\s+/g, " ").trim()).filter(Boolean))],
      /* ⚠️ D10 — nothing, not a dash. Any row showing a placeholder where a version is unknown. */
      dashes: rows.filter((r) => {
        const t = (r.querySelector(".f12-mid") as HTMLElement | null)?.innerText ?? "";
        return /(^|\s)[—–-](\s|$)/.test(t.split("\n").slice(2).join(" "));
      }).length,
      footer: (document.querySelector(".f12-foot, [class*=foot]") as HTMLElement | null)?.innerText?.replace(/\s+/g, " ").trim() ?? null,
    };
  });

test("the version column, censused at scope All", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1200 });
  await page.waitForTimeout(1200);
  await scopeAll(page);
  const r = await readList(page);
  console.log("CENSUS " + JSON.stringify(r, null, 2));

  /**
   * ⚠️ THE STORED COUNT IS THE FLOOR, NOT A NUMBER I TYPED. 46 across three manuscripts —
   * `seed-ms-1` 34, `seed-ms-2` 2, `thin-ms` 10. A sweep that reported 34 would look complete.
   */
  expect(r.rendered, `swept ${r.rendered} rows — a manuscript-scoped sweep sees 34`).toBeGreaterThanOrEqual(40);

  /* the gate's OPEN side: seed-ms-1 has three versions, so some rows carry a chip */
  expect(r.withChip, "no row carries a version chip at scope All").toBeGreaterThan(0);
  /* and its CLOSED side: seed-ms-2 (1 version) and thin-ms (0) contribute none */
  expect(r.withChip, "every row carries a chip — the one-version books are not gated").toBeLessThan(r.rendered);

  /* ⚠️ D10 — where neither version is known the cell shows NOTHING, never a dash pretending to be
     data. Asserted over the rows that have no chip, which is the population it is about. */
  expect(r.dashes, `${r.dashes} rows draw a placeholder where no version is known`).toBe(0);

  console.log(`  swept ${r.rendered} rows · ${r.withChip} carry a version · chips: ${r.chips.join(" | ")}`);
});
