/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150 — the QC150 locks (design-refs/query-centre-v150/), on the rendered page at 1280 × 800 and
 * 1512 × 900. Each asserts its population first, and each was red first: against the pre-v150 build (QC150_BASE=1)
 * and against its named mutation (QC150_MUTATE=L<n>). The page-expressible mutations are applied here; L3, L7, L8, L11
 * and L12 are source edits, applied to the source and rebuilt (see reports/qc-v150/REPORT.md).
 *
 *   L1 dressing · L2 cards · L3 card filter · L4 widths · L5 title · L6 one scale · L7 no overlap · L8 smooth ·
 *   L9 past bars · L10 pinning · L11 group/sort · L12 open
 *
 * ⚠️ L9 NEEDS ITS OWN QUERY: `node tests/e2e/seedQc150.mjs` (three dated stages, inside the 3M home window);
 *    `--clean` removes it.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openQc } from "./nb1Lib";

test.describe.configure({ mode: "default" });
test.setTimeout(420_000);
const DIR = "reports/qc-v150";
const MUT = process.env.QC150_MUTATE ?? "";
const BASE = process.env.QC150_BASE === "1";
const ONLY = process.env.QC150_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };
const DAY = 86_400_000;

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the page-expressible breaks */
const PAGE_MUT: Record<string, { css?: string; js?: string }> = {
  L1: { js: `(() => { const h = document.querySelector('[data-qc149="header"]'); if (h) { const b = document.createElement('section'); b.setAttribute('data-qc149','banner'); b.textContent = '4 queries are waiting on you.'; h.insertBefore(b, h.children[1] || null); } })()` },
  L2: { js: `(() => { const c = document.querySelector('[data-qc150="cards"]'); if (c) { const v = document.createElement('div'); v.setAttribute('data-qc149','views'); v.innerHTML = '<button data-qc149="view">All</button>'; c.after(v); } })()` },
  L4: { css: `.qcv-group.qcv-group.qcv-group { --qc149-list: calc(var(--qc149-col) + var(--qc149-ext)) !important; }` },
  L5: { js: `(() => { const s = document.querySelector('[data-qc150="switch"]'); const tb = document.querySelector('.qc140-tb'); if (s && tb) tb.prepend(s); })()` },
  L6: { css: `.qc150-trk { transform: translateX(16px); }` },
  L9: { css: `.qc150-bar--past { display: none !important; }` },
  L10: { css: `.qc150-bvh { position: static !important; }` },
};
async function mutate(page: Page) {
  const m = PAGE_MUT[MUT];
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) { await page.evaluate(m.js); await page.waitForTimeout(200); }
}
/** re-applied after anything that re-renders the part it breaks */
async function open(page: Page, vp: VP) {
  await openQc(page, vp);
  await mutate(page);
}

const vis = (sel: string) => `[...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.getBoundingClientRect().height > 0)`;
async function count(page: Page, sel: string): Promise<number> { return page.evaluate(`${vis(sel)}.length`) as Promise<number>; }
async function toView(page: Page, v: "list" | "birds") {
  await page.evaluate((x) => { const b = [...document.querySelectorAll<HTMLElement>(`[data-qc150="switch"] [data-v="${x}"]`)].find((e) => e.getBoundingClientRect().height > 0); b?.click(); }, v);
  await page.waitForTimeout(900);
}
async function scrollTitleTop(page: Page, gap = 20) {
  await page.evaluate((g) => {
    const t = [...document.querySelectorAll<HTMLElement>("[data-qc150='title']")].find((e) => e.getBoundingClientRect().height > 0);
    const sc = t?.closest<HTMLElement>(".wpg-scroll");
    if (t && sc) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - g;
  }, gap);
  await page.waitForTimeout(400);
}
/** every list row's where-it-stands set, from the list itself (all groups unfolded by openQc) */
async function listRows(page: Page): Promise<{ id: string; where: string }[]> {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='row']")].filter((e) => e.getBoundingClientRect().height > 0 && !e.closest("[data-qc139='practice']"))
    .map((e) => ({ id: e.dataset.id ?? "", where: e.dataset.where ?? "" })));
}
async function cardsInfo(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='card']")].filter((e) => e.getBoundingClientRect().height > 0).map((c) => {
    const b = c.getBoundingClientRect(), h = c.querySelector<HTMLElement>("[data-qc150='head']")!.getBoundingClientRect();
    const f = c.querySelector<HTMLElement>("[data-qc150='faces']");
    return { k: c.dataset.k!, n: +(c.querySelector("[data-qc150='count']")?.textContent ?? "NaN"), on: c.hasAttribute("data-on"), bg: getComputedStyle(c).backgroundColor,
      inset: [h.top - b.top, h.left - b.left, b.right - h.right], faces: f ? f.querySelectorAll(".qc150-face").length : -1, more: f ? +(f.dataset.more ?? "0") : -1, h: b.height };
  }));
}
async function beRowIds(page: Page): Promise<string[]> {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row']")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.id ?? ""));
}
async function clickCard(page: Page, k: string) {
  await page.evaluate((x) => { const c = [...document.querySelectorAll<HTMLElement>(`[data-qc150='card'][data-k='${x}'] [data-qc150='hit']`)].find((e) => e.getBoundingClientRect().height > 0); c?.click(); }, k);
  await page.waitForTimeout(900);
}
async function zoomTo(page: Page, z: string) {
  await page.evaluate((x) => (document.querySelector(`[data-qc150='zoom'] [data-z='${x}']`) as HTMLElement | null)?.click(), z);
  await page.waitForTimeout(700);
}
/** drag the axis by dx (negative = back in time: the view moves left) */
async function dragAxis(page: Page, dx: number, steps = 10) {
  const ax = (await page.locator("[data-qc150='axis']").boundingBox())!;
  const x0 = ax.x + ax.width / 2, y = ax.y + 60;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(x0 - (dx * i) / steps, y);
  /* settle before the release, so it is a placed drag rather than a flick (L8 measures the flick) */
  await page.waitForTimeout(150);
  await page.mouse.move(x0 - dx + (dx > 0 ? -1 : 1), y);
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(900);
}

