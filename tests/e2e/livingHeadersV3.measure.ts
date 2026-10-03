/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LIVING HEADERS v3 — the rendered locks LH1–LH11 across the six pages (LH12, the copy, is the unit
 * suite `livingHeaders.test.ts`). Ref: design-refs/page-header/living-headers-v3.html, opened in the
 * same browser at the width that gives its header OUR header's width, and measured by the same ruler.
 *
 * It REPLACES the v1 file (livingHeaders.measure.ts, two pages, the v2 ref), deleted in the same commit.
 *
 * The count is driven by the DEV review aid (`window.__SA_LH_COUNT` + `sa:lh-count`), which fabricates
 * the COUNT only: the copy functions, the empty state and the exhibition all run for real on it. −1 is
 * the To-do list's "all caught up".
 *
 * ⚠️ EVERY READ IS OF THE VISIBLE PAGE — workspace pages stay mounted, so a bare `querySelector`
 * answers about whichever copy is first in the document.
 */
import { test, expect, type Page } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";
import { Ledger, near, f1 } from "./shellV3Lib";

test.describe.configure({ timeout: 1_800_000 });

/* LH_W narrows the run to one width — for the red-first mutation runs only; the standing run is all four */
const WIDTHS = process.env.LH_W ? [Number(process.env.LH_W)] : [1280, 1440, 1512, 1920];
const H = 900;

interface Pg {
  route: string; key: string; name: string; section: string; empty: string;
  /** page-level tiles, the first list item, the rail — null where the page has none */
  tile: string | null; num: string | null; row: string; rail: string;
  /** the page's own component inside its exhibition */
  exPart: string;
}
const PAGES: Pg[] = [
  { route: "/queries", key: "qc", name: "Query Centre", section: "QUERIES", empty: "Nothing out yet", tile: '[data-qcv="court"]', num: ".qcv-court-n", row: '[data-qcv="row"]', rail: ".qcv-rail", exPart: '[data-qcv="row"]' },
  /* v12 P2 (3 Oct): the Contact list's count cards retired with the card index — its "tiles" are
     the INDEX STRIP's cells now (the All cell is first in DOM at the column's left edge, so LH4's
     one-left-x reads the strip's own edge), and the number is each lettered cell's <i>. */
  { route: "/agents", key: "cl", name: "Contact list", section: "AGENTS", empty: "No agents on your list yet", tile: ".clv-ixtab", num: "i", row: "[data-agent-card]", rail: ".clv-rail", exPart: ".clv-rwho" },
  { route: "/todo", key: "td", name: "To-do list", section: "TASKS", empty: "Nothing to do yet", tile: ".tdv2-tile:not(.tdv2-tile--sk)", num: ".tdv2-num", row: '[data-todo-v2="row"]', rail: ".tdv2-group > .tdv2-rail", exPart: '[data-todo-v2="row"]' },
  { route: "/manuscripts/packages", key: "sp", name: "Submission packages", section: "MATERIALS", empty: "No packages yet", tile: null, num: null, row: '[data-ppv="pkg"]', rail: '[data-ppv="rail"]', exPart: '[data-ppv="pkg"]' },
  { route: "/manuscripts/comps", key: "ct", name: "Comparable titles", section: "MATERIALS", empty: "No comp titles yet", tile: null, num: null, row: '[data-cpv="comp"]', rail: ".cpv-group > .sa-prail", exPart: '[data-cpv="comp"]' },
  { route: "/queries/analytics", key: "an", name: "Analytics", section: "QUERIES", empty: "Nothing to measure yet", tile: '[data-anv="fact"]', num: ".anv-fv", row: '[data-anv="journey"]', rail: '[data-anv="rail"]', exPart: '[data-anv="ex-funnel"]' },
];
const ONLY = process.env.LH_ONLY;
const RUN = ONLY ? PAGES.filter((p) => p.key === ONLY) : PAGES;
const REF = pathToFileURL(resolve("design-refs/page-header/living-headers-v3.html")).href;

