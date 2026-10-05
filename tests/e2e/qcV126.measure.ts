/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcV126 — QC126-1…20 (ref design-refs/query-centre-v126.html), on the rendered page at 1280 / 1440 /
 * 1512 / 1920 unless a lock says otherwise. Every lock also asserts no horizontal overflow of the
 * scroller. Ledgers land in reports/qc-v126/ledger/. Probes are the `data-qcv` contract the v126
 * components carry; a lock that cannot find its subject has FAILED (it reads null and says so).
 */
import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AT_1512, INK, Ledger, WIDTHS, box, checkOverflow, near, openDrawer, openQc, pixel, sameRgb } from "./qc126Lib";

test.describe.configure({ timeout: Number(process.env.QC126_TIMEOUT ?? 900_000) });
const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const rgba = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);

/* ── QC126-1 · the shell goes greige ── */
test("QC126-1 · shell", async ({ page }) => {
  const L = new Ledger("qc126-1");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    const c = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
      const main = vis(".ws-main"), side = vis(".ws-panel"), bar = vis('[data-probe="navrow"]');
      return {
        main: cs(main)?.backgroundColor ?? null, side: cs(side)?.backgroundColor ?? null, bar: cs(bar)?.backgroundColor ?? null,
        barRule: bar ? getComputedStyle(bar, "::after").backgroundColor : null, barRuleOp: bar ? getComputedStyle(bar, "::after").opacity : null,
        sideRule: cs(side)?.boxShadow ?? null, label: cs(vis(".ws-glabel"))?.color ?? null,
      };
    });
    L.check("QC126-1 page ground", w, c.main === "rgb(243, 242, 240)", `${c.main}`);
    L.check("QC126-1 sidebar ground", w, c.side === "rgb(230, 228, 224)", `${c.side}`);
    L.check("QC126-1 top bar = the page colour", w, c.bar === "rgb(243, 242, 240)", `${c.bar}`);
    L.check("QC126-1 top-bar rule", w, c.barRule === "rgba(28, 19, 15, 0.1)" && c.barRuleOp === "1", `${c.barRule} op ${c.barRuleOp}`);
    L.check("QC126-1 sidebar rule", w, !!c.sideRule && c.sideRule.includes("rgba(28, 19, 15, 0.1)"), `${c.sideRule}`);
    L.check("QC126-1 sidebar labels", w, c.label === "rgba(28, 19, 15, 0.45)", `${c.label}`);
    await checkOverflow(page, L, w);
  }
  L.done(28);
});

/* ── QC126-2 · no stragglers (source) ── */
const ALLOWED_CREAM = new Set([
  /* cream INK on anthracite, and surfaces that are not the page ground — §0.2's list, by name */
  "src/components/shell/primitives.css", "src/components/shell/shortcutsSheet.css", "src/components/queryActions/queryDrawer.css",
  "src/components/queries/centre/qcvPage.css", "src/components/queries/centre/qcvOpen.css", "src/components/queries/centre/qcvModal.css",
  "src/components/queries/centre/qcvBirdsEye.css", "src/components/queries/centre/qcvTimeline.css", "src/components/queries/centre/qcvList.css",
  "src/components/queries/centre/qcvExpanded.css", "src/components/queries/centre/qcvCourts.css", "src/components/agents/contact/contactV11.css",
  "src/components/agents/card/agentCard.css", "src/components/todo/todoCalendar.css", "src/components/dashboard/oneScreen.css", "src/components/dashboard/queryCard.css", "src/components/containers/framedCard.css",
  "src/components/dashboard/TodoRowCard.tsx", "src/components/dashboard/OneScreenMinimap.tsx", "src/lib/beAccent.ts", "src/components/StatusDotDemo.tsx",
  /* corrected (Phase 8): Phase 0 named these sheets before they existed; the drawer was built as
     qcvBirdsDrawer.css and the banner/workspace as qcvListBanner.css (the band is in pageHeader.css,
     which paints no old cream). qcvExpanded.css is deleted and stays listed harmlessly. */
  "src/components/queries/centre/qcvBirdsDrawer.css", "src/components/queries/centre/qcvCarousel.css", "src/components/queries/centre/qcvListBanner.css",
]);
/* a declaration that PAINTS a ground with the old neutral: a background / page / ground / field token, or a fade */
const GROUND = /(background(-color)?|--[a-z0-9-]*(page|ground)[a-z0-9-]*)\s*:[^;]*(#f5f1eb|#e7e3dc|rgba?\(\s*(245,\s*241,\s*235|231,\s*227,\s*220))/i;
test("QC126-2 · no stragglers", async () => {
  const L = new Ledger("qc126-2");
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(css|tsx?)$/.test(f) && !/\.test\./.test(f)) files.push(p); } };
  walk("src");
  let scanned = 0;
  for (const f of files) {
    if (f.startsWith("src/marketing/")) continue;
    scanned++;
    const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    for (const line of src.split("\n")) {
      if (!GROUND.test(line)) continue;
      /* `--qad-page` is the action drawer's inner note surface, in `queryActions/**`, which this pack may
         call and not change — allowed BY NAME, so the lock goes red the day any other page token returns */
      const byName = (f === "src/components/queryActions/queryDrawer.css" && /--qad-page\s*:/.test(line))
        /* named "page" and painting CREAM, not the page: ink on the navy band and the pill fills inside a
           white card (oneScreen), the pill fills inside the query card (queryCard), the framed card's
           cream band and its ink on navy (framedCard) — §0.2's list, allowed by name */
        || (f === "src/components/dashboard/oneScreen.css" && /--dash-page\s*:/.test(line))
        || (f === "src/components/dashboard/queryCard.css" && /--qcard-page\s*:/.test(line))
        || (f === "src/components/containers/framedCard.css" && /--fc-page\s*:/.test(line));
      L.check("QC126-2 a neutral ground painted with the old colour", f, byName || (ALLOWED_CREAM.has(f) && !/--[a-z0-9-]*(page|ground)/i.test(line)), line.trim().slice(0, 140));
    }
  }
  L.check("QC126-2 population: the sweep read the tree", "src", scanned > 400, `${scanned} files`);
  L.done(1);
});

