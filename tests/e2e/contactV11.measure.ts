/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v11 — the rendered locks, phase by phase (design authority:
 * design-refs/contact-list-v11.html, measured at 1440×900 and 1280×800).
 *
 * Phase 1: the centred group (page column + 340px rail, 28px gap, 1480 measure), the rail's
 * sticky geometry (its height from its own MEASURED top — the house viewport law), the tray
 * chrome, and `?view=` accepted-and-ignored (the switch is retired; a bookmarked view lands on
 * the one list rather than erroring).
 *
 * ⚠️ EVERY /agents PROBE GOES THROUGH `visiblePage` — every workspace page stays mounted, and
 * `document.querySelector` answers about whichever copy is first in the DOM.
 */
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { openRoute, visiblePage } from "./measure";

let asserts = 0;
const bump = (n = 1) => { asserts += n; };

test.beforeAll(async () => { await assertLocalBundleIsDev(); });

test.afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`[contactV11] assertions run: ${asserts}`);
  /* ⚠️ THE FLOOR IS THE GUARD AGAINST A SILENT HALF-RUN — a suite that finds no subject must
     fail in the language of a failure, not report a shorter green. */
  if (asserts < 12) throw new Error(`contactV11 ran only ${asserts} assertions — a subject went missing`);
});

