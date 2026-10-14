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

/* v138 (14 Oct) — A1, B1, B2, C1–C4, D1–D3 and L1 are RETIRED: the header panel, the "At a glance" strip, the ink
 * list head and the v132 list they measured are replaced by v138's light header, glyph row and list sheet. Each is
 * named, with its reason, in tests/e2e/RETIRED-query-centre-v138.md. E1 (the sheet lip, every page) stays. */
void MUTATIONS; void Ledger; void LIB; void mutate; void openQC; void setScroll; void near; void CAPTURE;

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
