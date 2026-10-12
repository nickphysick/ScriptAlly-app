/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v137 (design-refs/query-centre/query-centre-v137.html) — the QC137 locks, on the rendered page at
 * 1512 × 900 and 1280 × 800 unless a lock says otherwise.
 *
 * A1 header · B1 strip · B2 filter · C1 removed · C2 width · C3 narrow · D1 pins · D2 releases · D3 no jitter ·
 * E1 lip · L1 no jump.
 *
 * Each was run with its named mutation (`QC137_MUTATE=<lock>`: one named thing broken IN THE PAGE) before its
 * green was believed: reports/qc-v137/mutation-proofs.json.
 *
 * E1 compares each route's first content with a capture of the build BEFORE the pack
 * (`QC137_CAPTURE=1` against a preview of the base, written to tests/e2e/fixtures/qc137Base.json).
 *
 * ⚠️ EVERY PROBE STARTS FROM THE VISIBLE GROUP. Every workspace page stays mounted, so `document` reaches the
 *    other pages' scrollers too.
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/qc-v137";
const FIX = "tests/e2e/fixtures/qc137Base.json";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.QC137_MUTATE ?? "";
const CAPTURE = process.env.QC137_CAPTURE === "1";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the stacked number back in the panel */
  A1: { js: `(() => { const b = document.querySelector('.qcoh--137 [data-hp3-part="text"]'); if (b && !b.querySelector('[data-hp3-part="number"]')) { const n = document.createElement("span"); n.setAttribute("data-hp3-part", "number"); n.textContent = "82"; b.prepend(n); } })()` },
  /* F1: cell 1 back to the three courts added up (which hold no withdrawn or signed query) */
  B1: { js: `(() => { const c = [...document.querySelectorAll('.qcv-group.qc13 [data-qcv="strip-cell"]')]; const f = (e) => e.querySelector('[data-qcv="strip-fig"]'); if (c.length === 4 && !f(c[0]).hasAttribute("data-mut")) { f(c[0]).setAttribute("data-mut", ""); f(c[0]).textContent = String(c.slice(1).reduce((n, e) => n + Number(f(e).textContent), 0)); } })()` },
  /* pressing a cell scrolls to the list, as the v136 link did */
  B2: { js: `(() => { if (window.__m137) return; window.__m137 = true; document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest('[data-qcv="strip-cell"]')) { const l = document.querySelector('.qcv-group.qc13 > .qcv-page'); l && l.scrollIntoView(); } }, true); })()` },
  /* the v134 gap back above the list */
  C1: { css: `.qcv-group.qc13 > .qcv-page.qcw { margin-top: 130px !important; }` },
  /* the list back on the content column */
  C2: { css: `.qcv-group.qc13 > .qcv-page.qcw { width: auto !important; margin-left: -20px !important; margin-right: -20px !important; justify-self: stretch !important; }` },
  /* fixed last columns, and "What you sent" kept */
  C3: { css: `.qc13 .qcw-list { --qcw-cols: minmax(0, 1fr) minmax(0, 1fr) 284px 284px !important; } .qc13 .qcw-list .qcw-snt { display: block !important; } .qc13 .qcw-list .lt-labels .lt-lab[data-lt-col="What you sent"] { display: inline !important; }` },
  /* F2: the stage cell squeezed, so its label has to wrap or run out */
  C4: { css: `.qc13 .qcw-list .qcw-st { width: 60px !important; } .qc13 .qcw-list .qcw-ws1 { flex-wrap: wrap !important; white-space: normal !important; }` },
  /* the header in the flow again */
  D1: { css: `.qc13 .qcw .qcw-bar { position: relative !important; top: 0 !important; }` },
  /* the header fixed to the window: it never releases */
  D2: { css: `.qc13 .qcw .qcw-bar { position: fixed !important; top: 76px !important; }` },
  /* the pinned header grows instead of shrinking, with scroll anchoring back on */
  D3: { css: `.wpg-scroll, .qcv-group.qc13 > .qcv-page.qcw { overflow-anchor: auto !important; } .qc13 .qcw[data-pinned="true"] .qc137-sentinel { height: 60px !important; }` },
  /* the lip in the flow: it takes 12px */
  E1: { css: `.sheet-lip { margin-bottom: 0 !important; }` },
  /* the loading cells let go of their foot */
  L1: { css: `.qcs-box[data-loading="true"] .qcs-foot { display: none !important; }` },
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** installed in the page: the visible Query Centre group and its scroller */
const LIB = `
window.__qc = () => {
  const g = [...document.querySelectorAll(".qcv-group.qc13")].find((e) => e.getBoundingClientRect().height > 0);
  if (!g) throw new Error("no visible Query Centre group");
  return { g, sc: g.closest(".wpg-scroll"), page: g.querySelector(":scope > .qcv-page") };
};
window.__box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
`;
async function mutate(page: Page, lock: string) {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
}
async function openQC(page: Page, vp: VP, lock: string) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, "/queries", vp);
  await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await page.evaluate(LIB);
  await mutate(page, lock);
  await page.waitForTimeout(150);
}
const setScroll = (page: Page, y: number) => page.evaluate(async (top) => {
  const { sc } = (window as unknown as { __qc: () => { sc: HTMLElement } }).__qc();
  sc.style.scrollBehavior = "auto";
  sc.scrollTop = top;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return sc.scrollTop;
}, y);

