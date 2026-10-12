/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corkboard v1 (design-refs/corkboard-v4/corkboard-v4.html) — what the CB1 locks share. A plain module:
 * importing it runs no cases.
 *
 * ⚠️ THE FIXTURE IS A PREFIX, NOT THE ACCOUNT. The harness account is shared and other sessions seed it, so a
 *    lock about "8 notes" cannot be a claim about whatever the account holds today. `seedCorkboard.mjs` writes
 *    `cbseed-*` documents, and `window.__SA_CB_ONLY = "cbseed-"` (lib/corkboardReviewAid, dev builds only) hands
 *    the page's OWN derivations just those — input narrowed, nothing fabricated. `only("zz-none-")` is zero notes.
 *
 * ⚠️ EVERY CHECK IS A LEDGER ROW AND A CASE ASSERTS AT ITS END, with a floor: a probe that finds no subject has
 *    failed, not skipped.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/corkboard-v1";
export const ROUTE = "/todo/corkboard";
export const OLD_ROUTE = "/todo/noteboard";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export const sz = (v: { width: number; height: number }) => `${v.width}x${v.height}`;
export const PREFIX = "cbseed-";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${process.env.CB_MUTATE ? `.${process.env.CB_MUTATE}` : ""}${process.env.CB_TAG ? `.${process.env.CB_TAG}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
  }
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
export const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

/** Narrow the page to one id prefix (the review aid), set before any script runs. Also quiets the page guides. */
export async function only(page: Page, prefix: string | null, extra: Record<string, unknown> = {}) {
  await page.addInitScript(({ prefix, extra }) => {
    const w = window as unknown as Record<string, unknown>;
    if (prefix !== null) w.__SA_CB_ONLY = prefix;
    for (const [k, v] of Object.entries(extra)) w[k] = v;
  }, { prefix, extra });
}

export async function open(page: Page, route: string, vp: { width: number; height: number }) {
  await openRoute(page, route, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(700);
}

/** The visible Corkboard page root (every workspace page stays mounted). Throws on none or two. */
export const ROOT_FN = `(() => {
  const all = [...document.querySelectorAll(".nb-scope.tdb-wrap")].filter((e) => e.getBoundingClientRect().height > 0);
  if (all.length !== 1) throw new Error("visible corkboard roots: " + all.length);
  return all[0];
})()`;

/** The seeder, run from node: `seed`, `clean`, `snap` (prefs → file), `restore` (file → prefs), `prefs` (print). */
export function seeder(...args: string[]): string {
  return execFileSync("node", ["tests/e2e/seedCorkboard.mjs", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** The words a writer can read in the visible shell and page: text, placeholders, labels and titles. */
export async function readableText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const out: string[] = [];
    const seen = (el: Element) => { const r = (el as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      if (!seen(el)) continue;
      for (const n of Array.from(el.childNodes)) if (n.nodeType === 3 && n.textContent && n.textContent.trim()) out.push(n.textContent);
      for (const a of ["placeholder", "aria-label", "title", "alt"]) { const v = el.getAttribute(a); if (v) out.push(v); }
    }
    out.push(document.title);
    return out.join(" \n ");
  });
}
