/**
 * §2 — Tracking's fixed skeleton, measured on the running page.
 *
 * ⚠️ THE CLAIM IS ABOUT SHAPE, WHICH IS THE ONE THING A SOURCE LOCK CANNOT SEE. "Two queries
 * produce two different card shapes" is a statement about what the browser lays out, and the unit
 * lock beside this one can only prove that the array holding the cells has two entries. Here the
 * run walks the list, groups the waiting queries by whether they have an expected date, and
 * compares the card's first two elements across the groups.
 *
 *   SA_E2E_BASE_URL=http://localhost:3000 npx playwright test --project=measure qcSkeleton
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§2 — with an expected date and without, the card starts the same", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 14);
  expect(n, "no queries in the list — nothing to measure").toBeGreaterThan(0);

  const seen: { q: number; cells: number; captions: string[]; values: string[]; firstTwo: string[]; today: number }[] = [];
  for (let q = 0; q < n; q++) {
    const row = rows.nth(q);
    await row.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await row.click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(140);
    seen.push({ q, ...(await page.evaluate(() => {
      const card = document.querySelector(".qp-cols > .f12-card") as HTMLElement | null;
      const body = card?.querySelector(".f12-quiet-scroll") as HTMLElement | null;
      const strip = document.querySelector(".qp-stats") as HTMLElement | null;
      const cells = [...(strip?.querySelectorAll(".qp-stat") ?? [])];
      return {
        cells: cells.length,
        captions: cells.map((c) => (c.querySelector(".qp-statc")?.textContent ?? c.textContent ?? "").trim().slice(-24)),
        values: cells.map((c) => (c.querySelector(".qp-statn")?.textContent ?? "").trim()),
        /* ⚠️ THE CARD'S FIRST TWO ELEMENTS, BY CLASS — the pack's own wording. Comparing rendered
           TEXT would differ per query for reasons that are not shape. */
        firstTwo: [...(body?.children ?? [])].slice(0, 2).map((e) => (e as HTMLElement).className || e.tagName.toLowerCase()),
        today: document.querySelectorAll(".tl-today").length,
      };
    })) });
  }

  for (const s of seen) console.log(`q${s.q}: ${s.cells} cells [${s.values.join(" | ")}] first2=[${s.firstTwo.join(", ")}] today=${s.today}`);

  /* the today marker is gone from every query, not merely from the ones without a window */
  for (const s of seen) expect(s.today, `q${s.q} still draws a today marker`).toBe(0);

  const withStrip = seen.filter((s) => s.cells > 0);
  expect(withStrip.length, "no query rendered the strip at all").toBeGreaterThan(0);
  const dated = withStrip.filter((s) => !s.values.includes("Not set"));
  const undated = withStrip.filter((s) => s.values.includes("Not set"));
  console.log(`with a figure for every cell: ${dated.length} · with at least one "Not set": ${undated.length}`);

  /* ⚠️ EVERY STRIP HAS THE SAME NUMBER OF CELLS — the whole claim, and it fails on the old code */
  for (const s of withStrip) expect(s.cells, `q${s.q} rendered ${s.cells} cells, not 2`).toBe(2);
  /* and the card opens on the same two elements whatever the record holds */
  const shapes = new Set(withStrip.map((s) => s.firstTwo.join("|")));
  expect([...shapes], `the card's first two elements differ between queries: ${[...shapes].join(" ⁄ ")}`).toHaveLength(1);
  if (!undated.length) console.log('⚠️ NO QUERY IN THIS ACCOUNT LACKS AN EXPECTED DATE — the "Not set" half is unexercised here');
});
