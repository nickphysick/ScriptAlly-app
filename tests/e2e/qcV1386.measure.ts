/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.6 — the QC138.6 locks, on the Query Centre and the Contact list, at 1512 × 900 and 1280 × 800
 * with the shell.
 *
 * A1 one hook (the rendered half; the source half is src/components/shell/pinList.test.ts) · A2 keys · A3 remembered ·
 * A4 scroll · A5 tooltip · B1 sticky stack · B2 one bar · B3 no jitter · C1 letters.
 *
 * Page-side breaks through `QC1386_MUTATE=<lock>`; the source breaks through tests/e2e/qcV1386Mutate.sh.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: each query starts from the page's visible group, never `document` alone (the
 *    Query Centre's hidden pin button is the first `[data-pin-list]` in the document while /agents is on screen).
 * ⚠️ B1's GAP CHECK IS PAINT: the strip between the sheet's top and the navy header is photographed with the rows shown
 *    and with them hidden; the two must be identical (no row pixel shows through).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { decode } from "fast-png";
import { openRoute } from "./measure";

const DIR = "reports/qc-v138-6";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const MUT = process.env.QC1386_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

/* RE-POINTED by Contact list v19 (reports/contact-list-v19/REPORT.md): the Contact list's filter panel is v19's menu
   (`panel`); its sticky stack is the list head ([data-cl19="head"]: the band pinned, the toolbar always), held at the
   scroll area's top (`stack`, `stackTop` 0) where the Query Centre's sits 12 under the sheet; its pin is the toolbar's
   labelled button (no PinListButton, no tooltip) and no longer holds the sidebar at its icons (`holdsRail`). */
interface PageDef { key: "queries" | "agents"; route: string; group: string; pin: string; head: string; heads: string; band: string | null; hd: string; filters: string; find: string; rows: string; panel: string; stack: string; stackTop: number; holdsRail: boolean }
const PAGES: PageDef[] = [
  { key: "queries", route: "/queries", group: ".qcv-group[data-v138]", pin: '[data-qc138="pin"]', head: '[data-qc138="top"]', heads: '[data-qc138="headings"]', band: '[data-qcv="gband"]', hd: '[data-qc138="header"]', filters: '[data-qc138="filters-btn"]', find: '[data-qc138="search"] input', rows: '[data-qcv="row"]', panel: '[data-qc138="filters-panel"]', stack: '[data-qc138="top"]', stackTop: 12, holdsRail: true },
  { key: "agents", route: "/agents", group: ".clv-group", pin: '[data-cl16="full"]', head: '[data-cl18="list-header"]', heads: ".lt-panel > .lt-labels", band: null, hd: '[data-cl17="header"]', filters: '[data-cl18="filters"]', find: '[data-cl13-find="banner"] input', rows: '[data-clv="row"]', panel: '[data-cl19="filter-menu"]', stack: '[data-cl19="head"]', stackTop: 0, holdsRail: false },
];

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  A5: { js: `document.querySelectorAll("[data-pin-list]").forEach((b) => b.setAttribute("title", b.getAttribute("aria-label") || ""))` },
  B1: { css: `.qc138-sheet .qc138-heads { top: 0 !important; } .clv-group .cl16-list .lt-labels { top: 0 !important; }` },
  B2: { js: `(() => { const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); sc.addEventListener("scroll", () => { if (!document.querySelector(".pin-row")) { const d = document.createElement("div"); d.className = "pin-row"; d.setAttribute("data-on", ""); document.querySelector(".ws-window").appendChild(d); } }); })()` },
  B3: { js: `(() => { const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); const on = () => { const h = [...document.querySelectorAll('[data-qc138="top"], [data-cl18="list-header"]')].find((e) => e.getBoundingClientRect().height > 0); if (!h) return; const top = h.getBoundingClientRect().top - sc.getBoundingClientRect().top; h.style.paddingTop = top <= 12.5 ? "26px" : ""; }; sc.addEventListener("scroll", on); })()` },
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
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** clears both pages' remembered pins, so every case starts unpinned */
const CLEAR = `try { for (const k of ["sa.pinList.queries", "sa.pinList.agents", "sa.contactsFull", "qh.cl.view"]) localStorage.removeItem(k); } catch { /* */ }`;

