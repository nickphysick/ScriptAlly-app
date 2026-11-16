/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell tabs v2.1 (16 Nov) — the guide pill folds second, and the account tabs keep their order. The ST2.1 locks, on the
 * rendered page. Report: reports/shell-tabs-v2-1/REPORT.md.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/shellTabsV21.measure.ts --project=measure --workers=1`.
 *
 * ⚠️ EVERY LOCK PROVES ITSELF IN THE SAME RUN (the house pattern from shellTabsV2.measure.ts): a pure `problems()`
 * reading, asserted empty on the clean page, then the prompt's mutation applied in place as a named stylesheet and the
 * same reading asserted to find something. A lock whose subject is missing reports that as a problem.
 *
 * ⚠️ FOLDS ARE READ AS GEOMETRY, NOT ATTRIBUTES. `data-fold` says what the fit decided; the locks read what a person
 * sees — the field's and the pill's rendered widths and whether their words are laid out — so a CSS mutation that
 * restores or forces a fold is seen even though the attribute does not change.
 *
 * ST21_BASELINE=<file> (run BEFORE the edit) records the phone sign-in tabs G3 compares against; ST21_SHOTS=<dir> writes
 * the shots (with ST21_BASELINE, the "before" set).
 */
import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import { openRoute } from "./measure";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };

const BASELINE = process.env.ST21_BASELINE ?? "";
const SHOTS = process.env.ST21_SHOTS ?? "";
const G3_FILE = "tests/e2e/fixtures/shellTabsV21-phone-tabs.json";
const VERSIONS = "/manuscripts/versions";
const NARROW = { width: 1100, height: 800 };
const WIDE = { width: 1512, height: 900 };

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
  await page.evaluate((c) => { const st = document.createElement("style"); st.dataset.st21Break = ""; st.textContent = c; document.head.appendChild(st); }, css);
  await page.waitForTimeout(300);
}
async function dropBreaks(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelectorAll("[data-st21-break]").forEach((e) => e.remove()));
  await page.waitForTimeout(300);
}
async function proveLock(page: Page, label: string, problems: (p: Page) => Promise<string[]>, breakCss: string) {
  const clean = await problems(page);
  expect(clean, `${label} on the clean page`).toEqual([]);
  await addCss(page, breakCss);
  const broken = await problems(page);
  await dropBreaks(page);
  expect(broken.length, `${label} must see its own mutation (${breakCss.slice(0, 90)}…)`).toBeGreaterThan(0);
  return broken;
}
async function resize(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(220);
}

type RGB = [number, number, number];
async function pixel(page: Page, x: number, y: number): Promise<RGB> {
  const png = PNG.sync.read(await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } }));
  return [png.data[0], png.data[1], png.data[2]];
}
const near = (a: RGB, b: RGB, tol = 3) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
const fmt = (a: RGB) => `rgb(${a.join(",")})`;
function parseRgb(s: string): RGB | null {
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
function hexToRgb(h: string): RGB { const n = parseInt(h.trim().replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/* ════════════════════════════════════ the bar: tabs, search, the guide pill ════════════════════════════════════ */

interface BarRead {
  tabs: { id: string; mode: string; x: number; w: number; sw: number; cw: number }[];
  search: { x: number; w: number; labelShown: boolean; foldAttr: boolean } | null;
  pill: { w: number; h: number; labelShown: boolean; aria: string; title: string; foldAttr: boolean } | null;
  cap: number;
}
async function readBar(page: Page): Promise<BarRead> {
  return page.evaluate(() => {
    const vis = (e: Element | null | undefined) => !!e && (e as HTMLElement).getBoundingClientRect().width > 0;
    const pick = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find(vis) ?? null;
    const bar = pick(".ws-main .ws-pagebar");
    const nav = bar?.querySelector<HTMLElement>('[data-shell="tabs"]') ?? null;
    const tabs = nav ? [...nav.querySelectorAll<HTMLElement>("[data-tab], .ws-ftmore")].map((t) => {
      const r = t.getBoundingClientRect();
      const label = t.querySelector<HTMLElement>(".ws-ftn, .ws-fttl");
      return { id: t.dataset.tab ?? "more", x: r.left, w: r.width, sw: label ? label.scrollWidth : 0, cw: label ? label.clientWidth : 0,
        mode: t.classList.contains("ws-ftmore") ? "more" : (t.dataset.mode ?? (t.classList.contains("is-cur") ? "cur" : "full")) };
    }) : [];
    const sf = bar?.querySelector<HTMLElement>(".ws-sfield") ?? null;
    const sl = sf?.querySelector<HTMLElement>(".ws-sfield-l");
    const pl = bar?.querySelector<HTMLElement>('[data-pck="pill"]') ?? null;
    const pt = pl?.querySelector<HTMLElement>(".pck-pt");
    const pn = pl?.querySelector<HTMLElement>(".pck-pn");
    const cap = bar?.querySelector<HTMLElement>(".ws-capb");
    return {
      tabs,
      search: sf && vis(sf) ? { x: sf.getBoundingClientRect().left, w: sf.getBoundingClientRect().width, labelShown: vis(sl), foldAttr: sf.hasAttribute("data-fold") } : null,
      pill: pl && vis(pl) ? { w: pl.getBoundingClientRect().width, h: pl.getBoundingClientRect().height, labelShown: vis(pt) || vis(pn),
        aria: pl.getAttribute("aria-label") ?? "", title: pl.getAttribute("title") ?? "", foldAttr: !!pl.closest("[data-fold]") } : null,
      cap: cap ? cap.getBoundingClientRect().width : 0,
    };
  });
}
const searchOpen = (b: BarRead) => !!b.search && b.search.w > 100 && b.search.labelShown;
const searchFolded = (b: BarRead) => !!b.search && Math.abs(b.search.w - 38) <= 1 && !b.search.labelShown;
const pillOpen = (b: BarRead) => !!b.pill && b.pill.w > 60 && b.pill.labelShown;
const pillFolded = (b: BarRead) => !!b.pill && Math.abs(b.pill.w - 38) <= 1 && Math.abs(b.pill.h - 38) <= 1 && !b.pill.labelShown;

/** Every tab named in full, none overlapping, the last clear of the field by the fit's own 24px. */
function tabsWhole(b: BarRead): string[] {
  const out: string[] = [];
  if (b.tabs.length < 2 || !b.search) return ["no strip or no search field"];
  for (const t of b.tabs) {
    if (t.mode === "ic" || t.mode === "more") out.push(`${t.id} is cut to ${t.mode}`);
    if (t.sw > t.cw + 0.5) out.push(`${t.id}'s name is clipped (${t.sw} > ${t.cw})`);
  }
  for (let i = 1; i < b.tabs.length; i++) if (b.tabs[i].x < b.tabs[i - 1].x + b.tabs[i - 1].w - 0.5) out.push(`${b.tabs[i - 1].id} overlaps ${b.tabs[i].id}`);
  const last = b.tabs[b.tabs.length - 1];
  const gap = b.search.x - (last.x + last.w);
  if (gap < 24 - 0.5) out.push(`${last.id} ends ${gap.toFixed(1)}px short of the search field (< 24)`);
  return out;
}

