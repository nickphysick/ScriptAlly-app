/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell tabs v2 (16 Nov; ref design-refs/shell-tabs-v2.html) — the ST2 locks, on the rendered page.
 * Report: reports/shell-tabs-v2/REPORT.md.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/shellTabsV2.measure.ts --project=measure --workers=1`.
 *
 * ⚠️ EVERY LOCK PROVES ITSELF IN THE SAME RUN. Each reading goes through a pure `problems()` function; the test asserts
 * the clean page has none, then applies the prompt's mutation in place (a stylesheet rule named in the test) and asserts
 * the same function now finds some. A lock that cannot see its own break fails. A lock whose subject is missing (no rail,
 * no tab, a population of zero) reports that as a problem, so it cannot pass by finding nothing.
 *
 * ⚠️ COLOURS ARE READ AS PIXELS wherever transparency could lie (the bar has no fill of its own; the rail's ground was a
 * gradient, which `background-color` reports as transparent).
 *
 * ST2_SHOTS=<dir> writes the top-left shots there.
 */
import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import { openRoute } from "./measure";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };

const WIDE = { width: 1512, height: 900 };
const NARROWER = { width: 1280, height: 800 };
const SIZES = [WIDE, NARROWER];
const SHOTS = process.env.ST2_SHOTS ?? "";

type Mode = "rail" | "pinned";
async function sidebarMode(page: Page, mode: Mode) {
  await page.addInitScript((m) => {
    try {
      localStorage.setItem("scriptally:sidebar-collapsed", m === "rail" ? "1" : "0");
      localStorage.setItem("scriptally:sidebar-pinned", m === "pinned" ? "1" : "0");
    } catch { /* first visit */ }
  }, mode);
}
async function addCss(page: Page, css: string): Promise<void> {
  await page.evaluate((c) => { const st = document.createElement("style"); st.dataset.st2Break = ""; st.textContent = c; document.head.appendChild(st); }, css);
  await page.waitForTimeout(250);
}
async function dropBreaks(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelectorAll("[data-st2-break]").forEach((e) => e.remove()));
  await page.waitForTimeout(250);
}

type RGB = [number, number, number];
/** The pixel at a CSS point (the clip's first device pixel). */
async function pixel(page: Page, x: number, y: number): Promise<RGB> {
  const png = PNG.sync.read(await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } }));
  return [png.data[0], png.data[1], png.data[2]];
}
const near = (a: RGB, b: RGB, tol = 2) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
const fmt = (a: RGB) => `rgb(${a.join(",")})`;
function parseRgb(s: string): RGB | null {
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return [+m[1], +m[2], +m[3]];
}
function alphaOf(s: string): number {
  const m = s.match(/rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*([\d.]+))?\)/);
  if (!m) return s === "transparent" ? 0 : 1;
  return m[1] === undefined ? 1 : +m[1];
}

/** The visible shell boxes every lock starts from. */
async function shell(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().width > 0;
    const pick = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find(vis) ?? null;
    const box = (e: HTMLElement | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const main = pick(".ws-main");
    const root = getComputedStyle(document.documentElement);
    return {
      inkToken: root.getPropertyValue("--ink-shell").trim(),
      panel: box(pick(".ws-panel")), bar: box(pick(".ws-pagebar")), win: box(pick(".ws-window")), search: box(pick(".ws-sfield")),
      mainBg: main ? getComputedStyle(main).backgroundColor : "",
      panelCss: (() => { const p = pick(".ws-panel"); if (!p) return null; const s = getComputedStyle(p); return { bg: s.backgroundColor, img: s.backgroundImage, shadow: s.boxShadow, br: s.borderRightWidth }; })(),
      winRadius: (() => { const w = pick(".ws-window"); return w ? getComputedStyle(w).borderTopLeftRadius : ""; })(),
      winRadiusTR: (() => { const w = pick(".ws-window"); return w ? getComputedStyle(w).borderTopRightRadius : ""; })(),
      /* the rail's mark or the pinned sidebar's: whichever is the one a reader sees (the other layer is opacity 0) */
      logo: (() => {
        const panel = pick(".ws-panel");
        const wide = panel?.classList.contains("sr-wide");
        const el = wide ? pick(".ws-panel .ws-pin .ws-logo .ws-bmark") : pick(".ws-panel .wsr .wsr-home img");
        return box(el);
      })(),
    };
  });
}
function hexToRgb(h: string): RGB { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/* ════════════════════════════════════════════ PHASE 1 · A1 A2 A3 ════════════════════════════════════════════ */

/** A1: rail and bar one ink, the bar's token; no edge line. Read as computed values AND as pixels. */
async function a1Problems(page: Page): Promise<string[]> {
  const s = await shell(page);
  const out: string[] = [];
  if (!s.panel || !s.bar || !s.panelCss) return ["no rail or no bar"];
  const ink = hexToRgb(s.inkToken);
  const mainBg = parseRgb(s.mainBg);
  if (!mainBg || !near(mainBg, ink, 0)) out.push(`the bar's ground ${s.mainBg} is not --ink-shell ${s.inkToken}`);
  const pBg = parseRgb(s.panelCss.bg);
  if (!pBg || alphaOf(s.panelCss.bg) < 1 || !near(pBg, ink, 0)) out.push(`the rail's background-color ${s.panelCss.bg} is not --ink-shell`);
  if (s.panelCss.img !== "none") out.push(`the rail paints an image: ${s.panelCss.img.slice(0, 60)}`);
  if (s.panelCss.shadow !== "none") out.push(`the rail draws a box-shadow: ${s.panelCss.shadow}`);
  if (parseFloat(s.panelCss.br) > 0) out.push(`the rail has a right border ${s.panelCss.br}`);
  /* pixels: the rail near its top (where the gradient was lightest), the rail's last column, and the bar — all one ink */
  const barPx = await pixel(page, s.bar.x + 2, s.bar.y + 6);
  const railTop = await pixel(page, s.panel.x + 3, s.panel.y + 2);
  const railEdge = await pixel(page, s.panel.x + s.panel.w - 1, s.bar.y + s.bar.h / 2);
  for (const [name, px] of [["the bar", barPx], ["the rail's top", railTop], ["the rail's right edge", railEdge]] as const) {
    if (!near(px, ink, 1)) out.push(`${name} reads ${fmt(px)}, not the ink ${fmt(ink)}`);
  }
  return out;
}
const A1_BREAK = `.ws-panel { background: linear-gradient(180deg, #232d3f 0, #1d2637 260px, #1b2433 520px) !important; box-shadow: inset -1px 0 0 rgba(244, 238, 229, 0.04) !important; }`;

