/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.2 — the locks on the rendered page. FIXTURE: seedPk40.mjs (pk40-ms in use; every document it
 * writes is cleaned in afterAll by manuscript). L7 re-seeds with `--long-name` (the second letter named in 40
 * characters) and the plain seed puts the short name back. Every population is asserted non-zero before a claim about it
 * is believed.
 *
 *   L1 Pattern (reworked: the pattern is the PAGE's, as on the Contact list and the Query Centre): the page's scroller
 *      carries the packages tile by the Contact list's mechanism — the same ground, size and attachment, and the tile
 *      bakes in the Contact list's own stroke opacity (read from its SVG, never a literal); the header card has NO pattern
 *      (a flat fill); no horizontal overflow at 1280 or 1512
 *   L2 Type (rewrites v39.1's L2): exactly three headings compute the typewriter — the h1's highlight, "Your packages"
 *      and the open package's name. The materials tab's label is the one named exception (a label on a tab, not a
 *      heading). "Your packages" is 30px over its 15px italic line, with the art centred on the pair.
 *   L7 Materials (rewrites v39.1's L7): the tab is #5e2f3a and 40 (±1) tall, and its top is the package card's top (±1);
 *      at 1280 a 40-character name shows in full (scrollWidth ≤ clientWidth, no ellipsis); the in-package row is the only
 *      row with the berry edge and has no Add; Add is hidden until hover or focus; every row has its meta line.
 *   L8 Panel: one panel holds the labels and both builder cards; the explainer and the results band are outside it; its
 *      left and right edges are the header card's (±1); #fbf9f5, radius 20; 96 (80 at 1280) above the band
 *   L9 Version first: the packing list's first slot is the version, labelled "Version" over "Sets the pages that go out";
 *      the drawer's "What's in it" starts with Version; the pieces row starts with Best opening; Your materials and the
 *      pieces list both lead with Versions and open on it; a saved package's stored fields are unchanged
 *
 * Breaks: `PK392_MUTATE=<name>` applies that break in the page (`L9data` writes a stored name between L9's two reads).
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v39-2";
const MUT = process.env.PK392_MUTATE ?? "";
const SIZES = [{ width: 1280, height: 832 }, { width: 1512, height: 982 }] as const;
const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...args], { stdio: "pipe" }).toString();
/* a stored document's fields compared by value: Firestore returns map keys in no fixed order, so two dumps of an
   unchanged document can differ as text */
const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : v;
const dump = () => JSON.stringify(canon(JSON.parse(seed("--dump"))));
const LONG_NAME = "Comps-forward, for agents who ask for it";
const INK = "rgb(28, 19, 15)";
const BERRY_EDGE = "rgb(155, 74, 87) 3px 0px 0px 0px inset";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const MUTATIONS: Record<string, string> = {
  /* L1: the page loses its pattern */
  L1: `.pk39-wpg.pk39-wpg > .wpg-scroll.wpg-scroll { background-image: none !important; }`,
  /* L2: the label names go back to the typewriter */
  L2: `[data-pk26="page"].p6.p6.p6 .p9-pkl .p9-pkl-b.p9-pkl-b b { font-family: var(--sp-type) !important; }`,
  /* L8: the panel spans the whole sheet instead of the header card's width */
  L8: `.p6.p6 > .p9-pkc.p9-pkc { margin-left: 0 !important; margin-right: 0 !important; }`,
  /* L9: the packing list goes back to letter first */
  L9: `[data-pk26="page"] .p9-mf.p9-mf { display: flex !important; flex-direction: column !important; } [data-pk26="page"] .p9-mf > .p9-t-ver { order: 2 !important; }`,
};

async function open(page: Page, size: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "pk40-ms"); } catch { /* */ } });
  const css = MUTATIONS[MUT];
  if (css) await page.addInitScript((c) => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = c; document.head.appendChild(st); }), css);
  await openRoute(page, "/queries/packages", size);
  await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
const pg = `[data-pk26="page"]`;
const near = (a: number | undefined | null, b: number | undefined | null, t: number) => a != null && b != null && Math.abs(a - b) <= t;

test.describe.configure({ mode: "default" });
test.beforeAll(() => { console.log(seed()); });
test.afterAll(() => { console.log(seed("--clean")); });

