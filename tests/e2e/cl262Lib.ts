/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 (design-refs/contact-list-v26-2/) — measurement helpers for the CL262 locks and the report's screens.
 * A plain module: importing a `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY: every workspace page stays mounted (the card itself portals to <body>).
 * ⚠️ MUTATIONS (`CL262_MUTATE=<lock>`) are CSS or DOM breaks applied in the page after it loads, each named for the lock
 *    that must notice it; a lock that stays green under its own mutation is unproved.
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openCl26 } from "./cl26Lib";

export const DIR = "reports/contact-list-v26-2";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export type VP = { width: number; height: number };
export const MUT = process.env.CL262_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

export const CARD = "[data-cl262='card']";
/** the list at its defaults, then the card on the first agent of a stand (you · agent · none · closed), arrival settled */
export async function openCard(page: Page, vp: VP, o: { stand?: string; id?: string; settle?: boolean } = {}) {
  await openCl26(page, vp);
  const sel = o.id ? `.aglist [data-cl26='row'][data-id='${o.id}']` : o.stand ? `.aglist [data-cl26='row'][data-k='${o.stand}']` : ".aglist [data-cl26='row']";
  const row = page.locator(sel).first();
  await row.scrollIntoViewIfNeeded();
  const id = await row.getAttribute("data-id");
  await row.locator("[data-cl26='name']").click();
  await page.locator(CARD).first().waitFor({ timeout: 10_000 });
  if (o.settle !== false) await page.waitForTimeout(900);
  return id ?? "";
}
export const frameScroll = (page: Page) => page.evaluate(() => document.querySelector<HTMLElement>("[data-cl262='scroll']")?.scrollTop ?? -1);
export async function cssBreak(page: Page, css: string) { await page.addStyleTag({ content: css }); await page.waitForTimeout(250); }
export function shotDir() { mkdirSync(`${DIR}/shots`, { recursive: true }); return `${DIR}/shots`; }
