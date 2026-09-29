/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LIVING HEADERS — the rendered locks LH1–LH8 (LH9 is the copy's unit suite). Ref:
 * design-refs/page-header/living-headers-v2.html, opened in the same browser and measured by the
 * same ruler wherever a number comes from it.
 *
 * The count is driven by the DEV review aid (`window.__SA_LH_COUNT` + `sa:lh-count`), which fabricates
 * the COUNT only: the copy functions, the empty state and the exhibition all run for real on it.
 *
 * ⚠️ EVERY READ IS OF THE VISIBLE PAGE — workspace pages stay mounted, so a bare `querySelector`
 * answers about whichever copy is first in the document.
 */
import { test, expect, type Page } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { openApp } from "./pageHeaderV2Lib";
import { Ledger, near, f1 } from "./shellV3Lib";

test.describe.configure({ timeout: 900_000 });

const WIDTHS = [1280, 1440, 1512, 1920];
const H = 900;
const PAGES = [
  { route: "/queries", name: "Query Centre", tile: '[data-qcv="court"]', row: '[data-qcv="row"]', rail: ".qcv-rail" },
  { route: "/agents", name: "Contact list", tile: '[data-clv="tile"]', row: "[data-agent-card]", rail: ".clv-rail" },
] as const;
const REF = pathToFileURL(resolve("design-refs/page-header/living-headers-v2.html")).href;

type Box = { l: number; t: number; w: number; h: number; r: number; b: number } | null;
type Hero = {
  living: string | null; rule: number; hd: Box; eyebrow: Box; eyebrowText: string; h1: Box; h1Text: string; h1Scroll: number; h1Client: number;
  h2: Box; intro: Box; acts: Box; b1: Box; b2: Box; art: Box; artSrc: string; shape: string;
  /** the bottom of the header's CONTENT box, relative to its top — the art hangs from this */
  contentB: number;
};

/** Set the review aid's count (null clears it) and let the header settle. */
async function setCount(page: Page, n: number | null) {
  await page.evaluate((n) => {
    const w = window as unknown as { __SA_LH_COUNT?: number };
    if (n === null) delete w.__SA_LH_COUNT; else w.__SA_LH_COUNT = n;
    window.dispatchEvent(new Event("sa:lh-count"));
  }, n);
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch { /* infinite */ } }));
  await page.waitForTimeout(80);
}

/** One read of the visible hero — a real function, never a template. */
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
    /* the header's DOM with the two lines' contents removed — what LH4 compares */
    const clone = hd.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('h1[data-probe="title"], [data-probe="intro"]').forEach((e) => { e.innerHTML = ""; });
    return {
      living: hd.getAttribute("data-living"),
      rule: parseFloat(getComputedStyle(hd).borderBottomWidth) || 0,
      contentB: o.height - (parseFloat(getComputedStyle(hd).paddingBottom) || 0) - (parseFloat(getComputedStyle(hd).borderBottomWidth) || 0),
      hd: { l: o.left, t: o.top, w: o.width, h: o.height, r: o.right, b: o.bottom },
      eyebrow: box(q('[data-probe="eyebrow"]')), eyebrowText: (q('[data-probe="eyebrow"]') as HTMLElement | null)?.innerText ?? "",
      h1: box(h1), h1Text: h1?.innerText.trim() ?? "", h1Scroll: h1?.scrollWidth ?? -1, h1Client: h1?.clientWidth ?? -1,
      h2: box(q('[data-probe="empty-heading"]')), intro: box(q('[data-probe="intro"]')), acts: box(q('[data-probe="actions"]')),
      b1: box(q(".ph-primary")), b2: box(q(".ph-secondary")), art: box(q('[data-probe="art"]')),
      artSrc: (q('[data-probe="art"] img') as HTMLImageElement | null)?.getAttribute("src") ?? "",
      shape: clone.outerHTML,
    };
  });
}

const sameBox = (a: Box, b: Box, tol = 1) => !!a && !!b && near(a.l, b.l, tol) && near(a.t, b.t, tol) && near(a.w, b.w, tol) && near(a.h, b.h, tol);
const s = (b: Box) => (b ? `[${f1(b.l)},${f1(b.t)},${f1(b.w)},${f1(b.h)}]` : "null");

