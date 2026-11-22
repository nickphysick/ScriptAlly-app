/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cb15Lib — the Corkboard v15 locks' helpers (ref design-refs/corkboard-v15/). The fixtures are
 * `seedCorkboardV15.mjs` (`cb15seed-` documents); the page is narrowed to them by the dev review aid, and the
 * active book is "Murphy's Day Out" (cv25-ms), whose agents the everyday fixture links to.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/corkboard-v15";
export const ROUTE = "/todo/corkboard";
export const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }] as const;
export const sz = (v: { width: number; height: number }) => `${v.width}x${v.height}`;
export const PREFIX = "cb15seed-";
export const N = (n: number, set = "e") => `${PREFIX}${set}${n}`;

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The seeder, run from node; the last line of its output. */
export function seeder(...args: string[]): string {
  const out = execFileSync("node", ["tests/e2e/seedCorkboardV15.mjs", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return out.trim().split("\n").pop() ?? "";
}
export const task = (id: string) => { const s = seeder("task", id); return s === "absent" ? null : JSON.parse(s); };
export const prefs = () => JSON.parse(seeder("prefs")) as { view?: string; sort?: string; order?: string[]; started?: string[] } | null;

/** Narrow the page to the fixture and put the book in scope, before any script runs. */
export async function only(page: Page) {
  await page.addInitScript((p) => {
    (window as unknown as Record<string, unknown>).__SA_CB_ONLY = p;
    try { localStorage.setItem("scriptally_active_manuscript_id", "cv25-ms"); } catch { /* private mode */ }
  }, PREFIX);
}

export async function open(page: Page, vp: { width: number; height: number }) {
  page.setDefaultTimeout(12_000);
  await openRoute(page, ROUTE, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await desk(page).waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => {
    const d = [...document.querySelectorAll<HTMLElement>('.cb15 [data-cb15="desk"]')].find((e) => e.getBoundingClientRect().height > 0);
    return !!d && !d.hasAttribute("data-loading");
  }, undefined, { timeout: 20_000 });
  await page.waitForTimeout(900);
}

/** Wait (up to 8s) for the wall to hold exactly `n` notes: the app's persistent Firestore cache can paint the
 *  previous fixture for a moment after a re-seed. Returns what it last counted. */
export async function waitNotes(page: Page, n: number): Promise<number> {
  let c = -1;
  for (let i = 0; i < 16; i++) {
    c = await page.evaluate(() => document.querySelectorAll(".cb15 [data-cb15-note]").length);
    if (c === n) return c;
    await page.waitForTimeout(500);
  }
  return c;
}

/** The visible desk (every workspace page stays mounted: never `document`). */
export const desk = (page: Page) => page.locator('.cb15 [data-cb15="desk"]:visible').first();
export const DESK_FN = `(() => {
  const all = [...document.querySelectorAll('.cb15 [data-cb15="desk"]')].filter((e) => e.getBoundingClientRect().height > 0);
  if (all.length !== 1) throw new Error("visible corkboard desks: " + all.length);
  return all[0];
})()`;
export const HEADER_FN = `(() => {
  const all = [...document.querySelectorAll('.cb15 [data-wsnh-page="corkboard"]')].filter((e) => e.getBoundingClientRect().height > 0);
  if (all.length !== 1) throw new Error("visible corkboard headers: " + all.length);
  return all[0];
})()`;

/** The wall's notes as drawn: id, section, column, its box, and what it shows. */
export async function readWall(page: Page) {
  return page.evaluate((D) => {
    const root = (0, eval)(D) as HTMLElement;
    return [...root.querySelectorAll<HTMLElement>("[data-cb15-note]")].map((el) => {
      const wall = el.closest<HTMLElement>(".cb15-wall");
      const col = el.parentElement ? [...(wall?.children ?? [])].indexOf(el.parentElement) : -1;
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-cb15-note")!, section: wall?.getAttribute("data-cb15") ?? "", col, row: el.parentElement ? [...el.parentElement.children].indexOf(el) : -1,
        cols: Number(wall?.getAttribute("data-cols") ?? 0), wallW: wall?.clientWidth ?? 0,
        x: r.x, y: r.y, w: r.width, h: r.height, pinned: el.hasAttribute("data-pinned"),
        readAll: !!el.querySelector<HTMLElement>('[data-cb15="read-all"]:not([hidden])'),
        font: getComputedStyle(el.querySelector(".cb15-nbody")!).fontFamily,
        text: (el.querySelector(".cb15-nbody")?.textContent ?? "").trim(),
      };
    });
  }, DESK_FN);
}

export async function toast(page: Page, want?: RegExp) {
  const t = page.locator(".tdb-toast").first();
  await t.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  if (want) await expect(t).toHaveText(want, { timeout: 8000 }).catch(() => {});
  const said = ((await t.textContent().catch(() => "")) ?? "").replace(/Undo$/, "").trim();
  /* the toast follows the client's write; the store a lock then reads (through the seeder) can lag it by a beat */
  await page.waitForTimeout(1200);
  return said;
}
export async function undo(page: Page) {
  await page.locator(".tdb-toast .tdb-toast-act", { hasText: "Undo" }).click();
  await page.waitForTimeout(1800);
}
export const note = (page: Page, id: string) => page.locator(`.cb15 [data-cb15-note="${id}"]:visible`).first();
/** a note's action button, revealed by hovering the note */
export async function act(page: Page, id: string, a: "pin" | "colour" | "task" | "more") {
  await note(page, id).hover();
  await note(page, id).locator(`[data-act="${a}"]`).click();
}
/** settle for the snapshot to come back after a write */
export const settle = (page: Page, ms = 1500) => page.waitForTimeout(ms);

/** The phone: sign in at a desktop size (the desktop shell is what openRoute waits for), then narrow and reload. */
export async function openPhone(page: Page, vp: { width: number; height: number } = { width: 390, height: 844 }) {
  page.setDefaultTimeout(12_000);
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await page.setViewportSize(vp);
  await page.goto(ROUTE);
  await page.locator('.cb2 [data-cb2="header"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(1200);
}
