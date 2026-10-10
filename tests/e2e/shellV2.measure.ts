/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App shell v2 (design-refs/shell/shell-v2-page.html) — the SH2 locks, on the rendered page at 1512 × 900
 * and 1280 × 800, over every route in the census (sh2Lib) that has the feature.
 *
 * S1 oat · S2 sheet · S3 flap · S4 no hairline · S5 art · S6 tab · B1 bands · B2 banner flap · B3 hawk · L1 no jump.
 *
 * Each was red on the build before the pack (origin/main 55eff29a) and by its named mutation
 * (`SH2_MUTATE=<lock>`, sh2Lib MUTATIONS) before its green was believed: reports/shell-v2/.
 *
 * ⚠️ "UNCHANGED FROM MAIN" IS MEASURED AGAINST A CAPTURE OF MAIN, never typed: `SH2_CAPTURE=1` run against
 *    a build of main writes reports/shell-v2/baseline.json (the art's box, each band's box and paddings,
 *    each banner's box and the gap beneath it), and S5, B1 and B2 compare with it.
 */
import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KILL_MOTION } from "./measure";
import { ART, BANDS, BANNERS, BLUSH, DIR, FLAP, HAWK, Ledger, NO_SHEET_ROUTES, OAT, OWN_ROUTES, PAPER, ROUTES, SHEET_ROUTES, SIZES, bring, edgeBelow, near, open, prepare, readPage, rgb, sameRgb, column } from "./sh2Lib";

const CAPTURE = !!process.env.SH2_CAPTURE;
const BASE_FILE = `${DIR}/baseline.json`;
type Base = Record<string, { l: number; t: number; r: number; b: number; w: number; h: number; pt?: number; pb?: number; gap?: number; overflowX?: number } | null>;
const base: Base = existsSync(BASE_FILE) ? JSON.parse(readFileSync(BASE_FILE, "utf8")) : {};
const captured: Base = {};
const key = (kind: string, route: string, w: number) => `${kind} ${route} ${w}`;

test.beforeEach(async ({ page }) => { await prepare(page); });
test.afterAll(() => {
  if (!CAPTURE || !Object.keys(captured).length) return;
  mkdirSync(DIR, { recursive: true });
  writeFileSync(BASE_FILE, JSON.stringify({ ...base, ...captured }, null, 1));
});

/** A box relative to the page's content (scroll taken out), so two builds can be compared at any scroll. */
async function contentBox(page: import("@playwright/test").Page, sel: string, pseudo: string | null = null) {
  return page.evaluate(({ sel, pseudo }) => {
    const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0);
    if (!el) return null;
    const sc = el.closest<HTMLElement>(".wpg-scroll"); const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const top = r.top + (sc ? sc.scrollTop : 0);
    const nx = el.nextElementSibling as HTMLElement | null; const nr = nx?.getBoundingClientRect();
    const ps = getComputedStyle(el, pseudo ?? undefined);
    const after = getComputedStyle(el, "::after"), before = getComputedStyle(el, "::before");
    return {
      l: r.left, t: top, r: r.right, b: top + r.height, w: r.width, h: r.height, pt: parseFloat(cs.paddingTop), pb: parseFloat(cs.paddingBottom),
      gap: nr && nr.height > 0 ? nr.top - r.bottom : undefined,
      bg: ps.backgroundColor, screenTop: r.top, screenBottom: r.bottom,
      afterContent: after.content, afterW: parseFloat(after.width) || 0, beforeClip: before.clipPath, beforeShadow: before.boxShadow, filter: cs.filter, beforeFilter: before.filter, shadow: cs.boxShadow,
    };
  }, { sel, pseudo });
}

