/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 (design-refs/contact-list-v26/) — measurement helpers for the CL26 locks and the report's screens.
 * A plain module: importing a `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY: every workspace page stays mounted.
 * ⚠️ EVERY OPEN STARTS FROM THE DEFAULTS: the list's memory is set before the page loads (Letter, Surname A to Z).
 * ⚠️ MUTATIONS (`CL26_MUTATE=<lock>`) are CSS or DOM breaks applied in the page after it loads, each named for the lock
 *    that must notice it; a lock that stays green under its own mutation is unproved.
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

export const DIR = "reports/contact-list-v26";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export type VP = { width: number; height: number };
export const MUT = process.env.CL26_MUTATE ?? "";
export const BASE = process.env.CL26_BASE === "1";

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

export const ROW = "[data-cl26='row']";
export type Group = "letter" | "status" | "none";
export type Sort = "surname" | "added" | "reply" | "status";
export interface Open26 { group?: Group; sort?: Sort; reversed?: boolean; health?: number }

/** the Contact list from its defaults (or the named grouping and sort), the page guide out of the way */
export async function openCl26(page: Page, vp: VP, o: Open26 = {}) {
  if (!/^https?:/.test(page.url())) await openApp(page, "/agents", vp);
  await page.evaluate((x) => {
    try {
      for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1");
      for (const k of ["sa.contactList.v3", "sa.contactList.v4", "sa.contactList.v5", "sa.contactBook.sel"]) sessionStorage.removeItem(k);
      localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: x.sort ?? "surname", reversed: !!x.reversed, pinned: false, view: "list", group26: x.group ?? "letter" }));
    } catch { /* private mode */ }
  }, o);
  if (typeof o.health === "number") await page.addInitScript((h) => { (window as unknown as { __SA_CL_HEALTH?: number }).__SA_CL_HEALTH = h; }, o.health);
  await openApp(page, "/agents", vp);
  await page.locator(ROW).first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.mouse.move(3, 3);
}

/** the page's scroller (the visible one) */
export const scrollerTop = (page: Page) => page.evaluate(() => {
  const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
  return sc.getBoundingClientRect().top;
});

/** apply a CSS break for a mutation run */
export async function cssBreak(page: Page, css: string) {
  await page.addStyleTag({ content: css });
  await page.waitForTimeout(250);
}

export function shotDir() { mkdirSync(`${DIR}/shots`, { recursive: true }); return `${DIR}/shots`; }
