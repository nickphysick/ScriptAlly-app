/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149.2 — the QC1492 locks: the capped page column (L1), the inner blocks inside it (L2), and the panel
 * overlaying the list again (L3). Each proves its population first, and each was red first (the v149.1 build, or its
 * named mutation: QC1492_MUTATE=L1|L2|L2W|L3, each applied in the page; see the report).
 *
 * S is the sheet's width (`.ws-window`). The list is min(S − 64, 1136) + (S ≥ 1500 ? 80 : 0), centred in the sheet;
 * the header card, banner and view row are the list less the inset each side: 24 while S is under 1100, else 32 (the
 * v149.2 ruling: the mock's table, 32 at a 1440 window). L2W is the old window rule restored, which must fail at 1440.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openQc } from "./nb1Lib";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);
const DIR = "reports/qc-v149-2";
const MUT = process.env.QC1492_MUTATE ?? "";
const BASE = process.env.QC1492_BASE === "1";
const ONLY = process.env.QC1492_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }];

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
type R = { l: number; r: number; w: number };
const boxes = (page: Page) => page.evaluate(() => {
  const b = (s: string) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().width > 0); if (!e) return null; const k = e.getBoundingClientRect(); return { l: k.left, r: k.right, w: k.width }; };
  return { sheet: b(".ws-window"), list: b(".qcv-group[data-v138] .qc138-sheet"), card: b(".qc149-card"), ban: b(".qc149-ban"), vr: b(".qc149-vr"), panel: b("[data-qp='panel']") };
});
const near = (a: number, b: number, t = 1) => Math.abs(a - b) <= t;
const mutate = async (page: Page) => {
  if (MUT === "L1") await page.addStyleTag({ content: ".qcv-group { --qc149-col: calc(var(--hsheet-w) - 64px) !important; }" });
  if (MUT === "L2") await page.addStyleTag({ content: ".qcv-group { --qc149-w: var(--qc149-list) !important; }" });
  /* the superseded rule: 24 whenever the WINDOW is 1440 or narrower */
  if (MUT === "L2W") await page.addStyleTag({ content: "@media (min-width: 768px) and (max-width: 1440px) { .qcv-group { --qc149-in: 24px !important; } }" });
  /* B6 restored: above a 1440 window the open panel narrows the list by its own width */
  if (MUT === "L3") await page.addStyleTag({ content: "@media (min-width: 1441px) { body:has([data-qp='panel']) .qcv-group[data-v138] .qc138-sheet.qc138-sheet { margin-right: 560px !important; } }" });
  await page.waitForTimeout(200);
};

test("L1 · the list is min(S − 64, 1136), plus 80 from a 1500 sheet, centred in the sheet", async ({ page }) => {
  test.skip(!run("L1"));
  const L = new Ledger("L1");
  for (const vp of SIZES) {
    await openQc(page, vp); await mutate(page);
    const b = await boxes(page);
    const at = `${vp.width}×${vp.height}`;
    L.check(`${at} population: the sheet and the list`, !!b.sheet && !!b.list, JSON.stringify(b));
    if (!b.sheet || !b.list) continue;
    const S = b.sheet.w;
    const want = Math.min(S - 64, 1136) + (S >= 1500 ? 80 : 0);
    L.check(`${at} width = min(S − 64, 1136) + ${S >= 1500 ? 80 : 0} (S ${S.toFixed(0)})`, near(b.list.w, want), `${b.list.w.toFixed(1)} vs ${want}`);
    L.check(`${at} centred in the sheet`, near((b.list.l + b.list.r) / 2, (b.sheet.l + b.sheet.r) / 2), `${((b.list.l + b.list.r) / 2).toFixed(1)} vs ${((b.sheet.l + b.sheet.r) / 2).toFixed(1)}`);
    if (vp.width === 2560) L.check("2560: 1216 wide, not the sheet's width", near(b.list.w, 1216), b.list.w.toFixed(1));
  }
  L.done(16);
});

