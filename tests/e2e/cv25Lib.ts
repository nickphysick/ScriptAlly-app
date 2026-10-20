/**
 * Comparable titles v25 — the harness's shared pieces: how the page is opened on its fixture, the
 * sizes, and a page-scoped probe that only ever reads the page ON SCREEN (every workspace page stays
 * mounted, so a bare `document.querySelector` can answer about one the reader cannot see).
 */
import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { openRoute } from "./measure";
import { COLLAPSE_KEY } from "./shellV3Lib";

export const ROUTE = "/manuscripts/comps";
export const MS = "cv25-ms";
export const MS_EMPTY = "cv25-ms-empty";
export const KEY = "scriptally_active_manuscript_id";
export const FULL_KEY = "sa.compsFull";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export type Vp = { width: number; height: number };

export const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedCompsV25.mjs", ...args], { stdio: "pipe" }).toString().trim();
export const dump = (): { comps: Record<string, unknown>[]; letters: Record<string, { name: string; compIds: string[] | null }> } => JSON.parse(seed("--dump").split("\n").pop()!);

export async function openComps(page: Page, vp: Vp, o: { ms?: string; collapsed?: boolean; search?: string; full?: boolean; hold?: number } = {}) {
  await page.addInitScript(([k, v, ck, cv, fk, fv, hold]) => {
    try {
      localStorage.setItem(k, v); localStorage.setItem(ck, cv);
      if (fv === "1") localStorage.setItem(fk, "1"); else localStorage.removeItem(fk);
      for (const g of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${g}`, "1");
      if (hold) (window as unknown as Record<string, number>).__SA_COMPS_HOLD_MS = Number(hold);
    } catch { /* */ }
  }, [KEY, o.ms ?? MS, COLLAPSE_KEY, o.collapsed ? "1" : "0", FULL_KEY, o.full ? "1" : "0", String(o.hold ?? "")]);
  await openRoute(page, ROUTE + (o.search ?? ""), vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.evaluate(LIB);
  /* comps v28: the shelf's cards (v25's list rows are retired) */
  if ((o.ms ?? MS) === MS && !o.hold) await page.waitForFunction(() => !!(window as any).__cv().querySelector('[data-cx="card"]'), null, { timeout: 30_000 });
  await page.waitForTimeout(400);
}

/** `__cv()` is the page on screen (it throws if there is none or two); `__box(e)` is a rounded rect. */
export const LIB = `(() => {
  window.__cv = () => {
    const all = [...document.querySelectorAll('[data-cv="page"]')].filter((e) => e.getBoundingClientRect().height > 0);
    if (all.length !== 1) throw new Error("expected one comps page on screen, found " + all.length);
    return all[0];
  };
  window.__box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  window.__q = (s) => window.__cv().querySelector(s);
  window.__qa = (s) => [...window.__cv().querySelectorAll(s)];
})()`;

/** Scroll the page's own scroller so `sel` is `top` px under its top edge (instant, never smooth). */
export async function scrollTo(page: Page, sel: string, top = 12) {
  await page.evaluate(([s, t]) => {
    const w = window as any;
    const el = w.__q(s) as HTMLElement; const sc = w.__cv().closest(".wpg-scroll") as HTMLElement;
    sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - Number(t);
  }, [sel, String(top)]);
  await page.waitForTimeout(250);
}

/* ── a pixel, from a screenshot (no PNG library in this repo: 8-bit, non-interlaced, as Chromium writes) ── */
import { inflateSync } from "node:zlib";
export function pngPixel(png: Buffer, x: number, y: number): [number, number, number] {
  let o = 8, w = 0, h = 0, type = 6; const idat: Buffer[] = [];
  while (o < png.length) {
    const len = png.readUInt32BE(o), tag = png.toString("ascii", o + 4, o + 8), data = png.subarray(o + 8, o + 8 + len);
    if (tag === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; }
    if (tag === "IDAT") idat.push(data);
    o += 12 + len;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!bpp || x >= w || y >= h) throw new Error(`pngPixel: unsupported png (type ${type}) or point outside ${w}x${h}`);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp + 1;
  const out = Buffer.alloc(w * h * bpp);
  for (let r = 0; r < h; r++) {
    const f = raw[r * stride];
    for (let i = 0; i < w * bpp; i++) {
      const v = raw[r * stride + 1 + i];
      const a = i >= bpp ? out[r * w * bpp + i - bpp] : 0;
      const b = r > 0 ? out[(r - 1) * w * bpp + i] : 0;
      const c = r > 0 && i >= bpp ? out[(r - 1) * w * bpp + i - bpp] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[r * w * bpp + i] = (v + p) & 255;
    }
  }
  const at = (y * w + x) * bpp;
  return [out[at], out[at + 1], out[at + 2]];
}
export async function pixelAt(page: Page, x: number, y: number): Promise<string> {
  const buf = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 2, height: 2 } });
  return pngPixel(buf, 0, 0).join(",");
}
