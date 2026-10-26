/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25 (design-refs/contact-list-v25/) — CL25 A1–F1, on the rendered page at 1512 × 900 and 1280 × 800 with
 * the shell (E1 also at 2560 × 1440). `glanceCards` and the count line are unit locks (src/lib/contactV25.test.ts).
 * L1 is the existing suites (CL24, QC150, QC1501, QC1492, QC149, QC149-L0, HR1), run beside this one.
 *
 * ⚠️ EVERY LOCK PROVES ITS POPULATION IS NON-ZERO BEFORE IT ASSERTS ANYTHING (a probe that finds nothing passes).
 * ⚠️ RED FIRST: `CL25_BASE=1` against the build before v25 (the locks find nothing of v25 and record readings rather
 *    than hang); `CL25_MUTATE=<lock>` applies that lock's named break in the page (CSS or DOM), or, for B2 and F1,
 *    against a build carrying the mutation (see the report).
 * ⚠️ F1's n IS READ FROM FIRESTORE (cl25QueriesByBook.mjs), never from the page it checks.
 */
import { test, type Page } from "@playwright/test";
import { BASE, Ledger, MUT, SIZES, box, mutate, mutateJs, openCl24, openQc149, scrollTo, sheetW } from "./cl25Lib";

const T = { timeout: 8000 };
const near = (a: number | undefined | null, b: number | undefined | null, d = 1) => a != null && b != null && Math.abs(a - b) <= d;
const f1 = (n: number | undefined | null) => (n == null ? "—" : n.toFixed(1));

/** every visible match: its box and data */
async function all(page: Page, sel: string) {
  return page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0).map((e) => {
    const r = e.getBoundingClientRect();
    return { k: e.dataset.k ?? "", n: e.dataset.n ?? "", more: e.dataset.more ?? "", l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, text: (e.textContent ?? "").trim() };
  }), sel);
}
/** the list's rows by group (grouped by status: every row sits under its group's key) */
async function rowsByGroup(page: Page) {
  return page.evaluate(() => {
    const out: Record<string, number> = {};
    for (const g of document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='group']")) {
      if (!g.getBoundingClientRect().height) continue;
      out[g.dataset.k ?? ""] = g.querySelectorAll("[data-cl24='row']").length;
    }
    return out;
  });
}

/* ═════════ A · the page and the header ═════════ */
test("CL25-A1 A2 · the doodle sheet, the banner and chips gone, the highlighter; the card at the Query Centre's values", async ({ page }) => {
  test.setTimeout(300_000);
  const A1 = new Ledger("A1"), A2 = new Ledger("A2");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openQc149(page, vp);
    const qc = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>(".qc149-card")].find((e) => e.offsetWidth);
      const a = c?.querySelector<HTMLElement>(".phc-art")?.getBoundingClientRect();
      const cs = c ? getComputedStyle(c) : null;
      return cs ? { pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat), artW: a?.width ?? null, artH: a?.height ?? null } : null;
    });
    await openCl24(page, vp);
    await mutateJs(page, "A1", () => {
      const h = [...document.querySelectorAll<HTMLElement>("[data-cl25='header']")].find((e) => e.offsetWidth);
      const d = document.createElement("div"); d.className = "pab"; d.dataset.cl24 = "banner"; d.textContent = "List health is 69%."; d.style.cssText = "height:60px;background:#fbe9e2";
      h?.appendChild(d);
    });
    await mutate(page, "A2", ".cl25-hd .cl25-card.phc.phc.phc.phc { padding: 30px 40px 32px !important; }");
    const cl = await page.evaluate(() => {
      const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg > .wpg-scroll")].find((e) => e.offsetWidth);
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0).length;
      const hl = [...document.querySelectorAll<HTMLElement>("[data-cl25='hl']")].find((e) => e.offsetWidth);
      const c = [...document.querySelectorAll<HTMLElement>("[data-cl25='hd-card']")].find((e) => e.offsetWidth);
      const a = c?.querySelector<HTMLElement>(".phc-art")?.getBoundingClientRect();
      const cs = c ? getComputedStyle(c) : null;
      return {
        scroller: !!sc, bg: sc ? getComputedStyle(sc).backgroundImage : "",
        banner: vis(".aglist [data-cl24='banner'], .aglist .pab"), chips: vis(".aglist [data-cl24='view'], .aglist [data-cl24='views-row']"),
        hl: hl ? getComputedStyle(hl).backgroundImage : "",
        pad: cs ? [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat) : null, artW: a?.width ?? null, artH: a?.height ?? null,
      };
    });
    A1.check(`${at} population`, cl.scroller, `the page's scroller ${cl.scroller ? "found" : "missing"}`);
    A1.check(`${at} doodle`, cl.bg.includes("/images/contact/doodle-tile.svg") && !cl.bg.includes("/images/qc/"), `background ${cl.bg.slice(0, 90)}`);
    A1.check(`${at} no banner`, cl.banner === 0, `${cl.banner} banner(s) visible`);
    A1.check(`${at} no chips`, cl.chips === 0, `${cl.chips} chip(s) or a view row visible`);
    A1.check(`${at} highlighter`, cl.hl.includes("rgb(227, 232, 239)"), `highlighter ${cl.hl.slice(0, 100)}`);
    A2.check(`${at} population`, !!qc && !!cl.pad, `QC card ${qc ? "found" : "missing"}, CL card ${cl.pad ? "found" : "missing"}`);
    if (qc && cl.pad) {
      A2.check(`${at} padding`, qc.pad.every((v, i) => near(v, cl.pad![i])), `QC ${qc.pad.join("/")} · CL ${cl.pad.join("/")}`);
      A2.check(`${at} art box`, near(qc.artW, cl.artW) && near(qc.artH, cl.artH), `QC ${f1(qc.artW)}×${f1(qc.artH)} · CL ${f1(cl.artW)}×${f1(cl.artH)}`);
    }
    /* full screen: no doodle on the sheet */
    await openCl24(page, vp, { full: true });
    const fbg = await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg > .wpg-scroll")].find((e) => e.offsetWidth); return sc ? getComputedStyle(sc).backgroundImage : "missing"; });
    A1.check(`${at} full screen`, fbg === "none", `full-screen sheet background ${fbg.slice(0, 80)}`);
  }
  A1.done(BASE ? 0 : 12);
  A2.done(BASE ? 0 : 6);
});

