/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workspace width v2 (8 Nov) — the BEFORE / AFTER tables, on the rendered page.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/workspaceWidth.measure.ts --project=measure --workers=1`.
 * WW2_OUT=<dir> writes the readings, one file per test (a failing test restarts the worker, which would lose a shared list); WW2_SHOTS=<dir> writes screenshots; WW2_PART=pages|panels picks a half.
 * WW2_GATES=1 asserts the gates (after the change); without it the run only records.
 */
import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import { openRoute } from "./measure";

const OUT = process.env.WW2_OUT ?? "";
const SHOTS = process.env.WW2_SHOTS ?? "";
const PART = process.env.WW2_PART ?? "";
const GATES = process.env.WW2_GATES === "1";

export const WORKSPACE = [
  "/dashboard", "/queries", "/queries/analytics", "/queries/responses", "/queries/packages",
  "/agents", "/agents/discover", "/manuscripts", "/manuscripts/comps", "/manuscripts/versions",
  "/materials/letters", "/todo", "/todo/corkboard",
];
export const READING = ["/account", "/plans", "/help", "/import"];
const SIZES = [
  { width: 1440, height: 900 }, { width: 1653, height: 862 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 },
];

type Box = { l: number; r: number; t: number; b: number; w: number };
interface PageReading {
  route: string; size: string; open: boolean;
  sheet: Box | null; col: Box | null; ink: Box | null; title: Box | null; bar: Box | null;
  firstY: number | null; todoRowY: number | null; hscroll: number;
}

async function readPage(page: Page): Promise<Omit<PageReading, "route" | "size" | "open">> {
  return page.evaluate(() => {
    const vis = (e: Element | null | undefined): e is HTMLElement => {
      if (!e) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== "hidden";
    };
    const box = (b: DOMRect | { left: number; right: number; top: number; bottom: number }) =>
      ({ l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.right - b.left });
    const first = (sel: string) => [...document.querySelectorAll(sel)].find(vis) as HTMLElement | undefined;
    const sheetEl = first(".ws-window");
    const sh = sheetEl?.getBoundingClientRect();
    /* the column: the content box of the visible scroller's child that holds the page */
    let col: ReturnType<typeof box> | null = null;
    const host = [...document.querySelectorAll(".wpg-scroll > *")].find((e) => vis(e) && !e.matches(".wpg-chrome, .wpg-spacer, .sheet-lip, .p41-fb, [aria-hidden='true']")) as HTMLElement | undefined;
    if (host) {
      const b = host.getBoundingClientRect(); const cs = getComputedStyle(host);
      col = box({ left: b.left + parseFloat(cs.paddingLeft), right: b.right - parseFloat(cs.paddingRight), top: b.top, bottom: b.bottom });
    }
    /* the ink: every visible text run and replaced element in the sheet, outside fixed layers and full-bleed bands */
    let ink: ReturnType<typeof box> | null = null;
    if (sheetEl && sh) {
      let L = Infinity, R = -Infinity, T = Infinity, B = -Infinity;
      const fixed = (e: Element) => { for (let n: Element | null = e; n && n !== sheetEl; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === "fixed") return true; } return false; };
      const add = (r: DOMRect) => {
        if (r.width < 1 || r.height < 1 || r.right < sh.left || r.left > sh.right || r.bottom < sh.top || r.top > sh.bottom) return;
        if (r.width >= sh.width - 4) return;
        L = Math.min(L, r.left); R = Math.max(R, r.right); T = Math.min(T, r.top); B = Math.max(B, r.bottom);
      };
      const walker = document.createTreeWalker(sheetEl, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const p = n.parentElement; if (!p || !n.textContent?.trim() || !vis(p) || fixed(p)) continue;
        if (p.closest(".ws-pagebar, [aria-hidden='true'], .wpg-hem")) continue;
        /* the nearest clipping ancestor: text outside it is not on the page (a carousel's later cards) */
        let clip: DOMRect | null = null;
        for (let a = p.parentElement; a && a !== sheetEl; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o !== "visible") { clip = a.getBoundingClientRect(); break; } }
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) if (!clip || (r.right > clip.left + 1 && r.left < clip.right - 1)) add(r);
      }
      for (const e of sheetEl.querySelectorAll("img, svg, input, textarea")) if (vis(e) && !fixed(e) && !e.closest(".ws-pagebar")) add(e.getBoundingClientRect());
      if (L < Infinity) ink = box({ left: L, right: R, top: T, bottom: B });
    }
    const tEl = first("[data-page-title]");
    const title = tEl ? box(tEl.getBoundingClientRect()) : null;
    const barEl = first(".wpg-barin");
    const bar = barEl ? box(barEl.getBoundingClientRect()) : null;
    /* first content below the header: the first text below the bottom of the element that holds the title */
    let firstY: number | null = null;
    if (tEl && sheetEl) {
      const head = (tEl.closest("header, .hp3, .wsh, .ph, [data-own-header]") as HTMLElement | null) ?? tEl;
      const hb = head.getBoundingClientRect().bottom;
      const walker = document.createTreeWalker(sheetEl, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const p = n.parentElement; if (!p || !n.textContent?.trim() || !vis(p) || head.contains(p)) continue;
        const r = p.getBoundingClientRect();
        if (r.top > hb + 1 && (firstY === null || r.top < firstY)) firstY = r.top;
      }
    }
    const tr = first(".tws-ti, .tws-si");
    const scr = [...document.querySelectorAll(".wpg-scroll, .ws-wbody")].filter(vis) as HTMLElement[];
    return {
      sheet: sh ? box(sh) : null, col, ink, title, bar, firstY,
      todoRowY: tr ? tr.getBoundingClientRect().top : null,
      hscroll: Math.max(0, document.documentElement.scrollWidth - innerWidth, ...scr.map((s) => s.scrollWidth - s.clientWidth)),
    };
  });
}

/** the gap between the last content block in a panel and the top of its button footer */
async function footerGap(page: Page, root: string, foot: string): Promise<{ gap: number | null; panelH: number | null; footTop: number | null; note: string }> {
  return page.evaluate(({ root, foot }) => {
    const vis = (e: Element | null | undefined): e is HTMLElement => { if (!e) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
    const R = [...document.querySelectorAll(root)].find(vis) as HTMLElement | undefined;
    if (!R) return { gap: null, panelH: null, footTop: null, note: `no ${root}` };
    const F = [...R.querySelectorAll(foot)].filter(vis).pop() as HTMLElement | undefined;
    if (!F) return { gap: null, panelH: R.getBoundingClientRect().height, footTop: null, note: `no ${foot}` };
    const ft = F.getBoundingClientRect().top;
    let low = -Infinity;
    const walker = document.createTreeWalker(R, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentElement; if (!p || !n.textContent?.trim() || !vis(p) || F.contains(p)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (r.bottom <= ft + 1 && r.height > 1) low = Math.max(low, r.bottom);
    }
    for (const e of R.querySelectorAll("input, textarea, button, img, svg, [role='radio'], [role='button']")) {
      if (!vis(e) || F.contains(e)) continue; const b = e.getBoundingClientRect(); if (b.bottom <= ft + 1) low = Math.max(low, b.bottom);
    }
    return { gap: low > -Infinity ? ft - low : null, panelH: R.getBoundingClientRect().height, footTop: ft, note: "" };
  }, { root, foot });
}

const pinned = (page: Page, open: boolean) => page.addInitScript((p) => {
  try { localStorage.setItem("scriptally:sidebar-pinned", p ? "1" : "0"); localStorage.removeItem("sa.pinList.queries"); localStorage.removeItem("sa.pinList.agents"); } catch { /* */ }
}, open);

const rows: unknown[] = [];
let fileName = "";
const save = () => { if (OUT && fileName) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(`${OUT}/${fileName}.json`, JSON.stringify(rows, null, 1)); } };
test.beforeEach(({}, info) => { rows.length = 0; fileName = info.title.replace(/[^\w]+/g, "_"); });
let assertions = 0;
const check = (ok: boolean, msg: string) => { assertions++; expect.soft(ok, msg).toBe(true); };

if (PART !== "panels") for (const s of SIZES) for (const open of [true, false]) {
  test(`WW2 pages ${s.width}×${s.height} ${open ? "open" : "collapsed"}`, async ({ page }) => {
    test.setTimeout(900_000);
    await pinned(page, open);
    for (const route of [...WORKSPACE, ...READING]) {
      await openRoute(page, route, s);
      await page.waitForTimeout(1200);
      const r = await readPage(page);
      const reading: PageReading = { route, size: `${s.width}×${s.height}`, open, ...r };
      rows.push(reading); save();
      if (SHOTS && (s.width === 1653 || s.width === 2560 || route === "/todo") && open) {
        await page.screenshot({ path: `${SHOTS}/${route.replace(/\//g, "_").slice(1)}-${s.width}.png` });
      }
      if (GATES && WORKSPACE.includes(route) && r.sheet && r.col) {
        const tag = `${route} ${s.width} ${open ? "open" : "col"}`;
        /* Submission packages keeps a 118px right-hand clearance for its fixed corner hawk (pk41.css) */
        const want = Math.min(r.sheet.w, 1660) - 64 - (route === "/queries/packages" ? 118 : 0);
        const KNOWN: Record<string, string> = { "/queries/analytics": "the light header's own frame (pre-existing; flagged, header design out of scope)", "/queries/packages": "the hawk and the founding strip sit outside the content by design", "/queries/responses": "the carousel's later cards run past the column, as they did before (pre-existing)" };
        check(Math.abs(r.col.w - want) <= 1.5, `${tag}: column ${r.col.w.toFixed(1)} vs ${want}`);
        if (route !== "/queries/packages") check(Math.abs((r.col.l - r.sheet.l) - (r.sheet.r - r.col.r)) <= 1.5, `${tag}: centred`);
        if (r.ink && !KNOWN[route]) check(r.ink.l >= r.col.l - 1.5 && r.ink.r <= r.col.r + 1.5, `${tag}: ink ${r.ink.l.toFixed(1)}–${r.ink.r.toFixed(1)} outside the column ${r.col.l.toFixed(1)}–${r.col.r.toFixed(1)}`);
        check(r.hscroll <= 1, `${tag}: sideways overflow ${r.hscroll}`);
      }
    }
    if (GATES) expect(assertions).toBeGreaterThan(20);
  });
}