/* ── L1 · the page's pattern ── */
for (const size of SIZES) {
  test(`L1 the page ground carries the packages pattern as the Contact list does; the header card is plain; nothing overflows, at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L1-${size.width}`);
    await open(page, size);
    const r = await page.evaluate(async (p) => {
      const card = document.querySelector(`${p} .pk39-card`) as HTMLElement | null;
      const sc = document.querySelector(p)?.closest(".wpg-scroll") as HTMLElement | null;
      if (!card || !sc) return null;
      const s = getComputedStyle(sc), c = getComputedStyle(card), cb = getComputedStyle(card, "::before");
      const win = card.closest(".ws-window") as HTMLElement | null;
      const op = async (u: string) => (await (await fetch(u)).text()).match(/stroke-opacity="([\d.]+)"/)?.[1] ?? null;
      return {
        bg: s.backgroundImage, size: s.backgroundSize, rep: s.backgroundRepeat, att: s.backgroundAttachment, col: s.backgroundColor,
        mine: await op("/images/packages/packages-pattern.svg"), cl: await op("/images/contact/doodle-tile.svg"),
        card: { img: c.backgroundImage, col: c.backgroundColor, before: cb.content, beforeImg: cb.backgroundImage },
        scroll: { sw: sc.scrollWidth, cw: sc.clientWidth }, win: win ? { sw: win.scrollWidth, cw: win.clientWidth } : null,
        doc: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth },
      };
    }, pg);
    L.check("the page's scroller and header card were measured", !!r, String(r));
    L.check("the page ground carries the packages tile", /\/images\/packages\/packages-pattern\.svg/.test(r?.bg ?? ""), String(r?.bg));
    L.check("at the Contact list's size, 340 × 360, repeating", r?.size === "340px 360px" && r?.rep === "repeat", `${r?.size} ${r?.rep}`);
    L.check("scrolling with the page (local), on the Contact list's ground #f2eee8", r?.att === "local" && r?.col === "rgb(242, 238, 232)", `${r?.att} ${r?.col}`);
    L.check("the tile's opacity is the Contact list's (read from both SVGs)", !!r?.mine && r.mine === r.cl, `${r?.mine} vs ${r?.cl}`);
    L.check("the header card has no pattern: no ::before image, a flat fill", !!r && r.card.img === "none" && (r.card.before === "none" || r.card.beforeImg === "none") && r.card.col !== "rgba(0, 0, 0, 0)", JSON.stringify(r?.card));
    L.check("the scroller has no horizontal overflow", !!r && r.scroll.sw <= r.scroll.cw, JSON.stringify(r?.scroll));
    L.check("the window has no horizontal overflow", !!r?.win && r.win.sw <= r.win.cw, JSON.stringify(r?.win));
    L.check("the document has no horizontal overflow", !!r && r.doc.sw <= r.doc.cw, JSON.stringify(r?.doc));
    L.done(9);
  });
}