/* ═════════ B · At a glance ═════════
   ⚠️ RETIRED BY CONTACT LIST v25.1 A: v25 B's four tinted-head cards are replaced by one ledger card, held by CL251-A1
   (four equal cells, no gap, rules between, shown + N) and CL251-A2 (Querying = Your move + With the agent, pressed pale
   with a navy bar, a second press shows all, List health opens Housekeeping). */

/* ═════════ C · the list title ═════════ */
test("CL25-C1 · the title and count line on the list's left; the switch at its right, level with the count line", async ({ page }) => {
  test.setTimeout(240_000);
  const C1 = new Ledger("C1");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutate(page, "C1", ".clv-group .cl25-lt .qc150-ltt { justify-content: center !important; } .clv-group .cl25-lt .qc150-ltt::before { content: '' !important; flex: 1 1 0; } .clv-group .cl25-lt .qc150-lts { text-align: center !important; }");
    const sheet = await box(page, "[data-cl24='sheet']");
    const title = await box(page, "[data-cl25='title-text']");
    const line = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>("[data-cl25='count-line']")].find((e) => e.offsetWidth);
      if (!p) return null;
      const r = document.createRange(); r.selectNodeContents(p);
      const rs = [...r.getClientRects()].filter((x) => x.width > 0);
      return rs.length ? { l: Math.min(...rs.map((x) => x.left)), b: Math.max(...rs.map((x) => x.bottom)), pb: p.getBoundingClientRect().bottom } : null;
    });
    const sw = await box(page, "[data-cl25='switch']");
    const inBar = await page.evaluate(() => [...document.querySelectorAll("[data-cl24='bar']")].some((b) => !!b.querySelector("[data-cl25='switch'], [data-cl24='switch'], [data-cl24='view-tab']")));
    C1.check(`${at} population`, !!sheet && !!title && !!line && !!sw, `sheet ${!!sheet} title ${!!title} line ${!!line} switch ${!!sw}`);
    if (sheet && title && line && sw) {
      C1.check(`${at} title left`, near(title.l, sheet.l), `title ${f1(title.l)} · list ${f1(sheet.l)}`);
      C1.check(`${at} count line left`, near(line.l, sheet.l), `count line ink ${f1(line.l)} · list ${f1(sheet.l)}`);
      C1.check(`${at} switch right`, near(sw.r, sheet.r), `switch ${f1(sw.r)} · list ${f1(sheet.r)}`);
      C1.check(`${at} switch foot`, near(sw.b, line.pb, 2), `switch bottom ${f1(sw.b)} · count line bottom ${f1(line.pb)}`);
    }
    C1.check(`${at} not in the bar`, !inBar, `a switch ${inBar ? "is" : "is not"} in the navy bar`);
  }
  C1.done(BASE ? 0 : 12);
});

