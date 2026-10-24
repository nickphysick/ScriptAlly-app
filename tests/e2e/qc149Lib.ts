/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 (design-refs/query-centre-v149/) — helpers for the QC149 locks. A plain module: importing a
 * `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY: every workspace page stays mounted.
 * ⚠️ A READING THAT FINDS NOTHING IS A FALSE READING, NEVER A SKIP — each lock asserts its population first.
 * ⚠️ QC149_BASE=1 marks a red-first run against the base build; QC149_MUTATE=<lock> applies that lock's named break
 *    where it is expressible in the page (CSS / a script); the source-edit breaks are applied to the source and rebuilt.
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

export const DIR = "reports/qc-v149";
export const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
export type VP = { width: number; height: number };
export const MUT = process.env.QC149_MUTATE ?? "";
export const BASE = process.env.QC149_BASE === "1";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    const tag = BASE ? "base-" : MUT ? `mut-${MUT}-` : "";
    writeFileSync(`${DIR}/ledger/${tag}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** a named break expressed in the page: a stylesheet laid over the build */
export async function mutateCss(page: Page, lock: string, css: string) {
  if (MUT === lock) await page.addStyleTag({ content: css });
}

export type Box = { l: number; t: number; r: number; b: number; w: number; h: number };
/** the first visible match's box, or null (never a hang) */
export async function box(page: Page, sel: string): Promise<Box | null> {
  return page.evaluate((s) => {
    const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height };
  }, sel);
}
export async function text(page: Page, sel: string): Promise<string | null> {
  return page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0)?.textContent?.replace(/\s+/g, " ").trim() ?? null, sel);
}
export async function css(page: Page, sel: string, props: string[]): Promise<Record<string, string> | null> {
  return page.evaluate(([s, ps]) => {
    const e = [...document.querySelectorAll<HTMLElement>(s as string)].find((x) => x.getBoundingClientRect().height > 0);
    if (!e) return null;
    const c = getComputedStyle(e);
    return Object.fromEntries((ps as string[]).map((p) => [p, c.getPropertyValue(p)]));
  }, [sel, props] as const);
}
/** press the first visible match; false (a reading) when there is none */
export async function tap(page: Page, sel: string): Promise<boolean> {
  const ok = await page.evaluate((s) => {
    const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
    if (!e) return false;
    e.scrollIntoView({ block: "center" });
    return true;
  }, sel);
  if (!ok) return false;
  await page.locator(sel).filter({ visible: true }).first().click();
  return true;
}
/** the list's visible rows, in order: id, where, status, name */
export async function rows(page: Page): Promise<{ id: string; where: string; status: string; name: string; due: number | null }[]> {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='row']")]
    .filter((r) => r.getBoundingClientRect().height > 0 && !r.closest("[data-qc139='practice']"))
    .map((r) => ({ id: r.dataset.id ?? "", where: r.dataset.where ?? "", status: r.dataset.status ?? "", name: r.dataset.name ?? "", due: r.dataset.due ? Number(r.dataset.due) : null })));
}
export async function chipCounts(page: Page): Promise<Record<string, number | null>> {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-qc149='view']")]
    .filter((b) => b.getBoundingClientRect().height > 0).map((b) => [b.dataset.k ?? "", b.dataset.n != null ? Number(b.dataset.n) : null])));
}
/** the panel's card (the query card), once it has opened */
export const CARD = "[data-qp='panel'] [data-qc149c='card']";
export async function openPanel(page: Page, id: string) {
  await page.locator(`.qc138-sheet [data-qcv='row'][data-id="${id}"]`).first().scrollIntoViewIfNeeded();
  await page.locator(`.qc138-sheet [data-qcv='row'][data-id="${id}"] [data-qcv='row-first']`).first().click();
  await page.waitForTimeout(1200);
}
export async function closePanel(page: Page) {
  if (await page.locator("[data-qp='panel']").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(600); }
}
/** press the undo bar's Undo and wait for it to say done — a write that cannot be undone fails loudly */
export async function undo(page: Page): Promise<boolean> {
  const u = page.locator("[data-qad-undo]").first();
  try { await u.waitFor({ timeout: 6000 }); } catch { return false; }
  await u.click();
  try { await page.locator("[data-qad-toast='done']").first().waitFor({ timeout: 8000 }); } catch { /* read below */ }
  await page.waitForTimeout(1500);
  return true;
}
