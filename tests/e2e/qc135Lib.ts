/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v135 (design-refs/query-centre/query-centre-v135.html) — the readers the QC135 locks share.
 * A: the centred-pair header on /queries, /agents and /manuscripts. B: the Query Centre's badge desk.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

export const DIR = "reports/qc-v135";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
/** The three open headers: the header, its text block and its drawing. */
export const HEADERS = [
  { route: "/queries", hd: ".qcoh", txt: ".qcoh-txt", art: ".qcoh-art" },
  { route: "/agents", hd: ".cl15-hd", txt: ".cl15-txt", art: '[data-cl15="header-art"] img' },
  { route: "/manuscripts", hd: ".ms21-hd", txt: ".ms21-txt", art: ".ms21-art img" },
] as const;

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

/** One header, read off the page on screen. */
export async function readHeader(page: Page, h: { hd: string; txt: string; art: string }) {
  return page.evaluate((h) => {
    const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const hd = vis(h.hd), txt = vis(h.txt), art = vis(h.art), win = document.querySelector(".ws-window");
    if (!hd) return null;
    const cs = getComputedStyle(hd), acs = art ? getComputedStyle(art) : null;
    /* the GRID ITEM that holds the drawing (the drawing itself, or its slot): self-alignment is a fact about the item */
    let item: HTMLElement | null = art; while (item && item.parentElement !== hd) item = item.parentElement;
    const ics = item ? getComputedStyle(item) : null;
    const hb = b(hd)!;
    return {
      win: b(win), hd: hb, txt: b(txt), art: b(art),
      cols: cs.gridTemplateColumns, gap: parseFloat(cs.columnGap), justify: cs.justifyContent, align: cs.alignItems,
      padB: parseFloat(cs.paddingBottom), padT: parseFloat(cs.paddingTop), flat: hb.b - parseFloat(cs.borderBottomWidth),
      artTop: acs ? acs.top : null, artSelf: ics ? `${ics.alignSelf} / ${ics.justifySelf}` : null, artMargin: acs ? acs.margin : null, artTransform: acs ? acs.transform : null,
      loading: hd.hasAttribute("data-loading"),
    };
  }, h);
}

/**
 * `QC135_MUTATE=<lock>` breaks one named thing in the page, so a lock can be watched going red without a rebuild.
 */
export const MUTATIONS: Record<string, string> = {
  A1: ".qcoh, .cl15-hd, .ms21-hd { justify-content: start !important; }",
  A2: ".qcoh .qcoh-art, .cl15-art img, .ms21-art img { top: 30px !important; }",
  A3: ".qcoh, .cl15-hd, .ms21-hd { padding-bottom: 18px !important; }",
  A4: ".ms21-hd { column-gap: 40px !important; }",
  A5: ".qcoh[data-loading], .cl15-hd[data-loading] { display: block !important; }",
  B1: ".qc135-card .qc135-badge { top: 0 !important; }",
  B2: ".qc135-card .qc135-strip { background: #fff !important; }",
  B3: ".qc135-card::before { display: none !important; }",
  B4: ".qc135-card .qc135-art { top: 0 !important; transform: none !important; }",
  B5: ".qc135-card .qc135-mom { white-space: normal !important; }",
  B6: ".qc135-card .qc135-ch svg { width: 260px !important; }",
  B7: ".qc135-card.is-on { box-shadow: 0 0 0 1px rgba(28,19,15,.09) !important; }",
  B8: '.qc135-card[data-loading="true"] .qc135-badge { display: none !important; }',
};
export async function prepare(page: Page) {
  const css = process.env.QC135_MUTATE ? MUTATIONS[process.env.QC135_MUTATE] : "";
  if (process.env.QC135_MUTATE && process.env.QC135_MUTATE !== "B9" && !css) throw new Error(`unknown QC135_MUTATE ${process.env.QC135_MUTATE}`);
  await page.addInitScript((c) => {
    try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* private mode */ }
    if (!c) return;
    const put = () => { const s = document.createElement("style"); s.setAttribute("data-qc135-mutation", ""); s.textContent = c; document.documentElement.appendChild(s); };
    if (document.documentElement) put(); else document.addEventListener("readystatechange", put, { once: true });
  }, css);
}