/* ═════════ D · one width; the bar ═════════ */
test("CL25-D1 D2 · one width for every block; the bar's order, its typewriter, no prefixes, the 18px group icon", async ({ page }) => {
  test.setTimeout(240_000);
  const D1 = new Ledger("D1"), D2 = new Ledger("D2");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutate(page, "D1", ".clv-group[data-v24][data-v25].clv-group { --cl24-w: calc(min(calc(var(--hsheet-w) - 64px), 1136px) - 2 * var(--cl24-in)) !important; --cl24-list: min(calc(var(--hsheet-w) - 64px), 1136px) !important; }");
    /* ⚠️ the break must out-rank v25's own typewriter rule (0-4-1, !important) or it never applies */
    await mutate(page, "D2", ".clv-group[data-v25] .cl24-sheet .cl24-bar .cl24-ch--fil.cl24-ch--fil.cl24-ch--fil, .clv-group[data-v25] .cl24-sheet .cl24-bar .cl24-ch--fil.cl24-ch--fil.cl24-ch--fil * { font-family: Georgia, serif !important; }");
    const S = await sheetW(page);
    const W = Math.min(S - 48, 1200);
    const b = {
      card: await box(page, "[data-cl25='hd-card']"), /* re-pointed (v25.1 A): At a glance is the ledger */ glance: await box(page, "[data-cl251='glance']"),
      title: await box(page, "[data-cl25='title']"), sheet: await box(page, "[data-cl24='sheet']"),
    };
    const got = Object.entries(b).filter(([, v]) => v);
    D1.check(`${at} population`, got.length === 4, `${got.length} of 4 blocks found`);
    D1.check(`${at} lefts`, got.every(([, v]) => near(v!.l, b.sheet?.l)), got.map(([k, v]) => `${k} ${f1(v!.l)}`).join(" · "));
    D1.check(`${at} rights`, got.every(([, v]) => near(v!.r, b.sheet?.r)), got.map(([k, v]) => `${k} ${f1(v!.r)}`).join(" · "));
    D1.check(`${at} width`, near(b.sheet?.w, W), `list ${f1(b.sheet?.w)} against min(S − 48, 1200) = ${f1(W)} (S ${f1(S)})`);

    const bar = await page.evaluate(() => {
      const el = [...document.querySelectorAll<HTMLElement>("[data-cl24='bar']")].find((e) => e.offsetWidth);
      if (!el) return null;
      const x = (s: string) => el.querySelector<HTMLElement>(s)?.getBoundingClientRect().left ?? null;
      const order = [x("[data-cl25='find']"), x("[data-cl24='filters']"), x("[data-cl24='group']"), x("[data-cl24='sort']"), x("[data-cl24='full']")];
      const els = [...el.querySelectorAll<HTMLElement>("button, input, b, span, em, i, small, label")].filter((e) => e.getBoundingClientRect().width > 0);
      const bad = els.map((e) => ({ t: e.tagName + "." + e.className, f: getComputedStyle(e).fontFamily, s: getComputedStyle(e).fontStyle }))
        .filter((r) => !/Special Elite/.test(r.f) || r.s !== "normal");
      const inp = el.querySelector<HTMLInputElement>("input");
      const ph = inp ? getComputedStyle(inp, "::placeholder") : null;
      const words = (el.innerText || "");
      const gic = el.querySelector<SVGElement>("[data-cl24='group'] svg.gic")?.getBoundingClientRect();
      return { order, n: els.length, bad, ph: ph ? `${ph.fontFamily}|${ph.fontStyle}` : "none", prefix: /Grouped by|Sorted by/.test(words), gic: gic ? [gic.width, gic.height] : null };
    });
    D2.check(`${at} population`, !!bar && bar.n > 0, `${bar?.n ?? 0} elements in the bar`);
    if (bar) {
      const o = bar.order;
      D2.check(`${at} order`, o.every((v) => v != null) && o.every((v, i) => i === 0 || v! > o[i - 1]!), `find ${o.map((v) => f1(v)).join(" < ")} (search · Filters · group · sort · Full screen)`);
      D2.check(`${at} typewriter`, bar.bad.length === 0, bar.bad.length ? bar.bad.slice(0, 3).map((r) => `${r.t} ${r.f.slice(0, 20)} ${r.s}`).join("; ") : `all ${bar.n} Special Elite, upright`);
      D2.check(`${at} placeholder`, /Special Elite/.test(bar.ph) && /normal/.test(bar.ph), `placeholder ${bar.ph.slice(0, 50)}`);
      D2.check(`${at} no prefixes`, !bar.prefix, `"Grouped by"/"Sorted by" ${bar.prefix ? "shown" : "absent"}`);
      D2.check(`${at} group icon`, !!bar.gic && near(bar.gic[0], 18, 0.5) && near(bar.gic[1], 18, 0.5), `group icon ${bar.gic?.map(f1).join("×") ?? "missing"}`);
    }
  }
  D1.done(BASE ? 0 : 8);
  D2.done(BASE ? 0 : 12);
});

