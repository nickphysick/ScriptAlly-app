/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v14 measurement helpers. v14 measures at two widths (§10: 1512 × 900 and 1280 × 800); the
 * page-opening, overflow and box helpers are v13's, re-exported so both files open the page one way.
 */
import { expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

export { box, near, pixel, sameRgb, openContacts, checkOverflow, LOADED_ROW } from "./cl13Lib";

export const WIDTHS14 = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export const AT_1512 = { width: 1512, height: 900 } as const;
export const DIR14 = "reports/contact-list-v14";
/** the hero card's and the workspace bar's ink — v131's band colour (ruling Q2, not the prompt's #1f2b3a) */
export const INK14 = "rgb(42, 58, 82)";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR14}/ledger`, { recursive: true });
    writeFileSync(`${DIR14}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
  }
  /** A run that writes fewer readings than it claims is red, whatever its cases say. */
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
