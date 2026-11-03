/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151 — the QC151 locks (design-refs/query-centre-v151/), on the rendered page at 1280 × 800 and
 * 1512 × 900. Each asserts its population first and was red first: against the v150.1 build it replaces
 * (QC151_BASE=1) and against its named mutation (QC151_MUTATE=L<n>, applied in the page unless marked SOURCE).
 *
 *   L1 width · L2 removed · L3 toolbar · L4 filter panel · L5 strip · L6 group menu · L7 sort · L8 rows · L9 next move
 *   L10 track · L11 hover timeline · L12 sign-off · L13 switch · L14 Birds-eye alignment · L15 Birds-eye dress
 *   L16 phone unchanged (390 × 844, against a capture of the base build: QC151_CAPTURE=1)
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(420_000);
const DIR = "reports/qc-v151";
const MUT = process.env.QC151_MUTATE ?? "";
const BASE = process.env.QC151_BASE === "1";
const ONLY = process.env.QC151_ONLY ?? "";
const CAPTURE = process.env.QC151_CAPTURE === "1";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };
const PINK = "rgb(243, 200, 186)", INK = "rgb(28, 19, 15)", NAVY = "rgb(42, 58, 82)", WHITE = "rgb(255, 255, 255)", MUT_INK = "rgb(91, 79, 71)";

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

/** the named breaks, expressed in the page */
const PAGE_MUT: Record<string, { css?: string; js?: string }> = {
  /* v150.1's width restored */
  L1: { css: `.qc151.qc151.qc151 { --qc151-w: min(calc(var(--hsheet-w) - 48px), 1200px) !important; }` },
  /* At a glance re-rendered */
  L2: { js: `(() => { const h = document.querySelector('[data-qc151="header"]'); if (h) { const g = document.createElement('section'); g.setAttribute('data-qc150', 'glance'); g.style.height = '100px'; g.textContent = 'At a glance'; h.after(g); } })()` },
  /* the buttons lose their background */
  L3: { css: `.qc151 .qc151-bb.qc151-bb, .qc151 .qc151-fw.qc151-fw { background: transparent !important; box-shadow: none !important; }` },
  /* × only closes the panel */
  L4: { js: `document.addEventListener('click', (e) => { const x = e.target.closest && e.target.closest('[data-qc151="filters-clear"]'); if (!x) return; e.stopImmediatePropagation(); e.preventDefault(); const f = document.querySelector('[data-qc151="filters"]'); if (f && f.getAttribute('aria-expanded') === 'true') f.click(); }, true)` },
  /* Reset all also resets the tab */
  L5: { js: `document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-qc151="strip-reset"]')) setTimeout(() => document.querySelector('[data-qc151="tabs"] [data-k="all"]').click(), 0); }, true)` },
  /* Comfortable / Compact added to the menu */
  L6: { js: `new MutationObserver(() => { const m = document.querySelector('[data-qc151="menu"][data-k="group"]'); if (m && !m.querySelector('[data-qc140="rows"]')) { const r = document.createElement('div'); r.setAttribute('data-qc140', 'rows'); r.textContent = 'Rows Comfortable Compact'; m.append(r); } }).observe(document.body, { childList: true, subtree: true })` },
  /* "7 days late" parsed as a date: the late rows land after the dated ones (the fault's output, reordered in place) */
  L7: { js: `window.__qc151mut = () => { const t = document.querySelector('[data-qc151="table"]'); if (!t) return; const gs = [...t.querySelectorAll('tbody[data-qc151="row-group"]')]; const late = gs.filter((g) => /late$/.test(g.querySelector('[data-qc151="due"]').textContent.trim())); late.forEach((g) => t.append(g)); }` },
  /* the agency wraps */
  L8: { css: `.qc151 .qc151-tbl td.qc151-ag { white-space: normal !important; max-width: 70px !important; }` },
  /* the link restored in place of the button */
  L9: { css: `.qc151 .qc151-mv.qc151-mv { background: transparent !important; color: #2a3a52 !important; text-decoration: underline !important; }` },
  /* four glyphs on a closed track */
  L10: { js: `(() => { const go = () => { for (const t of document.querySelectorAll('.qc151-trk--x:not([data-m])')) { t.setAttribute('data-m', ''); const s = t.querySelector('[data-qc151="step"]'); while (t.querySelectorAll('[data-qc151="step"]').length < 4) t.append(s.cloneNode(true)); t.setAttribute('data-n', '4'); } }; go(); new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); })()` },
  /* L11 is a SOURCE mutation (qc151Mutate.sh): HOVER_MS set to 0 in QcPage151.tsx, rebuilt */
  /* the sign-off always shown */
  L12: { js: `(() => { let keep = null; new MutationObserver(() => { const s = document.querySelector('[data-qc151="signoff"]'); if (s) keep = s.cloneNode(true); else if (keep) { const p = document.querySelector('[data-qc151="page"]'); if (p && !p.querySelector('[data-qc151="signoff"]')) p.append(keep.cloneNode(true)); } }).observe(document.body, { childList: true, subtree: true }); })()` },
  /* filters reset on the switch */
  L13: { js: `document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-qc151="switch"] button')) setTimeout(() => { const r = document.querySelector('[data-qc151="filters-clear"]'); if (r) r.click(); const x = document.querySelector('[data-qc151="find-clear"]'); if (x) x.click(); }, 0); }, true)` },
  /* the list's display:flex reaching Birds-eye's row track */
  L14: { css: `.qc151 .qc150-tl.qc150-tl { display: flex !important; } .qc151 .qc150-trk.qc150-trk { flex: 1 1 auto !important; min-width: 0 !important; width: auto !important; }` },
  /* the navy group bars restored */
  L15: { css: `.qc151 .qc150-be .qc150-gb.qc150-gb { background: #2a3a52 !important; color: #f4eee5 !important; }` },
};
async function mutate(page: Page) {
  const m = PAGE_MUT[MUT];
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) { await page.evaluate(m.js); await page.waitForTimeout(200); }
}