/** The folded pill's look undone: what the pill looks like with its label back (the prompt's F1 mutation). */
const PILL_UNFOLD = `.ws-pagebar .ws-pageslot[data-fold] .pck-pill { width: auto !important; height: 36px !important; padding: 0 14px 0 10px !important; gap: 9px !important; border-radius: 18px !important; }
  .ws-pagebar .ws-pageslot[data-fold] .pck-pill .pck-pt, .ws-pagebar .ws-pageslot[data-fold] .pck-pill .pck-pn { display: inline !important; }`;
/** The folded looks forced on whatever the fit decided (F3's "force the fold on"; F4's "latch the fold"). */
const FORCE_FOLD = `.ws-pagebar .ws-sfield { width: 38px !important; padding: 0 !important; gap: 0 !important; justify-content: center !important; }
  .ws-pagebar .ws-sfield .ws-sfield-l, .ws-pagebar .ws-sfield .ws-sfield-k { display: none !important; }
  .ws-pagebar .pck-pill { width: 38px !important; height: 38px !important; padding: 0 !important; gap: 0 !important; justify-content: center !important; }
  .ws-pagebar .pck-pill .pck-pt, .ws-pagebar .pck-pill .pck-pn { display: none !important; }`;

/** F1: at 1100 with the rail, search folded, the pill a named 38 square with its label as a tooltip, every tab whole. */
async function f1Problems(page: Page): Promise<string[]> {
  const b = await readBar(page);
  const out: string[] = [];
  if (!b.pill) return ["no guide pill in the bar"];
  if (!searchFolded(b)) out.push(`search is not folded (${b.search?.w.toFixed(1)}px)`);
  if (!pillFolded(b)) out.push(`the pill is ${b.pill.w.toFixed(1)} × ${b.pill.h.toFixed(1)}${b.pill.labelShown ? " with its label" : ""}, not a 38 square`);
  if (!b.pill.aria.trim()) out.push("the folded pill has no accessible name");
  if (!/guide/i.test(b.pill.title)) out.push(`the folded pill's tooltip is "${b.pill.title}"`);
  out.push(...tabsWhole(b));
  return out;
}

