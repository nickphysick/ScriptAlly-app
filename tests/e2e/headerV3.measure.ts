/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Header v3 (design-refs/shell/header-v3-qc.html, `.ohdr`) — the HV3 locks, on the rendered page at 1512 × 900 and
 * 1280 × 800 (both are the compact size: the page sheet is under 1440).
 *
 * H1 panel · H2 number · H3 counts · H4 title pages · H5 removed · H6 drawing · H7 height · H8 no jump ·
 * H9 spacing · H10 above the fold · H11 out of scope.
 *
 * Each was red by its named mutation (`HV3_MUTATE=<lock>`, MUTATIONS below: one named thing broken IN THE PAGE)
 * before its green was believed: reports/header-v3/mutation-proofs.json.
 *
 * ⚠️ H11's "equal to the baseline" IS A CAPTURE OF THE BUILD BEFORE THE PACK, never typed: `HV3_CAPTURE=1` against a
 *    build of the base (qc-v136, 6647b765) writes tests/e2e/fixtures/hv3-outofscope.json.
 * ⚠️ THE EMPTY STATES are held at unit (src/components/shell/pageHeaderPanel.test.tsx, msv21Smoke.test.tsx, qcCentre.test.tsx): the harness account has
 *    queries, agents and a manuscript, so no rendered page can show one.
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { KILL, SIZES, near, open } from "./hp2Lib";

const DIR = "reports/header-v3";
const BASELINE = "tests/e2e/fixtures/hv3-outofscope.json";
const PANEL_BG = "rgb(45, 58, 80)";
/** §0.3, as filled in: the pages whose header leads with a count, and the pages that lead with a title. */
export const NUMBER = ["/queries", "/agents", "/manuscripts/comps", "/manuscripts/packages", "/todo"] as const;
export const TITLE = ["/queries/analytics", "/agents/discover", "/manuscripts", "/todo/calendar", "/todo/noteboard"] as const;
const ALL = [...NUMBER, ...TITLE];
const OUT_OF_SCOPE = ["/dashboard", "/account", "/help", "/plans", "/import"] as const;
/** the words after each number (the plural; a count of one reads its singular) */
const WORDS: Record<string, RegExp> = {
  "/queries": /^quer(y|ies) sent$/, "/agents": /^agents? on file$/, "/manuscripts/comps": /^comp titles?$/,
  "/manuscripts/packages": /^packages?$/, "/todo": /^things? to do$/,
};
/** what each page's own body counts, for H3: a selector whose visible matches are the count, or a reader */
const ROWS: Record<string, string> = { "/manuscripts/comps": '[data-cpv="comp"]', "/manuscripts/packages": '[data-ppv="pkg"]' };

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* restore v136's open header on /queries: no surface, a ruled corner */
  H1: { css: `[data-qcv="open-header"].hp3 { background: transparent !important; border: 0 !important; border-left: 3px solid #2a3a52 !important; border-radius: 0 !important; margin-top: 0 !important; }` },
  /* the subline inside the h1 */
  H2: { js: `document.querySelectorAll(".hp3 .hp3-tb").forEach((tb) => { const h = tb.querySelector("h1"), s = tb.querySelector(":scope > .hp3-s"); if (h && s) h.appendChild(s); });` },
  /* hard-code 27 */
  H3: { js: `document.querySelectorAll('.hp3 [data-hp3-part="number"]:not(.hp3-blank)').forEach((n) => { if (n.textContent !== "27") n.textContent = "27"; });` },
  /* render a number on Analytics */
  H4: { js: `if (location.pathname === "/queries/analytics") document.querySelectorAll(".hp3 h1.hp3-title").forEach((h) => { if (h.querySelector("[data-hp3-part='number']")) return; const n = document.createElement("span"); n.setAttribute("data-hp3-part", "number"); n.textContent = "12"; h.prepend(n); });` },
  /* restore the stamp */
  H5: { js: `document.querySelectorAll(".hp3 .hp3-txt").forEach((t) => { if (t.querySelector(".hpanel-stamp")) return; const s = document.createElement("span"); s.className = "hpanel-stamp"; s.textContent = "4 need you"; t.appendChild(s); });` },
  H6: { css: `.hp3 .hp3-art { position: relative !important; top: 30px !important; }` },
  H7: { css: `.hpanel.hpanel--hero.hp3.hp3 { padding-bottom: 80px !important; }` },
  /* drop the number's blank box while loading */
  H8: { css: `.hp3 .hp3-n.hp3-blank { display: none !important; } .hp3[data-loading] .hp3-tb, .hp3[data-loading] .hp3-acts { display: none !important; } .hpanel.hpanel--hero.hp3.hp3.hp3--number.hp3--number[data-loading] { min-height: 0 !important; }` },
  H9: { css: `.qcv-group > .qcg.qcg { margin-top: 80px !important; }` },
  H10: { css: `.hpanel.hpanel--hero.hp3.hp3 { padding-top: 120px !important; padding-bottom: 120px !important; }` },
  /* `panel` defaults to true: every shared header takes the panel */
  H11: { js: `document.querySelectorAll(".ph:not(.hpanel)").forEach((e) => { e.classList.add("ph--panel", "hpanel"); e.setAttribute("data-hpanel", ""); });` },
};
const MUT = process.env.HV3_MUTATE;

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

