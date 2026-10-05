/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cl13Lib — the probes for Contact list v13 (ref design-refs/contact-list-v13.html). A plain module:
 * importing a `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ EVERY READ IS SCOPED TO THE VISIBLE PAGE. The workspace keeps every page mounted; a bare
 * `document.querySelector` answers about whichever copy comes first.
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

export { box, near, pixel, sameRgb } from "./qc126Lib";

/** §11: the three widths the pack measures at. */
export const WIDTHS = [
  { width: 1512, height: 900 }, { width: 1440, height: 900 }, { width: 1280, height: 800 },
] as const;
export const AT_1512 = { width: 1512, height: 900 } as const;
export const DIR = "reports/contact-list-v13";
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
  /** A run that writes fewer readings than it claims is red, whatever its cases say. */
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** Open the populated Contact list with motion stopped and fonts settled. */
export async function openContacts(page: Page, vp: { width: number; height: number }, opts: { motion?: boolean } = {}) {
  await openApp(page, "/agents", vp);
  await page.locator(".clv-row").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  if (!opts.motion) await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  await page.waitForTimeout(400);
}

/** The visible page's scroller and its horizontal overflow. */
export async function checkOverflow(page: Page, L: Ledger, where: string) {
  const o = await page.evaluate(() => {
    const wrap = document.querySelector(".ws-winwrap");
    const sc = wrap ? [...wrap.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0) ?? null : null;
    return sc ? { found: true, over: sc.scrollWidth - sc.clientWidth } : { found: false, over: NaN };
  });
  L.check("no horizontal overflow of the scroller", where, o.found && o.over <= 0, `found ${o.found} over ${o.over}`);
}
