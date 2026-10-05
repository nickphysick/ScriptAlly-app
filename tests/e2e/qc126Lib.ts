/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qc126Lib — the probes for Query Centre v126 (ref design-refs/query-centre-v126.html). A plain module:
 * importing a `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ EVERY READ IS SCOPED TO THE VISIBLE PAGE. The workspace keeps every page mounted; a bare
 * `document.querySelector` answers about whichever copy comes first.
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

export const WIDTHS = [
  { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 },
] as const;
export const AT_1512 = { width: 1512, height: 900 } as const;
export const DIR = "reports/qc-v126";
export const INK = "rgb(42, 58, 82)";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
  }
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

export const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

/** Open the Query Centre's populated page with motion stopped and fonts settled. */
export async function openQc(page: Page, vp: { width: number; height: number }) {
  await openApp(page, "/queries", vp);
  await page.locator('[data-qcv="row"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  await page.waitForTimeout(400);
}

/** The page's scroller (the outermost visible overflowing scroller under the window) and its overflow. */
export async function overflowX(page: Page) {
  return page.evaluate(() => {
    const wrap = document.querySelector(".ws-winwrap");
    if (!wrap) return { found: false, over: NaN };
    const sc = [...wrap.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    if (!sc) return { found: false, over: NaN };
    return { found: true, over: sc.scrollWidth - sc.clientWidth };
  });
}
export async function checkOverflow(page: Page, L: Ledger, where: string) {
  const o = await overflowX(page);
  L.check("no horizontal overflow of the scroller", where, o.found && o.over <= 0, `found ${o.found} over ${o.over}`);
}

/** A visible element's box, or null. */
export async function box(page: Page, sel: string) {
  return page.evaluate((s) => {
    const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  }, sel);
}

/** One pixel of the rendered page, as [r, g, b]. */
export async function pixel(page: Page, x: number, y: number) {
  const buf = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 }, animations: "disabled" });
  return page.evaluate(async (b64) => {
    const i = new Image(); i.src = `data:image/png;base64,${b64}`; await i.decode();
    const c = document.createElement("canvas"); c.width = 1; c.height = 1; const x = c.getContext("2d")!; x.drawImage(i, 0, 0);
    return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, buf.toString("base64"));
}
export const sameRgb = (p: number[], q: number[], t: number) => p.length === 3 && q.length === 3 && p.every((v, i) => Math.abs(v - q[i]) <= t);

/** Open the Birds-eye drawer from its tab. */
export async function openDrawer(page: Page) {
  const tab = page.locator('[data-qcv="bvd-tab"]').first();
  await tab.click({ timeout: 4000 });
  await page.locator('[data-qcv="bvd"]').first().waitFor({ timeout: 4000 });
  await page.waitForTimeout(400);
}
