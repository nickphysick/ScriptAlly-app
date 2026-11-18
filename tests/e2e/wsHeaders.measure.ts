/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workspace headers v1 — H1–H10 on the rendered page (design-refs/workspace-headers-v1), at 1440 × 900 and 1717 × 1000:
 *   npm run e2e:emu -- tests/e2e/wsHeaders.measure.ts --project=measure --workers=1
 *
 *   WSH_RECON=1   Step 0: reads the Query Centre, Contact list, To-do and Query letters headers and bars into
 *                 reports/workspace-headers-v1/before.json (H2's oracle and H1's), and each of the seven pages' header
 *                 and first section as they stand. Run once, on the served line, before any page changes.
 *   WSH_ONLY=<page>[,<page>]   run only those pages' blocks (and H2).
 *   WSH_MUTATE=all             each lock applies its own named break, so every lock must go red and name it.
 *
 * ⚠️ THE ORACLE FOR MEASUREMENTS IS THE BUILT QUERY CENTRE (before.json `qc`), never the ref.
 * ⚠️ RUN AT ONE WORKER. The harness account is on Free: Discover, Comparable titles and Versions render under their
 *    Pro locks (inert), as built; their headers are measured as rendered there.
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(420_000);
const DIR = "reports/workspace-headers-v1";
const READ = `${DIR}/readings`;
mkdirSync(READ, { recursive: true });
const RECON = process.env.WSH_RECON === "1";
const ONLY = (process.env.WSH_ONLY ?? "").split(",").filter(Boolean);
const MUT = process.env.WSH_MUTATE ?? "";
const brk = (lock: string) => MUT === "all" || MUT === lock;
const SIZES = [{ width: 1440, height: 900 }, { width: 1717, height: 1000 }] as const;
const MS = "cv25-ms";
const MS_EMPTY = "cv25-ms-empty";
const held: Record<string, unknown> = {};
const note = (k: string, v: unknown) => { held[k] = v; };
/* ⚠️ MERGED, NOT OVERWRITTEN: a failing case restarts the worker, and each worker's afterAll writes the file */
test.afterAll(() => {
  if (!Object.keys(held).length) return;
  const f = `${READ}/${RECON ? "recon" : "after"}${MUT ? `-${MUT}` : ""}${ONLY.length ? `-${ONLY.join("+")}` : ""}.json`;
  let was: Record<string, unknown> = {};
  try { was = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}; } catch { was = {}; }
  writeFileSync(f, JSON.stringify({ ...was, ...held }, null, 1));
});

/* ── the four built pages (H2) ── */
const BUILT = {
  qc: { route: "/queries", root: ".qc151.qc153[data-qc151='page']" },
  cl: { route: "/agents", root: ".cl27" },
  todo: { route: "/todo", root: "[data-tws='page']" },
  letters: { route: "/materials/letters", root: "[data-ql='page']" },
  /* Submission packages v43 (workspace-headers-v1.1: captured from then on, so H2 covers it) */
  pk: { route: "/queries/packages", root: "[data-pk62='page']" },
} as const;
/* recon of only some built pages (merged into before.json, the rest kept): WSH_BUILT=pk */
const BUILT_ONLY = (process.env.WSH_BUILT ?? "").split(",").filter(Boolean);