test.describe("Query Centre v137", () => {
  test.skip(CAPTURE, "capture mode writes the base fixture only");

  test("A1 · header: the Analytics panel with a title, no number", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await openQC(page, vp, "A1");
      const r = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const p = g.querySelector<HTMLElement>(".qcoh--137")!;
        const h1 = p.querySelector<HTMLElement>("h1[data-page-title]")!;
        const sub = p.querySelector<HTMLElement>('[data-hp3-part="sub"]');
        const art = p.querySelector<HTMLElement>('[data-qcv="oh-art"]');
        const cs = getComputedStyle(p);
        return {
          bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, name: h1.getAttribute("aria-label") ?? h1.querySelector("[aria-label]")?.getAttribute("aria-label") ?? h1.textContent,
          size: parseFloat(getComputedStyle(h1).fontSize), face: getComputedStyle(h1).fontFamily, lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)),
          numbers: p.querySelectorAll('[data-hp3-part="number"], [data-qcv="stamp"], [data-qcv="faces"]').length,
          sub: sub?.textContent ?? "", artH: art ? art.getBoundingClientRect().height : 0, wide: !!document.querySelector(".ws-app.sheet-wide"),
          log: !!p.querySelector('[data-qcv="oh-log"]'), rec: !!p.querySelector('[data-qcv="oh-record"]'),
        };
      });
      const w = `${vp.width}`;
      L.check("A1", `${w} panel`, r.bg === "rgb(45, 58, 80)" && r.radius === "14px", `${r.bg} · ${r.radius}`);
      L.check("A1", `${w} title`, r.name === "Every query, in one place", `"${r.name}"`);
      L.check("A1", `${w} title size`, near(r.size, r.wide ? 62 : 50, 0.5) && /Special Elite/.test(r.face), `${r.size} · wide ${r.wide}`);
      L.check("A1", `${w} two lines`, r.lines === 2, `${r.lines} lines`);
      L.check("A1", `${w} no number`, r.numbers === 0, `${r.numbers} number, stamp or faces elements`);
      L.check("A1", `${w} subline`, /^Send, track and chase your queries( for .+)?\.$/.test(r.sub.trim()), `"${r.sub}"`);
      L.check("A1", `${w} drawing`, near(r.artH, r.wide ? 236 : 196, 1), `${r.artH}`);
      L.check("A1", `${w} buttons`, r.log && r.rec, `log ${r.log} · record ${r.rec}`);
    }
    L.done(16);
  });

  test("B1 · strip: four cells, cell 1 is every query for the manuscript, twenty bars and the last is rust", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await openQC(page, vp, "B1");
      const r = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const box = g.querySelector<HTMLElement>('[data-qcv="strip"]')!;
        const cells = [...box.querySelectorAll<HTMLElement>('[data-qcv="strip-cell"]')];
        const bars = [...box.querySelectorAll<SVGRectElement>('[data-qcv="strip-bar"]')];
        const last = bars[bars.length - 1];
        const panel = g.querySelector<HTMLElement>(".qcoh--137")!.getBoundingClientRect();
        const head = g.querySelector<HTMLElement>(".qcs-head")!.getBoundingClientRect();
        return {
          figs: cells.map((c) => Number(c.querySelector('[data-qcv="strip-fig"]')?.textContent)), keys: cells.map((c) => c.dataset.k),
          widths: cells.map((c) => c.getBoundingClientRect().width), tops: cells.map((c) => c.getBoundingClientRect().top),
          showing: [Number(g.querySelector<HTMLElement>('[data-qcv="showing"]')?.dataset.x), Number(g.querySelector<HTMLElement>('[data-qcv="showing"]')?.dataset.y)],
          rows: g.querySelectorAll('.qcw-list [data-qcv="row"]').length, folded: g.querySelectorAll(".qcw-list .qcw-grp.shut").length,
          bars: bars.length, lastFill: last ? getComputedStyle(last).fill : "", otherFill: bars[0] ? getComputedStyle(bars[0]).fill : "", lastFlag: last?.getAttribute("data-last"),
          bg: getComputedStyle(box).backgroundColor, radius: getComputedStyle(box).borderTopLeftRadius,
          gap: head.top - panel.bottom, headToBox: box.getBoundingClientRect().top - head.bottom,
          faces: [...box.querySelectorAll<HTMLElement>('[data-qcv="strip-faces"]')].map((f) => { const fs = [...f.querySelectorAll<HTMLElement>('[data-qcv="strip-face"]')]; return fs.length ? new Set(fs.map((x) => Math.round(x.getBoundingClientRect().top))).size : 1; }),
          wide: !!document.querySelector(".ws-app.sheet-wide"),
        };
      });
      const w = `${vp.width}`;
      L.check("B1", `${w} four cells`, r.keys.join() === "all,you,agent,closed", r.keys.join());
      /* F1 (11 Oct): cell 1 is every query for the manuscript, withdrawn and signed included: the list's own
         unfiltered count, and the rows it draws. It need not be the three courts added up. */
      L.check("B1", `${w} cell 1 is the list's unfiltered count`, r.figs[0] > 0 && r.figs[0] === r.showing[1] && r.showing[0] === r.showing[1], `cell 1 ${r.figs[0]} · showing ${r.showing[0]} of ${r.showing[1]}`);
      L.check("B1", `${w} cell 1 is the rows drawn`, r.folded === 0 && r.rows === r.figs[0], `${r.rows} rows (${r.folded} groups folded) · cell 1 ${r.figs[0]} · the courts ${r.figs[1]} + ${r.figs[2]} + ${r.figs[3]}`);
      L.check("B1", `${w} equal cells, one row`, Math.max(...r.widths) - Math.min(...r.widths) <= 1.5 && new Set(r.tops.map(Math.round)).size === 1, r.widths.map((x) => x.toFixed(1)).join(" "));
      L.check("B1", `${w} twenty bars`, r.bars === 20, `${r.bars}`);
      L.check("B1", `${w} last bar rust`, r.lastFill === "rgb(162, 69, 42)" && r.lastFlag === "true" && r.otherFill === "rgb(45, 58, 80)", `${r.lastFill} · others ${r.otherFill}`);
      L.check("B1", `${w} one white box`, r.bg === "rgb(255, 255, 255)" && r.radius === "14px", `${r.bg} · ${r.radius}`);
      L.check("B1", `${w} under the panel`, near(r.gap, r.wide ? 40 : 34, 1.5) && near(r.headToBox, 14, 1.5), `${r.gap.toFixed(1)} · heading to strip ${r.headToBox.toFixed(1)}`);
      L.check("B1", `${w} faces on one row`, r.faces.every((n) => n === 1), r.faces.join());
    }
    L.done(18);
  });

  test("B2 · filter: a cell narrows the list, shows pressed, and does not scroll", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("B2");
    for (const vp of SIZES) {
      await openQC(page, vp, "B2");
      const read = () => page.evaluate(() => {
        const { g, sc } = (window as never as { __qc: () => { g: HTMLElement; sc: HTMLElement } }).__qc();
        const s = g.querySelector<HTMLElement>('[data-qcv="showing"]')!;
        const cells = [...g.querySelectorAll<HTMLElement>('[data-qcv="strip-cell"]')];
        return {
          y: sc.scrollTop, x: Number(s.dataset.x), of: Number(s.dataset.y),
          pressed: cells.filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.k).join(),
          fig: Object.fromEntries(cells.map((c) => [c.dataset.k, Number(c.querySelector('[data-qcv="strip-fig"]')?.textContent)])) as Record<string, number>,
          clear: !!g.querySelector('[data-qcv="ws-clear"]'),
          bar: cells.map((c) => getComputedStyle(c, "::before").backgroundColor),
        };
      });
      const w = `${vp.width}`;
      const before = await read();
      for (const k of ["you", "agent", "closed"] as const) {
        await page.locator(`.qcv-group.qc13 [data-qcv="strip-cell"][data-k="${k}"]`).click();
        await page.waitForTimeout(700);
        const r = await read();
        L.check("B2", `${w} ${k} pressed`, r.pressed === k, `pressed "${r.pressed}"`);
        L.check("B2", `${w} ${k} showing`, r.x === r.fig[k] && r.of === before.of, `showing ${r.x} of ${r.of}, the cell says ${r.fig[k]}`);
        L.check("B2", `${w} ${k} no scroll`, Math.abs(r.y - before.y) <= 1, `scrollTop ${before.y} → ${r.y}`);
      }
      /* the court and a chip combine */
      await page.locator('.qcv-group.qc13 [data-qcv="strip-cell"][data-k="agent"]').click();
      await page.waitForTimeout(500);
      const court = await read();
      await page.locator('.qcv-group.qc13 [data-qcv="ws-pill"][data-k="past"]').click();
      await page.waitForTimeout(700);
      const both = await read();
      L.check("B2", `${w} court and chip combine`, both.pressed === "agent" && both.x <= court.x && both.x > 0, `court ${court.x}, with Overdue ${both.x}`);
      L.check("B2", `${w} Clear all shows`, both.clear, `${both.clear}`);
      await page.locator('.qcv-group.qc13 [data-qcv="ws-clear"]').click();
      await page.waitForTimeout(700);
      const cleared = await read();
      L.check("B2", `${w} Clear all clears both`, cleared.pressed === "" && cleared.x === before.x, `pressed "${cleared.pressed}" · showing ${cleared.x} of ${cleared.of}`);
      /* pressing again clears; cell 1 clears */
      await page.locator('.qcv-group.qc13 [data-qcv="strip-cell"][data-k="you"]').click();
      await page.locator('.qcv-group.qc13 [data-qcv="strip-cell"][data-k="you"]').click();
      await page.waitForTimeout(500);
      const again = await read();
      L.check("B2", `${w} pressing again clears`, again.pressed === "" && again.x === before.x, `pressed "${again.pressed}"`);
      /* ⚠️ the harness scrolled to reach "Clear all" and the pill above, so the no-scroll claim is read against where
         the page stood before THIS press, never against the top */
      const y0 = (await read()).y;
      await page.locator('.qcv-group.qc13 [data-qcv="strip-cell"][data-k="closed"]').click();
      await page.waitForTimeout(300);
      L.check("B2", `${w} no scroll from further down`, Math.abs((await read()).y - y0) <= 1, `scrollTop ${y0} → ${(await read()).y}`);
      await page.locator('.qcv-group.qc13 [data-qcv="strip-cell"][data-k="all"]').click();
      await page.waitForTimeout(500);
      const all = await read();
      L.check("B2", `${w} cell 1 clears`, all.pressed === "" && all.x === before.x, `pressed "${all.pressed}" · showing ${all.x}`);
    }
    L.done(30);
  });

  test("C1 · removed: no Recently updated, banner, full-list link or hawk; the list is 40 under the strip", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C1");
    for (const vp of SIZES) {
      await openQC(page, vp, "C1");
      const r = await page.evaluate(() => {
        const { g, page: list } = (window as never as { __qc: () => { g: HTMLElement; page: HTMLElement } }).__qc();
        const n = (sel: string) => g.querySelectorAll(sel).length;
        const strip = g.querySelector<HTMLElement>('[data-qcv="strip"]')!.getBoundingClientRect();
        const pad = getComputedStyle(g.querySelector<HTMLElement>(".qcw-r1")!);
        return { recent: n(".qcr, [data-qcv='recent']"), banner: n('[data-qcv="banner"]'), link: n('[data-qcv="full-list"]'), hawk: n('[data-qcv="ws-hawk"]'),
          text: /One list to log them all|View the full list/.test(g.textContent ?? ""), gap: list.getBoundingClientRect().top - strip.bottom,
          pad: `${pad.paddingTop} ${pad.paddingRight} ${pad.paddingBottom} ${pad.paddingLeft}` };
      });
      const w = `${vp.width}`;
      L.check("C1", `${w} no Recently updated`, r.recent === 0, `${r.recent}`);
      L.check("C1", `${w} no banner`, r.banner === 0, `${r.banner}`);
      L.check("C1", `${w} no full-list link`, r.link === 0 && !r.text, `${r.link} · text ${r.text}`);
      L.check("C1", `${w} no hawk`, r.hawk === 0, `${r.hawk}`);
      L.check("C1", `${w} list 40 under the strip`, near(r.gap, 40, 2), `${r.gap.toFixed(1)}`);
      L.check("C1", `${w} title row padding`, r.pad === "22px 28px 18px 28px", r.pad);
    }
    L.done(12);
  });

  test("C2 · width: 24 from the sheet's edges; 1600 and centred on a wide window", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C2");
    for (const vp of [...SIZES, { width: 1920, height: 1080 }]) {
      await openQC(page, vp, "C2");
      const r = await page.evaluate(() => {
        const { g, page: list, sc } = (window as never as { __qc: () => { g: HTMLElement; page: HTMLElement; sc: HTMLElement } }).__qc();
        const l = list.getBoundingClientRect(), s = sc.getBoundingClientRect();
        const strip = g.querySelector<HTMLElement>('[data-qcv="strip"]')!.getBoundingClientRect(), panel = g.querySelector<HTMLElement>(".qcoh--137")!.getBoundingClientRect();
        return { left: l.left - s.left, right: s.right - l.right, w: l.width, sheet: s.width, onColumn: Math.abs(strip.left - panel.left) <= 1 && Math.abs(strip.right - panel.right) <= 1, wider: l.width > panel.width + 20, over: sc.scrollWidth - sc.clientWidth };
      });
      const w = `${vp.width}`;
      if (vp.width === 1920) {
        L.check("C2", `${w} capped at 1600`, near(r.w, 1600, 2), `${r.w.toFixed(1)}`);
        L.check("C2", `${w} centred`, Math.abs(r.left - r.right) <= 1, `${r.left.toFixed(1)} · ${r.right.toFixed(1)}`);
      } else {
        L.check("C2", `${w} 24 from the sheet's edges`, near(r.left, 24, 1) && near(r.right, 24, 1), `${r.left.toFixed(1)} · ${r.right.toFixed(1)}`);
        L.check("C2", `${w} the sheet less 48`, near(r.w, r.sheet - 48, 2), `${r.w.toFixed(1)} of a ${r.sheet.toFixed(1)} sheet`);
      }
      L.check("C2", `${w} panel and strip on the column`, r.onColumn && r.wider, `on column ${r.onColumn} · list wider ${r.wider}`);
      L.check("C2", `${w} no sideways scroll`, r.over <= 0, `${r.over}`);
    }
    L.done(12);
  });

  test("C3 · narrow: at 1024 and 1180 nothing overflows, and What you sent is hidden", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C3");
    for (const vp of [{ width: 1024, height: 768 }, { width: 1180, height: 800 }]) {
      await openQC(page, vp, "C3");
      const r = await page.evaluate(() => {
        const { g, page: list, sc } = (window as never as { __qc: () => { g: HTMLElement; page: HTMLElement; sc: HTMLElement } }).__qc();
        const l = list.getBoundingClientRect();
        const lab = g.querySelector<HTMLElement>('.lt-labels [data-lt-col="What you sent"]');
        const rows = [...g.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="row"]')].slice(0, 12);
        let out = 0, sentShown = 0;
        for (const row of rows) {
          for (const c of [...row.children] as HTMLElement[]) { const b = c.getBoundingClientRect(); if (b.width && (b.right > l.right + 0.5 || b.left < l.left - 0.5)) out++; }
          const s = row.querySelector<HTMLElement>('[data-qcv="row-sent"]'); if (s && s.getBoundingClientRect().width > 0) sentShown++;
        }
        const names = rows.map((row) => row.querySelector<HTMLElement>(".qcw-agt b")?.getBoundingClientRect().width ?? 0);
        return { over: sc.scrollWidth - sc.clientWidth, doc: document.documentElement.scrollWidth - window.innerWidth, out, sentShown, label: !!lab && lab.getBoundingClientRect().width > 0, rows: rows.length, listW: l.width, minName: Math.min(...names),
          find: g.querySelector<HTMLElement>('[data-qcv="find"]')!.getBoundingClientRect().width, cells: [...g.querySelectorAll<HTMLElement>('[data-qcv="strip-cell"]')].map((c) => Math.round(c.getBoundingClientRect().top)) };
      });
      const w = `${vp.width}`;
      L.check("C3", `${w} no sideways scroll`, r.over <= 0 && r.doc <= 0, `scroller ${r.over} · document ${r.doc}`);
      L.check("C3", `${w} rows inside the list`, r.rows >= 6 && r.out === 0, `${r.out} cells outside, over ${r.rows} rows of a ${r.listW.toFixed(0)}px list`);
      L.check("C3", `${w} What you sent hidden`, !r.label && r.sentShown === 0, `heading ${r.label} · ${r.sentShown} cells shown`);
      L.check("C3", `${w} names have room`, r.minName >= 60, `narrowest name ${r.minName.toFixed(0)}`);
      L.check("C3", `${w} Find is usable`, r.find >= 200, `${r.find.toFixed(0)}`);
      L.check("C3", `${w} strip`, new Set(r.cells).size === (vp.width < 1100 ? 2 : 1), `rows at ${[...new Set(r.cells)].join()}`);
    }
    L.done(12);
  });

  test("C4 · one line: at 1280 every stage label is on one line, and a row is as tall as it was", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C4");
    const vp = { width: 1280, height: 800 };
    await openQC(page, vp, "C4");
    const r = await page.evaluate(() => {
      const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
      const rows = [...g.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="row"]')];
      const out = rows.map((row) => {
        const st = row.querySelector<HTMLElement>(".qcw-ws1")!;
        const kids = ([...st.children] as HTMLElement[]).filter((k) => k.getBoundingClientRect().width > 0);
        /* ⚠️ "ON ONE LINE" IS THE CENTRES AGREEING WITHIN A FEW PIXELS, NEVER TWO ROUNDED NUMBERS BEING EQUAL
           (re-pointed 12 Oct). This rounded each child's centre and counted the distinct values. The dot, the word
           and the stamp are three heights centred on one line, so their centres differ by a fraction; whenever a
           row's top fell near a half pixel the fractions rounded apart and a label on ONE line read as two. It
           came and went with how many rows sat above it on the shared account, and no build ever wrapped it: the
           label is `flex-wrap: nowrap` at this width. A second line would put a centre a whole line (20px) away. */
        const mids = kids.map((k) => k.getBoundingClientRect().top + k.getBoundingClientRect().height / 2);
        const spread = mids.length ? Math.max(...mids) - Math.min(...mids) : 0;
        const lh = parseFloat(getComputedStyle(st).lineHeight);
        return { status: row.dataset.status ?? "", lines: Math.max(spread > 6 ? 2 : 1, Math.round(st.getBoundingClientRect().height / Math.max(lh, 20))), h: row.getBoundingClientRect().height,
          over: st.scrollWidth - st.clientWidth, intoNext: Math.max(...kids.map((k) => k.getBoundingClientRect().right)) - (row.querySelector<HTMLElement>(".qcw-snt")?.getBoundingClientRect().left ?? Infinity) };
      });
      return { rows: out, statuses: [...new Set(out.map((o) => o.status))] };
    });
    const bad = r.rows.filter((x) => x.lines !== 1);
    L.check("C4", "population", r.rows.length > 20 && r.statuses.includes("Revise & Resubmit"), `${r.rows.length} rows · ${r.statuses.length} statuses, Revise & Resubmit ${r.statuses.includes("Revise & Resubmit") ? "among them" : "MISSING"}`);
    L.check("C4", "every stage label is one line", bad.length === 0, bad.length ? bad.slice(0, 4).map((x) => `${x.status} ${x.lines} lines`).join(" · ") : `${r.rows.length} labels, one line each`);
    L.check("C4", "no label reaches the next column", r.rows.every((x) => x.intoNext <= -4), `nearest ${Math.max(...r.rows.map((x) => x.intoNext)).toFixed(1)}px (negative is clear)`);
    /* ⚠️ THE ROW'S HEIGHT IS THE APP'S OWN, 73, measured on the build before the pack (383c88d4: 73 rows, all 73
       tall). The reference draws its rows 78 to 82 apart at 1280, with some dated lines on two lines; the brief
       leaves the rows alone, so "unchanged" is the claim that can be held. */
    const hs = [...new Set(r.rows.map((x) => Math.round(x.h)))];
    L.check("C4", "a row is as tall as before the pack, 73 (±1)", r.rows.every((x) => Math.abs(x.h - 73) <= 1), `heights ${hs.join(", ")}`);
    L.done(4);
  });

  test("D1 · pins: scrolled 1400, the header is 12 under the sheet's top with the chips and headings under it", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("D1");
    for (const vp of SIZES) {
      await openQC(page, vp, "D1");
      await setScroll(page, 1400);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const { g, page: list, sc } = (window as never as { __qc: () => { g: HTMLElement; page: HTMLElement; sc: HTMLElement } }).__qc();
        const top = sc.getBoundingClientRect().top;
        const b = (s: string) => g.querySelector<HTMLElement>(s)!.getBoundingClientRect();
        const bar = b('[data-qcv="ws-bar"]'), strip = b('[data-qcv="ws-strip"]'), labs = b(".qcw-list .lt-labels");
        const sum = g.querySelector<HTMLElement>('[data-qcv="ws-summary"]')!;
        const r1 = getComputedStyle(g.querySelector<HTMLElement>(".qcw-r1")!);
        return { pinned: list.getAttribute("data-pinned"), bar: bar.top - top, strip: strip.top - bar.bottom, labs: labs.top - strip.bottom,
          title: parseFloat(getComputedStyle(g.querySelector<HTMLElement>('[data-qcv="ws-title"]')!).fontSize), pad: `${r1.paddingTop} ${r1.paddingBottom}`, radius: r1.borderTopLeftRadius,
          shadow: getComputedStyle(g.querySelector<HTMLElement>(".qcw-list .lt-labels")!).boxShadow !== "none", sumH: sum.getBoundingClientRect().height, sumW: sum.getBoundingClientRect().width,
          rowUnder: (() => { const rows = [...g.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="row"]')]; return rows.some((x) => { const q = x.getBoundingClientRect(); return q.top < labs.bottom && q.bottom > bar.top; }); })() };
      });
      const w = `${vp.width}`;
      L.check("D1", `${w} pinned`, r.pinned === "true", `data-pinned ${r.pinned}`);
      L.check("D1", `${w} header 12 under the top`, near(r.bar, 12, 1), `${r.bar.toFixed(1)}`);
      L.check("D1", `${w} chips under the header`, near(r.strip, 0, 1), `${r.strip.toFixed(1)}`);
      L.check("D1", `${w} headings under the chips`, near(r.labs, 0, 1) && r.shadow, `${r.labs.toFixed(1)} · shadow ${r.shadow}`);
      L.check("D1", `${w} pinned title`, near(r.title, 24, 0.5) && r.pad === "12px 10px" && r.radius === "16px", `${r.title} · ${r.pad} · ${r.radius}`);
      L.check("D1", `${w} Summary shows`, near(r.sumH, 34, 1) && r.sumW > 60, `${r.sumW.toFixed(0)} × ${r.sumH.toFixed(0)}`);
      L.check("D1", `${w} rows pass beneath`, r.rowUnder, `${r.rowUnder}`);
    }
    /* at rest: not pinned, no Summary */
    await openQC(page, SIZES[0], "D1");
    const rest = await page.evaluate(() => { const { g, page: list } = (window as never as { __qc: () => { g: HTMLElement; page: HTMLElement } }).__qc(); return { pinned: list.getAttribute("data-pinned"), sum: g.querySelector<HTMLElement>('[data-qcv="ws-summary"]')!.getBoundingClientRect().width }; });
    L.check("D1", "at rest", rest.pinned === null && rest.sum === 0, `data-pinned ${rest.pinned} · Summary ${rest.sum}`);
    L.done(15);
  });

  test("D2 · releases: at the list's end the header leaves with it; Summary returns to the top", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("D2");
    for (const vp of SIZES) {
      await openQC(page, vp, "D2");
      /* room to scroll the list's end to the top: a spacer after it, the harness's own */
      const target = await page.evaluate(() => {
        const { g, page: list, sc } = (window as never as { __qc: () => { g: HTMLElement; page: HTMLElement; sc: HTMLElement } }).__qc();
        const sp = document.createElement("div"); sp.style.cssText = "grid-column:1/-1;grid-row:9;height:1400px"; g.appendChild(sp);
        return list.getBoundingClientRect().bottom - sc.getBoundingClientRect().top + sc.scrollTop;
      });
      await setScroll(page, target - 80);
      await page.waitForTimeout(200);
      const near80 = await page.evaluate(() => { const { g, page: list, sc } = (window as never as { __qc: () => { g: HTMLElement; page: HTMLElement; sc: HTMLElement } }).__qc(); const top = sc.getBoundingClientRect().top; const bar = g.querySelector<HTMLElement>('[data-qcv="ws-bar"]')!.getBoundingClientRect(); return { barTop: bar.top - top, barBottom: bar.bottom - top, listBottom: list.getBoundingClientRect().bottom - top }; });
      const w = `${vp.width}`;
      L.check("D2", `${w} carried up by the list's end`, near80.barBottom <= near80.listBottom + 1 && near80.barTop < 11, `header ${near80.barTop.toFixed(1)}–${near80.barBottom.toFixed(1)}, list ends at ${near80.listBottom.toFixed(1)}`);
      await setScroll(page, target + 40);
      await page.waitForTimeout(200);
      const gone = await page.evaluate(() => { const { g, page: list, sc } = (window as never as { __qc: () => { g: HTMLElement; page: HTMLElement; sc: HTMLElement } }).__qc(); const top = sc.getBoundingClientRect().top; return { pinned: list.getAttribute("data-pinned"), barBottom: g.querySelector<HTMLElement>('[data-qcv="ws-bar"]')!.getBoundingClientRect().bottom - top }; });
      L.check("D2", `${w} gone with the list`, gone.barBottom <= 0 && gone.pinned === null, `header's bottom ${gone.barBottom.toFixed(1)} · data-pinned ${gone.pinned}`);
      /* Summary */
      await setScroll(page, 1400);
      await page.waitForTimeout(200);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.locator('.qcv-group.qc13 [data-qcv="ws-summary"]').click();
      await page.waitForTimeout(400);
      const top = await page.evaluate(() => { const { sc } = (window as never as { __qc: () => { sc: HTMLElement } }).__qc(); return { y: sc.scrollTop, focus: document.activeElement?.matches("h1[data-page-title]") ?? false }; });
      L.check("D2", `${w} Summary returns to the top`, top.y <= 1 && top.focus, `scrollTop ${top.y} · focus on the heading ${top.focus}`);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    L.done(6);
  });

  test("D3 · no jitter: 1px steps across the pin line change the state exactly twice, and scrollTop is what was set", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("D3");
    for (const vp of SIZES) {
      await openQC(page, vp, "D3");
      const r = await page.evaluate(async () => {
        const { page: list, sc } = (window as never as { __qc: () => { page: HTMLElement; sc: HTMLElement } }).__qc();
        sc.style.scrollBehavior = "auto";
        const sent = list.querySelector<HTMLElement>('[data-qcv="pin-sentinel"]')!;
        const T = Math.round(sent.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12);
        const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        sc.scrollTop = T - 60; await frame();
        let was = list.hasAttribute("data-pinned"), flips = 0, drift = 0, steps = 0;
        const start = was;
        const go = async (y: number) => { sc.scrollTop = y; await frame(); steps++; drift = Math.max(drift, Math.abs(sc.scrollTop - y)); const now = list.hasAttribute("data-pinned"); if (now !== was) { flips++; was = now; } };
        for (let y = T - 30; y <= T + 30; y++) await go(y);
        const mid = was;
        for (let y = T + 30; y >= T - 30; y--) await go(y);
        return { T, flips, drift, steps, start, mid, end: was };
      });
      const w = `${vp.width}`;
      L.check("D3", `${w} starts unpinned, pins past the line`, r.start === false && r.mid === true, `start ${r.start} · past ${r.mid}`);
      L.check("D3", `${w} exactly two changes`, r.flips === 2 && r.end === false, `${r.flips} changes over ${r.steps} steps around ${r.T}`);
      L.check("D3", `${w} scrollTop is what was set`, r.drift <= 1, `worst drift ${r.drift.toFixed(1)}`);
    }
    L.done(6);
  });

  test("L1 · no jump: the panel and the strip are the same boxes loading and loaded", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("L1");
    for (const vp of SIZES) {
      await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 6000; try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
      await openRoute(page, "/queries", vp);
      await page.evaluate(LIB);
      await mutate(page, "L1");
      const boxes = () => page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const b = (window as never as { __box: (e: Element | null) => { x: number; y: number; w: number; h: number } | null }).__box;
        const strip = g.querySelector<HTMLElement>('[data-qcv="strip"]');
        return { loading: strip?.getAttribute("data-loading"), panel: b(g.querySelector(".qcoh--137")), head: b(g.querySelector(".qcs-head")), strip: b(strip), cells: [...g.querySelectorAll('[data-qcv="strip-cell"]')].map((c) => b(c)) };
      });
      await expect(page.locator('.qcv-group.qc13 [data-qcv="strip"][data-loading="true"]')).toBeVisible({ timeout: 15_000 });
      const a = await boxes();
      await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(900);
      const z = await boxes();
      const w = `${vp.width}`;
      L.check("L1", `${w} measured loading, then loaded`, a.loading === "true" && z.loading === "false", `${a.loading} → ${z.loading}`);
      const same = (p: { x: number; y: number; w: number; h: number } | null, q: typeof p) => !!p && !!q && (["x", "y", "w", "h"] as const).every((k) => Math.abs(p[k] - q[k]) <= 1);
      const say = (p: { x: number; y: number; w: number; h: number } | null) => (p ? `${p.w.toFixed(0)}×${p.h.toFixed(1)} at ${p.x.toFixed(0)},${p.y.toFixed(1)}` : "none");
      L.check("L1", `${w} panel`, same(a.panel, z.panel), `${say(a.panel)} → ${say(z.panel)}`);
      L.check("L1", `${w} strip heading`, same(a.head, z.head), `${say(a.head)} → ${say(z.head)}`);
      L.check("L1", `${w} strip`, same(a.strip, z.strip), `${say(a.strip)} → ${say(z.strip)}`);
      L.check("L1", `${w} cells`, a.cells.length === 4 && a.cells.every((c, i) => same(c, z.cells[i])), a.cells.map(say).join(" | "));
    }
    L.done(10);
  });
});

