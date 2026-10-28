/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v116 — the helpers shared by the DB116 locks and the report's shots (a spec may not import a spec).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openDash as openDash105 } from "./db105Lib";

export const DIR = "reports/dashboard-v116";
export type VP = { width: number; height: number };
export const tag = (v: VP) => `${v.width}x${v.height}`;
export const MUT = process.env.DB116_MUTATE ?? "";

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
export const CSS_MUTATIONS: Record<string, string> = {
  "A1-bars-equal": `.d116-wks i { flex-grow: 1 !important; }`,
  "A1-no-flip": `.d116-wk[data-flip="1"] { margin-left: 228px !important; }`,
  "B1-flat": `.d116-stack.is-on .d116-rc { transform: none !important; }`,
  "B2-no-fit": `.d116-stack { translate: 0 0 !important; }`,
  "C1-no-swell": `.d116-ring [data-d60="arc"].is-swell { stroke-width: 9 !important; }`,
  "D1-short-header": `.d116-am .d116-amt { width: 60% !important; }`,
  "D1-one-colour": `.d116-am .d116-amt { background: #2a3a52 !important; color: #fff !important; }`,
  "E1-no-frame": `.d58 .d71-task::after { display: none !important; }`,
  "F1-no-tilt": `.d105-fw.d116-tilt { rotate: none !important; }`,
  "F1-no-swap": `.d105-swap .d105-swb { opacity: 0 !important; } .d105-swap .d105-swa { opacity: 1 !important; transform: none !important; }`,
};

/** Opens the dashboard as v105's locks do (everything seen, the account's own data) and applies a mutation. */
export async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}) {
  await openDash105(page, vp, flags, CSS_MUTATIONS[MUT] ?? "");
}

export const sleep = (page: Page, ms: number) => page.waitForTimeout(ms);