/* ── the seven pages ── */
type PageDef = {
  route: string;
  /** the page's root (the scroller's child), visible copy */
  root: string;
  /** the first body section under the header */
  first: string;
  /** H4's gap under the header, when the page's own brief sets one (Versions v6: 16; Responses v15: 30); 48 otherwise */
  gap?: number;
  /** the old header's root (H7: absent after) */
  old: string;
  /** H6: the headline's pattern, and the body's figure for the same thing */
  head: RegExp;
  figure?: string;
  /** H9: the body's empty state */
  empty?: string;
  /** H7: pieces that go */
  gone: string[];
  /** H3's break: the old column */
  oldColumn: string;
  init?: (page: Page) => Promise<void>;
  emptyInit?: (page: Page) => Promise<void>;
  ready: string;
  /** the headline's size where a page sets its own (px, by viewport width); absent = the Query Centre's */
  titleSize?: (w: number) => number;
};
const scope = (id: string) => async (page: Page) => {
  await page.addInitScript((m) => { try { localStorage.setItem("scriptally_active_manuscript_id", m); localStorage.setItem("sa.guide.queries", "1"); } catch { /* private */ } }, id);
};
const PAGES: Record<string, PageDef> = {
  responses: {
    /* RE-POINTED (Responses v15, 17 Nov): the glance cards are gone; the first section is the body's first part, and the
       headline's figure is the header's own "{n} of {m} have replied" (tests/e2e/RETIRED-responses-v15.md) */
    route: "/queries/responses", root: "[data-rsp='page']", first: "[data-rsp15='body'] > :first-child", old: "[data-rsp5='title-card']",
    head: /^(\d+) responses?$/, figure: "[data-rsp15='replied']", empty: "[data-rsp15='empty']", gone: [".rsp5-card .phc-tx > p", "[data-rsp5='title-card']", "[data-rsp5='glance-wrap']"],
    oldColumn: "[data-rsp15='body'] { margin-inline: 24px !important; }", init: scope(MS), emptyInit: scope(MS_EMPTY), ready: "[data-rsp15='body'], [data-rsp15='empty']", gap: 30,
  },
  analytics: {
    route: "/queries/analytics", root: "[data-a17='page']", first: "[data-a21='desk']", old: "[data-a21='header']",
    head: /^(\d+) quer(?:y|ies), (\d+|no) repl(?:y|ies)$/, empty: "[data-a21='empty']", gone: ["[data-a21='counts']", "[data-a21='header']"],
    oldColumn: "[data-a21='desk'] { margin-inline: 24px !important; }", init: scope(MS), emptyInit: scope(MS_EMPTY), ready: "[data-a21='desk']",
  },
  discover: {
    route: "/agents/discover", root: "[data-dv1='page']", first: "[data-dv1='share-notice'], [data-dv1='picks']", old: "[data-dv1='header']",
    head: /^(\d+) agents? to consider$/, gone: ["[data-dv1='row']", "[data-dv1='header']"],
    oldColumn: "[data-dv1='picks'], [data-dv1='share-notice'] { margin-inline: 24px !important; }",
    init: async (page) => { await scope(MS)(page); await page.addInitScript(() => { (window as unknown as Record<string, unknown>).__SA_DV_STATE = "live"; }); },
    ready: "[data-dv1='picks']",
  },
  /* RE-POINTED (comps v32, 17 Nov): the headline is "{n} comparable titles"; the first section is the striped band or the
     shelf-and-open-comp grid; v30's highlight ring and "Compare your letters" are gone with the header's right block */
  comps: {
    route: "/manuscripts/comps", root: "[data-cpv='page']", first: "[data-cp='notice'], [data-cp='grid']", old: "[data-cp='top']",
    head: /^(\d+) comparable titles?$/, figure: "[data-cp='shelf-count']", empty: "[data-cp='how-steps']", gone: ["[data-cp='lead']", "[data-cp='top']", "[data-cp='hl-open']", "[data-cp='letter-grid']"],
    oldColumn: "[data-cp='notice'], [data-cp='grid'] { margin-inline: 24px !important; }", init: scope(MS), emptyInit: scope(MS_EMPTY), ready: "[data-cp='shelf']",
    titleSize: (w) => Math.min(66, Math.max(44, w * 0.036)),
  },
  versions: {
    /* Harbour of Glass (msv12-ms): the harness book with versions on file (Murphy's Day Out has none in the model) */
    /* RE-POINTED (Versions v6, 17 Nov): the ref titles the page "Versions" (no figure in the headline), and its first
       section — the founding band, else the notice, else the desk — sits 16 under the header (VV6 S1), not 48 */
    route: "/manuscripts/versions", root: "[data-vv2='page']", first: "[data-vv6='founding'], [data-vv6='notice'], [data-vv6='desk']", old: "[data-vv2='title']",
    head: /^Versions$/, empty: "[data-vv6='day-one']", gone: ["[data-vv2='title']", "#vCnt", "[data-vv2='list-sec']", "[data-vv2='tree']"], gap: 16,
    oldColumn: "[data-vv6='top'], [data-vv6='desk'] { margin-inline: 48px !important; }", init: scope("msv12-ms"), emptyInit: scope(MS_EMPTY), ready: "[data-vv6='desk']",
  },
  /* RE-POINTED (Manuscripts v29, 18 Nov): the book container and the page foot are gone; the first section is the desk
     (the pitch · Details and Your manuscripts), 24 under the header as the v29 ref sets it (its `.head` margin), not 48.
     The header's own box, title and bar are untouched (MSV29 L1 holds them against the line before the pack). */
  manuscripts: {
    route: "/manuscripts", root: "[data-msv12='page']", first: "[data-ms29='desk']", old: "[data-ms27='header']",
    head: /^.+$/, gone: ["[data-ms27='header']", "[data-ms27='book']", "[data-ms28='foot']"], gap: 24,
    oldColumn: "[data-ms29='desk'] { margin-inline: 24px !important; }", init: scope(MS), ready: "[data-ms29='desk']",
  },
  corkboard: {
    route: "/todo/corkboard", root: "[data-cb2='page']", first: "[data-cb2='tools']", old: "[data-cb2='panel']",
    head: /^(\d+) notes?$/, figure: "[data-cb2='wall'] [data-cb2-note]", empty: "[data-cb2='empty']", gone: ["[data-cb2='panel']"],
    oldColumn: "[data-cb2='tools'] { margin-inline: 24px !important; }",
    emptyInit: async (page) => { await page.addInitScript(() => { (window as unknown as Record<string, unknown>).__SA_CB_ONLY = "wsh-none-"; }); },
    ready: "[data-cb2='tools']",
  },
};
const PAGE_KEYS = Object.keys(PAGES).filter((k) => !ONLY.length || ONLY.includes(k));

/* ── readings ── */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}
async function open(page: Page, route: string, root: string, vp: { width: number; height: number }, ready?: string) {
  await openRoute(page, route, vp);
  await expect(page.locator(`${root}:visible`).first()).toBeVisible({ timeout: 60_000 });
  if (ready) await page.locator(`${root}:visible ${ready}`).first().waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  await settle(page);
}
async function scrollTo(page: Page, root: string, y: number) {
  await page.evaluate(([rs, v]) => {
    const r = [...document.querySelectorAll<HTMLElement>(rs as string)].find((e) => e.getBoundingClientRect().width > 0)!;
    const sc = (r.closest<HTMLElement>(".wpg-scroll") ?? r.querySelector<HTMLElement>(".wpg-scroll") ?? document.scrollingElement as HTMLElement);
    sc.scrollTop = v as number;
  }, [root, y] as const);
  await page.waitForTimeout(800);
}