type Box = { l: number; t: number; w: number; h: number; r: number; b: number } | null;
type Hero = {
  living: string | null; rule: number; hd: Box; eyebrow: number; h1: Box; h1Text: string; h1Scroll: number; h1Client: number; h1Lines: number;
  h2: Box; h2Text: string; intro: Box; introText: string; acts: Box; b1: Box; b2: Box; art: Box; artSrc: string; shape: string;
};

async function setCount(page: Page, n: number | null) {
  await page.evaluate((n) => {
    const w = window as unknown as { __SA_LH_COUNT?: number };
    if (n === null) delete w.__SA_LH_COUNT; else w.__SA_LH_COUNT = n;
    window.dispatchEvent(new Event("sa:lh-count"));
  }, n);
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch { /* infinite */ } }));
  await page.waitForTimeout(80);
}

async function readHero(page: Page): Promise<Hero> {
  return page.evaluate(() => {
    const shown = (e: Element | null) => !!e && e.getBoundingClientRect().height > 0;
    const hd = [...document.querySelectorAll('[data-probe="page-header"]')].find(shown) as HTMLElement | undefined;
    if (!hd) throw new Error("no visible page header");
    const o = hd.getBoundingClientRect();
    const box = (e: Element | null | undefined) => {
      if (!e || !shown(e)) return null;
      const x = e.getBoundingClientRect();
      return { l: x.left - o.left, t: x.top - o.top, w: x.width, h: x.height, r: x.right - o.left, b: x.bottom - o.top };
    };
    const q = (s: string) => hd.querySelector(s);
    const h1 = q('h1[data-probe="title"]') as HTMLElement | null;
    const lines = (e: Element | null) => {
      if (!e) return 0;
      const r = document.createRange(); r.selectNodeContents(e);
      return new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))).size;
    };
    const clone = hd.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('h1[data-probe="title"], [data-probe="intro"]').forEach((e) => { e.innerHTML = ""; });
    return {
      living: hd.getAttribute("data-living"),
      rule: parseFloat(getComputedStyle(hd).borderBottomWidth) || 0,
      hd: { l: o.left, t: o.top, w: o.width, h: o.height, r: o.right, b: o.bottom },
      eyebrow: hd.querySelectorAll('[data-probe="eyebrow"]').length,
      h1: box(h1), h1Text: h1?.innerText.trim() ?? "", h1Scroll: h1?.scrollWidth ?? -1, h1Client: h1?.clientWidth ?? -1, h1Lines: lines(h1),
      h2: box(q('[data-probe="empty-heading"]')), h2Text: (q('[data-probe="empty-heading"]') as HTMLElement | null)?.innerText.trim() ?? "",
      intro: box(q('[data-probe="intro"]')), introText: (q('[data-probe="intro"]') as HTMLElement | null)?.innerText.trim() ?? "",
      acts: box(q('[data-probe="actions"]')),
      b1: box(q(".ph-primary")), b2: box(q(".ph-secondary")), art: box(q('[data-probe="art"]')),
      artSrc: (q('[data-probe="art"] img') as HTMLImageElement | null)?.getAttribute("src") ?? "",
      shape: clone.outerHTML,
    };
  });
}

const sameBox = (a: Box, b: Box, tol = 1) => (a === null && b === null) || (!!a && !!b && near(a.l, b.l, tol) && near(a.t, b.t, tol) && near(a.w, b.w, tol) && near(a.h, b.h, tol));
const s = (b: Box) => (b ? `[${f1(b.l)},${f1(b.t)},${f1(b.w)},${f1(b.h)}]` : "null");

/** The ref's hero for a page and count, opened at the width that gives its header ours. */
async function readRef(page: Page, hdW: number, pg: string, n: number) {
  await page.setViewportSize({ width: 1440, height: H });
  await page.goto(REF);
  await page.evaluate(async () => { await document.fonts.ready; });
  const w0 = await page.evaluate(() => document.querySelector(".hd")!.getBoundingClientRect().width);
  await page.setViewportSize({ width: Math.round(1440 + (hdW - w0)), height: H });
  return page.evaluate(([pg, n]) => {
    // @ts-expect-error the ref's own globals
    ST.pg = pg; ST.n = n; render(false);
    document.getAnimations().forEach((a) => a.finish());
    const el = document.querySelector(".hd")!, hd = el.getBoundingClientRect();
    const b = (sel: string) => { const e = document.querySelector(sel); if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left - hd.left, t: x.top - hd.top, w: x.width, h: x.height, b: x.bottom - hd.top }; };
    return { hdW: hd.width, hdH: hd.height, h1: b("h1"), sub: b(".sub"), art: b(".art") };
  }, [pg, n] as const);
}