/** A2: the sheet's top-left radius is 14 and the pixel 3px in from its corner is ink. */
async function a2Problems(page: Page): Promise<string[]> {
  const s = await shell(page);
  if (!s.win) return ["no sheet"];
  const out: string[] = [];
  if (s.winRadius !== "14px") out.push(`the sheet's top-left radius is ${s.winRadius}`);
  if (s.winRadiusTR !== "12px") out.push(`the sheet's top-right radius moved to ${s.winRadiusTR}`);
  const ink = hexToRgb(s.inkToken);
  const px = await pixel(page, s.win.x + 3, s.win.y + 3);
  if (!near(px, ink, 2)) out.push(`the pixel 3px into the corner reads ${fmt(px)}, not ink ${fmt(ink)}`);
  return out;
}
const A2_BREAK = `.ws-window { border-top-left-radius: 0 !important; }`;

/** A3: the logo's vertical centre equals the search field's, ±1. */
async function a3Problems(page: Page): Promise<string[]> {
  const s = await shell(page);
  if (!s.logo || !s.search) return [`no ${s.logo ? "search field" : "logo"}`];
  const lc = s.logo.y + s.logo.h / 2, sc = s.search.y + s.search.h / 2;
  return Math.abs(lc - sc) <= 1 ? [] : [`the logo's centre ${lc.toFixed(1)} is ${(lc - sc).toFixed(1)} from the search field's ${sc.toFixed(1)}`];
}
const A3_BREAK = `.wsr-lgo, .ws-panel .ws-pin .ws-logo { top: 0 !important; }`;

async function proveLock(page: Page, label: string, problems: (p: Page) => Promise<string[]>, breakCss: string, mustRed = true) {
  const clean = await problems(page);
  expect(clean, `${label} on the clean page`).toEqual([]);
  await addCss(page, breakCss);
  const broken = await problems(page);
  await dropBreaks(page);
  if (mustRed) expect(broken.length, `${label} must see its own mutation (${breakCss.slice(0, 80)}…)`).toBeGreaterThan(0);
  return broken;
}