async function prepare(page: Page, extra?: { hold?: boolean }) {
  const m = MUT ? MUTATIONS[MUT] : undefined;
  if (MUT && !m) throw new Error(`unknown HV3_MUTATE ${MUT}`);
  await page.addInitScript(({ css, js, hold }) => {
    try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* private mode */ }
    if (hold) { const w = window as unknown as Record<string, number>; w.__SA_QC_HOLD_MS = 6000; w.__SA_AGENTS_HOLD_MS = 6000; }
    const put = () => {
      const s = document.createElement("style"); s.setAttribute("data-hv3", ""); s.textContent = css; document.documentElement.appendChild(s);
      if (js) { const f = new Function(js); const tick = () => { try { f(); } catch { /* */ } requestAnimationFrame(tick); }; tick(); }
    };
    if (document.documentElement) put(); else document.addEventListener("readystatechange", put, { once: true });
  }, { css: `${KILL}${m?.css ?? ""}`, js: m?.js ?? "", hold: !!extra?.hold });
}

/** One read of the header on screen and what stands around it. A real function, never a template. */
async function read(page: Page, rowsSel: string | null = null) {
  return page.evaluate((rowsSel) => {
    const vis = (e: Element | null | undefined): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const b = (e: Element | null | undefined) => { if (!e || !vis(e)) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const win = [...document.querySelectorAll<HTMLElement>(".ws-window")].find(vis) ?? null;
    const any = [...document.querySelectorAll<HTMLElement>('[data-hpanel], [data-own-header], [data-probe="page-header"]')].filter(vis).find((e) => win?.contains(e)) ?? null;
    const hd = any?.hasAttribute("data-hp3") ? any : null;
    const q = (sel: string) => (hd ? [...hd.querySelectorAll<HTMLElement>(sel)].find(vis) ?? null : null);
    const cs = any ? getComputedStyle(any) : null;
    const h1 = q("h1"); const n = q('[data-hp3-part="number"]'); const w = q('[data-hp3-part="words"]'); const s = q('[data-hp3-part="sub"]');
    const acts = q('[data-hp3-part="acts"]'); const art = q('[data-hp3-part="art"]'); const title = q("h1.hp3-title");
    /* lines = the title box's height over its own line height (an adornment on the line has its own, smaller boxes) */
    const lines = (e: HTMLElement | null) => { if (!e) return 0; const c = getComputedStyle(e); const lh = parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.02; return Math.round(e.getBoundingClientRect().height / lh); };
    const pcs = any?.parentElement ? getComputedStyle(any.parentElement) : null, pr = any?.parentElement?.getBoundingClientRect();
    const desk = [...document.querySelectorAll<HTMLElement>(".qcg, .cl15-desk")].find(vis)?.getBoundingClientRect();
    const col = desk ? { l: desk.left, r: desk.right } : pr && pcs ? { l: pr.left + parseFloat(pcs.paddingLeft) + parseFloat(pcs.borderLeftWidth), r: pr.right - parseFloat(pcs.paddingRight) - parseFloat(pcs.borderRightWidth) } : null;
    const said = hd?.querySelector<HTMLElement>('[data-hp3-part="said"]');
    const glance = [...document.querySelectorAll<HTMLElement>('[data-qcv="glance-n"]')].filter(vis).map((e) => Number((e.textContent ?? "").trim()));
    const bands = [...document.querySelectorAll<HTMLElement>(".qcg")].find(vis) ?? null;
    const link = [...document.querySelectorAll<HTMLElement>(".qcfl")].find(vis) ?? null;
    const tdTile = [...document.querySelectorAll<HTMLElement>(".tdv2-tile:not(.tdv2-tile--sk) .tdv2-num")].filter(vis).map((e) => Number((e.textContent ?? "").trim()));
    return {
      path: location.pathname, vh: window.innerHeight, win: b(win), any: b(any), hd: b(hd), kind: hd?.getAttribute("data-hp3") ?? null,
      loading: !!any && (any.hasAttribute("data-loading") || !!any.closest("[data-loading]")),
      bg: cs?.backgroundColor ?? null, radius: cs?.borderTopLeftRadius ?? null, borderLeft: cs ? `${cs.borderLeftWidth} ${cs.borderLeftColor}` : null, col,
      h1Name: h1?.getAttribute("aria-label") ?? null, h1Text: (h1?.textContent ?? "").replace(/\s+/g, " ").trim(), subInH1: !!h1?.querySelector('[data-hp3-part="sub"]'),
      n: b(n), nText: (n?.textContent ?? "").trim(), nSize: n ? parseFloat(getComputedStyle(n).fontSize) : null, nBlank: !!n?.classList.contains("hp3-blank"), numberEls: hd ? hd.querySelectorAll('[data-hp3-part="number"]').length : 0,
      w: b(w), wText: (w?.textContent ?? "").trim(), wSize: w ? parseFloat(getComputedStyle(w).fontSize) : null,
      s: b(s), sText: (s?.textContent ?? "").trim(), acts: b(acts), art: b(art),
      title: b(title), titleSize: title ? parseFloat(getComputedStyle(title).fontSize) : null, titleLines: lines(title), titleText: (title?.textContent ?? "").trim(),
      stamps: any ? [...any.querySelectorAll(".hpanel-stamp")].length : 0, faces: any ? [...any.querySelectorAll('[data-cl15="faces"], .cl15-faces, [data-cl15="face"], .qcoh-faces')].length : 0,
      said: (said?.textContent ?? "").trim(), saidHidden: !!said && said.getBoundingClientRect().width <= 2,
      glance, bands: b(bands), link: b(link), tdTile,
      rows: rowsSel ? [...document.querySelectorAll<HTMLElement>(rowsSel)].filter(vis).length : null,
    };
  }, rowsSel);
}
const SHOW = (b: { l: number; t: number; w: number; h: number } | null | undefined) => (b ? `${b.l.toFixed(0)},${b.t.toFixed(0)} ${b.w.toFixed(0)}×${b.h.toFixed(0)}` : "absent");
const name = (locks: string[], dflt: string) => (MUT && locks.includes(MUT) ? MUT : dflt);

/* ───────────────────────── H1 · H2 · H3 · H4 · H5 · H6 · H7 ───────────────────────── */
test("H1–H7 · the panel on every workspace route", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger(name(["H1", "H2", "H3", "H4", "H5", "H6", "H7"], "H1-H7"));
  await prepare(page);
  let withArt = 0, withSub = 0;
  for (const vp of SIZES) for (const route of ALL) {
    await open(page, route, vp);
    const r = await read(page, ROWS[route] ?? null); const at = `${route} @${vp.width}`; const isNum = (NUMBER as readonly string[]).includes(route);
    /* H1 */
    L.check("H1 the header is the shared panel", at, !!r.hd && r.kind === (isNum ? "number" : "title"), `kind ${r.kind} · ${SHOW(r.any)}`);
    L.check("H1 surface, radius 14", at, r.bg === PANEL_BG && r.radius === "14px", `${r.bg} · ${r.radius}`);
    L.check("H1 edges are the content column's (±1)", at, !!r.any && !!r.col && near(r.any.l, r.col.l, 1) && near(r.any.r, r.col.r, 1), r.any && r.col ? `panel ${r.any.l.toFixed(1)}–${r.any.r.toFixed(1)} · column ${r.col.l.toFixed(1)}–${r.col.r.toFixed(1)}` : "—");
    L.check("H1 top is 28 below the sheet's top (±1)", at, !!r.any && !!r.win && near(r.any.t - r.win.t, 28, 1), r.any && r.win ? (r.any.t - r.win.t).toFixed(1) : "—");
    if (route === "/queries") L.check("H1 /queries has no ruled corner or margin line", at, /^1px /.test(r.borderLeft ?? "") && r.bg === PANEL_BG, `border-left ${r.borderLeft}`);
    if (isNum) {
      /* H2 */
      L.check("H2 the number is 120 (±1)", at, near(r.nSize, 120, 1), `${r.nSize}`);
      L.check("H2 the words are 34 (±1)", at, near(r.wSize, 34, 1), `${r.wSize}`);
      L.check("H2 the words start 16 right of the number (±2)", at, !!r.n && !!r.w && near(r.w.l - r.n.r, 16, 2), r.n && r.w ? (r.w.l - r.n.r).toFixed(1) : "—");
      L.check("H2 the words read as the page's", at, WORDS[route].test(r.wText), `"${r.wText}"`);
      if (r.s && r.sText) { withSub++; L.check("H2 the subline starts at the words' left (±1)", at, !!r.w && near(r.s.l, r.w.l, 1), `${r.s.l.toFixed(1)} vs ${r.w?.l.toFixed(1)}`); }
      L.check("H2 the subline is outside the h1", at, !r.subInH1, `inside ${r.subInH1}`);
      L.check("H2 the h1's name is the number and its words", at, r.h1Name === `${r.nText} ${r.wText}` && /^\d/.test(r.nText), `"${r.h1Name}" vs "${r.nText} ${r.wText}"`);
      /* H3 */
      const shown = Number(r.nText);
      if (route === "/queries") L.check("H3 N is active + inactive", at, r.glance.length === 2 && shown === r.glance[0] + r.glance[1], `${shown} vs ${r.glance.join(" + ")}`);
      else if (route === "/agents") { const parts = (r.said.match(/\d+/g) ?? []).map(Number); L.check("H3 N is the three kinds of agent added up", at, parts.length >= 1 && shown === parts.reduce((a, c) => a + c, 0), `${shown} vs ${parts.join(" + ")} ("${r.said}")`); }
      else if (route === "/todo") L.check("H3 N is the page's tiles added up", at, r.tdTile.length > 0 && shown === r.tdTile.reduce((x, y) => x + y, 0), `${shown} vs tiles ${r.tdTile.join(" + ")}`);
      else L.check("H3 N is the number of cards the page draws", at, r.rows !== null && shown === r.rows, `${shown} vs ${r.rows} cards`);
      /* H7 */
      L.check(route === "/queries" ? "H7 the panel is 260 tall (±4)" : "H7 every number panel is 260 tall (±4)", at, near(r.any?.h, 260, 4), `${r.any?.h.toFixed(1)}`);
    } else {
      /* H4 */
      L.check("H4 the title is 50 (±1)", at, near(r.titleSize, 50, 1), `${r.titleSize}`);
      L.check("H4 it runs to two lines at most", at, r.titleLines >= 1 && r.titleLines <= 2, `${r.titleLines} line(s) "${r.titleText.slice(0, 40)}"`);
      L.check("H4 there is no number element", at, r.numberEls === 0, `${r.numberEls}`);
    }
    /* H5 */
    L.check("H5 no stamp", at, r.stamps === 0, `${r.stamps}`);
    L.check("H5 no faces row", at, r.faces === 0, `${r.faces}`);
    if (route === "/agents") L.check("H5 the hidden sentence carries the three counts", at, r.saidHidden && (r.said.match(/\d+ [a-z ]+/g) ?? []).length >= 2 && /active|closed|not queried/.test(r.said), `"${r.said}" hidden ${r.saidHidden}`);
    /* H6 */
    if (r.art && r.any) {
      withArt++; const a = r.art, h = r.any;
      L.check("H6 the drawing is 196 tall (±1)", at, near(a.h, 196, 1), `${a.h.toFixed(1)}`);
      L.check("H6 it lies inside the panel", at, a.l >= h.l - 0.5 && a.r <= h.r + 0.5 && a.t >= h.t - 0.5 && a.b <= h.b + 0.5, `art ${SHOW(a)} · panel ${SHOW(h)}`);
      L.check("H6 its vertical centre is the panel's (±3)", at, near((a.t + a.b) / 2, (h.t + h.b) / 2, 3), `${((a.t + a.b) / 2).toFixed(1)} vs ${((h.t + h.b) / 2).toFixed(1)}`);
    }
  }
  L.check("H6 population: several routes carry a drawing", "all", withArt >= 8, `${withArt} readings`);
  L.check("H2 population: several number pages carry a subline", "all", withSub >= 6, `${withSub} sublines`);
  L.done(SIZES.length * ALL.length * 7);
});