test("LH1 · LH2 · LH4 · LH6 · LH7 · the fixed shape, one line, one left edge, only the text, the empty page", async ({ page }) => {
  const L = new Ledger("lh3-shape");
  const widths1280: Record<string, Record<string, number>> = {};
  let reads = 0;
  for (const w of WIDTHS) for (const p of RUN) {
    const ctx = (state: string) => ({ route: p.route, size: `${w}`, state });
    await openApp(page, p.route, { width: w, height: H });

    /* ── LH1: counts 1 and 27, and a one-line subline, share every box ── */
    await setCount(page, 27);
    const many = await readHero(page);
    await setCount(page, 1);
    const one = await readHero(page);
    await page.evaluate(() => {
      const hd = [...document.querySelectorAll('[data-probe="page-header"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      hd.querySelector('[data-probe="intro"]')!.textContent = "Nothing needs you today.";
    });
    const short = await readHero(page);
    reads += 3;
    /* the one-line subline was written into React's DOM by hand — reopen before React renders over it */
    await openApp(page, p.route, { width: w, height: H });
    L.check("LH0 population", ctx("27"), many.living === "settled" && !!many.h1 && !!many.intro, `living ${many.living}`);
    for (const [nm, x] of [["one", one], ["one-line subline", short]] as const) {
      for (const k of ["h1", "intro", "acts", "b1", "b2", "art"] as const) {
        L.check("LH1 no movement", ctx(`${nm}·${k}`), sameBox(x[k], many[k]), `${s(x[k])} vs ${s(many[k])}`);
      }
      L.check("LH1 no movement", ctx(`${nm}·header`), near(x.hd!.h, many.hd!.h, 1), `${f1(x.hd!.h)} vs ${f1(many.hd!.h)}`);
    }

    /* ── LH6: only the two lines' text differs between counts ── */
    L.check("LH6 only text differs", ctx("1 vs 27"), one.shape === many.shape && one.artSrc === many.artSrc,
      one.shape === many.shape ? "same" : `diff at ${[...one.shape].findIndex((c, i) => c !== many.shape[i])}`);

    /* ── LH2: the headline is one line and never truncates — every count, and "All caught up" ── */
    const counts = p.key === "td" ? [1, 9, 13, 27, 148, -1] : [1, 9, 13, 27, 148];
    for (const n of counts) {
      await setCount(page, n);
      const h = await readHero(page);
      reads++;
      L.check("LH2 one line", ctx(`${n}`), h.h1Text.length > 0 && h.h1Lines === 1 && h.h1Scroll <= h.h1Client, `"${h.h1Text}" lines ${h.h1Lines} scroll ${h.h1Scroll} client ${h.h1Client}`);
      if (w === 1280) {
        const iw = await page.evaluate(() => {
          const hd = [...document.querySelectorAll('[data-probe="page-header"]')].find((e) => e.getBoundingClientRect().height > 0)!;
          const h1 = hd.querySelector("h1")!; const r = document.createRange(); r.selectNodeContents(h1);
          return Math.round(r.getBoundingClientRect().width * 10) / 10;
        });
        (widths1280[p.route] ??= {})[h.h1Text] = iw;
      }
    }

    /* ── LH4: one left x down the page; the hero ends where the rail ends ── */
    await setCount(page, null);
    await page.waitForTimeout(300);
    const edges = await page.evaluate((p) => {
      const vis = (sel: string | null) => (sel ? [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().height > 0 && !e.closest('[data-lh="band"]')) ?? null : null);
      const hd = vis('[data-probe="page-header"]')!;
      const Lx = (e: Element | null) => (e ? e.getBoundingClientRect().left : null);
      const rail = vis(p.rail);
      const main = rail?.previousElementSibling ?? null;
      return {
        h1: Lx(hd.querySelector("h1")), intro: Lx(hd.querySelector('[data-probe="intro"]')), acts: Lx(hd.querySelector('[data-probe="actions"]')),
        tile: Lx(vis(p.tile)), row: Lx(vis(p.row)),
        heroR: hd.getBoundingClientRect().right, railR: rail?.getBoundingClientRect().right ?? null,
        /* the rail is BESIDE the column (not stacked under it) when its top is near the column's */
        beside: !!rail && !!main && Math.abs(rail.getBoundingClientRect().top - main.getBoundingClientRect().top) < 40,
      };
    }, p);
    reads++;
    const lefts = [edges.h1, edges.intro, edges.acts, edges.tile, edges.row].filter((x) => x !== null) as number[];
    L.check("LH4 one left x", ctx("data"), lefts.length >= 3 && lefts.every((x) => near(x, edges.h1!, 1)), [edges.h1, edges.intro, edges.acts, edges.tile, edges.row].map(f1).join(" "));
    if (edges.beside) L.check("LH4 hero right = rail right", ctx("data"), near(edges.heroR, edges.railR ?? -1, 1), `${f1(edges.heroR)} vs ${f1(edges.railR)}`);
    else L.check("LH4 rail stacked (reported, not asserted)", ctx("data"), true, `rail right ${f1(edges.railR)} hero right ${f1(edges.heroR)}`);

    /* ── LH7: the empty page — the heading, no title, no rule, the buttons and art where they were ── */
    await setCount(page, 0);
    const empty = await readHero(page);
    reads++;
    L.check("LH7 empty mode", ctx("0"), empty.living === "empty" && !empty.h1 && !!empty.h2 && empty.h2Text === p.empty, `living ${empty.living} h1 ${s(empty.h1)} h2 "${empty.h2Text}"`);
    L.check("LH7 no rule", ctx("0"), empty.rule === 0 && many.rule > 0, `rule ${empty.rule} (populated ${many.rule})`);
    L.check("LH7 no eyebrow", ctx("0"), empty.eyebrow === 0 && many.eyebrow === 0, `${empty.eyebrow} / ${many.eyebrow}`);
    for (const k of ["b1", "b2", "art"] as const) {
      if (!many[k] && !empty[k]) continue;
      L.check("LH7 same x and size", ctx(`0·${k}`), !!empty[k] && !!many[k] && near(empty[k]!.l, many[k]!.l, 1) && near(empty[k]!.w, many[k]!.w, 1) && near(empty[k]!.h, many[k]!.h, 1), `${s(empty[k])} vs ${s(many[k])}`);
    }

    /* ── LH0: the populated hero against the ref's, by the same ruler ── */
    if (w === 1440) {
      const r = await readRef(page, many.hd!.w, p.key, 27);
      L.check("LH0 ref: header height", ctx("27"), near(many.hd!.h, r.hdH, 2), `${f1(many.hd!.h)} vs ref ${f1(r.hdH)}`);
      L.check("LH0 ref: title top", ctx("27"), near(many.h1!.t, r.h1!.t, 1), `${f1(many.h1!.t)} vs ref ${f1(r.h1!.t)}`);
      L.check("LH0 ref: title box", ctx("27"), near(many.h1!.h, r.h1!.h, 1), `${f1(many.h1!.h)} vs ref ${f1(r.h1!.h)}`);
      L.check("LH0 ref: subline under title", ctx("27"), near(many.intro!.t - many.h1!.b, r.sub!.t - (r.h1!.t + r.h1!.h), 1), `${f1(many.intro!.t - many.h1!.b)} vs ref ${f1(r.sub!.t - r.h1!.t - r.h1!.h)}`);
      if (many.art) L.check("LH0 ref: art width", ctx("27"), near(many.art.w, r.art!.w, 1), `${s(many.art)} vs ref ${f1(r.art!.w)}`);
    }
    await setCount(page, null);
  }
  mkdirSync("reports/living-headers-v3", { recursive: true });
  writeFileSync("reports/living-headers-v3/headline-widths-1280.json", JSON.stringify(widths1280, null, 1));
  L.write();
  console.log(`LH3 shape reads: ${reads}`);
  expect(reads, "the suite measured less than it claims").toBeGreaterThanOrEqual(WIDTHS.length * RUN.length * 9);
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route} ${f.size} ${f.state}: ${f.detail}`).join("\n")).toEqual([]);
});

test("LH3 · a tile row never grows: one digit and three at 1280", async ({ page }) => {
  const L = new Ledger("lh3-tiles");
  for (const p of RUN.filter((x) => x.tile)) {
    const ctx = (state: string) => ({ route: p.route, size: "1280", state });
    await openApp(page, p.route, { width: 1280, height: H });
    const read = (n: string) => page.evaluate(([p, n]) => {
      const tiles = [...document.querySelectorAll(p.tile!)].filter((e) => e.getBoundingClientRect().height > 0 && !e.closest('[data-lh="band"]')) as HTMLElement[];
      tiles.forEach((t) => { const num = t.querySelector(p.num!) as HTMLElement | null; if (num) num.textContent = n; });
      const sub = (t: HTMLElement) => t.lastElementChild as HTMLElement | null;
      return { n: tiles.length, h: tiles.map((t) => Math.round(t.getBoundingClientRect().height * 10) / 10), subs: tiles.map((t) => sub(t)?.textContent ?? "") };
    }, [p, n] as const);
    const a = await read("1");
    const b = await read("148");
    L.check("LH3 population", ctx("tiles"), a.n >= 3, `${a.n} tiles`);
    L.check("LH3 same height, 1 vs 148", ctx("tiles"), a.h.length === b.h.length && a.h.every((h, i) => near(h, b.h[i], 0.5)), `${JSON.stringify(a.h)} vs ${JSON.stringify(b.h)}`);
  }
  L.write();
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route}: ${f.detail}`).join("\n")).toEqual([]);
});