/** the header: its box, radius, ground, the title's left and size, a button's height */
const readHeader = (page: Page, root: string, hdSel: string) => page.evaluate(([rs, hs]) => {
  const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0);
  if (!r) return null;
  const hd = r.querySelector<HTMLElement>(hs);
  if (!hd) return { missing: hs };
  const b = hd.getBoundingClientRect();
  const h1 = hd.querySelector<HTMLElement>("h1");
  const rg = document.createRange(); if (h1) rg.selectNodeContents(h1);
  const tb = h1 ? rg.getBoundingClientRect() : null;
  const btn = hd.querySelector<HTMLElement>("button");
  const cs = getComputedStyle(hd);
  const sc = (r.closest<HTMLElement>(".wpg-scroll") ?? r.querySelector<HTMLElement>(".wpg-scroll") ?? document.scrollingElement as HTMLElement).getBoundingClientRect();
  return {
    left: b.left, right: b.right, top: b.top, bottom: b.bottom, height: b.height, width: b.width, scLeft: sc.left,
    radius: cs.borderTopLeftRadius, bg: cs.backgroundColor, shadow: cs.boxShadow, marginBottom: cs.marginBottom,
    titleLeft: tb?.left ?? null, titleRight: tb?.right ?? null, titleSize: h1 ? getComputedStyle(h1).fontSize : null,
    titleFamily: h1 ? getComputedStyle(h1).fontFamily : null, titleLines: h1 && tb ? Math.round(tb.height / parseFloat(getComputedStyle(h1).lineHeight || "1")) : null,
    titleText: h1?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    buttonH: btn ? btn.getBoundingClientRect().height : null,
    grid: cs.gridTemplateColumns, artDisplay: (() => { const a = hd.querySelector<HTMLElement>(".qc1531-art"); return a ? getComputedStyle(a).display : null; })(),
    rightW: (() => { const a = hd.querySelector<HTMLElement>(".qc1531-rc"); return a ? a.getBoundingClientRect().width : null; })(),
  };
}, [root, hdSel] as const);

/** the bar: shown?, inert, its height, title size, button height, and the ground's reach to the sheet's edges */
const readBar = (page: Page, root: string, barSel: string) => page.evaluate(([rs, bs]) => {
  const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0);
  if (!r) return null;
  const bar = r.querySelector<HTMLElement>(bs);
  if (!bar) return { missing: bs };
  const b = bar.getBoundingClientRect();
  const sc = (r.closest<HTMLElement>(".wpg-scroll") ?? r.querySelector<HTMLElement>(".wpg-scroll") ?? document.scrollingElement as HTMLElement);
  const s = sc.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const bl = parseFloat(cs.getPropertyValue("--qc156-bl")) || 0, br = parseFloat(cs.getPropertyValue("--qc156-br")) || 0;
  const t = bar.querySelector<HTMLElement>(".qc156-st b"), btn = bar.querySelector<HTMLElement>(".qc156-sb");
  const before = getComputedStyle(bar, "::before");
  return {
    shown: bar.hasAttribute("data-shown"), inert: bar.hasAttribute("inert"), ariaHidden: bar.getAttribute("aria-hidden"),
    visibility: cs.visibility, opacity: cs.opacity, top: b.top - s.top, height: b.height,
    titleSize: t ? getComputedStyle(t).fontSize : null, titleText: t?.textContent ?? null, buttonH: btn ? btn.getBoundingClientRect().height : null,
    buttonBg: btn ? getComputedStyle(btn).backgroundColor : null,
    groundLeft: b.left - bl - s.left, groundRight: s.left + sc.clientWidth - (b.right + br), groundBg: before.backgroundColor,
  };
}, [root, barSel] as const);

/** a box's edges */
const readBox = (page: Page, root: string, sel: string) => page.evaluate(([rs, s]) => {
  const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0);
  const el = r ? [...r.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) : null;
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, tag: el.tagName, cls: el.className };
}, [root, sel] as const);

/** sideways overflow of the page's scroller and the window, and a title that does not fit its column */
const readOverflow = (page: Page, root: string) => page.evaluate((rs) => {
  const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
  const sc = (r.closest<HTMLElement>(".wpg-scroll") ?? r.querySelector<HTMLElement>(".wpg-scroll") ?? document.scrollingElement as HTMLElement);
  const h1 = r.querySelector<HTMLElement>("[data-wsnh='title']") ?? r.querySelector<HTMLElement>("h1");
  const main = h1?.closest<HTMLElement>(".qc1531-main") ?? h1?.parentElement ?? null;
  const rg = document.createRange(); if (h1) rg.selectNodeContents(h1);
  const t = rg.getBoundingClientRect(), m = main?.getBoundingClientRect();
  const hd = h1?.closest<HTMLElement>("header");
  return {
    scroller: sc.scrollWidth - sc.clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    titleOverflow: m ? Math.max(0, t.right - m.right, m.left - t.left) : null,
    titleClipped: h1 ? h1.scrollWidth > h1.clientWidth + 1 || h1.scrollHeight > h1.clientHeight + 1 : null,
    headerClipped: hd ? hd.scrollHeight > hd.clientHeight + 1 : null,
    /* what reaches past the sheet's right edge (the widest three), so a red names its cause */
    past: [...sc.querySelectorAll<HTMLElement>("*")].map((e) => ({ e, r: e.getBoundingClientRect().right }))
      .filter((x) => x.r > sc.getBoundingClientRect().left + sc.clientWidth + 1 && x.e.getBoundingClientRect().width > 0)
      .sort((a, b) => b.r - a.r).slice(0, 3)
      .map((x) => `${x.e.tagName.toLowerCase()}.${String(x.e.className).split(" ").slice(0, 2).join(".")} → ${Math.round(x.r - (sc.getBoundingClientRect().left + sc.clientWidth))}px${x.e.closest(".wsnh") ? " (in the header)" : ""}`),
  };
}, root);

/* ── the oracle ── */
const BEFORE = `${DIR}/before.json`;
type Reading = Record<string, unknown>;
const before = (): Record<string, Record<string, Reading>> => JSON.parse(readFileSync(BEFORE, "utf8"));
const near = (a: unknown, b: unknown, tol = 1) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tol;

