/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIN1 — MOVED ONTO THE NAVY HEADER (Query Centre v138.6, 16 Oct). The pinned rows these locks were written for (the
 * shell's PinnedRow, 15 Oct) are retired: on both pages (pinLib's PIN_PAGES) the navy list header is the sticky row,
 * in a wrapper padded down by the lip's cover. At 1512 × 900 and 1280 × 800 with the shell, scrolled 1500px.
 *
 * P1 the header's controls centred in the header · P2 nothing covers the header · P3 one construction (the sticky
 * wrapper) on both pages · P4 the headings directly under it, and still while scrolling.
 *
 * ⚠️ P1 IS THE HEADER'S OWN LAYOUT NOW: the cover no longer reaches into it (P2), so "centred on what a reader can see"
 *    and "centred in the header" are the same claim.
 * ⚠️ P2 FINDS COVERS BY PAINT (pinLib's `paintCovers`): the lip is `pointer-events: none`, invisible to hit-testing.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { PIN_PAGES, scrollPage, paintCovers } from "./pinLib";

const DIR = "reports/pin-row";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const MUT = process.env.PIN_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  P1: { css: `.qc138-sheet .qc138-top, .cl16-list .cl18-lh { align-items: flex-start !important; }` },
  P2: { css: `.qc138-sheet .qc138-topw, .cl16-list .cl18-lhw { padding-top: 0 !important; margin-top: 0 !important; }` },
  P3: { css: `.cl16-list .cl18-lhw { position: static !important; } .cl16-list .cl18-lh { position: sticky; top: 12px; }` },
  P4: { css: `.qcv-group[data-v138] { --qc138-pin-h: 80px !important; } .clv-group { --cl17-pin-h: 80px !important; }` },
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
async function openPinned(page: Page, vp: { width: number; height: number }, p: (typeof PIN_PAGES)[number], lock: string) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); for (const k of ["sa.pinList.queries", "sa.pinList.agents"]) localStorage.removeItem(k); } catch { /* */ } });
  await openRoute(page, p.route, vp);
  await page.locator(p.group).first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (m?.js) await page.evaluate(m.js);
  await scrollPage(page, p.group, 1500);
  await expect(page.locator(p.row).first()).toBeVisible({ timeout: 5000 });
}
test.describe("Pinned rows (moved onto the navy header)", () => {
  test("P1 · the navy header's controls are vertically centred in it", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P1");
    for (const vp of SIZES) for (const p of PIN_PAGES) {
      await openPinned(page, vp, p, "P1");
      const r = await page.evaluate((s) => {
        const h = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0)!;
        const b = h.getBoundingClientRect(), c = (b.top + b.bottom) / 2;
        /* the header's own controls: the search field, the Filters button, the density group and the pin (the title's
           grouping button sits in a line of text, judged by that line, so controls inside the sentence are left out) */
        const kids = [...h.querySelectorAll<HTMLElement>("label, button, [role='group']")]
          .filter((e) => e.getBoundingClientRect().height > 0 && !e.closest("p") && !e.closest("[data-pin-tip]") && e.parentElement?.closest("button, [role='group']") == null);
        return kids.map((e) => { const r = e.getBoundingClientRect(); return { cls: (e.className || e.tagName).toString().split(" ")[0], d: (r.top + r.bottom) / 2 - c }; });
      }, p.row);
      const w = `${vp.width} ${p.key}`;
      L.check("P1", `${w} controls found`, r.length >= 4, `${r.length}`);
      for (const k of r) L.check("P1", `${w} ${k.cls}`, near(k.d, 0, 1.5), `${k.d.toFixed(2)}px from the header's centre`);
    }
    L.done(20);
  });

  test("P2 · nothing covers the navy header", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P2");
    for (const vp of SIZES) for (const p of PIN_PAGES) {
      await openPinned(page, vp, p, "P2");
      const covers = await paintCovers(page, p.row);
      const cover = Math.max(0, ...covers.map((c) => c.coverPx));
      L.check("P2", `${vp.width} ${p.key} nothing painted over its top`, cover === 0, `${cover}px (${covers.map((c) => c.sel).join(", ")})`);
    }
    L.done(4);
  });

  test("P3 · one construction: both sticky rows are the padded wrapper, and the header inside it does not move itself", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P3");
    for (const vp of SIZES) for (const p of PIN_PAGES) {
      await openPinned(page, vp, p, "P3");
      const r = await page.evaluate(([ws, hs]) => {
        const w = [...document.querySelectorAll<HTMLElement>(ws as string)].find((e) => e.getBoundingClientRect().height > 0);
        const h = [...document.querySelectorAll<HTMLElement>(hs as string)].find((e) => e.getBoundingClientRect().height > 0);
        if (!w || !h) return null;
        const cw = getComputedStyle(w), ch = getComputedStyle(h);
        return { wPos: cw.position, wTop: cw.top, wPad: cw.paddingTop, hPos: ch.position, cover: getComputedStyle(document.querySelector(".ws-window")!).getPropertyValue("--pin-cover").trim() };
      }, [p.wrap, p.row] as const);
      const w = `${vp.width} ${p.key}`;
      L.check("P3", `${w} found`, !!r, JSON.stringify(r));
      if (!r) continue;
      L.check("P3", `${w} the wrapper sticks at the top, padded by the cover`, r.wPos === "sticky" && r.wTop === "0px" && near(parseFloat(r.wPad), parseFloat(r.cover || "12"), 0.5), JSON.stringify(r));
      L.check("P3", `${w} the header itself is not sticky`, r.hPos !== "sticky" && r.hPos !== "fixed", r.hPos);
    }
    L.done(12);
  });

  test("P4 · headings: directly under the header, and still while scrolling", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P4");
    for (const vp of SIZES) for (const p of PIN_PAGES) {
      await openPinned(page, vp, p, "P4");
      const w = `${vp.width} ${p.key}`;
      const tops: number[] = [];
      for (const y of [1500, 1530, 1560, 1600, 1680]) {
        await scrollPage(page, p.group, y);
        const r = await page.evaluate(([rs, hs]) => {
          const row = [...document.querySelectorAll<HTMLElement>(rs as string)].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
          const h = [...document.querySelectorAll<HTMLElement>(hs as string)].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
          return { rowB: row.bottom, headT: h.top };
        }, [p.row, p.heads] as const);
        L.check("P4", `${w} @${y} headings at the header's bottom`, near(r.headT, r.rowB, 1), `${r.headT.toFixed(1)} vs ${r.rowB.toFixed(1)}`);
        tops.push(r.headT);
      }
      L.check("P4", `${w} headings still while scrolling`, Math.max(...tops) - Math.min(...tops) <= 0.5, tops.map((t) => t.toFixed(1)).join(","));
    }
    L.done(24);
  });
});
