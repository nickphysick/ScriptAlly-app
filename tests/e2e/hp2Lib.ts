/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Header panel v2 (design-refs/shell/header-panel-v2.html) — the census and the readers the HP2 locks share.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";
import { column } from "./sh2Lib";

export const DIR = "reports/header-panel-v2";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
/** every workspace route: its header is the panel */
export const WORKSPACE = ["/queries", "/queries/analytics", "/agents", "/agents/discover", "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/todo", "/todo/calendar", "/todo/noteboard"] as const;
/** routes that must not change */
export const OUT_OF_SCOPE = ["/dashboard", "/account", "/help", "/plans", "/import"] as const;
export const PANEL_BG = "rgb(45, 58, 80)";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
  }
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
export const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

export async function open(page: Page, route: string, vp: { width: number; height: number }) {
  await openApp(page, route, vp);
  await page.waitForTimeout(900);
}

/** The page header on screen (panel or not), the page sheet, the folder tab and the first thing under the header. */
export async function readTop(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element | null | undefined): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const b = (e: Element | null | undefined) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const win = document.querySelector<HTMLElement>(".ws-window");
    const hd = [...document.querySelectorAll<HTMLElement>('[data-hpanel], [data-own-header], [data-probe="page-header"]')].filter(vis).find((e) => win?.contains(e)) ?? null;
    const tab = document.querySelector<HTMLElement>(".ws-ftab");
    const cs = hd ? getComputedStyle(hd) : null;
    const sheet = [...document.querySelectorAll<HTMLElement>("[data-header-sheet]")].filter(vis).find((e) => win?.contains(e)) ?? null;
    const scs = [...document.querySelectorAll<HTMLElement>(".wpg-scroll, .ws-wbody")].filter(vis);
    /* the content column: the header's own containing column — the widest visible sibling box at the header's level */
    const sibs = hd?.parentElement ? [...hd.parentElement.children].filter((e) => e !== hd && vis(e)).map((e) => e.getBoundingClientRect()) : [];
    const col = sibs.length ? { l: Math.min(...sibs.map((r) => r.left)), r: Math.max(...sibs.map((r) => r.right)) } : null;
    const below = hd?.parentElement ? [...hd.parentElement.children].filter((e) => e !== hd && vis(e)).map((e) => e.getBoundingClientRect()).filter((r) => r.top >= hd.getBoundingClientRect().bottom - 1).sort((a, c) => a.top - c.top)[0] ?? null : null;
    const art = hd ? [...hd.querySelectorAll<HTMLElement>("img, .hpanel-disc, [data-probe='art'], [data-probe='band-disc']")].filter(vis)[0] ?? null : null;
    return {
      vw: window.innerWidth, vh: window.innerHeight, win: b(win), winBg: win ? getComputedStyle(win).backgroundColor : null,
      tabBg: tab ? getComputedStyle(tab).backgroundColor : null,
      hd: b(hd), isPanel: !!hd?.hasAttribute("data-hpanel"), cls: hd?.className.toString() ?? "",
      bg: cs?.backgroundColor ?? null, radius: cs?.borderTopLeftRadius ?? null, border: cs ? `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}` : null, shadow: cs?.boxShadow ?? null,
      sheet: !!sheet, col, belowTop: below ? below.top : null, art: b(art),
      overflowX: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, ...scs.map((s) => s.scrollWidth - s.clientWidth)),
    };
  });
}

export const KILL = "*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition: none !important; }";
const CUTOUT = "/images/qc/qc-plate-courier-figure.png";
/**
 * `HP2_MUTATE=<lock>` breaks one named thing IN THE PAGE (a style rule, or a small script run on every frame), so a
 * lock can be watched going red without a rebuild. Each entry is the pack's named mutation for that lock.
 */