/* ── QC126-3 · the header band ── */
test("QC126-3 · band", async ({ page }) => {
  const L = new Ledger("qc126-3");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const vis = (s: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
      const band = vis('[data-probe="page-header"][data-band]'); const bar = vis('[data-probe="navrow"]'); const main = vis(".ws-main");
      const desk = vis('[data-qcv="courts"]');
      return {
        band: b(band), bg: band ? getComputedStyle(band).backgroundColor : null, bar: b(bar), main: b(main), desk: b(desk),
        title: b(band?.querySelector("h1") ?? null), titleAlign: band?.querySelector("h1") ? getComputedStyle(band.querySelector("h1")!).textAlign : null,
        text: b(band?.querySelector('[data-probe="band-text"]') ?? null), disc: b(band?.querySelector('[data-probe="band-disc"]') ?? null),
        plates: document.querySelectorAll(".ph--plate, [data-plate]").length,
      };
    });
    L.check("QC126-3 the band exists", w, !!r.band, JSON.stringify(r.band));
    if (!r.band || !r.bar || !r.main) { await checkOverflow(page, L, w); continue; }
    L.check("QC126-3 anthracite", w, r.bg === "rgb(42, 58, 82)", `${r.bg}`);
    L.check("QC126-3 starts at the top bar's bottom", w, near(r.band.t, r.bar.b, 1), `band ${r.band.t} bar ${r.bar.b}`);
    const y = r.band.t + Math.min(30, r.band.h / 2);
    const left = await pixel(page, r.main.l + 3, y), right = await pixel(page, r.main.r - 3, y);
    L.check("QC126-3 the band spans the main column (pixel at each edge)", w, sameRgb(left, [42, 58, 82], 3) && sameRgb(right, [42, 58, 82], 3), `left ${left} right ${right}`);
    L.check("QC126-3 the title is left-aligned", w, r.titleAlign === "left" || r.titleAlign === "start", `${r.titleAlign}`);
    if (r.text && r.disc && r.desk) {
      /* below 1100px of column the disc drops beneath the text (§2); the column is the desk's width */
      if (r.desk.w >= 1099.5) L.check("QC126-3 the disc is right of the text block", w, r.disc.l >= r.text.r, `disc ${r.disc.l} text ${r.text.r}`);
      else L.check("QC126-3 (column < 1100) the disc drops beneath the text", w, r.disc.t >= r.text.b - 0.5, `disc top ${r.disc.t} text bottom ${r.text.b} (column ${r.desk.w})`);
      if (vp.width >= 1440) {
        const mid = (r.text.l + r.disc.r) / 2, col = (r.desk.l + r.desk.r) / 2;
        L.check("QC126-3 text + disc centred on the content column (±2)", w, near(mid, col, 2), `pair ${mid.toFixed(1)} column ${col.toFixed(1)}`);
      }
    } else L.check("QC126-3 text, disc and desk found", w, false, `${!!r.text} ${!!r.disc} ${!!r.desk}`);
    L.check("QC126-3 no plate on the route", w, r.plates === 0, `${r.plates}`);
    await checkOverflow(page, L, w);
  }
  L.done(30);
});

/* ── QC126-4 · one 40px rhythm ── */
test("QC126-4 · rhythm", async ({ page }) => {
  const L = new Ledger("qc126-4");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    const band = await box(page, '[data-probe="page-header"][data-band]'), desk = await box(page, '[data-qcv="courts"]');
    const cz = await box(page, '[data-qcv="cz-head"]'), czAll = await box(page, '[data-qcv="cz"]'), lb = await box(page, '[data-qcv="lbanner"]');
    L.check("QC126-4 band → desk 40", w, !!band && !!desk && near(desk.t - band.b, 40, 1), `${band && desk ? desk.t - band.b : "—"}`);
    L.check("QC126-4 desk → carousel head 40", w, !!desk && !!cz && near(cz.t - desk.b, 40, 1), `${desk && cz ? cz.t - desk.b : "—"}`);
    L.check("QC126-4 carousel → list banner 40", w, !!czAll && !!lb && near(lb.t - czAll.b, 40, 1), `${czAll && lb ? lb.t - czAll.b : "—"}`);
    await checkOverflow(page, L, w);
  }
  L.done(16);
});

/* ── QC126-5 · the carousel ── */
test("QC126-5 · carousel", async ({ page }) => {
  const L = new Ledger("qc126-5");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const items = [...document.querySelectorAll<HTMLElement>('[data-qcv="cz-item"]')].filter((e) => e.getBoundingClientRect().height > 0 || e.closest('[data-qcv="cz-track"]'));
      const rows = [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].filter((e) => e.getBoundingClientRect().height > 0);
      return { last: items.map((e) => Number(e.dataset.last)), ids: items.map((e) => e.dataset.qid), rowLast: rows.map((e) => Number(e.dataset.last)) };
    });
    L.check("QC126-5 exactly 8 cards", w, r.last.length === 8, `${r.last.length}`);
    L.check("QC126-5 ordered by last moved, descending", w, r.last.length > 1 && r.last.every((v, i) => i === 0 || v <= r.last[i - 1]), r.last.join(","));
    const max = Math.max(...r.rowLast.filter(Number.isFinite));
    L.check("QC126-5 the first card moved most recently", w, r.rowLast.length > 0 && r.last[0] === max, `first ${r.last[0]} max ${max} (rows ${r.rowLast.length})`);
    await checkOverflow(page, L, w);
  }
  L.done(16);
});

