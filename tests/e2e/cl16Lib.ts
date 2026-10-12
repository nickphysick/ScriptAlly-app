/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 measurement helpers (design-refs/contact-list-v16/contact-list-v16.html). A plain module:
 * importing a `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE GROUP (`window.__cl()`): every workspace page stays mounted.
 * ⚠️ EVERY OPEN STARTS FROM THE DEFAULTS: the list's memory and full screen are cleared before the page loads,
 *    unless the case is the one measuring them (`keep`).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";
import { liftMotionSuppression } from "./measure";

export const DIR16 = "reports/contact-list-v16";
export const SIZES16 = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export type VP = { width: number; height: number };
export const MUT16 = process.env.CL16_MUTATE ?? "";
/** names the ledger of a run against the build before the pack (the red-first reading) */
export const BASE16 = process.env.CL16_BASE === "1";
export const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
export const LOADED_ROW16 = ".clv-group:not([data-loading]) .clv-row";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR16}/ledger`, { recursive: true });
    writeFileSync(`${DIR16}/ledger/${BASE16 ? "base-" : ""}${MUT16 ? `mut-${MUT16}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** installed in the page: the visible Contact list group, its scroller and the page sheet */
export const LIB16 = `
window.__cl = () => {
  const g = [...document.querySelectorAll(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0);
  if (!g) throw new Error("no visible Contact list group");
  const sc = g.closest(".wpg-scroll");
  const sheet = [...document.querySelectorAll(".ws-window")].find((e) => e.getBoundingClientRect().height > 0);
  return { g, sc, sheet, q: (s) => g.querySelector(s), qa: (s) => [...g.querySelectorAll(s)] };
};
window.__box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
`;

export const MEMORY_KEYS = ["sa.contactList.v3", "sa.contactList.v4"];
export const FULL_KEY = "sa.contactFull";

export async function openContacts16(page: Page, vp: VP, opts: { keep?: boolean; query?: string; motion?: boolean } = {}) {
  await page.addInitScript(({ keep, keys, full }) => {
    try {
      for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1");
      if (!keep && !sessionStorage.getItem("__cl16_cleared")) {
        for (const k of keys) sessionStorage.removeItem(k);
        localStorage.removeItem(full);
        sessionStorage.setItem("__cl16_cleared", "1");
      }
    } catch { /* private mode */ }
  }, { keep: !!opts.keep, keys: MEMORY_KEYS, full: FULL_KEY });
  await openApp(page, `/agents${opts.query ?? ""}`, vp);
  await expect(page.locator(LOADED_ROW16).first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  if (opts.motion) await liftMotionSuppression(page);
  else await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  await page.waitForTimeout(400);
  await page.evaluate(LIB16);
}

export async function mutate16(page: Page, lock: string, table: Record<string, { css?: string; js?: string }>) {
  const m = MUT16 === lock ? table[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(150);
}

export const setScroll16 = (page: Page, y: number) => page.evaluate(async (top) => {
  const { sc } = (window as unknown as { __cl: () => { sc: HTMLElement } }).__cl();
  sc.style.scrollBehavior = "auto";
  sc.scrollTop = top;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return sc.scrollTop;
}, y);