test("ST2.1-F1 · on Versions at 1100 with the rail the pill folds to a named 38 square and every tab keeps its name", async ({ page }) => {
  test.setTimeout(180_000);
  await sidebarMode(page, "rail");
  await openRoute(page, VERSIONS, NARROW);
  const b = await readBar(page);
  console.log(`[ST2.1-F1] ${JSON.stringify(b)}`);
  const red = await proveLock(page, "F1", f1Problems, PILL_UNFOLD);
  console.log(`[ST2.1-F1] red ${JSON.stringify(red)}`);
});

/** F2/F3 state: which of the two is folded at the current width. */
const state = (b: BarRead) => `${searchOpen(b) ? "S" : searchFolded(b) ? "s" : "?"}${pillOpen(b) ? "P" : pillFolded(b) ? "p" : "?"}`;

test("ST2.1-F2 · where folding search alone makes room, the pill keeps its label", async ({ page }) => {
  test.setTimeout(240_000);
  await sidebarMode(page, "rail");
  await openRoute(page, VERSIONS, WIDE);
  /* find it: step down from 1512 until search folds; the first such width is where the fold of search alone suffices */
  let w2 = 0;
  const seen: string[] = [];
  for (let w = 1512; w >= 1100; w -= 4) {
    await resize(page, w, 800);
    const b = await readBar(page);
    seen.push(`${w}:${state(b)}`);
    if (searchFolded(b) && pillOpen(b)) { w2 = w; break; }
    if (!searchOpen(b)) break;
  }
  console.log(`[ST2.1-F2] sweep ${seen.slice(-6).join(" ")} → width ${w2}`);
  expect(w2, "a width where folding search alone makes room").toBeGreaterThan(0);
  const problems = async (p: Page) => {
    const b = await readBar(p);
    const out: string[] = [];
    if (!b.pill) return ["no guide pill"];
    if (!searchFolded(b)) out.push(`search is not folded at ${w2} (${b.search?.w.toFixed(1)}px)`);
    if (!pillOpen(b)) out.push(`the pill is folded at ${w2} (${b.pill.w.toFixed(1)}px)`);
    out.push(...tabsWhole(b));
    return out;
  };
  /* the pill folded before search: the field's look restored, the pill's folded look forced */
  const red = await proveLock(page, `F2 at ${w2}`, problems, `.ws-pagebar .ws-sfield[data-fold] { width: 168px !important; padding: 0 12px !important; gap: 10px !important; }
    .ws-pagebar .ws-sfield[data-fold] .ws-sfield-l, .ws-pagebar .ws-sfield[data-fold] .ws-sfield-k { display: inline !important; }
    .ws-pagebar .pck-pill { width: 38px !important; height: 38px !important; padding: 0 !important; gap: 0 !important; }
    .ws-pagebar .pck-pill .pck-pt, .ws-pagebar .pck-pill .pck-pn { display: none !important; }`);
  console.log(`[ST2.1-F2] width ${w2} · red ${JSON.stringify(red)}`);
});