test("L2 · the header card, banner and view row share edges, inside the list by the inset", async ({ page }) => {
  test.skip(!run("L2"));
  const L = new Ledger("L2");
  for (const vp of SIZES) {
    await openQc(page, vp); await mutate(page);
    const b = await boxes(page);
    const at = `${vp.width}×${vp.height}`;
    L.check(`${at} population: sheet, list, card, banner, view row`, !!b.sheet && !!b.list && !!b.card && !!b.ban && !!b.vr, JSON.stringify(b));
    if (!b.list || !b.card || !b.ban || !b.vr || !b.sheet) continue;
    const inset = b.sheet.w < 1100 ? 24 : 32;
    const all = [b.card, b.ban, b.vr] as R[];
    L.check(`${at} the three share left and right edges`, all.every((x) => near(x.l, b.card!.l) && near(x.r, b.card!.r)), all.map((x) => `${x.l.toFixed(1)}–${x.r.toFixed(1)}`).join(" · "));
    L.check(`${at} each sits inside the list by ${inset} (S ${b.sheet.w.toFixed(0)})`, all.every((x) => near(x.l - b.list!.l, inset) && near(b.list!.r - x.r, inset)), `left ${(b.card.l - b.list.l).toFixed(1)} · right ${(b.list.r - b.card.r).toFixed(1)}`);
  }
  L.done(15);
});

test("L3 · the panel overlays the list: its edges don't move; the panel lies over it; the scrim shows during an action", async ({ page }) => {
  test.skip(!run("L3"));
  const L = new Ledger("L3");
  for (const vp of SIZES.filter((v) => [1440, 1512, 1920].includes(v.width))) {
    await openQc(page, vp); await mutate(page);
    const at = `${vp.width}×${vp.height}`;
    const closed = await boxes(page);
    const id = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='row']")].find((r) => r.getBoundingClientRect().height > 0 && r.dataset.court !== "closed" && !r.closest("[data-qc139='practice']"))?.dataset.id ?? null);
    L.check(`${at} population: a live row`, !!id && !!closed.list, String(id));
    if (!id || !closed.list) continue;
    await page.locator(`.qc138-sheet [data-qcv='row'][data-id="${id}"] [data-qcv='row-name']`).first().click();
    await page.waitForTimeout(1500);
    const open = await boxes(page);
    L.check(`${at} the panel is open`, !!open.panel, JSON.stringify(open.panel));
    L.check(`${at} the list's edges are identical, panel closed and open`, !!open.list && near(open.list.l, closed.list.l) && near(open.list.r, closed.list.r), `${closed.list.l.toFixed(1)}–${closed.list.r.toFixed(1)} → ${open.list?.l.toFixed(1)}–${open.list?.r.toFixed(1)}`);
    L.check(`${at} the panel's left edge is left of the list's right edge (it overlays)`, !!open.panel && !!open.list && open.panel.l < open.list.r, `${open.panel?.l.toFixed(1)} vs ${open.list?.r.toFixed(1)}`);
    /* an action in the panel: the scrim shows, and the list still has not moved */
    await page.locator("[data-qp='panel'] [data-qc149c='strip-btn']").first().click().catch(() => {});
    await page.waitForTimeout(1200);
    const act = await page.evaluate(() => { const s = document.querySelector<HTMLElement>("[data-side-scrim]"); return { on: s?.dataset.on === "true", op: s ? getComputedStyle(s).opacity : null }; });
    const during = await boxes(page);
    L.check(`${at} during an action the scrim is visible`, act.on && act.op === "1", JSON.stringify(act));
    L.check(`${at} …and the list still has not moved`, !!during.list && near(during.list.l, closed.list.l) && near(during.list.r, closed.list.r), `${during.list?.l.toFixed(1)}–${during.list?.r.toFixed(1)}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  }
  L.done(18);
});