/* ── QC126-6 · the desk filters the carousel, never the list ── */
test("QC126-6 · desk ≠ list", async ({ page }) => {
  const L = new Ledger("qc126-6");
  await openQc(page, AT_1512);
  const read = () => page.evaluate(() => ({
    rows: [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.qid),
    bands: [...document.querySelectorAll<HTMLElement>('[data-qcv="gband"]')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.querySelector('[data-qcv="gband-n"]')?.textContent ?? ""),
    cards: document.querySelectorAll('[data-qcv="cz-item"]').length,
    you: Number([...document.querySelectorAll<HTMLElement>('[data-qcv="court"][data-court="you"] [data-qcv="court-count"]')][0]?.textContent ?? NaN),
  }));
  const before = await read();
  L.check("QC126-6 population", "1512", before.rows.length > 8 && before.bands.length > 0, `rows ${before.rows.length} bands ${before.bands.length}`);
  await page.locator('[data-qcv="court"][data-court="you"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const sel = await read();
  L.check("QC126-6 the carousel shows every with-you query", "1512", Number.isFinite(sel.you) && sel.cards === sel.you, `cards ${sel.cards} desk ${sel.you}`);
  L.check("QC126-6 the list's rows and order are identical", "1512", JSON.stringify(sel.rows) === JSON.stringify(before.rows), `${sel.rows.length} vs ${before.rows.length}`);
  L.check("QC126-6 the band counts are identical", "1512", JSON.stringify(sel.bands) === JSON.stringify(before.bands), `${sel.bands} vs ${before.bands}`);
  await page.locator('[data-qcv="court"][data-court="you"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const cleared = await read();
  L.check("QC126-6 clearing restores the 8", "1512", cleared.cards === 8, `${cleared.cards}`);
  await checkOverflow(page, L, "1512");
  L.done(6);
});

/* ── QC126-7 · one card ── */
test("QC126-7 · one card", async ({ page }) => {
  const L = new Ledger("qc126-7");
  await openQc(page, AT_1512);
  const carousel = await page.evaluate(() => [...document.querySelectorAll('[data-qcv="cz-item"]')].map((e) => !!e.querySelector(":scope > .qcard, .qcard")));
  L.check("QC126-7 every carousel card is the app's QueryCard (.qcard)", "1512", carousel.length > 0 && carousel.every(Boolean), JSON.stringify(carousel));
  /* no second card component under queries/: the card-named files are exactly today's */
  /* the card-named components that existed before v126 (captured 5 Oct); a fifth is a fork */
  const KNOWN = new Set(["src/components/queries/PaneCard.tsx", "src/components/queries/QueryCard.tsx", "src/components/queries/QueryEmptyCard.tsx", "src/components/queries/centre/QcOpenCard.tsx"]);
  const found: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/card/i.test(f) && /\.tsx$/.test(f) && !/\.test\./.test(f)) found.push(p); } };
  walk("src/components/queries");
  L.check("QC126-7 no new card component under queries/", "src", found.every((f) => KNOWN.has(f)), JSON.stringify(found));
  await checkOverflow(page, L, "1512");
  L.done(3);
});

/* ── QC126-8 · the workspace ── */
test("QC126-8 · workspace", async ({ page }) => {
  const L = new Ledger("qc126-8");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const lb = vis('[data-qcv="lbanner"]'), hawk = vis('[data-qcv="lhawk"]'), ws = vis('[data-qcv="workspace"]');
      const bands = [...document.querySelectorAll<HTMLElement>('[data-qcv="gband"]')].filter((e) => e.getBoundingClientRect().height > 0);
      const rows = [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].filter((e) => e.getBoundingClientRect().height > 0);
      const gaps: number[] = [];
      for (let i = 1; i < rows.length; i++) { const a = rows[i - 1].getBoundingClientRect(), b = rows[i].getBoundingClientRect(); if (b.top - a.bottom < 30) gaps.push(Math.round((b.top - a.bottom) * 10) / 10); }
      const wsS = ws ? getComputedStyle(ws) : null;
      return {
        lbBg: lb ? getComputedStyle(lb).backgroundColor : null,
        hawkB: hawk?.getBoundingClientRect().bottom ?? null, hawkShown: !!hawk, wsT: ws?.getBoundingClientRect().top ?? null,
        wsBg: wsS?.backgroundColor ?? null, wsRad: wsS?.borderTopLeftRadius ?? null, wsPad: wsS ? [wsS.paddingTop, wsS.paddingLeft, wsS.paddingRight].join(" ") : null,
        bandBg: bands.map((b) => getComputedStyle(b).backgroundColor), counts: bands.map((b) => Number(b.querySelector('[data-qcv="gband-n"]')?.textContent ?? NaN)),
        total: Number(document.querySelector('[data-qcv="lb-total"]')?.getAttribute("data-n") ?? NaN), rows: rows.length, gaps,
      };
    });
    L.check("QC126-8 the banner is open (transparent)", w, r.lbBg === "rgba(0, 0, 0, 0)", `${r.lbBg}`);
    if (vp.width > 1100) L.check("QC126-8 the hawk's feet are 14 below the workspace's top (±2)", w, r.hawkShown && r.wsT !== null && near((r.hawkB ?? NaN) - r.wsT, 14, 2), `hawk ${r.hawkB} ws ${r.wsT}`);
    L.check("QC126-8 blush, radius 22, padding 22", w, r.wsBg === "rgb(244, 224, 212)" && r.wsRad === "22px" && r.wsPad === "22px 22px 22px", `${r.wsBg} ${r.wsRad} ${r.wsPad}`);
    L.check("QC126-8 the group bands are anthracite", w, r.bandBg.length >= 2 && r.bandBg.every((c) => c === "rgb(42, 58, 82)"), JSON.stringify(r.bandBg));
    L.check("QC126-8 the band counts add up to the total", w, r.counts.length >= 2 && Number.isFinite(r.total) && r.counts.reduce((a, b) => a + b, 0) === r.total, `${r.counts} total ${r.total}`);
    L.check("QC126-8 rows are 10px apart", w, r.gaps.length > 3 && r.gaps.every((g) => near(g, 10, 0.6)), JSON.stringify(r.gaps.slice(0, 8)));
    await checkOverflow(page, L, w);
  }
  L.done(26);
});