export const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* drop the panel from one page */
  P1: { js: `if (location.pathname === "/todo") document.querySelectorAll(".ws-window [data-hpanel]").forEach((e) => { e.removeAttribute("data-hpanel"); e.classList.remove("hpanel", "ph--panel", "hpanel--compact", "hpanel--hero"); });` },
  /* `panel` defaults to true: every shared header takes the panel */
  P2: { js: `document.querySelectorAll(".ph:not(.hpanel)").forEach((e) => { e.classList.add("ph--panel", "hpanel"); e.setAttribute("data-hpanel", ""); });` },
  P4: { css: ".hpanel [data-probe='intro'], .hpanel .ms21-sub, .hpanel p { color: #1c130f !important; }" },
  P5: { css: ".hpanel .qcoh-art, .hpanel [data-cl15='header-art'] img, .hpanel .hpanel-disc, .hpanel .ph-art, .hpanel .ph-bdisc { position: relative !important; top: 30px !important; }" },
  P6: { css: ".qcoh[data-loading], .cl15-hd[data-loading] { display: block !important; }" },
  P7: { css: ".hpanel, .hpanel .ph-hin { column-gap: 400px !important; } .hpanel .ph-hin, .hpanel.hpanel--hero { grid-template-columns: max-content max-content !important; }" },
  /* ⚠️ THE PACK'S NAMED MUTATION (`z-index: auto` on the header) REDDENS NOTHING, measured: the popover carries its own
     z-index 30 and nothing under the header competes with it. What a rounded panel CAN do to it is clip it. */
  P8: { css: ".ph.ph--panel { overflow: hidden !important; }" },
  P8_named: { css: ".ph.ph--panel, .ph.ph--panel .ph-acts { z-index: auto !important; position: static !important; }" },
  /* the band comes back: full bleed and its fixed height */
  P9: { css: ".ph.ph--band.ph--panel { height: 337px !important; margin-left: -60px !important; }" },
  A1: { js: `document.querySelectorAll(".qcoh-txt, .cl15-txt").forEach((t) => { if (t.querySelector("[data-hp2-sub]")) return; const p = document.createElement("p"); p.setAttribute("data-hp2-sub", ""); p.style.cssText = "margin:10px 0 0;font:400 16px/1.5 serif;color:#f4eee5"; p.textContent = "Send, track, and chase them from this page."; t.insertBefore(p, t.children[1] || null); });` },
  A2: { js: `document.querySelectorAll(".hpanel-stamp").forEach((e) => { const t = e.textContent.replace(/^\\d+/, "4"); if (e.textContent !== t) e.textContent = t; });` },
  A3: { js: `document.querySelectorAll(".cl15-faces").forEach((f) => { if (f.querySelector("[data-cl15='faces-key']")) return; const k = document.createElement("span"); k.className = "cl15-fkey"; k.setAttribute("data-cl15", "faces-key"); k.style.cssText = "display:block;margin-top:8px;color:#f4eee5;font:400 13px serif"; k.textContent = "6 active · 0 closed · 31 not queried"; f.appendChild(k); });` },
  A4: { css: ".hpanel .hpanel-b1 { background: #2a3a52 !important; color: #fff !important; }" },
  A5: { js: `document.querySelectorAll("img.qcoh-art").forEach((i) => { if (!i.src.endsWith("${CUTOUT}")) i.src = "${CUTOUT}"; });` },
  A6: { css: ".qc13 .qc131-desk { margin-top: 88px !important; }" },
  C1: { css: ".qc135-card > .qc135-badge.qc135-badge, .cdb-card > .cdb-badge.cdb-badge { z-index: 1 !important; }" },
  D1: { css: ".cdb-card > .cdb-badge.cdb-badge { top: 0 !important; }" },
  D2: { css: ".cdb-card:nth-child(1) { --cdb-c: #a2452a !important; --cdb-cl: #f6ddd2 !important; } .cdb-card:nth-child(3) { --cdb-c: #6b5a83 !important; --cdb-cl: #e9e3ef !important; }" },
  D3: { js: `document.querySelectorAll('[data-dk="queried"]').forEach((c) => { if (c.hasAttribute("data-hp2-swapped")) return; const t = c.querySelectorAll('[data-cdb="tile"]'); if (t.length !== 2 || !t[0].textContent) return; const a = t[0].textContent; t[0].textContent = t[1].textContent; t[1].textContent = a; c.setAttribute("data-hp2-swapped", ""); });` },
  D4: { css: ".cdb-card .cdb-ch .dsk-svg, .cdb-card .cdb-ch [data-dk-chart='bar'] { width: 260px !important; }" },
  D5: { css: ".cdb-card .cdb-hit { display: none !important; }" },
  D6: { css: ".cdb-card .cdb-art--img img { display: none !important; } .cdb-card .cdb-art--img { border: 1.5px dashed #999 !important; }" },
  D7: { css: ".clv-group[data-loading] .cdb-card > .cdb-badge { display: none !important; }" },
  D8: { css: ".cdb-card .cdb-title { white-space: nowrap !important; }" },
};
/** P3's mutation needs the empty fixture, which the harness account cannot give: it is proved at unit (see the report). */

export async function prepare(page: Page, extra?: { hold?: boolean; init?: string }) {
  const key = process.env.HP2_MUTATE; const m = key ? MUTATIONS[key] : undefined;
  if (key && !m) throw new Error(`unknown HP2_MUTATE ${key}`);
  await page.addInitScript(({ css, js, hold, init }) => {
    try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* private mode */ }
    if (hold) { const w = window as unknown as Record<string, number>; w.__SA_QC_HOLD_MS = 6000; w.__SA_AGENTS_HOLD_MS = 6000; }
    if (init) { try { new Function(init)(); } catch { /* */ } }
    const put = () => {
      const s = document.createElement("style"); s.setAttribute("data-hp2", ""); s.textContent = css; document.documentElement.appendChild(s);
      if (js) { const f = new Function(js); const tick = () => { try { f(); } catch { /* */ } requestAnimationFrame(tick); }; tick(); }
    };
    if (document.documentElement) put(); else document.addEventListener("readystatechange", put, { once: true });
  }, { css: `${KILL}${m?.css ?? ""}`, js: m?.js ?? "", hold: !!extra?.hold, init: extra?.init ?? "" });
}

/** [r, g, b] of one screen pixel. */
export async function pixel(page: Page, x: number, y: number): Promise<number[]> { return (await column(page, x, y, y + 1))[0]; }

