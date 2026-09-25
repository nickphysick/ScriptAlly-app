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

/* ══ phase 2 — the hero (v11 §3, §11.1) and the count cards (§3.3, §11.3) ═══════════════════ */

const heroRead = (scope: string) => async (page: import("@playwright/test").Page) =>
  page.evaluate((scope) => {
    const hero = document.querySelector(`${scope} [data-clv="hero"]`) as HTMLElement | null;
    const htx = hero?.querySelector(".clv-htx") as HTMLElement | null;
    const card = hero?.querySelector('[data-clv="herocard"]') as HTMLElement | null;
    const art = hero?.querySelector('[data-clv="art"]') as HTMLElement | null;
    const main = document.querySelector(`${scope} .clv-main`) as HTMLElement | null;
    const title = hero?.querySelector(".clv-hero-t") as HTMLElement | null;
    if (!hero || !htx || !card || !art || !main || !title) return null;
    const v = (n: string) => parseFloat(hero.style.getPropertyValue(n)) || 0;
    const hr = hero.getBoundingClientRect();
    const s = art.getBoundingClientRect().width / 810;
    return {
      ready: hero.dataset.ready === "true",
      stacked: hero.className.includes("--stack"),
      heroBox: { w: Math.round(hr.width), h: Math.round(hr.height) },
      htxRight: htx.getBoundingClientRect().right,
      mainRight: main.getBoundingClientRect().right,
      artLeft: art.getBoundingClientRect().left,
      artTop: art.getBoundingClientRect().top,
      htxTop: htx.getBoundingClientRect().top,
      htxBottom: htx.getBoundingClientRect().bottom,
      s,
      cardLeftVar: v("--clv-cl"), cardScaleVar: v("--clv-cc"),
      heroLeft: hr.left,
      titleLines: Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).fontSize) / 1.02),
      tilesInHero: hero.querySelectorAll('[data-clv="tile"]').length,
      masthead: !!document.querySelector(`${scope} .wsh`),
      oldTiles: !!document.querySelector(`${scope} .agl-stat, ${scope} .stt-row`),
    };
  }, scope);

for (const width of [1440, 1920] as const) {
  test(`the hero, side by side at ${width} — card clear of the text, art on the column's edge, the peek kept`, async ({ page }) => {
    await openRoute(page, "/agents", { width, height: width === 1440 ? 900 : 1080 });
    const scope = await visiblePage(page, ".agl-wpg");
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const h = await heroRead(scope)(page);
    expect(h, "no hero on the page").not.toBeNull();
    bump();
    if (!h) return;
    // eslint-disable-next-line no-console
    console.log(`[hero ${width}] W=${h.heroBox.w} h=${h.heroBox.h} s=${h.s.toFixed(3)}`);
    expect(h.ready, "the hero never measured itself").toBe(true);
    expect(h.stacked, "side-by-side width rendered the stacked hero").toBe(false);
    expect(h.masthead, "the shared masthead is still mounted beside the hero").toBe(false);
    expect(h.oldTiles, "the old StatTiles row survived the hero").toBe(false);
    expect(h.titleLines, "the title wrapped").toBe(1);
    expect(h.tilesInHero, "the three count cards ride in the hero when side-by-side").toBe(3);
    bump(6);

    /* the vars are the CONTRACT — the card's layout box in hero space, unswollen by the rotation */
    const cardLeftAbs = h.heroLeft + h.cardLeftVar;
    const cardRightAbs = cardLeftAbs + 300 * h.cardScaleVar;
    expect(cardLeftAbs, "the live card sits over the text column").toBeGreaterThanOrEqual(h.htxRight + 16);
    const artVisibleRight = h.artLeft + 752 * h.s;
    expect(artVisibleRight, "the art's VISIBLE edge overran the column").toBeLessThanOrEqual(h.mainRight + 1);
    const drawnCardRight = h.artLeft + 398 * h.s;
    expect(drawnCardRight - cardRightAbs, "less than 60px of the drawn card shows past the live one").toBeGreaterThanOrEqual(60);
    expect(h.artLeft, "the art's box overlaps the text column").toBeGreaterThanOrEqual(h.htxRight - 1);
    bump(4);
  });
}