if (CAPTURE) {
  test("SH2 capture · main's art, bands and banners", async ({ page }) => {
    for (const vp of SIZES) {
      for (const [route, a] of Object.entries(ART)) { await open(page, route, vp); captured[key("art", route, vp.width)] = (await readPage(page, a.sel)).art; }
      for (const b of BANDS) { await open(page, b.route, vp); captured[key("band", b.route, vp.width)] = await contentBox(page, b.sel, b.pseudo); }
      for (const b of BANNERS) { await open(page, b.route, vp); captured[key("banner", b.route, vp.width)] = await contentBox(page, b.sel); }
      /* main's own sideways overflow, per route: Discover's scroller overflows on main, so S2 asserts "no worse" */
      for (const route of SHEET_ROUTES) { await open(page, route, vp); captured[key("overflow", route, vp.width)] = { l: 0, t: 0, r: 0, b: 0, w: 0, h: 0, overflowX: (await readPage(page, null)).overflowX }; }
    }
    expect(Object.values(captured).filter(Boolean).length, "the capture found its subjects").toBe(Object.keys(captured).length);
  });
} else {

/* ── S1 · oat ── */
test("S1 · oat: every page sheet is rgb(242, 238, 232), the footer reads it, and no greige literal is left", async ({ page }) => {
  const L = new Ledger("S1");
  /* the source half: no literal greige outside marketing (comments stripped — the prose names what it retired) */
  const hits: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (p.startsWith("src/marketing")) continue; if (statSync(p).isDirectory()) walk(p); else if (/\.(css|ts|tsx)$/.test(f) && !/\.test\./.test(f)) { const s = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1"); if (/#f3f2f0|243,\s*242,\s*240/i.test(s)) hits.push(p); } } };
  walk("src");
  L.check("S1 no literal #f3f2f0 / 243, 242, 240 in src outside marketing", "source", hits.length === 0, hits.join(", ") || "none");
  let feet = 0;
  for (const vp of SIZES) for (const route of ROUTES) {
    await open(page, route, vp);
    const r = await readPage(page, null); const w = `${route} @${vp.width}`;
    L.check("S1 the page sheet's background", w, r.winBg === rgb(OAT), `${r.winBg}`);
    if (r.footBg) { feet++; L.check("S1 the footer reads the page colour", w, r.footBg === rgb(OAT), r.footBg); }
  }
  L.check("S1 population: a footer was read on at least three routes per width", "census", feet >= 6, `${feet}`);
  L.done(ROUTES.length * SIZES.length + 2);
});

/* ── S2 sheet · S3 flap · S4 no hairline ── */
for (const vp of SIZES) {
  test(`S2 S3 S4 · the header sheet, its flap and no hairline at ${vp.width}`, async ({ page }) => {
    const L2 = new Ledger(`S2-${vp.width}`), L3 = new Ledger(`S3-${vp.width}`), L4 = new Ledger(`S4-${vp.width}`);
    for (const route of SHEET_ROUTES) {
      await open(page, route, vp);
      const r = await readPage(page, null); const w = `${route} @${vp.width}`;
      const ok = !!(r.win && r.sheet && r.head && r.flat !== null);
      L2.check("S2 precondition: a header sheet is on screen", w, ok && r.hasHost, `host ${r.hasHost} sheet ${!!r.sheet}`);
      L2.check("S2 the sheet's colour", w, r.faceBg === rgb(PAPER), `${r.faceBg}`);
      L2.check("S2 the sheet's edges are the page sheet's (±1)", w, ok && near(r.sheet!.l, r.win!.l, 1) && near(r.sheet!.r, r.win!.r, 1), ok ? `sheet ${r.sheet!.l.toFixed(1)}–${r.sheet!.r.toFixed(1)} page ${r.win!.l}–${r.win!.r}` : "absent");
      L2.check("S2 it starts at the page sheet's top", w, ok && r.sheet!.t <= r.win!.t + 1, ok ? `sheet top ${r.sheet!.t.toFixed(1)} page top ${r.win!.t}` : "absent");
      const o0 = base[key("overflow", route, vp.width)]?.overflowX;
      L2.check("S2 no horizontal overflow (none the sheet adds: no more than main's own)", w, typeof o0 === "number" && r.overflowX <= Math.max(0, o0), `now ${r.overflowX} main ${o0}`);
      if (ok) {
        const midY = Math.max(r.win!.t + 6, Math.min(r.head!.t + 8, r.flat! - 4));
        const lp = (await column(page, r.win!.l + 14, midY, midY + 1))[0], rp = (await column(page, r.win!.r - 14, midY, midY + 1))[0], tp = (await column(page, r.win!.l + 14, r.win!.t + 3, r.win!.t + 4))[0];
        L2.check("S2 painted: paper at the page sheet's left and right edges and at its top", w, sameRgb(lp, PAPER, 3) && sameRgb(rp, PAPER, 3) && sameRgb(tp, PAPER, 3), `left ${lp} right ${rp} top ${tp}`);
        /* S3 — the outline's y at four x's, read off the screen */
        const cx = (r.win!.l + r.win!.r) / 2, half = (r.win!.r - r.win!.l) / 2;
        const depth = (x: number) => FLAP * (1 - Math.abs(x - cx) / half);
        const xs = [r.win!.l + 14, r.win!.l + 0.1 * 2 * half, cx, r.win!.r - 14];
        const got: string[] = []; let good = true;
        for (const x of xs) {
          const e = await edgeBelow(page, x, r.flat! - 3, PAPER);
          const want = r.flat! + depth(x);
          got.push(`x ${x.toFixed(0)}: ${e.y} want ${want.toFixed(1)}`);
          if (e.y === null || Math.abs(e.y - want) > 2) good = false;
        }
        L3.check("S3 the edge is flat at the sides and 26 lower at the centre (outline at 4 x's, ±2)", w, good, got.join(" · "));
        const c = await edgeBelow(page, cx, r.flat! - 3, PAPER);
        L3.check("S3 the point is 26 (±1) under the flat edge, at the page sheet's centre", w, c.y !== null && near(c.y - r.flat!, FLAP, 1.5), `${c.y === null ? "none" : (c.y - r.flat!).toFixed(1)}`);
        /* a shadow under the outline: 6px below it, a quarter of the way in, the page is darker than oat */
        const qx = r.win!.l + 0.5 * half; const q = await edgeBelow(page, qx, r.flat! - 3, PAPER);
        const sum = (p?: number[]) => (p ? p[0] + p[1] + p[2] : 999);
        L3.check("S3 a drop shadow lies under the flap's outline", w, /drop-shadow/.test(r.filter ?? "") && sum(q.after) <= sum(OAT) - 9, `filter ${r.filter} · 6px under the edge ${q.after}`);
        L3.check("S3 the face is clipped to the flap", w, /polygon/.test(r.clip ?? ""), `${r.clip}`);
      } else { L3.check("S3 a sheet to measure", w, false, "absent"); }
      L4.check("S4 no header border paints (width 0 or transparent)", w, r.borderW !== null && (r.borderW === 0 || r.borderA === 0), `width ${r.borderW} alpha ${r.borderA}`);
      L4.check("S4 the chrome slab's own hairline does not paint", w, r.chromeBorderA === 0, `alpha ${r.chromeBorderA}`);
      L4.check("S4 no rule element within 4px of the edge", w, r.rules.length === 0, r.rules.join(",") || "none");
    }
    L2.write(); L3.write(); L4.write();
    L2.done(SHEET_ROUTES.length * 5); L3.done(SHEET_ROUTES.length * 3); L4.done(SHEET_ROUTES.length * 3);
  });
}

/* ── S5 · art ── */
/* RETIRED (header panel v2, 10 Oct): see tests/e2e/RETIRED-header-panel-v2.md. Every drawing in S5's census is in a panel now, with no sheet beneath it. HP2 P5 and A5 hold the drawings. */
test.skip("S5 · art: each drawing is painted above the sheet and keeps main's size (v135: the open headers' drawings sit clear of the flap)", async ({ page }) => {
  const L = new Ledger("S5");
  for (const vp of SIZES) for (const [route, a] of Object.entries(ART)) {
    await open(page, route, vp);
    const r = await readPage(page, a.sel); const w = `${route} @${vp.width}`;
    const b0 = base[key("art", route, vp.width)];
    L.check("S5 precondition: the drawing and the sheet are on screen", w, !!r.art && !!r.sheet && r.art.b <= r.vh, `art ${!!r.art} sheet ${!!r.sheet}`);
    L.check("S5 the drawing is painted above the sheet", w, r.hit === "art", `at y ${r.hitY}: ${r.hit}`);
    if (a.crosses) L.check("S5 the drawing's bottom is 12–24 below the flat edge", w, !!r.art && r.flat !== null && r.art.b - r.flat >= 12 && r.art.b - r.flat <= 24, r.art && r.flat !== null ? (r.art.b - r.flat).toFixed(1) : "absent");
/* RE-POINTED (Query Centre v135): on the three open headers the drawing's POSITION is v135's (the centred pair, QC135 A1–A3);
       its size is still main's. On the shared header (Submission packages) position and size are both held. */
    const own = OWN_ROUTES.includes(route);
    L.check(own ? "S5 size unchanged from main (±1); position is the centred pair's (QC135)" : "S5 position and size unchanged from main (±1)", w, !!r.art && !!b0 && near(r.art.w, b0.w, 1) && near(r.art.h, b0.h, 1) && (own || (near(r.art.l, b0.l, 1) && near(r.art.t, b0.t, 1))), r.art && b0 ? `now ${r.art.l.toFixed(1)},${r.art.t.toFixed(1)} ${r.art.w.toFixed(1)}×${r.art.h.toFixed(1)} main ${b0.l.toFixed(1)},${b0.t.toFixed(1)} ${b0.w.toFixed(1)}×${b0.h.toFixed(1)}` : "no reading");
  }
  L.check("S5 population: the three open headers are in the census", "census", OWN_ROUTES.every((r) => !!ART[r]), OWN_ROUTES.join(" "));
  L.done(Object.keys(ART).length * SIZES.length * 3);
});

/* ── S6 · tab ── */
test("S6 · tab: the page tab and its fillet are the sheet's colour on a header route, the page's elsewhere", async ({ page }) => {
  const L = new Ledger("S6");
  for (const vp of SIZES) for (const route of ROUTES) {
    await open(page, route, vp);
    const r = await readPage(page, null); const w = `${route} @${vp.width}`;
    const want = SHEET_ROUTES.includes(route) ? PAPER : OAT;
    L.check(`S6 the tab is ${rgb(want)}`, w, r.tabBg === rgb(want) && r.filFill === rgb(want), `tab ${r.tabBg} fillet ${r.filFill}`);
    L.check("S6 the tab's colour and a sheet on the page go together", w, r.hasHost === SHEET_ROUTES.includes(route), `sheet on the page ${r.hasHost}`);
  }
  L.check("S6 population: both kinds of route are in the census", "census", SHEET_ROUTES.length >= 3 && NO_SHEET_ROUTES.length >= 2 /* RE-POINTED (header panel v2): the workspace routes left the sheet; Import, Plans and the Help centre keep it */, `${SHEET_ROUTES.length} with, ${NO_SHEET_ROUTES.length} without`);
  L.done(ROUTES.length * SIZES.length * 2);
});

/* ── B1 · bands ── */
test("B1 · bands: paper white edge to edge, geometry as main, every card in a band ringed", async ({ page }) => {
  const L = new Ledger("B1");
  for (const vp of SIZES) for (const band of BANDS) {
    await open(page, band.route, vp);
    await bring(page, band.sel);
    const w = `${band.route} @${vp.width}`;
    const g = await contentBox(page, band.sel, band.pseudo); const b0 = base[key("band", band.route, vp.width)];
    const win = (await readPage(page, null)).win!;
    L.check("B1 precondition: the band is on screen", w, !!g && g.screenTop >= win.t - 1 && g.screenTop < win.b - 40, g ? `top ${g.screenTop.toFixed(0)}` : "absent");
    L.check("B1 the band's colour", w, g?.bg === rgb(PAPER), `${g?.bg}`);
    if (g) {
      const y = Math.min(g.screenTop + 20, win.b - 4);
      const lp = (await column(page, win.l + 14, y, y + 1))[0], rp = (await column(page, win.r - 14, y, y + 1))[0];
      L.check("B1 painted paper white at the page sheet's left and right edges", w, sameRgb(lp, PAPER, 3) && sameRgb(rp, PAPER, 3), `left ${lp} right ${rp}`);
      L.check("B1 box and paddings unchanged from main (±1)", w, !!b0 && near(g.l, b0.l, 1) && near(g.w, b0.w, 1) && near(g.h, b0.h, 1) && near(g.pt, b0.pt!, 1) && near(g.pb, b0.pb!, 1), b0 ? `now t ${g.t.toFixed(1)} ${g.w.toFixed(1)}×${g.h.toFixed(1)} pad ${g.pt}/${g.pb} · main t ${b0.t.toFixed(1)} ${b0.w.toFixed(1)}×${b0.h.toFixed(1)} pad ${b0.pt}/${b0.pb}` : "no baseline");
    }
    const cards = await page.evaluate((sel) => {
      const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0);
      if (!el) return [];
      const alpha = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return 1; const p = m[1].split(",").map((v) => parseFloat(v)); return p.length > 3 ? p[3] : 1; };
      return [...el.querySelectorAll<HTMLElement>("*")].filter((e) => {
        const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        /* white, or the near-white Manuscripts' doors state (#fdfcfa) */
        const ch = (cs.backgroundColor.match(/\d+(\.\d+)?/g) ?? []).map(Number);
        return ch.length === 3 && ch.every((v) => v >= 250) && r.width >= 160 && r.height >= 90 && parseFloat(cs.borderTopLeftRadius) >= 8;
      }).map((e) => { const cs = getComputedStyle(e); return { cls: e.className.toString().slice(0, 40), ring: (parseFloat(cs.borderTopWidth) > 0 && alpha(cs.borderTopColor) > 0) || /(^|, )rgba?\([^)]+\) 0px 0px 0px 1(\.5)?px/.test(cs.boxShadow), shadow: cs.boxShadow.slice(0, 90) }; });
    }, band.sel);
    L.check("B1 population: white cards inside the band", w, cards.length > 0, `${cards.length}`);
    L.check("B1 every card in the band has a ring", w, cards.every((c) => c.ring), cards.filter((c) => !c.ring).map((c) => `${c.cls} [${c.shadow}]`).join(" · ") || `${cards.length} ringed`);
  }
  L.done(BANDS.length * SIZES.length * 5);
});

