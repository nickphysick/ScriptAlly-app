/**
 * Comparable titles v32 — the harness's shared pieces (design-refs/comps-v32/). The fixture is `seedComps32.mjs`.
 * `__cp()` is the comps page on screen (every workspace page stays mounted, so a bare query can answer about a
 * hidden copy); `__q` / `__qa` are scoped to it.
 */
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { openRoute } from "./measure";
import { COLLAPSE_KEY } from "./shellV3Lib";

export const ROUTE = "/manuscripts/comps";
export const MS = "cp32-ms";
export const MS_EMPTY = "cp32-ms-empty";
export const KEY = "scriptally_active_manuscript_id";
export const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
export type Vp = { width: number; height: number };

export const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedComps32.mjs", ...args], { stdio: "pipe" }).toString().trim();
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
  /* the number of rendered lines of an element's text: its client rects, merged by top */
  window.__lines = (e) => { const rg = document.createRange(); rg.selectNodeContents(e); const tops = new Set([...rg.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))); return tops.size; };
})()`;

/** Open the comps page on `ms` with the sidebar as dev defaults; waits for the page to leave its loading state. */
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
    try { const t = (window as any).__cp(); return !!t && t.getAttribute("data-state") !== "loading"; } catch { return false; }
  }, null, { timeout: 30_000 }).catch(() => undefined);
  /* ⚠️ THE APP'S PERSISTENT CACHE PAINTS THE LAST FIXTURE FIRST: after a re-seed the page shows the old documents until
     its listeners catch up. Wait until the page's text has not changed for 2 seconds (at most 30). */
  await page.waitForFunction(() => {
    const w = window as any;
    let t = ""; try { t = w.__cp().innerText; } catch { return false; }
    const now = Date.now();
    if (t !== w.__cpSig) { w.__cpSig = t; w.__cpAt = now; return false; }
    return now - w.__cpAt > 2000;
  }, null, { timeout: 30_000, polling: 250 }).catch(() => undefined);
  await page.waitForTimeout(200);
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
