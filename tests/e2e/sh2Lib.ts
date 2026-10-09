/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App shell v2 (design-refs/shell/shell-v2-page.html) — the census and the readers the SH2 locks share.
 *
 * ⚠️ THE SHEET ROUTES COME FROM THE APP'S OWN REGISTER (`headerSheetRoutes`), never a second list here: the
 *    shell paints the tab from it, so a census typed by hand could agree with itself and not with the app.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { hasHeaderSheet } from "../../src/components/shell/headerSheetRoutes";
import { OWN_HEADER_ROUTES } from "./plateRoutes";
import { openApp } from "./pageHeaderV2Lib";

export const DIR = "reports/shell-v2";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export const OAT = [242, 238, 232], PAPER = [251, 249, 245], BLUSH = [243, 221, 210];
export const rgb = (c: number[]) => `rgb(${c.join(", ")})`;
export const FLAP = 26;

/** Every signed-in route (routeTiers WORKSPACE_PATHS; the settings chassis is represented by /account). */
export const ROUTES = ["/dashboard", "/queries", "/queries/analytics", "/todo", "/todo/calendar", "/todo/noteboard", "/agents", "/agents/discover", "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/import", "/account", "/plans", "/help"] as const;
export const SHEET_ROUTES = ROUTES.filter((r) => hasHeaderSheet(r));
export const NO_SHEET_ROUTES = ROUTES.filter((r) => !hasHeaderSheet(r));
export const OWN_ROUTES = OWN_HEADER_ROUTES.filter((r) => hasHeaderSheet(r));
/** The drawing in each header that has one. `crosses`: it hangs over the header's bottom edge (the three open headers). */
export const ART: Record<string, { sel: string; crosses: boolean }> = {
  /* Query Centre v135: the three open headers' drawings no longer cross the edge — they sit 34 above it (QC135 A3) */
  "/queries": { sel: ".qcoh img", crosses: false },
  "/agents": { sel: '[data-cl15="header-art"] img', crosses: false },
  "/manuscripts": { sel: ".ms21-art img", crosses: false },
  "/manuscripts/packages": { sel: '.ph [data-probe="art"] img', crosses: false },
};
/** Section bands: the element whose box is the band, and where its tint is painted. */
export const BANDS = [
  { route: "/queries", sel: ".qcv-group.qc13 > .qcr", pseudo: "::before" },
  { route: "/agents", sel: ".clv-group > .cl14-next", pseudo: null },
  { route: "/manuscripts", sel: ".ms21-band", pseudo: null },
] as const;
export const BANNERS = [
  { route: "/queries", sel: ".qc134-ban" },
  { route: "/agents", sel: ".clv-group > .cl15-ban" },
  { route: "/manuscripts", sel: ".ms21-ban" },
] as const;
export const HAWK = '[data-qcv="ws-hawk"]';

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  /** Written before anything is asserted, so a test holding several ledgers leaves all of them on disk when the first is red. */
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
export const sameRgb = (p: number[] | undefined, q: number[], t: number) => !!p && p.length === 3 && p.every((v, i) => Math.abs(v - q[i]) <= t);

/**
 * `SH2_MUTATE=<name>` breaks one named thing in the page, so a lock can be watched going red without a
 * rebuild. Injected at document start on every navigation.
 */