for (const mode of ["rail", "pinned"] as const) {
  for (const size of SIZES) {
    test(`ST2-A1 A2 A3 · one ink, the corner, the logo — ${mode} at ${size.width}`, async ({ page }) => {
      test.setTimeout(240_000);
      await sidebarMode(page, mode);
      for (const route of ["/queries", "/materials/letters"]) {
        await openRoute(page, route, size);
        const log: string[] = [];
        log.push(`A1 ${route}: red ${JSON.stringify(await proveLock(page, `A1 ${route}`, a1Problems, A1_BREAK))}`);
        log.push(`A2 ${route}: red ${JSON.stringify(await proveLock(page, `A2 ${route}`, a2Problems, A2_BREAK))}`);
        /* ⚠️ THE PINNED SIDEBAR'S OLD OFFSET WAS 1.0px — INSIDE A3's OWN ±1 — so restoring it cannot turn A3 red there;
           the lock proves its red on the rail (4.0px) and, pinned, asserts the clean page and records the reading. */
        log.push(`A3 ${route}: red ${JSON.stringify(await proveLock(page, `A3 ${route}`, a3Problems, A3_BREAK, mode === "rail"))}`);
        console.log(`[ST2 ${mode} ${size.width}] ` + log.join("\n  "));
      }
    });
  }
}

/* ════════════════════════════════════════════ PHASE 2 · B1–B5 ════════════════════════════════════════════ */

interface TabR { id: string; cur: boolean; x: number; w: number; top: number; bottom: number; h: number; font: string; bg: string; text: string; sw: number; cw: number; mode: string }
async function readTabs(page: Page): Promise<{ tabs: TabR[]; win: { x: number; y: number; w: number } | null; bar: { y: number; b: number } | null; search: { x: number; r: number; w: number } | null; tools: number | null }> {
  return page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().width > 0;
    const pick = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find(vis) ?? null;
    const nav = pick('[data-shell="tabs"]');
    const tabs = nav ? [...nav.querySelectorAll<HTMLElement>("[data-tab], .ws-ftmore")].map((t) => {
      const r = t.getBoundingClientRect(); const s = getComputedStyle(t);
      const label = t.querySelector<HTMLElement>(".ws-ftn, .ws-fttl");
      return { id: t.dataset.tab ?? "more", cur: t.getAttribute("aria-current") === "page", x: r.left, w: r.width, top: r.top, bottom: r.bottom, h: r.height,
        font: s.fontSize, bg: s.backgroundColor, text: (label?.textContent ?? "").trim(), sw: label ? label.scrollWidth : 0, cw: label ? label.clientWidth : 0,
        mode: t.classList.contains("ws-ftmore") ? "more" : (t.dataset.mode ?? (t.classList.contains("is-cur") ? "cur" : "full")) };
    }) : [];
    const w = pick(".ws-window")?.getBoundingClientRect();
    const b = pick(".ws-pagebar")?.getBoundingClientRect();
    const sf = pick(".ws-sfield")?.getBoundingClientRect();
    const br = pick(".ws-bright")?.getBoundingClientRect();
    return { tabs, win: w ? { x: w.left, y: w.top, w: w.width } : null, bar: b ? { y: b.top, b: b.bottom } : null,
      search: sf ? { x: sf.left, r: sf.right, w: sf.width } : null, tools: br ? br.left : null };
  });
}
/** Park the pointer where it hovers nothing (the sheet's bottom-right), so "at rest" is at rest. */
async function park(page: Page) { const v = page.viewportSize()!; await page.mouse.move(v.width - 30, v.height - 30); await page.waitForTimeout(200); }

/** B1: every tab 40 tall, 17px; the first tab's left is the sheet's left + 24. */
async function b1Problems(page: Page): Promise<string[]> {
  const r = await readTabs(page);
  if (!r.win || r.tabs.length === 0) return ["no tabs or no sheet"];
  const out: string[] = [];
  for (const t of r.tabs.filter((x) => x.mode !== "more")) {
    if (Math.abs(t.h - 40) > 0.5) out.push(`${t.id} is ${t.h.toFixed(1)} tall`);
    if (t.font !== "17px") out.push(`${t.id} sets ${t.font}`);
  }
  const first = r.tabs[0];
  if (Math.abs(first.x - (r.win.x + 24)) > 1) out.push(`the first tab starts at ${(first.x - r.win.x).toFixed(1)} from the sheet, not 24`);
  return out;
}
const B1_BREAK = `.ws-fttabs .ws-fttab.is-cur { font-size: 19px !important; }`;