/* ══ Step 0 — the readings before anything changes ══ */
test.describe("Step 0 · recon", () => {
  test.skip(!RECON, "WSH_RECON=1 only");
  for (const vp of SIZES) {
    test(`built headers and bars @${vp.width}`, async ({ page }) => {
      const out: Record<string, Reading> = {};
      for (const [k, d] of Object.entries(BUILT).filter(([k]) => !BUILT_ONLY.length || BUILT_ONLY.includes(k))) {
        await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
        await scope(MS)(page);
        await open(page, d.route, d.root, vp, "header.qc1531-hd");
        const hd = await readHeader(page, d.root, "header.qc1531-hd");
        const rest = await readBar(page, d.root, ".qc156-slim");
        await scrollTo(page, d.root, 600);
        const bar = await readBar(page, d.root, ".qc156-slim");
        out[k] = { header: hd, barAtRest: rest, bar };
      }
      const all = existsSync(BEFORE) ? before() : {};
      all[String(vp.width)] = { ...(all[String(vp.width)] ?? {}), ...out };
      writeFileSync(BEFORE, JSON.stringify(all, null, 1));
      note(`built-${vp.width}`, out);
    });
    for (const key of Object.keys(PAGES)) {
      test(`${key} as built @${vp.width}`, async ({ page }) => {
        const d = PAGES[key];
        if (d.init) await d.init(page);
        await open(page, d.route, d.root, vp, d.ready);
        const old = await readBox(page, d.root, d.old);
        const first = await readBox(page, d.root, d.first);
        const hd = await page.evaluate((rs) => {
          const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0);
          if (!r) return null;
          const s = (r.closest<HTMLElement>(".wpg-scroll") ?? r.querySelector<HTMLElement>(".wpg-scroll") ?? document.scrollingElement as HTMLElement).getBoundingClientRect(), b = r.getBoundingClientRect(), cs = getComputedStyle(r);
          return { scLeft: s.left, scRight: s.right, rootLeft: b.left + parseFloat(cs.paddingLeft), rootRight: b.right - parseFloat(cs.paddingRight), h1: r.querySelectorAll("h1").length, display: cs.display };
        }, d.root);
        note(`${key}-${vp.width}`, { old, first, column: hd });
      });
    }
  }
});

/* ══ the breaks (WSH_MUTATE) — page-side, applied after the page has settled ══ */
async function mutate(page: Page, key: string) {
  if (!MUT) return;
  const d = PAGES[key];
  await page.evaluate(([m, oldCol]) => {
    const all = m === "all";
    const css = (t: string) => { const s = document.createElement("style"); s.textContent = t; document.head.appendChild(s); };
    /* H1 · the old header's frame in place of the Query Centre's: its own radius and height */
    if (all || m === "H1") css(".qc151.qc153.wsnh > .qc1531-hd.wsnh-hd.wsnh-hd.wsnh-hd { border-radius: 22px !important; min-height: 300px !important; }");
    /* H3 · the page's old column */
    if (all || m === "H3") css(oldCol as string);
    /* H4 · 24 under the header, not 48 */
    if (all || m === "H4") css(".qc151.qc153.wsnh > .qc1531-hd.wsnh-hd.wsnh-hd.wsnh-hd { margin-bottom: 24px !important; }");
    /* H5 · `.wsnh` out of qcv156 §3: every rule whose list names it loses it */
    if (all || m === "H5") {
      for (const sh of [...document.styleSheets]) {
        let rules: CSSRuleList; try { rules = sh.cssRules; } catch { continue; }
        const walk = (rs: CSSRuleList) => { for (const r of [...rs]) {
          if (r instanceof CSSStyleRule && /\.wsnh\) (>|\.qc156)/.test(r.selectorText) && /qc156-(slim|st|sb|sa|sw)/.test(r.selectorText)) r.selectorText = r.selectorText.replace(/, \.wsnh\)/g, ")");
          else if ("cssRules" in r) walk((r as CSSGroupingRule).cssRules);
        } };
        walk(rules);
      }
    }
    /* H5b · the bar's §3 rules gone from these pages: the prescribed break (`.wsnh` out of §3) cannot redden H5, because
       the wrapper also carries `.qc151.qc153`, which §3's lists already name; this drops every §3 bar rule's reach here */
    if (m === "H5b") css(".qc151.qc153.wsnh > .qc156-slim.qc156-slim { all: revert !important; } .qc151.qc153.wsnh > .qc156-slim::before { content: none !important; }");
    /* H6 · the headline's figure off by one */
    if (all || m === "H6") {
      const bump = () => { for (const h of document.querySelectorAll<HTMLElement>("[data-wsnh='title']")) { const t = h.textContent ?? ""; const n = t.match(/^\d+/); if (n && !h.dataset.bumped) { h.dataset.bumped = "1"; h.textContent = t.replace(/^\d+/, String(+n[0] + 1)); } } };
      bump(); window.setInterval(bump, 50);
    }
  }, [MUT, d.oldColumn] as const);
  await page.waitForTimeout(300);
}

/* ══ H2 · the built pages' headers and bars are as they were ══ */
test.describe("H2 · the built headers and bars equal before.json", () => {
  test.skip(RECON, "the recon run writes before.json");
  for (const vp of SIZES) {
    test(`H2 @${vp.width}`, async ({ page }) => {
      const was = before()[String(vp.width)];
      expect(was, "before.json has this size").toBeTruthy();
      const now: Record<string, Reading> = {};
      for (const [k, d] of Object.entries(BUILT)) {
        await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
        await scope(MS)(page);
        await open(page, d.route, d.root, vp, "header.qc1531-hd");
        if (brk("H2")) await page.addStyleTag({ content: ":is(.qc151.qc153, .cl27, .tws56-hdw) > .qc1531-hd.qc1531-hd.qc1531-hd { background: #2b3a52 !important; }" });
        const hd = await readHeader(page, d.root, "header.qc1531-hd");
        await scrollTo(page, d.root, 600);
        const bar = await readBar(page, d.root, ".qc156-slim");
        now[k] = { header: hd, bar };
        const a = was[k] as { header: Reading; bar: Reading }, h = hd as Reading;
        for (const f of ["left", "right", "height", "titleLeft", "buttonH"]) expect.soft(near(h[f], a.header[f]), `H2 ${k} header ${f}: ${h[f]} vs ${a.header[f]}`).toBe(true);
        for (const f of ["radius", "bg", "shadow", "titleSize", "titleFamily"]) expect.soft(h[f], `H2 ${k} header ${f}`).toBe(a.header[f]);
        if (a.bar && !("missing" in a.bar)) {
          const b = bar as Reading;
          for (const f of ["height", "buttonH", "groundLeft", "groundRight", "top"]) expect.soft(near(b[f], a.bar[f]), `H2 ${k} bar ${f}: ${b[f]} vs ${a.bar[f]}`).toBe(true);
          for (const f of ["shown", "titleSize", "buttonBg", "groundBg"]) expect.soft(b[f], `H2 ${k} bar ${f}`).toBe(a.bar[f]);
        }
      }
      note(`H2-${vp.width}`, now);
    });
  }
});

