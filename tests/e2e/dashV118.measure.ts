/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v118.1 — the DB118 locks, at 1440×900 and 1280×650. Named breaks: `DB118_MUTATE=<name>` (db118Lib).
 */
import { test, type Page } from "@playwright/test";
import { Ledger, MUT, openDash, slicePoint, stackPlacement, tag } from "./db118Lib";

test.describe.configure({ mode: "serial" });
test.setTimeout(480_000);
const VPS = [{ width: 1440, height: 900 }, { width: 1280, height: 650 }];

/** the pointer's own position for one hover: a key row at three points across it, or a slice at three points along it */
type Target = { card: "closed-hoop" | "agents-hoop"; type: "row" | "slice"; key: string; frac: number };

const rowPoint = (page: Page, card: string, key: string, frac: number) => page.evaluate(([c, k, f]) => {
  const row = document.querySelector<HTMLElement>(`[data-d60="${c}"] [data-d116="key-row"][data-key="${k}"]`);
  if (!row) return null;
  const r = row.getBoundingClientRect();
  return { x: r.left + 4 + (r.width - 8) * f, y: r.top + r.height / 2 };
}, [card, key, frac] as const);

/** the biggest non-zero segment of a hoop, and its key rows that have any */
const segsOf = (page: Page, card: string) => page.evaluate((c) => [...document.querySelectorAll<SVGCircleElement>(`[data-d60="${c}"] [data-d116="slice"]`)]
  .map((h) => ({ key: h.dataset.seg ?? "", len: parseFloat(String(h.getAttribute("stroke-dasharray")).split(/[\s,]+/)[0]) }))
  .sort((a, b) => b.len - a.len), card);

test("DB118-A1 · every stack opens at the pointer", async ({ page }) => {
  const L = new Ledger("A1");
  let placements = 0;
  for (const vp of VPS) {
    await openDash(page, vp);
    const where = tag(vp);
    for (const card of ["closed-hoop", "agents-hoop"] as const) {
      const segs = await segsOf(page, card);
      L.check("A1", `${where} ${card}: population, slices`, segs.length > 0, JSON.stringify(segs));
      if (!segs.length) continue;
      const big = segs[0].key;
      const targets: Target[] = [
        ...[0.15, 0.5, 0.85].map((frac, i) => ({ card, type: "row" as const, key: segs[i % segs.length].key, frac })),
        /* along the biggest slice, the last at its far edge */
        ...[0.2, 0.5, 0.97].map((frac) => ({ card, type: "slice" as const, key: big, frac })),
      ];
      for (const t of targets) {
        await page.mouse.move(2, 2);
        await page.waitForTimeout(200);
        const p = t.type === "row" ? await rowPoint(page, t.card, t.key, t.frac) : await slicePoint(page, t.card, t.key, t.frac);
        const label = `${where} ${t.card} ${t.type} ${t.key} @${t.frac}`;
        if (!p) { L.check("A1", `${label}: population`, false, "no target"); continue; }
        if (t.type === "slice") L.check("A1", `${label}: the slice holds the pointer there`, (p as unknown as { hitIsSlice: boolean }).hitIsSlice, JSON.stringify(p));
        /* arrive from a step away, as a hand does, then settle */
        await page.mouse.move(p.x - 6, p.y + 3);
        await page.mouse.move(p.x, p.y, { steps: 3 });
        await page.waitForTimeout(450);
        const s = await stackPlacement(page);
        if (!s) { L.check("A1", `${label}: a stack shows`, false, "none"); continue; }
        placements++;
        L.check("A1", `${label}: anchored 18 right of and 14 above the pointer`, Math.abs(s.ax - (p.x + 18)) <= 2 && Math.abs(s.ay - (p.y - 14)) <= 2, `anchor ${s.ax},${s.ay} · pointer ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        /* the shift is exactly the overflow of the unshifted stack past the 12px margin */
        const raw = { l: s.u.l - s.dx, t: s.u.t - s.dy, r: s.u.r - s.dx, b: s.u.b - s.dy };
        const wx = raw.r > s.vw - 12 ? -(raw.r - (s.vw - 12)) : raw.l < 12 ? 12 - raw.l : 0;
        const wy = raw.b > s.vh - 12 ? -(raw.b - (s.vh - 12)) : raw.t < 12 ? 12 - raw.t : 0;
        L.check("A1", `${label}: shifted only by the on-screen rule`, Math.abs(s.dx - wx) <= 1.5 && Math.abs(s.dy - wy) <= 1.5, `shift ${s.dx},${s.dy} · overflow ${wx.toFixed(1)},${wy.toFixed(1)}`);
        L.check("A1", `${label}: inside the window, 12 to spare`, s.u.l >= 11.5 && s.u.t >= 11.5 && s.u.r <= s.vw - 11.5 && s.u.b <= s.vh - 11.5, JSON.stringify(s.u));
        /* a move inside the target re-places it */
        await page.mouse.move(p.x + (t.type === "row" ? 10 : 0), p.y + (t.type === "row" ? 0 : 0.5), { steps: 2 });
        await page.waitForTimeout(150);
        const s2 = await stackPlacement(page);
        if (t.type === "row") L.check("A1", `${label}: re-placed on a move`, !!s2 && Math.abs(s2.ax - (p.x + 28)) <= 2, `${s2?.ax} vs ${(p.x + 28).toFixed(1)}`);
      }
      /* slice to slice and row to row swap in place: no frame without a stack */
      if (segs.length > 1) {
        const a = await rowPoint(page, card, segs[0].key, 0.5), b = await rowPoint(page, card, segs[1].key, 0.5);
        if (a && b) {
          await page.mouse.move(a.x, a.y); await page.waitForTimeout(400);
          await page.evaluate(() => { const w = window as unknown as { __gap: number; __obs: MutationObserver }; w.__gap = 0; const tick = () => { if (!document.querySelector('[data-d116="stack"].is-on')) w.__gap++; if ((window as unknown as { __run: boolean }).__run) requestAnimationFrame(tick); }; (window as unknown as { __run: boolean }).__run = true; requestAnimationFrame(tick); });
          await page.mouse.move(b.x, b.y, { steps: 6 });
          await page.waitForTimeout(400);
          const gap = await page.evaluate(() => { (window as unknown as { __run: boolean }).__run = false; return (window as unknown as { __gap: number }).__gap; });
          L.check("A1", `${where} ${card}: row to row swaps without a gap`, gap === 0, `${gap} frames without a stack`);
        }
      }
    }
  }
  L.check("A1", "twelve or more placements measured", placements >= 12, String(placements));
  L.done(40);
});