/* ── QC126-9 · the sticky controls ── */
test("QC126-9 · sticky", async ({ page }) => {
  const L = new Ledger("qc126-9");
  await openQc(page, AT_1512);
  const read = () => page.evaluate(() => {
    const s = [...document.querySelectorAll<HTMLElement>('[data-qcv="lsticky"]')][0] ?? null;
    const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    if (!s || !sc) return { found: !!s, on: false, top: NaN, scTop: NaN, parts: 0 };
    const vis = getComputedStyle(s).visibility !== "hidden" && parseFloat(getComputedStyle(s).opacity) > 0.5 && s.getBoundingClientRect().height > 0;
    return { found: true, on: vis, top: s.getBoundingClientRect().top, scTop: sc.getBoundingClientRect().top,
      parts: ['[data-qcv="find"]', '[data-qcv="pk-filter"]', '[data-qcv="pk-group"]', '[data-qcv="pk-sort"]'].filter((q) => s.querySelector(q)).length };
  });
  const rest = await read();
  L.check("QC126-9 the slim bar exists, hidden at rest", "1512", rest.found && !rest.on, JSON.stringify(rest));
  await page.evaluate(() => { const lb = document.querySelector('[data-qcv="lbanner"]') as HTMLElement | null; const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (lb && sc) sc.scrollTop += lb.getBoundingClientRect().bottom - sc.getBoundingClientRect().top + 80; });
  await page.waitForTimeout(400);
  const on = await read();
  L.check("QC126-9 past the banner, the slim bar shows at the scroller's top", "1512", on.on && near(on.top, on.scTop, 1), JSON.stringify(on));
  L.check("QC126-9 it holds Find, Filter, Group and Sort", "1512", on.parts === 4, `${on.parts}`);
  await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (sc) sc.scrollTop = 0; });
  await page.waitForTimeout(400);
  const back = await read();
  L.check("QC126-9 it hides when the banner returns", "1512", back.found && !back.on, JSON.stringify(back));
  await checkOverflow(page, L, "1512");
  L.done(5);
});

/* ── QC126-10 · full width, rail gone ── */
test("QC126-10 · full width", async ({ page }) => {
  const L = new Ledger("qc126-10");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const ws = [...document.querySelectorAll<HTMLElement>('[data-qcv="workspace"]')].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const row = [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const inner = ws ? ws.getBoundingClientRect().right - parseFloat(getComputedStyle(ws).paddingRight) : NaN;
      return { inner, rowR: row?.getBoundingClientRect().right ?? NaN, rails: document.querySelectorAll('[data-qcv="rail"]').length };
    });
    L.check("QC126-10 row right = the workspace's inner right", w, near(r.rowR, r.inner, 1), `row ${r.rowR} inner ${r.inner}`);
    L.check("QC126-10 no rail in the DOM", w, r.rails === 0, `${r.rails}`);
    await checkOverflow(page, L, w);
  }
  L.done(12);
});

/* ── QC126-11 · the footer ── */
test("QC126-11 · footer", async ({ page }) => {
  const L = new Ledger("qc126-11");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const f = vis('[data-probe="app-footer"]'), fin = vis('[data-probe="app-footer-in"]'), desk = vis('[data-qcv="courts"]'), ws = vis('[data-qcv="workspace"]');
      const txt = f?.textContent ?? "";
      return {
        found: !!f, after: !!f && !!ws && f.getBoundingClientRect().top > ws.getBoundingClientRect().bottom,
        fin: fin ? [fin.getBoundingClientRect().left, fin.getBoundingClientRect().width] : null,
        desk: desk ? [desk.getBoundingClientRect().left, desk.getBoundingClientRect().width] : null,
        glyphs: f?.querySelectorAll('[data-probe="app-footer-glyphs"] svg').length ?? 0,
        cols: f?.querySelectorAll('[data-probe="app-footer-col"]').length ?? 0,
        help: /Help centre/.test(txt), open: /Open QueryHawk/.test(txt), mail: /@/.test(txt), tag: (f?.querySelector('[data-probe="app-footer-tag"]')?.textContent ?? "").length > 20,
      };
    });
    L.check("QC126-11 present after the workspace", w, r.found && r.after, JSON.stringify(r));
    L.check("QC126-11 content box = the desk's x and width (±1)", w, !!r.fin && !!r.desk && near(r.fin[0], r.desk[0], 1) && near(r.fin[1], r.desk[1], 1), `${r.fin} vs ${r.desk}`);
    L.check("QC126-11 tagline, six glyphs, three columns, Help centre (no Open QueryHawk), the email", w, r.tag && r.glyphs === 6 && r.cols === 3 && r.help && !r.open && r.mail, JSON.stringify(r));
    await checkOverflow(page, L, w);
  }
  L.done(16);
});