/* ── E1 · the lip, on three routes ── */
const LIP_ROUTES = ["/queries", "/agents", "/dashboard"] as const;
type Base = Record<string, { first: number; h1: number | null }>;
const readSheet = (page: Page) => page.evaluate(() => {
  const win = document.querySelector<HTMLElement>(".ws-window")!;
  const top = win.getBoundingClientRect().top;
  const scs = [...win.querySelectorAll<HTMLElement>(".wpg-scroll, .ws-wbody")].filter((e) => e.getBoundingClientRect().height > 0);
  /* the page-sheet scroller: the innermost one on screen */
  const sc = scs.find((e) => e.classList.contains("wpg-scroll")) ?? scs[0];
  const lip = [...sc.children].find((c) => c.matches(".sheet-lip")) as HTMLElement | undefined;
  const kids = ([...sc.children] as HTMLElement[]).filter((c) => !c.matches(".sheet-lip, .wpg-bar") && c.getBoundingClientRect().height > 0);
  const h1 = [...sc.querySelectorAll<HTMLElement>("h1")].find((h) => h.getBoundingClientRect().height > 0);
  const tab = document.querySelector<HTMLElement>('[data-shell="tab"]');
  const lcs = lip ? getComputedStyle(lip) : null;
  return {
    scroller: sc.className.toString().split(" ")[0], canScroll: sc.scrollHeight - sc.clientHeight,
    first: kids[0] ? kids[0].getBoundingClientRect().top - top : NaN, h1: h1 ? h1.getBoundingClientRect().top - top : null,
    lip: lip ? { firstChild: sc.firstElementChild === lip, pos: lcs!.position, top: lip.getBoundingClientRect().top - top, h: lip.getBoundingClientRect().height, w: lip.getBoundingClientRect().width, scW: sc.clientWidth, bg: lcs!.backgroundColor, pe: lcs!.pointerEvents, hidden: lip.getAttribute("aria-hidden"), shadow: lcs!.boxShadow, z: Number(lcs!.zIndex) } : null,
    tabBg: tab ? getComputedStyle(tab).backgroundColor : "",
  };
});