/* ── L2 · three typewriter headings ── */
test("L2 exactly three headings are set in the typewriter; the materials tab's label is the one exception", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L2");
  await open(page, SIZES[1]);
  const tw = await page.evaluate((p) => {
    const root = document.querySelector(p)!; const out: { tag: string; cls: string; head: boolean; text: string }[] = []; let texts = 0;
    for (const e of root.querySelectorAll("*")) {
      if (!(e as HTMLElement).offsetParent) continue;
      if (![...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) continue;
      texts++;
      if (/special elite/i.test(getComputedStyle(e).fontFamily)) out.push({ tag: e.tagName, cls: String((e as HTMLElement).className), head: !!e.closest("h1, h2, h3, h4"), text: (e.textContent ?? "").trim().slice(0, 40) });
    }
    const h = root.querySelector(".p9-pkl-h") as HTMLElement | null, sub = root.querySelector(".p9-pkl-sub") as HTMLElement | null, ill = root.querySelector(".p9-pkl-k .p9-ill") as HTMLElement | null;
    const hs = h ? getComputedStyle(h) : null, ss = sub ? getComputedStyle(sub) : null;
    const hr = h?.getBoundingClientRect(), sr = sub?.getBoundingClientRect(), ir = ill?.getBoundingClientRect();
    return {
      out, texts,
      h: hs ? { tag: h!.tagName, ff: hs.fontFamily, fs: hs.fontSize, lh: hs.lineHeight, col: hs.color, tt: hs.textTransform, txt: h!.textContent } : null,
      sub: ss ? { ff: ss.fontFamily, fs: ss.fontSize, st: ss.fontStyle, col: ss.color, txt: sub!.textContent, gap: sr && hr ? sr.top - hr.bottom : null } : null,
      art: ir && hr && sr ? { mid: ir.top + ir.height / 2, pair: (hr.top + sr.bottom) / 2, right: ir.right, left: hr.left } : null,
    };
  }, pg);
  const ex = tw.out.filter((x) => /p9-id-libT/.test(x.cls)), rest = tw.out.filter((x) => !/p9-id-libT/.test(x.cls));
  L.check("the census read the page (over 60 text elements)", tw.texts > 60, String(tw.texts));
  L.check("exactly three typewriter headings, besides the tab", rest.length === 3 && rest.every((x) => x.head), JSON.stringify(rest));
  L.check("…the title's", rest.some((x) => /\bhl\b/.test(x.cls)), JSON.stringify(rest));
  L.check("…Your packages", rest.some((x) => /p9-pkl-h/.test(x.cls) && x.tag === "H2"), JSON.stringify(rest));
  L.check("…and the open package's name", rest.some((x) => /p9-po-nm/.test(x.cls)), JSON.stringify(rest));
  /* v39.3: the materials tab is retired, so there is no exception left */
  L.check("no other typewriter text (the materials tab, the one exception, is retired)", ex.length === 0, JSON.stringify(ex));
  L.check("Your packages: Special Elite 30px/1.1 ink, no capitals", !!tw.h && /special elite/i.test(tw.h.ff) && tw.h.fs === "30px" && tw.h.lh === "33px" && tw.h.col === INK && tw.h.tt === "none", JSON.stringify(tw.h));
  L.check("under it: 'Open one to change it below', serif italic 15px at ink 60%", !!tw.sub && tw.sub.txt === "Open one to change it below" && /source serif/i.test(tw.sub.ff) && tw.sub.fs === "15px" && tw.sub.st === "italic" && tw.sub.col === "rgba(28, 19, 15, 0.6)", JSON.stringify(tw.sub));
  L.check("…4px down (±1)", near(tw.sub?.gap, 4, 1), String(tw.sub?.gap));
  L.check("the art sits to the left, centred on the pair (±1)", !!tw.art && tw.art.right < tw.art.left && near(tw.art.mid, tw.art.pair, 1), JSON.stringify(tw.art));
  L.done(10);
});

/* L7 — RETIRED by v39.3 (Your materials' folder tab and rows are retired: pk393 L14). See
   tests/e2e/RETIRED-submission-packages-v39-3.md */

/* ── L8 · the packages panel ── */
for (const size of SIZES) {
  test(`L8 one panel holds the labels and the builder; the explainer and the band are outside; the header card's edges, at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L8-${size.width}`);
    await open(page, size);
    await page.evaluate(() => { try { localStorage.removeItem("sa.guide.packages-explainer"); } catch { /* */ } });
    await page.reload(); await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1200);
    const r = await page.evaluate((p) => {
      const root = document.querySelector(p)!, panel = root.querySelector('[data-pk392="panel"]') as HTMLElement | null;
      const bx = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, right: b.right, top: b.top, bottom: b.bottom }; };
      const card = root.querySelector(".pk39-card"), tip = root.querySelector(".p9-tip"), band = root.querySelector('[data-pk38="band"]');
      const cs = panel ? getComputedStyle(panel) : null;
      return {
        has: !!panel, labels: !!panel?.querySelector('[data-pk39="labels"]'), lib: !!panel?.querySelector('[data-pk393="builder"]'), open: !!panel?.querySelector('[data-pk40="open"]'),
        kicker: !!panel?.querySelector('[data-pk39="kicker"]'), tipIn: !!tip && !!panel?.contains(tip), bandIn: !!band && !!panel?.contains(band), tip: !!tip, band: !!band,
        p: bx(panel), card: bx(card), b: bx(band), bg: cs?.backgroundColor, rad: cs?.borderRadius,
      };
    }, pg);
    L.check("the panel is on the page", r.has, String(r.has));
    /* v39.3 RETARGET: the builder is Steps + preview (one `[data-pk393="builder"]`, which is also the open package) */
  L.check("it holds the labels, the builder label and the builder", r.labels && r.kicker && r.lib && r.open, JSON.stringify(r));
    L.check("the explainer is on the page and outside it", r.tip && !r.tipIn, `${r.tip} ${r.tipIn}`);
    L.check("the results band is on the page and outside it", r.band && !r.bandIn, `${r.band} ${r.bandIn}`);
    L.check("its left edge is the header card's (±1)", near(r.p?.x, r.card?.x, 1), `${r.p?.x} vs ${r.card?.x}`);
    L.check("its right edge is the header card's (±1)", near(r.p?.right, r.card?.right, 1), `${r.p?.right} vs ${r.card?.right}`);
    L.check("#fbf9f5, radius 20", r.bg === "rgb(251, 249, 245)" && r.rad === "20px", `${r.bg} ${r.rad}`);
    L.check(`the band is ${size.width === 1280 ? 80 : 96} below it (±1)`, near(r.b && r.p ? r.b.top - r.p.bottom : null, size.width === 1280 ? 80 : 96, 1), `${r.b?.top} − ${r.p?.bottom}`);
    L.done(8);
  });
}

