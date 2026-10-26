/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150.1 — the QC1501 locks (design-refs/query-centre-v150-1/), on the rendered page at 1280 × 800 and
 * 1512 × 900. Each asserts its population first and was red first: against the v150 build (QC1501_BASE=1) and against
 * its named mutation (QC1501_MUTATE=L<n>, applied in the page).
 *
 *   L1 one width · L2 glance · L3 cards · L4 bar type · L5 bar order · L6 hover actions · L7 full screen
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openQc } from "./nb1Lib";

test.setTimeout(420_000);
const DIR = "reports/qc-v150-1";
const MUT = process.env.QC1501_MUTATE ?? "";
const BASE = process.env.QC1501_BASE === "1";
const ONLY = process.env.QC1501_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };

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

/** the named breaks, each expressed in the page */
const PAGE_MUT: Record<string, { css?: string; js?: string }> = {
  /* v150 C1's list width restored */
  L1: { css: `.qcv-group.qcv-group.qcv-group.qcv-group { --qc149-list: min(calc(var(--hsheet-w) - 40px), 1320px) !important; }` },
  /* the subheading restored */
  L2: { js: `(() => { const h = document.querySelector('[data-qc150="glance-title"]'); if (h) { const p = document.createElement('p'); p.setAttribute('data-mut','sub'); p.textContent = 'Where your queries stand today'; h.after(p); } })()` },
  /* Your move at 1.7fr */
  L3: { css: `.qc149-hd .qc150-glance .qc150-cards.qc150-cards { grid-template-columns: 1.7fr 1fr 1fr 1fr !important; }` },
  /* the serif back on Filters */
  L4: { css: `.qcv-group[data-v138] .qc138-sheet .qc140-tb .qc140-fil span.qc140-cl { font-family: Georgia, serif !important; } .qcv-group[data-v138] .qc138-sheet .qc140-tb .qc140-fil { font-family: Georgia, serif !important; }` },
  /* Birds-eye's pills inserted before Filters (re-applied after the switch) */
  L5: { js: `(() => { const g = document.querySelector('[data-qc150="be-pills"]'); const f = document.querySelector('[data-qc140="filters-chip"]'); if (g && f) f.before(g); })()` },
  /* the buttons always on */
  L6: { css: `.qc150-be .qc150-xa.qc150-xa { opacity: 1 !important; pointer-events: auto !important; }` },
  /* the switch left under the title in full screen */
  L7: { css: `.qc140-tb .qc150-vsw--c { display: none !important; } .qcv-group[data-full] .qc150-lt.qc150-lt { display: grid !important; }` },
};
async function mutate(page: Page) {
  const m = PAGE_MUT[MUT];
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) { await page.evaluate(m.js); await page.waitForTimeout(200); }
}
async function open(page: Page, vp: VP) { await openQc(page, vp); await mutate(page); }
const click = (page: Page, sel: string) => page.evaluate((s) => ([...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0))?.click(), sel);
async function toView(page: Page, v: "list" | "birds", compact = false) {
  await click(page, `[data-qc150="switch"]${compact ? "[data-compact]" : ":not([data-compact])"} [data-v="${v}"]`);
  await page.waitForTimeout(900);
}
async function scrollTitleTop(page: Page) {
  await page.evaluate(() => {
    const t = [...document.querySelectorAll<HTMLElement>("[data-qc150='title']")].find((e) => e.getBoundingClientRect().height > 0);
    const sc = t?.closest<HTMLElement>(".wpg-scroll");
    if (t && sc) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - 20;
  });
  await page.waitForTimeout(400);
}

