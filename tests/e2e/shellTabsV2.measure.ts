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