test("ST2.1-F3 · at 1512 × 900 on Versions neither search nor the pill is folded", async ({ page }) => {
  test.setTimeout(180_000);
  for (const mode of ["rail", "pinned"] as const) {
    await sidebarMode(page, mode);
    await openRoute(page, VERSIONS, WIDE);
    const problems = async (p: Page) => {
      const b = await readBar(p);
      const out: string[] = [];
      if (!b.pill) return ["no guide pill"];
      if (!searchOpen(b)) out.push(`search is folded (${b.search?.w.toFixed(1)}px)`);
      if (!pillOpen(b)) out.push(`the pill is folded (${b.pill.w.toFixed(1)}px)`);
      if (b.search?.foldAttr || b.pill.foldAttr) out.push("the fit asked for a fold");
      out.push(...tabsWhole(b));
      return out;
    };
    console.log(`[ST2.1-F3 ${mode}] red ${JSON.stringify(await proveLock(page, `F3 ${mode}`, problems, FORCE_FOLD))}`);
  }
});

/** F4: from 1100 to 1512 in steps, the pill's label comes back first, then the field, and both are open at the end. */
async function f4Problems(page: Page): Promise<string[]> {
  await resize(page, 1100, 800);
  const start = await readBar(page);
  const out: string[] = [];
  if (!start.pill) return ["no guide pill"];
  if (!(searchFolded(start) && pillFolded(start))) out.push(`at 1100 the bar is ${state(start)}, not both folded`);
  let pillBack = 0, searchBack = 0;
  for (let w = 1100; w <= 1512; w += 6) {
    await resize(page, w, 800);
    const b = await readBar(page);
    if (!pillBack && pillOpen(b)) pillBack = w;
    if (!searchBack && searchOpen(b)) searchBack = w;
    if (searchOpen(b) && !pillOpen(b)) out.push(`at ${w} search is open while the pill is folded`);
  }
  await resize(page, 1512, 900);
  const end = await readBar(page);
  if (!pillOpen(end)) out.push("at 1512 the pill is still folded");
  if (!searchOpen(end)) out.push("at 1512 search is still folded");
  if (pillBack && searchBack && pillBack > searchBack) out.push(`the field came back (${searchBack}) before the pill (${pillBack})`);
  if (!out.length) console.log(`[ST2.1-F4] the pill's label back at ${pillBack}, the field at ${searchBack}`);
  return out;
}
test("ST2.1-F4 · widening from 1100 to 1512 restores the pill's label, then search's field", async ({ page }) => {
  test.setTimeout(300_000);
  await sidebarMode(page, "rail");
  await openRoute(page, VERSIONS, NARROW);
  console.log(`[ST2.1-F4] red ${JSON.stringify(await proveLock(page, "F4", f4Problems, FORCE_FOLD))}`);
});

/* ════════════════════════════════════ the sign-in frame ════════════════════════════════════ */