test("E1 · lip: a 12px sticky lip in the folder tab's colour on every page, and nothing moved", async ({ page }) => {
  test.setTimeout(400_000);
  if (CAPTURE) {
    const base: Base = {};
    for (const vp of SIZES) for (const route of LIP_ROUTES) {
      await openRoute(page, route, vp); await page.waitForTimeout(1500);
      const r = await readSheet(page);
      base[`${route}@${vp.width}`] = { first: r.first, h1: r.h1 };
    }
    mkdirSync("tests/e2e/fixtures", { recursive: true });
    writeFileSync(FIX, JSON.stringify(base, null, 1));
    console.log(`[E1] captured ${Object.keys(base).length} readings to ${FIX}`);
    return;
  }
  expect(existsSync(FIX), `${FIX} is missing: capture it against the base build`).toBe(true);
  const base = JSON.parse(readFileSync(FIX, "utf8")) as Base;
  const L = new Ledger("E1");
  for (const vp of SIZES) for (const route of LIP_ROUTES) {
    await openRoute(page, route, vp); await page.waitForTimeout(1500);
    await mutate(page, "E1");
    await page.waitForTimeout(150);
    const r = await readSheet(page);
    const w = `${route} ${vp.width}`, b = base[`${route}@${vp.width}`];
    L.check("E1", `${w} lip`, !!r.lip && r.lip.firstChild && r.lip.pos === "sticky" && near(r.lip.h, 12, 0.5) && near(r.lip.top, 0, 0.5) && near(r.lip.w, r.lip.scW, 1), r.lip ? `${r.lip.pos} · ${r.lip.w.toFixed(0)} × ${r.lip.h} at ${r.lip.top} in .${r.scroller}` : "no lip");
    L.check("E1", `${w} the tab's colour`, !!r.lip && r.lip.bg === r.tabBg && r.tabBg !== "" && r.tabBg !== "rgba(0, 0, 0, 0)", `${r.lip?.bg} vs tab ${r.tabBg}`);
    L.check("E1", `${w} inert`, !!r.lip && r.lip.pe === "none" && r.lip.hidden === "true" && r.lip.shadow === "none" && r.lip.z < 60, `${r.lip?.pe} · aria-hidden ${r.lip?.hidden} · ${r.lip?.shadow} · z ${r.lip?.z}`);
    /* the first child's top and the page's h1 are both held; on /queries the h1 is Part A's new title, so only the first child is */
    L.check("E1", `${w} nothing moved`, !!b && near(r.first, b.first, 1) && (route === "/queries" || b.h1 === null || near(r.h1, b.h1, 1)), `first content ${r.first.toFixed(1)} (was ${b?.first.toFixed(1)}) · h1 ${r.h1?.toFixed(1)} (was ${b?.h1?.toFixed(1)})`);
    if (r.canScroll > 40) {
      const s = await page.evaluate(async () => {
        const win = document.querySelector<HTMLElement>(".ws-window")!;
        const scs = [...win.querySelectorAll<HTMLElement>(".wpg-scroll, .ws-wbody")].filter((e) => e.getBoundingClientRect().height > 0);
        const sc = scs.find((e) => e.classList.contains("wpg-scroll")) ?? scs[0];
        sc.style.scrollBehavior = "auto"; sc.scrollTop = 300;
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const lip = sc.querySelector<HTMLElement>(":scope > .sheet-lip");
        return lip ? { top: lip.getBoundingClientRect().top - win.getBoundingClientRect().top, shadow: getComputedStyle(lip).boxShadow, y: sc.scrollTop } : null;
      });
      L.check("E1", `${w} scrolled`, !!s && near(s.top, 0, 0.5) && s.shadow !== "none" && s.y > 2, s ? `at ${s.top} · ${s.shadow.slice(0, 40)}` : "no lip");
    } else L.check("E1", `${w} scrolled`, true, `this page does not scroll at ${vp.height} tall (${r.canScroll}px): not exercised`);
  }
  L.done(30);
});
