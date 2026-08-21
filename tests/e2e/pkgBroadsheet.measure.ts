/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the broadsheet layout, driven.
 * ⚠️ Every selector scoped inside `.pkg-root`; workspace pages stay mounted and toggle `display`.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";
const OUT = "reports/pkg-broadsheet"; const ART = "run-artifacts/pkg-broadsheet";
mkdirSync(OUT, { recursive: true }); mkdirSync(ART, { recursive: true });
const ROUTE = "/manuscripts/packages";

/** The hero, measured. */
export const HERO = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const cs = (el, p) => el ? getComputedStyle(el).getPropertyValue(p).trim() : null;
  const box = (s) => { const el = root.querySelector(s); if (!el) return null;
    const b = el.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) }; };
  const hero = root.querySelector(".pkgb-hero");
  const ph = root.querySelector(".wsh");
  const body = root.querySelector(".pkgw-body") || root.querySelector(".pkgo-grid");
  return {
    heroPresent: !!hero,
    /* the shared PageHeader must still be here — this page CONFORMS (F-E) */
    pageHeaderPresent: !!ph,
    pageHeaderTitle: (root.querySelector(".wsh-title")?.textContent || "").trim(),
    pageHeaderBox: (() => { if (!ph) return null; const b = ph.getBoundingClientRect();
      return { x: Math.round(b.x), w: Math.round(b.width) }; })(),
    /* one Pro marker, not two */
    waxInHeader: !!root.querySelector(".wsh .pkgb-wax"),
    proPillPresent: !!root.querySelector(".pkgw-propill"),
    bandHasTitle: !!root.querySelector(".pkgb-hero h1"),
    controlRowPresent: !!root.querySelector(".wpg-tools"),
    hero: box(".pkgb-hero"),
    body: body ? { x: Math.round(body.getBoundingClientRect().x), w: Math.round(body.getBoundingClientRect().width) } : null,
    topBorder: cs(hero, "border-top-width"),
    topColor: cs(hero, "border-top-color"),
    cols: cs(hero, "grid-template-columns"),
    title: (root.querySelector(".pkgb-hero-l h1")?.textContent || "").trim(),
    titleLH: cs(root.querySelector(".pkgb-hero-l h1"), "line-height"),
    wax: !!root.querySelector(".pkgb-wax"),
    waxBox: box(".pkgb-wax"),
    statline: (root.querySelector(".pkgb-statline")?.textContent || "").trim(),
    prob: (root.querySelector(".pkgb-prob")?.textContent || "").trim(),
    heroSlot: (root.querySelector(".pkgb-hero-r .pkgb-plate")?.textContent || "").trim(),
    heroSlotBox: box(".pkgb-hero-r .pkgb-plate"),
    actions: Array.from(root.querySelectorAll(".pkgb-hero-actions button")).map((b) => ({
      label: (b.textContent || "").trim().slice(0, 30),
      bg: getComputedStyle(b).backgroundColor,
      disabled: b.disabled,
    })),
    /* the old shared header must be gone from this page */
    controlRow: !!root.querySelector(".wpg-tools"),
    /* ⚠️ THE SERIF-CLIP CHECK, WITH A SUB-PIXEL TOLERANCE — and the tolerance is the finding, not a
       loosening. Playfair at 38px with line-height 1.3 gives a 49.4px line box in a 49px content
       box, so a bare scrollHeight > clientHeight reports "clipped" on text that is not: overflow is
       visible, and the descender in "packages" paints in full (confirmed in the screenshot). The
       house serifClip measure uses a ratio for exactly this reason. 2px is rounding; more is real. */
    titleOverflowPx: (() => { const h = root.querySelector(".pkgb-hero-l h1");
      return h ? h.scrollHeight - h.clientHeight : null; })(),
    titleClipped: (() => { const h = root.querySelector(".pkgb-hero-l h1");
      return h ? (h.scrollHeight - h.clientHeight) > 2 : null; })(),
  };
})()`;

test("phase 1 — the hero", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const r = await page.evaluate(HERO);
  await page.screenshot({ path: `${OUT}/p1-hero-1440.png`, fullPage: true });
  writeFileSync(`${ART}/p1-hero.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

test("recon — the page after the header session's rework", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const r = await page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    if (!root) return { error: "no .pkg-root" };
    const box = (s) => { const el = root.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width) }; };
    return {
      masthead: box(".wsh") || box(".wsh-wrap"),
      scroller: box(".wpg-scroll"),
      controlRow: box(".wpg-tools") || box("[class*=wpg-control]"),
      railPresent: !!root.querySelector(".pkgo-rail"),
      railPanels: Array.from(root.querySelectorAll(".pkgo-rail .pkgo-lbl")).map((l) => (l.textContent||"").trim()),
      tiles: root.querySelectorAll(".pkgf-tile:not(.pkgf-tile--ghost)").length,
      dashboard: !!root.querySelector(".pkgf-statstrip"),
      classesOnScrollChildren: Array.from(root.querySelector(".wpg-scroll")?.children ?? [])
        .map((c) => c.className?.toString().slice(0, 40)),
    };
  })()`);
  await page.screenshot({ path: `${OUT}/recon-1440.png`, fullPage: true });
  writeFileSync(`${ART}/recon.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1200 }]) {
  test(`phase 1b — conformed header + band at ${vp.w}`, async ({ page }) => {
    await openRoute(page, ROUTE, { width: vp.w, height: vp.h });
    await liftMotionSuppression(page);
    const r = await page.evaluate(HERO);
    await page.screenshot({ path: `${OUT}/p1b-${vp.w}.png`, fullPage: true });
    writeFileSync(`${ART}/p1b-${vp.w}.txt`, JSON.stringify(r, null, 2) + "\n");
    console.log(`── ${vp.w} ──\n` + JSON.stringify(r, null, 2));
  });
}
