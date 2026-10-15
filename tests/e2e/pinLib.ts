/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pinned-row fix — what the recon, the locks and the shots share: the pages with a pinned row, scrolling a page's
 * own scroller, the row's geometry, and the paint probe that finds what covers it. Its own module: importing a
 * `.measure.ts` from another runs that file's tests in the importer's scope.
 */
import type { Page } from "@playwright/test";
import { decode } from "fast-png";

/** every page with a pinned row: its row, its content row, its page group, and the headings that sit under the row */
export const PIN_PAGES = [
  { key: "queries", route: "/queries", row: '[data-qc138="pinned"][data-on]', inner: ".qc138-pin-in", group: ".qcv-group[data-v138]", heads: '[data-qc138="headings"]' },
  { key: "agents", route: "/agents", row: '.cl17-pin[data-on]', inner: ".cl17-pin-in", group: ".clv-group", heads: '.clv-group [data-lt="labels"]' },
] as const;

export async function scrollPage(page: Page, group: string, y: number) {
  await page.evaluate(([g, top]) => {
    const grp = [...document.querySelectorAll<HTMLElement>(g as string)].find((e) => e.getBoundingClientRect().height > 0);
    const sc = grp?.closest<HTMLElement>(".wpg-scroll") ?? [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
    sc.style.scrollBehavior = "auto"; sc.scrollTop = top as number;
  }, [group, y] as const);
  await page.waitForTimeout(500);
}

/** what is painted above the row within its top 24px, and the row's geometry */
export const readPin = (page: Page, rowSel: string, innerSel: string) => page.evaluate(([rs, is]) => {
  const row = document.querySelector<HTMLElement>(rs as string);
  if (!row) return null;
  const b = row.getBoundingClientRect();
  const covers = new Map<string, { sel: string; bottom: number; top: number }>();
  for (let dy = 0; dy < 24; dy += 2) for (let fx = 0.02; fx < 1; fx += 0.06) {
    const x = b.left + b.width * fx, y = b.top + dy;
    const stack = document.elementsFromPoint(x, y);
    for (const e of stack) {
      if (e === row || row.contains(e)) break; /* everything before the row in the stack is painted above it */
      const r = e.getBoundingClientRect();
      const sel = `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${e.classList.length ? `.${[...e.classList].join(".")}` : ""}`;
      covers.set(sel, { sel, bottom: Math.round(r.bottom * 10) / 10, top: Math.round(r.top * 10) / 10 });
    }
  }
  const visTop = Math.max(b.top, ...[...covers.values()].map((c) => Math.min(c.bottom, b.bottom)));
  const inner = row.querySelector<HTMLElement>(is as string)!;
  const kids = [...inner.children].filter((k) => (k as HTMLElement).getBoundingClientRect().height > 0).map((k) => {
    const r = k.getBoundingClientRect();
    return { cls: k.className.toString().split(" ")[0], c: (r.top + r.bottom) / 2 };
  });
  const boxC = (b.top + b.bottom) / 2, visC = (visTop + b.bottom) / 2;
  return {
    top: b.top, height: b.height, bottom: b.bottom, covers: [...covers.values()], visTop, cover: visTop - b.top,
    kids: kids.map((k) => ({ cls: k.cls, vsBox: Math.round((k.c - boxC) * 10) / 10, vsVisible: Math.round((k.c - visC) * 10) / 10 })),
  };
}, [rowSel, innerSel] as const);

/**
 * PAINT, NOT HIT-TESTING: `elementsFromPoint` skips anything with `pointer-events: none` (the sheet lip is), so it
 * cannot see what covers the row. Each element whose box meets the row's top 24px (and is neither the row, inside it,
 * nor one of its ancestors) is painted a probe magenta in turn; where magenta shows inside the row's box, that element
 * is painted above the row, and the lowest such pixel is how far it covers.
 */
export async function paintCovers(page: Page, rowSel: string): Promise<{ sel: string; coverPx: number }[]> {
  const cands = await page.evaluate((rs) => {
    const row = document.querySelector<HTMLElement>(rs)!;
    const b = row.getBoundingClientRect();
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>("body *").forEach((e, i) => {
      if (e === row || row.contains(e) || e.contains(row)) return;
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom <= b.top || r.top >= b.top + 24 || r.right <= b.left || r.left >= b.right) return;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
      e.dataset.pinProbe = String(i); out.push(String(i));
    });
    return out;
  }, rowSel);
  const box = (await page.locator(rowSel).boundingBox())!;
  const res: { sel: string; coverPx: number }[] = [];
  for (const id of cands) {
    const sel = await page.evaluate((i) => {
      const e = document.querySelector<HTMLElement>(`[data-pin-probe="${i}"]`)!;
      e.style.setProperty("background", "rgb(255, 0, 255)", "important"); e.style.setProperty("box-shadow", "none", "important");
      return `${e.tagName.toLowerCase()}${e.classList.length ? `.${[...e.classList].join(".")}` : ""}`;
    }, id);
    const png = decode(await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: 24 } }));
    let low = -1;
    const ch = png.channels, scale = png.height / 24;
    for (let y = 0; y < png.height; y += 1) for (let x = 0; x < png.width; x += 3) {
      const k = (y * png.width + x) * ch;
      if (png.data[k] > 235 && png.data[k + 1] < 30 && png.data[k + 2] > 235) { low = Math.max(low, y); break; }
    }
    if (low >= 0) res.push({ sel, coverPx: Math.round(((low + 1) / scale) * 10) / 10 });
    await page.evaluate((i) => { const e = document.querySelector<HTMLElement>(`[data-pin-probe="${i}"]`)!; e.style.removeProperty("background"); e.style.removeProperty("box-shadow"); }, id);
  }
  await page.evaluate(() => document.querySelectorAll<HTMLElement>("[data-pin-probe]").forEach((e) => delete e.dataset.pinProbe));
  return res;
}

/** each child of the content row: its box, and for a text-only child its ink centre (cap height to baseline) */
export const pinKids = (page: Page, rowSel: string) => page.evaluate((rs) => {
  const row = document.querySelector<HTMLElement>(rs)!;
  const rb = row.getBoundingClientRect();
  const inner = row.querySelector<HTMLElement>("[data-pin-row-in]")!;
  const ctx = document.createElement("canvas").getContext("2d")!;
  return {
    top: rb.top, bottom: rb.bottom,
    kids: [...inner.children].map((k) => {
      const e = k as HTMLElement;
      const r = e.getBoundingClientRect();
      if (r.height === 0) return null;
      let c = (r.top + r.bottom) / 2, how = "box";
      if (e.hasAttribute("data-pin-text")) {
        const cs = getComputedStyle(e);
        const probe = document.createElement("span"); probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
        e.appendChild(probe); const base = probe.getBoundingClientRect().top; probe.remove();
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        c = base - ctx.measureText("H").actualBoundingBoxAscent / 2; how = "ink";
      }
      return { cls: e.className.toString().split(" ")[0], c, how, top: r.top };
    }).filter(Boolean) as { cls: string; c: number; how: string; top: number }[],
  };
}, rowSel);