test("LH5 · the breadcrumb is in the bar from first paint, and there is no eyebrow", async ({ page }) => {
  const L = new Ledger("lh3-crumb");
  await page.addInitScript(() => {
    const seen: { route: string; headerFirst: boolean; crumb: string; op: string }[] = [];
    (window as unknown as { __lhCrumb: typeof seen }).__lhCrumb = seen;
    const sample = () => {
      const hd = [...document.querySelectorAll('[data-probe="page-header"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!hd || seen.some((x) => x.route === location.pathname)) return;
      const pn = [...document.querySelectorAll('[data-shell="pagename"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      seen.push({ route: location.pathname, headerFirst: true, crumb: (pn?.textContent ?? "").replace(/\s+/g, " ").trim(), op: pn ? getComputedStyle(pn).opacity : "none" });
    };
    new MutationObserver(sample).observe(document, { subtree: true, childList: true });
  });
  for (const p of RUN) {
    const ctx = { route: p.route, size: "1440", state: "first paint" };
    await openApp(page, p.route, { width: 1440, height: H });
    const first = await page.evaluate((r) => (window as unknown as { __lhCrumb: { route: string; crumb: string; op: string }[] }).__lhCrumb.find((x) => x.route === r) ?? null, p.route);
    const now = await page.evaluate(() => {
      const pn = [...document.querySelectorAll('[data-shell="pagename"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      const hd = [...document.querySelectorAll('[data-probe="page-header"]')].find((e) => e.getBoundingClientRect().height > 0);
      const sec = pn?.querySelector(".ws-pname-s") as HTMLElement | null, nm = pn?.querySelector(".ws-pname-n") as HTMLElement | null;
      return {
        sec: sec?.innerText.trim() ?? "", name: nm?.innerText.trim() ?? "", op: pn ? getComputedStyle(pn).opacity : "none",
        secFs: sec ? getComputedStyle(sec).fontSize : "", nameFs: nm ? getComputedStyle(nm).fontSize : "", nameFam: nm ? getComputedStyle(nm).fontFamily : "",
        eyebrows: hd ? hd.querySelectorAll('[data-probe="eyebrow"]').length : -1,
      };
    });
    const want = `${p.section} / ${p.name}`;
    L.check("LH5 crumb on first paint", ctx, !!first && first.op === "1" && first.crumb.toUpperCase().replace(/\s*\/\s*/, " / ") === want.toUpperCase(), JSON.stringify(first));
    L.check("LH5 crumb settled", { ...ctx, state: "settled" }, now.op === "1" && now.sec === `${p.section} /` && now.name === p.name, JSON.stringify(now));
    L.check("LH5 crumb type", { ...ctx, state: "settled" }, now.secFs === "9.5px" && now.nameFs === "21px" && /Special Elite/.test(now.nameFam), `${now.secFs} ${now.nameFs} ${now.nameFam}`);
    L.check("LH5 no eyebrow", { ...ctx, state: "settled" }, now.eyebrows === 0, `${now.eyebrows}`);
  }
  L.write();
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route} ${f.state}: ${f.detail}`).join("\n")).toEqual([]);
});

test("LH8 · the exhibition is inert, reads nothing live, and is never on a page with data", async ({ page }) => {
  const L = new Ledger("lh3-exhibit");
  for (const p of RUN) {
    const ctx = (state: string) => ({ route: p.route, size: "1440", state });
    await openApp(page, p.route, { width: 1440, height: H });
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await setCount(page, 0);
    await page.waitForTimeout(600);
    const r = await page.evaluate((part) => {
      const band = [...document.querySelectorAll('[data-lh="band"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      if (!band) return null;
      const x = band.getBoundingClientRect();
      const at = document.elementFromPoint(x.left + x.width / 2, Math.min(x.top + 60, window.innerHeight - 2));
      return {
        inert: band.hasAttribute("inert"), hidden: band.getAttribute("aria-hidden"), pe: getComputedStyle(band).pointerEvents,
        links: band.querySelectorAll("a[href]").length, parts: band.querySelectorAll(part).length,
        hitInside: !!at && band.contains(at), onScreen: x.top < window.innerHeight && x.height > 100,
      };
    }, p.exPart);
    let tabbedIn = false;
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      tabbedIn = tabbedIn || (await page.evaluate(() => !!document.activeElement?.closest('[data-lh="band"]')));
    }
    const live = requests.filter((u) => /firestore|googleapis|\/api\//.test(u) && !/\/Listen\/channel/.test(u));
    L.check("LH8 population", ctx("0"), !!r && r.onScreen && r.parts >= 1, JSON.stringify(r));
    if (r) {
      L.check("LH8 inert", ctx("0"), r.inert && r.hidden === "true" && r.pe === "none", `inert ${r.inert} aria-hidden ${r.hidden} pe ${r.pe}`);
      L.check("LH8 no links", ctx("0"), r.links === 0, `${r.links}`);
      L.check("LH8 not hit-testable", ctx("0"), !r.hitInside, `elementFromPoint inside: ${r.hitInside}`);
    }
    L.check("LH8 not in the tab order", ctx("0"), !tabbedIn, `tabbed in ${tabbedIn}`);
    L.check("LH8 no data read while shown", ctx("0"), live.length === 0, live.slice(0, 3).join(" "));
    page.removeAllListeners("request");
    await setCount(page, null);
    await page.waitForTimeout(300);
    const withData = await page.evaluate(() => [...document.querySelectorAll('[data-lh="band"]')].filter((e) => e.getBoundingClientRect().height > 0).length);
    L.check("LH8 absent with data", ctx("data"), withData === 0, `${withData}`);
    if (p.key === "td") {
      await setCount(page, -1);
      const caught = await page.evaluate(() => [...document.querySelectorAll('[data-lh="band"]')].filter((e) => e.getBoundingClientRect().height > 0).length);
      L.check("LH8 absent when caught up", ctx("caught"), caught === 0, `${caught}`);
      await setCount(page, null);
    }
  }
  L.write();
  expect(L.rows.length).toBeGreaterThanOrEqual(RUN.length * 6);
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route} ${f.state}: ${f.detail}`).join("\n")).toEqual([]);
});

test("LH9 · a page filtered to nothing keeps its hero", async ({ page }) => {
  const L = new Ledger("lh3-filtered");
  const kept = async (route: string, state: string, noneSel: string) => {
    const h = await readHero(page);
    const none = await page.evaluate((sel) => !![...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().height > 0), noneSel);
    const ctx = { route, size: "1440", state };
    L.check("LH9 population", ctx, none, `no-match shown ${none}`);
    L.check("LH9 hero kept", ctx, h.living === "settled" && !!h.h1 && h.rule > 0 && !h.h2, `living ${h.living} "${h.h1Text}" rule ${h.rule}`);
    L.check("LH9 no exhibition", ctx, (await page.evaluate(() => [...document.querySelectorAll('[data-lh="band"]')].filter((e) => e.getBoundingClientRect().height > 0).length)) === 0, "");
  };
  if (!ONLY || ONLY === "qc") {
    await openApp(page, "/queries", { width: 1440, height: H });
    const menuPick = async (pick: (items: { i: number; label: string; n: number }[]) => number) => {
      await page.locator('[data-qcv="pk-filter"]').filter({ visible: true }).first().click();
      const items = await page.locator('.qcv-menu [role="menuitemradio"]').evaluateAll((els) =>
        els.map((e, i) => { const t = (e as HTMLElement).innerText.trim(); const m = t.match(/(\d+)\s*$/); return { i, label: t, n: m ? Number(m[1]) : -1 }; }));
      const i = pick(items);
      if (i < 0) { await page.keyboard.press("Escape"); return null; }
      await page.locator('.qcv-menu [role="menuitemradio"]').nth(i).click();
      await page.waitForTimeout(400);
      return items[i].label;
    };
    const zero = (items: { i: number; n: number }[]) => items.find((x) => x.n === 0)?.i ?? -1;
    let picked = await menuPick(zero);
    if (!picked) {
      await menuPick((items) => {
        const from = items.findIndex((x) => /^All manuscripts/.test(x.label));
        const books = from < 0 ? [] : items.slice(from + 1).filter((x) => x.n > 0 && !/^Not assigned/.test(x.label));
        return books.sort((a, b) => a.n - b.n)[0]?.i ?? -1;
      });
      picked = await menuPick(zero);
    }
    await kept("/queries", `filtered to ${picked}`, ".qcv-none, .qcv-empty-card, [data-qc-empty]");
  }
  if (!ONLY || ONLY === "cl") {
    await openApp(page, "/agents", { width: 1440, height: H });
    await page.getByPlaceholder("Find an agent").filter({ visible: true }).first().fill("zzqx no such agent");
    await page.waitForTimeout(400);
    await kept("/agents", "find-empty", ".agl-empty");
  }
  if (!ONLY || ONLY === "td") {
    await openApp(page, "/todo", { width: 1440, height: H });
    await page.getByPlaceholder(/Search tasks/).filter({ visible: true }).first().fill("zzqx no such task");
    await page.waitForTimeout(400);
    await kept("/todo", "search-empty", '[data-todo-v2="empty"]');
  }
  L.write();
  expect(L.rows.length).toBeGreaterThanOrEqual(3);
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route} ${f.state}: ${f.detail}`).join("\n")).toEqual([]);
});

test("LH10 · the page name never flashes in the headline, and neither does a wrong count", async ({ page }) => {
  const L = new Ledger("lh3-flash");
  await page.addInitScript(() => {
    const seen: { route: string; living: string | null; h1: string }[] = [];
    (window as unknown as { __lhSeen: typeof seen }).__lhSeen = seen;
    const sample = () => {
      const hd = [...document.querySelectorAll("[data-living]")].find((e) => e.getBoundingClientRect().height > 0);
      if (!hd) return;
      const h1 = hd.querySelector('h1[data-probe="title"]') as HTMLElement | null;
      const rec = { route: location.pathname, living: hd.getAttribute("data-living"), h1: (h1?.textContent ?? "").trim() };
      const last = [...seen].reverse().find((x) => x.route === rec.route);
      if (!last || last.living !== rec.living || last.h1 !== rec.h1) seen.push(rec);
    };
    new MutationObserver(sample).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-living"] });
  });
  for (const p of RUN) {
    await openApp(page, p.route, { width: 1440, height: H });
    await page.waitForTimeout(800);
    const all = await page.evaluate(() => (window as unknown as { __lhSeen: { route: string; living: string | null; h1: string }[] }).__lhSeen);
    const seen = all.filter((x) => x.route === p.route);
    const texts = seen.map((x) => x.h1).filter(Boolean);
    const final = texts[texts.length - 1] ?? "";
    const ctx = { route: p.route, size: "1440", state: "load" };
    L.check("LH10 population", ctx, seen.length > 0 && final.length > 0, JSON.stringify(seen.slice(-4)));
    L.check("LH10 never the page name", ctx, !texts.some((t) => t.toLowerCase() === p.name.toLowerCase()), JSON.stringify(texts));
    L.check("LH10 one headline, the settled one", ctx, texts.every((t) => t === final), JSON.stringify([...new Set(texts)]));
    L.check("LH10 pending draws no text", ctx, seen.filter((x) => x.living === "pending").every((x) => x.h1 === ""), JSON.stringify(seen.filter((x) => x.living === "pending")));
  }
  L.write();
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route}: ${f.detail}`).join("\n")).toEqual([]);
});