for (const vp of SIZES) {
  test.describe(`QC1501 @ ${vp.width}`, () => {
    test("L1 · one width: the header card, At a glance, Your queries and the list share edges, each min(S − 48, 1200)", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      await open(page, vp);
      const b = await page.evaluate(() => {
        const box = (s: string) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); const r = e?.getBoundingClientRect(); return r ? { l: r.left, r: r.right, w: r.width } : null; };
        return { sheet: box(".ws-window"), card: box("[data-qc149='card']"), glance: box("[data-qc150='glance']"), title: box("[data-qc150='title']"), list: box(".qc138-sheet") };
      });
      const parts = { card: b.card, glance: b.glance, title: b.title, list: b.list };
      L.check("population", !!b.sheet && Object.values(parts).every(Boolean), JSON.stringify(b));
      if (b.sheet && Object.values(parts).every(Boolean)) {
        const W = Math.min(b.sheet.w - 48, 1200);
        for (const [k, x] of Object.entries(parts)) {
          L.check(`${k} width`, Math.abs(x!.w - W) <= 1, `${x!.w.toFixed(1)} vs ${W}`);
          L.check(`${k} edges`, Math.abs(x!.l - b.card!.l) <= 1 && Math.abs(x!.r - b.card!.r) <= 1, `${x!.l.toFixed(1)}–${x!.r.toFixed(1)} vs ${b.card!.l.toFixed(1)}–${b.card!.r.toFixed(1)}`);
        }
        L.check("centred", Math.abs((b.card!.l + b.card!.r) / 2 - (b.sheet.l + b.sheet.r) / 2) <= 1, "");
      }
      L.done(10);
    });

    test("L2 · glance: At a glance and Your queries are one heading size (28px) and family; no subheading", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => {
        const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
        const g = v("[data-qc150='glance-title']"), y = v("[data-qc150='title-text']"), sec = v("[data-qc150='glance']");
        const cs = (e?: HTMLElement) => (e ? { fs: getComputedStyle(e).fontSize, ff: getComputedStyle(e).fontFamily, t: e.textContent ?? "" } : null);
        const extra = sec ? [...sec.children].filter((c) => !c.matches("[data-qc150='glance-title'], [data-qc150='cards']")).map((c) => c.textContent ?? c.tagName) : ["no section"];
        return { g: cs(g), y: cs(y), extra };
      });
      L.check("population", !!r.g && !!r.y, JSON.stringify(r));
      L.check("At a glance text", r.g?.t === "At a glance", String(r.g?.t));
      L.check("Your queries text", r.y?.t === "Your queries", String(r.y?.t));
      L.check("28px both", r.g?.fs === "28px" && r.y?.fs === "28px", `${r.g?.fs} / ${r.y?.fs}`);
      L.check("one family", !!r.g && r.g.ff === r.y?.ff && /Special Elite/.test(r.g.ff), `${r.g?.ff} / ${r.y?.ff}`);
      L.check("no subheading", r.extra.length === 0, JSON.stringify(r.extra));
      L.done(6);
    });

    test("L3 · cards: four of equal width and height, no detail lines, Next or Show them; ≤110 tall at 1512", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      await open(page, vp);
      const c = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='card']")].filter((e) => e.getBoundingClientRect().height > 0)
        .map((e) => ({ k: e.dataset.k, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height, t: e.textContent ?? "",
          faces: e.querySelectorAll(".qc150-face").length, more: +(e.querySelector<HTMLElement>("[data-qc150='faces']")?.dataset.more ?? "0"), n: +(e.querySelector("[data-qc150='count']")?.textContent ?? "NaN") })));
      L.check("population", c.length === 4, String(c.length));
      const span = (a: number[]) => Math.max(...a) - Math.min(...a);
      L.check("equal widths", span(c.map((x) => x.w)) <= 1, c.map((x) => x.w.toFixed(1)).join());
      L.check("equal heights", span(c.map((x) => x.h)) <= 1, c.map((x) => x.h.toFixed(1)).join());
      const bad = c.filter((x) => /due this week|ready to nudge|pass(es)?\b|withdrawn|no response|Next:|Show them/.test(x.t));
      L.check("no detail, Next or Show them", bad.length === 0, bad.map((x) => `${x.k}: ${x.t.slice(0, 60)}`).join(" | "));
      L.check("faces account for every query", c.every((x) => x.faces + x.more === x.n && x.faces >= 1), c.map((x) => `${x.k} ${x.faces}+${x.more}/${x.n}`).join());
      if (vp.width === 1512) L.check("≤110 tall", c.every((x) => x.h <= 110), c.map((x) => x.h.toFixed(1)).join());
      L.done(vp.width === 1512 ? 6 : 5);
    });

    test("L4 · bar type: every word and placeholder in the navy bar is Special Elite, upright, in both views", async ({ page }) => {
      test.skip(!run("L4"));
      const L = new Ledger(`L4-${vp.width}`);
      await open(page, vp);
      await scrollTitleTop(page);
      const scan = () => page.evaluate(() => {
        const tb = [...document.querySelectorAll<HTMLElement>(".qc140-tb")].find((e) => e.getBoundingClientRect().height > 0);
        if (!tb) return null;
        const bad: string[] = []; let n = 0;
        const walk = document.createTreeWalker(tb, NodeFilter.SHOW_TEXT);
        for (let t = walk.nextNode(); t; t = walk.nextNode()) {
          const el = t.parentElement!; if (!(t.textContent ?? "").trim() || el.getBoundingClientRect().width === 0) continue;
          n++; const cs = getComputedStyle(el);
          if (!/Special Elite/.test(cs.fontFamily) || cs.fontStyle !== "normal") bad.push(`“${t.textContent!.trim()}” ${cs.fontFamily.split(",")[0]} ${cs.fontStyle}`);
        }
        for (const i of tb.querySelectorAll<HTMLInputElement>("input")) {
          n++; const a = getComputedStyle(i), p = getComputedStyle(i, "::placeholder");
          if (!/Special Elite/.test(a.fontFamily) || a.fontStyle !== "normal" || !/Special Elite/.test(p.fontFamily) || p.fontStyle !== "normal") bad.push(`input ${a.fontFamily.split(",")[0]} ${a.fontStyle} / placeholder ${p.fontFamily.split(",")[0]} ${p.fontStyle}`);
        }
        return { n, bad };
      });
      for (const v of ["list", "birds"] as const) {
        if (v === "birds") { await toView(page, "birds"); await mutate(page); }
        const s = await scan();
        /* at 1280 Filters and Full screen are icons only, so the bar holds three words: the input and the two pills */
        L.check(`${v} population`, !!s && s.n >= 3, JSON.stringify(s?.n));
        L.check(`${v} Special Elite, upright`, !!s && s.bad.length === 0, (s?.bad ?? []).slice(0, 4).join(" | "));
      }
      await toView(page, "list");
      L.done(4);
    });

    test("L5 · bar order: search first; Filters, group, sort and Full screen sit where List puts them, less the pills' width", async ({ page }) => {
      test.skip(!run("L5"));
      const L = new Ledger(`L5-${vp.width}`);
      await open(page, vp);
      await scrollTitleTop(page);
      const read = (v: string) => page.evaluate((view) => {
        const tb = [...document.querySelectorAll<HTMLElement>(".qc140-tb")].find((e) => e.getBoundingClientRect().height > 0)!;
        const b = (s: string) => { const e = tb.querySelector<HTMLElement>(s); const r = e?.getBoundingClientRect(); return r && r.width > 0 ? { l: r.left, r: r.right, w: r.width } : null; };
        const first = [...tb.children].find((c) => (c as HTMLElement).getBoundingClientRect().width > 0) as HTMLElement | undefined;
        return {
          first: first?.matches("[data-qc150='find']") ?? false,
          filters: b("[data-qc140='filters-chip']"),
          group: view === "list" ? b("[data-qc140='group-chip']") : b("[data-qc150='be-group-pill']"),
          sort: view === "list" ? b("[data-qc1421='sort-chip']") : b("[data-qc150='be-sort-pill']"),
          full: b("[data-qc149='full']"),
        };
      }, v);
      const A = await read("list");
      await toView(page, "birds");
      await mutate(page);
      const B = await read("birds");
      const ok = (x: typeof A) => !!(x.filters && x.group && x.sort && x.full);
      L.check("population", ok(A) && ok(B), JSON.stringify({ A, B }));
      if (ok(A) && ok(B)) {
        L.check("search first (list)", A.first, ""); L.check("search first (birds)", B.first, "");
        L.check("order (birds)", B.filters!.r <= B.group!.l && B.group!.r <= B.sort!.l && B.sort!.r <= B.full!.l, `${B.filters!.l.toFixed(0)} ${B.group!.l.toFixed(0)} ${B.sort!.l.toFixed(0)} ${B.full!.l.toFixed(0)}`);
        L.check("Full screen right edge", Math.abs(A.full!.r - B.full!.r) <= 1, `${A.full!.r.toFixed(1)} vs ${B.full!.r.toFixed(1)}`);
        L.check("Full screen left", Math.abs(A.full!.l - B.full!.l) <= 1, `${A.full!.l.toFixed(1)} vs ${B.full!.l.toFixed(1)}`);
        const dSort = A.sort!.w - B.sort!.w, dGroup = A.group!.w - B.group!.w;
        L.check("sort left", Math.abs((B.sort!.l - A.sort!.l) - dSort) <= 1, `moved ${(B.sort!.l - A.sort!.l).toFixed(1)}, widths differ ${dSort.toFixed(1)}`);
        L.check("group left", Math.abs((B.group!.l - A.group!.l) - (dSort + dGroup)) <= 1, `moved ${(B.group!.l - A.group!.l).toFixed(1)}, widths differ ${(dSort + dGroup).toFixed(1)}`);
        L.check("Filters left", Math.abs((B.filters!.l - A.filters!.l) - (dSort + dGroup)) <= 1, `moved ${(B.filters!.l - A.filters!.l).toFixed(1)}, widths differ ${(dSort + dGroup).toFixed(1)}`);
      }
      await toView(page, "list");
      L.done(9);
    });

    test("L6 · hover actions: hidden at rest, the timeline to 16px of the card's edge, shown on hover and covering what is under it", async ({ page }) => {
      test.skip(!run("L6"));
      const L = new Ledger(`L6-${vp.width}`);
      await open(page, vp);
      await toView(page, "birds");
      await mutate(page);
      await scrollTitleTop(page);
      await page.mouse.move(2, 2);
      await page.waitForTimeout(400);
      const rest = await page.evaluate(() => {
        const xa = [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row'] .qc150-xa")].filter((e) => e.querySelector("button"));
        const sheet = [...document.querySelectorAll<HTMLElement>(".qc138-sheet")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
        const ax = document.querySelector<HTMLElement>("[data-qc150='axis']")!.getBoundingClientRect();
        const tl = document.querySelector<HTMLElement>("[data-qc150='be-track']")!.getBoundingClientRect();
        return { n: xa.length, shown: xa.filter((e) => +getComputedStyle(e).opacity > 0).length, axGap: sheet.right - ax.right, tlGap: sheet.right - tl.right };
      });
      L.check("population", rest.n > 3, String(rest.n));
      L.check("hidden at rest", rest.shown === 0, `${rest.shown} of ${rest.n} shown`);
      L.check("axis to 16px of the edge", rest.axGap <= 17 && rest.axGap >= 0, rest.axGap.toFixed(1));
      L.check("rows to 16px of the edge", rest.tlGap <= 17 && rest.tlGap >= 0, rest.tlGap.toFixed(1));
      const id = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row']")].find((r) => r.getBoundingClientRect().top > 300 && r.querySelector(".qc150-xa button"))?.dataset.id ?? "");
      await page.hover(`[data-qc150='be-row'][data-id='${id}'] .qc150-ag`);
      await page.waitForTimeout(400);
      const hov = await page.evaluate((rid) => {
        const row = document.querySelector<HTMLElement>(`[data-qc150='be-row'][data-id='${rid}']`)!;
        const xa = row.querySelector<HTMLElement>(".qc150-xa")!, btn = xa.querySelector<HTMLElement>("button")!.getBoundingClientRect();
        const others = [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row'] .qc150-xa")].filter((e) => !row.contains(e) && +getComputedStyle(e).opacity > 0).length;
        const seen: string[] = [];
        for (const lb of row.querySelectorAll<HTMLElement>(".qc150-lb, [data-qc150='be-mark'], [data-qc150='be-rest']")) {
          if (getComputedStyle(lb).visibility === "hidden") continue;
          const b = lb.getBoundingClientRect();
          const l = Math.max(b.left, btn.left), r = Math.min(b.right, btn.right), t = Math.max(b.top, btn.top), bo = Math.min(b.bottom, btn.bottom);
          if (r - l <= 0.5 || bo - t <= 0.5) continue;
          const hit = document.elementFromPoint((l + r) / 2, (t + bo) / 2);
          if (!hit || !xa.contains(hit)) seen.push(lb.textContent ?? "");
        }
        return { op: +getComputedStyle(xa).opacity, bg: getComputedStyle(row).backgroundColor, others, seen };
      }, id);
      L.check("hover: shown", hov.op === 1, String(hov.op));
      L.check("hover: only that row's", hov.others === 0, String(hov.others));
      L.check("hover: row #faf6f0", hov.bg === "rgb(250, 246, 240)", hov.bg);
      L.check("hover: no visible label under the button", hov.seen.length === 0, hov.seen.join(" | "));
      await toView(page, "list");
      L.done(8);
    });

    test("L7 · full screen: the header, At a glance and Your queries hide; the switch is in the toolbar; Birds-eye there keeps full screen and its scale; exit restores", async ({ page }) => {
      test.skip(!run("L7"));
      const L = new Ledger(`L7-${vp.width}`);
      await open(page, vp);
      await click(page, "[data-qc149='full']");
      await page.waitForTimeout(1300);
      const vis = (s: string) => page.evaluate((x) => [...document.querySelectorAll<HTMLElement>(x)].some((e) => e.getBoundingClientRect().height > 0), s);
      L.check("full screen on", await vis(".qcv-group[data-full]"), "");
      L.check("header hidden", !(await vis("[data-qc149='card']")), "");
      L.check("At a glance hidden", !(await vis("[data-qc150='glance']")), "");
      L.check("Your queries hidden", !(await vis("[data-qc150='title']")), "");
      L.check("the switch in the toolbar", await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc140-tb [data-qc150='switch']")].some((e) => e.getBoundingClientRect().height > 0)), "");
      await toView(page, "birds", true);
      L.check("Birds-eye in full screen", (await vis(".qcv-group[data-full]")) && (await vis("[data-qc150='birds']")), "");
      const t = await page.evaluate(() => {
        const tag = document.querySelector<HTMLElement>("[data-qc150='today-tag']")?.getBoundingClientRect();
        const line = document.querySelector<HTMLElement>("[data-qc150='today-line']")?.getBoundingClientRect();
        return tag && line ? { tag: tag.left + tag.width / 2, line: line.left } : null;
      });
      L.check("today's line on the TODAY tag", !!t && Math.abs(t.tag - t.line) <= 1, JSON.stringify(t));
      await click(page, "[data-qc142='full-tb']");
      await page.waitForTimeout(1300);
      L.check("full screen off", !(await vis(".qcv-group[data-full]")), "");
      L.check("the switch under Your queries", await vis("[data-qc150='title'] [data-qc150='switch']"), "");
      L.check("still Birds-eye", await vis("[data-qc150='title'] [data-qc150='switch'] [data-v='birds'][aria-pressed='true']") && (await vis("[data-qc150='birds']")), "");
      await toView(page, "list");
      L.done(10);
    });
  });
}