/* ══ H1, H3–H7 · each page, at rest and at 600px scrolled ══ */
for (const key of PAGE_KEYS) {
  test.describe(`${key}`, () => {
    for (const vp of SIZES) {
      test(`${key} H1 H3 H4 H5 H6 H7 @${vp.width}`, async ({ page }) => {
        const d = PAGES[key];
        const qc = existsSync(BEFORE) ? (before()[String(vp.width)]?.qc as { header: Reading; bar: Reading } | undefined) : undefined;
        expect(qc, "before.json carries the Query Centre's readings").toBeTruthy();
        if (d.init) await d.init(page);
        await open(page, d.route, d.root, vp, d.ready);
        await mutate(page, key);
        const out: Record<string, unknown> = {};
        /* H1 · the header is the Query Centre's */
        const hd = (await readHeader(page, d.root, "[data-wsnh='header']")) as Reading | null;
        out.header = hd;
        const has = !!hd && !("missing" in hd);
        expect.soft(has, "H1 the shared header is on the page").toBe(true);
        if (has && qc) {
          const q = qc.header;
          const fields = key === "manuscripts" && (hd.titleLines as number) > 1 ? ["left", "right", "titleLeft", "buttonH"] : ["left", "right", "height", "titleLeft", "buttonH"];
          for (const f of fields) expect.soft(near(hd[f], q[f]), `H1 ${f}: ${hd[f]} vs the Query Centre's ${q[f]}`).toBe(true);
          for (const f of ["radius", "bg"]) expect.soft(hd[f], `H1 ${f}`).toBe(q[f]);
          /* RE-POINTED (comps v32, 17 Nov): Comparable titles sizes its headline on its own page only,
             clamp(44px, 3.6vw, 66px), so it stays on one line beside its right-hand block (CP32 H1 holds it) */
          if (d.titleSize) expect.soft(parseFloat(String(hd.titleSize)), `H1 titleSize (this page's own)`).toBeCloseTo(d.titleSize(vp.width), 0);
          else expect.soft(hd.titleSize, `H1 titleSize`).toBe(q.titleSize);
        }
        /* H3 · the first body section on the header's edges · H4 · 48 under it */
        const first = await readBox(page, d.root, d.first);
        out.first = first;
        expect.soft(!!first, `H3 the first section (${d.first}) is found`).toBe(true);
        if (has && first) {
          expect.soft(near(first.left, hd.left), `H3 left: ${first.left} vs ${hd.left}`).toBe(true);
          expect.soft(near(first.right, hd.right), `H3 right: ${first.right} vs ${hd.right}`).toBe(true);
          expect.soft(near(first.top - (hd.bottom as number), d.gap ?? 48), `H4 gap: ${first.top - (hd.bottom as number)} (want ${d.gap ?? 48})`).toBe(true);
        }
        /* H6 · the headline and its figure */
        const title = has ? String(hd.titleText) : "";
        const m = title.match(d.head);
        expect.soft(!!m, `H6 the headline "${title}" matches ${d.head}`).toBe(true);
        if (d.figure && m) {
          const body = await page.evaluate(([rs, fs]) => {
            const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
            const els = [...r.querySelectorAll<HTMLElement>(fs)];
            return { count: els.length, first: els[0]?.textContent ?? null };
          }, [d.root, d.figure] as const);
          const fig = /\[data-cb2-note\]|\[data-vv2='row'\]/.test(d.figure) ? body.count : parseInt(String(body.first ?? "").match(/\d+/)?.[0] ?? "NaN", 10);
          out.figure = { body, fig };
          expect.soft(fig > 0, `H6 the body's population is non-zero (${fig})`).toBe(true);
          expect.soft(+m[1], `H6 the headline's figure equals the body's`).toBe(fig);
        }
        /* H7 · one h1, the old header gone, the dropped pieces gone */
        const h7 = await page.evaluate(([rs, old, gone]) => {
          const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
          return { h1: r.querySelectorAll("h1").length, old: r.querySelectorAll(old as string).length, gone: (gone as string[]).map((g) => [g, r.querySelectorAll(g).length]) };
        }, [d.root, d.old, d.gone] as const);
        out.h7 = h7;
        expect.soft(h7.h1, "H7 exactly one h1").toBe(1);
        expect.soft(h7.old, `H7 the old header (${d.old}) is gone`).toBe(0);
        for (const [g, n] of h7.gone) expect.soft(n, `H7 ${g} is gone`).toBe(0);
        /* H5 · at rest the bar is hidden and inert; at 600 it shows, as the Query Centre's */
        const rest = (await readBar(page, d.root, "[data-wsnh='slim']")) as Reading | null;
        out.barAtRest = rest;
        const barHas = !!rest && !("missing" in rest);
        expect.soft(barHas, "H5 the bar is on the page").toBe(true);
        if (barHas) {
          expect.soft(rest.shown, "H5 at rest: not shown").toBe(false);
          expect.soft(rest.inert && rest.ariaHidden === "true", "H5 at rest: inert and aria-hidden").toBe(true);
          expect.soft(rest.visibility, "H5 at rest: hidden").toBe("hidden");
        }
        /* a page shorter than 600px of scroll (the Manuscripts book, a small Corkboard) gets room at its foot for the
           reading — a measurement aid appended to the page root, removed after; the product is not changed */
        const pad = await page.evaluate((rs) => {
          const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
          const sc = r.closest<HTMLElement>(".wpg-scroll")!;
          if (sc.scrollHeight - sc.clientHeight >= 620) return 0;
          const s = document.createElement("div"); s.id = "wsh-pad"; s.style.height = "900px"; r.appendChild(s); return 900;
        }, d.root);
        out.pad = pad;
        await scrollTo(page, d.root, 600);
        const bar = (await readBar(page, d.root, "[data-wsnh='slim']")) as Reading | null;
        out.bar = bar;
        if (barHas && bar && qc?.bar) {
          const q = qc.bar;
          expect.soft(bar.shown, "H5 at 600: shown").toBe(true);
          expect.soft(bar.visibility, "H5 at 600: visible").toBe("visible");
          expect.soft(near(bar.height, 60) && near(bar.height, q.height), `H5 height ${bar.height} (Query Centre ${q.height})`).toBe(true);
          expect.soft(bar.titleSize, "H5 title 24px").toBe("24px");
          expect.soft(near(bar.buttonH, 40) && near(bar.buttonH, q.buttonH), `H5 button ${bar.buttonH} (Query Centre ${q.buttonH})`).toBe(true);
          expect.soft(bar.buttonBg, "H5 the button is the Query Centre's navy").toBe(q.buttonBg);
          expect.soft(near(bar.groundLeft, 0) && near(bar.groundRight, 0), `H5 the ground reaches the sheet's edges (${bar.groundLeft}, ${bar.groundRight})`).toBe(true);
          /* the Query Centre retones its own page colour (qcv156 §5); these pages keep the default page colour, as the
             Contact list's and To-do's bars do (Step 0) */
          const cl = (before()[String(vp.width)]?.cl as { bar: Reading } | undefined)?.bar;
          expect.soft(bar.groundBg, "H5 the ground is the default page colour (the Contact list's bar's)").toBe(cl?.groundBg);
          expect.soft(near(bar.top, q.top), `H5 the bar sits where the Query Centre's does (${bar.top} vs ${q.top})`).toBe(true);
          expect.soft(bar.titleText, "H5 the bar's title is the headline").toBe(title);
        }
        note(`${key}-${vp.width}${MUT ? `-${MUT}` : ""}`, out);
      });
    }

    /* H8 · no sideways overflow at 1280, 1024 and 820; at 1280 the title fits; Manuscripts' 60-character title wraps */
    test(`${key} H8`, async ({ page }) => {
      const d = PAGES[key];
      if (d.init) await d.init(page);
      const out: Record<string, unknown> = {};
      for (const w of [1280, 1024, 820]) {
        await open(page, d.route, d.root, { width: w, height: 900 }, d.ready);
        const o = await readOverflow(page, d.root);
        out[w] = o;
        expect.soft(o.scroller <= 0 && o.doc <= 0, `H8 @${w}: no sideways overflow (${o.scroller}, ${o.doc})`).toBe(true);
        if (w === 1280) expect.soft(o.titleOverflow === 0 && o.titleClipped === false, `H8 @1280: the title fits (${o.titleOverflow}, ${o.titleClipped})`).toBe(true);
      }
      if (key === "manuscripts") {
        await open(page, d.route, d.root, { width: 1280, height: 900 }, d.ready);
        const long = "The Long and Winding Road Home to Kinsale with Murphy's Dogs"; // 60 characters
        const r = await page.evaluate(([rs, t]) => {
          const root = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
          const h1 = root.querySelector<HTMLElement>("[data-wsnh='title']");
          if (!h1) return null;
          h1.textContent = t;
          const lh = parseFloat(getComputedStyle(h1).lineHeight);
          const hd = h1.closest<HTMLElement>("header")!;
          return { len: t.length, lines: Math.round(h1.getBoundingClientRect().height / lh), size: getComputedStyle(h1).fontSize, clipped: h1.scrollWidth > h1.clientWidth + 1 || hd.scrollHeight > hd.clientHeight + 1 };
        }, [d.root, long] as const);
        out.long = r;
        expect.soft(r?.len, "H8 the title is 60 characters").toBe(60);
        expect.soft(r?.lines, "H8 a 60-character title wraps to two lines").toBe(2);
        expect.soft(r?.size, "H8 at the same size").toBe("54px");
        expect.soft(r?.clipped, "H8 and clips nothing").toBe(false);
      }
      note(`${key}-H8`, out);
    });

    /* H9 · the empty state: the navy header, no right block, one line of headline, the body's own empty state */
    test(`${key} H9`, async ({ page }) => {
      const d = PAGES[key];
      test.skip(!d.emptyInit, "no empty state reachable on the harness account");
      await d.emptyInit!(page);
      await open(page, d.route, d.root, SIZES[0], d.empty);
      const r = await page.evaluate(([rs, es]) => {
        const root = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
        const hd = root.querySelector<HTMLElement>("[data-wsnh='header']");
        const h1 = hd?.querySelector<HTMLElement>("h1");
        const lh = h1 ? parseFloat(getComputedStyle(h1).lineHeight) : 1;
        return { header: !!hd, right: !!hd?.querySelector("[data-wsnh='right']"), lines: h1 ? Math.round(h1.getBoundingClientRect().height / lh) : null, title: h1?.textContent ?? null, body: !!(es && root.querySelector(es as string)), h1s: root.querySelectorAll("h1").length };
      }, [d.root, d.empty ?? ""] as const);
      note(`${key}-H9`, r);
      expect.soft(r.header, "H9 the navy header").toBe(true);
      expect.soft(r.right, "H9 no right block").toBe(false);
      expect.soft(r.lines, `H9 one line of headline ("${r.title}")`).toBe(1);
      expect.soft(r.body, "H9 the body's empty state").toBe(true);
      expect.soft(r.h1s, "H9 exactly one h1").toBe(1);
    });
  });
}

