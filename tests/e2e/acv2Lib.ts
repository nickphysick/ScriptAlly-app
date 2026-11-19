/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2 (design-refs/agent-card-v2/) — measurement helpers for the AC2 locks and the report's screens.
 * A plain module: importing a `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ MUTATIONS (`AC2_MUTATE=<lock>`) are CSS or DOM breaks applied in the page after it loads, each named for the lock that
 *    must notice it; a lock that stays green under its own mutation is unproved.
 */
import type { Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { openCard, SIZES } from "./cl262Lib";

export const DIR = "reports/agent-card-v2";
export { SIZES };
export type VP = { width: number; height: number };
export const MUT = process.env.AC2_MUTATE ?? "";
/** several mutations in one run: each lock reacts only to its own names (`AC2_MUTATE=height,nextbox,…`) */
export const MUTS = new Set(MUT.split(",").map((x) => x.trim()).filter(Boolean));

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

export const AC = "[data-cl262='panel'] [data-acv2='card']";
export async function openAc(page: Page, vp: VP, o: { stand?: string; id?: string } = {}) {
  const id = await openCard(page, vp, o);
  await page.locator(AC).first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(300);
  return id;
}
export async function tab(page: Page, t: "profile" | "history" | "notes") {
  await page.locator(`${AC} [data-cl262='tab'][data-tab='${t}']`).click();
  await page.waitForTimeout(350);
}
export function shotDir() { mkdirSync(`${DIR}/shots`, { recursive: true }); return `${DIR}/shots`; }
/** the card's box with a margin, for a clipped screenshot (the lean reaches past the box a little) */
export async function cardClip(page: Page) {
  const b = await page.locator("[data-cl262='panel']").first().boundingBox();
  if (!b) return undefined;
  const vp = page.viewportSize()!;
  const x = Math.max(0, b.x - 30), y = Math.max(0, b.y - 20);
  return { x, y, width: Math.min(vp.width - x, b.width + 60), height: Math.min(vp.height - y, b.height + 40) };
}
export async function cssBreak(page: Page, css: string) { await page.addStyleTag({ content: css }); await page.waitForTimeout(250); }