/** The ref's hero, measured the same way, at the same viewport. */
async function readRef(page: Page, width: number, pg: "qc" | "cl", n: number) {
  await page.setViewportSize({ width, height: H });
  if (!page.url().startsWith("file:")) await page.goto(REF);
  await page.evaluate(async () => { await document.fonts.ready; });
  return page.evaluate(([pg, n]) => {
    // @ts-expect-error the ref's own globals
    ST.pg = pg; ST.n = n; render(false);
    document.getAnimations().forEach((a) => a.finish());
    const el = document.querySelector(".hd")!, hd = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const b = (sel: string) => { const e = document.querySelector(sel); if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left - hd.left, t: x.top - hd.top, w: x.width, h: x.height, b: x.bottom - hd.top }; };
    return {
      hdW: hd.width, bc: b("#bc"), h1: b("h1"), h2: b(".eh2"), sub: b(".sub"), b1: b(".acts .b1"), art: b(".art"),
      contentB: hd.height - (parseFloat(cs.paddingBottom) || 0) - (parseFloat(cs.borderBottomWidth) || 0),
    };
  }, [pg, n] as const);
}

test("LH1–LH5 · the fixed shape, the count's two lines, one left edge, the empty page", async ({ page }) => {
  const L = new Ledger("lh-shape");
  let reads = 0;
  for (const w of WIDTHS) {
    const ref: Record<string, Awaited<ReturnType<typeof readRef>>> = {};
    for (const pg of ["qc", "cl"] as const) for (const n of [0, 27]) ref[`${pg}${n}`] = await readRef(page, w, pg, n);
    for (const p of PAGES) {
      const pg = p.route === "/queries" ? "qc" : "cl";
      const ctx = (state: string) => ({ route: p.route, size: `${w}`, state });
      await openApp(page, p.route, { width: w, height: H });

      /* ── LH1: counts 1 and 27, plus a one-line subline, share every box ── */
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
      L.check("LH0 population", ctx("27"), many.living === "settled" && !!many.h1 && !!many.intro && !!many.acts && !!many.art, `living ${many.living}`);
      for (const [nm, x] of [["one", one], ["one-line subline", short]] as const) {
        for (const k of ["h1", "intro", "acts", "b1", "b2", "art"] as const) {
          L.check("LH1 boxes identical", ctx(`${nm}·${k}`), sameBox(x[k], many[k]), `${s(x[k])} vs ${s(many[k])}`);
        }
        L.check("LH1 boxes identical", ctx(`${nm}·header`), near(x.hd!.h, many.hd!.h, 1), `${f1(x.hd!.h)} vs ${f1(many.hd!.h)}`);
      }

      /* ── LH2: the headline never truncates ── */
      for (const n of [1, 9, 13, 27, 148]) {
        await setCount(page, n);
        const h = await readHero(page);
        reads++;
        L.check("LH2 headline fits", ctx(`${n}`), h.h1Text.length > 0 && h.h1Scroll <= h.h1Client, `"${h.h1Text}" scroll ${h.h1Scroll} client ${h.h1Client}`);
      }

      /* ── LH4: only the two lines' text differs between counts ── */
      L.check("LH4 only text differs", ctx("1 vs 27"), one.shape === many.shape && one.artSrc === many.artSrc,
        one.shape === many.shape ? "same" : `diff at ${[...one.shape].findIndex((c, i) => c !== many.shape[i])}`);

      /* ── LH3: one left x down the page; the hero ends where the rail ends ── */
      await setCount(page, 27);
      const edges = await page.evaluate((p) => {
        const vis = (sel: string) => [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
        const hd = vis('[data-probe="page-header"]')!;
        const L = (e: Element | null) => (e ? e.getBoundingClientRect().left : null);
        return {
          eyebrow: L(hd.querySelector('[data-probe="eyebrow"]')), h1: L(hd.querySelector("h1")), intro: L(hd.querySelector('[data-probe="intro"]')),
          acts: L(hd.querySelector('[data-probe="actions"]')), tile: L(vis(p.tile)), row: L(vis(p.row)),
          heroR: hd.getBoundingClientRect().right, railR: vis(p.rail)?.getBoundingClientRect().right ?? null,
        };
      }, p);
      reads++;
      const lefts = [edges.eyebrow, edges.h1, edges.intro, edges.acts, edges.tile, edges.row];
      L.check("LH3 one left x", ctx("27"), lefts.every((x) => typeof x === "number" && near(x, edges.eyebrow!, 1)), lefts.map(f1).join(" "));
      L.check("LH3 hero right = rail right", ctx("27"), near(edges.heroR, edges.railR ?? -1, 1), `${f1(edges.heroR)} vs ${f1(edges.railR)}`);

      /* ── LH5: the empty page — no title, no rule, eyebrow kept, the ref's placement of the buttons and art ── */
      await setCount(page, 0);
      const empty = await readHero(page);
      reads++;
      const r0 = ref[`${pg}0`], r27 = ref[`${pg}27`];
      L.check("LH5 empty mode", ctx("0"), empty.living === "empty" && !empty.h1 && !!empty.h2, `living ${empty.living} h1 ${s(empty.h1)} h2 ${s(empty.h2)}`);
      L.check("LH5 no rule", ctx("0"), empty.rule === 0 && many.rule > 0, `rule ${empty.rule} (populated ${many.rule})`);
      L.check("LH5 eyebrow kept", ctx("0"), !!empty.eyebrow && empty.eyebrowText.toLowerCase().includes(p.name.toLowerCase()), `"${empty.eyebrowText}"`);
      for (const k of ["b1", "b2", "art"] as const) {
        L.check("LH5 same x and size", ctx(`0·${k}`), !!empty[k] && !!many[k] && near(empty[k]!.l, many[k]!.l, 1) && near(empty[k]!.w, many[k]!.w, 1) && near(empty[k]!.h, many[k]!.h, 1), `${s(empty[k])} vs ${s(many[k])}`);
      }
      /* ⚠️ THE REF MOVES THEM UP — its heading is shorter than the title — so "the same boxes" holds for x
         and size only, and the vertical claim is the ref's own SPACING, measured at this width: the
         heading under the eyebrow, the subline under the heading, the buttons under the subline, and the
         art hanging from the content box. Spacing, not offsets, because the subline's line count
         depends on its words, and ours are not the ref's. */
      /* guarded: a missing heading is a FAILURE to record, never a crash — a crash names a line, not a claim */
      const head = empty.h2, rHead = r0.h2!;
      const gaps = (label: string, got: number | null, want: number) => L.check("LH5 the ref's spacing", ctx(`0·${label}`), got !== null && near(got, want, 1), `${got === null ? "absent" : f1(got)} vs ref ${f1(want)}`);
      gaps("heading under eyebrow", head && empty.eyebrow ? head.t - empty.eyebrow.t : null, rHead.t - r0.bc!.t);
      gaps("subline under heading", head && empty.intro ? empty.intro.t - head.b : null, r0.sub!.t - rHead.b);
      gaps("buttons under subline", empty.b1 && empty.intro ? empty.b1.t - empty.intro.b : null, r0.b1!.t - r0.sub!.b);
      gaps("art from content box", empty.art ? empty.art.b - empty.contentB : null, r0.art!.b - r0.contentB);
      gaps("art from content box (27)", many.art!.b - many.contentB, r27.art!.b - r27.contentB);
      /* and the populated hero against the ref's, at the width the ref's frame matches ours */
      if (near(many.hd!.w, r27.hdW, 1)) {
        L.check("LH0 ref: title under eyebrow", ctx("27"), near(many.h1!.t - many.eyebrow!.t, r27.h1!.t - r27.bc!.t, 1), `${f1(many.h1!.t - many.eyebrow!.t)} vs ref ${f1(r27.h1!.t - r27.bc!.t)}`);
        L.check("LH0 ref: title box", ctx("27"), near(many.h1!.h, r27.h1!.h, 1), `${f1(many.h1!.h)} vs ref ${f1(r27.h1!.h)}`);
        L.check("LH0 ref: subline under title", ctx("27"), near(many.intro!.t - many.h1!.b, r27.sub!.t - (r27.h1!.t + r27.h1!.h), 1), `${f1(many.intro!.t - many.h1!.b)} vs ref ${f1(r27.sub!.t - r27.h1!.t - r27.h1!.h)}`);
        /* ⚠️ THE REF'S WIDTH, BUT NOT ITS 286 HEIGHT: the ref's drawing rises 40px above its header into room
           our page does not have (the bar is 18px above), so the box is capped where it would enter the bar
           and the drawing is contained rather than cropped. The claim is the width, a height no taller than
           the ref's, and a top that stays out of the bar (the header sits 18px under it). */
        L.check("LH0 ref: art width", ctx("27"), near(many.art!.w, r27.art!.w, 1), `${s(many.art)} vs ref ${f1(r27.art!.w)}`);
        L.check("LH0 ref: art no taller, and clear of the bar", ctx("27"), many.art!.h <= r27.art!.h + 0.5 && many.art!.t >= -18.5, `${s(many.art)} vs ref h ${f1(r27.art!.h)}`);
      }
      await setCount(page, null);
    }
  }
  L.write();
  console.log(`LH shape reads: ${reads}`);
  expect(reads, "the suite measured less than it claims").toBeGreaterThanOrEqual(WIDTHS.length * PAGES.length * 10);
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route} ${f.size} ${f.state}: ${f.detail}`).join("\n")).toEqual([]);
});

test("LH6 · the exhibition is inert, reads nothing live, and names only its constant", async ({ page }) => {
  const L = new Ledger("lh-exhibit");
  /* the two sample constants' names — restated here because a Playwright file cannot import a module
     that imports CSS. A row naming anyone else came from somewhere other than the constant. */
  const SAMPLE: Record<string, string[]> = {
    "/queries": ["Fenella Stroud", "Eleanor Whitfield", "Jonathan Marsh", "Aisha Kapoor", "Marcus Reed", "Sophie Dunn", "Harriet Vane-Coe", "Priya Nair", "Owen Castell", "Clara Montague", "Tomasz Wolski", "Ruth Adebayo"],
    "/agents": ["Aisha Kapoor", "Marcus Reed", "Greg Panetta", "Sophie Dunn", "Harriet Vane-Coe", "Jonathan Marsh", "Eleanor Whitfield", "Priya Nair", "Owen Castell", "Clara Montague", "Tomasz Wolski", "Ruth Adebayo", "Fenella Stroud", "Daniel Osei", "Imogen Hale", "Lucas Brennan"],
  };
  for (const p of PAGES) {
    const ctx = (state: string) => ({ route: p.route, size: "1440", state });
    await openApp(page, p.route, { width: 1440, height: H });
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await setCount(page, 0);
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const band = [...document.querySelectorAll('[data-lh="band"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      if (!band) return null;
      const focusable = band.querySelectorAll("a, button, input, select, textarea, [tabindex]");
      const x = band.getBoundingClientRect();
      const at = document.elementFromPoint(x.left + x.width / 2, x.top + 60);
      return {
        inert: band.hasAttribute("inert"), hidden: band.getAttribute("aria-hidden"), pe: getComputedStyle(band).pointerEvents,
        links: band.querySelectorAll("a").length, focusables: focusable.length,
        hitInside: !!at && band.contains(at), onScreen: x.top < window.innerHeight && x.height > 100,
        rowNames: [...band.querySelectorAll(".qcv-row-nm, .clv-rwho > b")].map((e) => (e as HTMLElement).innerText.trim()),
      };
    });
    /* Tab from the header's buttons must never land inside the band */
    let tabbedIn = false;
    await page.locator(".ph-secondary").filter({ visible: true }).first().focus();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      tabbedIn = tabbedIn || (await page.evaluate(() => !!document.activeElement?.closest('[data-lh="band"]')));
    }
    /* the Firestore LISTEN channel is the page's standing subscription, open before the band and after it —
       anything else (a query, a batch get, an /api call, an image the band did not ship with) is a read */
    const live = requests.filter((u) => /firestore|googleapis|\/api\//.test(u) && !/\/Listen\/channel/.test(u));
    L.check("LH6 population", ctx("0"), !!r && r.onScreen && r.rowNames.length >= 3, JSON.stringify(r?.rowNames));
    if (r) {
      L.check("LH6 inert", ctx("0"), r.inert && r.hidden === "true" && r.pe === "none", `inert ${r.inert} aria-hidden ${r.hidden} pe ${r.pe}`);
      L.check("LH6 no links", ctx("0"), r.links === 0, `${r.links}`);
      L.check("LH6 not hit-testable", ctx("0"), !r.hitInside, `elementFromPoint inside: ${r.hitInside}`);
      const stray = r.rowNames.filter((nm) => !SAMPLE[p.route].includes(nm));
      L.check("LH6 names from the constant", ctx("0"), r.rowNames.length === 3 && stray.length === 0, `${JSON.stringify(r.rowNames)} stray ${JSON.stringify(stray)}`);
    }
    L.check("LH6 not in the tab order", ctx("0"), !tabbedIn, `tabbed in ${tabbedIn}`);
    L.check("LH6 no data read while shown", ctx("0"), live.length === 0, live.slice(0, 3).join(" "));
    page.removeAllListeners("request");
    await setCount(page, null);
    /* never on a page with data */
    const withData = await page.evaluate(() => [...document.querySelectorAll('[data-lh="band"]')].filter((e) => e.getBoundingClientRect().height > 0).length);
    L.check("LH6 absent with data", ctx("data"), withData === 0, `${withData}`);
  }
  L.write();
  expect(L.rows.length).toBeGreaterThanOrEqual(14);
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route}: ${f.detail}`).join("\n")).toEqual([]);
});

