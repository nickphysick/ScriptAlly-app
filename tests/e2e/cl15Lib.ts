/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15 measurement helpers. Same two widths as v14 (§6: 1512 × 900 and 1280 × 800); the page-opening,
 * overflow and box helpers are v13's, re-exported so every contact suite opens the page one way. Only the ledger's
 * directory is v15's own.
 */
import { expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

export { box, near, pixel, sameRgb, openContacts, checkOverflow, LOADED_ROW } from "./cl13Lib";
export { WIDTHS14 as WIDTHS15, AT_1512, INK14 as INK15 } from "./cl14Lib";

export const DIR15 = "reports/contact-list-v15";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR15}/ledger`, { recursive: true });
    writeFileSync(`${DIR15}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
  }
  /** A run that writes fewer readings than it claims is red, whatever its cases say. */
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