/* ═════════ E · full screen's cap ═════════ */
test("CL25-E1 · at 2560 the book is ≤1600 and centred, the band spans the sheet, the archivist at G + 22; at 1512 nothing moves", async ({ page }) => {
  test.setTimeout(240_000);
  const E1 = new Ledger("E1");
  for (const vp of [{ width: 2560, height: 1440 }, { width: 1512, height: 900 }]) {
    const at = `${vp.width}`;
    await openCl24(page, vp, { full: true });
    await mutate(page, "E1", ".cl24-ab .cl24-fsb.cl24-fsb { max-width: none !important; } .cl24-ab .cl24-fband.cl24-fband { padding-left: 250px !important; } .cl24-ab .cl24-fart.cl24-fart { left: 22px !important; }");
    const m = await page.evaluate(() => {
      const b = (s: string) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.offsetWidth); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width }; };
      const ab = [...document.querySelectorAll<HTMLElement>(".cl24-ab")].find((x) => x.offsetWidth);
      return { ab: b(".cl24-ab"), band: b(".cl24-fband"), fsb: b(".cl24-fsb"), art: b(".cl24-fart"), tight: !!ab?.classList.contains("tight") };
    });
    E1.check(`${at} population`, !!m.ab && !!m.band && !!m.fsb && !!m.art, `book ${!!m.ab} band ${!!m.band} body ${!!m.fsb} art ${!!m.art}`);
    if (!m.ab || !m.band || !m.fsb || !m.art) continue;
    const G = Math.max(0, (m.ab.w - 1600) / 2);
    E1.check(`${at} book width`, m.fsb.w <= 1600.5, `book ${f1(m.fsb.w)}`);
    E1.check(`${at} centred`, near(m.fsb.l - m.ab.l, m.ab.r - m.fsb.r), `left gap ${f1(m.fsb.l - m.ab.l)} · right gap ${f1(m.ab.r - m.fsb.r)}`);
    E1.check(`${at} band spans`, near(m.band.l, m.ab.l) && near(m.band.r, m.ab.r), `band ${f1(m.band.l)}–${f1(m.band.r)} · sheet ${f1(m.ab.l)}–${f1(m.ab.r)}`);
    const inset = m.tight ? 16 : 22;
    E1.check(`${at} archivist`, near(m.art.l, m.ab.l + G + inset, 2), `archivist ${f1(m.art.l)} against ${f1(m.ab.l + G + inset)} (G ${f1(G)}${m.tight ? ", tight" : ""})`);
    if (vp.width === 1512) E1.check(`${at} unmoved`, near(m.fsb.l, m.ab.l) && near(m.fsb.r, m.ab.r) && G === 0, `book ${f1(m.fsb.l)}–${f1(m.fsb.r)} fills the sheet ${f1(m.ab.l)}–${f1(m.ab.r)}`);
  }
  E1.done(BASE ? 0 : 11);
});

/* ═════════ F · the drawers' moment ═════════
   ⚠️ RETIRED BY CONTACT LIST v25.1 B: the cream panel ("query no. {n}", "Someone wrote back.") is replaced by the flow's
   header, held by CL251-B1 (Logging new query, on both pages, surviving an agent), B2 (Recording response and the four
   answer lines) and B3 (Adding new agent). cl25QueriesByBook.mjs is kept for the record. */
