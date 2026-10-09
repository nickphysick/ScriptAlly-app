/**
 * Query Centre v133 — the open header (design-refs/query-centre/query-centre-v133.html). QC133 H1–H7,
 * each on the rendered page at 1512 × 900 and 1280 × 800, each red first under its named mutation
 * (reports/qc-v133/mutation-proofs.json).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV133
 */
import { test, expect, Page } from "@playwright/test";
import { inkOpen } from "./inkLib";

const SIZES = [[1512, 900], [1280, 800]] as const;
const wide = (w: number) => w >= 1440;
const SUB = "Send, track, and chase them from this page.";
const HD = '[data-qcv="open-header"]';

async function openQc(page: Page, w: number, h: number) {
  await inkOpen(page, "/queries", w, { height: h, scope: "qc133" });
  await expect(page.locator(`${HD}:not([data-loading])`), `${w}: the open header, loaded`).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-qcv="court"]').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(500);
}
/** the header's boxes, the top bar's bottom and the desk's top — one ruler for both pages */
const readQc = (page: Page) => page.evaluate((HD) => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const R = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom, cy: r.top + r.height / 2 }; };
  const hd = vis(HD), title = hd?.querySelector<HTMLElement>("h1") ?? null, art = hd?.querySelector<HTMLElement>('[data-qcv="oh-art"]') ?? null;
  const cs = title ? getComputedStyle(title) : null;
  /* every ancestor of the title up to (not including) the page sheet: a ground or a radius is a card */
  const boxed: string[] = [];
  for (let e = title?.parentElement ?? null; e && !e.matches(".ws-window, .ws-main"); e = e.parentElement) {
    const s = getComputedStyle(e);
    if (e.matches(".wpg-scroll, .wpg, .wpg-row, [class*='wpg']")) continue;
    if ((s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent") || s.backgroundImage !== "none" || parseFloat(s.borderTopLeftRadius) > 0) boxed.push(`${e.className}: ${s.backgroundColor} ${s.backgroundImage.slice(0, 30)} r${s.borderTopLeftRadius}`);
  }
  const bar = vis(".ws-pagebar");
  const doc = document.documentElement;
  return {
    hd: R(hd), title: R(title), txt: R(hd?.querySelector('[data-qcv="oh-text"]') ?? null), art: R(art), desk: R(vis('[data-qcv="court"]')),
    font: cs ? { size: parseFloat(cs.fontSize), family: cs.fontFamily, lh: parseFloat(cs.lineHeight) } : null,
    titleText: title?.textContent ?? "", pageTitle: title?.hasAttribute("data-page-title") ?? false,
    sub: hd?.querySelector<HTMLElement>('[data-qcv="oh-sub"]')?.textContent ?? "", boxed,
    band: !!vis(".ph--band"), disc: !!vis('[data-probe="band-disc"]'),
    barB: bar ? bar.getBoundingClientRect().bottom : NaN, overflowX: doc.scrollWidth - doc.clientWidth,
    scOverflowX: (() => { const sc = hd?.closest<HTMLElement>(".wpg-scroll"); return sc ? sc.scrollWidth - sc.clientWidth : NaN; })(),
    artTop: art ? parseFloat(getComputedStyle(art).top) || 0 : 0, artZ: art ? getComputedStyle(art).zIndex : "",
    deskR: (() => { const cs = [...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].filter((e) => e.getBoundingClientRect().height > 0); return cs.length ? Math.max(...cs.map((e) => e.getBoundingClientRect().right)) : NaN; })(),
    sheetTop: (() => { const sc = hd?.closest<HTMLElement>(".wpg-scroll"); return sc ? sc.getBoundingClientRect().top : NaN; })(),
    artHidden: art?.getAttribute("aria-hidden") === "true", artPos: art ? getComputedStyle(art).position : "", artMask: art ? (getComputedStyle(art).maskImage || getComputedStyle(art).webkitMaskImage) : "",
  };
}, HD);