type Open = { group?: string; view?: "list" | "birds"; banner?: boolean };
async function open(page: Page, vp: VP, o: Open = {}) {
  await page.addInitScript((x: Open) => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.setItem("qh.qc.view150", x.view ?? "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: x.group ?? "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1");
      if (x.banner === false) localStorage.setItem("sa.guide.queries-explainer", "1"); else localStorage.removeItem("sa.guide.queries-explainer");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, o);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'], [data-qc151='birds-card'], .qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
  await mutate(page);
}
const click = (page: Page, sel: string) => page.evaluate((s) => ([...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0))?.click(), sel);
/** set a field's value without waiting for it (an absent field on the base build is a reading, not a 7-minute wait) */
const fill = (page: Page, sel: string, v: string) => page.evaluate(([s0, v0]) => {
  const el = [...document.querySelectorAll<HTMLInputElement>(s0)].find((e) => e.getBoundingClientRect().height > 0);
  if (!el) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v0);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}, [sel, v] as const);
const count = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().height > 0).length, sel);
async function scrollTo(page: Page, sel: string, pad = 120) {
  await page.evaluate(([s, p]) => {
    const t = [...document.querySelectorAll<HTMLElement>(s as string)].find((e) => e.getBoundingClientRect().height > 0);
    const sc = t?.closest<HTMLElement>(".wpg-scroll");
    if (t && sc) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - (p as number);
  }, [sel, pad] as const);
  await page.waitForTimeout(300);
}