export const MUTATIONS: Record<string, string> = {
  S1: ".ws-window { background: #f3f2f0 !important; }",
  S2: ".hsheet { width: 100% !important; } .hsheet::before { display: none !important; }",
  S3: ".hsheet > i { clip-path: none !important; bottom: 26px !important; } .hsheet { filter: none !important; } .hsheet > i { box-shadow: 0 12px 12px rgba(28,19,15,.12); }",
  S4: ".hsheet-host { border-bottom: 1px solid rgba(28, 19, 15, 0.14) !important; }",
  S5: ".hsheet { z-index: 5 !important; }",
  S6: ".ws-app .ws-main { --ink-tab: var(--ws-page) !important; }",
  B1: ":root { --ws-band: #e9e6e0 !important; }",
  B2: `.qc134-ban::before, .cl15-ban::before, .ms21-ban::before { inset: 0 !important; left: 0 !important; width: auto !important; transform: none !important; box-shadow: 0 0 0 100vmax #f3ddd2 !important; clip-path: inset(0 -100vmax) !important; }
       .qc134-ban::after, .cl15-ban::after, .ms21-ban::after { content: "" !important; position: absolute; left: 50%; top: calc(100% - 1px); width: 150px; height: 34px; transform: translateX(-50%); background: #f3ddd2; }`,
  /* the old gaps, 104 and (below 1440) 92. ⚠️ Only 1280 binds: at 1512 the hawk cleared the flap at the old gap too. */
  B3: ".qcv-group.qc13 > .qc134-ban ~ .qcv-page.qcw { margin-top: 104px !important; } @media (max-width: 1439.5px) { .qcv-group.qc13 > .qc134-ban ~ .qcv-page.qcw { margin-top: 92px !important; } }",
  L1: "[data-loading] .hsheet, .clv-group[data-loading] .hsheet, .clv-group[data-loading] .cl15-ban::before { display: none !important; }",
};
export async function prepare(page: Page) {
  const css = process.env.SH2_MUTATE ? MUTATIONS[process.env.SH2_MUTATE] : "";
  if (process.env.SH2_MUTATE && !css) throw new Error(`unknown SH2_MUTATE ${process.env.SH2_MUTATE}`);
  await page.addInitScript((c) => {
    try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* private mode */ }
    if (!c) return;
    const put = () => { const s = document.createElement("style"); s.setAttribute("data-sh2-mutation", ""); s.textContent = c; document.documentElement.appendChild(s); };
    if (document.documentElement) put(); else document.addEventListener("readystatechange", put, { once: true });
  }, css);
}
export async function open(page: Page, route: string, vp: { width: number; height: number }) {
  await openApp(page, route, vp);
  await page.waitForTimeout(900);
}

/** A 1px column of the screen, top to bottom, as [r, g, b] rows. */
export async function column(page: Page, x: number, y0: number, y1: number): Promise<number[][]> {
  const h = Math.max(1, Math.round(y1 - y0));
  const buf = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y0), width: 1, height: h }, animations: "disabled" });
  return page.evaluate(async ({ b64, h }) => {
    const i = new Image(); i.src = `data:image/png;base64,${b64}`; await i.decode();
    const c = document.createElement("canvas"); c.width = 1; c.height = h; const x = c.getContext("2d")!; x.drawImage(i, 0, 0);
    const d = x.getImageData(0, 0, 1, h).data; const out: number[][] = [];
    for (let k = 0; k < h; k++) out.push([d[k * 4], d[k * 4 + 1], d[k * 4 + 2]]);
    return out;
  }, { b64: buf.toString("base64"), h });
}
/**
 * Where a colour field's bottom edge is at x: the y of the first row, scanning down from `from`, that is no
 * longer `colour`. Null when the scan does not START on the colour (the precondition) or never leaves it.
 */
export async function edgeBelow(page: Page, x: number, from: number, colour: number[], span = 70) {
  const rows = await column(page, x, from, from + span);
  if (!sameRgb(rows[0], colour, 3)) return { y: null as number | null, first: rows[0], after: undefined as number[] | undefined, rows };
  const k = rows.findIndex((r) => !sameRgb(r, colour, 3));
  return { y: k < 0 ? null : Math.round(from) + k, first: rows[0], after: k < 0 ? undefined : rows[Math.min(rows.length - 1, k + 6)], rows };
}