test.describe("Query Centre v133 — the open header", () => {
  test("H1 · open: no card or band around the title, Special Elite, the exact line", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await readQc(page);
      expect(g.title, `${w}: the title was found`).not.toBeNull();
      expect(g.boxed, `${w}: an ancestor of the title has a ground or a radius`).toEqual([]);
      expect(g.band || g.disc, `${w}: the band or its disc is still drawn`).toBe(false);
      /* v134 — RE-POINTED: the title is the hero number and its words now; its sizes and one-line claim are QC134 N1's */
      expect(g.font!.family, `${w}: the title's face`).toMatch(/Special Elite/);
      expect(g.titleText, `${w}: the living title`).toMatch(/^\d+(queries|query) out$/);
      expect(g.pageTitle, `${w}: the title keeps data-page-title`).toBe(true);
      expect(g.sub, `${w}: the subheader`).toBe(SUB);
    }
  });

  test("H2 · the drawing: 326 (253) tall, its right edge on the desk's, the text centred on its layout box", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await readQc(page);
      expect(g.art && g.txt, `${w}: the text block and the drawing were found`).toBeTruthy();
      expect(Math.abs(g.art!.h - (wide(w) ? 326 : 253)), `${w}: the drawing is ${g.art!.h} tall`).toBeLessThanOrEqual(1);
      expect(Number.isFinite(g.deskR), `${w}: the desk was found`).toBe(true);
      expect(Math.abs(g.art!.r - g.deskR), `${w}: the drawing's right ${g.art!.r} against the desk's ${g.deskR}`).toBeLessThanOrEqual(2);
      expect(Math.abs(g.art!.r - g.hd!.r), `${w}: the drawing's right ${g.art!.r} against the column's ${g.hd!.r}`).toBeLessThanOrEqual(2);
      /* the LAYOUT box is the drawn box less its drop: that is what sets the row and what the text centres on */
      const layoutCy = g.art!.cy - g.artTop;
      expect(Math.abs(layoutCy - g.txt!.cy), `${w}: centres ${g.txt!.cy} / ${layoutCy} (layout box)`).toBeLessThanOrEqual(4);
      expect(g.art!.x - g.txt!.r, `${w}: the gap to the text is ${g.art!.x - g.txt!.r}`).toBeGreaterThanOrEqual(wide(w) ? 40 : 24);
      expect(g.artHidden, `${w}: the drawing is aria-hidden`).toBe(true);
      expect(["static", "relative"], `${w}: the drawing is in the flow (${g.artPos})`).toContain(g.artPos);
      expect(g.artMask, `${w}: the left-edge fade`).toMatch(/linear-gradient/);
    }
  });

  test("H3 · rhythm: the header's top, the hairline and the desk's top equal the Contact list's", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await inkOpen(page, "/agents", w, { height: h, scope: "qc133" });
      await expect(page.locator('[data-cl15="header"]:not([data-loading])'), `${w}: the Contact list's header`).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(600);
      const cl = await page.evaluate(() => {
        const hd = document.querySelector<HTMLElement>('[data-cl15="header"]')!.getBoundingClientRect();
        const desk = document.querySelector<HTMLElement>('[data-cl15="desk"]')!.getBoundingClientRect();
        return { top: hd.top, hair: hd.bottom, desk: desk.top };
      });
      await openQc(page, w, h);
      const g = await readQc(page);
      const qc = { top: g.hd!.y, hair: g.hd!.b, desk: g.desk!.y };
      console.log(`[H3] ${w}: contact ${JSON.stringify(cl)} · queries ${JSON.stringify(qc)}`);
      expect(cl.top, `${w}: the Contact list's header was measured`).toBeGreaterThan(60);
      expect(Math.abs(qc.top - cl.top), `${w}: header top ${qc.top} / ${cl.top}`).toBeLessThanOrEqual(2);
      expect(Math.abs(qc.hair - cl.hair), `${w}: hairline ${qc.hair} / ${cl.hair}`).toBeLessThanOrEqual(2);
      expect(Math.abs(qc.desk - cl.desk), `${w}: desk top ${qc.desk} / ${cl.desk}`).toBeLessThanOrEqual(2);
    }
  });

  test("H4 · headroom: the drawing's top is 30 (24) below the sheet's top, and nothing overflows sideways", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await readQc(page);
      expect(Number.isFinite(g.sheetTop), `${w}: the sheet's top was found`).toBe(true);
      expect(Math.abs(g.sheetTop - g.barB), `${w}: the sheet starts at the top bar's bottom (${g.sheetTop} / ${g.barB})`).toBeLessThanOrEqual(1);
      expect(Math.abs(g.art!.y - g.sheetTop - (wide(w) ? 30 : 24)), `${w}: the drawing's top is ${g.art!.y - g.sheetTop} below the sheet's`).toBeLessThanOrEqual(3);
      expect(g.overflowX, `${w}: the document overflows sideways`).toBeLessThanOrEqual(0);
      expect(g.scOverflowX, `${w}: the page's scroller overflows sideways`).toBeLessThanOrEqual(0);
    }
  });

  test("H5 · buttons: + Log a query opens the log flow, Record a response the response flow; both disabled while loading", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 5000; });
      await inkOpen(page, "/queries", w, { height: h, scope: "qc133" });
      await expect(page.locator(`${HD}[data-loading]`), `${w}: the loading header`).toBeVisible();
      expect(await page.locator('[data-qcv="oh-log"]').isDisabled(), `${w}: Log is disabled while loading`).toBe(true);
      expect(await page.locator('[data-qcv="oh-record"]').isDisabled(), `${w}: Record is disabled while loading`).toBe(true);
      await expect(page.locator(`${HD}:not([data-loading])`)).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(500);
      /* the drawer states its journey: `data-qad-drawer="log"` or `"resp"` */
      const mode = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qad-drawer]")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("data-qad-drawer") ?? null);
      /* ✕ closes an untouched drawer outright (Escape on one with answers parks it) */
      const shut = async () => { await page.locator("[data-qad-drawer] .qad-dx").filter({ visible: true }).first().click(); await expect.poll(mode, { timeout: 8000 }).toBeNull(); };
      await page.locator('[data-qcv="oh-log"]').click();
      await expect.poll(mode, { timeout: 8000, message: `${w}: Log opened a drawer` }).not.toBeNull();
      const logTitle = (await mode()) ?? "";
      expect(logTitle, `${w}: + Log a query opens the log flow`).toBe("log");
      await shut();
      await page.locator('[data-qcv="oh-record"]').click();
      await expect.poll(mode, { timeout: 8000, message: `${w}: Record opened a drawer` }).not.toBeNull();
      const recTitle = (await mode()) ?? "";
      expect(recTitle, `${w}: Record a response opens the response flow`).toBe("resp");
      await shut();
      console.log(`[H5] ${w}: "${logTitle}" · "${recTitle}"`);
    }
  });

  test("H6 · no jump: the loading header's box and its parts equal the loaded ones", async ({ page }) => {
    const read = () => page.evaluate((HD) => {
      const hd = [...document.querySelectorAll<HTMLElement>(HD)].find((e) => e.getBoundingClientRect().height > 0)!;
      const R = (e: Element | null) => { const r = e!.getBoundingClientRect(); return { y: +r.top.toFixed(1), h: +r.height.toFixed(1), x: +r.left.toFixed(1) }; };
      const hr = hd.getBoundingClientRect();
      return { loading: hd.hasAttribute("data-loading"), hd: { y: +hr.top.toFixed(1), h: +hr.height.toFixed(1), x: +hr.left.toFixed(1), w: +hr.width.toFixed(1) }, title: R(hd.querySelector("h1")), sub: R(hd.querySelector('[data-qcv="oh-sub"]')), b1: R(hd.querySelector('[data-qcv="oh-log"]')), art: R(hd.querySelector('[data-qcv="oh-art"]')), titleW: +hd.querySelector("h1")!.getBoundingClientRect().width.toFixed(1) };
    }, HD);
    for (const [w, h] of SIZES) {
      await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 5000; });
      await inkOpen(page, "/queries", w, { height: h, scope: "qc133" });
      await expect(page.locator(`${HD}[data-loading]`), `${w}: the loading header`).toBeVisible();
      const a = await read();
      await expect(page.locator(`${HD}:not([data-loading])`)).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(700);
      const b = await read();
      expect(a.loading && !b.loading, `${w}: measured loading, then loaded`).toBe(true);
      console.log(`[H6] ${w}: ${JSON.stringify(a.hd)} → ${JSON.stringify(b.hd)}`);
      for (const k of ["x", "y", "w", "h"] as const) expect(Math.abs(a.hd[k] - b.hd[k]), `${w}: header ${k} ${a.hd[k]} → ${b.hd[k]}`).toBeLessThanOrEqual(1);
      /* the title holds its SHAPE: the placeholder is as wide as the title that replaces it, so the drawing,
         which starts after the text block, does not move either (true while the count has two digits) */
      /* ⚠️ ±8, NOT ±1: Special Elite's digits are not one width, so "00" and the real count can differ by a few
         pixels (measured 540.1 → 535.4), and the drawing, which starts after the text block, moves by the same. A
         placeholder that has lost its words is hundreds of pixels out (the mutation: 233.8 → 535.4). */
      /* v134: the placeholder is the hero NUMBER, "00" at 124px, so the digit-width difference is larger (measured 413.5 → 405.3) */
      expect(Math.abs(a.titleW - b.titleW), `${w}: title width ${a.titleW} → ${b.titleW}`).toBeLessThanOrEqual(16);
      expect(Math.abs(a.art.x - b.art.x), `${w}: the drawing's x ${a.art.x} → ${b.art.x}`).toBeLessThanOrEqual(8);
      for (const k of ["y", "h"] as const) expect(Math.abs(a.art[k] - b.art[k]), `${w}: art ${k} ${a.art[k]} → ${b.art[k]}`).toBeLessThanOrEqual(1);
      for (const part of ["title", "sub", "b1"] as const) for (const k of ["x", "y", "h"] as const) expect(Math.abs(a[part][k] - b[part][k]), `${w}: ${part} ${k} ${a[part][k]} → ${b[part][k]}`).toBeLessThanOrEqual(1);
    }
  });

  test("H7 · the drawing crosses the hairline, painted over it, 12–24 below — as the hawk does on /agents", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await inkOpen(page, "/agents", w, { height: h, scope: "qc133" });
      await expect(page.locator('[data-cl15="header"]:not([data-loading])'), `${w}: the Contact list's header`).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(600);
      const cl = await page.evaluate(() => {
        const hd = document.querySelector<HTMLElement>('[data-cl15="header"]')!.getBoundingClientRect();
        const art = document.querySelector<HTMLElement>('[data-cl15="header-art"] img')!.getBoundingClientRect();
        return { above: hd.bottom - art.top, below: art.bottom - hd.bottom, h: art.height };
      });
      await openQc(page, w, h);
      const g = await readQc(page);
      const hair = g.hd!.b, below = g.art!.b - hair;
      console.log(`[H7] ${w}: contact ${JSON.stringify(cl)} · queries below ${below.toFixed(1)}, height ${g.art!.h.toFixed(1)}`);
      expect(cl.below, `${w}: the hawk crosses its hairline on /agents (precondition)`).toBeGreaterThan(0);
      expect(g.art!.y, `${w}: the drawing starts above the hairline`).toBeLessThan(hair - 100);
      expect(below, `${w}: the drawing ends ${below} below the hairline`).toBeGreaterThanOrEqual(12);
      expect(below, `${w}: the drawing ends ${below} below the hairline`).toBeLessThanOrEqual(24);
      expect(Math.abs(below - cl.below), `${w}: ${below} below here, ${cl.below} on /agents`).toBeLessThanOrEqual(2);
      expect(Math.abs(g.art!.h - cl.h), `${w}: the drawing ${g.art!.h} tall, the hawk ${cl.h}`).toBeLessThanOrEqual(1);
      expect(g.artPos, `${w}: positioned, so it paints over the hairline`).toBe("relative");
      expect(Number(g.artZ), `${w}: z-index ${g.artZ}`).toBeGreaterThanOrEqual(1);
    }
  });
});