/* ── QC126-12 · the tab ── */
test("QC126-12 · tab", async ({ page }) => {
  const L = new Ledger("qc126-12");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    const t = await box(page, '[data-qcv="bvd-tab"]'), win = await box(page, ".ws-window");
    L.check("QC126-12 24 from the window box's right and bottom", w, !!t && !!win && near(win.r - t.r, 24, 1) && near(win.b - t.b, 24, 1), `${t && win ? `${win.r - t.r} / ${win.b - t.b}` : "—"}`);
    if (vp.width === 1512) {
      await page.keyboard.press("b");
      await page.waitForTimeout(500);
      const dr = await box(page, '[data-qcv="bvd"]'), t2 = await box(page, '[data-qcv="bvd-tab"]');
      L.check("QC126-12 B opens the drawer", w, !!dr, `${!!dr}`);
      L.check("QC126-12 the tab hides while it is open", w, !t2, `${!!t2}`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(10);
});

/* ── QC126-13 · the drawer ── */
test("QC126-13 · drawer", async ({ page }) => {
  const L = new Ledger("qc126-13");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    await openDrawer(page).catch(() => {});
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const d = vis('[data-qcv="bvd"]'), dim = vis('[data-qcv="bvd-dim"]'), head = vis('[data-qcv="bvd-head"]'), title = vis('[data-qcv="bvd-title"]');
      return { w: d?.getBoundingClientRect().width ?? NaN, dim: dim ? [dim.getBoundingClientRect().width, dim.getBoundingClientRect().height, getComputedStyle(dim).backgroundColor] : null,
        head: head ? getComputedStyle(head).backgroundColor : null, fs: title ? getComputedStyle(title).fontSize : null, innerW: innerWidth };
    });
    const want = Math.min(780, 0.56 * vp.width);
    L.check("QC126-13 width min(780px, 56vw)", w, near(r.w, want, 1), `${r.w} vs ${want}`);
    L.check("QC126-13 the dim covers the page", w, !!r.dim && (r.dim[0] as number) >= r.innerW - 1 && r.dim[2] === "rgba(28, 19, 15, 0.28)", JSON.stringify(r.dim));
    L.check("QC126-13 the header block is anthracite", w, r.head === "rgb(42, 58, 82)", `${r.head}`);
    L.check("QC126-13 the title is 30px (26 under 1400)", w, r.fs === (vp.width < 1400 ? "26px" : "30px"), `${r.fs}`);
    if (r.dim) {
      await page.mouse.click(30, vp.height / 2);
      await page.waitForTimeout(400);
      L.check("QC126-13 a click on the dim closes it", w, !(await box(page, '[data-qcv="bvd"]')), "");
    }
    await checkOverflow(page, L, w);
  }
  L.done(24);
});

