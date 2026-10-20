/**
 * Comparable titles v28 — the harness's shared pieces. The fixture is v25's (`seedCompsV25.mjs`: 7 comps — sent,
 * draft, shelf-ready and not-ready; book, TV and film; ages 1 to 7 — 3 letters, one sent with nothing recorded;
 * 14 queries); the page-scoped probes are v25's `LIB` (`__cv()` is the comps page on screen).
 */
import type { Page } from "@playwright/test";
import { openRoute } from "./measure";
import { COLLAPSE_KEY } from "./shellV3Lib";
import { KEY, LIB, MS, MS_EMPTY, ROUTE } from "./cv25Lib";

export { KEY, LIB, MS, MS_EMPTY, ROUTE, seed, dump, scrollTo, pngPixel } from "./cv25Lib";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export type Vp = { width: number; height: number };

/** Open the comps page on `ms`; waits for the populated page's cards (or, for the empty manuscript, its panel). */
export async function openCx(page: Page, vp: Vp, o: { ms?: string; collapsed?: boolean; hold?: number; noWait?: boolean } = {}) {
  await page.addInitScript(([k, v, ck, cv, hold]) => {
    try {
      localStorage.setItem(k, v); localStorage.setItem(ck, cv);
      for (const g of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${g}`, "1");
      if (hold) (window as unknown as Record<string, number>).__SA_COMPS_HOLD_MS = Number(hold);
    } catch { /* */ }
  }, [KEY, o.ms ?? MS, COLLAPSE_KEY, o.collapsed ? "1" : "0", String(o.hold ?? "")]);
  await openRoute(page, ROUTE, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.evaluate(LIB);
  if (!o.noWait) {
    const want = (o.ms ?? MS) === MS ? '[data-cx="card"]' : '[data-cx="empty-panel"]';
    /* never throws: on a build without v28 the locks must read red at a named reading, not crash here */
    await page.waitForFunction((w) => { try { return !!(window as any).__cv().querySelector(w); } catch { return false; } }, want, { timeout: 30_000 }).catch(() => undefined);
  }
  await page.waitForTimeout(400);
}