async function open(page: Page, p: PageDef, vp: { width: number; height: number }, lock: string, opts: { keepPins?: boolean } = {}) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, p.route, vp);
  if (!opts.keepPins) {
    await page.evaluate(CLEAR);
    if (new URL(page.url()).searchParams.get("full") === "1") { await page.goto(p.route); }
  }
  await page.locator(p.group).first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (m?.js) await page.evaluate(m.js);
}
const vis = (p: PageDef, sel: string) => `${p.group} ${sel}`;
const pinned = (page: Page, p: PageDef) => page.evaluate((s) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0)?.getAttribute("aria-pressed") ?? null, vis(p, p.pin));
const scrollTo = (page: Page, p: PageDef, y: number) => page.evaluate(([g, top]) => {
  const grp = [...document.querySelectorAll<HTMLElement>(g as string)].find((e) => e.getBoundingClientRect().width > 0)!;
  const sc = grp.closest<HTMLElement>(".wpg-scroll")!; sc.style.scrollBehavior = "auto"; sc.scrollTop = top as number;
}, [p.group, y] as const);
const scrollTop = (page: Page, p: PageDef) => page.evaluate((g) => [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!.closest<HTMLElement>(".wpg-scroll")!.scrollTop, p.group);
/* ⚠️ PRESS THE PIN ON THE ELEMENT, NOT THROUGH PLAYWRIGHT'S CLICK: Playwright scrolls a target into view first, and
   for a stuck sticky header that scrolls the page to the header's STATIC position (761 from 1200, measured), so the
   hook rightly remembered the wrong place. A reader's click scrolls nothing. */
const pressPin = (page: Page, p: PageDef) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().width > 0)!.click(), vis(p, p.pin));
const clickPin = async (page: Page, p: PageDef) => { await pressPin(page, p); await page.waitForTimeout(800); await page.mouse.move(5, 5); };