async function openFrame(page: Page, mode: "signup" | "signin", size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await page.goto(`/#/onb-lab?s=${mode}`, { waitUntil: "load" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("[data-setup-frame]");
  await page.evaluate(() => (document as Document).fonts.ready);
  await page.waitForTimeout(900);
  const v = page.viewportSize()!;
  await page.mouse.move(v.width - 20, v.height - 20);
}
/** The frame's tabs as a reader sees them: every visible tab-like element in the tab row, with its words and box. */
async function frameTabs(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const row = [...document.querySelectorAll<HTMLElement>('.sf [data-sf="tabs"]')].find(vis);
    if (!row) return [];
    return [...row.querySelectorAll<HTMLElement>("[data-tab], .ws-ftab, .ws-ftnm, [data-sib]")].filter(vis).map((t) => {
      const r = t.getBoundingClientRect();
      return { sel: t.dataset.tab !== undefined ? "tab" : t.className.split(" ")[0], text: (t.textContent ?? "").replace(/\s+/g, " ").trim(),
        cur: t.getAttribute("aria-current") === "page" || t.classList.contains("is-cur"), x: +r.left.toFixed(2), y: +r.top.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
    });
  });
}
const ORDER = ["Create account", "Sign in"];
async function clickTab(page: Page, text: string) {
  const row = page.locator('.sf [data-sf="tabs"]').filter({ visible: true }).first();
  await row.locator("[data-tab]").filter({ hasText: text }).first().click();
  await page.waitForTimeout(900);
  const v = page.viewportSize()!;
  await page.mouse.move(v.width - 20, v.height - 20);
}

/** G1: both modes, DOM and visual order "Create account", "Sign in"; switching moves no tab by more than 0.5. */
async function g1Problems(page: Page): Promise<string[]> {
  const out: string[] = [];
  await openFrame(page, "signup", WIDE);
  const read = async (label: string) => {
    const t = (await frameTabs(page)).filter((x) => x.sel === "tab");
    const dom = t.map((x) => x.text);
    const vis = [...t].sort((a, b) => a.x - b.x).map((x) => x.text);
    if (dom.join("|") !== ORDER.join("|")) out.push(`${label}: DOM order ${JSON.stringify(dom)}`);
    if (vis.join("|") !== ORDER.join("|")) out.push(`${label}: visual order ${JSON.stringify(vis)}`);
    return t;
  };
  const a = await read("Create account current");
  if (a.length !== 2) return [...out, `${a.length} tabs in the frame`];
  if (!a.find((x) => x.text === "Create account")?.cur) out.push("Create account is not marked current on the sign-up screen");
  await clickTab(page, "Sign in");
  const b = await read("Sign in current");
  if (!b.find((x) => x.text === "Sign in")?.cur) out.push("Sign in is not current after switching");
  for (const t of a) {
    const u = b.find((x) => x.text === t.text);
    if (!u) { out.push(`${t.text} is gone after switching`); continue; }
    if (Math.abs(u.x - t.x) > 0.5 || Math.abs(u.w - t.w) > 0.5) out.push(`${t.text} moved: x ${t.x}→${u.x}, w ${t.w}→${u.w}`);
  }
  return out;
}
test("ST2.1-G1 · the desktop sign-in frame keeps Create account, Sign in in both modes, and switching moves no tab", async ({ page }) => {
  test.setTimeout(180_000);
  /* current-first restored, as far as a stylesheet can: the row reversed, so the current tab is always drawn... first
     in one mode, and the other mode's order flips — the visual half of the old behaviour */
  const red = await proveLock(page, "G1", g1Problems, `.sf [data-sf="tabs"] [data-shell="tabs"] { flex-direction: row-reverse !important; }`);
  console.log(`[ST2.1-G1] red ${JSON.stringify(red)}`);
});

/** G2: with Sign in current, outside both bottom corners: the sheet's fill at the corner, the ink 8px up. */
async function g2Problems(page: Page): Promise<string[]> {
  const out: string[] = [];
  const t = (await frameTabs(page)).filter((x) => x.sel === "tab");
  const si = t.find((x) => x.text === "Sign in");
  if (!si || !si.cur) return ["Sign in is not the current tab"];
  const info = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const cur = [...document.querySelectorAll<HTMLElement>('.sf [data-sf="tabs"] [data-tab].is-cur')].find(vis);
    return { sheet: cur ? getComputedStyle(cur).backgroundColor : "", ink: getComputedStyle(document.documentElement).getPropertyValue("--ink-shell") };
  });
  const sheet = parseRgb(info.sheet);
  if (!sheet) return [`the current tab paints ${info.sheet}`];
  const ink = hexToRgb(info.ink);
  const bottom = si.y + si.h;
  for (const [side, x] of [["left", si.x - 3], ["right", si.x + si.w + 3]] as const) {
    const corner = await pixel(page, x, bottom - 2);
    const up = await pixel(page, x, bottom - 10);
    if (!near(corner, sheet)) out.push(`${side}: at the corner ${fmt(corner)}, not the sheet ${fmt(sheet)}`);
    if (!near(up, ink)) out.push(`${side}: 8px up ${fmt(up)}, not the ink ${fmt(ink)}`);
  }
  return out;
}
test("ST2.1-G2 · with Sign in current it curves into the sheet on both sides", async ({ page }) => {
  test.setTimeout(120_000);
  await openFrame(page, "signin", WIDE);
  const red = await proveLock(page, "G2", g2Problems, `.sf .ws-fttab .ws-ftfl-l { display: none !important; }`);
  console.log(`[ST2.1-G2] red ${JSON.stringify(red)}`);
});