test.describe("phase 1 — the centred group and the rail shell", () => {
  test("the group: two columns, 340px rail, 28px gap, capped and centred", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");

    const g = await page.evaluate((scope) => {
      const grp = document.querySelector(`${scope} .clv-group`);
      const main = document.querySelector(`${scope} .clv-main`);
      const rail = document.querySelector(`${scope} [data-clv="rail"]`);
      if (!grp || !main || !rail) return null;
      const s = getComputedStyle(grp as HTMLElement);
      const gr = (grp as HTMLElement).getBoundingClientRect();
      const mr = (main as HTMLElement).getBoundingClientRect();
      const rr = (rail as HTMLElement).getBoundingClientRect();
      return {
        cols: s.gridTemplateColumns, gap: s.columnGap,
        groupW: Math.round(gr.width),
        railW: Math.round(rr.width),
        gapPx: Math.round(rr.left - mr.right),
        railTop: Math.round(rr.top), mainTop: Math.round(mr.top),
      };
    }, scope);

    expect(g, "the centred group is not on the page").not.toBeNull();
    bump();
    if (!g) return;
    expect(g.railW, "the rail's track is not 340px").toBe(340);
    expect(g.gapPx, "the gap between the column and the rail").toBe(28);
    expect(g.groupW, "the group overran the 1480 measure").toBeLessThanOrEqual(1480);
    /* the rail spans from the top of the page column — level with the hero once it exists */
    expect(Math.abs(g.railTop - g.mainTop), "the rail does not start level with the column").toBeLessThanOrEqual(1);
    bump(4);
  });

  test("the rail: sticky, its height from its own measured top, never past the fold", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");

    const read = () => page.evaluate((scope) => {
      const rail = document.querySelector(`${scope} [data-clv="rail"]`) as HTMLElement | null;
      const scroller = rail?.closest(".wpg-scroll") as HTMLElement | null;
      if (!rail || !scroller) return null;
      const r = rail.getBoundingClientRect();
      const sc = scroller.getBoundingClientRect();
      return {
        top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
        scrollerTop: Math.round(sc.top),
        inner: window.innerHeight,
        scrollTop: Math.round(scroller.scrollTop),
        max: Math.round(scroller.scrollHeight - scroller.clientHeight),
      };
    }, scope);

    const rest = await read();
    expect(rest, "no rail on the page").not.toBeNull();
    bump();
    if (!rest) return;
    /* at rest: height = innerHeight − its own top − 16, clamped [360, 860] */
    const want = Math.max(360, Math.min(860, rest.inner - Math.max(16, rest.top) - 16));
    expect(Math.abs(rest.h - want), `rest: rail height ${rest.h} against derived ${want}`).toBeLessThanOrEqual(2);
    expect(rest.bottom, "rest: the rail spills past the fold").toBeLessThanOrEqual(rest.inner - 14);
    bump(2);

    /* ⚠️ THE PRECONDITION FIRST: the page must actually scroll before the pinned reading means
       anything — a fixture too short to scroll would pass the pinned claim vacuously. */
    expect(rest.max, "the page does not scroll — the pinned state is unreachable on this fixture").toBeGreaterThan(120);
    bump();

    await page.evaluate((scope) => {
      const scroller = document.querySelector(`${scope} .wpg-scroll`) as HTMLElement;
      scroller.scrollTop = Math.min(600, scroller.scrollHeight - scroller.clientHeight);
    }, scope);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const pinned = await read();
    expect(pinned).not.toBeNull();
    bump();
    if (!pinned) return;
    /* pinned: sticky holds it 16px under the scroller's own top edge (the app's scroller starts
       below the shared bar — the mock's 16-under-the-viewport, translated to the real chrome) */
    expect(Math.abs(pinned.top - (pinned.scrollerTop + 16)), `pinned top ${pinned.top} against scroller ${pinned.scrollerTop}+16`).toBeLessThanOrEqual(2);
    const wantPinned = Math.max(360, Math.min(860, pinned.inner - Math.max(16, pinned.top) - 16));
    expect(Math.abs(pinned.h - wantPinned), `pinned: rail height ${pinned.h} against derived ${wantPinned}`).toBeLessThanOrEqual(2);
    expect(pinned.bottom, "pinned: the rail spills past the fold").toBeLessThanOrEqual(pinned.inner - 14);
    bump(3);
  });

  test("the tray: 122px inset 8, the title at (19,32), the peek art at (236,61) behind it", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");

    const t = await page.evaluate((scope) => {
      const card = document.querySelector(`${scope} .clv-hkrail`) as HTMLElement | null;
      const tray = document.querySelector(`${scope} [data-clv="tray"]`) as HTMLElement | null;
      const title = tray?.querySelector(".clv-tray-t") as HTMLElement | null;
      const img = tray?.querySelector(".clv-peek") as HTMLElement | null;
      if (!card || !tray || !title || !img) return null;
      const c = card.getBoundingClientRect(), tr = tray.getBoundingClientRect();
      const ti = title.getBoundingClientRect(), im = img.getBoundingClientRect();
      const centre = document.elementFromPoint(ti.left + ti.width / 2, ti.top + ti.height / 2);
      return {
        onScreen: tr.top >= 0 && tr.bottom <= window.innerHeight,
        trayW: Math.round(tr.width), trayH: Math.round(tr.height),
        insetL: Math.round(tr.left - c.left), insetT: Math.round(tr.top - c.top),
        titleL: Math.round(ti.left - tr.left), titleT: Math.round(ti.top - tr.top),
        imgL: Math.round(im.left - tr.left), imgT: Math.round(im.top - tr.top), imgW: Math.round(im.width),
        hit: centre === title || title.contains(centre),
      };
    }, scope);

    expect(t, "no tray in the rail").not.toBeNull();
    bump();
    if (!t) return;
    /* ⚠️ the elementFromPoint reading below is only a reading if the tray is on screen */
    expect(t.onScreen, "the tray is off screen — nothing below is a measurement").toBe(true);
    expect([t.trayW, t.trayH], "tray box").toEqual([324, 122]);
    expect([t.insetL, t.insetT], "tray inset in the card").toEqual([8, 8]);
    expect([t.titleL, t.titleT], "the title's corner in the tray").toEqual([19, 32]);
    expect([t.imgL, t.imgT, t.imgW], "the peek art's slot").toEqual([236, 61, 102]);
    expect(t.hit, "the title is not above the art — z-order lost").toBe(true);
    bump(6);
  });

  test("?view= is accepted and ignored — one renderer, no switch", async ({ page }) => {
    await openRoute(page, "/agents?view=board", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const r = await page.evaluate((scope) => ({
      grid: !!document.querySelector(`${scope} .agl-grid`),
      board: !!document.querySelector(`${scope} .agl-bcard`),
      lrow: !!document.querySelector(`${scope} .agl-lrow`),
      switchBtns: document.querySelectorAll(`${scope} [data-view-switch], ${scope} .qvs`).length,
      url: location.search,
    }), scope);
    expect(r.grid, "the one renderer is not on the page").toBe(true);
    expect(r.board, "a board renderer answered a ?view=board URL").toBe(false);
    expect(r.lrow, "a list renderer leaked in").toBe(false);
    expect(r.switchBtns, "a view switch is still mounted").toBe(0);
    expect(r.url, "the parameter is ignored, not scrubbed").toContain("view=board");
    bump(5);
  });
});