test.describe("QC138.6", () => {
  test("A1 · one hook: both pages draw PinListButton", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("A1");
    for (const p of PAGES) {
      await open(page, p, SIZES[0], "A1");
      const r = await page.evaluate((s) => { const b = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().width > 0); return b ? { plb: b.classList.contains("plb") && b.hasAttribute("data-pin-list"), own: b.hasAttribute("data-pin-list") && b.getAttribute("data-cl19") === "pin", keys: b.getAttribute("aria-keyshortcuts") } : null; }, vis(p, p.pin));
      L.check("A1", `${p.key} ${p.key === "agents" ? "the toolbar's pin (v19 §A)" : "PinListButton"}`, p.key === "agents" ? r?.own : r?.plb, JSON.stringify(r));
      L.check("A1", `${p.key} aria-keyshortcuts F`, r?.keys === "F", `${r?.keys}`);
    }
    L.done(4);
  });

  test("A2 · keys: F pins and unpins; not in the search; Esc closes what is open first", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("A2");
    for (const p of PAGES) {
      await open(page, p, SIZES[0], "A2");
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press("f"); await page.waitForTimeout(700);
      L.check("A2", `${p.key} F pins`, (await pinned(page, p)) === "true", `${await pinned(page, p)}`);
      await page.keyboard.press("f"); await page.waitForTimeout(700);
      L.check("A2", `${p.key} F unpins`, (await pinned(page, p)) === "false", `${await pinned(page, p)}`);
      const find = page.locator(vis(p, p.find)).first();
      await find.click(); await page.keyboard.type("f"); await page.waitForTimeout(500);
      L.check("A2", `${p.key} F in the search does nothing`, (await pinned(page, p)) === "false" && (await find.inputValue()) === "f", `${await pinned(page, p)} · "${await find.inputValue()}"`);
      await find.fill(""); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      /* pinned, with the Filters panel open: Esc closes the panel only; a second Esc unpins */
      await clickPin(page, p);
      await page.locator(vis(p, p.filters)).first().click(); await page.waitForTimeout(500);
      const panel = p.panel;
      L.check("A2", `${p.key} the Filters panel opened`, await page.locator(panel).count() > 0, "");
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      L.check("A2", `${p.key} Esc closes the panel, still pinned`, (await page.locator(panel).count()) === 0 && (await pinned(page, p)) === "true", `panel ${await page.locator(panel).count()} · pinned ${await pinned(page, p)}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(800);
      L.check("A2", `${p.key} the second Esc unpins`, (await pinned(page, p)) === "false", `${await pinned(page, p)}`);
      if (p.key === "agents") {
        /* the agent panel takes Esc first */
        await clickPin(page, p);
        await page.locator(vis(p, p.rows)).first().click(); await page.waitForTimeout(900);
        const open1 = await page.locator(".qsp.apn").count();
        L.check("A2", "agents: the agent panel opened", open1 > 0, `${open1}`);
        await page.keyboard.press("Escape"); await page.waitForTimeout(800);
        L.check("A2", "agents: Esc closes the agent panel only", (await page.locator(".qsp.apn:visible").count()) === 0 && (await pinned(page, p)) === "true", `panel ${await page.locator(".qsp.apn:visible").count()} · pinned ${await pinned(page, p)}`);
        await page.keyboard.press("Escape"); await page.waitForTimeout(700);
      }
    }
    L.done(14);
  });

  test("A3 · remembered per page, restored with no transition", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("A3");
    await page.addInitScript(() => {
      const w: number[] = []; (window as never as { __w: number[] }).__w = w;
      const hd: boolean[] = []; (window as never as { __hd: boolean[] }).__hd = hd;
      const tick = () => {
        const p = document.querySelector<HTMLElement>(".ws-panel"); if (p) w.push(Math.round(p.getBoundingClientRect().width));
        const h = [...document.querySelectorAll<HTMLElement>('[data-qc138="header"], [data-cl17="header"]')].some((e) => e.getBoundingClientRect().height > 0);
        if (p) hd.push(h);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const rail = 68;
    for (const p of PAGES) {
      await open(page, p, SIZES[0], "A3");
      await clickPin(page, p);
      await page.reload(); await page.locator(p.group).first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(2500);
      const r = await page.evaluate(() => ({ w: (window as never as { __w: number[] }).__w, hd: (window as never as { __hd: boolean[] }).__hd }));
      L.check("A3", `${p.key} loads pinned`, (await pinned(page, p)) === "true", `${await pinned(page, p)}`);
      const want = p.holdsRail ? rail : r.w[0];
      L.check("A3", `${p.key} ${p.holdsRail ? "the rail" : "the sidebar as it is"} on every frame from the first (no sidebar transition)`, r.w.length > 10 && r.w.every((x) => near(x, want, 1)), `${[...new Set(r.w)].join(",")} over ${r.w.length} frames`);
      L.check("A3", `${p.key} no header flash`, r.hd.every((x) => !x), `${r.hd.filter(Boolean).length} frames with the header`);
      /* each page keeps its own: the other page is not pinned */
      const other = PAGES.find((o) => o !== p)!;
      await page.goto(other.route); await page.locator(other.group).first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(1500);
      L.check("A3", `${p.key} pinned does not pin ${other.key}`, (await pinned(page, other)) === "false", `${await pinned(page, other)}`);
      await page.goto(p.route); await page.locator(p.group).first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(1500);
      await clickPin(page, p);
      L.check("A3", `${p.key} unpinned`, (await pinned(page, p)) === "false", `${await pinned(page, p)}`);
      await page.reload(); await page.locator(p.group).first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(2000);
      L.check("A3", `${p.key} unpin, reload: unpinned`, (await pinned(page, p)) === "false", `${await pinned(page, p)}`);
    }
    L.done(12);
  });

  test("A4 · scroll: 1200, pin, unpin → 1200 ±2", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A4");
    for (const p of PAGES) for (const vp of SIZES) {
      await open(page, p, vp, "A4");
      await scrollTo(page, p, 1200); await page.waitForTimeout(400);
      const y0 = await scrollTop(page, p);
      await clickPin(page, p);
      const yp = await scrollTop(page, p);
      await pressPin(page, p); await page.waitForTimeout(1200); await page.mouse.move(5, 5);
      const y1 = await scrollTop(page, p);
      L.check("A4", `${p.key} ${vp.width} scrolled to 1200 first`, near(y0, 1200, 1), `${y0}`);
      L.check("A4", `${p.key} ${vp.width} pinning puts the list at the top`, yp === 0, `${yp}`);
      L.check("A4", `${p.key} ${vp.width} unpinning returns to 1200 ±2`, near(y1, 1200, 2), `${y1}`);
    }
    L.done(12);
  });

  test("A5 · tooltip: 'Pin the list' + F; pinned 'Unpin' + F; no title", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A5");
    /* v19 §A: the Contact list's pin is a labelled button ("Pin list" / "Unpin"), with no tooltip; this is the Query Centre's */
    for (const p of PAGES.filter((x) => x.key === "queries")) {
      await open(page, p, SIZES[0], "A5");
      const read = () => page.evaluate((s) => {
        const b = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().width > 0)!;
        const t = b.querySelector<HTMLElement>("[data-pin-tip]")!;
        return { label: t.querySelector(".plb-tl")?.textContent, key: t.querySelector("kbd")?.textContent, op: getComputedStyle(t).opacity, title: b.getAttribute("title") };
      }, vis(p, p.pin));
      await page.locator(vis(p, p.pin)).first().hover(); await page.waitForTimeout(300);
      const a = await read();
      L.check("A5", `${p.key} 'Pin the list' + F on hover`, a.op === "1" && a.label === "Pin the list" && a.key === "F", JSON.stringify(a));
      L.check("A5", `${p.key} no native title`, a.title === null, `${a.title}`);
      await page.locator(vis(p, p.pin)).first().click(); await page.waitForTimeout(800);
      await page.locator(vis(p, p.pin)).first().hover(); await page.waitForTimeout(300);
      const b = await read();
      L.check("A5", `${p.key} pinned: 'Unpin' + F`, b.op === "1" && b.label === "Unpin" && b.key === "F", JSON.stringify(b));
      L.check("A5", `${p.key} pinned: no native title`, b.title === null, `${b.title}`);
      await page.locator(vis(p, p.pin)).first().click(); await page.waitForTimeout(600);
    }
    L.done(4);
  });

  test("B1 · sticky stack: the navy header 12 under the sheet; the headings and the band under it; nothing shows through", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("B1");
    for (const p of PAGES) for (const vp of SIZES) for (const pin of [false, true]) {
      await open(page, p, vp, "B1");
      if (pin) await clickPin(page, p);
      await scrollTo(page, p, 1400); await page.waitForTimeout(600);
      const r = await page.evaluate(([g, hs, hds, bs]) => {
        const grp = [...document.querySelectorAll<HTMLElement>(g as string)].find((e) => e.getBoundingClientRect().width > 0)!;
        const sheet = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().width > 0)!.getBoundingClientRect();
        const h = [...grp.querySelectorAll<HTMLElement>(hs as string)].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
        const hd = grp.querySelector<HTMLElement>(hds as string)!.getBoundingClientRect();
        /* the current band: the stuck one, the last whose top sits at the headings' bottom or above */
        let band: DOMRect | null = null;
        if (bs) for (const b of grp.querySelectorAll<HTMLElement>(bs as string)) { const r = b.getBoundingClientRect(); if (r.height > 0 && r.top <= hd.bottom + 1) band = r; }
        return { sheetTop: sheet.top, hTop: h.top, hBottom: h.bottom, hdTop: hd.top, hdBottom: hd.bottom, bandTop: band ? band.top : null, sheetL: sheet.left, sheetR: sheet.right, hL: h.left, hR: h.right };
      }, [p.group, p.stack, p.heads, p.band] as const);
      const w = `${p.key} ${vp.width}${pin ? " pinned" : ""}`;
      L.check("B1", `${w} the sticky header ${p.stackTop} under the sheet`, near(r.hTop - r.sheetTop, p.stackTop, 1), (r.hTop - r.sheetTop).toFixed(1));
      L.check("B1", `${w} headings at the header's bottom`, near(r.hdTop, r.hBottom, 1), `${r.hdTop.toFixed(1)} vs ${r.hBottom.toFixed(1)}`);
      if (p.band) L.check("B1", `${w} the current band at the headings' bottom`, r.bandTop !== null && near(r.bandTop, r.hdBottom, 1), `${r.bandTop?.toFixed(1)} vs ${r.hdBottom.toFixed(1)}`);
      /* nothing shows between the sheet's top and the header: the strip is the same with the rows hidden */
      const clip = { x: r.hL + 2, y: r.sheetTop + 1, width: r.hR - r.hL - 4, height: Math.max(1, r.hTop - r.sheetTop + 18) };
      const a = decode(await page.screenshot({ clip }));
      await page.addStyleTag({ content: `${p.group} ${p.rows}, ${p.group} [data-qcv="gband"], ${p.group} .lt-div, ${p.group} .lt-gh { visibility: hidden !important; }` });
      await page.waitForTimeout(150);
      const b = decode(await page.screenshot({ clip }));
      let n = 0; for (let i = 0; i < a.data.length; i += a.channels) if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 6) n++;
      L.check("B1", `${w} no row pixel between the sheet's top and the header`, n === 0, `${n} pixels differ`);
    }
    L.done(28);
  });

  test("B2 · one bar: no old pinned bar on either page, scrolled or pinned", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("B2");
    for (const p of PAGES) for (const pin of [false, true]) {
      await open(page, p, SIZES[0], "B2");
      if (pin) await clickPin(page, p);
      await scrollTo(page, p, 1400); await page.waitForTimeout(600);
      const n = await page.evaluate(() => document.querySelectorAll('.pin-row, [data-qc138="pinned"], [data-cl17="pinned"], [data-pin-row]').length);
      L.check("B2", `${p.key}${pin ? " pinned" : ""} scrolled: no old bar in the DOM`, n === 0, `${n}`);
    }
    L.done(4);
  });

  test("B3 · no jitter: stepping 1px through the stick point and back", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("B3");
    for (const p of PAGES) {
      await open(page, p, SIZES[0], "B3");
      const stick = await page.evaluate(([g, hs]) => {
        const grp = [...document.querySelectorAll<HTMLElement>(g as string)].find((e) => e.getBoundingClientRect().width > 0)!;
        const sc = grp.closest<HTMLElement>(".wpg-scroll")!;
        return sc.scrollTop + grp.querySelector<HTMLElement>(hs as string)!.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12;
      }, [p.group, p.head] as const);
      const read = () => page.evaluate(([g, hs]) => {
        const grp = [...document.querySelectorAll<HTMLElement>(g as string)].find((e) => e.getBoundingClientRect().width > 0)!;
        const sc = grp.closest<HTMLElement>(".wpg-scroll")!; const h = grp.querySelector<HTMLElement>(hs as string)!.getBoundingClientRect();
        return { st: sc.scrollTop, top: h.top - sc.getBoundingClientRect().top, hh: h.height };
      }, [p.group, p.head] as const);
      const start = Math.round(stick) - 12, end = Math.round(stick) + 12;
      let bad = 0, worst = 0, held = true; let prev: { st: number; top: number; hh: number } | null = null;
      const seq = [...Array(end - start + 1).keys()].map((i) => start + i);
      for (const y of [...seq, ...seq.slice().reverse()]) {
        await scrollTo(page, p, y); await page.waitForTimeout(30);
        const r = await read();
        if (r.st !== y) held = false;
        const want = Math.max(12, Math.round(stick) + 12 - y);
        const d = Math.abs(r.top - want); worst = Math.max(worst, d); if (d > 1) bad++;
        if (prev && Math.abs(r.hh - prev.hh) > 0.5) bad++;
        prev = r;
      }
      L.check("B3", `${p.key} nothing jumps (±1) through the stick point`, bad === 0, `${bad} steps out, worst ${worst.toFixed(1)}px`);
      L.check("B3", `${p.key} scrollTop holds every step`, held, `${held}`);
    }
    L.done(4);
  });

  test("C1 · letters: clicking M lands the first M row just under the sticky stack", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C1");
    const p = PAGES[1];
    for (const vp of SIZES) {
      await open(page, p, vp, "C1");
      /* RE-POINTED by v19 §B: the only A to Z is the list toolbar's */
      await page.locator(vis(p, '[data-cl19="letter"][data-l="M"]')).first().click();
      await page.waitForTimeout(1600);
      const r = await page.evaluate((g) => {
        const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
        const row = [...grp.querySelectorAll<HTMLElement>('[data-clv="row"][data-initial="M"]')].find((e) => e.getBoundingClientRect().height > 0);
        const hd = grp.querySelector<HTMLElement>(".lt-panel > .lt-labels")!.getBoundingClientRect();
        return row ? { row: row.getBoundingClientRect().top, under: hd.bottom } : null;
      }, p.group);
      L.check("C1", `${vp.width} the first M row is within 4px under the stack`, r && r.row >= r.under - 0.5 && r.row - r.under <= 4, r ? `${(r.row - r.under).toFixed(1)}px under` : "no M row");
    }
    L.done(2);
  });
});
