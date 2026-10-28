/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD ON THE PHONE v1 — the helpers shared by the DM1 locks and the report's shots (a spec may not
 * import a spec).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/dashboard-mobile-v1";
export type VP = { width: number; height: number };
export const tag = (v: VP) => `${v.width}x${v.height}`;
export const MUT = process.env.DM1_MUTATE ?? "";
export const PHONES: VP[] = [{ width: 390, height: 844 }, { width: 375, height: 667 }];
export const DESKTOPS: VP[] = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];

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

/** The in-page breaks. Each is a lock's own named mutation, applied as a stylesheet after load. */
export const CSS_MUTATIONS: Record<string, string> = {};

/**
 * Opens the dashboard at a size. ⚠️ THE SHARED `openRoute` CANNOT OPEN A PHONE WIDTH (its shell wait
 * finds the hidden sidebar first), so a phone signs in at 1440 and reloads at its own size — the session
 * lives in IndexedDB and survives the reload.
 */
export async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}) {
  const f = { __SA_FOUNDING_SEEN: 5, ...flags };
  await page.addInitScript(([fl]) => {
    Object.assign(window, fl);
    try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ }
  }, [f] as const);
  if (vp.width < 768) {
    await openRoute(page, "/dashboard", { width: 1440, height: 900 });
    await page.setViewportSize(vp);
    await page.reload();
  } else {
    await openRoute(page, "/dashboard", vp);
  }
  await page.locator('[data-d58="page"][data-loading="0"], [data-dm1="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  if (CSS_MUTATIONS[MUT]) await page.addStyleTag({ content: CSS_MUTATIONS[MUT] });
  await page.waitForTimeout(800);
}

export const sleep = (page: Page, ms: number) => page.waitForTimeout(ms);