const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const parseRgb = (s: string | null | undefined): number[] | null => { const m = s?.match(/rgba?\(([^)]+)\)/); if (!m) return null; return m[1].split(/[ ,/]+/).filter(Boolean).map(Number); };
/** `fg` (possibly translucent) over an opaque `bg`: the WCAG contrast ratio. */
export function contrast(fg: number[], bg: number[]) {
  const a = fg.length > 3 ? fg[3] : 1; const f = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
  const [x, y] = [lum(f), lum(bg)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05);
}

/** The panel on screen and everything the P locks read from it. */
export async function readPanel(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element | null | undefined): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const b = (e: Element | null | undefined) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const win = [...document.querySelectorAll<HTMLElement>(".ws-window")].find(vis) ?? null;
    const any = [...document.querySelectorAll<HTMLElement>('[data-hpanel], [data-own-header], [data-probe="page-header"]')].filter(vis).find((e) => win?.contains(e)) ?? null;
    const hd = any?.hasAttribute("data-hpanel") ? any : null;
    const tab = [...document.querySelectorAll<HTMLElement>(".ws-ftab")].find(vis) ?? null;
    const sheet = [...document.querySelectorAll<HTMLElement>("[data-header-sheet]")].filter(vis).find((e) => win?.contains(e)) ?? null;
    const scs = [...document.querySelectorAll<HTMLElement>(".wpg-scroll, .ws-wbody")].filter(vis);
    const ground = (e: Element): string => { let n: Element | null = e; while (n) { const c = getComputedStyle(n).backgroundColor; const m = c.match(/rgba?\(([^)]+)\)/); const p = m ? m[1].split(/[ ,/]+/).filter(Boolean).map(Number) : []; if (p.length === 3 || (p.length === 4 && p[3] >= 0.99)) return c; n = n.parentElement; } return "rgb(255, 255, 255)"; };
    const text = (role: string, e: HTMLElement) => ({ role, text: (e.textContent ?? "").trim().slice(0, 40), color: getComputedStyle(e).color, ground: ground(e), bg: getComputedStyle(e).backgroundColor, shadow: getComputedStyle(e).boxShadow });
    const texts: ReturnType<typeof text>[] = [];
    if (hd) {
      const h1 = [...hd.querySelectorAll<HTMLElement>("h1")].find(vis); if (h1) texts.push(text("title", [...h1.querySelectorAll<HTMLElement>(".qcoh-hn, .cl15-hn")].find(vis) ?? h1));
      for (const [role, sel] of [["eyebrow", '[data-probe="eyebrow"]'], ["intro", '[data-probe="intro"], .ms21-sub']] as const) { const e = [...hd.querySelectorAll<HTMLElement>(sel)].find(vis); if (e) texts.push(text(role, e)); }
      const btns = [...hd.querySelectorAll<HTMLElement>("button, a[href]")].filter((e) => vis(e) && e.getAttribute("aria-hidden") !== "true" && (e.textContent ?? "").trim().length > 2 && !e.closest('[aria-hidden="true"]'));
      btns.forEach((e, i) => texts.push(text(`button ${i + 1}`, e)));
    }
    const art = hd ? [...hd.querySelectorAll<HTMLElement>(".qcoh-art, [data-cl15='header-art'] img, .hpanel-disc, [data-probe='art'], [data-probe='band-disc']")].filter(vis)[0] ?? null : null;
    const pcs = any?.parentElement ? getComputedStyle(any.parentElement) : null, pr = any?.parentElement?.getBoundingClientRect();
    /* the content column is the box the header's parent lays its rows out in; on a page with a desk it is the desk's */
    const desk = [...document.querySelectorAll<HTMLElement>(".qc131-desk, .cl15-desk")].find(vis)?.getBoundingClientRect();
    const col = desk ? { l: desk.left, r: desk.right, from: "desk" }
      : pr && pcs ? { l: pr.left + parseFloat(pcs.paddingLeft) + parseFloat(pcs.borderLeftWidth), r: pr.right - parseFloat(pcs.paddingRight) - parseFloat(pcs.borderRightWidth), from: "parent" } : null;
    const cs = hd ? getComputedStyle(hd) : null;
    const stamp = [...document.querySelectorAll<HTMLElement>(".hpanel-stamp")].filter(vis);
    return {
      path: location.pathname, win: b(win), winBg: win ? getComputedStyle(win).backgroundColor : null, tabBg: tab ? getComputedStyle(tab).backgroundColor : null,
      any: b(any), hd: b(hd), bg: cs?.backgroundColor ?? null, radius: cs?.borderTopLeftRadius ?? null, border: cs ? `${cs.borderTopWidth} ${cs.borderTopStyle}` : null,
      sheet: !!sheet, col, texts, art: b(art), stamps: stamp.map((e) => ({ text: (e.textContent ?? "").trim(), color: getComputedStyle(e).color, inH1: !!e.closest("h1") })),
      overflowX: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, ...scs.map((s) => s.scrollWidth - s.clientWidth)),
    };
  });
}
