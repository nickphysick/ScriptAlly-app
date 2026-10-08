/**
 * Query Centre v133 — the open header (design-refs/query-centre/query-centre-v133.html). QC133 H1–H6,
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
    artHidden: art?.getAttribute("aria-hidden") === "true", artPos: art ? getComputedStyle(art).position : "", artMask: art ? (getComputedStyle(art).maskImage || getComputedStyle(art).webkitMaskImage) : "",
  };
}, HD);

test.describe("Query Centre v133 — the open header", () => {
  test("H1 · open: no card or band around the title, Special Elite 72 (58), the exact line", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await readQc(page);
      expect(g.title, `${w}: the title was found`).not.toBeNull();
      expect(g.boxed, `${w}: an ancestor of the title has a ground or a radius`).toEqual([]);
      expect(g.band || g.disc, `${w}: the band or its disc is still drawn`).toBe(false);
      expect(g.font!.family, `${w}: the title's face`).toMatch(/Special Elite/);
      expect(Math.abs(g.font!.size - (wide(w) ? 72 : 58)), `${w}: the title is ${g.font!.size}px`).toBeLessThanOrEqual(1);
      expect(g.titleText, `${w}: the living title`).toMatch(/^(\d+ queries out|One query out|No queries out)$/);
      expect(g.pageTitle, `${w}: the title keeps data-page-title`).toBe(true);
      expect(Math.round(g.title!.h / g.font!.lh), `${w}: the title is one line`).toBe(1);
      expect(g.sub, `${w}: the subheader`).toBe(SUB);
    }
  });

  test("H2 · centred: text and drawing share a centre, the drawing 266 (206) tall, 112 (72) after the text", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await readQc(page);
      expect(g.art && g.txt, `${w}: the text block and the drawing were found`).toBeTruthy();
      expect(Math.abs(g.art!.cy - g.txt!.cy), `${w}: centres ${g.txt!.cy} / ${g.art!.cy}`).toBeLessThanOrEqual(4);
      expect(Math.abs(g.art!.h - (wide(w) ? 266 : 206)), `${w}: the drawing is ${g.art!.h} tall`).toBeLessThanOrEqual(1);
      expect(Math.abs(g.art!.x - g.txt!.r - (wide(w) ? 112 : 72)), `${w}: the drawing starts ${g.art!.x - g.txt!.r} after the text`).toBeLessThanOrEqual(2);
      expect(g.artHidden, `${w}: the drawing is aria-hidden`).toBe(true);
      expect(g.artPos, `${w}: the drawing is in the flow`).toBe("static");
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

  test("H4 · headroom: the drawing clears the top bar by 8px or more, and nothing overflows sideways", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await readQc(page);
      expect(Number.isFinite(g.barB), `${w}: the top bar was found`).toBe(true);
      expect(g.art!.y - g.barB, `${w}: the drawing's top ${g.art!.y} against the bar's bottom ${g.barB}`).toBeGreaterThanOrEqual(8);
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
      expect(Math.abs(a.titleW - b.titleW), `${w}: title width ${a.titleW} → ${b.titleW}`).toBeLessThanOrEqual(8);
      expect(Math.abs(a.art.x - b.art.x), `${w}: the drawing's x ${a.art.x} → ${b.art.x}`).toBeLessThanOrEqual(8);
      for (const k of ["y", "h"] as const) expect(Math.abs(a.art[k] - b.art[k]), `${w}: art ${k} ${a.art[k]} → ${b.art[k]}`).toBeLessThanOrEqual(1);
      for (const part of ["title", "sub", "b1"] as const) for (const k of ["x", "y", "h"] as const) expect(Math.abs(a[part][k] - b[part][k]), `${w}: ${part} ${k} ${a[part][k]} → ${b[part][k]}`).toBeLessThanOrEqual(1);
    }
  });
});