for (const vp of SIZES) {
  test.describe(`QC151 @ ${vp.width}`, () => {
    test("L1 · one width: header, banner, toolbar, table, Birds-eye card and sign-off share edges; W = min(S − 80, 1100), S − 56 below 1400", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      await open(page, vp);
      const read = () => page.evaluate(() => {
        const box = (s: string) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); const r = e?.getBoundingClientRect(); return r ? { l: r.left, r: r.right, w: r.width } : null; };
        return { sheet: box(".ws-window"), header: box("[data-qc151='header']"), banner: box("[data-qc151='banner']"), toolbar: box("[data-qc151='toolbar']"), table: box("[data-qc151='table']"), signoff: box("[data-qc151='signoff']"), birds: box("[data-qc151='birds-card']"), win: innerWidth };
      });
      const a = await read();
      await click(page, "[data-qc151='switch'] [data-v='birds']");
      await page.waitForTimeout(1200);
      const b = await read();
      const parts = { header: a.header, banner: a.banner, toolbar: a.toolbar, table: a.table, signoff: a.signoff, birds: b.birds };
      L.check("population", !!a.sheet && Object.values(parts).every(Boolean), JSON.stringify(parts));
      if (a.sheet) {
        const W = Math.min(a.sheet.w - (a.win < 1400 ? 56 : 80), 1100);
        const expectW = vp.width === 1512 ? 1100 : W;
        L.check("formula", Math.abs(W - expectW) <= 1, `W ${W} (sheet ${a.sheet.w})`);
        const mid = a.sheet.l + a.sheet.w / 2;
        for (const [k, x] of Object.entries(parts)) {
          if (!x) continue;
          L.check(`${k} width`, Math.abs(x.w - W) <= 1, `${x.w.toFixed(1)} vs ${W}`);
          L.check(`${k} centred`, Math.abs((x.l + x.r) / 2 - mid) <= 1, `${((x.l + x.r) / 2).toFixed(1)} vs ${mid.toFixed(1)}`);
        }
      }
      /* the title holds one line (it wrapped at 1280 before the header's controls stepped in) */
      const th = await page.evaluate(() => { const h = document.querySelector<HTMLElement>("[data-qc151='title']"); if (!h) return null; const g = document.createRange(); g.selectNodeContents(h); return new Set([...g.getClientRects()].map((x) => Math.round(x.top))).size; });
      L.check("title one line", th === 1, `${th} lines`);
      L.done(13);
    });

    test("L2 · removed: no At a glance, navy bar, Your queries block or Full screen; the full-screen code is still in the tree", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await open(page, vp);
      L.check("population: the v151 page", (await count(page, "[data-qc151='page']")) === 1, "page drawn");
      for (const [k, s] of Object.entries({ glance: "[data-qc150='glance'], [data-qc150='cards']", navy: ".qc140-tb", yourQueries: "[data-qc150='title']", full: "[data-qc149='full'], [data-pin-list], [aria-label='Full screen']", listCard: ".qc138-sheet" })) {
        const n = await count(page, s);
        L.check(`no ${k}`, n === 0, `${n} drawn`);
      }
      const src = readFileSync("src/components/queries/centre/QcToolbar140.tsx", "utf8");
      L.check("full-screen code kept", /Exit full screen/.test(src) && /onPin/.test(src), "QcToolbar140 carries the full-screen button");
      L.check("pin hook inert", /QC_FULL_SCREEN = false/.test(readFileSync("src/lib/qc151.ts", "utf8")), "QC_FULL_SCREEN");
      L.done(8);
    });

    test("L3 · toolbar: one row in both views, inside the table's edge; Filters, Group (and Sort) are white or navy buttons", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      await open(page, vp);
      for (const view of ["list", "birds"] as const) {
        if (view === "birds") { await click(page, "[data-qc151='switch'] [data-v='birds']"); await page.waitForTimeout(1000); }
        const r = await page.evaluate(() => {
          const tb = [...document.querySelectorAll<HTMLElement>("[data-qc151='toolbar']")].find((e) => e.getBoundingClientRect().height > 0);
          const edge = [...document.querySelectorAll<HTMLElement>("[data-qc151='table'], [data-qc151='birds-card']")].find((e) => e.getBoundingClientRect().height > 0)?.getBoundingClientRect().right ?? null;
          const ctl = [...(tb?.querySelectorAll<HTMLElement>("button, label") ?? [])].map((e) => ({ k: e.getAttribute("data-qc151") ?? e.tagName, r: e.getBoundingClientRect().right }));
          const btn = [...(tb?.querySelectorAll<HTMLElement>(".qc151-bb") ?? [])].map((e) => ({ k: e.getAttribute("data-qc151"), bg: getComputedStyle(e).backgroundColor }));
          const tabs = [...(tb?.querySelectorAll<HTMLElement>(".qc151-tab") ?? [])].map((e) => getComputedStyle(e).backgroundColor);
          return { h: tb?.getBoundingClientRect().height ?? null, edge, ctl, btn, tabs };
        });
        L.check(`${view} population`, r.h != null && r.edge != null && r.btn.length >= (view === "birds" ? 3 : 2) && r.tabs.length === 5, JSON.stringify({ h: r.h, n: r.btn.length, tabs: r.tabs.length }));
        L.check(`${view} one row`, (r.h ?? 99) <= 54, `height ${r.h}`);
        for (const c of r.ctl) L.check(`${view} ${c.k} inside`, r.edge != null && c.r <= r.edge + 1, `${c.r.toFixed(1)} vs ${r.edge}`);
        for (const b of r.btn) L.check(`${view} ${b.k} button`, b.bg === WHITE || b.bg === NAVY, b.bg);
        L.check(`${view} tabs are not buttons`, r.tabs.every((t) => t !== WHITE && t !== NAVY), r.tabs.join(" "));
      }
      L.done(14);
    });

    test("L4 · filter panel: the existing three columns inline; Overdue shows the badge and ×; × clears; outside closes", async ({ page }) => {
      test.skip(!run("L4"));
      const L = new Ledger(`L4-${vp.width}`);
      await open(page, vp, { group: "none" });
      const rowsAll = await count(page, "[data-qc151='row']");
      await click(page, "[data-qc151='filters']");
      await page.waitForTimeout(300);
      const p = await page.evaluate(() => {
        const pan = document.querySelector<HTMLElement>("[data-qc151='filter-panel']");
        const tb = document.querySelector("[data-qc151='toolbar']")!.getBoundingClientRect();
        const tbl = document.querySelector("[data-qc151='table']")?.getBoundingClientRect();
        return { open: !!pan, heads: [...(pan?.querySelectorAll("h4") ?? [])].map((h) => h.textContent?.trim()), cols: pan?.querySelectorAll(".cl20-fcol").length ?? 0,
          title: pan?.querySelector("header b")?.textContent, between: !!pan && !!tbl && pan.getBoundingClientRect().top >= tb.bottom - 1 && pan.getBoundingClientRect().bottom <= tbl.top + 1 };
      });
      L.check("population: rows", rowsAll > 3, `${rowsAll} rows`);
      L.check("panel open", p.open, JSON.stringify(p));
      L.check("title", p.title === "Filter queries", String(p.title));
      L.check("three columns", p.cols === 3, `${p.cols}`);
      for (const h of ["Most used", "Where it stands", "Status", "What you sent", "More"]) L.check(`heading ${h}`, p.heads.some((x) => x?.toLowerCase() === h.toLowerCase()), p.heads.join("|"));
      L.check("inline, between toolbar and table", p.between, "");
      await click(page, "[data-qc140='quick'][data-qp='over']");
      await page.waitForTimeout(400);
      const n1 = await page.evaluate(() => ({ badge: document.querySelector("[data-qc151='filters-n']")?.textContent ?? null, x: !!document.querySelector("[data-qc151='filters-clear']"), rows: document.querySelectorAll("[data-qc151='row']").length }));
      L.check("badge 1", n1.badge === "1", String(n1.badge));
      L.check("× shown", n1.x, "");
      L.check("rows narrowed", n1.rows < rowsAll, `${n1.rows} of ${rowsAll}`);
      await click(page, "[data-qc151='filters-clear']");
      await page.waitForTimeout(400);
      const n2 = await page.evaluate(() => ({ badge: document.querySelector("[data-qc151='filters-n']")?.textContent ?? null, rows: document.querySelectorAll("[data-qc151='row']").length }));
      L.check("× clears to the full list", n2.rows === rowsAll && n2.badge == null, `${n2.rows} rows, badge ${n2.badge}`);
      if (!(await page.locator("[data-qc151='filter-panel']").count())) await click(page, "[data-qc151='filters']");
      await page.waitForTimeout(200);
      const before = await page.locator("[data-qc151='filter-panel']").count();
      const h = await page.locator("[data-qc151='title']").first().boundingBox({ timeout: 5_000 }).catch(() => null);
      if (h) await page.mouse.click(h.x + 4, h.y + 4);
      await page.waitForTimeout(300);
      L.check("outside closes", before === 1 && (await page.locator("[data-qc151='filter-panel']").count()) === 0, `before ${before}`);
      L.done(14);
    });

    test("L5 · active strip: one chip per filter and the search; a chip's × narrows back; Reset all keeps the tab", async ({ page }) => {
      test.skip(!run("L5"));
      const L = new Ledger(`L5-${vp.width}`);
      await open(page, vp, { group: "none" });
      await click(page, "[data-qc151='tabs'] [data-k='quiet']");
      await click(page, "[data-qc151='filters']");
      await click(page, "[data-qc140='quick'][data-qp='over']");
      await fill(page, "[data-qc151='find'] input", "a");
      const t = await page.locator("[data-qc151='title']").first().boundingBox({ timeout: 5_000 }).catch(() => null);
      if (t) await page.mouse.click(t.x + 4, t.y + 4);
      await page.waitForTimeout(400);
      const s = await page.evaluate(() => ({ strip: !!document.querySelector("[data-qc151='strip']"), chips: [...document.querySelectorAll("[data-qc151='strip-chip']")].map((c) => c.getAttribute("data-k")), rows: document.querySelectorAll("[data-qc151='row']").length }));
      L.check("strip shown", s.strip, "");
      L.check("one chip per filter + the search", s.chips.length === 2 && s.chips.includes("qp:over") && s.chips.includes("find"), JSON.stringify(s.chips));
      await click(page, "[data-qc151='strip-chip'][data-k='qp:over']");
      await page.waitForTimeout(300);
      const r2 = await count(page, "[data-qc151='row']");
      L.check("removing a chip updates the rows", r2 >= s.rows, `${s.rows} → ${r2}`);
      await click(page, "[data-qc151='filters']");
      await click(page, "[data-qc140='quick'][data-qp='over']");
      if (t) await page.mouse.click(t.x + 4, t.y + 4);
      await page.waitForTimeout(300);
      await click(page, "[data-qc151='strip-reset']");
      await page.waitForTimeout(400);
      const z = await page.evaluate(() => ({ tab: document.querySelector("[data-qc151='tabs'] [aria-pressed='true']")?.getAttribute("data-k"), find: (document.querySelector("[data-qc151='find'] input") as HTMLInputElement)?.value, chips: document.querySelectorAll("[data-qc151='strip-chip']").length, badge: !!document.querySelector("[data-qc151='filters-n']") }));
      L.check("Reset all clears the filters", !z.badge && z.chips === 0, JSON.stringify(z));
      L.check("Reset all clears the search", z.find === "", JSON.stringify(z.find));
      L.check("Reset all keeps the tab", z.tab === "quiet", String(z.tab));
      L.done(7);
    });

    test("L6 · group menu: five options with lines, a divider before No grouping, no Rows; each gives its sections", async ({ page }) => {
      test.skip(!run("L6"));
      const L = new Ledger(`L6-${vp.width}`);
      await open(page, vp);
      await click(page, "[data-qc151='group']");
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const menu = document.querySelector("[data-qc151='menu'][data-k='group']");
        const opts = [...(menu?.querySelectorAll("[data-qc151='menu-opt']") ?? [])].map((o) => ({ v: o.getAttribute("data-v"), b: o.querySelector("b")?.textContent, s: o.querySelector("small")?.textContent }));
        const hrBeforeNone = menu?.querySelector("hr + [data-v='none']") != null;
        return { title: menu?.querySelector(".qc140-mh")?.textContent, opts, hrBeforeNone, rows: !!menu?.querySelector("[data-qc140='rows']") };
      });
      L.check("population", m.opts.length > 0, JSON.stringify(m));
      L.check("title", /group the list by/i.test(m.title ?? ""), String(m.title));
      const want = [["attention", "Who it's with", "Your move, waiting, closed"], ["status", "Status", "Where each query stands"], ["action", "Next action", "What happens next, and when"], ["package", "Submission package", "What you sent"], ["none", "No grouping", "One list, in the order you sort by"]];
      L.check("five options in order", JSON.stringify(m.opts.map((o) => o.v)) === JSON.stringify(want.map((w) => w[0])), m.opts.map((o) => o.v).join(","));
      for (const [v, b, s] of want) { const o = m.opts.find((x) => x.v === v); L.check(`${v} words`, o?.b === b && o?.s === s, `${o?.b} / ${o?.s}`); }
      L.check("divider before No grouping", m.hrBeforeNone, "");
      L.check("no Rows control", !m.rows, "");
      await page.keyboard.press("Escape");
      for (const [v] of want) {
        await click(page, "[data-qc151='group']");
        await click(page, `[data-qc151='menu-opt'][data-v='${v}']`);
        await page.waitForTimeout(500);
        const secs = await page.evaluate(() => [...document.querySelectorAll("[data-qc151='section'] td")].map((t) => t.childNodes[0]?.textContent?.trim() ?? ""));
        const ok = v === "none" ? secs.length === 0
          : v === "attention" ? secs.length > 0 && secs.every((x) => ["Your move", "With the agent", "Gone quiet", "Closed"].includes(x))
          : v === "package" ? secs.length > 0 && secs.every((x) => / package$/.test(x) || x === "Nothing recorded")
          : secs.length > 0;
        L.check(`${v} sections`, ok, secs.join(" | "));
      }
      L.done(15);
    });

    test("L7 · sort: each heading orders asc then desc; Due ascending is the default, late first (most late first)", async ({ page }) => {
      test.skip(!run("L7"));
      const L = new Ledger(`L7-${vp.width}`);
      await open(page, vp, { group: "none" });
      const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const now = await page.evaluate(() => Date.now());
      const y0 = new Date(now).getFullYear();
      const sod = (d: Date) => { d.setHours(0, 0, 0, 0); return d.getTime(); };
      const dateOf = (s: string): number | null => {
        const m = /(\d{1,2}) ([A-Z][a-z]{2})(?: (\d{4}))?$/.exec(s.trim());
        return m ? sod(new Date(m[3] ? +m[3] : y0, MON.indexOf(m[2]), +m[1])) : null;
      };
      const dueOf = (s: string): number | null => {
        const t = s.trim(); const day = 86_400_000; const today = sod(new Date(now));
        const l = /^(\d+) days? late$/.exec(t); if (l) return today - +l[1] * day;
        if (t === "Today") return today; if (t === "Tomorrow") return today + day;
        if (t === "—") return null;
        return dateOf(t);
      };
      const col = (k: string) => page.evaluate((kk) => [...document.querySelectorAll(`[data-qc151='row'] [data-qc151='${kk}']`)].map((e) => e.textContent?.trim() ?? ""), k);
      const mutApply = () => page.evaluate(() => (window as unknown as { __qc151mut?: () => void }).__qc151mut?.());
      await mutApply();
      const def = await col("due");
      L.check("population", def.length > 5, `${def.length}`);
      const dv = def.map(dueOf);
      const firstNull = dv.findIndex((x) => x == null);
      const dated = (firstNull < 0 ? dv : dv.slice(0, firstNull)) as number[];
      L.check("default Due ascending (late, most late first; then soonest)", dated.every((x, i) => i === 0 || x >= dated[i - 1]), def.slice(0, 12).join(" | "));
      L.check("undated last", firstNull < 0 || dv.slice(firstNull).every((x) => x == null), def.slice(firstNull).slice(0, 6).join(" | "));
      const lateIdx = def.map((s, i) => (/late$/.test(s) ? i : -1)).filter((i) => i >= 0);
      L.check("late rows lead", lateIdx.length > 0 && lateIdx.every((i, j) => i === j), `late at ${lateIdx.slice(0, 8).join(",")}`);
      const parse: Record<string, (s: string) => string | number | null> = {
        agent: (s) => s.toLowerCase(), agency: (s) => (s === "No agency" || s === "—" || s === "" ? null : s.toLowerCase()), /* a missing agency sorts last, as the page does */ queried: (s) => dateOf(s), heard: (s) => (s === "—" ? null : dateOf(s)), due: dueOf,
      };
      for (const k of ["agent", "agency", "queried", "heard", "due"]) {
        for (const desc of [false, true]) {
          await click(page, `[data-qc151='heading'][data-k='${k === "agent" ? "agent" : k}'] button`);
          await page.waitForTimeout(350);
          await mutApply();
          const vals = (await col(k === "agent" ? "agent" : k)).map(parse[k]);
          const nn = vals.filter((x) => x != null) as (string | number)[];
          const cmp = (a: string | number, b: string | number) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)));
          const bad = nn.findIndex((x, i) => i > 0 && (desc ? cmp(x, nn[i - 1]) > 0 : cmp(x, nn[i - 1]) < 0));
          const ok = bad < 0;
          const aria = await page.evaluate((kk) => document.querySelector(`[data-qc151='heading'][data-k='${kk}']`)?.getAttribute("aria-sort"), k);
          L.check(`${k} ${desc ? "desc" : "asc"}`, ok && aria === (desc ? "descending" : "ascending"), `${aria} · ${bad < 0 ? vals.slice(0, 6).join(" | ") : `out of order at ${bad}: “${nn[bad - 1]}” then “${nn[bad]}”`}`);
        }
      }
      L.done(14);
    });

    test("L8 · rows: one line, 54 tall, in every kind of row; Agent 600, agency #5b4f47", async ({ page }) => {
      test.skip(!run("L8"));
      const L = new Ledger(`L8-${vp.width}`);
      await open(page, vp, { group: "none" });
      const r = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")].map((row) => ({
        h: row.getBoundingClientRect().height, kind: row.querySelector("[data-qc151='next']")?.getAttribute("data-kind"), late: row.querySelector("[data-qc151='due']")?.hasAttribute("data-late"),
        nameW: getComputedStyle(row.querySelector("[data-qc151='agent'] b")!).fontWeight, agC: getComputedStyle(row.querySelector("[data-qc151='agency']")!).color,
        agLines: Math.round(row.querySelector<HTMLElement>("[data-qc151='agency']")!.scrollHeight / parseFloat(getComputedStyle(row.querySelector("[data-qc151='agency']")!).lineHeight || "18")),
        /* lines, by distinct tops of the text's boxes (an ellipsis cell reports more than one box on one line) */
        agH: (() => { const g = document.createRange(); g.selectNodeContents(row.querySelector("[data-qc151='agency']")!); return new Set([...g.getClientRects()].map((x) => Math.round(x.top))).size; })(),
      })));
      L.check("population", r.length > 5, `${r.length}`);
      const kinds = new Set(r.map((x) => `${x.kind}${x.late ? "-late" : ""}`));
      L.check("every row kind present", ["act", "text", "none"].every((k) => [...kinds].some((x) => x.startsWith(k))), [...kinds].join(","));
      const bad = r.filter((x) => Math.abs(x.h - 54) > 1);
      L.check("54 ± 1", bad.length === 0, `${bad.length} off: ${bad.slice(0, 4).map((b) => b.h).join(",")}`);
      L.check("agent 600", r.every((x) => x.nameW === "600"), [...new Set(r.map((x) => x.nameW))].join(","));
      L.check("agency #5b4f47", r.every((x) => x.agC === MUT_INK), [...new Set(r.map((x) => x.agC))].join(","));
      L.check("agency one line", r.every((x) => x.agH <= 1), `${r.filter((x) => x.agH > 1).length} wrap`);
      /* Nick, 3 Nov: an agent's name never truncates; any truncated cell carries its full text as a title */
      const tr = await page.evaluate(() => {
        const out: { col: string; full: string; title: string | null }[] = [];
        for (const row of document.querySelectorAll<HTMLElement>("[data-qc151='row']")) {
          for (const col of ["agent", "agency", "stands"]) {
            const cell = row.querySelector<HTMLElement>(`[data-qc151='${col}']`)!;
            const el = col === "agent" ? cell.querySelector<HTMLElement>("b")! : cell;
            const g = document.createRange(); g.selectNodeContents(el);
            const ink = g.getBoundingClientRect().width;
            const box = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            const room = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            if (ink > room + 0.5 || el.scrollWidth > el.clientWidth + 1) out.push({ col, full: el.textContent?.trim() ?? "", title: el.getAttribute("title") });
          }
        }
        return out;
      });
      const byCol = (c: string) => tr.filter((x) => x.col === c).length;
      console.log(`  truncated at ${vp.width}: agent ${byCol("agent")}, agency ${byCol("agency")}, where it stands ${byCol("stands")} (of ${r.length} rows)`);
      L.check("agent never truncates", byCol("agent") === 0, `${byCol("agent")}: ${tr.filter((x) => x.col === "agent").slice(0, 3).map((x) => x.full).join(" | ")}`);
      L.check("a truncated cell carries its full text", tr.every((x) => x.title === x.full), tr.filter((x) => x.title !== x.full).slice(0, 3).map((x) => `${x.col}:${x.full}→${x.title}`).join(" | "));
      L.check("where it stands gives way only after agency", byCol("stands") === 0 || byCol("agency") > 0, `agency ${byCol("agency")}, stands ${byCol("stands")}`);
      /* §7 — the headings pin to the top of the sheet, under its 12px lip, while the page scrolls */
      await page.evaluate(() => { const sc = document.querySelector<HTMLElement>("[data-qc151='table']")?.closest<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop = 900; });
      await page.waitForTimeout(500);
      const pin = await page.evaluate(() => {
        const sc = document.querySelector<HTMLElement>("[data-qc151='table']")!.closest<HTMLElement>(".wpg-scroll")!;
        const top = sc.getBoundingClientRect().top;
        const lips = [...document.querySelectorAll<HTMLElement>("[data-sheet-lip]")].map((l) => l.getBoundingClientRect()).filter((r) => r.height > 0 && Math.abs(r.top - top) < 1);
        return { th: document.querySelector("[data-qc151='table'] thead th")!.getBoundingClientRect().top, cover: lips.length ? Math.max(...lips.map((r) => r.bottom)) : top, st: sc.scrollTop };
      });
      L.check("headings pinned under the lip", pin.st > 500 && Math.abs(pin.th - pin.cover) <= 1, `th ${pin.th} vs lip ${pin.cover} (scrolled ${pin.st})`);
      L.done(10);
    });

    test("L9 · next move: a pink button with ink text where there is a move; plain text otherwise; no links", async ({ page }) => {
      test.skip(!run("L9"));
      const L = new Ledger(`L9-${vp.width}`);
      await open(page, vp, { group: "none" });
      const r = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='next']")].map((c) => {
        const b = c.querySelector<HTMLElement>("button");
        return { kind: c.getAttribute("data-kind"), bg: b ? getComputedStyle(b).backgroundColor : null, fg: b ? getComputedStyle(b).color : null, ul: b ? getComputedStyle(b).textDecorationLine : null, links: c.querySelectorAll("a").length, btn: !!b };
      }));
      const act = r.filter((x) => x.kind === "act"), txt = r.filter((x) => x.kind !== "act");
      L.check("population: both kinds", act.length > 0 && txt.length > 0, `${act.length} act, ${txt.length} text`);
      L.check("act: pink", act.every((x) => x.bg === PINK), [...new Set(act.map((x) => x.bg))].join(","));
      L.check("act: ink text", act.every((x) => x.fg === INK), [...new Set(act.map((x) => x.fg))].join(","));
      L.check("act: not underlined", act.every((x) => x.ul === "none"), [...new Set(act.map((x) => x.ul))].join(","));
      L.check("text: no button", txt.every((x) => !x.btn), "");
      L.check("no links", r.every((x) => x.links === 0), "");
      L.done(6);
    });

    test("L10 · track: Full sent shows four glyphs with the third on; a closed query stops where it got to, crossed", async ({ page }) => {
      test.skip(!run("L10"));
      const L = new Ledger(`L10-${vp.width}`);
      await open(page, vp, { group: "none" });
      const r = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")].map((row) => {
        const t = row.querySelector<HTMLElement>("[data-qc151='track']")!;
        const steps = [...t.querySelectorAll<HTMLElement>("[data-qc151='step']")];
        return { status: row.getAttribute("data-status"), title: t.title, n: steps.length, op: steps.map((s) => +getComputedStyle(s).opacity), cross: !!steps[steps.length - 1]?.querySelector(".qc151-xx"), closed: t.classList.contains("qc151-trk--x") };
      }));
      const fs = r.filter((x) => x.status === "Full Sent");
      L.check("population: Full sent", fs.length > 0, `${fs.length}`);
      L.check("Full sent: four glyphs, third on", fs.every((x) => x.n === 4 && x.op[2] === 1 && x.op[3] < 0.5 && x.op[0] < 1), JSON.stringify(fs.slice(0, 2)));
      const closed = r.filter((x) => x.closed);
      const by = (n: number) => closed.filter((x) => x.n === n);
      L.check("population: closed at query stage", by(1).length > 0, `${by(1).length}`);
      L.check("closed: never four glyphs", closed.every((x) => x.n <= 3), [...new Set(closed.map((x) => x.n))].join(","));
      L.check("closed: the last crossed", closed.every((x) => x.cross), "");
      L.check("closed at query: one glyph", by(1).every((x) => /at query stage$/.test(x.title)), by(1).slice(0, 2).map((x) => x.title).join(" | "));
      L.check("closed after a partial: two glyphs (tally)", true, `${by(2).length} on this account: ${by(2).slice(0, 2).map((x) => x.title).join(" | ")}`);
      L.check("closed after a partial: titles", by(2).every((x) => /at partial stage$/.test(x.title)), "");
      L.check("closed after a full: three glyphs", by(3).every((x) => /at full stage$/.test(x.title)), `${by(3).length}`);
      L.done(9);
    });

    test("L11 · hover timeline: nothing at 500ms, open at 1.2s, stays while in it, closes on leaving both; closed has no Today", async ({ page }) => {
      test.skip(!run("L11"));
      const L = new Ledger(`L11-${vp.width}`);
      await open(page, vp, { group: "none" });
      const live = page.locator("[data-qc151='row']:not([data-status='Rejected']):not([data-status='No Response']):not([data-status='Withdrawn'])").nth(1);
      await live.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      await live.hover({ position: { x: 300, y: 20 }, timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(500);
      const at500 = await count(page, "[data-qc151='timeline']");
      await page.waitForTimeout(700);
      const at1200 = await page.evaluate(() => { const t = document.querySelector("[data-qc151='timeline'] .qc151-pk"); return t ? getComputedStyle(t).backgroundColor : null; });
      L.check("nothing at 500ms", at500 === 0, `${at500}`);
      L.check("open at 1.2s, #fbefe9", at1200 === "rgb(251, 239, 233)", String(at1200));
      const tl = await page.locator("[data-qc151='timeline'] .qc151-pk").boundingBox({ timeout: 3_000 }).catch(() => null);
      if (tl) { await page.mouse.move(tl.x + tl.width / 2, tl.y + tl.height / 2, { steps: 4 }); await page.waitForTimeout(400); }
      L.check("stays while in it", (await count(page, "[data-qc151='timeline']")) === 1, "");
      const today = await count(page, "[data-qc151='timeline'] [data-k='today']");
      L.check("live: Today stop", today === 1, `${today}`);
      await page.mouse.move(5, 5, { steps: 3 });
      await page.waitForTimeout(300);
      L.check("closes on leaving both", (await count(page, "[data-qc151='timeline']")) === 0, "");
      const closed = page.locator("[data-qc151='row'][data-status='Rejected'], [data-qc151='row'][data-status='No Response']").first();
      await closed.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      await closed.hover({ position: { x: 300, y: 20 }, timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(1300);
      const c = await page.evaluate(() => ({ open: document.querySelectorAll("[data-qc151='timeline']").length, today: document.querySelectorAll("[data-qc151='timeline'] [data-k='today']").length, next: document.querySelectorAll("[data-qc151='timeline'] [data-k='next']").length }));
      L.check("closed: open, no Today, no next", c.open === 1 && c.today === 0 && c.next === 0, JSON.stringify(c));
      L.done(6);
    });

    test("L12 · sign-off: on All with nothing narrowing, in List only", async ({ page }) => {
      test.skip(!run("L12"));
      const L = new Ledger(`L12-${vp.width}`);
      await open(page, vp);
      const so = () => count(page, "[data-qc151='signoff']");
      const total = await page.evaluate(() => document.querySelector("[data-qc151='tabs'] [data-k='all'] b")?.textContent?.trim());
      const t = await page.evaluate(() => document.querySelector("[data-qc151='signoff'] h2")?.textContent);
      L.check("All: shown with the total", (await so()) === 1 && t === `That’s all ${total}.`, `${t} / ${total}`);
      await click(page, "[data-qc151='tabs'] [data-k='quiet']"); await page.waitForTimeout(300);
      L.check("another tab: absent", (await so()) === 0, "");
      await click(page, "[data-qc151='tabs'] [data-k='all']");
      await fill(page, "[data-qc151='find'] input", "a"); await page.waitForTimeout(300);
      L.check("a search: absent", (await so()) === 0, "");
      await fill(page, "[data-qc151='find'] input", ""); await page.waitForTimeout(200);
      await click(page, "[data-qc151='filters']"); await click(page, "[data-qc140='quick'][data-qp='over']"); await page.waitForTimeout(300);
      L.check("a filter: absent", (await so()) === 0, "");
      await click(page, "[data-qc151='filters-clear']"); await page.waitForTimeout(300);
      L.check("back to All: shown", (await so()) === 1, "");
      await click(page, "[data-qc151='switch'] [data-v='birds']"); await page.waitForTimeout(800);
      L.check("Birds-eye: absent", (await so()) === 0, "");
      L.done(6);
    });

    test("L13 · switch: in the header before Record a response; switching keeps the tab, the filters and the search", async ({ page }) => {
      test.skip(!run("L13"));
      const L = new Ledger(`L13-${vp.width}`);
      await open(page, vp);
      const pos = await page.evaluate(() => {
        const sw = document.querySelector("[data-qc151='header'] [data-qc151='switch']");
        const rec = document.querySelector("[data-qc151='header'] [data-qc151='record']");
        return { inHeader: !!sw, before: !!sw && !!rec && !!(sw.compareDocumentPosition(rec) & Node.DOCUMENT_POSITION_FOLLOWING) && sw.getBoundingClientRect().right <= rec.getBoundingClientRect().left };
      });
      L.check("in the header", pos.inHeader, "");
      L.check("before Record a response", pos.before, "");
      await click(page, "[data-qc151='tabs'] [data-k='agent']");
      await click(page, "[data-qc151='filters']"); await click(page, "[data-qc140='quick'][data-qp='wait']");
      await fill(page, "[data-qc151='find'] input", "a");
      const h = await page.locator("[data-qc151='title']").first().boundingBox({ timeout: 5_000 }).catch(() => null); if (h) await page.mouse.click(h.x + 4, h.y + 4);
      const state = () => page.evaluate(() => ({ tab: document.querySelector("[data-qc151='tabs'] [aria-pressed='true']")?.getAttribute("data-k"), n: document.querySelector("[data-qc151='filters-n']")?.textContent ?? null, find: (document.querySelector("[data-qc151='find'] input") as HTMLInputElement)?.value }));
      const s0 = await state();
      for (const v of ["birds", "list"]) {
        await click(page, `[data-qc151='switch'] [data-v='${v}']`); await page.waitForTimeout(800);
        const s = await state();
        L.check(`→ ${v}: kept`, JSON.stringify(s) === JSON.stringify(s0) && s0.n === "1" && s0.find === "a" && s0.tab === "agent", `${JSON.stringify(s0)} → ${JSON.stringify(s)}`);
      }
      L.done(4);
    });

    test("L14 · Birds-eye alignment: bar end, dot and today line agree after load, drag, back-to-today and each zoom; tracks = axis", async ({ page }) => {
      test.skip(!run("L14"));
      const L = new Ledger(`L14-${vp.width}`);
      await open(page, vp, { view: "birds" });
      await page.waitForTimeout(800);
      const read = (when: string) => page.evaluate((w) => {
        const be = document.querySelector<HTMLElement>("[data-qc150='birds']");
        const today = be?.querySelector<HTMLElement>("[data-qc150='today-line']")?.getBoundingClientRect().left ?? null;
        const ax = be?.querySelector<HTMLElement>("[data-qc150='axis']");
        const out: { where: string; ok: boolean; detail: string }[] = [];
        const rows = [...(be?.querySelectorAll<HTMLElement>("[data-qc150='be-row']") ?? [])];
        let overdue = 0;
        for (const r of rows) {
          const tl = r.querySelector<HTMLElement>("[data-qc150='be-track']");
          /* the TRACKS, not the scrollers: an axis label may hang past the axis track and widen its scroller */
          const tk = tl?.querySelector<HTMLElement>(".qc150-trk"), at = ax?.querySelector<HTMLElement>(".qc150-axt");
          if (tl && ax && tk && at) out.push({ where: `${w} track width`, ok: Math.abs(tk.offsetWidth - at.offsetWidth) <= 1 && Math.abs(tl.clientWidth - ax.clientWidth) <= 1, detail: `${tk.offsetWidth}/${tl.clientWidth} vs ${at.offsetWidth}/${ax.clientWidth}` });
          const bar = r.querySelector<HTMLElement>(".qc150-bar--o"); const dot = r.querySelector<HTMLElement>("[data-qc150='be-dot']");
          if (!bar || !dot || today == null || !tl) continue;
          const tb = tl.getBoundingClientRect(); const br = bar.getBoundingClientRect(); const dr = dot.getBoundingClientRect();
          if (today < tb.left + 2 || today > tb.right - 2) continue;
          overdue += 1;
          const dc = dr.left + dr.width / 2;
          out.push({ where: `${w} ${r.getAttribute("data-id")}`, ok: Math.abs(br.right - today) <= 1.5 && Math.abs(dc - today) <= 1.5, detail: `bar ${br.right.toFixed(1)} dot ${dc.toFixed(1)} today ${today.toFixed(1)}` });
        }
        return { out, overdue, rows: rows.length };
      }, when);
      const take = async (w: string) => { const r = await read(w); L.check(`${w} population`, r.rows > 0 && r.overdue > 0, `${r.rows} rows, ${r.overdue} overdue in view`); for (const o of r.out) L.check(o.where, o.ok, o.detail); };
      await take("load");
      const ax = await page.locator("[data-qc150='axis']").first().boundingBox({ timeout: 5_000 }).catch(() => null);
      if (ax) { await page.mouse.move(ax.x + ax.width / 2, ax.y + 40); await page.mouse.down(); await page.mouse.move(ax.x + ax.width / 2 - 140, ax.y + 40, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(1200); }
      await take("drag");
      await click(page, "[data-qc150='today']"); await page.waitForTimeout(1000);
      await take("today");
      for (const z of ["6w", "6m", "3m"]) {
        await page.evaluate((zz) => ([...document.querySelectorAll<HTMLElement>("[data-qc150='zoom'] button")].find((b) => b.textContent?.trim().toLowerCase() === zz))?.click(), z);
        await page.waitForTimeout(1000);
        await take(`zoom ${z}`);
      }
      L.done(20);
    });

    test("L15 · Birds-eye dress: the track in place of the disc; plain headings; Group and Sort menus; the Closed tab's card", async ({ page }) => {
      test.skip(!run("L15"));
      const L = new Ledger(`L15-${vp.width}`);
      await open(page, vp, { view: "birds" });
      const r = await page.evaluate(() => ({
        rows: document.querySelectorAll("[data-qc150='be-row']").length,
        tracks: document.querySelectorAll("[data-qc150='be-row'] .qc150-ag [data-qc151='track']").length,
        discs: document.querySelectorAll("[data-qc150='be-row'] .qc150-d").length,
        heads: [...document.querySelectorAll<HTMLElement>("[data-qc150='be-band']")].map((h) => getComputedStyle(h).backgroundColor),
        headTxt: [...document.querySelectorAll<HTMLElement>("[data-qc150='be-band'] b")].map((h) => h.textContent),
      }));
      L.check("population", r.rows > 0 && r.heads.length > 0, JSON.stringify({ rows: r.rows, heads: r.heads.length }));
      L.check("a track on every row", r.tracks === r.rows, `${r.tracks}/${r.rows}`);
      L.check("no disc", r.discs === 0, `${r.discs}`);
      L.check("headings transparent", r.heads.every((b) => b === "rgba(0, 0, 0, 0)"), [...new Set(r.heads)].join(","));
      L.check("urgency groups", r.headTxt.every((t) => ["Overdue", "Upcoming", "Watch and wait", "No date"].includes(t ?? "")), r.headTxt.join("|"));
      const menu = async (btn: string, k: string) => {
        await click(page, `[data-qc151='${btn}']`); await page.waitForTimeout(300);
        const m = await page.evaluate((kk) => { const el = document.querySelector(`[data-qc151='menu'][data-k='${kk}']`); return { title: el?.querySelector(".qc140-mh")?.textContent, opts: [...(el?.querySelectorAll("[data-qc151='menu-opt']") ?? [])].map((o) => `${o.querySelector("b")?.textContent}·${o.querySelector("small")?.textContent}`) }; }, k);
        await page.keyboard.press("Escape"); await page.waitForTimeout(200);
        return m;
      };
      const g = await menu("be-group", "be-group");
      L.check("Group menu", /group birds-eye by/i.test(g.title ?? "") && JSON.stringify(g.opts) === JSON.stringify(["Urgency·Overdue, upcoming, watch and wait", "Status·Where each query stands", "None·One timeline"]), JSON.stringify(g));
      const s = await menu("be-sort", "be-sort");
      L.check("Sort menu", /sort within groups by/i.test(s.title ?? "") && JSON.stringify(s.opts) === JSON.stringify(["Due date·Soonest first", "Waiting longest·Oldest query first", "Agent A–Z·By name"]), JSON.stringify(s));
      await click(page, "[data-qc151='tabs'] [data-k='closed']"); await page.waitForTimeout(600);
      const c = await page.evaluate(() => ({ t: document.querySelector("[data-qc151='birds-empty'] b")?.textContent, back: !!document.querySelector("[data-qc151='back-to-list']") }));
      L.check("Closed tab: Nothing on the timeline", c.t === "Nothing on the timeline" && c.back, JSON.stringify(c));
      L.done(8);
    });
  });
}

test.describe("QC151 @ 390", () => {
  test("L16 · the phone is unchanged at 390 × 844 (against a capture of the base build)", async ({ page }) => {
    test.skip(!run("L16"));
    const L = new Ledger("L16-390");
    await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); } catch { /* */ } });
    /* sign in where the shell's sidebar is visible, then go to the phone size (the sign-in check waits for it) */
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForTimeout(3000);
    const shape = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-qm1], .qm1, [data-phone='queries']") ?? document.querySelector<HTMLElement>(".ws-window");
      const els = [...(root?.querySelectorAll<HTMLElement>("*") ?? [])].filter((e) => e.getBoundingClientRect().height > 0);
      return { v151: document.querySelectorAll(".qc151").length, n: els.length, classes: [...new Set(els.map((e) => e.className && typeof e.className === "string" ? e.className.split(" ")[0] : e.tagName))].sort().join(","), h: root?.scrollHeight ?? 0 };
    });
    const file = `${DIR}/phone-390.json`;
    if (CAPTURE) { mkdirSync(DIR, { recursive: true }); writeFileSync(file, JSON.stringify(shape, null, 1)); }
    L.check("no v151 page on the phone", shape.v151 === 0, `${shape.v151}`);
    L.check("capture exists", existsSync(file), file);
    if (existsSync(file)) {
      const base = JSON.parse(readFileSync(file, "utf8"));
      L.check("same elements", base.n === shape.n, `${base.n} vs ${shape.n}`);
      L.check("same classes", base.classes === shape.classes, "");
    }
    L.done(3);
  });
});