/* ── B2 banner flap · B3 hawk ── */
test("B2 B3 · banners: no arrow, the flap as the bottom edge, no shadow, the gap grown by 26; the hawk clear of it", async ({ page }) => {
  const L = new Ledger("B2"), H = new Ledger("B3");
  for (const vp of SIZES) for (const ban of BANNERS) {
    await open(page, ban.route, vp);
    await bring(page, ban.sel, 150);
    const w = `${ban.route} @${vp.width}`;
    const g = await contentBox(page, ban.sel); const b0 = base[key("banner", ban.route, vp.width)];
    const win = (await readPage(page, null)).win!;
    L.check("B2 precondition: the banner and the room under it are on screen", w, !!g && g.screenTop >= win.t && g.screenBottom + 60 < win.b, g ? `${g.screenTop.toFixed(0)}–${g.screenBottom.toFixed(0)}` : "absent");
    if (!g) continue;
    L.check("B2 no arrow", w, g.afterContent === "none" || g.afterW === 0, `::after content ${g.afterContent} width ${g.afterW}`);
    const cx = (win.l + win.r) / 2, flat = g.screenBottom;
    const eL = await edgeBelow(page, win.l + 14, flat - 3, BLUSH), eC = await edgeBelow(page, cx, flat - 3, BLUSH), eR = await edgeBelow(page, win.r - 14, flat - 3, BLUSH);
    L.check("B2 the bottom edge is flat at the sides (±2)", w, eL.y !== null && eR.y !== null && Math.abs(eL.y - flat) <= 2 && Math.abs(eR.y - flat) <= 2, `left ${eL.y} right ${eR.y} flat ${flat.toFixed(1)}`);
    L.check("B2 …and 26 (±1) lower at the centre", w, eC.y !== null && near(eC.y - flat, FLAP, 1.5), `${eC.y === null ? "none" : (eC.y - flat).toFixed(1)}`);
    const q = await edgeBelow(page, win.l + (win.r - win.l) / 4, flat - 3, BLUSH);
    L.check("B2 no shadow: 6px under the edge is the page", w, g.filter === "none" && g.beforeFilter === "none" && g.beforeShadow === "none" && sameRgb(q.after, OAT, 2), `filter ${g.filter}/${g.beforeFilter} shadow ${g.beforeShadow} pixel ${q.after}`);
    L.check("B2 the content below starts at main's gap + 26 (±2)", w, !!b0 && typeof g.gap === "number" && typeof b0.gap === "number" && near(g.gap, b0.gap + FLAP, 2), `now ${g.gap} main ${b0?.gap}`);
    L.check("B2 the banner's own box is main's (±1)", w, !!b0 && near(g.h, b0.h, 1) && near(g.w, b0.w, 1) && near(g.pt, b0.pt!, 1) && near(g.pb, b0.pb!, 1), b0 ? `now ${g.w.toFixed(1)}×${g.h.toFixed(1)} main ${b0.w.toFixed(1)}×${b0.h.toFixed(1)}` : "no baseline");
    if (ban.route === "/queries") {
      const hk = await page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }, HAWK);
      const half = (win.r - win.l) / 2; const depth = (x: number) => FLAP * Math.max(0, 1 - Math.abs(x - cx) / half);
      const deepest = hk ? Math.max(depth(hk.l), depth(hk.r), hk.l <= cx && hk.r >= cx ? FLAP : 0) : 0;
      H.check("B3 precondition: the flying hawk is on screen", w, !!hk && hk.t > win.t, hk ? `top ${hk.t.toFixed(1)}` : "absent");
      H.check("B3 the hawk clears the banner's flat edge by 8 or more", w, !!hk && hk.t - flat >= 8, hk ? (hk.t - flat).toFixed(1) : "absent");
      H.check("B3 …and never overlaps the flap's triangle", w, !!hk && hk.t >= flat + deepest, hk ? `hawk top ${hk.t.toFixed(1)} · the flap over it reaches ${(flat + deepest).toFixed(1)}` : "absent");
    }
  }
  L.write(); H.write();
  L.done(BANNERS.length * SIZES.length * 7); H.done(SIZES.length * 3);
});

}

