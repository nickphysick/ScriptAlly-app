/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17 — locks CL17 A1 to F1, on the rendered page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock was run three ways before its green was believed: against the build before the pack (`CL17_BASE=1`,
 * ledger `base-<lock>.json`), with its named mutation applied in the page (`CL17_MUTATE=<lock>`, ledger
 * `mut-<lock>.json`), and plain. The mutations are the table below: one named thing broken per lock.
 *
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible Contact list (`cl()`).
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";
import { openContacts16, setScroll16 } from "./cl16Lib";

const DIR = "reports/contact-list-v17";
const MUT = process.env.CL17_MUTATE ?? "";
const BASE = process.env.CL17_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, applied in the page */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the navy panel restored */
  A1: { js: `(() => { const g = [...document.querySelectorAll(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0); const p = document.createElement("header"); p.setAttribute("data-cl16", "header"); p.className = "cl16-hd"; p.style.cssText = "grid-column:1/-1;grid-row:1;height:200px;background:#2d3a50"; g.prepend(p); })()` },
  /* a press on the card scrolls the page */
  A2: { js: `(() => { document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest('[data-cl17="card-row"]')) { const sc = [...document.querySelectorAll(".agl-wpg .wpg-scroll")].find((x) => x.getBoundingClientRect().height > 0); sc.scrollTop += 220; } }, true); })()` },
  /* the shadow left unclipped, past the sheet's right edge */
  A3: { css: `.cl17-hd .cl17-shadow { left: auto !important; right: -420px !important; }` },
  /* Grouped put back in the filter row */
  B1: { js: `(() => { const g = [...document.querySelectorAll('.aglist [data-lp="group"]')].find((e) => e.getBoundingClientRect().height > 0); const fr = [...document.querySelectorAll('.aglist [data-cl17="filter-row"]')].find((e) => e.getBoundingClientRect().height > 0); fr.appendChild(g); })()` },
  /* the pinned row painted white */
  C1: { css: `.cl17-pin { background: #fff !important; }` },
  /* a 400ms interval that re-sets the row's top */
  C2: { js: `(() => { let n = 0; setInterval(() => { const p = document.querySelector('[data-cl17="pinned"]'); if (p) p.style.top = (n++ % 2 ? 3 : 0) + "px"; }, 400); })()` },
  /* the margin letter on every row */
  D1: { js: `(() => { for (const r of document.querySelectorAll('.aglist [data-clv="row"]')) if (!r.querySelector(".cl17-ml")) { const s = document.createElement("span"); s.className = "cl17-ml"; s.setAttribute("data-cl17", "margin-letter"); s.textContent = r.getAttribute("data-initial") || "?"; r.prepend(s); } })()` },
  /* every bar filled for every query */
  D2: { css: `.cl16-list .cl17-track i { background: #2a3a52 !important; }` },
  /* the pill's label left as "Status" */
  E1: { js: `(() => { const fix = () => document.querySelectorAll('.aglist [data-cl17="pill"][data-k="status"] [data-cl17="pill-label"]').forEach((l) => { if (l.textContent !== "Status") l.textContent = "Status"; }); new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, characterData: true }); fix(); })()` },
  /* "Show agents", hard-coded */
  E2: { js: `(() => { const fix = () => document.querySelectorAll('[data-cl17="panel-show"]').forEach((b) => { if (b.textContent !== "Show agents") b.textContent = "Show agents"; }); new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, characterData: true }); fix(); })()` },
  /* the switch not reading the filter's state */
  E3: { js: `(() => { const fix = () => document.querySelectorAll('[data-cl17="switch"][data-on]').forEach((s) => s.removeAttribute("data-on")); new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, attributes: true }); fix(); })()` },
  /* the header left on the page in full screen */
  FS1: { css: `.clv-group[data-full] > .cl17-hd { display: block !important; }` },
  /* the example drawn as a real agent row */
  F1: { js: `(() => { const e = document.querySelector('[data-cl17="example"]'); if (e) { e.setAttribute("data-clv", "row"); e.setAttribute("data-agent-card", "example"); } })()` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};

/** installed per page: the visible Contact list */
const LIB = `window.__c17 = () => { const g = [...document.querySelectorAll(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0); if (!g) throw new Error("no visible Contact list"); const sc = g.closest(".wpg-scroll"); const sheet = [...document.querySelectorAll(".ws-window")].find((e) => e.getBoundingClientRect().height > 0); const vis = (s, root) => [...(root || g).querySelectorAll(s)].filter((e) => e.getBoundingClientRect().height > 0); return { g, sc, sheet, vis, one: (s, root) => vis(s, root)[0] || null }; };`;
type C17 = { g: HTMLElement; sc: HTMLElement; sheet: HTMLElement; vis: (s: string, root?: ParentNode) => HTMLElement[]; one: (s: string, root?: ParentNode) => HTMLElement | null };
declare global { interface Window { __c17: () => C17 } }
const open = async (page: Page, vp: { width: number; height: number }, lock: string) => { await openContacts16(page, vp); await page.evaluate(LIB); await mutate(page, lock); };
const rowsShown = (page: Page) => page.evaluate(() => window.__c17().vis('[data-clv="row"]').length);
const pill = (page: Page, k: string) => page.locator(`.aglist [data-cl14-dd="${k}"]`).filter({ visible: true }).first();
const openMenu = async (page: Page, k: string) => { await pill(page, k).scrollIntoViewIfNeeded(); await page.waitForTimeout(200); await pill(page, k).click(); await page.waitForTimeout(300); };