/** One read of the page on screen: the page sheet, the tab, the header and its sheet, the art, the footer. */
export async function readPage(page: Page, artSel: string | null) {
  return page.evaluate((artSel) => {
    const vis = (e: Element | null | undefined): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const b = (e: Element | null | undefined) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const win = document.querySelector<HTMLElement>(".ws-window");
    const tab = document.querySelector<HTMLElement>(".ws-ftab"), fil = document.querySelector<SVGElement>(".ws-ftfl");
    const host = [...document.querySelectorAll<HTMLElement>(".hsheet-host")].filter(vis).find((e) => win?.contains(e)) ?? null;
    const head = host ?? [...document.querySelectorAll<HTMLElement>('[data-own-header], [data-probe="page-header"]')].filter(vis).find((e) => win?.contains(e)) ?? null;
    const sheet = host?.querySelector<HTMLElement>(":scope > .hsheet") ?? null, face = sheet?.querySelector<HTMLElement>("i") ?? null;
    const hcs = head ? getComputedStyle(head) : null;
    const alpha = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return 1; const p = m[1].split(",").map((v) => parseFloat(v)); return p.length > 3 ? p[3] : 1; };
    const chrome = head?.closest<HTMLElement>(".wpg-chrome") ?? null, ccs = chrome ? getComputedStyle(chrome) : null;
    /* a rule: any element 2px tall or less, painted, at least half the header wide, within 4px of the flat edge */
    const hb = b(head);
    const flat = hb ? hb.b - (hcs ? parseFloat(hcs.borderBottomWidth) : 0) : null;
    const rules = !head || flat === null ? [] : [...(head.parentElement?.querySelectorAll<HTMLElement>("*") ?? [])].filter(vis).filter((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.height <= 2 && r.width >= hb!.w / 2 && Math.abs(r.top - flat) <= 4 && alpha(cs.backgroundColor) > 0 && !e.closest(".hsheet");
    }).map((e) => e.className.toString());
    const scs = [...document.querySelectorAll<HTMLElement>(".wpg-scroll, .ws-wbody")].filter(vis);
    const art = artSel ? [...document.querySelectorAll<HTMLElement>(artSel)].find(vis) ?? null : null;
    let hit: string | null = null, hitY: number | null = null;
    if (art && sheet && flat !== null) {
      const ab = art.getBoundingClientRect();
      /* a point inside the drawing AND on the sheet: just under the edge where the drawing crosses it, else near the drawing's foot */
      hitY = ab.bottom > flat + 6 ? flat + 4 : Math.min(flat - 6, ab.bottom - 6);
      const was = sheet.style.pointerEvents; sheet.style.pointerEvents = "auto"; if (face) face.style.pointerEvents = "auto";
      const aw = art.style.pointerEvents; art.style.pointerEvents = "auto";
      const el = document.elementFromPoint(ab.left + ab.width / 2, hitY);
      hit = el === art ? "art" : el && sheet.contains(el) ? "sheet" : el ? `${el.tagName}.${el.className.toString().slice(0, 30)}` : null;
      sheet.style.pointerEvents = was; if (face) face.style.pointerEvents = ""; art.style.pointerEvents = aw;
    }
    const foot = [...document.querySelectorAll<HTMLElement>(".af")].find(vis) ?? null;
    return {
      vw: window.innerWidth, vh: window.innerHeight,
      win: b(win), winBg: win ? getComputedStyle(win).backgroundColor : null,
      tabBg: tab ? getComputedStyle(tab).backgroundColor : null, filFill: fil ? getComputedStyle(fil).fill : null,
      head: hb, flat, hasHost: !!host,
      borderW: hcs ? parseFloat(hcs.borderBottomWidth) : null, borderA: hcs ? alpha(hcs.borderBottomColor) : null,
      chromeBorderA: ccs ? (parseFloat(ccs.borderBottomWidth) > 0 ? alpha(ccs.borderBottomColor) : 0) : 0,
      rules,
      sheet: b(sheet), faceBg: face ? getComputedStyle(face).backgroundColor : null, clip: face ? getComputedStyle(face).clipPath : null,
      filter: sheet ? getComputedStyle(sheet).filter : null,
      overflowX: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, ...scs.map((s) => s.scrollWidth - s.clientWidth)),
      art: b(art), hit, hitY,
      footBg: foot ? getComputedStyle(foot).backgroundColor : null,
    };
  }, artSel);
}

/** Scroll the page so `sel` sits `at` px under the top of its scroller; returns its box. */
export async function bring(page: Page, sel: string, at = 140) {
  const box = await page.evaluate(({ sel, at }) => {
    const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0);
    const sc = el?.closest<HTMLElement>(".wpg-scroll");
    if (!el || !sc) return null;
    sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - at;
    return true;
  }, { sel, at });
  await page.waitForTimeout(500);
  return box;
}