/** B3: no resting tab has a ground; at least one resting tab exists. */
async function b3Problems(page: Page): Promise<string[]> {
  await park(page);
  const r = await readTabs(page);
  const rest = r.tabs.filter((t) => !t.cur);
  if (rest.length === 0) return ["no resting tab to read (population 0)"];
  return rest.filter((t) => alphaOf(t.bg) > 0).map((t) => `${t.id} rests on ${t.bg}`);
}
const B3_BREAK = `.ws-fttabs .ws-fttab:not(.is-cur) { background: rgba(244, 238, 229, 0.14) !important; }`;

/** The most common colour in a 1px row (patterns and doodles cannot outvote the ground). */
async function rowMode(page: Page, x: number, y: number, w: number): Promise<RGB> {
  const png = PNG.sync.read(await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: 1 } }));
  const n = new Map<string, number>();
  for (let i = 0; i < png.width; i++) { const k = [png.data[i * 4], png.data[i * 4 + 1], png.data[i * 4 + 2]].join(","); n.set(k, (n.get(k) ?? 0) + 1); }
  const best = [...n.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return best.split(",").map(Number) as RGB;
}
/** B4: the current tab's fill (read as a pixel inside it, clear of its name) equals the page 4px below the bar. */
async function b4Problems(page: Page): Promise<string[]> {
  await park(page);
  const r = await readTabs(page);
  const cur = r.tabs.find((t) => t.cur);
  if (!cur || !r.win || !r.bar) return ["no current tab"];
  const tabPx = await pixel(page, cur.x + 4, cur.top + cur.h - 6);
  const out: string[] = [];
  const parsed = parseRgb(cur.bg);
  if (!parsed || !near(parsed, tabPx, 2)) out.push(`the tab's computed ${cur.bg} is not its own pixel ${fmt(tabPx)}`);
  /* +4: inside where the lip lies — at rest the lip paints nothing, so this is the page's own ground. (Not deeper: the
     Dashboard's ground is a gradient and has moved 2 levels by +16, which is the page, not a seam.) */
  const under = await rowMode(page, r.win.x + 160, r.bar.b + 4, Math.min(400, r.win.w - 200));
  if (!near(under, tabPx, 2)) out.push(`the page 4px under the bar reads ${fmt(under)}, the tab ${fmt(tabPx)}`);
  return out;
}
const B4_BREAK = `.sheet-lip, .wpg-scroll > .sheet-lip { background: var(--ws-page) !important; }`;

/** B5: just outside the current tab's bottom corners is the sheet's fill; 8px up, ink. */
async function b5Problems(page: Page): Promise<string[]> {
  await park(page);
  const r = await readTabs(page);
  const cur = r.tabs.find((t) => t.cur);
  if (!cur || !r.bar) return ["no current tab"];
  const ink = hexToRgb((await shell(page)).inkToken);
  const fill = await pixel(page, cur.x + 4, cur.bottom - 6);
  /* ⚠️ WHOLE DEVICE ROWS CLEAR OF THE SHEET'S EDGE: the bar can end on a fraction (the BETA strip above it is 41.8px), and
     a row straddling that edge is a blend of ink and sheet. Two rows up, 1.5px out from the tab, sits well inside the
     10px curve; the row 8px above it is clear of the curve's box. */
  const yFoot = Math.floor(r.bar.b) - 2;
  const out: string[] = [];
  for (const [side, x] of [["left", Math.ceil(cur.x) - 2], ["right", Math.floor(cur.x + cur.w) + 1]] as const) {
    const foot = await pixel(page, x, yFoot), up = await pixel(page, x, yFoot - 8);
    if (!near(foot, fill, 3)) out.push(`${side}: the corner reads ${fmt(foot)}, not the sheet's ${fmt(fill)}`);
    if (!near(up, ink, 3)) out.push(`${side}: 8px up reads ${fmt(up)}, not ink ${fmt(ink)}`);
  }
  return out;
}
const B5_BREAK = `.ws-fttabs .ws-fttab .ws-ftfl-l { display: none !important; }`;

