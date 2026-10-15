/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 measurement helpers (design-refs/todo-list-v5/todo-list-v5.html). A plain module: importing a
 * `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ ONE WAY IN: `openTodo` opens /todo at a size, optionally in a review state (lib/todoReviewAid), and waits for
 *    the page's own `data-state`. Every probe starts from `window.__td5()`, which finds the ONE visible v5 root by
 *    measuring it and throws on none or two.
 * ⚠️ EVERY LOCK HAS ITS NAMED BREAK. In-page breaks are `MUTATIONS[lock]`, applied when `TD5_MUTATE=<lock>`; the
 *    source breaks (A1, D2, E1, F1) are edits made and undone in the measurement worktree. `TD5_BASE=1` names the
 *    ledger of a run against the build before this pack (the red-first reading).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";

export const DIR = "reports/todo-list-v5";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export type VP = { width: number; height: number };
export const MUT = process.env.TD5_MUTATE ?? "";
export const BASE = process.env.TD5_BASE === "1";
export const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, applied in the page */
export const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* a press on a count row also scrolls the page */
  A2: { js: `document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest('[data-td5="card-row"]')) { const s = [...document.querySelectorAll("[data-todo-v5] .wpg-scroll")].find((x) => x.getBoundingClientRect().height > 0); if (s) s.scrollTop += 240; } }, true);` },
  /* the Clear-all link made a block again (the class collision it once had) — A2's one-line reading */
  A2w: { css: `[data-todo-v5] [data-td5="clear-all"] { display: grid !important; }` },
  /* the ring's ink drawn at a fixed half */
  B1: { js: `(() => { const C = 2 * Math.PI * 42; const half = (C / 2).toFixed(2) + " " + C.toFixed(2); const fix = () => { for (const svg of document.querySelectorAll('[data-td5="ring"] svg')) { let c = svg.querySelector('[data-td5="ring-ink"]'); if (!c) { c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("data-td5", "ring-ink"); for (const [k, v] of [["cx", "47.5"], ["cy", "47.5"], ["r", "42"], ["fill", "none"], ["stroke", "#2a3a52"], ["stroke-width", "9"]]) c.setAttribute(k, v); svg.appendChild(c); } if (c.getAttribute("stroke-dasharray") !== half) c.setAttribute("stroke-dasharray", half); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, attributes: true }); fix(); })()` },
  /* the band loses its sticky offset */
  C1: { css: `[data-todo-v5] .td5-band { top: 0 !important; }` },
  /* a row click also opens the drawer */
  C2: { js: `document.addEventListener("click", (e) => { const r = e.target.closest && e.target.closest('[data-td5="row"]'); if (r) setTimeout(() => document.querySelector('[data-td5="act"]')?.click(), 50); }, true);` },
  /* "overdue" put into a lede */
  C3: { js: `(() => { const fix = () => { for (const l of document.querySelectorAll('[data-td5="lede"]')) if (!/overdue/.test(l.textContent)) l.textContent = l.textContent + " It is overdue."; }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, characterData: true }); fix(); })()` },
  /* the keys bound on the document with no stand-down: a "j" typed in Find moves the selection */
  D1: { js: `document.addEventListener("keydown", (e) => { if (e.key === "j" && e.target && e.target.tagName === "INPUT") document.querySelector('[aria-label="Next task"]')?.click(); }, true);` },
  /* the example counted as a task: its lines carry the row's mark */
  G1: { js: `(() => { const fix = () => { for (const l of document.querySelectorAll(".td5-ml")) if (l.getAttribute("data-td5") !== "row") l.setAttribute("data-td5", "row"); }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  /* the shadow's clip removed */
  L1: { css: `[data-todo-v5] .td5-wpg, [data-todo-v5] .wpg-scroll { overflow: visible !important; } [data-todo-v5] .td5-hd .td5-shadow { left: -400px !important; width: 2600px !important; }` },
};
export async function mutate(page: Page, lock: string) {
  const m = MUT === lock || MUT === `${lock}w` ? MUTATIONS[MUT] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(250);
}

/** installed in the page: the visible v5 root, its scroller, and a box reader */
export const LIB = `
window.__td5 = () => {
  const roots = [...document.querySelectorAll("[data-todo-v5]")].filter((e) => e.getBoundingClientRect().height > 0);
  if (roots.length !== 1) throw new Error("expected one visible To-do v5 root, found " + roots.length);
  const r = roots[0];
  const sc = [...r.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0) || null;
  return { r, sc, q: (s) => r.querySelector(s), qa: (s) => [...r.querySelectorAll(s)] };
};
window.__box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, b: b.bottom, r: b.right }; };
`;

export async function openTodo(page: Page, vp: VP, opts: { state?: "caught" | "nothing"; motion?: boolean; want?: "list" | "caught" | "nothing" } = {}) {
  await page.addInitScript((st) => {
    try { for (const k of ["todo", "contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ }
    try { sessionStorage.removeItem("sa.todoTray.sort"); sessionStorage.removeItem("sa.todoTray.shut"); } catch { /* */ }
    if (st) (window as unknown as { __SA_TD5_STATE?: string }).__SA_TD5_STATE = st;
  }, opts.state ?? null);
  await openRoute(page, "/todo", vp);
  if (opts.motion) await liftMotionSuppression(page);
  const want = opts.want ?? opts.state ?? "list";
  await page.waitForSelector(`[data-todo-v5][data-state="${want}"]`, { timeout: 45_000 });
  await page.evaluate(LIB);
  await page.waitForTimeout(500);
}

/** the sidebar's To-do badge, read off the rendered nav row */
export const readBadge = (page: Page) => page.evaluate(() => {
  const row = [...document.querySelectorAll("a, button")].find((e) => /^\s*To-do list/.test(e.textContent || "") && e.closest("nav, aside") && e.getBoundingClientRect().height > 0);
  const m = row?.textContent?.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
});

/** scroll the page's scroller so the sheet's top sits at the scroller's top (+ d) */
export const scrollSheet = (page: Page, d = 2) => page.evaluate((d) => {
  const { sc, q } = (window as unknown as { __td5: () => { sc: HTMLElement; q: (s: string) => HTMLElement | null } }).__td5();
  const sheet = q(".td5-sheet")!;
  sc.scrollTop += sheet.getBoundingClientRect().top - sc.getBoundingClientRect().top + d;
}, d);