/* ── L1 · no jump (also run by the capture, which records how far main's own header settles) ── */
test("L1 · no jump: each header sheet, band and banner is the same box loading and loaded", async ({ page }) => {
  const L = new Ledger("L1");
  /* ⚠️ MOTION IS KILLED FROM THE FIRST FRAME: the pages rise 4px on entry, and a first read taken mid-rise reports
     every box 4px low — a jump the harness made. Both reads are of ONE load, with no navigation between them. */
  await page.addInitScript(({ css }) => {
    const w = window as unknown as { __SA_QC_HOLD_MS: number; __SA_AGENTS_HOLD_MS: number }; w.__SA_QC_HOLD_MS = 6000; w.__SA_AGENTS_HOLD_MS = 6000;
    const put = () => { const s = document.createElement("style"); s.textContent = css; document.documentElement.appendChild(s); };
    if (document.documentElement) put(); else document.addEventListener("readystatechange", put, { once: true });
  }, { css: KILL_MOTION });
  const read = (sels: { band?: string; banner?: string }) => page.evaluate(({ band, banner }) => {
    const vis = (s?: string) => (s ? [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null : null);
    const win = document.querySelector(".ws-window");
    const sh = [...document.querySelectorAll<HTMLElement>(".hsheet")].find((e) => e.getBoundingClientRect().height > 0 && win?.contains(e)) ?? null;
    const hd = sh?.parentElement ?? [...document.querySelectorAll<HTMLElement>('[data-own-header], [data-probe="page-header"]')].find((e) => e.getBoundingClientRect().height > 0 && win?.contains(e)) ?? null;
    const sc = (hd ?? vis(band) ?? vis(banner))?.closest<HTMLElement>(".wpg-scroll, .ws-wbody") ?? null; const st = sc ? sc.scrollTop : 0;
    const b = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top + st, w: r.width, h: r.height }; };
    return { sheet: b(sh), head: b(hd), band: b(vis(band)), banner: b(vis(banner)), loading: !!document.querySelector(".ws-window [data-loading]") };
  }, sels);
  await open(page, "/dashboard", SIZES[0]);
  let held = 0;
  /* RE-POINTED (header panel v2): the bands and banners are on workspace routes, which left the sheet; they stay in this census */
  const L1_ROUTES = [...new Set<string>([...SHEET_ROUTES, ...BANDS.map((b) => b.route), ...BANNERS.map((b) => b.route)])];
  for (const vp of SIZES) for (const route of L1_ROUTES) {
    const hasSheet = (SHEET_ROUTES as readonly string[]).includes(route);
    const sels = { band: BANDS.find((b) => b.route === route)?.sel, banner: BANNERS.find((b) => b.route === route)?.sel };
    await page.setViewportSize(vp);
    await page.goto(route);
    const w = `${route} @${vp.width}`;
    await page.waitForFunction(() => { const win = document.querySelector(".ws-window"); return [...document.querySelectorAll<HTMLElement>('[data-own-header], [data-probe="page-header"]')].some((e) => e.getBoundingClientRect().height > 0 && !!win?.contains(e)); }, undefined, { timeout: 30_000 }).catch(() => {});
    const a = await read(sels);
    if (a.loading) held++;
    await page.waitForTimeout(route === "/queries" || route === "/agents" ? 9000 : 4000);
    await page.evaluate(async () => { await document.fonts.ready; });
    const b = await read(sels);
    type B = typeof a.sheet;
    const same = (x: B, y: B) => !!x && !!y && near(x.l, y.l, 1) && near(x.t, y.t, 1) && near(x.w, y.w, 1) && near(x.h, y.h, 1);
    const f = (x: B) => (x ? `${x.l.toFixed(0)},${x.t.toFixed(0)} ${x.w.toFixed(0)}×${x.h.toFixed(0)}` : "absent");
    if (CAPTURE) { captured[key("hjump", route, vp.width)] = { l: 0, t: 0, r: 0, b: 0, w: 0, h: a.head && b.head ? b.head.h - a.head.h : 0 }; continue; }
    /* the header's own growth while its living line settles is main's, measured there (`hjump`): the sheet may follow it and no more */
    const hj = base[key("hjump", route, vp.width)]?.h ?? 0;
    if (hasSheet) L.check("L1 the header sheet is there on the first frame the header is", w, !!a.sheet, f(a.sheet));
    if (hasSheet) L.check("L1 the sheet does not move, beyond the header's own settling on main", w, !!a.sheet && !!b.sheet && near(a.sheet.l, b.sheet.l, 1) && near(a.sheet.w, b.sheet.w, 1) && near(a.sheet.t, b.sheet.t, 1) && Math.abs(b.sheet.h - a.sheet.h - hj) <= 1, `first ${f(a.sheet)} settled ${f(b.sheet)} · main's header settles by ${hj.toFixed(1)}`);
    if (sels.band) L.check("L1 the band's box, loading and loaded", w, same(a.band, b.band), `first ${f(a.band)} settled ${f(b.band)}`);
    if (sels.banner) L.check("L1 the banner's box, loading and loaded", w, same(a.banner, b.banner), `first ${f(a.banner)} settled ${f(b.banner)}`);
  }
  if (CAPTURE) return;
  L.check("L1 population: the loading state itself was read (the two held routes, at both widths)", "census", held >= 4, `${held}`);
  L.done(SHEET_ROUTES.length * SIZES.length * 2 + 12);
});