/* ── panels and drawers: the gap between the content and the buttons ──────────────────────────── */
const PANEL_SIZES = SIZES.filter((s) => s.width >= 1920 || s.width === 1653);
if (PART !== "pages") for (const s of PANEL_SIZES) {
  test(`WW2 panels ${s.width}×${s.height}`, async ({ page }) => {
    test.setTimeout(900_000);
    await pinned(page, true);
    const out: Record<string, unknown> = { size: `${s.width}×${s.height}` };
    const shot = async (n: string) => { if (SHOTS && s.width === 1920) await page.screenshot({ path: `${SHOTS}/panel-${n}-${s.width}.png` }); };
    const tryIt = async (name: string, fn: () => Promise<unknown>) => {
      try { out[name] = await fn(); } catch (e) { out[name] = { error: String(e).slice(0, 200) }; }
      rows.push({ panel: name, size: out.size, ...(out[name] as object) }); save();
    };

    /* To-do: the desk, and the first "Send your full" task in it */
    await openRoute(page, "/todo", s);
    await page.waitForTimeout(1500);
    await tryIt("todo-desk", async () => { await shot("todo-desk"); return footerGap(page, ".tws-wcol", ".tws-wf"); });
    await tryIt("todo-sendfull", async () => {
      const hit = page.locator(".tws-ti", { hasText: /^Send .*full/i }).first();
      if (!(await hit.count())) return { gap: null, note: "no Send your full task on this account" };
      await hit.click(); await page.waitForTimeout(900); await shot("todo-sendfull");
      return footerGap(page, ".tws-wcol", ".tws-wf");
    });
    await tryIt("todo-agentcard", async () => page.evaluate(() => {
      const side = [...document.querySelectorAll(".tws-wbody > :not(.tws-wcol)")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      if (!side) return { note: "no side card" };
      const kids = [...side.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().height > 0);
      const last = Math.max(...kids.map((e) => e.getBoundingClientRect().bottom));
      return { cardBottom: side.getBoundingClientRect().bottom, lastItemBottom: last, gap: side.getBoundingClientRect().bottom - last };
    }));
    await tryIt("todo-addtask", async () => {
      await page.locator(".tws-addb >> visible=true").first().click(); await page.waitForTimeout(700); await shot("todo-addtask");
      return footerGap(page, ".tws-wcol", ".tws-wf, [class*='foot'], .tws-nf");
    });

    /* Query Centre: the open query */
    await openRoute(page, "/queries", s);
    await tryIt("qc-panel", async () => {
      await page.locator("[data-qc151='row'] >> visible=true").first().locator("td").first().click();
      await page.locator("[data-qp='panel'] >> visible=true").first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(900); await shot("qc-panel");
      return footerGap(page, "[data-qp='panel']", ".qc152-rb");
    });

    /* Contact list: the agent card, then its editor */
    await openRoute(page, "/agents", s);
    await tryIt("cl-panel", async () => {
      await page.locator(".aglist [data-cl26='row'] >> visible=true").first().locator("[data-cl26='name']").click();
      await page.locator("[data-cl262='panel'] >> visible=true").first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(900); await shot("cl-panel");
      return footerGap(page, "[data-cl262='panel']", "[class*='foot'], [class*='ft'], .apn-actslot");
    });

    /* the shared action drawer: Log a query from the top bar */
    await tryIt("log-drawer", async () => {
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await page.locator(".ws-pagebar button", { hasText: /Log a query/i }).first().click();
      await page.locator(".spanel >> visible=true").first().waitFor({ timeout: 10_000 });
      await page.locator(".spanel >> visible=true").first().getByText(/^Choose$/i).first().click();
      await page.waitForTimeout(1200); await shot("log-drawer");
      return footerGap(page, ".spanel", ".qc149c-mft");
    });
    /* Contact list: + Add an agent (the card's editor, empty), and Housekeeping */
    await openRoute(page, "/agents", s);
    await tryIt("cl-add", async () => {
      await page.locator("button >> visible=true", { hasText: /^\+ Add an agent/ }).first().click();
      await page.waitForTimeout(1200); await shot("cl-add");
      return footerGap(page, ".spanel", "[class*='foot'], [class*='-ft']");
    });
    await openRoute(page, "/agents", s);
    await tryIt("housekeeping", async () => {
      await page.locator("button >> visible=true", { hasText: /^Open$/ }).first().click({ timeout: 10_000 });
      await page.locator(".hdr >> visible=true").first().waitFor({ timeout: 10_000 });
      await page.waitForTimeout(1200); await shot("housekeeping");
      return footerGap(page, ".hdr", ".hdr-foot");
    });
    console.log(`[WW2 panels ${s.width}] ` + JSON.stringify(out));
  });
}