/* ───────────────────────── H8 · no jump ───────────────────────── */
test("H8 · no jump: the loading and loaded header boxes are equal", async ({ page }) => {
  test.setTimeout(1_500_000);
  const L = new Ledger("H8");
  await prepare(page, { hold: true });
  await open(page, "/dashboard", SIZES[0]); /* signs in; the routes below are then opened bare, so the first frame is read */
  let held = 0;
  for (const vp of SIZES) for (const route of ALL) {
    await page.setViewportSize(vp);
    await page.goto(route);
    const box = () => page.evaluate(() => {
      const win = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().height > 0);
      const hd = [...document.querySelectorAll<HTMLElement>('[data-hpanel], [data-own-header], [data-probe="page-header"]')].find((e) => e.getBoundingClientRect().height > 0 && win?.contains(e));
      if (!hd) return null; const x = hd.getBoundingClientRect();
      return { l: x.left, t: x.top, w: x.width, h: x.height, loading: hd.hasAttribute("data-loading") || !!hd.closest("[data-loading]") };
    });
    let first: Awaited<ReturnType<typeof box>> = null;
    for (let i = 0; i < 80 && !first; i++) { first = await box(); if (!first) await page.waitForTimeout(100); }
    if (first?.loading) held++;
    await page.locator(".ws-window [data-loading]:visible").first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(first?.loading ? 7200 : 2400);
    const r = await read(page); const last = r.any; const at = `${route} @${vp.width}`;
    L.check("H8 the header's box is the same first seen and settled (±1)", at, !!first && !!last && near(first.l, last.l, 1) && near(first.t, last.t, 1) && near(first.w, last.w, 1) && near(first.h, last.h, 1), `${SHOW(first)}${first?.loading ? " (loading)" : ""} → ${SHOW(last)}`);
    if (route === "/queries" || route === "/agents") L.check("H8 precondition: it was read while loading, then loaded", at, first?.loading === true && r.loading === false, `first ${first?.loading} · last ${r.loading}`);
  }
  L.check("H8 population: the held pages were read loading", "all", held >= 4, `${held}`);
  L.done(SIZES.length * ALL.length);
});