for (const mode of ["rail", "pinned"] as const) {
  for (const size of SIZES) {
    test(`ST2-B1 B3 B4 B5 · metrics, quiet neighbours, one fill, curves — ${mode} at ${size.width}`, async ({ page }) => {
      test.setTimeout(300_000);
      await sidebarMode(page, mode);
      const log: string[] = [];
      let b4Reds = 0;
      for (const route of ["/queries", "/materials/letters", "/dashboard", "/account"]) {
        await openRoute(page, route, size);
        log.push(`B1 ${route}: red ${JSON.stringify(await proveLock(page, `B1 ${route}`, b1Problems, B1_BREAK))}`);
        if (route !== "/dashboard" && route !== "/account") log.push(`B3 ${route}: red ${JSON.stringify(await proveLock(page, `B3 ${route}`, b3Problems, B3_BREAK))}`);
        /* the lip's old tone differs from the ground only where a page paints its own (Letters, the Dashboard) */
        const red = await proveLock(page, `B4 ${route}`, b4Problems, B4_BREAK, false);
        if (red.length) b4Reds++;
        log.push(`B4 ${route}: red ${JSON.stringify(red)}`);
      }
      expect(b4Reds, "B4 must see the lip's old tone on Letters and the Dashboard").toBeGreaterThanOrEqual(2);
      /* B5 with a middle tab current: Comps, third of five */
      await openRoute(page, "/manuscripts/comps", size);
      const r = await readTabs(page);
      const ci = r.tabs.findIndex((t) => t.cur);
      expect(ci > 0 && ci < r.tabs.length - 1, `a middle tab is current (${ci} of ${r.tabs.length})`).toBe(true);
      log.push(`B5 comps: red ${JSON.stringify(await proveLock(page, "B5 comps", b5Problems, B5_BREAK))}`);
      console.log(`[ST2-B ${mode} ${size.width}]\n  ` + log.join("\n  "));
    });
  }
}

/** B2: selecting each tab in turn moves no tab's x or width by more than 0.5. Clicks the real tabs (navigation only). */
async function b2Readings(page: Page, ids: string[]): Promise<Map<string, { x: number; w: number }[]>> {
  const seen = new Map<string, { x: number; w: number }[]>();
  for (const id of ids) {
    await page.locator(`[data-shell="tabs"] [data-tab="${id}"]`).filter({ visible: true }).first().click();
    await page.waitForTimeout(900);
    await park(page);
    const r = await readTabs(page);
    expect(r.tabs.find((t) => t.cur)?.id, `clicking ${id} makes it current`).toBe(id);
    console.log(`  B2 ${id} current: search ${r.search?.x.toFixed(0)}, tools ${r.tools?.toFixed(0)}, tabs ${r.tabs.map((t) => `${t.id}:${t.mode}@${t.x.toFixed(0)}w${t.w.toFixed(0)}`).join(" ")}`);
    for (const t of r.tabs) seen.set(t.id, [...(seen.get(t.id) ?? []), { x: t.x, w: t.w }]);
  }
  return seen;
}
function b2Problems(seen: Map<string, { x: number; w: number }[]>): string[] {
  const out: string[] = [];
  if (seen.size < 2) out.push(`population ${seen.size}`);
  for (const [id, xs] of seen) {
    const dx = Math.max(...xs.map((v) => v.x)) - Math.min(...xs.map((v) => v.x));
    const dw = Math.max(...xs.map((v) => v.w)) - Math.min(...xs.map((v) => v.w));
    if (dx > 0.5) out.push(`${id} moves ${dx.toFixed(2)}px`);
    if (dw > 0.5) out.push(`${id} changes width by ${dw.toFixed(2)}px (${xs.map((v) => v.w.toFixed(0)).join("/")})`);
  }
  return out;
}
/* ⚠️ "BOLD THE CURRENT TAB" ALONE CANNOT BE SEEN: the typewriter face has no bold, and Chrome's synthetic bold keeps
   every advance width — measured, the bold-only mutation moved nothing (red []). The mutation adds the old current
   tab's 22px sides, the size change a "risen" current tab really made. */
const B2_BREAK = `.ws-fttabs .ws-fttab.is-cur { font-weight: 700 !important; padding-left: 22px !important; padding-right: 22px !important; }`;

/* ⚠️ AT 1280 B2 RESTS ON PHASE 3's SEARCH FOLD: Versions and Manuscripts carry a guide pill in the bar's right group,
   the search moves 228px left, and without the fold Manuscript's tab drops to its icon on those two pages. */
