/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * quietBarLib — the probes for the quiet bar (ref design-refs/shell/quiet-bar-v1.html). A plain
 * module: importing a `.measure.ts` would execute its cases in the importer.
 *
 * ⚠️ EVERY PROBE FINDS THE PAGE'S SCROLLER AND TITLE BY MEASURING, NOT BY THE SHELL'S OWN RULE, so a
 * lock cannot pass by agreeing with the code it checks. The scroller is the OUTERMOST overflowing,
 * visible scroller inside the window; the title is the visible `PageHeader` title by its probe, which
 * exists on `main` too (the lock was proved red there).
 */
import type { Page } from "@playwright/test";

/** A style that stops transitions — including the bar's `::after` — so a static read is the end state. */
export const NO_MOTION = "*, *::before, *::after { transition: none !important; animation: none !important; }";

export async function suppressMotion(page: Page) {
  await page.addStyleTag({ content: NO_MOTION });
}

/** Tag the page's scroller with `data-qb-sc` and report it; null if the page does not scroll. */
export async function tagScroller(page: Page) {
  return page.evaluate(() => {
    document.querySelectorAll("[data-qb-sc]").forEach((e) => e.removeAttribute("data-qb-sc"));
    const wrap = document.querySelector(".ws-winwrap");
    if (!wrap) return null;
    const scrolls = (e: Element) => {
      const r = (e as HTMLElement).getBoundingClientRect();
      if (r.height <= 0) return false;
      return /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 2;
    };
    const all = [...wrap.querySelectorAll("*")].filter(scrolls);
    const outer = all.filter((e) => { for (let p = e.parentElement; p && p !== wrap; p = p.parentElement) if (scrolls(p)) return false; return true; });
    const sc = outer.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] as HTMLElement | undefined;
    if (!sc) return null;
    sc.setAttribute("data-qb-sc", "");
    const title = [...document.querySelectorAll<HTMLElement>('[data-probe="page-header"] [data-probe="title"]')].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    return { max: sc.scrollHeight - sc.clientHeight, hasTitle: !!title, titleInScroller: !!title && sc.contains(title) };
  });
}

/** Set the tagged scroller's position and let the shell's rAF read settle. */
export async function scrollTo(page: Page, top: number) {
  await page.evaluate((t) => { const sc = document.querySelector<HTMLElement>("[data-qb-sc]"); if (sc) sc.scrollTop = t; }, top);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
}

/** The scrollTop at which the title's bottom first reaches the bar's bottom, from the current layout. */
export async function titleGoneAt(page: Page) {
  return page.evaluate(() => {
    const sc = document.querySelector<HTMLElement>("[data-qb-sc]");
    const bar = [...document.querySelectorAll<HTMLElement>('[data-probe="navrow"]')].find((e) => e.getBoundingClientRect().height > 0);
    const title = [...document.querySelectorAll<HTMLElement>('[data-probe="page-header"] [data-probe="title"]')].find((e) => e.getBoundingClientRect().height > 0);
    if (!sc || !bar || !title) return null;
    return Math.ceil(sc.scrollTop + title.getBoundingClientRect().bottom - bar.getBoundingClientRect().bottom) + 1;
  });
}

/** One read of the bar: ground, hairline, shadow, the name's state, and every control's box. */
export async function readBar(page: Page) {
  return page.evaluate(() => {
    const bar = [...document.querySelectorAll<HTMLElement>('[data-probe="navrow"]')].find((e) => e.getBoundingClientRect().height > 0);
    const main = bar?.closest(".ws-main") as HTMLElement | null;
    if (!bar || !main) return null;
    const bs = getComputedStyle(bar);
    const after = getComputedStyle(bar, "::after");
    const name = bar.querySelector<HTMLElement>('[data-shell="pagename"]');
    const title = [...document.querySelectorAll<HTMLElement>('[data-probe="page-header"] [data-probe="title"]')].find((e) => e.getBoundingClientRect().height > 0);
    const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, w: r.width }; };
    const controls = {
      toggle: box(bar.querySelector('[aria-controls="ws-sidebar"]')), divider: box(bar.querySelector(".ws-bvr")), name: box(name),
      switcher: box(bar.querySelector('[data-shell="switcher"] > button')),
      ...Object.fromEntries([...bar.querySelectorAll(".ws-bright > *")].map((e, i) => [`tool${i}`, box(e)])),
    };
    return {
      barBg: bs.backgroundColor, groundBg: getComputedStyle(main).backgroundColor,
      shadow: bs.boxShadow, hairline: after.content !== "none" ? parseFloat(after.opacity) : 0,
      hairlineDur: after.transitionDuration,
      name: name ? { opacity: parseFloat(getComputedStyle(name).opacity), ariaHidden: name.getAttribute("aria-hidden"), pe: getComputedStyle(name).pointerEvents, dur: getComputedStyle(name).transitionDuration } : null,
      titleBottom: title ? title.getBoundingClientRect().bottom : null, barBottom: bar.getBoundingClientRect().bottom,
      controls,
    };
  });
}

export const transparent = (c: string) => /rgba\([^)]*,\s*0\)$/.test(c) || c === "transparent";

/**
 * Q8 · the header's text left, its drawing's drawn right, the column's right (the header spans the
 * column), and the first content card below the rule — a visible element that paints a surface
 * (background or shadow), the topmost then leftmost, so a wrapper that paints nothing cannot stand in.
 */
export async function readLeft(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
    const hd = [...document.querySelectorAll<HTMLElement>('[data-probe="page-header"]')].find(vis);
    if (!hd) return null;
    const h = hd.getBoundingClientRect();
    const text = hd.querySelector(".ph-text") as HTMLElement | null;
    const img = hd.querySelector('[data-probe="art"] img') as HTMLImageElement | null;
    let drawnR: number | null = null;
    if (img) {
      const b = img.getBoundingClientRect();
      const ar = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      const w = Math.min(b.width, b.height * ar);
      drawnR = b.right; void w; // object-position: right — the drawn right is the box's right
    }
    const sc = hd.closest(".wpg-scroll, #app-stage-scroll") ?? document.body;
    const rule = h.bottom;
    const surfaces = [...sc.querySelectorAll<HTMLElement>("*")].filter((e) => {
      if (hd.contains(e)) return false;
      const r = e.getBoundingClientRect();
      /* a full-bleed band (wider than the header, e.g. `.wpg-toolband`) is a ground, not a card */
      if (r.top < rule - 0.5 || r.top > rule + 400 || r.width < 60 || r.height < 30 || r.width > h.width + 2) return false;
      const s = getComputedStyle(e);
      const bg = s.backgroundColor;
      const paints = (bg && !/rgba\([^)]*,\s*0\)$/.test(bg) && bg !== "transparent") || (s.boxShadow && s.boxShadow !== "none");
      return !!paints && s.visibility !== "hidden";
    }).map((e) => ({ e, r: e.getBoundingClientRect() }));
    surfaces.sort((a, b) => (a.r.top - b.r.top) || (a.r.left - b.r.left));
    const first = surfaces[0];
    return {
      size: hd.dataset.size ?? null,
      /* a plate (4 Oct): its frame is the box on the column, and the text sits inside its padding */
      plate: hd.hasAttribute("data-plate"),
      frameL: (hd.querySelector('[data-probe="hero-frame"]') as HTMLElement | null)?.getBoundingClientRect().left ?? null,
      textL: text ? text.getBoundingClientRect().left : null,
      headerL: h.left, headerR: h.right,
      drawnR,
      card: first ? { l: first.r.left, t: first.r.top, cls: first.e.className.toString().slice(0, 60) } : null,
    };
  });
}