/* ══ Workspace headers v1.1 — block T: every navy header sits the same distance from the top of the sheet ═══════════
 *   npm run e2e:emu -- tests/e2e/wsHeaders.measure.ts --project=measure --workers=1 --grep "T ·"
 *   WSH_T=recon   Step 0: writes reports/workspace-headers-v1-1/step0.json and the Query Centre's header + bar shots
 *                 (T3's oracle). Run once, on the served line, before the fix.
 *   WSH_MUTATE=T1 the fix removed (the wrapper's top restored to what it was) · T2 a −12px top margin on the header
 *   (reddens Manuscripts only) · T2b the header lifted 50px (every page).
 * The SHEET is the page's scroller (`.wpg-scroll`): its top edge is the sheet's lip. The oracle is the Query Centre's
 * own gap, read in the same run. */
const T_DIR = "reports/workspace-headers-v1-1";
const T_RECON = process.env.WSH_T === "recon";
const T_PAGES: { key: string; route: string; root: string; ms: string; face?: string }[] = [
  { key: "qc", route: "/queries", root: "[data-qc151='page']", ms: MS },
  { key: "cl", route: "/agents", root: ".clv-group.cl27", ms: MS },
  { key: "todo", route: "/todo", root: "[data-tws='page']", ms: MS },
  { key: "letters", route: "/materials/letters", root: "[data-ql='page']", ms: MS },
  { key: "pk", route: "/queries/packages", root: "[data-pk62='page']", ms: MS },
  { key: "responses", route: "/queries/responses", root: "[data-rsp='page']", ms: MS },
  { key: "analytics", route: "/queries/analytics", root: "[data-a17='page']", ms: MS },
  { key: "discover", route: "/agents/discover", root: "[data-dv1='page']", ms: MS, face: "live" },
  { key: "comps", route: "/manuscripts/comps", root: "[data-cpv='page']", ms: MS },
  { key: "versions", route: "/manuscripts/versions", root: "[data-vv2='page']", ms: "msv12-ms" },
  { key: "manuscripts", route: "/manuscripts", root: "[data-msv12='page']", ms: MS },
  { key: "corkboard", route: "/todo/corkboard", root: "[data-cb2='page']", ms: MS },
];
async function tOpen(page: Page, d: (typeof T_PAGES)[number], vp: { width: number; height: number }) {
  await page.addInitScript(([m, f]) => {
    try { localStorage.setItem("scriptally_active_manuscript_id", m); localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ }
    if (f) (window as unknown as Record<string, unknown>).__SA_DV_STATE = f;
  }, [d.ms, d.face ?? ""] as const);
  await open(page, d.route, d.root, vp, "header.qc1531-hd");
  await page.locator(`${d.root}:visible header.qc1531-hd`).first().waitFor({ state: "visible", timeout: 30_000 });
  await scrollTo(page, d.root, 0);
}
async function tMutate(page: Page) {
  /* T2b · the prescribed −12 leaves most headers 18–26 below the sheet's top, corners in plain view (only Manuscripts
     reddens): this one lifts every header past the sheet's edge, so every page's corners are cut. A transform, not a
     margin: on the `.wsnh` pages a negative margin collapses into the page's first box and stops flush at the top. */
  if (MUT === "T2b") await page.addStyleTag({ content: "header.qc1531-hd.qc1531-hd.qc1531-hd.qc1531-hd.qc1531-hd.qc1531-hd.qc1531-hd { transform: translateY(-50px) !important; }" });
  if (MUT === "T2") await page.addStyleTag({ content: "header.qc1531-hd.qc1531-hd.qc1531-hd.qc1531-hd.qc1531-hd.qc1531-hd.qc1531-hd { margin-top: -12px !important; }" });
  if (MUT === "T1") await page.evaluate(() => {
    /* the fix's own rules, switched off: every rule this pass added carries `--wsh11` */
    for (const sh of [...document.styleSheets]) {
      let rules: CSSRuleList; try { rules = sh.cssRules; } catch { continue; }
      const walk = (rs: CSSRuleList) => { for (const r of [...rs]) {
        if (r instanceof CSSStyleRule && r.style.getPropertyValue("--wsh11")) { for (const p of [...r.style]) r.style.removeProperty(p); }
        else if ("cssRules" in r) walk((r as CSSGroupingRule).cssRules);
      } };
      walk(rules);
    }
  });
  if (MUT) await page.waitForTimeout(400);
}
/** the gap, the chain that makes it, and the four corners' sample points */
const readTop = (page: Page, root: string) => page.evaluate((rs) => {
  const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
  const hd = r.querySelector<HTMLElement>("header.qc1531-hd")!;
  /* the sheet: the header's nearest scrolling ancestor (the page's scroller) */
  let sc: HTMLElement = document.scrollingElement as HTMLElement;
  for (let e = hd.parentElement; e; e = e.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(e).overflowY)) { sc = e; break; } }
  const s = sc.getBoundingClientRect(), b = hd.getBoundingClientRect(), cs = getComputedStyle(hd);
  const rad = parseFloat(cs.borderTopLeftRadius) || 0;
  const chain: { el: string; top: number; padTop: string; marTop: string; borTop: string; display: string }[] = [];
  for (let e: HTMLElement | null = hd; e && e !== sc.parentElement; e = e.parentElement) {
    const c = getComputedStyle(e);
    chain.push({ el: `${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/).slice(0, 4).join(".")}`, top: Math.round((e.getBoundingClientRect().top - s.top) * 10) / 10, padTop: c.paddingTop, marTop: c.marginTop, borTop: c.borderTopWidth, display: c.display });
  }
  return { sheet: `${sc.tagName.toLowerCase()}.${String(sc.className).trim().split(/\s+/).slice(0, 4).join(".")}`, sheetTop: s.top, headerTop: b.top, gap: Math.round((b.top - s.top) * 10) / 10, left: b.left, right: b.right, bottom: b.bottom, radius: rad, bg: cs.backgroundColor, scrollTop: sc.scrollTop, chain };
}, root);
/** RGB at viewport points, off a screenshot (decoded in the page: no image library here) */
async function samplePx(page: Page, pts: [number, number][]) {
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(async ([b64, ps]) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    return (ps as [number, number][]).map(([px, py]) => [...x.getImageData(Math.round(px * k), Math.round(py * k), 1, 1).data].slice(0, 3));
  }, [png, pts] as const);
}
const dist = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
/** each top corner: OUTSIDE the curve (1px in from both edges, past the arc) reads the page beside the header; INSIDE
 *  (radius in from both edges) reads the navy */