for (const vp of SIZES) {
  test.describe(`QC150 @ ${vp.width}`, () => {
    test("L1 · dressing: the doodle sheet, the 40px title with its underline, one sentence, a header ≤200 at 1512, no banner", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => {
        const sc = [...document.querySelectorAll<HTMLElement>(".qc-wpg--v11 > .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
        const cs = sc ? getComputedStyle(sc) : null;
        const h1 = [...document.querySelectorAll<HTMLElement>("[data-qc149='title']")].find((e) => e.getBoundingClientRect().height > 0);
        const hl = h1?.querySelector<HTMLElement>(".hl");
        const p = h1?.closest(".phc")?.querySelector<HTMLElement>(".phc-tx > p");
        const card = h1?.closest<HTMLElement>("[data-qc149='card']");
        return { bgi: cs?.backgroundImage ?? "", bgs: cs?.backgroundSize ?? "", bgc: cs?.backgroundColor ?? "", fs: h1 ? getComputedStyle(h1).fontSize : "", hl: !!hl, hlBg: hl ? getComputedStyle(hl).backgroundImage : "",
          sub: p?.textContent?.trim() ?? "", cardH: card?.getBoundingClientRect().height ?? -1,
          banner: [...document.querySelectorAll<HTMLElement>("[data-qc149='banner']")].filter((e) => e.getBoundingClientRect().height > 0).length };
      });
      L.check("sheet tile", r.bgi.includes("doodle-tile.svg"), r.bgi.slice(0, 80));
      L.check("tile size", r.bgs === "340px 360px", r.bgs);
      L.check("sheet colour", r.bgc === "rgb(242, 238, 232)", r.bgc);
      L.check("title 40px", r.fs === "40px", r.fs);
      L.check("title underline", r.hl && /238, 226, 217/.test(r.hlBg), r.hlBg.slice(0, 80));
      L.check("one sentence", r.sub.length > 10 && r.sub.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length === 1, r.sub);
      if (vp.width === 1512) L.check("header ≤200", r.cardH > 0 && r.cardH <= 200, String(r.cardH));
      L.check("no banner", r.banner === 0, String(r.banner));
      L.done(vp.width === 1512 ? 8 : 7);
    });

    test("L2 · cards: four, in order, counts from the data, heads inset 4–6, faces = queries (capped + N), no chips", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await open(page, vp);
      const c = await cardsInfo(page);
      const rows = await listRows(page);
      L.check("population", c.length === 4 && rows.length > 10, `${c.length} cards, ${rows.length} rows`);
      L.check("order", c.map((x) => x.k).join() === "you,agent,quiet,closed", c.map((x) => x.k).join());
      const n = (k: string) => rows.filter((r) => r.where === k).length;
      for (const x of c) {
        L.check(`${x.k} count`, x.n === n(x.k), `card ${x.n}, list ${n(x.k)}`);
        L.check(`${x.k} inset`, x.inset.every((v) => v >= 4 && v <= 6), x.inset.map((v) => v.toFixed(1)).join("/"));
        const cap = x.k === "agent" ? 5 : 6;
        /* re-pointed by v150.1 §3: the discs are cut to the card's room, and "+N" grows to match */
        L.check(`${x.k} faces`, x.faces >= 1 && x.faces <= Math.min(cap, x.n) && x.faces + x.more === x.n, `${x.faces} + ${x.more} of ${x.n}`);
      }
      L.check("cards share a height", Math.max(...c.map((x) => x.h)) - Math.min(...c.map((x) => x.h)) < 1, c.map((x) => x.h.toFixed(1)).join());
      L.check("no chips", (await count(page, "[data-qc149='views']")) === 0, "chips drawn");
      L.done(16);
    });

    test("L3 · card filter: With the agent narrows the list and Birds-eye, is navy, and clears on a second press", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      await open(page, vp);
      const all = await listRows(page);
      const agentN = all.filter((r) => r.where === "agent").length;
      const where = new Map(all.map((r) => [r.id, r.where]));
      L.check("population", all.length > 10 && agentN > 0, `${all.length} rows, ${agentN} with the agent`);
      await clickCard(page, "agent");
      const f = await listRows(page);
      const c = (await cardsInfo(page)).find((x) => x.k === "agent")!;
      L.check("list narrowed", f.length === agentN && f.every((r) => r.where === "agent"), `${f.length} rows`);
      L.check("pressed navy", c.on && c.bg === "rgb(42, 58, 82)", `${c.on} ${c.bg}`);
      await clickCard(page, "agent");
      L.check("list restored", (await listRows(page)).length === all.length, "");
      /* the same in Birds-eye */
      await toView(page, "birds");
      await mutate(page);
      const beAll = await beRowIds(page);
      await clickCard(page, "agent");
      const beF = await beRowIds(page);
      L.check("birds population", beAll.length > 0 && beF.length > 0, `${beAll.length} → ${beF.length}`);
      L.check("birds narrowed", beF.length < beAll.length && beF.every((id) => where.get(id) === "agent"), `${beF.length} of ${beAll.length}; ${beF.filter((id) => where.get(id) !== "agent").length} not with the agent`);
      await clickCard(page, "agent");
      L.check("birds restored", (await beRowIds(page)).length === beAll.length, "");
      await toView(page, "list");
      L.done(7);
    });

    test("L4 · widths: the list is min(S − 40, 1320) and centred; the title matches it; header and cards keep v149.2", async ({ page }) => {
      test.skip(!run("L4"));
      const L = new Ledger(`L4-${vp.width}`);
      await open(page, vp);
      const b = await page.evaluate(() => {
        const box = (s: string) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); const r = e?.getBoundingClientRect(); return r ? { l: r.left, r: r.right, w: r.width } : null; };
        return { sheet: box(".ws-window"), list: box(".qc138-sheet"), title: box("[data-qc150='title']"), card: box("[data-qc149='card']"), cards: box("[data-qc150='cards']") };
      });
      L.check("population", !!(b.sheet && b.list && b.title && b.card && b.cards), JSON.stringify(b));
      if (b.sheet && b.list && b.title && b.card && b.cards) {
        const S = b.sheet.w;
        /* re-pointed by v150.1 §1: one width, W = min(S − 48, 1200), for the list and every block above it */
        const lw = Math.min(S - 48, 1200);
        L.check("list width", Math.abs(b.list.w - lw) <= 1, `${b.list.w.toFixed(1)} vs ${lw}`);
        L.check("list centred", Math.abs((b.list.l - b.sheet.l) - (b.sheet.r - b.list.r)) <= 1, `${(b.list.l - b.sheet.l).toFixed(1)} / ${(b.sheet.r - b.list.r).toFixed(1)}`);
        L.check("title edges", Math.abs(b.title.l - b.list.l) <= 1 && Math.abs(b.title.r - b.list.r) <= 1, `${b.title.l.toFixed(1)}–${b.title.r.toFixed(1)} vs ${b.list.l.toFixed(1)}–${b.list.r.toFixed(1)}`);
        const hw = Math.min(S - 48, 1200);
        L.check("header at W (v150.1)", Math.abs(b.card.w - hw) <= 1 && Math.abs(b.card.l - b.list.l) <= 1, `${b.card.w.toFixed(1)} vs ${hw}`);
        L.check("cards at W (v150.1)", Math.abs(b.cards.w - hw) <= 1 && Math.abs(b.cards.l - b.card.l) <= 1, `${b.cards.w.toFixed(1)} vs ${hw}`);
      }
      L.done(6);
    });

    test("L5 · title: the text and count line change with the view; the switch is centred under it; the bar has none", async ({ page }) => {
      test.skip(!run("L5"));
      const L = new Ledger(`L5-${vp.width}`);
      await open(page, vp);
      const read = () => page.evaluate(() => {
        const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
        const t = v("[data-qc150='title-text']"), c = v("[data-qc150='count-line']"), sw = v("[data-qc150='switch']"), list = v(".qc138-sheet");
        return { t: t?.textContent ?? "", c: c?.textContent?.replace(/\s+/g, " ").trim() ?? "", cb: c?.getBoundingClientRect().bottom ?? 0,
          sw: sw ? { r: sw.getBoundingClientRect().right, b: sw.getBoundingClientRect().bottom, top: sw.getBoundingClientRect().top } : null,
          lr: list ? list.getBoundingClientRect().right : 0,
          inBar: document.querySelectorAll(".qc140-tb [data-qc150='switch'], .qc140-tb [data-v='birds']").length };
      });
      const a = await read();
      /* re-pointed by v150.1 §4: "Your queries", left-aligned, the switch at the list's right edge beside the count line */
      L.check("title text", a.t === "Your queries", a.t);
      L.check("list line", /^\d+ quer(y|ies) · \d+% heard back · (grouped by [a-z' ]+|not grouped), .+/.test(a.c), a.c);
      L.check("switch at the list's right", !!a.sw && Math.abs(a.sw.r - a.lr) <= 1, `${a.sw?.r.toFixed(1)} vs ${a.lr.toFixed(1)}`);
      L.check("switch bottom-aligned with the count line", !!a.sw && Math.abs(a.sw.b - a.cb) <= 4, `${a.sw?.b.toFixed(1)} vs ${a.cb.toFixed(1)}`);
      L.check("no switch in the bar", a.inBar === 0, String(a.inBar));
      await toView(page, "birds");
      const b = await read();
      L.check("birds line", /^\d+ live quer(y|ies) · on one timeline · most urgent first$/.test(b.c), b.c);
      L.check("no switch in the bar (birds)", b.inBar === 0, String(b.inBar));
      await toView(page, "list");
      L.done(7);
    });

    test("L6 · one scale: TODAY's tag and the today line share an x; a bar's left is the axis x of its start, at each zoom", async ({ page }) => {
      test.skip(!run("L6"));
      const L = new Ledger(`L6-${vp.width}`);
      await open(page, vp);
      await toView(page, "birds");
      await mutate(page);
      await scrollTitleTop(page);
      for (const z of ["6w", "3m", "6m"]) {
        await zoomTo(page, z);
        const r = await page.evaluate(() => {
          const DAY_ = 86_400_000;
          const be = document.querySelector<HTMLElement>("[data-qc150='birds']")!;
          const ax = be.querySelector<HTMLElement>("[data-qc150='axis']")!;
          const a = ax.getBoundingClientRect();
          const r0 = +be.dataset.r0!, ppd = +be.dataset.ppd!, sl = ax.scrollLeft;
          const tag = be.querySelector<HTMLElement>("[data-qc150='today-tag']")!.getBoundingClientRect();
          const line = be.querySelector<HTMLElement>("[data-qc150='today-line']")!.getBoundingClientRect();
          const dots = [...be.querySelectorAll<HTMLElement>("[data-qc150='be-dot']")].map((d) => { const b = d.getBoundingClientRect(); return b.left + b.width / 2; }).filter((x) => x > a.left && x < a.right);
          const bars = [...be.querySelectorAll<HTMLElement>("[data-qc150='be-bar'], [data-qc150='be-past']")].map((e) => {
            const b = e.getBoundingClientRect();
            return { got: b.left, want: a.left + ((+e.dataset.from! - r0) / DAY_) * ppd - sl };
          }).filter((x) => x.got > a.left + 2 && x.got < a.right - 2);
          return { tagX: tag.left + tag.width / 2, lineX: line.left, dots, bars };
        });
        L.check(`${z} population`, r.bars.length > 3 && r.dots.length > 0, `${r.bars.length} bars, ${r.dots.length} dots`);
        L.check(`${z} tag ↔ line`, Math.abs(r.tagX - r.lineX) <= 1, `${r.tagX.toFixed(1)} vs ${r.lineX.toFixed(1)}`);
        const badDots = r.dots.filter((x) => Math.abs(x - r.lineX) > 1);
        L.check(`${z} dots on the line`, badDots.length === 0, `${badDots.length} off by ${badDots.slice(0, 3).map((x) => (x - r.lineX).toFixed(1)).join()}`);
        const bad = r.bars.filter((b) => Math.abs(b.got - b.want) > 1);
        L.check(`${z} bars on the axis`, bad.length === 0, `${bad.length}/${r.bars.length} off, e.g. ${bad.slice(0, 2).map((b) => (b.got - b.want).toFixed(1)).join()}`);
      }
      await toView(page, "list");
      L.done(12);
    });

    test("L7 · no overlap: at each zoom, home and after dragging, no two visible boxes in a row meet, the axis is clean, nothing is clipped", async ({ page }) => {
      test.skip(!run("L7"));
      const L = new Ledger(`L7-${vp.width}`);
      await open(page, vp);
      await toView(page, "birds");
      await scrollTitleTop(page);
      const scan = () => page.evaluate(() => {
        const be = document.querySelector<HTMLElement>("[data-qc150='birds']")!;
        const shown = (e: HTMLElement) => getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().width > 0;
        const meet = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
        let rowsSeen = 0, boxes = 0; const hits: string[] = []; const clipped: string[] = [];
        for (const row of be.querySelectorAll<HTMLElement>("[data-qc150='be-row']")) {
          const tl = row.querySelector<HTMLElement>("[data-qc150='be-track']")!.getBoundingClientRect();
          const items = [...row.querySelectorAll<HTMLElement>(".qc150-lb, [data-qc150='be-mark'], [data-qc150='be-rest'], [data-qc150='be-dot']")]
            .filter(shown).map((e) => ({ e, b: e.getBoundingClientRect() })).filter((x) => x.b.right > tl.left && x.b.left < tl.right);
          if (items.length) rowsSeen++;
          boxes += items.length;
          for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (meet(items[i].b, items[j].b)) hits.push(`${row.dataset.id}: “${items[i].e.textContent}” × “${items[j].e.textContent}”`);
          for (const { e, b } of items) {
            if (e.dataset.qc150 === "be-dot") continue;
            const clip = e.closest<HTMLElement>(".qc150-bar") ?? null;
            const cb = clip ? clip.getBoundingClientRect() : tl;
            const out = b.left < Math.max(cb.left, tl.left) - 0.5 || b.right > Math.min(cb.right, tl.right) + 0.5 || e.scrollWidth > e.clientWidth + 0.5;
            if (out) clipped.push(`${row.dataset.id}: “${e.textContent}” ${b.left.toFixed(0)}–${b.right.toFixed(0)} in ${Math.max(cb.left, tl.left).toFixed(0)}–${Math.min(cb.right, tl.right).toFixed(0)}`);
          }
        }
        const ax = be.querySelector<HTMLElement>("[data-qc150='axis']")!.getBoundingClientRect();
        const axItems = [...be.querySelectorAll<HTMLElement>("[data-qc150='tick'], [data-qc150='month-name']")].filter(shown).map((e) => ({ e, b: e.getBoundingClientRect() })).filter((x) => x.b.right > ax.left && x.b.left < ax.right);
        for (let i = 0; i < axItems.length; i++) for (let j = i + 1; j < axItems.length; j++) if (meet(axItems[i].b, axItems[j].b)) hits.push(`axis: “${axItems[i].e.textContent}” × “${axItems[j].e.textContent}”`);
        for (const { e, b } of axItems) if (b.left < ax.left - 0.5 || b.right > ax.right + 0.5) clipped.push(`axis: “${e.textContent}” ${b.left.toFixed(0)}–${b.right.toFixed(0)} in ${ax.left.toFixed(0)}–${ax.right.toFixed(0)}`);
        return { rowsSeen, boxes, axis: axItems.length, hits, clipped };
      });
      let total = 0;
      for (const z of ["6w", "3m", "6m"]) {
        await zoomTo(page, z);
        await page.evaluate(() => (document.querySelector("[data-qc150='today']") as HTMLElement | null)?.click());
        await page.waitForTimeout(700);
        for (const [pos, dx] of [["home", 0], ["back 500", -500], ["forward 900", 900]] as const) {
          if (dx) await dragAxis(page, dx);
          const s = await scan();
          total += s.boxes;
          L.check(`${z} ${pos} population`, s.axis > 2, `${s.rowsSeen} rows, ${s.boxes} boxes, ${s.axis} axis labels`);
          L.check(`${z} ${pos} overlap`, s.hits.length === 0, s.hits.slice(0, 3).join(" | "));
          L.check(`${z} ${pos} clipped`, s.clipped.length === 0, s.clipped.slice(0, 3).join(" | "));
        }
      }
      /* the population across the nine positions: a far-future position can honestly hold no bars */
      L.check("boxes measured", total > 40, String(total));
      await toView(page, "list");
      L.done(28);
    });

    test("L8 · smooth: a drag rebuilds nothing, moves every cell by one scrollLeft, carries on after a fast release, opens nothing", async ({ page }) => {
      test.skip(!run("L8"));
      const L = new Ledger(`L8-${vp.width}`);
      await open(page, vp);
      await toView(page, "birds");
      await scrollTitleTop(page);
      const info = () => page.evaluate(() => {
        const be = document.querySelector<HTMLElement>("[data-qc150='birds']")!;
        const marked = [...be.querySelectorAll<HTMLElement>("[data-qc150='be-row'], [data-qc150='be-bar']")].filter((e) => (e as HTMLElement & { __qc150?: number }).__qc150 === 1).length;
        return { nodes: be.querySelectorAll("*").length, marked, sl: [...be.querySelectorAll<HTMLElement>("[data-qc150-tl]")].map((e) => e.scrollLeft) };
      });
      const marks = await page.evaluate(() => { const els = [...document.querySelectorAll<HTMLElement>("[data-qc150='birds'] [data-qc150='be-row'], [data-qc150='birds'] [data-qc150='be-bar']")]; els.forEach((e) => { (e as HTMLElement & { __qc150?: number }).__qc150 = 1; }); return els.length; });
      const q0 = await page.evaluate(() => location.search);
      const i0 = await info();
      L.check("population", i0.nodes > 100 && i0.sl.length > 5 && marks > 5, `${i0.nodes} nodes, ${i0.sl.length} cells, ${marks} marked`);
      const ax = (await page.locator("[data-qc150='axis']").boundingBox())!;
      const x0 = ax.x + ax.width / 2, y = ax.y + 60;
      await page.mouse.move(x0, y);
      await page.mouse.down();
      let prev = i0.sl[0];
      for (let i = 1; i <= 10; i++) {
        await page.mouse.move(x0 + i * 30, y);
        const s = await info();
        L.check(`step ${i} no rebuild`, s.nodes === i0.nodes && s.marked === marks, `${s.nodes}/${i0.nodes} nodes, ${s.marked}/${marks} the same elements`);
        L.check(`step ${i} one offset`, Math.max(...s.sl) - Math.min(...s.sl) <= 1 && s.sl[0] !== prev, `${Math.min(...s.sl)}–${Math.max(...s.sl)} (was ${prev})`);
        prev = s.sl[0];
      }
      /* a fast flick: the motion carries on after the release */
      await page.mouse.move(x0 + 300 + 80, y);
      await page.mouse.move(x0 + 300 + 160, y);
      await page.mouse.up();
      const after = await page.evaluate(async () => {
        const ax2 = document.querySelector<HTMLElement>("[data-qc150='axis']")!;
        const out: number[] = [ax2.scrollLeft];
        for (let k = 0; k < 4; k++) { await new Promise((r) => requestAnimationFrame(() => r(null))); out.push(ax2.scrollLeft); }
        return out;
      });
      const moves = after.slice(1).filter((v, i) => v !== after[i]).length;
      L.check("momentum ≥3 frames", moves >= 3, after.join(" → "));
      await page.waitForTimeout(900);
      L.check("a drag opens nothing", (await page.evaluate(() => location.search)) === q0 && (await count(page, "[data-qp='panel'] [data-qc149c='card']")) === 0, await page.evaluate(() => location.search));
      await toView(page, "list");
      L.done(23);
    });

    test("L9 · past bars: the seeded three-stage query draws two past bars and the current, in date order, apart", async ({ page }) => {
      test.skip(!run("L9"));
      const L = new Ledger(`L9-${vp.width}`);
      await open(page, vp);
      await toView(page, "birds");
      await mutate(page);
      const r = await page.evaluate(() => {
        const row = document.querySelector<HTMLElement>("[data-qc150='be-row'][data-id='qc150l9-q']");
        if (!row) return null;
        row.scrollIntoView({ block: "center" });
        const bars = [...row.querySelectorAll<HTMLElement>("[data-qc150='be-past'], [data-qc150='be-bar']")].filter((e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0)
          .map((e) => ({ kind: e.dataset.qc150, from: +(e.dataset.from ?? 0), l: e.getBoundingClientRect().left, r: e.getBoundingClientRect().right }));
        return bars;
      });
      L.check("the seeded row (node tests/e2e/seedQc150.mjs)", r !== null, "row absent");
      if (r) {
        L.check("two past bars", r.filter((b) => b.kind === "be-past").length === 2, JSON.stringify(r.map((b) => b.kind)));
        L.check("one current bar", r.filter((b) => b.kind === "be-bar").length === 1, "");
        const sorted = [...r].sort((a, b) => a.l - b.l);
        L.check("date order", sorted.every((b, i) => i === 0 || b.from > sorted[i - 1].from), sorted.map((b) => b.kind).join());
        L.check("no overlap", sorted.every((b, i) => i === 0 || b.l >= sorted[i - 1].r - 0.5), sorted.map((b) => `${b.l.toFixed(0)}–${b.r.toFixed(0)}`).join(" "));
        L.check("current last", sorted[sorted.length - 1]?.kind === "be-bar", "");
      }
      await toView(page, "list");
      L.done(6);
    });

    test("L10 · pinning: after 800px of page scroll the navy bar's bottom is the date row's top, and both are on screen", async ({ page }) => {
      test.skip(!run("L10"));
      const L = new Ledger(`L10-${vp.width}`);
      await open(page, vp);
      await toView(page, "birds");
      await mutate(page);
      await page.evaluate(() => { const sc = document.querySelector<HTMLElement>("[data-qc150='birds']")?.closest<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop = 800; });
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => {
        const tb = [...document.querySelectorAll<HTMLElement>(".qc140-tb")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
        const dr = document.querySelector<HTMLElement>("[data-qc150='daterow']")!.getBoundingClientRect();
        const sc = document.querySelector<HTMLElement>("[data-qc150='birds']")!.closest<HTMLElement>(".wpg-scroll")!;
        return { tbB: tb.bottom, tbT: tb.top, drT: dr.top, drB: dr.bottom, top: sc.getBoundingClientRect().top, st: sc.scrollTop, vh: window.innerHeight };
      });
      L.check("population: the page scrolled", r.st >= 700, String(r.st));
      L.check("flush", Math.abs(r.tbB - r.drT) <= 1, `${r.tbB.toFixed(1)} vs ${r.drT.toFixed(1)}`);
      L.check("both visible", r.tbT >= r.top - 1 && r.drB <= r.vh && r.drT > r.top, `bar ${r.tbT.toFixed(0)}, row ${r.drT.toFixed(0)}–${r.drB.toFixed(0)}, scroller ${r.top.toFixed(0)}`);
      await toView(page, "list");
      L.done(3);
    });

    test("L11 · group/sort: Birds-eye by Status shows pipeline bands with true counts; the list's grouping and the time scroll hold", async ({ page }) => {
      test.skip(!run("L11"));
      const L = new Ledger(`L11-${vp.width}`);
      await open(page, vp);
      const listGroup = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-ltb='group-name']")].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "");
      const g0 = await listGroup();
      /* the list's own Status bands, the reference for the counts */
      const listBands = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-qcv='gband']")].filter((e) => e.getBoundingClientRect().height > 0)
        .map((b) => [b.querySelector("[data-qcv='gband-t']")?.textContent ?? "", parseInt(b.querySelector("[data-qcv='gband-n']")?.textContent ?? "0", 10)])));
      /* the list on a grouping Birds-eye cannot pick, so a shared state would show */
      await page.evaluate(() => ([...document.querySelectorAll<HTMLElement>("[data-qc140='group']")].find((e) => e.getBoundingClientRect().height > 0))?.click());
      await page.waitForTimeout(300);
      await page.evaluate(() => (document.querySelector("[data-qc140='group-opt'][data-g='action']") as HTMLElement | null)?.click());
      await page.waitForTimeout(700);
      const g1 = await listGroup();
      L.check("the list set to Next action", g1 === "Next action", g1);
      await toView(page, "birds");
      await scrollTitleTop(page);
      const sl0 = await page.evaluate(() => document.querySelector<HTMLElement>("[data-qc150='axis']")!.scrollLeft);
      await page.evaluate(() => (document.querySelector("[data-qc150='be-group-pill']") as HTMLElement).click());
      await page.waitForTimeout(300);
      const menu = await page.evaluate(() => { const m = document.querySelector<HTMLElement>("[data-qc150='be-menu']"); return m ? { t: m.querySelector("h6")?.textContent ?? "", opts: [...m.querySelectorAll("button")].map((b) => b.textContent ?? "") } : null; });
      L.check("menu", menu?.t === "GROUP BIRDS-EYE BY" && menu.opts.join() === "Urgency,Status,None", JSON.stringify(menu));
      await page.evaluate(() => (document.querySelector("[data-qc150='be-menu'] [data-v='status']") as HTMLElement).click());
      await page.waitForTimeout(700);
      const bands = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-group']")].map((g) => ({ label: g.querySelector("[data-qc150='be-band'] b")?.textContent ?? "", n: +(g.querySelector("[data-qc150='be-band'] small")?.textContent ?? "0"), rows: g.querySelectorAll("[data-qc150='be-row']").length })));
      const ORDER = ["Queried", "Partial requested", "Partial sent", "Full requested", "Full sent", "Revise & resubmit", "Resubmitted", "Offer"];
      L.check("population", bands.length > 1, JSON.stringify(bands));
      L.check("pipeline order", bands.every((b, i) => i === 0 || ORDER.indexOf(b.label) > ORDER.indexOf(bands[i - 1].label)) && bands.every((b) => ORDER.includes(b.label)), bands.map((b) => b.label).join());
      L.check("band counts = rows", bands.every((b) => b.n === b.rows && b.n > 0), bands.map((b) => `${b.label} ${b.n}/${b.rows}`).join());
      L.check("band counts = the list's", bands.every((b) => listBands[b.label] === b.n), bands.map((b) => `${b.label} ${b.n} vs ${listBands[b.label]}`).join());
      const sl1 = await page.evaluate(() => document.querySelector<HTMLElement>("[data-qc150='axis']")!.scrollLeft);
      L.check("time scroll held", Math.abs(sl1 - sl0) <= 1, `${sl0} → ${sl1}`);
      await toView(page, "list");
      L.check("the list's grouping held", (await listGroup()) === "Next action" && g0 !== "", `${g0} → Next action → ${await listGroup()}`);
      /* put the list back on its default */
      await page.evaluate(() => ([...document.querySelectorAll<HTMLElement>("[data-qc140='group-reset']")].find((e) => e.getBoundingClientRect().height > 0))?.click());
      await page.waitForTimeout(500);
      L.done(8);
    });

    test("L12 · open: a Birds-eye bar opens its query; N / M and › follow Birds-eye's order; the pill and drawer are gone", async ({ page }) => {
      test.skip(!run("L12"));
      const L = new Ledger(`L12-${vp.width}`);
      await open(page, vp);
      L.check("no floating pill", (await page.locator(".bvd-tab").count()) === 0, "pill in the DOM");
      L.check("no drawer", (await page.locator("[data-qcv='bvd']").count()) === 0, "drawer in the DOM");
      await toView(page, "birds");
      await scrollTitleTop(page);
      const ids = await beRowIds(page);
      L.check("population", ids.length > 3, String(ids.length));
      const i = 1;
      await page.evaluate((id) => { const bar = document.querySelector<HTMLElement>(`[data-qc150='be-row'][data-id='${id}'] [data-qc150='be-bar']`) ?? document.querySelector<HTMLElement>(`[data-qc150='be-row'][data-id='${id}'] .qc150-ag`); bar?.click(); }, ids[i]);
      await page.waitForTimeout(1500);
      const p1 = await page.evaluate(() => ({ q: new URLSearchParams(location.search).get("q"), pos: document.querySelector("[data-qp='panel'] [data-qc149c='pos']")?.textContent?.trim() ?? "" }));
      L.check("opens that query", p1.q === ids[i], `${p1.q} vs ${ids[i]}`);
      L.check("N / M is Birds-eye's", p1.pos === `${i + 1} / ${ids.length}`, `${p1.pos} vs ${i + 1} / ${ids.length}`);
      L.check("the row is selected", (await page.evaluate((id) => document.querySelector(`[data-qc150='be-row'][data-id='${id}']`)?.classList.contains("is-sel"), ids[i])) === true, "");
      await page.evaluate(() => { const b = [...document.querySelectorAll<HTMLElement>("[data-qp='panel'] button")].find((x) => /next/i.test(x.getAttribute("aria-label") ?? "") || x.textContent?.trim() === "›"); b?.click(); });
      await page.waitForTimeout(1500);
      const p2 = await page.evaluate(() => new URLSearchParams(location.search).get("q"));
      L.check("› selects the next Birds-eye row", p2 === ids[i + 1], `${p2} vs ${ids[i + 1]}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      await toView(page, "list");
      L.done(7);
    });
  });
}
