/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Page width v1 (6 Nov) — PW1 W1–W4, W6 on the rendered page. W5 is a source lock (src/test/pageWidth.test.ts).
 * Ref: design-refs/page-width-v1/ (option D at the cap Nick ruled: 1256, not the ref's 1320). Report: reports/page-width-v1/.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/pageWidth.measure.ts --project=measure --workers=1`.
 * PW1_MUTATE=<name>[,<name>] applies a named break in the page so each lock can be watched going red:
 *   indent (W1) · banner (W2) · cap1100 (W3) · gutter24 (W4) · row1500 (W6).
 * PW1_SHOTS=<dir> writes the Query Centre and Contact list at all six sizes there.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

const MUTATE = process.env.PW1_MUTATE ?? "";
const broken = (n: string) => MUTATE === "all" || MUTATE.split(",").includes(n);
const SHOTS = process.env.PW1_SHOTS ?? "";

/** The cap and gutter the shared rule states (workspacePageGrid.css `--page-cap`, `--page-gutter`). */
const CAP = 1256;
const GUTTER = 40;

/**
 * The pages on the shared column, each with the element whose CONTENT box is that column (`col`), and the blocks that
 * must share its two edges (`blocks`: the page header, a banner where there is one, the list). Selectors are scoped to
 * the visible page because every workspace page stays mounted. `col` names an element INSIDE the page; the column is
 * the content box of the scroller's child that holds it.
 */
const PAGES: { route: string; col: string; blocks: string[] }[] = [
  { route: "/queries", col: ".qc151", blocks: [".qc151"] },
  { route: "/queries/responses", col: ".rsp5", blocks: [".rsp5"] },
  { route: "/queries/analytics", col: ".a17-flow", blocks: [".a17-flow"] },
  { route: "/agents", col: ".clv-group", blocks: [".cl24-hd", ".clv-main"] },
  { route: "/agents/discover", col: ".dv1-ae", blocks: [".dv1-ae"] },
  { route: "/manuscripts/versions", col: ".vv2 .mc", blocks: [".vv2 .mc"] },
  { route: "/materials/letters", col: ".qlp > .qlp-head", blocks: [".qlp > .qlp-head"] },
  { route: "/manuscripts/comps", col: ".cv-group", blocks: [".cv-group"] },
  { route: "/todo", col: ".tws", blocks: [".tws-hd", ".tws-ws"] },
  { route: "/todo/corkboard", col: ".cb2-hd", blocks: [".cb2-hd", ".cb2-wallwrap"] },
];
/** Pages with their own width (§0.3's flagged list): W1 and W6 only. */
const OWN_WIDTH = ["/dashboard", "/manuscripts", "/queries/packages", "/account", "/help"];

const SIZES = [
  { width: 1280, height: 800, open: true }, { width: 1280, height: 800, open: false },
  { width: 1512, height: 900, open: true }, { width: 1512, height: 900, open: false },
  { width: 1920, height: 1080, open: true }, { width: 1920, height: 1080, open: false },
];
const label = (s: (typeof SIZES)[number]) => `${s.width}×${s.height} ${s.open ? "open" : "collapsed"}`;

async function mutate(page: Page) {
  const css: string[] = [];
  if (broken("indent")) css.push(".ws-pagebar .ws-ftab { left: 40px !important; }");
  if (broken("banner")) css.push(".qc151, .cl24-hd, .rsp5, .a17-flow, .dv1-ae, .vv2 .mh, .qlp > .qlp-head, .cv-group, .tws, .cb2-hd { margin-inline: -20px !important; width: auto !important; }");
  if (broken("cap1100")) css.push(":root { --page-cap: 1100px !important; }");
  if (broken("gutter24")) css.push(":root { --page-gutter: 24px !important; }");
  if (broken("row1500")) css.push(".qc151 > *, .clv-main, .rsp5 > *, .cb2-wallwrap, .tws { min-width: 1500px !important; }");
  if (!css.length) return;
  await page.addInitScript((c) => {
    const add = () => { const st = document.createElement("style"); st.textContent = c; document.head.appendChild(st); };
    if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
  }, css.join("\n"));
}

interface Reading {
  sheet: { l: number; r: number; w: number } | null; tabL: number | null;
  col: { l: number; r: number; w: number } | null;
  blocks: { sel: string; l: number; r: number }[];
  hscroll: { doc: boolean; scroller: number }; wrapped: string[];
}
async function read(page: Page, colSel: string, blockSels: string[]): Promise<Reading> {
  return page.evaluate(({ colSel, blockSels }) => {
    const vis = (e: Element | null | undefined): e is HTMLElement => {
      if (!e) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0;
    };
    const first = (sel: string) => [...document.querySelectorAll(sel)].find(vis) as HTMLElement | undefined;
    const sh = first(".ws-window")?.getBoundingClientRect();
    const tab = first(".ws-ftab")?.getBoundingClientRect();
    const c = colSel ? first(colSel) : undefined;
    let col = null as null | { l: number; r: number; w: number };
    if (c) {
      /* the column is the content box of the scroller's child that holds the page; a page outside the workspace grid
         (Query letters) has none, and the named block is the column itself */
      const host = (c.closest(".wpg-scroll > *") as HTMLElement | null) ?? c;
      const b = host.getBoundingClientRect(); const cs = getComputedStyle(host);
      const inGrid = host.matches(".wpg-scroll > *");
      const l = b.left + (inGrid ? parseFloat(cs.paddingLeft) : 0); const r = b.right - (inGrid ? parseFloat(cs.paddingRight) : 0);
      col = { l, r, w: r - l };
    }
    const blocks = blockSels.map((sel) => { const e = first(sel); const b = e?.getBoundingClientRect(); return { sel, l: b ? b.left : NaN, r: b ? b.right : NaN }; });
    const scr = [...document.querySelectorAll(".wpg-scroll, .ws-wbody")].filter(vis) as HTMLElement[];
    const over = Math.max(0, ...scr.map((s) => s.scrollWidth - s.clientWidth));
    /* every visible action button in the page's rows stays on one line */
    const wrapped: string[] = [];
    const root = c ?? first(".ws-window");
    if (root) for (const btn of root.querySelectorAll<HTMLElement>("button, a[role='button']")) {
      if (!vis(btn) || !btn.closest("[role='row'], tr, li, .rw, [class*='row']")) continue;
      const txt = (btn.innerText || "").trim(); if (!txt) continue;
      /* an action button is a line of inline content; a whole-row button that stacks blocks is laid out on purpose */
      if ([...btn.querySelectorAll("*")].some((k) => /^(block|flex|grid|table|list-item)/.test(getComputedStyle(k).display))) continue;
      /* a second line, not a glyph on its own baseline: the text's rects span more than 0.6 of a line */
      const lh = parseFloat(getComputedStyle(btn).lineHeight) || parseFloat(getComputedStyle(btn).fontSize) * 1.2;
      const rg = document.createRange(); rg.selectNodeContents(btn);
      const rs = [...rg.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
      if (rs.length < 2) continue;
      const mids = rs.map((r) => r.top + r.height / 2);
      if (Math.max(...mids) - Math.min(...mids) > lh * 0.6) wrapped.push(`${txt.slice(0, 40)} (${btn.offsetWidth}×${btn.offsetHeight})`);
    }
    return {
      sheet: sh ? { l: sh.left, r: sh.right, w: sh.width } : null, tabL: tab ? tab.left : null, col, blocks,
      hscroll: { doc: document.documentElement.scrollWidth > innerWidth + 1, scroller: over }, wrapped,
    };
  }, { colSel, blockSels });
}

const within = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
let assertions = 0;
const check = (ok: boolean, msg: string) => { assertions++; expect.soft(ok, msg).toBe(true); };

for (const s of SIZES) {
  test(`PW1 ${label(s)}`, async ({ page }) => {
    test.setTimeout(900_000);
    await page.addInitScript((p) => { try { localStorage.setItem("scriptally:sidebar-pinned", p ? "1" : "0"); } catch { /* */ } }, s.open);
    await mutate(page);
    const rows: string[] = [];
    for (const p of PAGES) {
      await openRoute(page, p.route, { width: s.width, height: s.height });
      await page.locator(`${p.col} >> visible=true`).first().waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForTimeout(900);
      const r = await read(page, p.col, p.blocks);
      const tag = `${label(s)} ${p.route}`;
      check(!!r.sheet && !!r.col, `${tag}: sheet and column found`);
      if (!r.sheet || !r.col) continue;
      /* W1 — the tab in the corner */
      check(r.tabL !== null && within(r.tabL, r.sheet.l), `W1 ${tag}: tab left ${r.tabL} vs sheet ${r.sheet.l}`);
      /* W3 / W4 — the column: min(sheet − 2 × gutter, cap), centred */
      const want = Math.min(r.sheet.w - 2 * GUTTER, CAP);
      const gl = r.col.l - r.sheet.l, gr = r.sheet.r - r.col.r;
      check(within(r.col.w, want), `W3 ${tag}: column ${r.col.w.toFixed(1)} vs ${want}`);
      check(within(gl, gr), `W3 ${tag}: margins ${gl.toFixed(1)} / ${gr.toFixed(1)} unequal`);
      if (r.sheet.w - 2 * GUTTER < CAP) check(within(gl, GUTTER) && within(gr, GUTTER), `W4 ${tag}: gutters ${gl.toFixed(1)} / ${gr.toFixed(1)} vs ${GUTTER}`);
      /* W2 — every block shares both of the column's edges */
      for (const b of r.blocks) check(within(b.l, r.col.l) && within(b.r, r.col.r), `W2 ${tag}: ${b.sel} ${b.l.toFixed(1)}–${b.r.toFixed(1)} vs column ${r.col.l.toFixed(1)}–${r.col.r.toFixed(1)}`);
      /* W6 — no sideways scroll, no wrapped row button */
      check(!r.hscroll.doc && r.hscroll.scroller <= 1, `W6 ${tag}: horizontal overflow ${r.hscroll.scroller}`);
      check(r.wrapped.length === 0, `W6 ${tag}: row buttons wrapped: ${r.wrapped.join(" | ")}`);
      rows.push(`${tag.padEnd(36)} sheet ${r.sheet.w.toFixed(0)} col ${r.col.w.toFixed(1)} gaps ${gl.toFixed(1)}/${gr.toFixed(1)} tab ${(r.tabL! - r.sheet.l).toFixed(1)}`);
      if (SHOTS && (p.route === "/queries" || p.route === "/agents")) {
        await page.screenshot({ path: `${SHOTS}/${p.route === "/queries" ? "qc" : "cl"}-${s.open ? "open" : "col"}-${s.width}.png` });
      }
    }
    for (const route of OWN_WIDTH) {
      await openRoute(page, route, { width: s.width, height: s.height });
      await page.waitForTimeout(900);
      const r = await read(page, "", []);
      const tag = `${label(s)} ${route} (own width)`;
      check(!!r.sheet && r.tabL !== null && within(r.tabL!, r.sheet!.l), `W1 ${tag}: tab left ${r.tabL} vs sheet ${r.sheet?.l}`);
      check(!r.hscroll.doc && r.hscroll.scroller <= 1, `W6 ${tag}: horizontal overflow ${r.hscroll.scroller}`);
    }
    console.log(`[PW1] ${label(s)} — ${assertions} assertions\n` + rows.join("\n"));
    expect(assertions, "the run measured too little").toBeGreaterThan(PAGES.length * 6);
  });
}
