/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v93 — the helpers shared by the DB93 locks and the report's shots (a spec may not import a spec).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/dashboard-v93";
export type VP = { width: number; height: number };
export const tag = (v: VP) => `${v.width}x${v.height}`;
export const MUT = process.env.DB93_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The in-page breaks. Each is the lock's own named mutation. */
export const CSS_MUTATIONS: Record<string, string> = {
  "A1-tint": `.d58 .d71-th { background: #e8eef6 !important; }`,
  "A2-tall": `.d58 .d71-th { padding-top: 16px !important; }`,
  "A3-tall-body": `.d71-task .d71-tb { padding-top: 60px !important; }`,
  "A3-label": `.d71-wlab > .d71-wexp { left: 100% !important; transform: translateX(-50%) !important; visibility: visible !important; }`,
};

/** A 254px task card (the C5 row) — forced for Part A, natural from Part C. */
export const TASK_254 = `.d58[data-mode="q"] .d71-right { grid-template-rows: 254px var(--d71-fw-h, 194px) !important; }`;

export async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}, ms = "seed-ms-1", extraCss = "") {
  await page.addInitScript(([f, m]) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
  }, [flags, ms] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  if (extraCss) await page.addStyleTag({ content: extraCss });
  if (CSS_MUTATIONS[MUT]) await page.addStyleTag({ content: CSS_MUTATIONS[MUT] });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
}

/** Every item of the task card's cycle, by its pager (reduced motion keeps it still). */
export async function eachTask<T>(page: Page, read: () => Promise<T>): Promise<T[]> {
  const pos = (await page.locator('[data-d71="pos-text"]').first().textContent().catch(() => "1 OF 1")) ?? "1 OF 1";
  const n = Number(pos.split(" OF ")[1] ?? 1);
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    out.push(await read());
    if (n > 1) { await page.locator('[data-d71="next"]').first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(90); }
  }
  return out;
}