for (const size of SIZES) {
  test(`ST2-B2 · no tab moves when another becomes current — rail at ${size.width}`, async ({ page }) => {
    test.setTimeout(300_000);
    await sidebarMode(page, "rail");
    const log: string[] = [];
    for (const start of ["/materials/letters", "/queries"]) {
      await openRoute(page, start, size);
      const ids = (await readTabs(page)).tabs.filter((t) => t.mode !== "more").map((t) => t.id);
      expect(ids.length, `${start} has tabs to click`).toBeGreaterThan(1);
      const clean = b2Problems(await b2Readings(page, ids));
      expect(clean, `B2 ${start} clean`).toEqual([]);
      await addCss(page, B2_BREAK);
      const broken = b2Problems(await b2Readings(page, ids));
      await dropBreaks(page);
      log.push(`B2 ${start}: red ${JSON.stringify(broken)}`);
      expect(broken.length, `B2 ${start} must see a bold current tab`).toBeGreaterThan(0);
    }
    console.log(`[ST2-B2 ${size.width}]\n  ` + log.join("\n  "));
  });
}

/** B4 across every route at 1512 (rail): the tab and the page under the bar are one colour everywhere. */
test("ST2-B4 sweep · every route, one fill under the bar", async ({ page }) => {
  test.setTimeout(900_000);
  await sidebarMode(page, "rail");
  const ROUTES = ["/dashboard", "/queries", "/queries/responses", "/queries/analytics", "/queries/packages", "/materials/letters",
    "/manuscripts/comps", "/manuscripts/versions", "/manuscripts", "/todo", "/todo/corkboard", "/agents", "/agents/discover",
    "/goals", "/import", "/account", "/account/profile", "/account/preferences", "/account/emails", "/account/plan", "/account/data", "/plans", "/help"];
  const bad: string[] = [];
  for (const route of ROUTES) {
    await openRoute(page, route, WIDE);
    const p = await b4Problems(page);
    if (p.length) bad.push(`${route}: ${p.join("; ")}`);
  }
  expect(bad).toEqual([]);
});

/* ════════════════════════════════════════════ PHASE 3 · C1 C2 ════════════════════════════════════════════ */

/** C1: a one-page place renders exactly one tab, and it is current. */
async function c1Problems(page: Page): Promise<string[]> {
  const r = await readTabs(page);
  if (r.tabs.length !== 1) return [`${r.tabs.length} tabs`];
  return r.tabs[0].cur ? [] : ["the one tab is not current"];
}
const C1_BREAK = `.ws-fttabs { display: none !important; }`;

for (const mode of ["rail", "pinned"] as const) {
  test(`ST2-C1 · a one-page place shows one current tab — ${mode}`, async ({ page }) => {
    test.setTimeout(180_000);
    await sidebarMode(page, mode);
    for (const route of ["/dashboard", "/account", "/plans"]) {
      for (const size of SIZES) {
        await openRoute(page, route, size);
        console.log(`[ST2-C1 ${mode} ${size.width}] ${route}: red ${JSON.stringify(await proveLock(page, `C1 ${route}`, c1Problems, C1_BREAK))}`);
      }
    }
  });
}

/** C2: no tab is cut short (an icon, a "+N" or a clipped name all count) or reaches the tools. */
async function c2Problems(page: Page): Promise<string[]> {
  const r = await readTabs(page);
  if (!r.search || r.tabs.length < 2) return ["no strip or no search field"];
  const out: string[] = [];
  for (const t of r.tabs) {
    if (t.mode === "ic" || t.mode === "more") out.push(`${t.id} is cut to ${t.mode}`);
    if (t.sw > t.cw + 0.5) out.push(`${t.id}'s name is clipped (${t.sw} > ${t.cw})`);
  }
  const last = r.tabs[r.tabs.length - 1];
  /* ⚠️ CLEAR BY THE FIT'S OWN 24px, NOT MERELY UNTOUCHED: without the fold the tabs still end inside that gap, so a bare
     overlap test cannot see the fold removed (measured: red [] on every folded page) */
  const gap = r.search.x - (last.x + last.w);
  if (gap < 24 - 0.5) out.push(`${last.id} ends ${gap.toFixed(1)}px short of the search field (< 24)`);
  for (let i = 1; i < r.tabs.length; i++) if (r.tabs[i].x < r.tabs[i - 1].x + r.tabs[i - 1].w - 0.5) out.push(`${r.tabs[i - 1].id} overlaps ${r.tabs[i].id}`);
  return out;
}
/* the fold removed: the field keeps its full width while the fit still plans for the folded room */
const C2_BREAK = `.ws-pagebar .ws-sfield[data-fold] { width: 168px !important; padding: 0 12px !important; gap: 10px !important; }
  .ws-pagebar .ws-sfield[data-fold] .ws-sfield-l, .ws-pagebar .ws-sfield[data-fold] .ws-sfield-k { display: inline !important; }`;

