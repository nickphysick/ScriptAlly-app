/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cb2Lib — the Corkboard v2 locks' helpers (ref design-refs/corkboard-v13/). The fixture is `seedCorkboardV2.mjs`
 * (`cb2seed-` documents); the page is narrowed to it by the dev review aid, so the harness account's other notes are
 * never read or written.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/corkboard-v2";
export const ROUTE = "/todo/corkboard";
export const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }] as const;
export const sz = (v: { width: number; height: number }) => `${v.width}x${v.height}`;
export const PREFIX = "cb2seed-";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    const tag = process.env.CB2_MUTATE ? `.${process.env.CB2_MUTATE}` : "";
    writeFileSync(`${DIR}/ledger/${this.name}${tag}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
export const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

/** The seeder, run from node. */
export function seeder(...args: string[]): string {
  return execFileSync("node", ["tests/e2e/seedCorkboardV2.mjs", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Narrow the page to the fixture (the review aid), before any script runs. */
export async function only(page: Page, prefix: string | null = PREFIX) {
  await page.addInitScript((p) => { if (p !== null) (window as unknown as Record<string, unknown>).__SA_CB_ONLY = p; }, prefix);
}

export async function open(page: Page, route: string, vp: { width: number; height: number }) {
  page.setDefaultTimeout(12_000);
  await openRoute(page, route, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(600);
}

/** The visible Corkboard page root, a selector prefix for every Playwright locator (`:visible` is Playwright's own,
    so it is never used inside page.evaluate — there ROOT_FN finds the visible root). */
export const PAGE = '.cb2:visible [data-cb2="page"]';
export const ROOT_FN = `(() => {
  const all = [...document.querySelectorAll('.cb2 [data-cb2="page"]')].filter((e) => e.getBoundingClientRect().height > 0);
  if (all.length !== 1) throw new Error("visible corkboard pages: " + all.length);
  return all[0];
})()`;

/** Every post-it on the wall (or the open pile), in DOM order: id, box, opacity, paper and words. */
export async function readWall(page: Page) {
  return page.evaluate((ROOT) => {
    const root = (0, eval)(ROOT) as HTMLElement;
    return [...root.querySelectorAll<HTMLElement>("[data-cb2-note]")].map((el) => {
      const r = el.getBoundingClientRect();
      const paper = el.querySelector<HTMLElement>(".cb2-paper");
      const body = el.querySelector<HTMLElement>(".cb2-body");
      return {
        id: el.getAttribute("data-cb2-note")!, x: r.x, y: r.y, w: r.width, h: r.height,
        opacity: Number(getComputedStyle(el).opacity),
        bg: paper ? getComputedStyle(paper).backgroundColor : "",
        font: body ? getComputedStyle(body).fontFamily : "",
        readAll: !!el.querySelector<HTMLElement>(".cb2-readall:not([hidden])"),
        pinnedTag: !!el.querySelector(".cb2-pintag"),
        draggable: el.getAttribute("draggable"),
        text: (body?.textContent ?? "").trim(),
      };
    });
  }, ROOT_FN);
}

/** The phone: sign in at a desktop size (the desktop shell is what openRoute waits for), then narrow and reload. */
export async function openPhone(page: Page, route: string, vp: { width: number; height: number } = { width: 390, height: 844 }) {
  page.setDefaultTimeout(12_000);
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await page.setViewportSize(vp);
  await page.goto(route);
  await page.locator('.cb2 [data-cb2="header"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(1200);
}

/**
 * Every Firestore write the page sends while `fn` runs, as { doc, paths } — the document path and the update mask
 * (or "SET" for a whole-document write). Read off the Write channel's request bodies, so it counts what the client
 * sent, not what a helper meant to send.
 */
export async function writesDuring(page: Page, fn: () => Promise<void>, settleMs = 1500): Promise<{ doc: string; paths: string[] }[]> {
  const seen: { doc: string; paths: string[] }[] = [];
  const on = (req: import("@playwright/test").Request) => {
    if (req.method() !== "POST" || !/\/Write\/channel/.test(req.url())) return;
    const body = decodeURIComponent((req.postData() ?? "").replace(/\+/g, " "));
    for (const m of body.matchAll(/"(update|delete)":\s*(\{[^]*?"name":\s*"([^"]+)"|"([^"]+)")/g)) {
      const doc = (m[3] ?? m[4] ?? "").split("/documents/")[1] ?? "";
      const after = body.slice(m.index ?? 0, (m.index ?? 0) + 4000);
      const mask = after.match(/"updateMask":\s*\{\s*"fieldPaths":\s*\[([^\]]*)\]/);
      const paths = m[1] === "delete" ? ["DELETE"] : mask ? [...mask[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : ["SET"];
      if (doc) seen.push({ doc, paths });
    }
  };
  page.on("request", on);
  try { await fn(); await page.waitForTimeout(settleMs); } finally { page.off("request", on); }
  return seen;
}

/** A hex colour as the browser reports it. */
export const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
