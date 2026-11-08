/**
 * Comparable titles v30 — the harness's shared pieces (design-refs/comps-v30/). The fixture is `seedComps30.mjs`.
 * `__cp()` is the comps page on screen (every workspace page stays mounted, so a bare query can answer about a
 * hidden copy); `__q` / `__qa` are scoped to it.
 */
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { openRoute } from "./measure";
import { COLLAPSE_KEY } from "./shellV3Lib";

export const ROUTE = "/manuscripts/comps";
export const MS = "cp30-ms";
export const MS_EMPTY = "cp30-ms-empty";
export const KEY = "scriptally_active_manuscript_id";
export const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
export type Vp = { width: number; height: number };

export const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedComps30.mjs", ...args], { stdio: "pipe" }).toString().trim();
export const dump = (): { comps: Record<string, unknown>[]; letters: Record<string, { name: string; compIds: string[] | null }>; notify: Record<string, unknown> } =>
  JSON.parse(seed("--dump").split("\n").pop()!);

export const LIB = `(() => {
  window.__cp = () => {
    const all = [...document.querySelectorAll('[data-cp="page"]')].filter((e) => e.getBoundingClientRect().height > 0);
    if (all.length !== 1) throw new Error("expected one comps page on screen, found " + all.length);
    return all[0];
  };
  window.__box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  window.__q = (s) => window.__cp().querySelector(s);
  window.__qa = (s) => [...window.__cp().querySelectorAll(s)];
})()`;

/** Open the comps page on `ms` with the sidebar open; waits for the panel to leave its loading state. */
export async function openCp(page: Page, vp: Vp, o: { ms?: string } = {}) {
  await page.addInitScript(([k, v, ck]) => {
    try {
      localStorage.setItem(k, v); localStorage.setItem(ck, "0");
      for (const g of ["contacts", "queries", "manuscripts", "comps"]) localStorage.setItem(`sa.guide.${g}`, "1");
    } catch { /* */ }
  }, [KEY, o.ms ?? MS, COLLAPSE_KEY]);
  await openRoute(page, ROUTE, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.evaluate(LIB);
  await page.waitForFunction(() => {
    try { const t = (window as any).__q('[data-cp="top"]'); return !!t && t.getAttribute("data-top") !== "loading"; } catch { return false; }
  }, null, { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(400);
}

/** Scroll the page's own scroller so `sel` is `top` px under its top edge (instant). */
export async function scrollTo(page: Page, sel: string, top = 12) {
  await page.evaluate(([s, t]) => {
    const w = window as any;
    const el = w.__q(s) as HTMLElement; const sc = w.__cp().closest(".wpg-scroll") as HTMLElement;
    sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - Number(t);
  }, [sel, String(top)]);
  await page.waitForTimeout(250);
}
