/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERIES ON A PHONE v1 — the helpers the QM1 locks share (a spec may not import a spec).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/queries-mobile-v1";
export type VP = { width: number; height: number };
export const tag = (v: VP) => `${v.width}x${v.height}`;
export const MUT = process.env.QM1_MUTATE ?? "";
export const PHONES: VP[] = [{ width: 390, height: 844 }, { width: 360, height: 780 }];
export const DESK: VP = { width: 1512, height: 900 };
export const MS = "seed-ms-1";

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

/** The in-page breaks: a lock's own named mutation, applied as a stylesheet after load. Code mutations are in the report. */
export const CSS_MUTATIONS: Record<string, string> = {
  /* L2 — the + button turns rust */
  "plus-rust": ".qm1-ib.solid { background: #b4553f !important; }",
  /* L10 — the celebration's layer lifted back over the undo bar */
  "cheer-over-undo": ".qm1-layer { z-index: 91 !important; }",
  /* L1 — the phone page's breakpoint dropped: the desktop is no longer protected (proved by building with 9999px) */
};

/**
 * Opens the Query Centre at a size. ⚠️ THE SHARED `openRoute` CANNOT OPEN A PHONE WIDTH (its shell wait finds the
 * hidden sidebar first), so a phone signs in at 1440 and reloads at its own size.
 */
export async function openQ(page: Page, vp: VP, opts: { search?: string; clockMs?: number } = {}) {
  await page.addInitScript(([ms]) => {
    try { localStorage.setItem("scriptally_active_manuscript_id", ms); sessionStorage.removeItem("sa.qm1.chip"); } catch { /* private mode */ }
  }, [MS] as const);
  if (opts.clockMs != null) await page.clock.setFixedTime(new Date(opts.clockMs));
  /* ⚠️ ON EVERY DOCUMENT, NOT ONCE: a style added after load is gone after the next navigation, so a lock that navigates
     (L10 does) would read the unmutated page and a mutation would prove nothing */
  await page.addInitScript(([css]) => {
    const put = () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); };
    if (document.head) put(); else document.addEventListener("DOMContentLoaded", put);
  }, [`*, *::before, *::after { transition: none !important; animation: none !important; }\n${CSS_MUTATIONS[MUT] ?? ""}`] as const);
  const path = `/queries${opts.search ?? ""}`;
  if (vp.width < 768) {
    await openRoute(page, path, { width: 1440, height: 900 });
    await page.setViewportSize(vp);
    await page.reload();
    await page.locator('[data-qm1="page"]').waitFor({ timeout: 30_000 });
    await page.locator('[data-qm1="chip"][data-count]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  } else {
    await openRoute(page, path, vp);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
}

export async function chip(page: Page, key: string) {
  await page.locator(`[data-qm1="chip"][data-key="${key}"]`).click();
  await page.waitForTimeout(300);
  /* every "Show N more" opened, so the list is the whole set */
  for (let i = 0; i < 6; i++) {
    const more = page.locator('[data-qm1="show-more"]');
    if (!(await more.count())) break;
    await more.first().click();
    await page.waitForTimeout(150);
  }
  /* the clicks scroll the list; every reading starts from the top of the screen */
  await page.locator('[data-qm1="body"]').evaluate((e) => { e.scrollTop = 0; });
  await page.waitForTimeout(100);
}

export const sleep = (page: Page, ms: number) => page.waitForTimeout(ms);