test("LH7 · a page filtered to nothing keeps its hero", async ({ page }) => {
  const L = new Ledger("lh-filtered");
  /* the Query Centre, narrowed by its own sentence to a choice that counts zero (scoping to the
     smallest book first when nothing counts zero across all of them) */
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
      /* the manuscript group follows "All manuscripts" in the same menu */
      const from = items.findIndex((x) => /^All manuscripts/.test(x.label));
      const books = from < 0 ? [] : items.slice(from + 1).filter((x) => x.n > 0 && !/^Not assigned/.test(x.label));
      return books.sort((a, b) => a.n - b.n)[0]?.i ?? -1;
    });
    picked = await menuPick(zero);
  }
  const qc = await readHero(page);
  const qcNone = await page.evaluate(() => !![...document.querySelectorAll(".qcv-none, .qcv-empty-card, [data-qc-empty]")].find((e) => e.getBoundingClientRect().height > 0));
  L.check("LH7 population", { route: "/queries", size: "1440", state: "filtered-empty" }, !!picked && qcNone, `picked ${picked} no-match shown ${qcNone}`);
  L.check("LH7 hero kept", { route: "/queries", size: "1440", state: "filtered-empty" }, qc.living === "settled" && !!qc.h1 && qc.rule > 0, `living ${qc.living} "${qc.h1Text}" rule ${qc.rule}`);
  /* the Contact list, Find narrowed to nothing */
  await openApp(page, "/agents", { width: 1440, height: H });
  await page.getByPlaceholder("Find an agent").filter({ visible: true }).first().fill("zzqx no such agent");
  await page.waitForTimeout(400);
  const cl = await readHero(page);
  const clNone = await page.evaluate(() => !![...document.querySelectorAll(".agl-empty")].find((e) => e.getBoundingClientRect().height > 0));
  L.check("LH7 population", { route: "/agents", size: "1440", state: "find-empty" }, clNone, `no-match block ${clNone}`);
  L.check("LH7 hero kept", { route: "/agents", size: "1440", state: "find-empty" }, cl.living === "settled" && !!cl.h1 && cl.rule > 0, `living ${cl.living} "${cl.h1Text}" rule ${cl.rule}`);
  L.write();
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route}: ${f.detail}`).join("\n")).toEqual([]);
});

test("LH8 · the page name never flashes in the headline, and neither does a wrong count", async ({ page }) => {
  const L = new Ledger("lh-flash");
  await page.addInitScript(() => {
    const seen: { page: string; living: string | null; h1: string }[] = [];
    (window as unknown as { __lhSeen: typeof seen }).__lhSeen = seen;
    const sample = () => {
      for (const hd of document.querySelectorAll("[data-living]")) {
        const h1 = hd.querySelector('h1[data-probe="title"]') as HTMLElement | null;
        /* keyed by the eyebrow, because every visited workspace page stays mounted */
        const page = (hd.querySelector('[data-probe="eyebrow"]')?.textContent ?? "").trim();
        const rec = { page, living: hd.getAttribute("data-living"), h1: (h1?.textContent ?? "").trim() };
        const last = [...seen].reverse().find((x) => x.page === rec.page);
        if (!last || last.living !== rec.living || last.h1 !== rec.h1) seen.push(rec);
      }
    };
    new MutationObserver(sample).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-living"] });
  });
  for (const p of PAGES) {
    await openApp(page, p.route, { width: 1440, height: H });
    await page.waitForTimeout(800);
    const all = await page.evaluate(() => (window as unknown as { __lhSeen: { page: string; living: string | null; h1: string }[] }).__lhSeen);
    const seen = all.filter((x) => x.page.toLowerCase().includes(p.name.toLowerCase()));
    const texts = seen.map((x) => x.h1).filter(Boolean);
    const final = texts[texts.length - 1] ?? "";
    const ctx = { route: p.route, size: "1440", state: "load" };
    L.check("LH8 population", ctx, seen.length > 0 && /\d|One/.test(final), JSON.stringify(seen.slice(-4)));
    L.check("LH8 never the page name", ctx, !texts.some((t) => t.toLowerCase() === p.name.toLowerCase()), JSON.stringify(texts));
    L.check("LH8 one headline, the settled one", ctx, texts.every((t) => t === final), JSON.stringify([...new Set(texts)]));
    L.check("LH8 pending draws no text", ctx, seen.filter((x) => x.living === "pending").every((x) => x.h1 === ""), JSON.stringify(seen.filter((x) => x.living === "pending")));
  }
  L.write();
  expect(L.failures(), L.failures().map((f) => `${f.lock} ${f.route}: ${f.detail}`).join("\n")).toEqual([]);
});