async function readCorners(page: Page, t: Awaited<ReturnType<typeof readTop>>) {
  const o = Math.max(1, t.radius * 0.15), i = Math.max(t.radius, 6) + 2;
  const pts: [number, number][] = [
    [t.left + o, t.headerTop + o], [t.left + i, t.headerTop + i], [t.left - 8, t.headerTop + i + 10],
    [t.right - o, t.headerTop + o], [t.right - i, t.headerTop + i], [t.right + 8, t.headerTop + i + 10],
  ];
  const px = await samplePx(page, pts);
  const navy = (t.bg.match(/\d+/g) ?? []).slice(0, 3).map(Number);
  const side = (n: number) => ({ outside: px[n], inside: px[n + 1], page: px[n + 2], outsideIsPage: dist(px[n], px[n + 2]) <= 14, insideIsNavy: dist(px[n + 1], navy) <= 14 });
  return { left: side(0), right: side(3), navy };
}

test.describe("T · the header's distance from the top of the sheet", () => {
  for (const vp of SIZES) {
    test(`T1 T2 @${vp.width}`, async ({ page }) => {
      const rows: Record<string, unknown> = {};
      let oracle: number | null = null;
      for (const d of T_PAGES) {
        await tOpen(page, d, vp);
        if (d.key !== "qc") await tMutate(page);
        const t = await readTop(page, d.root);
        const c = await readCorners(page, t);
        if (d.key === "qc") oracle = t.gap;
        rows[d.key] = { ...t, corners: c, diff: oracle === null ? null : Math.round((t.gap - oracle) * 10) / 10 };
        if (!T_RECON) {
          expect.soft(near(t.gap, oracle, 1), `T1 ${d.key} @${vp.width}: gap ${t.gap} vs the Query Centre's ${oracle}`).toBe(true);
          /* the corners are on the sheet at all: a header lifted past the sheet's top samples the shell both outside its
             curve and beside it, which match */
          expect.soft(t.headerTop >= t.sheetTop - 0.5, `T2 ${d.key} @${vp.width}: top corners on the sheet (header ${t.headerTop} vs sheet ${t.sheetTop})`).toBe(true);
          expect.soft(c.left.outsideIsPage && c.right.outsideIsPage, `T2 ${d.key} @${vp.width}: page colour outside both top corners ${JSON.stringify([c.left.outside, c.left.page, c.right.outside, c.right.page])}`).toBe(true);
          expect.soft(c.left.insideIsNavy && c.right.insideIsNavy, `T2 ${d.key} @${vp.width}: navy inside both top corners ${JSON.stringify([c.left.inside, c.right.inside, c.navy])}`).toBe(true);
        }
        if (vp.width === 1440 && !MUT) {
          mkdirSync(`${T_DIR}/shots/${T_RECON ? "before" : "after"}`, { recursive: true });
          await page.screenshot({ path: `${T_DIR}/shots/${T_RECON ? "before" : "after"}/top-${d.key}.png`, clip: { x: Math.max(0, t.left - 40), y: Math.max(0, t.sheetTop - 30), width: Math.min(vp.width - Math.max(0, t.left - 40), t.right - t.left + 80), height: 120 } });
        }
      }
      {
        /* T's readings are its own file, never workspace-headers-v1's `after.json` */
        const f = `${T_DIR}/${T_RECON ? "step0" : `readings${MUT ? `-${MUT}` : ""}`}.json`;
        const was = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
        writeFileSync(f, JSON.stringify({ ...was, [String(vp.width)]: rows }, null, 1));
      }
    });
    test(`T3 the Query Centre's header and bar @${vp.width}`, async ({ page }) => {
      const d = T_PAGES[0];
      await tOpen(page, d, vp);
      const hd = page.locator(`${d.root}:visible header.qc1531-hd`).first();
      const head = await hd.screenshot();
      await scrollTo(page, d.root, 600);
      const bar = await page.locator(`${d.root}:visible .qc156-slim`).first().screenshot();
      const name = (k: string) => `${T_DIR}/qc-${k}-${vp.width}.png`;
      if (T_RECON) { writeFileSync(name("header"), head); writeFileSync(name("bar"), bar); return; }
      expect(existsSync(name("header")), "T3 oracle captured (WSH_T=recon)").toBe(true);
      expect.soft(head.equals(readFileSync(name("header"))), `T3 the Query Centre's header @${vp.width} is pixel-identical`).toBe(true);
      expect.soft(bar.equals(readFileSync(name("bar"))), `T3 the Query Centre's bar @${vp.width} is pixel-identical`).toBe(true);
    });
  }
});