test("LH11 · the To-do list's three states", async ({ page }) => {
  test.skip(!!ONLY && ONLY !== "td", "To-do only");
  const L = new Ledger("lh3-states");
  await openApp(page, "/todo", { width: 1440, height: H });
  const read = async () => {
    const h = await readHero(page);
    const b = await page.evaluate(() => {
      const g = [...document.querySelectorAll(".tdv2-group")].find((e) => e.getBoundingClientRect().height > 0);
      const vis = (sel: string) => !![...(g?.querySelectorAll(sel) ?? [])].find((e) => e.getBoundingClientRect().height > 0 && !e.closest('[data-lh="band"]'));
      return {
        tiles: vis('[data-todo-v2="tiles"]'), rows: vis('[data-todo-v2="row"]'), caught: vis('[data-todo-v2="caught"]'),
        caughtText: ([...(g?.querySelectorAll('[data-todo-v2="caught"]') ?? [])][0] as HTMLElement | undefined)?.innerText.replace(/\s+/g, " ").trim() ?? "",
        rail: vis(":scope > .tdv2-rail"), band: !![...(g?.querySelectorAll('[data-lh="band"]') ?? [])].find((e) => e.getBoundingClientRect().height > 0),
      };
    });
    return { h, b };
  };
  await setCount(page, null);
  const list = await read();
  await setCount(page, -1);
  const caught = await read();
  await setCount(page, 0);
  const nothing = await read();
  await setCount(page, null);
  const c = (state: string) => ({ route: "/todo", size: "1440", state });
  L.check("LH11 list", c("list"), list.h.living === "settled" && /things? to do$/.test(list.h.h1Text) && list.b.tiles && list.b.rows && !list.b.caught && list.b.rail && !list.b.band, JSON.stringify({ ...list.b, h1: list.h.h1Text }));
  L.check("LH11 all caught up", c("caught"), caught.h.living === "settled" && caught.h.h1Text === "All caught up" && /^Nothing needs you today\./.test(caught.h.introText) && caught.h.rule > 0
    && caught.b.tiles && !caught.b.rows && caught.b.caught && caught.b.rail && !caught.b.band
    && caught.b.caughtText.startsWith("Nothing is waiting on you"), JSON.stringify({ ...caught.b, h1: caught.h.h1Text, intro: caught.h.introText }));
  L.check("LH11 nothing yet", c("nothing"), nothing.h.living === "empty" && !nothing.h.h1 && nothing.h.h2Text === "Nothing to do yet" && nothing.b.band && !nothing.b.caught && !nothing.b.rail, JSON.stringify({ ...nothing.b, h2: nothing.h.h2Text }));
  L.write();
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.state}: ${f.detail}`).join("\n")).toEqual([]);
});