test.describe("Contact list v17", () => {
  test.describe.configure({ mode: "serial" });

  test("A1 · header: one light header; no navy panel, strip or heading", async ({ page }) => {
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await open(page, vp, "A1"); const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { g, one, vis } = window.__c17();
        const h1 = one("h1[data-page-title]"); const hs = h1 ? getComputedStyle(h1) : null;
        const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, r: x.right, t: x.top, w: x.width, h: x.height }; };
        const ey = one('[data-cl17="eyebrow"]'); const sh = one('[data-cl17="shadow"]');
        const face = h1?.querySelector("span") ? getComputedStyle(h1.querySelector("span")!).fontFamily : "";
        return {
          old: vis('[data-cl16="header"], [data-cl16="strip"], [data-cl16="list-heading"], [data-cl16="bar"]').length,
          navy: vis("header, [data-hpanel]").filter((e) => getComputedStyle(e).backgroundColor === "rgb(45, 58, 80)").length,
          rows: g.querySelectorAll('[data-clv="row"]').length, text: (h1?.textContent ?? "").replace(/\s+/g, " ").trim(), label: h1?.getAttribute("aria-label") ?? "",
          size: hs ? parseFloat(hs.fontSize) : null, lines: h1 && hs ? Math.round(h1.getBoundingClientRect().height / parseFloat(hs.fontSize)) : null, face,
          eyebrow: ey ? { text: ey.textContent, color: getComputedStyle(ey).color } : null,
          title: b(one('[data-cl17="title-block"]')), card: b(one('[data-cl17="card"]')),
          shadow: sh ? { op: parseFloat(getComputedStyle(sh).opacity), loaded: (sh as HTMLImageElement).naturalWidth > 0 } : null,
          wide: !!document.querySelector(".ws-app.sheet-wide"),
        };
      });
      L.check(`${w} no navy panel, strip, heading or ink bar`, r.old === 0 && r.navy === 0, `${r.old} v16 parts · ${r.navy} navy headers`);
      L.check(`${w} the h1 reads "{N} agents on file", N the rows on the page`, new RegExp(`^${r.rows} agents? on file$`).test(r.text) && r.label === r.text, `"${r.text}" · label "${r.label}" · ${r.rows} rows`);
      L.check(`${w} the title is Special Elite ${r.wide ? 50 : 44} (±1), on one line`, /Special Elite/.test(r.face) && near(r.size, r.wide ? 50 : 44, 1) && r.lines === 1, `${r.face.slice(0, 24)} · ${r.size} · ${r.lines} line(s)`);
      L.check(`${w} the eyebrow reads "— CONTACT LIST —" in rust`, r.eyebrow?.text === "— CONTACT LIST —" && r.eyebrow.color === "rgb(162, 69, 42)", JSON.stringify(r.eyebrow));
      /* RETIRED (v17.1, 14 Oct): "the hawk is 280 (200) wide, between the title block and the card". The populated
         header has no hawk now; contactV171 A4 holds the header (its inset, no hawk image, the shadow). */
      L.check(`${w} the shadow image is there at opacity 0.15 (±0.01)`, !!r.shadow && r.shadow.loaded && near(r.shadow.op, 0.15, 0.01), JSON.stringify(r.shadow));
    }
    L.done(10);
  });

  test("A2 · card: three rows that add up, a bar in proportion, and a press that filters without scrolling", async ({ page }) => {
    const L = new Ledger("A2");
    for (const vp of SIZES) {
      await open(page, vp, "A2"); const w = `${vp.width}`;
      const read = () => page.evaluate(() => {
        const { sc, one, vis } = window.__c17(); const card = one('[data-cl17="card"]');
        if (!card) return null;
        const rows = vis('[data-cl17="card-row"]', card); const segs = vis('[data-cl17="card-seg"]', card);
        const all = vis('[data-clv="row"]');
        return {
          labels: rows.map((x) => (x.querySelector('[data-cl17="card-label"]')?.textContent ?? "").trim()), ns: rows.map((x) => Number((x.querySelector('[data-cl17="card-n"]')?.textContent ?? "").trim())),
          pressed: rows.map((x) => x.getAttribute("aria-pressed")), op: rows.map((x) => parseFloat(getComputedStyle(x).opacity)),
          segW: segs.map((x) => x.getBoundingClientRect().width), barW: card.querySelector('[data-cl17="card-bar"]')!.getBoundingClientRect().width,
          list: all.length, tones: { none: all.filter((x) => x.dataset.disc === "none" || (x.dataset.stand === "none")).length, live: all.filter((x) => x.dataset.stand !== "none" && x.dataset.stand !== "closed").length, closed: all.filter((x) => x.dataset.stand === "closed").length },
          total: Number((one("h1[data-page-title]")?.textContent ?? "").match(/\d+/)?.[0]), scrollTop: sc.scrollTop,
        };
      });
      const r = await read();
      if (!r) { L.check(`${w} card`, false, "no summary card"); continue; }
      L.check(`${w} three rows: Not queried, Querying, Closed`, r.labels.join("|") === "Not queried|Querying|Closed", r.labels.join("|"));
      L.check(`${w} the counts are the list's own groups and sum to N`, r.ns[0] + r.ns[1] + r.ns[2] === r.total && r.ns[0] === r.tones.none && r.ns[1] === r.tones.live && r.ns[2] === r.tones.closed, `${r.ns.join(" + ")} vs ${r.total} · rows ${JSON.stringify(r.tones)}`);
      const free = r.barW - 6; const sum = r.ns[0] + r.ns[1] + r.ns[2];
      L.check(`${w} the bar's segments are in proportion to the counts (±2)`, r.segW.length === 3 && r.segW.every((x, i) => near(x, (free * r.ns[i]) / sum, 2)), `${r.segW.map((x) => x.toFixed(1)).join(" · ")} · want ${r.ns.map((n) => ((free * n) / sum).toFixed(1)).join(" · ")}`);
      await page.locator('.aglist [data-cl17="card-row"][data-k="live"]').filter({ visible: true }).first().click(); await page.waitForTimeout(700);
      const on = (await read())!;
      L.check(`${w} pressing Querying filters the list to that group`, on.list === r.ns[1] && on.pressed.join() === "false,true,false", `${on.list} rows · want ${r.ns[1]} · pressed ${on.pressed.join()}`);
      L.check(`${w} the other rows fade to 0.32 (±0.02)`, near(on.op[0], 0.32, 0.02) && near(on.op[2], 0.32, 0.02) && near(on.op[1], 1, 0.01), on.op.join(" · "));
      await page.locator('.aglist [data-cl17="card-row"][data-k="live"]').filter({ visible: true }).first().click(); await page.waitForTimeout(700);
      const off = (await read())!;
      /* the scroll claim is read on the LARGEST group: a short filtered list cannot hold a scroll position at all
         (the page becomes shorter than its window and scrollTop falls to 0), which would hide a press that scrolls */
      const big = (["none", "live", "closed"] as const)[r.ns.indexOf(Math.max(...r.ns))];
      /* 30px, not more: further down the pressed row itself is at the scroller's top edge, and a click then nudges it
         clear of the scroller's own 12px scroll padding (measured: 60 → 52), which is the browser, not the press */
      await setScroll16(page, 30);
      const s0 = (await read())!.scrollTop;
      await page.locator(`.aglist [data-cl17="card-row"][data-k="${big}"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(700);
      const s1 = (await read())!.scrollTop;
      L.check(`${w} a press does not scroll (the largest group, from 30px down)`, s0 === 30 && s1 === s0, `${s0} → ${s1} (${big})`);
      await page.locator(`.aglist [data-cl17="card-row"][data-k="${big}"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(500);
      L.check(`${w} pressing it again clears it`, off.list === r.list && off.pressed.every((p) => p === "false"), `${off.list} rows (was ${r.list})`);
    }
    L.done(14);
  });

  test("A3 · no overflow: at five widths nothing is wider than its box, and the header starts where the list does", async ({ page }) => {
    const L = new Ledger("A3");
    for (const vp of [{ width: 1920, height: 1080 }, { width: 1512, height: 900 }, { width: 1280, height: 800 }, { width: 1180, height: 800 }, { width: 1024, height: 768 }]) {
      await open(page, vp, "A3"); const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { sc, one } = window.__c17(); const app = document.querySelector<HTMLElement>(".ws-app");
        const hd = one('[data-cl17="header"]'), list = one('[data-cl16="list"]');
        return { doc: [document.documentElement.scrollWidth, document.documentElement.clientWidth], sc: [sc.scrollWidth, sc.clientWidth], app: app ? [app.scrollWidth, app.clientWidth] : null, hd: hd?.getBoundingClientRect().left ?? null, list: list?.getBoundingClientRect().left ?? null };
      });
      L.check(`${w} the document, the sheet's scroller and the app frame do not overflow sideways`, r.doc[0] === r.doc[1] && r.sc[0] === r.sc[1] && !!r.app && r.app[0] === r.app[1], `doc ${r.doc.join("/")} · scroller ${r.sc.join("/")} · app ${r.app?.join("/")}`);
      L.check(`${w} the header's left is the list's (±1)`, r.hd !== null && r.list !== null && near(r.hd, r.list, 1), `${r.hd} vs ${r.list}`);
    }
    L.done(10);
  });

  /* RETIRED (Contact list v18): v18 §B: the filter row is gone from the page header; CL18 B1 holds the list header */
  test.skip("B1 · rows: search and pills in the filter row; Showing, Grouped, density and Full screen on the sheet", async ({ page }) => {
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await open(page, vp, "B1"); const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { one, vis } = window.__c17(); const fr = one('[data-cl17="filter-row"]'), sv = one('[data-cl17="sheet-row"]'), list = one('[data-cl16="list"]');
        if (!fr || !sv || !list) return null;
        const has = (root: Element, s: string) => [...root.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0).length;
        const kids = [...fr.querySelectorAll<HTMLElement>('[data-cl17="find"], [data-cl17="pill"], [data-cl14="genres"]')].filter((e) => e.getBoundingClientRect().height > 0);
        const tops = kids.map((e) => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2));
        return {
          fr: { find: has(fr, '[data-cl17="find"] input'), pills: has(fr, '[data-cl17="pill"]'), group: has(fr, '[data-lp="group"]'), dens: has(fr, '[data-cl14="density"]'), full: has(fr, '[data-cl16="full"]') },
          sv: { showing: (sv.querySelector('[data-cl17="showing"]')?.textContent ?? "").replace(/\s+/g, " ").trim(), group: has(sv, '[data-lp="group"]'), dens: has(sv, '[data-cl14="density"]'), full: has(sv, '[data-cl16="full"]') },
          first: list.firstElementChild === sv || list.firstElementChild?.nextElementSibling === sv, ink: vis('[data-cl16="bar"], .cl14-bar').length,
          oneLine: Math.max(...tops) - Math.min(...tops), overflow: fr.scrollWidth - fr.clientWidth, right: Math.max(...kids.map((e) => e.getBoundingClientRect().right)) - fr.getBoundingClientRect().right,
        };
      });
      if (!r) { L.check(`${w} rows`, false, "no filter row or sheet row"); continue; }
      L.check(`${w} the filter row holds search and four pills, and no Grouped, density or Full screen`, r.fr.find === 1 && r.fr.pills === 4 && r.fr.group === 0 && r.fr.dens === 0 && r.fr.full === 0, JSON.stringify(r.fr));
      L.check(`${w} the sheet's first row holds "Showing…", Grouped, density and Full screen`, /^Showing all \d+$/.test(r.sv.showing) && r.sv.group === 1 && r.sv.dens === 1 && r.sv.full === 1 && r.first, JSON.stringify(r.sv));
      L.check(`${w} no ink bar`, r.ink === 0, `${r.ink}`);
      L.check(`${w} nothing in the filter row wraps or runs past it`, r.oneLine <= 2 && r.overflow <= 0 && r.right <= 0.5, `centres ${r.oneLine}px apart · overflow ${r.overflow} · past the edge ${r.right.toFixed(1)}`);
    }
    L.done(8);
  });

  const pinRead = (page: Page) => page.evaluate(() => {
    const { sheet, one, vis } = window.__c17(); const pin = document.querySelector<HTMLElement>('[data-cl17="pinned"]');
    const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, w: x.width, h: x.height, b: x.bottom }; };
    const labels = one(".cl16-list .lt-labels"); const list = one('[data-cl16="list"]'); const tab = document.querySelector<HTMLElement>('[data-shell="tab"]');
    const row = vis('[data-clv="row"]').find((r) => r.getBoundingClientRect().top > (labels?.getBoundingClientRect().bottom ?? 0)) ?? null;
    const labs = labels ? [...labels.querySelectorAll<HTMLElement>(".lt-lab")] : [];
    const cols = row ? [row.querySelector(".clv-rwho"), row.querySelector(".clv-rfit"), row.querySelector(".clv-rrep")] : [];
    return {
      on: !!pin?.hasAttribute("data-on"), pin: b(pin), sheet: b(sheet), bg: pin ? getComputedStyle(pin).backgroundColor : "", tab: tab ? getComputedStyle(tab).backgroundColor : "",
      labels: b(labels), list: b(list), labsBg: labels ? getComputedStyle(labels).backgroundColor : "",
      heads: labs.slice(0, 3).map((x) => x.getBoundingClientRect().left), cols: cols.map((x) => x?.getBoundingClientRect().left ?? NaN),
      endHead: labs[3]?.getBoundingClientRect().right ?? NaN, endCol: row?.querySelector(".clv-rq")?.getBoundingClientRect().right ?? NaN,
    };
  });

  test("C1 · pinned: the row on the sheet's top edge at its full width, the headings under it at the list's", async ({ page }) => {
    const L = new Ledger("C1");
    for (const vp of SIZES) {
      await open(page, vp, "C1"); const w = `${vp.width}`;
      await setScroll16(page, 1500); await page.waitForTimeout(500);
      const r = await pinRead(page);
      if (!r.pin || !r.sheet || !r.labels || !r.list) { L.check(`${w} pinned`, false, `no pinned row (${!!r.pin}), headings (${!!r.labels}) or list`); continue; }
      L.check(`${w} scrolled 1500, the row is shown`, r.on, `${r.on}`);
      /* EDITED (pinned-row fix, 15 Oct): the row is no longer a stated 68 — it is the sheet lip's covered strip + 64
         (shell PinnedRow), so its height is held to the measured cover the sheet publishes, not a number */
      const cover = await page.evaluate(() => parseFloat(getComputedStyle([...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().height > 0)!).getPropertyValue("--pin-cover")) || 0);
      L.check(`${w} its top is the sheet's top and its width the sheet's (±1), the cover + 64 tall`, near(r.pin.t, r.sheet.t, 1) && near(r.pin.w, r.sheet.w, 1) && near(r.pin.l, r.sheet.l, 1) && cover > 0 && near(r.pin.h, cover + 64, 0.5), `row ${r.pin.l.toFixed(1)},${r.pin.t.toFixed(1)} ${r.pin.w.toFixed(1)}×${r.pin.h} · sheet ${r.sheet.l.toFixed(1)},${r.sheet.t.toFixed(1)} ${r.sheet.w.toFixed(1)}`);
      L.check(`${w} its background is the folder tab's`, r.bg === r.tab && /^rgb\(/.test(r.bg), `${r.bg} vs tab ${r.tab}`);
      L.check(`${w} the headings' top is the row's bottom (±1), and their width the list's (±1)`, near(r.labels.t, r.pin.b, 1) && near(r.labels.w, r.list.w, 1) && near(r.labels.l, r.list.l, 1) && r.labsBg === "rgb(233, 237, 243)" /* RE-POINTED (v18 §B): the Query Centre strip */, `headings ${r.labels.l.toFixed(1)},${r.labels.t.toFixed(1)} ${r.labels.w.toFixed(1)} · row bottom ${r.pin.b.toFixed(1)} · list ${r.list.l.toFixed(1)} ${r.list.w.toFixed(1)} · ${r.labsBg}`);
      L.check(`${w} each heading sits over its column (within 2)`, r.heads.length === 3 && r.heads.every((x, i) => near(x, r.cols[i], 2)) && near(r.endHead, r.endCol, 2), `${r.heads.map((x) => x.toFixed(0)).join(",")} vs ${r.cols.map((x) => x.toFixed(0)).join(",")} · last ends ${r.endHead.toFixed(0)} vs ${r.endCol.toFixed(0)}`);
    }
    L.done(10);
  });

  test("C2 · steady: 1px steps across the pin line flip the state twice, and the row's box takes one value", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C2");
    for (const vp of SIZES) {
      await open(page, vp, "C2"); const w = `${vp.width}`;
      const r = await page.evaluate(async () => {
        const { sc, g } = window.__c17(); const pin = document.querySelector<HTMLElement>('[data-cl17="pinned"]'); const s = g.querySelector<HTMLElement>('[data-cl17="pin-sentinel"]'); /* zero height by design */
        if (!pin || !s) return null;
        const frame = () => new Promise((res) => requestAnimationFrame(() => res(null)));
        const gapAt0 = s.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
        const T = Math.round(gapAt0 - 12); /* the scrollTop at which the sentinel is 12 under the scroller's top */
        let was = pin.hasAttribute("data-on"), flips = 0, drift = 0; const boxes = new Set<string>();
        const go = async (y: number) => {
          sc.scrollTop = y; await frame(); await frame(); await frame();
          drift = Math.max(drift, Math.abs(sc.scrollTop - y));
          const now = pin.hasAttribute("data-on"); if (now !== was) { flips++; was = now; }
          if (now) { const b = pin.getBoundingClientRect(); boxes.add(`${b.left.toFixed(2)},${b.top.toFixed(2)},${b.width.toFixed(2)},${b.height.toFixed(2)}`); }
        };
        const start = pin.hasAttribute("data-on");
        for (let y = T - 40; y <= T + 60; y++) await go(y);
        const mid = pin.hasAttribute("data-on");
        /* hold while pinned: a late writer would move the box now */
        for (let i = 0; i < 40; i++) { await new Promise((res) => setTimeout(res, 30)); const b = pin.getBoundingClientRect(); boxes.add(`${b.left.toFixed(2)},${b.top.toFixed(2)},${b.width.toFixed(2)},${b.height.toFixed(2)}`); }
        for (let y = T + 60; y >= T - 40; y--) await go(y);
        return { T, start, mid, end: pin.hasAttribute("data-on"), flips, drift, boxes: [...boxes] };
      });
      if (!r) { L.check(`${w} steady`, false, "no pinned row or sentinel"); continue; }
      L.check(`${w} off before the line, on past it, off again`, !r.start && r.mid && !r.end, `${r.start} → ${r.mid} → ${r.end} (line at ${r.T})`);
      L.check(`${w} the state flips exactly twice`, r.flips === 2, `${r.flips} flips`);
      L.check(`${w} scrollTop is what was set (±1)`, r.drift <= 1, `worst drift ${r.drift}`);
      L.check(`${w} the row's box takes exactly one value while pinned`, r.boxes.length === 1, `${r.boxes.length} boxes: ${r.boxes.slice(0, 3).join(" | ")}`);
    }
    L.done(8);
  });

  test("D1 · discs and letters: three disc colours; a margin letter on each letter's first row, and none when grouped by letter", async ({ page }) => {
    const L = new Ledger("D1");
    for (const vp of SIZES) {
      await open(page, vp, "D1"); const w = `${vp.width}`;
      const read = () => page.evaluate(() => {
        const { vis } = window.__c17(); const rows = vis('[data-clv="row"]');
        const disc = (sel: (r: HTMLElement) => boolean) => { const r = rows.find(sel); const d = r?.querySelector<HTMLElement>(".clv-ini"); return d ? `${getComputedStyle(d).backgroundColor} ${getComputedStyle(d).color}` : null; };
        let last = ""; const firsts: string[] = [], wrong: string[] = [];
        for (const r of rows) { const i = r.dataset.initial ?? ""; const has = !!r.querySelector(".cl17-ml"); const first = i !== last; if (first) firsts.push(i); if (has !== first) wrong.push(`${i}:${has}`); last = i; }
        return {
          none: disc((r) => r.dataset.stand === "none" && r.dataset.door !== "closed"), live: disc((r) => r.dataset.stand !== "none" && r.dataset.stand !== "closed"), closed: disc((r) => r.dataset.stand === "closed"),
          letters: vis(".cl17-ml").map((e) => (e.textContent ?? "").trim()), firsts, wrong, rows: rows.length, bands: vis('[data-clv="band"]').length,
        };
      });
      const r = await read();
      /* RETIRED (v18 §C): "a not-queried disc is #f4eee5": it is a dotted ring with no fill now (CL18 C2) */
      L.check(`${w} a not-queried disc has no fill`, /^rgba\(0, 0, 0, 0\)/.test(r.none), `${r.none}`);
      L.check(`${w} a querying disc is #2a3a52 with cream initials`, r.live === "rgb(42, 58, 82) rgb(244, 238, 229)", `${r.live}`);
      L.check(`${w} a closed disc is #b3aca5 with #2b2622 initials`, r.closed === "rgb(179, 172, 165) rgb(43, 38, 34)", `${r.closed}`);
      L.check(`${w} ungrouped: each letter's first row shows its letter and no other row does`, r.wrong.length === 0 && r.letters.join("") === r.firsts.join("") && r.firsts.length > 4 && r.firsts.length < r.rows, `${r.letters.join("")} vs ${r.firsts.join("")} · wrong ${r.wrong.slice(0, 5).join(" ")} · ${r.rows} rows`);
      /* grouped by letter: the dividers do the job */
      await page.locator('.aglist [data-cl18="group"]').filter({ visible: true }).first().click(); /* RE-POINTED (v18 §B): the sentence's group name */ await page.waitForTimeout(250);
      await page.locator('[data-lpop="group"] [data-opt="group:letter"]').click(); await page.waitForTimeout(700);
      await page.evaluate(MUT === "D1" ? MUTATIONS.D1.js! : "0");
      const g = await read();
      L.check(`${w} grouped by letter: no margin letters, and the dividers are there`, g.letters.length === 0 && g.bands > 4, `${g.letters.length} letters · ${g.bands} dividers`);
      await page.locator('.aglist [data-cl18="group"]').filter({ visible: true }).first().click(); /* RE-POINTED (v18 §B): the sentence's group name */ await page.waitForTimeout(250);
      await page.locator('[data-lpop="group"] [data-opt="group:none"]').click(); await page.waitForTimeout(400);
    }
    L.done(10);
  });

  test("D2 · track: one bar per stage reached; closed is grey; \"+ Log a query\" opens the panel at the journey", async ({ page }) => {
    const L = new Ledger("D2");
    /* `data-status` is the stage as the row names it. Revise & resubmit and Resubmitted are left out: how far such a
       query got is its history's to say, not its name's. */
    const WANT: Record<string, number> = { "Queried": 1, "Partial requested": 2, "Partial sent": 2, "Full requested": 3, "Full sent": 3, "Offer": 4, "Signed": 4 };
    for (const vp of SIZES) {
      await open(page, vp, "D2"); const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { vis } = window.__c17();
        return vis('[data-clv="row"]').filter((x) => x.dataset.stand !== "none").map((x) => {
          const bars = [...x.querySelectorAll<HTMLElement>('[data-cl17="track"] i')];
          return { status: x.dataset.status ?? "", stand: x.dataset.stand ?? "", bars: bars.length, filled: bars.filter((b) => getComputedStyle(b).backgroundColor === "rgb(42, 58, 82)").length, grey: bars.filter((b) => getComputedStyle(b).backgroundColor === "rgb(214, 209, 203)").length, titles: bars.map((b) => b.title).join("|"), w: bars[0]?.getBoundingClientRect().width, h: bars[0]?.getBoundingClientRect().height };
        });
      });
      const live = r.filter((x) => x.stand !== "closed" && x.status in WANT), closed = r.filter((x) => x.stand === "closed");
      const seen: Record<string, number> = {}; for (const x of live) seen[x.status] = (seen[x.status] ?? 0) + 1;
      if (vp.width === 1512) console.log(`[D2] stages on the account: ${JSON.stringify(seen)} · closed ${closed.length}`);
      L.check(`${w} population: queried agents at two or more stages, and a closed one`, Object.keys(seen).length >= 2 && closed.length >= 1, `${JSON.stringify(seen)} · closed ${closed.length}`);
      const bad = live.filter((x) => x.bars !== 4 || x.filled !== WANT[x.status]);
      L.check(`${w} every queried agent fills the bars its stage has reached (Queried 1, Partial 2, Full 3, Offer 4)`, live.length > 0 && bad.length === 0, bad.length ? bad.slice(0, 4).map((x) => `${x.status}: ${x.filled} of ${x.bars}`).join(" · ") : `${live.length} rows`);
      L.check(`${w} a closed agent's four bars are rgb(214, 209, 203)`, closed.length > 0 && closed.every((x) => x.bars === 4 && x.grey === 4 && x.filled === 0), closed.slice(0, 3).map((x) => `${x.grey} grey, ${x.filled} filled`).join(" · "));
      L.check(`${w} the bars are 26 × 6 and each names its stage`, r.length > 0 && r.every((x) => near(x.w, 26, 0.5) && near(x.h, 6, 0.5) && x.titles === "Queried|Partial|Full|Offer"), `${r[0]?.w}×${r[0]?.h} · ${r[0]?.titles}`);
      /* "+ Log a query" */
      const row = page.locator('.aglist [data-clv="row"][data-stand="none"]:not([data-door="closed"])').filter({ visible: true }).first();
      const id = await row.getAttribute("data-agent-card"); const name = ((await row.locator(".clv-rwn > b").textContent()) ?? "").trim();
      const log = row.locator('[data-cl17="log"]');
      L.check(`${w} a not-queried, open agent offers "+ Log a query"`, (await log.count()) === 1 && ((await log.textContent()) ?? "").trim() === "+ Log a query", `${await log.count()}`);
      await row.scrollIntoViewIfNeeded(); await log.click(); await page.waitForTimeout(1200);
      const p = await page.evaluate(() => {
        const panel = document.querySelector<HTMLElement>('[data-ap="panel"]'); const scrim = document.querySelector<HTMLElement>("[data-side-scrim]");
        return { id: panel?.getAttribute("data-ap-id") ?? null, journey: !!panel?.querySelector(".qad-root.is-open, [data-qad-head]"), text: ([...(panel?.querySelectorAll<HTMLElement>("[data-qad-head], .qad-head") ?? [])].map((e) => e.textContent ?? "").join(" ")).replace(/\s+/g, " ").slice(0, 200), acting: panel?.getAttribute("data-ap-acting") ?? null, scrim: scrim ? parseFloat(getComputedStyle(scrim).opacity) : null, url: location.search, cards: [...document.querySelectorAll('[data-ac="card"]')].filter((e) => e.getBoundingClientRect().height > 0).length };
      });
      L.check(`${w} it opens that agent's panel at Log a query, with the page dimmed, and no card`, p.id === id && p.journey && /quer/i.test(p.text) && (p.scrim ?? 0) > 0.3 && new RegExp(`agent=${id}`).test(p.url) && p.cards === 0, `panel ${p.id} (want ${id}, ${name}) · journey ${p.journey} · head "${p.text.slice(0, 80)}" · scrim ${p.scrim} · ${p.url} · cards ${p.cards}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      const x = page.locator('[data-ap="panel"] [data-ap="close"]'); if (await x.count()) await x.click().catch(() => {});
      await page.waitForTimeout(500);
      if (await page.locator('[data-ap="panel"]').count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
    }
    L.done(12);
  });

  /* RETIRED (Contact list v18): v18 §B: the pills are not rendered on /agents; CL18 B2 holds the Filters panel over the same state */
  test.skip("E1 · pills: a set pill is navy, names its choice and carries a × that clears it without opening", async ({ page }) => {
    const L = new Ledger("E1");
    for (const vp of SIZES) {
      await open(page, vp, "E1"); const w = `${vp.width}`;
      const total = await rowsShown(page);
      const readPill = () => page.evaluate(() => { const { one } = window.__c17(); const wr = one('[data-cl17="pill"][data-k="status"]'); const b = wr?.querySelector<HTMLElement>("[data-cl14-dd]"); return wr && b ? { label: (wr.querySelector('[data-cl17="pill-label"]')?.textContent ?? "").trim(), bg: getComputedStyle(b).backgroundColor, fg: getComputedStyle(b).color, x: wr.querySelectorAll('[data-cl17="pill-clear"]').length, h: b.getBoundingClientRect().height, pops: document.querySelectorAll(".lpop").length } : null; });
      const r0 = await readPill();
      L.check(`${w} at rest: "Status", white, 40 tall, no ×`, !!r0 && r0.label === "Status" && r0.bg === "rgb(255, 255, 255)" && near(r0.h, 40, 0.5) && r0.x === 0, JSON.stringify(r0));
      await openMenu(page, "status");
      await page.locator('[data-lpop="status"] [data-opt="status:queried"]').click(); await page.waitForTimeout(400);
      const r1 = await readPill();
      L.check(`${w} one status: navy, reading "Queried", with a ×`, !!r1 && r1.label === "Queried" && r1.bg === "rgb(45, 58, 80)" && r1.fg === "rgb(244, 238, 229)" && r1.x === 1, JSON.stringify(r1));
      await page.locator('[data-lpop="status"] [data-opt="status:fr"]').click(); await page.waitForTimeout(400);
      const r2 = await readPill();
      L.check(`${w} a second status reads "2 statuses"`, r2?.label === "2 statuses", `${r2?.label}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await page.locator('.aglist [data-cl17="pill"][data-k="status"] [data-cl17="pill-clear"]').filter({ visible: true }).first().click(); await page.waitForTimeout(600);
      const r3 = await readPill();
      L.check(`${w} the × clears it without opening the menu`, !!r3 && r3.label === "Status" && r3.x === 0 && r3.pops === 0 && (await rowsShown(page)) === total, `${JSON.stringify(r3)} · ${await rowsShown(page)} of ${total} rows`);
    }
    L.done(8);
  });

  /* RETIRED (Contact list v18): v18 §B: the pills' own panels are not opened on /agents; CL18 B2 holds the one Filters panel */
  test.skip("E2 · panels: each opens 10 under its pill with its heading and note; Show {n} agents is the list", async ({ page }) => {
    const L = new Ledger("E2");
    const HEAD: Record<string, [string, RegExp]> = { status: ["Where they stand", /^Pick any number$/], open: ["Taking queries?", /^From their profile$/], queried: ["Queried for this book?", /.+/] };
    for (const vp of SIZES) {
      await open(page, vp, "E2"); const w = `${vp.width}`;
      const total = await rowsShown(page);
      const readPanel = (k: string) => page.evaluate((k) => {
        const { one } = window.__c17(); const b = one(`[data-cl14-dd="${k}"]`); const p = document.querySelector<HTMLElement>(`[data-lpop="${k}"]`);
        if (!b || !p) return null;
        return { gap: p.getBoundingClientRect().top - b.getBoundingClientRect().bottom, title: (p.querySelector('[data-cl17="panel-head"] b')?.textContent ?? "").trim(), note: (p.querySelector('[data-cl17="panel-head"] span')?.textContent ?? "").trim(),
          groups: [...p.querySelectorAll("[data-cl17='panel-group'] h6")].map((h) => (h.textContent ?? "").trim()), opts: [...p.querySelectorAll<HTMLElement>("[data-opt]")].map((o) => ({ k: o.getAttribute("data-opt"), dot: o.querySelectorAll(".cl17-dot svg, .cl17-dot .cl17-dot-none").length, n: (o.querySelector('[data-cl17="opt-count"]')?.textContent ?? "").trim(), line: (o.querySelector(".cl17-ol i")?.textContent ?? "").trim() })),
          show: (p.querySelector('[data-cl17="panel-show"]')?.textContent ?? "").replace(/\s+/g, " ").trim(), expanded: b.getAttribute("aria-expanded"), controls: b.getAttribute("aria-controls") === p.id, minW: p.getBoundingClientRect().width };
      }, k);
      for (const k of ["status", "open", "queried"]) {
        await openMenu(page, k);
        const r = await readPanel(k);
        if (!r) { L.check(`${w} ${k}`, false, "the menu did not open"); continue; }
        L.check(`${w} ${k}: 10 (±2) under its pill, 300 or wider, "${HEAD[k][0]}" and its note`, near(r.gap, 10, 2) && r.minW >= 299.5 && r.title === HEAD[k][0] && HEAD[k][1].test(r.note) && r.expanded === "true" && r.controls, `gap ${r.gap.toFixed(1)} · ${r.minW.toFixed(0)} wide · "${r.title}" / "${r.note}" · expanded ${r.expanded} controls ${r.controls}`);
        if (k === "status") {
          L.check(`${w} status: three group headings, a dot per option, and counts`, r.groups.join("|") === "Not queried|Querying|Closed" && r.opts.length >= 8 && r.opts.every((o) => o.dot === 1 && /^\d+$/.test(o.n)), `${r.groups.join("|")} · ${r.opts.length} options · ${r.opts.filter((o) => o.dot !== 1).length} without a dot`);
          const q = Number(r.opts.find((o) => o.k === "status:queried")?.n);
          await page.locator('[data-lpop="status"] [data-opt="status:queried"]').click(); await page.waitForTimeout(600);
          const r2 = await readPanel("status"); const shown = await rowsShown(page);
          L.check(`${w} status: the option's count is the list it gives, and "Show {n} agents" says so`, shown === q && r2?.show === `Show ${shown} ${shown === 1 ? "agent" : "agents"}`, `count ${q} · ${shown} rows · "${r2?.show}"`);
          await page.locator('[data-lpop="status"] [data-cl17="panel-show"]').click(); await page.waitForTimeout(400);
          L.check(`${w} status: the button closes the menu`, (await page.locator(".lpop").count()) === 0, `${await page.locator(".lpop").count()}`);
          await page.locator('.aglist [data-cl17="pill"][data-k="status"] [data-cl17="pill-clear"]').filter({ visible: true }).first().click(); await page.waitForTimeout(500);
        } else {
          L.check(`${w} ${k}: every choice has its one-line description`, r.opts.length >= 3 && r.opts.every((o) => o.line.length > 8), r.opts.map((o) => o.line).join(" | "));
          await page.keyboard.press("Escape"); await page.waitForTimeout(350);
          const f = await page.evaluate((k) => ({ pops: document.querySelectorAll(".lpop").length, focus: (document.activeElement as HTMLElement | null)?.getAttribute("data-cl14-dd") === k }), k);
          L.check(`${w} ${k}: Escape closes it and returns focus to the pill`, f.pops === 0 && f.focus, JSON.stringify(f));
        }
      }
      L.check(`${w} the list is whole again`, (await rowsShown(page)) === total, `${await rowsShown(page)} of ${total}`);
    }
    L.done(20);
  });

  /* RETIRED (Contact list v18): v18 §B: the More filters switches are a section of the one Filters panel; CL18 B2 holds its state */
  test.skip("E3 · more: one More filters control, with switches that read the filter", async ({ page }) => {
    const L = new Ledger("E3");
    for (const vp of SIZES) {
      await open(page, vp, "E3"); const w = `${vp.width}`;
      const total = await rowsShown(page);
      const state = () => page.evaluate(() => { const { vis, one } = window.__c17(); const wr = one('[data-cl17="pill"][data-k="more"]'); const b = wr?.querySelector<HTMLElement>("[data-cl14-dd]"); const sw = document.querySelector<HTMLElement>('[data-lpop="more"] [data-opt="more:always"]');
        return { controls: vis('[data-cl14-dd="more"]').length + vis('[data-cl14-chip]').length, chip: (wr?.querySelector('[data-cl17="more-count"]')?.textContent ?? "").trim(), bg: b ? getComputedStyle(b).backgroundColor : "", sw: sw ? { checked: sw.getAttribute("aria-checked"), on: sw.querySelector('[data-cl17="switch"]')?.hasAttribute("data-on") ?? false, knob: sw.querySelector<HTMLElement>('[data-cl17="switch"] i') ? getComputedStyle(sw.querySelector<HTMLElement>('[data-cl17="switch"] i')!).transform : "" , n: Number((sw.querySelector('[data-cl17="opt-count"]')?.textContent ?? "").trim()) } : null, rows: [...document.querySelectorAll('[data-lpop="more"] [data-opt]')].length }; });
      const r0 = await state();
      L.check(`${w} exactly one More filters control, its chip reading "3"`, r0.controls === 1 && r0.chip === "3" && r0.bg === "rgb(255, 255, 255)", `${r0.controls} controls · chip "${r0.chip}" · ${r0.bg}`);
      await openMenu(page, "more");
      const r1 = await state();
      L.check(`${w} its panel holds three rows, all off`, r1.rows === 3 && r1.sw?.checked === "false" && r1.sw.on === false, JSON.stringify(r1.sw));
      const want = r1.sw?.n ?? -1;
      await page.locator('[data-lpop="more"] [data-opt="more:always"]').click(); await page.waitForTimeout(700);
      const r2 = await state(); const shown = await rowsShown(page);
      L.check(`${w} Always responds on: the list is filtered to its count`, shown === want && shown < total, `${shown} rows · count ${want} · of ${total}`);
      L.check(`${w} the switch shows on, and the pill is navy with "1 on"`, r2.sw?.checked === "true" && r2.sw.on && /matrix\(1, 0, 0, 1, 14, 0\)/.test(r2.sw.knob) && r2.chip === "1 on" && r2.bg === "rgb(45, 58, 80)", `${JSON.stringify(r2.sw)} · chip "${r2.chip}" · ${r2.bg}`);
      /* closed and reopened, and after the list re-renders (the density toggle) */
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await page.locator('.aglist [data-cl14-dens="compact"]').filter({ visible: true }).first().click(); await page.waitForTimeout(400);
      await page.locator('.aglist [data-cl14-dens="comfortable"]').filter({ visible: true }).first().click(); await page.waitForTimeout(400);
      await openMenu(page, "more");
      const r3 = await state();
      L.check(`${w} it is still on after the menu is closed and reopened and the list re-rendered`, r3.sw?.checked === "true" && r3.sw.on && (await rowsShown(page)) === want, `${JSON.stringify(r3.sw)} · ${await rowsShown(page)} rows`);
      await page.locator('[data-lpop="more"] [data-opt="more:always"]').click(); await page.waitForTimeout(700);
      const r4 = await state();
      L.check(`${w} switching it off restores all`, r4.sw?.checked === "false" && !r4.sw.on && r4.chip === "3" && (await rowsShown(page)) === total, `${JSON.stringify(r4.sw)} · chip "${r4.chip}" · ${await rowsShown(page)} of ${total}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
    L.done(12);
  });

  test("F1 · empty: the navy header, How it works and Ways to get started; the example is nobody; an agent brings the list", async ({ page }) => {
    const L = new Ledger("F1");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await page.addInitScript(() => { (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = 0; try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* */ } });
      await openApp(page, "/agents", vp);
      await page.locator('.aglist .clv-group').first().waitFor({ timeout: 30_000 });
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(700);
      await mutate(page, "F1");
      const r = await page.evaluate(() => {
        const g = [...document.querySelectorAll<HTMLElement>(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0);
        if (!g) return null;
        const q = (s: string) => [...g.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
        const hd = q('[data-cl17="empty-header"]')[0];
        return {
          empty: g.hasAttribute("data-clv-empty") && g.getAttribute("data-cl17") === "empty", list: q('[data-cl16="list"], [data-cl17="filter-row"], [data-cl17="card"], [data-clv="row"], [data-agent-card]').length, pinned: document.querySelectorAll('[data-cl17="pinned"]').length,
          hdBg: hd ? getComputedStyle(hd).backgroundColor : "", h1: (q("h1[data-page-title]")[0]?.getAttribute("aria-label") ?? ""), btns: q('[data-cl17="empty-header"] button').map((b) => (b.textContent ?? "").trim()),
          how: q('[data-cl17="how"] h2').map((h) => (h.textContent ?? "").trim()), label: (q('[data-cl17="example-label"]')[0]?.textContent ?? "").trim(), notes: q('[data-cl17="note"] h3').map((h) => (h.textContent ?? "").trim()),
          ways: q('[data-cl17="ways"] h2').map((h) => (h.textContent ?? "").trim()), cards: q('[data-cl17="way"]').map((c) => `${c.dataset.k}:${getComputedStyle(c).backgroundColor}`),
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      if (!r || !r.empty) { L.check(`${w} empty`, false, r ? "the page is not the v17 empty page" : "no page"); continue; }
      L.check(`${w} no list, filters, summary card or pinned row`, r.pinned === 0 && (MUT === "F1" ? r.list === 0 : r.list === 0), `${r.list} list parts or agent rows · ${r.pinned} pinned rows`);
      L.check(`${w} the navy header: "Every agent, in one place" and its two buttons`, r.hdBg === "rgb(45, 58, 80)" && r.h1 === "Every agent, in one place" && r.btns.join("|") === "+ Add your first agent|Import your list", `${r.hdBg} · "${r.h1}" · ${r.btns.join("|")}`);
      L.check(`${w} "How it works", with "AN EXAMPLE AGENT" and three notes`, r.how.join() === "How it works" && r.label.toUpperCase() === "AN EXAMPLE AGENT" && r.notes.join("|") === "Does it fit your book?|How to query them|Where you stand", `${r.how.join()} · "${r.label}" · ${r.notes.join("|")}`);
      L.check(`${w} "Ways to get started": three cards, Smart import navy`, r.ways.join() === "Ways to get started" && r.cards.length === 3 && r.cards[0] === "import:rgb(45, 58, 80)" && r.cards[1].startsWith("template:rgb(255, 255, 255)") && r.cards[2].startsWith("add:rgb(255, 255, 255)"), r.cards.join(" · "));
      L.check(`${w} nothing overflows sideways`, r.over === 0, `${r.over}`);
      /* the first agent arriving switches the page to the populated layout, with no reload */
      const nav = await page.evaluate(() => performance.getEntriesByType("navigation").length);
      await page.evaluate(() => { (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = undefined; window.dispatchEvent(new Event("sa:lh-count")); });
      await page.locator('.aglist [data-cl16="list"] [data-clv="row"]').first().waitFor({ timeout: 15_000 }).catch(() => {});
      const s = await page.evaluate(() => ({ list: document.querySelectorAll('.aglist [data-cl16="list"] [data-clv="row"]').length, empty: document.querySelectorAll('.aglist [data-cl17="empty"]').length, nav: performance.getEntriesByType("navigation").length, example: [...document.querySelectorAll(".aglist [data-clv='row']")].filter((e) => /Harriet Vale/.test(e.textContent ?? "")).length }));
      L.check(`${w} with agents on file the page is the populated layout, without a reload, and the example is not in it`, s.list > 0 && s.empty === 0 && s.nav === nav && s.example === 0, JSON.stringify(s));
    }
    L.done(12);
  });

  test("FS1 · full screen: the header goes, the pinned row leads, and leaving puts everything back", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("FS1");
    for (const vp of SIZES) {
      await open(page, vp, "FS1"); const w = `${vp.width}`;
      const read = () => page.evaluate(() => {
        const { g, sc, sheet, vis, one } = window.__c17(); const pin = document.querySelector<HTMLElement>('[data-cl17="pinned"]'); const side = document.getElementById("ws-sidebar"); const btn = one('[data-cl16="full"]'); const list = one('[data-cl16="list"]');
        return { on: g.hasAttribute("data-full"), url: new URLSearchParams(location.search).get("full"), header: vis('[data-cl17="header"]').length, footer: vis('[data-probe="app-footer"]').length,
          pin: !!pin?.hasAttribute("data-on"), pinTop: pin ? pin.getBoundingClientRect().top - sheet.getBoundingClientRect().top : NaN, pinW: pin ? pin.getBoundingClientRect().width - sheet.getBoundingClientRect().width : NaN,
          listTop: list && pin ? list.getBoundingClientRect().top - pin.getBoundingClientRect().bottom : NaN, listW: list?.getBoundingClientRect().width ?? NaN, sheetW: sheet.getBoundingClientRect().width,
          btn: btn ? { /* RE-POINTED (v18 §B): an icon button, named by its label */ text: (btn.getAttribute("aria-label") ?? btn.textContent ?? "").trim(), pressed: btn.getAttribute("aria-pressed") } : null, sideW: side?.getBoundingClientRect().width ?? NaN, sideStored: localStorage.getItem("scriptally:sidebar-collapsed"), scrollTop: sc.scrollTop,
          pills: [...document.querySelectorAll<HTMLElement>('[data-cl18="pin-letter"]')].map((p) => p.dataset.l ?? ""), card: vis('[data-cl17="card-row"]').map((x) => `${x.dataset.k}:${(x.querySelector('[data-cl17="card-n"]')?.textContent ?? "").trim()}`) };
      });
      const at = await setScroll16(page, 700);
      const r0 = await read();
      L.check(`${w} at rest: off, the header on the page, the sheet's button reads "Full screen"`, !r0.on && r0.url === null && r0.header === 1 && r0.btn?.text === "Full screen" && r0.btn.pressed === "false", JSON.stringify({ on: r0.on, url: r0.url, header: r0.header, btn: r0.btn }));
      /* the button is on the list sheet, which has scrolled; F is the same switch */
      await page.keyboard.press("f"); await page.waitForTimeout(900);
      await mutate(page, "FS1");
      const r1 = await read();
      L.check(`${w} F turns it on, and the URL carries it`, r1.on && r1.url === "1", `on ${r1.on} · ?full=${r1.url}`);
      L.check(`${w} the header and the footer are hidden`, r1.header === 0 && r1.footer === 0, `${r1.header} · ${r1.footer}`);
      L.check(`${w} the pinned row is shown on the sheet's top edge at its full width`, r1.pin && near(r1.pinTop, 0, 1) && near(r1.pinW, 0, 1), `shown ${r1.pin} · top ${r1.pinTop.toFixed(1)} · width off by ${r1.pinW.toFixed(1)}`);
      /* RE-POINTED (v18 §A): the pinned row's three group pills became the 26 compact letters */
      L.check(`${w} the pinned row carries the 26 letters`, r1.pills.length === 26 && r1.pills.join("") === "ABCDEFGHIJKLMNOPQRSTUVWXYZ", r1.pills.join(""));
      L.check(`${w} the list starts under the row, at the top, and fills the wider sheet`, r1.scrollTop === 0 && r1.listTop >= 0 && r1.listTop <= 24 && near(r1.listW, Math.min(1600, r1.sheetW - 48), 2) && r1.sheetW > r0.sheetW + 100, `scrollTop ${r1.scrollTop} · list ${r1.listTop.toFixed(1)} under the row · ${r1.listW.toFixed(1)} of sheet ${r1.sheetW.toFixed(1)} (was ${r0.sheetW.toFixed(1)})`);
      L.check(`${w} the sidebar is at its icons, and the writer's own setting is untouched`, near(r1.sideW, 68, 2) && r1.sideStored === r0.sideStored, `${r1.sideW} wide · stored ${r1.sideStored} (was ${r0.sideStored})`);
      L.check(`${w} the sheet's button reads "Exit full screen"`, r1.btn?.text === "Exit full screen" && r1.btn.pressed === "true", JSON.stringify(r1.btn));
      await page.keyboard.press("Escape"); await page.waitForTimeout(1200);
      const r2 = await read();
      L.check(`${w} Escape leaves: the header is back, the URL lets go, the sidebar is as it was`, !r2.on && r2.url === null && r2.header === 1 && near(r2.sideW, r0.sideW, 2), `on ${r2.on} · ?full=${r2.url} · header ${r2.header} · side ${r2.sideW} (was ${r0.sideW})`);
      L.check(`${w} the page returns to the scroll position it had`, near(r2.scrollTop, at as number, 2), `${at} → ${r1.scrollTop} → ${r2.scrollTop}`);
    }
    L.done(20);
  });
});
