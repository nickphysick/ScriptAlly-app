/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.2 measurement helpers (design-refs/todo-list-v5-2/todo-list-v5-2.html), on top of v5.1's (`td5Lib`):
 * the same one way in (`openTodo`), the same visible-root finder (`window.__td5()`), and v5.2's own ledger, breaks and
 * font check.
 *
 * ⚠️ REAL FONTS OR NO READING: `fontsReady` waits for `document.fonts.ready` and asserts Special Elite, Source Serif
 *    and JetBrains Mono are loaded. A clipping lock run on fallback faces has failed (the pack's own rule).
 * ⚠️ `TD52_BASE=1` names the ledger of a run against the build before this pack; `TD52_MUTATE=<lock>` applies the lock's
 *    in-page break. Source breaks are made and undone in the measurement worktree.
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

export { openTodo, readBadge, scrollSheet, near, canon, readSet, diffSets, LIB, flagId, snapDocs, restoreDocs, type Snap } from "./td5Lib";
export const DIR = "reports/todo-list-v5-2";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export const MUT = process.env.TD52_MUTATE ?? "";
export const BASE = process.env.TD52_BASE === "1";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, applied in the page */
export const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* D1b — the bands back under the tray's sticky strip (proves the overpaint read, not only the copies) */
  D1b: { css: `[data-todo-v5] .td5-band { z-index: 10 !important; }` },
  /* A1 — the card sets the header's height again */
  A1: { css: `[data-todo-v5] .td52-cal { contain: none !important; container-type: normal !important; }` },
  /* A2 — the day column at 140px */
  A2: { css: `[data-todo-v5] .td52-cal { --cal-dayw: 140px !important; }` },
  /* E2 — the old "Just the desk" button left mounted */
  E2: { js: `(() => { const n = [...document.querySelectorAll('[data-todo-v5] [data-td5="nav"]')].find((e) => e.getBoundingClientRect().height > 0); if (n) { const b = document.createElement("button"); b.className = "td5-focusbtn"; b.dataset.td5 = "focus"; b.textContent = "Just the desk"; n.append(b); } })()` },
  /* D1 — the desk head's art restored */
  D1: { js: `(() => { const h = [...document.querySelectorAll('[data-todo-v5] [data-td5="desk-head"]')].find((e) => e.getBoundingClientRect().height > 0);
    const b = document.querySelector('[data-todo-v5] [data-td5="band-art"]'); if (h && b) { const i = document.createElement("img"); i.src = b.getAttribute("src"); i.style.cssText = "position:absolute;left:8px;top:-10px;width:46px"; h.prepend(i); } })()` },
};
export async function mutate(page: Page, lock: string) {
  const m = MUT === lock ? MUTATIONS[MUT] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(250);
}

/** waits for the faces and asserts the three are loaded — a reading on fallback faces is not a reading */
export async function fontsReady(page: Page): Promise<{ ok: boolean; missing: string[] }> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const want = ["Special Elite", "Source Serif", "JetBrains Mono"];
    const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));
    const missing = want.filter((w) => !loaded.some((l) => l.startsWith(w)));
    return { ok: missing.length === 0, missing };
  });
}