/* ───────────────────────── H9 · H10 · /queries spacing ───────────────────────── */
test("H9 H10 · /queries: the bands under the panel, and the link above the fold", async ({ page }) => {
  const L = new Ledger(name(["H9", "H10"], "H9-H10"));
  await prepare(page);
  for (const vp of SIZES) {
    await open(page, "/queries", vp);
    const r = await read(page); const at = `/queries @${vp.width}×${vp.height}`;
    L.check("H9 precondition: the panel, the bands and the link are on screen", at, !!r.any && !!r.bands && !!r.link, `${SHOW(r.any)} · ${SHOW(r.bands)} · ${SHOW(r.link)}`);
    L.check("H9 panel bottom → bands top is 28 (±2)", at, !!r.any && !!r.bands && near(r.bands.t - r.any.b, 28, 2), r.any && r.bands ? (r.bands.t - r.any.b).toFixed(1) : "—");
    L.check("H9 bands bottom → the link's top is 40 (±2)", at, !!r.bands && !!r.link && near(r.link.t - r.bands.b, 40, 2), r.bands && r.link ? (r.link.t - r.bands.b).toFixed(1) : "—");
    L.check("H10 the link's bottom is at least 24 inside the viewport", at, !!r.link && r.link.b <= r.vh - 24, r.link ? `${r.link.b.toFixed(1)} of ${r.vh} (${(r.vh - r.link.b).toFixed(1)} clear)` : "—");
  }
  L.done(SIZES.length * 4);
});

