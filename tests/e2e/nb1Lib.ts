/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * navy-bar-address-book v1 (design-refs/navy-bar-address-book-v1/) — measurement helpers for the NB1 locks and the
 * report's screens. A plain module: importing a `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY: every workspace page stays mounted.
 * ⚠️ EVERY OPEN STARTS FROM THE DEFAULTS: the list's memory and full screen are set before the page loads.
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { openApp } from "./pageHeaderV2Lib";

export const DIR = "reports/navy-bar-address-book-v1";
export const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
export type VP = { width: number; height: number };
export const MUT = process.env.NB1_MUTATE ?? "";
export const BASE = process.env.NB1_BASE === "1";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT === this.name ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

export type QOpt = { view?: "cards" | "list"; group?: string; full?: boolean; sort?: { key: string; reversed: boolean } };
export async function openQc(page: Page, vp: VP, o: QOpt = {}) {
  await page.addInitScript((x: QOpt) => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.setItem("sa.qc138.folded", "[]");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: x.group ?? "status", sort: x.sort ?? { key: "due", reversed: false }, density: "comfortable", view: x.view ?? "list" }));
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, o);
  await openRoute(page, "/queries", vp);
  await page.locator(".qc138-sheet [data-qcv='row'], .qc138-sheet [data-qc142='card']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
  if (o.full) { await page.keyboard.press("f"); await page.waitForTimeout(1200); }
}

/** the address book's box once it has drawn its rows */
export const BOOK_ROW = "[data-nb1='book'] [data-nb1='name-row']";
export type CLOpt = { full?: boolean; sort?: string; reversed?: boolean };
/** every open starts from the defaults: the list's memory, the pin and the remembered agent are set before the load */
export async function openCl(page: Page, vp: VP, o: CLOpt = {}) {
  if (!/^https?:/.test(page.url())) await openApp(page, "/agents", vp);
  await page.evaluate((x) => {
    try {
      for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1");
      for (const k of ["sa.contactList.v3", "sa.contactList.v4", "sa.contactList.v5", "sa.contactBook.sel"]) sessionStorage.removeItem(k);
      for (const k of ["sa.pinList.agents", "sa.contactsFull"]) localStorage.removeItem(k);
      localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: x.sort ?? "surname", reversed: !!x.reversed, pinned: false, view: "list" }));
    } catch { /* private mode */ }
  }, o);
  await openApp(page, `/agents${o.full ? "?full=1" : ""}`, vp);
  /* the base build has no address book: its rows stand in, so a red-first run records readings rather than timing out */
  await page.locator(`${BOOK_ROW}, .clv-group:not([data-loading]) .clv-row`).first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
}
export const freshCl = openCl;
/** press the first visible match, or nothing (a missing control is a reading, never a hang) */
export async function tap(page: Page, sel: string): Promise<boolean> {
  const l = page.locator(sel).first();
  if (!(await l.count())) return false;
  try { await l.click({ timeout: 3000 }); return true; } catch { return false; }
}

export const shot = async (page: Page, name: string) => {
  mkdirSync(`${DIR}/screens`, { recursive: true });
  await page.screenshot({ path: `${DIR}/screens/${name}.png` });
};
export const writeJson = (name: string, v: unknown) => { mkdirSync(`${DIR}/runs`, { recursive: true }); writeFileSync(`${DIR}/runs/${name}.json`, JSON.stringify(v, null, 1)); };