/* ── QC126-14 · the header grows downwards only ── */
test("QC126-14 · grows down", async ({ page }) => {
  const L = new Ledger("qc126-14");
  await openQc(page, AT_1512);
  await openDrawer(page).catch(() => {});
  const read = () => page.evaluate(() => {
    const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const h = vis('[data-qcv="bvd-head"]'), t = vis('[data-qcv="bvd-title"]'), k = vis('[data-qcv="bvd-hawk"]'), f = vis('[data-qcv="bvd-fline"]');
    return { h: h?.getBoundingClientRect().height ?? NaN, hb: h?.getBoundingClientRect().bottom ?? NaN, tt: t?.getBoundingClientRect().top ?? NaN, kb: k?.getBoundingClientRect().bottom ?? NaN, fh: f?.getBoundingClientRect().height ?? 0 };
  });
  const a = await read();
  await page.locator('[data-qcv="bvd-pill"][data-k="filter"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
  const chips = page.locator('[data-qcv="bvd-pop"][data-k="filter"] [data-qcv="bvd-chip"]');
  await chips.nth(0).click({ timeout: 4000 }).catch(() => {}); await chips.nth(4).click({ timeout: 4000 }).catch(() => {});
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const b = await read();
  /* the growth is the filter line plus at most its own 16px of spacing — never less than the line */
  L.check("QC126-14 the block grows by the filter line", "1512", b.fh > 0 && b.h - a.h >= b.fh - 0.5 && b.h - a.h <= b.fh + 16, `${a.h} → ${b.h} (line ${b.fh})`);
  L.check("QC126-14 the title's top is unchanged (±0)", "1512", Number.isFinite(a.tt) && b.tt === a.tt, `${a.tt} → ${b.tt}`);
  L.check("QC126-14 the hawk's bottom = the block's bottom", "1512", near(b.kb, b.hb, 0.5) && near(a.kb, a.hb, 0.5), `${a.kb}/${a.hb} → ${b.kb}/${b.hb}`);
  await checkOverflow(page, L, "1512");
  L.done(4);
});

/* ── QC126-15 · the pills' labels ── */
test("QC126-15 · pill labels", async ({ page }) => {
  const L = new Ledger("qc126-15");
  await openQc(page, AT_1512);
  await openDrawer(page).catch(() => {});
  const pill = (k: string) => page.evaluate((kk) => { const p = document.querySelector<HTMLElement>(`[data-qcv="bvd-pill"][data-k="${kk}"]`); return p ? { t: (p.textContent ?? "").replace(/\s+/g, " ").trim(), bg: getComputedStyle(p).backgroundColor } : null; }, k);
  const f0 = await pill("filter"), g0 = await pill("group"), s0 = await pill("sort");
  L.check("QC126-15 Filters", "1512", f0?.t === "Filters", `${f0?.t}`);
  L.check("QC126-15 Grouped: Urgency", "1512", g0?.t === "Grouped: Urgency", `${g0?.t}`);
  L.check("QC126-15 Sort: Due date", "1512", s0?.t === "Sort: Due date", `${s0?.t}`);
  await page.locator('[data-qcv="bvd-pill"][data-k="filter"]').first().click({ timeout: 4000 }).catch(() => {});
  const chips = page.locator('[data-qcv="bvd-pop"][data-k="filter"] [data-qcv="bvd-chip"]');
  await chips.nth(0).click({ timeout: 4000 }).catch(() => {}); await chips.nth(4).click({ timeout: 4000 }).catch(() => {});
  await page.keyboard.press("Escape");
  await page.locator('[data-qcv="bvd-pill"][data-k="group"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.locator('[data-qcv="bvd-pop"][data-k="group"] [data-v="stage"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.locator('[data-qcv="bvd-pill"][data-k="sort"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.locator('[data-qcv="bvd-pop"][data-k="sort"] [data-v="agent"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
  const f1 = await pill("filter"), g1 = await pill("group"), s1 = await pill("sort");
  L.check("QC126-15 Filters (2)", "1512", f1?.t === "Filters (2)", `${f1?.t}`);
  L.check("QC126-15 Grouped: Stage", "1512", g1?.t === "Grouped: Stage", `${g1?.t}`);
  L.check("QC126-15 Sort: Agent", "1512", s1?.t === "Sort: Agent", `${s1?.t}`);
  L.check("QC126-15 non-default pills fill cream", "1512", [f1, g1, s1].every((p) => p?.bg === "rgb(245, 241, 235)") && f0?.bg !== "rgb(245, 241, 235)", JSON.stringify([f0?.bg, f1?.bg, g1?.bg, s1?.bg]));
  await checkOverflow(page, L, "1512");
  L.done(8);
});

/* ── QC126-16 · the time control ── */
test("QC126-16 · time control", async ({ page }) => {
  const L = new Ledger("qc126-16");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    await openDrawer(page).catch(() => {});
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const t = vis('[data-qcv="bvd-time"]'), d = vis('[data-qcv="bvd-dates"]');
      const labels = d ? [...d.querySelectorAll<HTMLElement>('[data-qcv="bvd-date"]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect().left) : [];
      const visibleLabels = labels.filter((x) => t ? x >= t.getBoundingClientRect().right : true);
      return { t: t ? t.getBoundingClientRect().toJSON() : null, d: d ? d.getBoundingClientRect().toJSON() : null, firstLabel: visibleLabels.length ? Math.min(...visibleLabels) : NaN,
        text: (t?.textContent ?? "").replace(/\s+/g, ""), sep: !!t?.querySelector('[data-qcv="bvd-sep"]'), today: !!t?.querySelector('[data-qcv="bvd-today"]') };
    });
    L.check("QC126-16 the pill sits in the date row's corner", w, !!r.t && !!r.d && r.t.top >= r.d.top - 0.5 && r.t.bottom <= r.d.bottom + 0.5, `${JSON.stringify(r.t)} in ${JSON.stringify(r.d)}`);
    L.check("QC126-16 left of the first date label, no overlap", w, !!r.t && r.t.right <= r.firstLabel, `pill r ${r.t?.right} first ${r.firstLabel}`);
    L.check("QC126-16 6W 3M 6M, a separator, ‹ ⌖ ›", w, /6W3M6M/.test(r.text) && r.sep && r.today && /‹/.test(r.text) && /›/.test(r.text), `${r.text} sep ${r.sep} today ${r.today}`);
    if (vp.width === 1512) {
      const bg = () => page.evaluate(() => { const b = document.querySelector<HTMLElement>('[data-qcv="bvd-today"]'); return b ? getComputedStyle(b).backgroundColor : null; });
      await page.locator('[data-qcv="bvd-later"]').first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(300);
      L.check("QC126-16 away from today, the crosshair fills anthracite", w, (await bg()) === INK, `${await bg()}`);
      await page.keyboard.press("t");
      await page.waitForTimeout(300);
      L.check("QC126-16 T returns it to transparent", w, (await bg()) === "rgba(0, 0, 0, 0)", `${await bg()}`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(18);
});

/* ── QC126-17 · the bars ── */
test("QC126-17 · bars", async ({ page }) => {
  const L = new Ledger("qc126-17");
  for (const vp of WIDTHS) {
    await openQc(page, vp);
    const w = `${vp.width}`;
    await openDrawer(page).catch(() => {});
    const r = await page.evaluate(() => {
      const today = document.querySelector<HTMLElement>('[data-qcv="bvd-todayline"]');
      const tx = today ? today.getBoundingClientRect().left + today.getBoundingClientRect().width / 2 : NaN;
      const over = [...document.querySelectorAll<HTMLElement>('[data-qcv="bvd-row"][data-att="overdue"] [data-qcv="bvd-bar"]')].filter((e) => e.getBoundingClientRect().width > 0);
      const inks = over.map((b) => [...b.querySelectorAll<HTMLElement>("*")].filter((e) => getComputedStyle(e).backgroundColor === "rgb(28, 19, 15)").length);
      const beacons = over.map((b) => { const k = b.querySelector<HTMLElement>('[data-qcv="bvd-beacon"]'); if (!k) return NaN; const x = k.getBoundingClientRect(); return x.left + x.width / 2; });
      const run = [...document.querySelectorAll<HTMLElement>('[data-qcv="bvd-row"]:not([data-att="overdue"]) [data-qcv="bvd-bar"]')].filter((e) => e.getBoundingClientRect().width > 0 && e.querySelector('[data-part="after"]'));
      const solidEnd = run.map((b) => b.querySelector<HTMLElement>('[data-part="solid"]')?.getBoundingClientRect().right ?? NaN);
      const afterOp = run.map((b) => { const a = b.querySelector<HTMLElement>('[data-part="after"]')!; return parseFloat(getComputedStyle(a).opacity); });
      return { tx, over: over.length, inks, beacons, run: run.length, solidEnd, afterOp };
    });
    L.check("QC126-17 population: overdue and running bars", w, r.over > 0 && r.run > 0 && Number.isFinite(r.tx), `over ${r.over} run ${r.run} today ${r.tx}`);
    L.check("QC126-17 no ink inside an overdue bar", w, r.inks.length > 0 && r.inks.every((n) => n === 0), JSON.stringify(r.inks));
    L.check("QC126-17 each overdue beacon is within 12px of today", w, r.beacons.length > 0 && r.beacons.every((x) => Math.abs(x - r.tx) <= 12), JSON.stringify(r.beacons.map((x) => Math.round(x - r.tx))));
    L.check("QC126-17 a running bar's solid part ends at today", w, r.solidEnd.length > 0 && r.solidEnd.every((x) => Math.abs(x - r.tx) <= 2), JSON.stringify(r.solidEnd.map((x) => Math.round(x - r.tx))));
    L.check("QC126-17 and the part after today is .42", w, r.afterOp.length > 0 && r.afterOp.every((o) => near(o, 0.42, 0.01)), JSON.stringify(r.afterOp));
    await checkOverflow(page, L, w);
  }
  L.done(24);
});

/* ── QC126-18 · the Escape ladder ── */
test("QC126-18 · Escape ladder", async ({ page }) => {
  const L = new Ledger("qc126-18");
  await openQc(page, AT_1512);
  const has = (s: string) => page.evaluate((ss) => [...document.querySelectorAll<HTMLElement>(ss)].some((e) => e.getBoundingClientRect().height > 0), s);
  /* (a) a popover, then the drawer */
  await openDrawer(page).catch(() => {});
  await page.locator('[data-qcv="bvd-pill"][data-k="filter"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);
  L.check("QC126-18a precondition: drawer and popover open", "1512", (await has('[data-qcv="bvd"]')) && (await has('[data-qcv="bvd-pop"]')), "");
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  L.check("QC126-18a first Escape closes only the popover", "1512", !(await has('[data-qcv="bvd-pop"]')) && (await has('[data-qcv="bvd"]')), "");
  await page.keyboard.press("Escape"); await page.waitForTimeout(350);
  L.check("QC126-18a second Escape closes the drawer", "1512", !(await has('[data-qcv="bvd"]')), "");
  /* (b) drawer → a bar's card → the card's action */
  await openDrawer(page).catch(() => {});
  /* corrected (Phase 7): a long bar's centre lies under the sticky names column, so a click there is
     intercepted; the names cell is the other reading door §7 names */
  await page.locator('[data-qcv="bvd-row"] [data-qcv="tl-names"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.locator('[data-qcv="qm-card"] .qcv-open-act' /* corrected (Phase 7): see QC126-20 */).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(600);
  L.check("QC126-18b precondition: Birds-eye, card (docked) and action drawer open", "1512",
    (await has('[data-qcv="bvd"]')) && (await has("[data-qad-drawer]")) && (await has("[data-qad-dock]")), "");
  await page.keyboard.press("Escape"); await page.waitForTimeout(450);
  L.check("QC126-18b Escape closes the action drawer, the card returns", "1512", !(await has("[data-qad-drawer]")) && (await has('[data-qcv="qm-card"]')), "");
  await page.keyboard.press("Escape"); await page.waitForTimeout(350);
  L.check("QC126-18b then the card", "1512", !(await has('[data-qcv="qm-card"]')) && (await has('[data-qcv="bvd"]')), "");
  await page.keyboard.press("Escape"); await page.waitForTimeout(350);
  L.check("QC126-18b then the Birds-eye drawer", "1512", !(await has('[data-qcv="bvd"]')), "");
  await checkOverflow(page, L, "1512");
  L.done(8);
});

/* ── QC126-19 · sort and group ── */
const STAGE_ORDER = ["Queried", "Partial requested", "Partial sent", "Full requested", "Full sent", "Revise & resubmit", "Resubmitted", "Offer", "Signed", "Passed", "Closed with no reply", "Withdrawn"];
test("QC126-19 · sort + group", async ({ page }) => {
  const L = new Ledger("qc126-19");
  await openQc(page, AT_1512);
  await openDrawer(page).catch(() => {});
  const pick = async (k: string, v: string) => { await page.locator(`[data-qcv="bvd-pill"][data-k="${k}"]`).first().click({ timeout: 4000 }).catch(() => {}); await page.locator(`[data-qcv="bvd-pop"][data-k="${k}"] [data-v="${v}"]`).first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(300); };
  const groups = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="bvd-group"]')].filter((e) => e.getBoundingClientRect().height > 0).map((g) => ({
    label: g.querySelector('[data-qcv="bvd-glabel"]')?.textContent?.trim() ?? "", rows: [] as string[] })));
  const rowsByGroup = () => page.evaluate(() => {
    const out: { g: string; rows: string[] }[] = [];
    for (const e of document.querySelectorAll<HTMLElement>('[data-qcv="bvd-group"], [data-qcv="bvd-row"]')) {
      if (e.getBoundingClientRect().height === 0) continue;
      if (e.dataset.qcv === "bvd-group") out.push({ g: e.querySelector('[data-qcv="bvd-glabel"]')?.textContent?.trim() ?? "", rows: [] });
      else (out[out.length - 1] ?? (out.push({ g: "", rows: [] }), out[0])).rows.push(e.dataset.qid ?? "");
    }
    return out;
  });
  await pick("group", "stage");
  const g = await groups();
  const idx = g.map((x) => STAGE_ORDER.findIndex((s) => x.label.toLowerCase().startsWith(s.toLowerCase())));
  L.check("QC126-19 grouped by Stage, headings in pipeline order", "1512", g.length > 1 && idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1])), JSON.stringify(g.map((x) => x.label)));
  const a = await rowsByGroup();
  await page.locator('[data-qcv="bvd-dir"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
  const b = await rowsByGroup();
  const reversed = a.length > 0 && a.length === b.length && a.every((x, i) => x.g === b[i].g && JSON.stringify([...x.rows].reverse()) === JSON.stringify(b[i].rows));
  L.check("QC126-19 the direction toggle reverses rows within each group", "1512", reversed && a.some((x) => x.rows.length > 1), JSON.stringify({ a: a.map((x) => x.rows.length), b: b.map((x) => x.rows.length) }));
  await pick("sort", "moved");
  const title = await page.evaluate(() => document.querySelector<HTMLElement>('[data-qcv="bvd-dir"]')?.getAttribute("title") ?? "");
  L.check("QC126-19 Last moved sets most recent first", "1512", /Most recent first/i.test(title), title);
  await page.locator('[data-qcv="bvd-time"] [data-z="6m"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
  const g2 = await groups();
  L.check("QC126-19 the grouping survives a zoom change", "1512", JSON.stringify(g2.map((x) => x.label)) === JSON.stringify(g.map((x) => x.label)), JSON.stringify(g2.map((x) => x.label)));
  await pick("group", "none");
  const g3 = await groups();
  const rowsNone = await page.evaluate(() => [...document.querySelectorAll('[data-qcv="bvd-row"]')].filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).length);
  L.check("QC126-19 No grouping leaves one list with no visible band", "1512", g3.length === 0 && rowsNone > 3, `${g3.length} groups, ${rowsNone} rows`);
  await checkOverflow(page, L, "1512");
  L.done(6);
});

/* ── QC126-20 · one door ── */
test("QC126-20 · one door", async ({ page }) => {
  const L = new Ledger("qc126-20");
  const MODES = new Set(["resp", "nudge", "sent", "offer", "close", "edit", "log"]);
  const drawer = () => page.evaluate(() => {
    const d = [...document.querySelectorAll<HTMLElement>("[data-qad-drawer]")].find((e) => e.getBoundingClientRect().height > 0);
    const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter((e) => e.getBoundingClientRect().height > 0 && !e.hasAttribute("data-qad-drawer") && !e.closest('[data-qcv="qm"]') && !e.closest('[data-qcv="bvd"]') && !e.closest('[data-qcv="guide"]'));
    /* the page guide is a standing non-modal card (role="dialog", once per writer) — not a dialog an action opened */
    return { mode: d?.getAttribute("data-qad-drawer") ?? null, dock: !!document.querySelector("[data-qad-dock]"), others: dialogs.length };
  });
  const closeAll = async () => { for (let i = 0; i < 4; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(200); } };
  await openQc(page, AT_1512);
  /* the card's footer button */
  await page.locator('[data-qcv="row"]').first().click({ timeout: 8000 });
  await page.waitForTimeout(500);
  await page.locator('[data-qcv="qm-card"] .qcv-open-act' /* corrected (Phase 7): the card's primary door; `.qcv-open-actions` named no element */).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const c = await drawer();
  L.check("QC126-20 the card's footer opens the drawer, with dock", "1512", !!c.mode && MODES.has(c.mode) && c.dock && c.others === 0, JSON.stringify(c));
  await closeAll();
  /* a row's tray action */
  await page.locator('[data-qcv="row"]').first().hover({ timeout: 8000 }).catch(() => {});
  await page.locator('[data-qcv="row"] [data-qcv="row-act"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const t = await drawer();
  L.check("QC126-20 a row's tray action opens the drawer", "1512", !!t.mode && MODES.has(t.mode) && t.others === 0, JSON.stringify(t));
  await closeAll();
  /* a carousel card's footer button */
  await page.locator('[data-qcv="cz-item"] [data-qcv="cz-act"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const z = await drawer();
  L.check("QC126-20 a carousel card's button opens the drawer", "1512", !!z.mode && MODES.has(z.mode) && z.others === 0, JSON.stringify(z));
  await closeAll();
  /* a Birds-eye row's button */
  await openDrawer(page).catch(() => {});
  await page.locator('[data-qcv="bvd-row"] [data-qcv="bvd-act"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const e = await drawer();
  L.check("QC126-20 a Birds-eye row's button opens the drawer", "1512", !!e.mode && MODES.has(e.mode) && e.others === 0, JSON.stringify(e));
  await closeAll();
  await checkOverflow(page, L, "1512");
  L.done(5);
});