/* ───────────────────────── H11 · out of scope ───────────────────────── */
async function readOut(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const hd = [...document.querySelectorAll<HTMLElement>('[data-probe="page-header"], header, .os-greet, h1')].find(vis) ?? null;
    if (!hd) return { box: null, panel: false, hp3: false, title: "", style: null };
    const x = hd.getBoundingClientRect(); const cs = getComputedStyle(hd);
    const h1 = hd.matches("h1") ? hd : hd.querySelector("h1");
    return {
      box: [x.left, x.top, x.width, x.height].map((v) => Math.round(v * 10) / 10), panel: hd.hasAttribute("data-hpanel") || !![...document.querySelectorAll("[data-hpanel]")].find(vis), hp3: !![...document.querySelectorAll("[data-hp3]")].find(vis),
      title: (h1?.textContent ?? "").trim().slice(0, 60),
      style: { bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, padding: cs.padding, margin: cs.margin, border: cs.borderTopWidth, h1Size: h1 ? getComputedStyle(h1).fontSize : "", h1Face: h1 ? getComputedStyle(h1).fontFamily : "" } as Record<string, string>,
    };
  });
}
test("H11 · out of scope: the pages that must not change equal their baselines", async ({ page }) => {
  const L = new Ledger("H11");
  await prepare(page);
  const got: Record<string, Awaited<ReturnType<typeof readOut>>> = {};
  for (const vp of SIZES) for (const route of OUT_OF_SCOPE) { await open(page, route, vp); await page.waitForTimeout(600); got[`${route}@${vp.width}`] = await readOut(page); }
  if (process.env.HV3_CAPTURE) { mkdirSync("tests/e2e/fixtures", { recursive: true }); writeFileSync(BASELINE, JSON.stringify(got, null, 1)); console.log(`captured ${Object.keys(got).length} baselines`); return; }
  expect(existsSync(BASELINE), "H11 baseline missing: capture it against a build of the base").toBe(true);
  const base = JSON.parse(readFileSync(BASELINE, "utf8")) as typeof got;
  for (const k of Object.keys(base)) {
    const a = base[k], b = got[k];
    L.check("H11 precondition: a header was read", k, !!b?.box, `${b?.title} ${JSON.stringify(b?.box)}`);
    L.check("H11 it is not the panel header", k, b?.hp3 === false && b?.panel === a.panel, `hp3 ${b?.hp3} · panel ${b?.panel} (was ${a.panel})`);
    L.check("H11 the header's box equals the baseline (±1)", k, !!a.box && !!b?.box && a.box.every((v, i) => near(b.box![i], v, 1)), `${JSON.stringify(a.box)} → ${JSON.stringify(b?.box)}`);
    const diff = Object.keys(a.style ?? {}).filter((s) => a.style![s] !== b?.style?.[s]).map((s) => `${s}: ${a.style![s]} → ${b?.style?.[s]}`);
    L.check("H11 its surface, padding and title type equal the baseline", k, diff.length === 0, diff.join(" · ") || "equal");
  }
  L.done(SIZES.length * OUT_OF_SCOPE.length * 4);
});