/** G3: at 390 × 844, the phone's tabs as the baseline recorded them, in both modes. */
const PHONE = { width: 390, height: 844 };
async function phoneTabs(page: Page) {
  const out: Record<string, unknown> = {};
  for (const mode of ["signup", "signin"] as const) {
    await openFrame(page, mode, PHONE);
    out[mode] = await frameTabs(page);
  }
  return out;
}
test("ST2.1-G3 · on a phone the sign-in frame's tabs are the baseline's", async ({ page }) => {
  test.skip(!!BASELINE, "baseline run");
  test.setTimeout(120_000);
  const base = JSON.parse(fs.readFileSync(G3_FILE, "utf8"));
  const problems = async (p: Page) => {
    const now = await phoneTabs(p);
    const out: string[] = [];
    for (const mode of ["signup", "signin"]) {
      const a = JSON.stringify(base[mode]); const b = JSON.stringify(now[mode]);
      if (!Array.isArray(base[mode]) || (base[mode] as unknown[]).length === 0) out.push(`the baseline has no ${mode} tabs`);
      if (a !== b) out.push(`${mode}: ${b} ≠ baseline ${a}`);
    }
    return out;
  };
  /* the fixed order applied on phones: the sign-in screen's row reversed, so "Create account" leads there too */
  const clean = await problems(page);
  expect(clean, "G3 on the clean page").toEqual([]);
  await page.addInitScript(() => { document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = `.sf [data-sf="tabs"] .ws-ftab, .sf [data-sf="tabs"] .sf-tabsin > * { flex-direction: row-reverse !important; }`; document.head.appendChild(st); }); });
  const red = await problems(page);
  expect(red.length, "G3 must see the fixed order applied on phones").toBeGreaterThan(0);
  console.log(`[ST2.1-G3] red ${JSON.stringify(red).slice(0, 400)}`);
});

/* ════════════════════════════════════ baseline and shots ════════════════════════════════════ */

test("ST2.1 baseline · the phone tabs and the before shots", async ({ page }) => {
  test.skip(!BASELINE, "ST21_BASELINE not set");
  test.setTimeout(240_000);
  fs.mkdirSync(G3_FILE.replace(/\/[^/]+$/, ""), { recursive: true });
  const tabs = await phoneTabs(page);
  fs.writeFileSync(BASELINE, JSON.stringify(tabs, null, 2) + "\n");
  console.log(`[ST2.1 baseline] ${JSON.stringify(tabs)}`);
});

test("ST2.1 shots", async ({ page }) => {
  test.skip(!SHOTS, "ST21_SHOTS not set");
  test.setTimeout(300_000);
  fs.mkdirSync(SHOTS, { recursive: true });
  const barTop = async () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".ws-pagebar")].find((e) => e.getBoundingClientRect().width > 0)?.getBoundingClientRect().top ?? 0);
  await sidebarMode(page, "rail");
  await openRoute(page, VERSIONS, NARROW);
  await page.screenshot({ path: `${SHOTS}/versions-1100-rail.png`, clip: { x: 0, y: Math.max(0, (await barTop()) - 4), width: 1100, height: 130 } });
  for (const mode of ["signup", "signin"] as const) {
    await openFrame(page, mode, WIDE);
    await page.screenshot({ path: `${SHOTS}/frame-${mode}-1512.png`, clip: { x: 0, y: Math.max(0, (await barTop()) - 4), width: 900, height: 140 } });
    await openFrame(page, mode, PHONE);
    await page.screenshot({ path: `${SHOTS}/frame-${mode}-390.png`, clip: { x: 0, y: 0, width: 390, height: 220 } });
  }
  if (!BASELINE) {
    /* for Nick: the five Materials tabs at 1100 with the sidebar pinned (1100 is the narrowest width that pins) */
    await sidebarMode(page, "pinned");
    for (const route of ["/materials/letters", "/queries/packages", "/manuscripts/comps", "/manuscripts/versions", "/manuscripts"]) {
      await openRoute(page, route, NARROW);
      const b = await readBar(page);
      console.log(`[ST2.1 pinned 1100] ${route}: ${state(b)} · ${b.tabs.map((t) => `${t.id}:${t.mode}`).join(" ")}`);
      await page.screenshot({ path: `${SHOTS}/pinned-1100${route.replace(/\//g, "_")}.png`, clip: { x: 0, y: Math.max(0, (await barTop()) - 4), width: 1100, height: 130 } });
    }
  }
});