/* ── L9 · the version first ── */
test("L9 the version leads: the packing list, the drawer, the pieces row and both tab rows; stored fields unchanged", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L9");
  const before = dump();
  await open(page, SIZES[1]);
  const r = await page.evaluate((p) => {
    const root = document.querySelector(p)!;
    const first = root.querySelector('[data-pk40="open"] .p9-mf > .p9-mr') as HTMLElement | null;
    const lab = (first?.querySelector(".p9-mr-l span")?.textContent ?? "").trim(), sub = (first?.querySelector(".p9-mr-l em")?.textContent ?? "").trim();
    /* the order a reader sees: by position, not by DOM order */
    const slots = [...root.querySelectorAll('[data-pk40="open"] .p9-mf > .p9-mr')].map((e) => ({ k: (e as HTMLElement).dataset.slot ?? "ex", y: e.getBoundingClientRect().top })).sort((a, b) => a.y - b.y).map((x) => x.k);
    const lt = [...root.querySelectorAll(".p9-lib-tabs [role=tab]")].map((b) => [(b.textContent ?? "").replace(/\d+/g, "").trim(), b.getAttribute("aria-selected")]);
    const rt = [...root.querySelectorAll('[data-pk39="list-pc"] [role=tab]')].map((b) => [(b.textContent ?? "").replace(/\d+/g, "").trim(), b.getAttribute("aria-selected")]);
    const pk = [...root.querySelectorAll('[data-pk38="row-pieces"] .p9-ag3-k')].map((e) => (e.textContent ?? "").trim());
    return { slot: first?.dataset.slot, lab, sub, slots, lt, rt, pk };
  }, pg);
  /* v39.3: the packing list and Your materials' tabs are retired; the steps' order is pk393 L10's (version first) */
  L.check("the pieces list leads with Versions and opens on it", r.rt[0]?.[0] === "Versions" && r.rt[0]?.[1] === "true", JSON.stringify(r.rt));
  L.check("the pieces row starts with Best opening", /^best opening$/i.test(r.pk[0] ?? ""), JSON.stringify(r.pk));
  /* the drawer: Figures on the open package */
  await page.locator(`${pg} [data-pk40="open"] [data-pk38="figures"]`).first().click();
  await page.locator('[data-pk38="pkd"]').first().waitFor({ state: "visible", timeout: 10_000 });
  const d = await page.evaluate(() => [...document.querySelectorAll('[data-pk38="pkd"] .p8-dpz-l')].map((e) => (e.textContent ?? "").trim()));
  L.check("the drawer's What's in it starts with Version", d[0] === "Version", JSON.stringify(d));
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  /* the break for this check: a stored field really changes between the two reads (the long name) */
  if (MUT === "L9data") seed("--long-name");
  const after = dump();
  L.check("a saved package's stored fields are unchanged", before === after, before === after ? "same" : `${before.slice(0, 200)} … vs … ${after.slice(0, 200)}`);
  L.done(4);
});