test("ST2-C2 · at 1100 wide no tab is cut or overlapped; search folds first; Log a query keeps its size — rail", async ({ page }) => {
  test.setTimeout(400_000);
  await sidebarMode(page, "rail");
  const capW = async () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".ws-pagebar .ws-capb")].find((e) => e.getBoundingClientRect().width > 0)?.getBoundingClientRect().width ?? 0);
  await openRoute(page, "/materials/letters", WIDE);
  const capWide = await capW();
  expect(capWide, "Log a query is drawn").toBeGreaterThan(0);
  let reds = 0, folds = 0;
  /* ⚠️ VERSIONS AND MANUSCRIPTS CARRY THE GUIDE PILL (≈232px) IN THE BAR, and at 1100 even the folded field leaves too
     little room: the strip's old order of retreat then turns Manuscript to its icon. That is reported for a ruling, not
     hidden: on those two pages the lock holds the ORDER (the field is folded before any tab is cut) and records what is
     cut; on the six without the pill it holds C2 whole. */
  const PILLED = new Set(["/manuscripts/versions", "/manuscripts"]);
  for (const route of ["/materials/letters", "/queries/packages", "/manuscripts/comps", "/manuscripts/versions", "/manuscripts", "/queries", "/queries/responses", "/queries/analytics"]) {
    await openRoute(page, route, { width: 1100, height: 800 });
    if (PILLED.has(route)) {
      const r = await readTabs(page);
      const cut = r.tabs.filter((t) => t.mode === "ic" || t.mode === "more").map((t) => t.id);
      const f = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".ws-sfield")].some((e) => e.getBoundingClientRect().width > 0 && e.hasAttribute("data-fold")));
      if (cut.length) expect(f, `${route}: a tab is cut (${cut}) only once the field has folded`).toBe(true);
      console.log(`[ST2-C2 1100] ${route} (guide pill): search ${f ? "folded" : "open"} · cut ${JSON.stringify(cut)} · clear by ${(r.search!.x - (r.tabs[r.tabs.length - 1].x + r.tabs[r.tabs.length - 1].w)).toFixed(1)}`);
      continue;
    }
    const folded = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".ws-sfield")].some((e) => e.getBoundingClientRect().width > 0 && e.hasAttribute("data-fold")));
    if (folded) folds++;
    expect(Math.abs((await capW()) - capWide), `${route}: Log a query keeps its width`).toBeLessThan(0.5);
    const red = await proveLock(page, `C2 ${route}`, c2Problems, C2_BREAK, false);
    if (red.length) reds++;
    console.log(`[ST2-C2 1100] ${route}: search ${folded ? "folded" : "open"} · red ${JSON.stringify(red)}`);
  }
  expect(folds, "the fold is exercised").toBeGreaterThan(0);
  expect(reds, "C2 sees the fold removed on every page that folds").toBe(folds);
});

/* ════════════════════════════════════════════ shots ════════════════════════════════════════════ */

test("ST2 shots · the top-left at 1512 × 900", async ({ page }) => {
  test.skip(!SHOTS, "ST2_SHOTS not set");
  test.setTimeout(300_000);
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const mode of ["rail", "pinned"] as const) {
    await sidebarMode(page, mode);
    for (const route of mode === "rail" ? ["/queries", "/materials/letters", "/dashboard", "/account"] : ["/queries"]) {
      await openRoute(page, route, WIDE);
      const s = await shell(page);
      const top = Math.max(0, (s.bar?.y ?? 0) - 4);
      await page.screenshot({ path: `${SHOTS}/${mode}${route.replace(/\//g, "_")}.png`, clip: { x: 0, y: top, width: 900, height: 150 } });
    }
  }
});
