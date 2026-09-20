import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { openQueryById, openTab } from "./openQuery";
test("every open query's send rung: is the method inline?", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  /* ⚠️ THE LIST'S ROWS, NOT THE RETIRED CARD GRID. `.qcc` / `[data-qcc-id]` were the card grid v11
     replaced; both still exist in `src` on components mounted nowhere, so the selector resolves in
     source and never on the page — this swept zero queries and waited 30s to say so. */
  await expect(page.locator('.qcv-page [data-qcv="row"]').first()).toBeVisible({ timeout: 30_000 });
  const ids = await page.evaluate(() => {
    const pg = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...pg.querySelectorAll('[data-qcv="row"]')].map((e) => e.getAttribute("data-id")!).slice(0, 30);
  });
  expect(ids.length, "the sweep found no rows — it would pass having measured nothing").toBeGreaterThan(3);
  const bad: unknown[] = []; let swept = 0; const seen = new Set<string>();
  for (const id of ids) {
    const host = await openQueryById(page, id);
    await openTab(page, host, "Tracking");
    await page.locator(`${host.root} .tl-r1`).first().waitFor({ timeout: 15_000 }).catch(() => {});
    const r = await page.evaluate((rootSel) => {
      const qpn = [...document.querySelectorAll<HTMLElement>(rootSel)].find((e) => e.getBoundingClientRect().height > 0)!;
      const rows = [...qpn.querySelectorAll<HTMLElement>(".tl-r1")];
      return rows.map((row) => {
        const t = row.querySelector<HTMLElement>(".tl-ttl");
        const q = row.querySelector<HTMLElement>(".tl-qual");
        if (!t || !q) return null;
        const tr = t.getBoundingClientRect(), qr = q.getBoundingClientRect();
        return { title: (t.textContent ?? "").trim(), qual: (q.textContent ?? "").trim().slice(0, 24),
                 inline: qr.top < tr.bottom && qr.left >= tr.right - 1,
                 qualDisplay: getComputedStyle(q).display, rowWrap: getComputedStyle(row).flexWrap,
                 dTop: +(qr.top - tr.top).toFixed(1) };
      }).filter(Boolean);
    }, host.root);
    swept++;
    for (const row of r as { title: string; qual: string; inline: boolean; qualDisplay: string; dTop: number }[]) {
      seen.add(`${row.qualDisplay}`);
      if (!row.inline) bad.push({ id, ...row });
    }
    await page.keyboard.press("Escape");
  }
  console.log(`SWEPT ${swept} queries · qual displays seen: ${[...seen].join(",")} · NOT-INLINE: ${JSON.stringify(bad)}`);
});