test("the hero stacks at 1280 — one-line title beside the sentence, the cards above the list, the same edge rules", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1280, height: 800 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const h = await heroRead(scope)(page);
  expect(h).not.toBeNull();
  bump();
  if (!h) return;
  expect(h.stacked, "1280 should stack (the column is under 760 beside the rail)").toBe(true);
  expect(h.titleLines).toBe(1);
  expect(h.tilesInHero, "stacked: the cards leave the hero").toBe(0);
  const rowTiles = await page.evaluate((scope) => {
    const row = document.querySelector(`${scope} .clv-tiles--row`) as HTMLElement | null;
    const hero = document.querySelector(`${scope} [data-clv="hero"]`) as HTMLElement | null;
    const grid = document.querySelector(`${scope} .agl-grid`) as HTMLElement | null;
    if (!row || !hero || !grid) return null;
    return {
      n: row.querySelectorAll('[data-clv="tile"]').length,
      belowHero: row.getBoundingClientRect().top >= hero.getBoundingClientRect().bottom - 1,
      aboveList: row.getBoundingClientRect().bottom <= grid.getBoundingClientRect().top + 1,
    };
  }, scope);
  expect(rowTiles, "no stacked card row").not.toBeNull();
  expect(rowTiles!.n).toBe(3);
  expect(rowTiles!.belowHero, "the card row sits inside the hero").toBe(true);
  expect(rowTiles!.aboveList, "the card row fell below the list").toBe(true);
  const artVisibleRight = h.artLeft + 752 * h.s;
  expect(artVisibleRight).toBeLessThanOrEqual(h.mainRight + 1);
  const cardRightAbs = h.heroLeft + h.cardLeftVar + 300 * h.cardScaleVar;
  expect(h.artLeft + 398 * h.s - cardRightAbs, "the stacked peek").toBeGreaterThanOrEqual(60);
  bump(7);
});

test("the count cards filter — populations proved non-zero first, OR on multi-select, dim on the rest", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const counts = await page.evaluate((scope) =>
    [...document.querySelectorAll(`${scope} [data-clv="tile"]`)].map((t) => ({
      k: (t as HTMLElement).dataset.k,
      n: parseInt(t.querySelector("b")?.textContent ?? "0", 10),
    })), scope);
  expect(counts.length, "three cards").toBe(3);
  /* ⚠️ POPULATIONS FIRST (v11 §11.3): a filter proved against zero rows is a vacuous filter */
  for (const c of counts) expect(c.n, `the seed left the ${c.k} card empty — the filter below would prove nothing`).toBeGreaterThan(0);
  const total = counts.reduce((a, c) => a + c.n, 0);
  const gridCount = () => page.evaluate((scope) => document.querySelectorAll(`${scope} [data-agent-card]`).length, scope);
  expect(await gridCount(), "the three cards partition the whole list").toBe(total);
  bump(5);

  const tile = (k: string) => page.locator(`${scope} [data-clv="tile"][data-k="${k}"]`);
  await tile("active").click();
  expect(await gridCount(), "Active queries filters to its own population").toBe(counts.find((c) => c.k === "active")!.n);
  const dimmed = await page.evaluate((scope) => {
    const t = document.querySelector(`${scope} [data-clv="tile"][data-k="never"]`) as HTMLElement;
    return parseFloat(getComputedStyle(t).opacity);
  }, scope);
  expect(dimmed, "an unselected card should dim to .45").toBeCloseTo(0.45, 2);
  await tile("closed").click();
  expect(await gridCount(), "multi-select ORs the populations").toBe(
    counts.find((c) => c.k === "active")!.n + counts.find((c) => c.k === "closed")!.n,
  );
  await tile("active").click();
  await tile("closed").click();
  expect(await gridCount(), "clearing the cards restores the list").toBe(total);
  bump(4);
});
