/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 (design-refs/contact-list-v24/) — measurement helpers for the CL24 locks and the report's screens.
 * A plain module: importing a `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY: every workspace page stays mounted.
 * ⚠️ EVERY OPEN STARTS FROM THE DEFAULTS: the list's memory and full screen are set before the page loads.
 * ⚠️ MUTATIONS (`CL24_MUTATE=<lock>`) are CSS or DOM breaks applied in the page after it loads, each named for the
 *    lock that must notice it; a lock that stays green under its own mutation is unproved.
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

export const DIR = "reports/contact-list-v24";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export type VP = { width: number; height: number };
export const MUT = process.env.CL24_MUTATE ?? "";
export const BASE = process.env.CL24_BASE === "1";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

export type CLView = "list" | "cards";
export type CLOpt = { full?: boolean; view?: CLView; grouped?: boolean };
/** the list's first agent row, in either view, or the address book's in full screen */
export const ANY_AGENT = "[data-cl24='row'], [data-cl24='card'], [data-cl24='book-row'], [data-nb1='name-row'], .clv-row";

export async function openCl24(page: Page, vp: VP, o: CLOpt = {}) {
  if (!/^https?:/.test(page.url())) await openApp(page, "/agents", vp);
  await page.evaluate((x) => {
    try {
      for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1");
      for (const k of ["sa.contactList.v3", "sa.contactList.v4", "sa.contactList.v5", "sa.contactBook.sel"]) sessionStorage.removeItem(k);
      for (const k of ["sa.pinList.agents", "sa.contactsFull"]) localStorage.removeItem(k);
      localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: "surname", reversed: false, pinned: false, view: x.view ?? "list", ...(x.grouped === false ? { byStatus: false } : {}) }));
    } catch { /* private mode */ }
  }, o);
  await openApp(page, `/agents${o.full ? "?full=1" : ""}`, vp);
  await page.locator(ANY_AGENT).first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  await page.mouse.move(3, 3);
}

/** the Query Centre at the same size, its list's defaults set, for the cross-page geometry */
export async function openQc149(page: Page, vp: VP) {
  await page.evaluate(() => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  });
  await openApp(page, "/queries", vp);
  await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
}

export type Box = { l: number; r: number; t: number; b: number; w: number; h: number };
/** the first VISIBLE match's box, or null */
export async function box(page: Page, sel: string): Promise<Box | null> {
  return page.evaluate((s) => {
    const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height };
  }, sel);
}
/** scroll the page's scroller (the visible one) to y */
export async function scrollTo(page: Page, y: number) {
  await page.evaluate((v) => {
    const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
    if (sc) sc.scrollTop = v;
  }, y);
  await page.waitForTimeout(250);
}
export async function shot(page: Page, name: string) {
  mkdirSync(`${DIR}/screens`, { recursive: true });
  await page.screenshot({ path: `${DIR}/screens/${name}.png` });
}
/** apply a named break in the page (a style tag) */
export async function mutate(page: Page, name: string, css: string) {
  if (MUT === name) await page.addStyleTag({ content: css });
}
