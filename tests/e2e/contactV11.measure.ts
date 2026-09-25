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
let ran = 0;
const bump = (n = 1) => { asserts += n; };

test.beforeAll(async () => { await assertLocalBundleIsDev(); });
test.beforeEach(() => { ran += 1; });

test.afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`[contactV11] assertions run: ${asserts} across ${ran} tests (this worker)`);
  /* ⚠️ THE FLOOR IS THE GUARD AGAINST A SILENT HALF-RUN — a suite that finds no subject must
     fail in the language of a failure, not report a shorter green. It SCALES with the tests this
     WORKER ran (every case bumps at least twice), because the counter is per worker: a `-g` run,
     or a worker Playwright restarts after a crash, would otherwise fail the floor with every one
     of its own assertions green — measured, and the floor's noise then MASKED the real reason. */
  if (asserts < ran * 2) throw new Error(`contactV11 ran only ${asserts} assertions across ${ran} tests — a subject went missing`);
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
      rows: document.querySelectorAll(`${scope} [data-clv="row"]`).length,
      board: !!document.querySelector(`${scope} .agl-bcard`),
      lrow: !!document.querySelector(`${scope} .agl-lrow`),
      switchBtns: document.querySelectorAll(`${scope} [data-view-switch], ${scope} .qvs`).length,
      url: location.search,
    }), scope);
    expect(r.rows > 0, "the one renderer is not on the page").toBe(true);
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
    const grid = document.querySelector(`${scope} [data-clv="list"]`) as HTMLElement | null;
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

/* ══ phase 3 — the list: header row, faceted filter, bands, rows, the floating bar ══════════ */

test("the header row and the rows — one renderer, StatusDot on every queried row, genre first, no ellipsis", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const r = await page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="row"]`)] as HTMLElement[];
    const tally = document.querySelector(`${scope} [data-clv="tally"]`)?.textContent ?? "";
    return {
      toolbarGone: !document.querySelector(`${scope} .agl-toolbar`),
      gridGone: !document.querySelector(`${scope} .agl-grid`),
      rows: rows.length,
      tally,
      queried: rows.filter((x) => x.dataset.status !== "Not queried yet").length,
      dotted: rows.filter((x) => x.dataset.status !== "Not queried yet" && x.querySelector(".clv-ql svg")).length,
      hitFirst: rows
        .filter((x) => x.querySelector(".clv-gch .clv-hit"))
        .every((x) => x.querySelector(".clv-gch span")!.className.includes("clv-hit")),
      names: rows.map((x) => {
        const b = x.querySelector(".clv-rwho b") as HTMLElement;
        return { over: b.scrollWidth > b.clientWidth + 1 };
      }),
      bands: [...document.querySelectorAll(`${scope} [data-clv="band"]`)].map((b) => ({
        label: b.querySelector("b")?.textContent, n: b.querySelector("i")?.textContent,
        extra: b.querySelector("small")?.textContent ?? null,
      })),
    };
  }, scope);
  expect(r.toolbarGone, "the old toolbar is still mounted").toBe(true);
  expect(r.gridGone, "the card grid is still mounted").toBe(true);
  expect(r.rows, "population first").toBeGreaterThan(10);
  expect(r.tally).toBe(`${r.rows} of ${r.rows}`);
  expect(r.dotted, "a queried row without its StatusDot").toBe(r.queried);
  expect(r.hitFirst, "a matched genre chip is not first").toBe(true);
  const over = r.names.filter((n) => n.over).length;
  expect(over, "an agent's name ellipsised at 1440 on this account").toBe(0);
  expect(r.bands[0]?.label, "the default grouping's first band").toBe("Your move");
  expect(r.bands[0]?.extra).toBe("Offers, requests and nudges");
  bump(8);
});

test("the filter panel — faceted counts, kept scroll, and an outside pointerdown closing it (§11.4)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  /* the whole list's facts, read off the rows BEFORE anything narrows them — the oracle the
     panel's counts are checked against, independent of the panel's own arithmetic */
  const all = await page.evaluate((scope) =>
    [...document.querySelectorAll(`${scope} [data-clv="row"]`)].map((x) => ({
      door: (x as HTMLElement).dataset.door,
      stand: (x as HTMLElement).dataset.stand,
      genres: ((x as HTMLElement).dataset.genres ?? "").split("|").filter(Boolean),
    })), scope);
  expect(all.length, "population first").toBeGreaterThan(10);
  bump();

  await page.locator(`${scope} [data-clv="btn-filter"]`).click();
  await expect(page.locator(`${scope} [data-clv="fpanel"]`)).toBeVisible();
  /* pick the first genre chip with a non-zero count */
  const genre = await page.evaluate((scope) => {
    const chip = [...document.querySelectorAll(`${scope} [data-clv="fsec-genres"] .clv-chip`)]
      .find((c) => !(c as HTMLElement).dataset.zero && !(c.textContent ?? "").startsWith("Not recorded"));
    return chip?.firstChild?.textContent?.trim() ?? null;
  }, scope);
  expect(genre, "no selectable genre on this account").not.toBeNull();
  await page.locator(`${scope} [data-clv="fsec-genres"] .clv-chip`, { hasText: genre! }).first().click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  const panel = await page.evaluate((scope) => {
    const opt = (sec: string) => [...document.querySelectorAll(`${scope} [data-clv="fsec-${sec}"] [aria-pressed], ${scope} [data-clv="fsec-${sec}"] [role="checkbox"]`)]
      .map((o) => ({ v: (o.textContent ?? "").trim(), n: parseInt(o.querySelector("i")?.textContent ?? "0", 10) }));
    return { door: opt("door"), stand: opt("stand") };
  }, scope);
  const pool = all.filter((x) => x.genres.includes(genre!));
  const doorOpen = panel.door.find((o) => o.v.startsWith("Open"))!;
  const doorClosed = panel.door.find((o) => o.v.startsWith("Closed"))!;
  expect(doorOpen.n, "faceted: door Open under the genre filter").toBe(pool.filter((x) => x.door === "open").length);
  expect(doorClosed.n, "faceted: door Closed under the genre filter").toBe(pool.filter((x) => x.door === "closed").length);
  bump(3);

  /* kept scroll: scroll the body, tick a checkbox, the place holds.
     ⚠️ A NON-ZERO checkbox, by the same population-first law as the genre pick above: the first
     row blindly was "Your move", and `genre ∧ Your move` went empty as the shared account's
     statuses drifted — the outside-close loop below then waited its whole timeout for a band
     that a correctly-filtered EMPTY list is right not to draw. */
  await page.evaluate((scope) => { (document.querySelector(`${scope} [data-clv="fbody"]`) as HTMLElement).scrollTop = 220; }, scope);
  const standPick = await page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="fsec-stand"] .clv-fck`)] as HTMLElement[];
    const i = rows.findIndex((r) => parseInt(r.querySelector("i")?.textContent ?? "0", 10) > 0);
    return i;
  }, scope);
  expect(standPick, "no non-zero standing under the genre filter — the intersection cannot be exercised").toBeGreaterThanOrEqual(0);
  await page.locator(`${scope} [data-clv="fsec-stand"] .clv-fck`).nth(standPick).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const kept = await page.evaluate((scope) => (document.querySelector(`${scope} [data-clv="fbody"]`) as HTMLElement).scrollTop, scope);
  expect(Math.abs(kept - 220), "the panel lost its place on a selection").toBeLessThanOrEqual(2);
  bump();

  /* an outside pointerdown closes it — the five §11.4 targets in turn */
  for (const sel of ["h2", '[data-clv="band"]', '[data-clv="row"]', '[data-clv="tray"]', '[data-clv="herocard"]'] as const) {
    if (!(await page.locator(`${scope} [data-clv="fpanel"]`).count())) {
      await page.locator(`${scope} [data-clv="btn-filter"]`).click();
      await expect(page.locator(`${scope} [data-clv="fpanel"]`)).toBeVisible();
    }
    const target = sel === "h2" ? page.locator(`${scope} .clv-ctl h2`) : page.locator(`${scope} ${sel}`).first();
    await target.dispatchEvent("pointerdown", { bubbles: true });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(await page.locator(`${scope} [data-clv="fpanel"]`).count(), `a pointerdown on ${sel} left the panel open`).toBe(0);
    bump();
  }
});

test("the floating bar — centred on the list's box, never moving the list (§11.10)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const before = await page.evaluate((scope) => {
    const main = document.querySelector(`${scope} .clv-main`) as HTMLElement;
    const list = document.querySelector(`${scope} [data-clv="list"]`) as HTMLElement;
    return { centre: main.getBoundingClientRect().left + main.getBoundingClientRect().width / 2, listTop: list.getBoundingClientRect().top };
  }, scope);
  expect(await page.locator(".clv-fbar").count(), "the bar shows with nothing active").toBe(0);
  await page.locator(`${scope} [data-clv="tile"][data-k="active"]`).click();
  await expect(page.locator(".clv-fbar")).toBeVisible();
  const after = await page.evaluate((scope) => {
    const bar = document.querySelector(".clv-fbar") as HTMLElement;
    const r = bar.getBoundingClientRect();
    const list = document.querySelector(`${scope} [data-clv="list"]`) as HTMLElement;
    return { barCentre: r.left + r.width / 2, bottom: r.bottom, listTop: list.getBoundingClientRect().top, chips: bar.querySelectorAll(".clv-pl").length };
  }, scope);
  expect(Math.abs(after.barCentre - before.centre), "the bar is not centred on the list's box").toBeLessThanOrEqual(1);
  expect(Math.abs(after.bottom - (900 - 22)), "22px above the window's bottom").toBeLessThanOrEqual(1);
  expect(after.listTop, "the bar moved the list").toBe(before.listTop);
  expect(after.chips).toBe(1);
  await page.locator(".clv-fbar .clv-pl button").click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await page.locator(".clv-fbar").count(), "removing the one chip hides the bar").toBe(0);
  bump(6);
});

test("narrow rows at 1280 — two lines, the fit beneath its hairline", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1280, height: 800 });
  const scope = await visiblePage(page, ".agl-wpg");
  const r = await page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="row"]`)] as HTMLElement[];
    const withFit = rows.filter((x) => x.querySelector(".clv-rfit .clv-gch, .clv-rfit [data-clv='torn']"));
    const sample = withFit.slice(0, 6).map((x) => {
      const who = x.querySelector(".clv-rwho") as HTMLElement;
      const fit = x.querySelector(".clv-rfit") as HTMLElement;
      return {
        h: Math.round(x.getBoundingClientRect().height),
        fitBelow: fit.getBoundingClientRect().top >= who.getBoundingClientRect().bottom - 1,
        cols: getComputedStyle(x).gridTemplateColumns.split(" ").length,
      };
    });
    return { n: withFit.length, sample };
  }, scope);
  expect(r.n, "population first").toBeGreaterThan(4);
  for (const s of r.sample) {
    expect(s.cols, "the narrow template is three tracks").toBe(3);
    expect(s.fitBelow, "the fit line is not beneath the who block").toBe(true);
    expect(s.h, "a narrow row should fold to two lines").toBeGreaterThan(100);
  }
  bump(1 + r.sample.length * 3);
});

test("the bands stick at the scroller's top with the page-coloured shadow", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const r = await page.evaluate(async (scope) => {
    const scroller = document.querySelector(`${scope} .wpg-scroll`) as HTMLElement;
    const bands = [...document.querySelectorAll(`${scope} [data-clv="band"]`)] as HTMLElement[];
    if (bands.length < 2) return null;
    const second = bands[1];
    /* scroll until the SECOND band's group is in play, then the FIRST should be gone and the
       second pinned at the scroller's top */
    scroller.scrollTop = second.offsetTop + 80;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const st = scroller.getBoundingClientRect().top;
    const b = second.getBoundingClientRect();
    return { pinned: Math.abs(b.top - st) <= 2, sticky: getComputedStyle(second).position === "sticky" };
  }, scope);
  expect(r, "fewer than two bands on this account — the pinned claim is unreachable").not.toBeNull();
  expect(r!.sticky).toBe(true);
  expect(r!.pinned, "the band does not pin at the scroller's top").toBe(true);
  bump(3);
});

/* ══════════════════════════ phase 4 — the agent pop-up (§11.6 / §11.7) ══════════════════════════ */

test("the pop-up: centred, 540 wide (520 editing), band by standing — and the picker wears the portal dress (§11.6)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.click(`${scope} [data-clv="row"]`);
  await page.waitForSelector('[data-clv="profile"]');
  const view = await page.evaluate(() => {
    const card = document.querySelector('[data-clv="profile"]') as HTMLElement;
    const r = card.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      centred: Math.abs((r.left + r.right) / 2 - window.innerWidth / 2),
      band: (document.querySelector('[data-clv="bandchip"]') as HTMLElement).textContent?.trim() ?? "",
      dialog: card.getAttribute("role"),
    };
  });
  expect(view.w, "the view card is 540 wide").toBe(540);
  expect(view.centred, "the card is centred on the viewport").toBeLessThanOrEqual(8);
  expect(view.band.length, "the band chip states the standing").toBeGreaterThan(0);
  expect(view.dialog).toBe("dialog");

  await page.click('[data-clv="edit"]');
  const edit = await page.evaluate(() => {
    const card = document.querySelector('[data-clv="profile"]') as HTMLElement;
    const control = document.querySelector('[data-clv="profile"] .agl-cc-control') as HTMLElement;
    const cs = getComputedStyle(control);
    return { w: Math.round(card.getBoundingClientRect().width), picker: { borderBottom: cs.borderBottomStyle, cursor: cs.cursor } };
  });
  expect(edit.w, "the edit card is 520 wide").toBe(520);
  /* ⚠️ THE PORTAL-DRESS LOCK. The picker's old rules were all `.aglist .agl-cc*` with tokens on
     `.aglist`; this card portals to document.body, so it rendered as a BARE BUTTON — default
     border, default cursor — through a clean build and a green suite. The dressed control is a
     dashed-underline field (contactV11.css, `:root` palette). */
  expect(edit.picker.borderBottom, "the picker control lost the portal dress — it is a bare button again").toBe("dashed");
  expect(edit.picker.cursor).toBe("pointer");
  await page.click('[data-clv="profile"] .agl-cc-control');
  const menu = await page.evaluate(() => {
    const m = document.querySelector('[data-clv="profile"] .agl-cc-menu') as HTMLElement;
    const cs = getComputedStyle(m);
    return { bg: cs.backgroundColor, radius: cs.borderRadius, onTop: cs.position === "absolute" };
  });
  expect(menu.bg, "the menu panel has no fill — its rules are not reaching the portal").toBe("rgb(255, 255, 255)");
  expect(menu.radius).toBe("10px");
  expect(menu.onTop).toBe(true);
  await page.keyboard.press("Escape"); // the picker's own capture consumes it
  await page.click('[data-clv="profile"] .clv-cx'); // Cancel back to view, nothing written
  bump(10);
});

test("Escape cascades edit → view → closed, and the backdrop is inert while editing (§11.6)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.click(`${scope} [data-clv="row"]`);
  await page.waitForSelector('[data-clv="profile"]');
  await page.click('[data-clv="edit"]');
  await page.waitForSelector('[data-clv="profile"].clv-pcard--edit');
  await page.keyboard.press("Escape");
  const afterFirst = await page.evaluate(() => ({
    open: !!document.querySelector('[data-clv="profile"]'),
    editing: !!document.querySelector('[data-clv="profile"].clv-pcard--edit'),
  }));
  expect(afterFirst.open, "the first Escape closed the whole card — it must only leave edit mode").toBe(true);
  expect(afterFirst.editing, "the first Escape did not leave edit mode").toBe(false);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-clv="profile"]', { state: "detached" });

  /* the backdrop: closes the VIEW, does nothing while editing */
  await page.click(`${scope} [data-clv="row"]`);
  await page.waitForSelector('[data-clv="profile"]');
  await page.click('[data-clv="edit"]');
  await page.mouse.click(30, 450); // well outside the 540px centred card
  const heldOpen = await page.evaluate(() => !!document.querySelector('[data-clv="profile"].clv-pcard--edit'));
  expect(heldOpen, "a backdrop click discarded an edit in progress").toBe(true);
  await page.click('[data-clv="profile"] .clv-cx');
  await page.mouse.click(30, 450);
  await page.waitForSelector('[data-clv="profile"]', { state: "detached" });
  bump(4);
});

test("§11.7 — the reply-time note is live as the draft changes, names the engine's dates, and Cancel writes nothing", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  /* an agent whose live query's expected date DEPENDS on the window — walk the with-the-agent
     rows until one yields a per-query line (a writer-dated or windowless query legitimately
     yields none; the note's generic lines must appear either way) */
  const candidates = await page.evaluate(
    (scope) => [...document.querySelectorAll(`${scope} [data-clv="row"][data-stand="agent"]`)]
      .map((x) => (x as HTMLElement).dataset.agentCard!).slice(0, 6),
    scope,
  );
  expect(candidates.length, "population first — no with-the-agent rows on this account").toBeGreaterThan(0);
  let perQuery = "";
  let generic = "";
  let summary = "";
  let before = "";
  let touchedId = "";
  for (const id of candidates) {
    await page.click(`${scope} [data-agent-card="${id}"]`);
    await page.waitForSelector('[data-clv="profile"]');
    await page.click('[data-clv="edit"]');
    const orig = await page.inputValue('[data-clv="f-weeks"]');
    const next = orig === "12" ? "9" : "12";
    await page.fill('[data-clv="f-weeks"]', next);
    const note = await page.evaluate(() => ({
      warn: (document.querySelector('[data-warn="reply"]') as HTMLElement | null)?.textContent ?? "",
      summary: (document.querySelector('[data-clv="also-summary"]') as HTMLElement | null)?.textContent ?? "",
    }));
    generic = note.warn;
    summary = note.summary;
    if (/Query Centre and Birds-eye view:.*→/.test(note.warn)) {
      perQuery = note.warn; before = orig; touchedId = id;
      break;
    }
    await page.click('[data-clv="profile"] .clv-cx');
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-clv="profile"]', { state: "detached" });
  }
  expect(generic, "the reply note never appeared at all").toContain("To-do list and Dashboard");
  expect(generic).toContain("Analytics");
  expect(summary, "the footer does not union the surfaces").toContain("Saving also updates");
  expect(perQuery, "no candidate produced a per-query engine line — the dry run is not reaching the queries").toContain("reply expected");
  /* the engine's from → to, en-GB — and "no date" is one of its honest answers (an agency with
     no stated window has no expected date until one is set), so either side may say it, and at
     least one side must be a real date or the line said nothing */
  expect(perQuery).toMatch(/(\d{1,2} [A-Z][a-z]{2}|no date) → (\d{1,2} [A-Z][a-z]{2}|no date)/);
  expect(perQuery).toMatch(/\d{1,2} [A-Z][a-z]{2}/);
  /* Cancel writes NOTHING: reopen and the stored value is the original */
  await page.click('[data-clv="profile"] .clv-cx');
  await page.click('[data-clv="edit"]');
  const after = await page.inputValue('[data-clv="f-weeks"]');
  expect(after, `Cancel wrote a draft value to ${touchedId} — the account has been changed`).toBe(before);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  bump(7);
});

test("§11.7 write half — save says what else moved, and the fixture agent is restored in the same run", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const fx = `${scope} [data-agent-card="clv-fx-never"]`;
  expect(await page.locator(fx).count(), "the fixture agent is not on this account — run tests/e2e/seedContactFixture.mjs").toBe(1);
  await page.click(fx);
  await page.waitForSelector('[data-clv="profile"]');
  await page.click('[data-clv="edit"]');
  expect(await page.inputValue('[data-clv="f-weeks"]'), "precondition: the fixture's reply time is deliberately absent (ruling c)").toBe("");
  await page.fill('[data-clv="f-weeks"]', "9");
  await page.click('[data-clv="save"]');
  await page.waitForSelector('[data-clv="savedline"]');
  const saved = await page.textContent('[data-clv="savedline"]');
  /* ⚠️ THE ACCOUNT IS NOW CHANGED — everything from here to the restore runs without navigation */
  expect(saved, "the saved line is missing — the write may have failed with the account half-changed").toContain("Saved");
  const who = await page.textContent('[data-clv="profile"]');
  expect(who, "the view does not show the saved window").toContain("Replies in about 9 weeks");
  /* restore: back to unstated (the field is DELETED, not zeroed — absence is the fixture) */
  await page.click('[data-clv="edit"]');
  await page.fill('[data-clv="f-weeks"]', "");
  await page.click('[data-clv="save"]');
  await page.waitForSelector('[data-clv="savedline"]');
  const restored = await page.evaluate(() => (document.querySelector('[data-clv="profile"]') as HTMLElement).textContent ?? "");
  expect(restored, "THE FIXTURE WAS NOT RESTORED — clv-fx-never now carries a reply window it must not have").not.toContain("Replies in about");
  await page.keyboard.press("Escape");
  bump(6);
});

/* ══════════════════════════ phase 5 — the add card (§8 / §11.9) ══════════════════════════ */

test("the add card (§11.9): disabled until name AND agency, the duplicate blocks with OPEN CARD through, typing keeps the node", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.click(`${scope} [data-clv="herocard"]`);
  await page.waitForSelector('[data-clv="addcard"]');
  const disabledAt = async () => page.evaluate(() => (document.querySelector('[data-clv="add-save"]') as HTMLButtonElement).disabled);
  expect(await disabledAt(), "Add enabled on an empty form").toBe(true);
  await page.fill('[data-clv="addcard"] [data-clv="f-name"]', "Zz Probe Agent");
  expect(await disabledAt(), "Add enabled with a name and no agency").toBe(true);
  await page.fill('[data-clv="addcard"] [data-clv="f-agency"]', "Probe & Co");
  expect(await disabledAt(), "Add still disabled with name and agency filled").toBe(false);

  /* the duplicate: a NAME already on the list blocks Add and offers the way through */
  const existing = await page.evaluate((scope) => {
    for (const r of document.querySelectorAll(`${scope} [data-clv="row"]`)) {
      const el = r as HTMLElement;
      const nm = (el.querySelector(".clv-rwho b")?.textContent ?? "").trim();
      const agy = (el.querySelector(".clv-ragy")?.textContent ?? "").trim();
      if (nm && agy) return { id: el.dataset.agentCard!, name: nm };
    }
    return null;
  }, scope);
  expect(existing, "population first — no named agent on the list").not.toBeNull();
  await page.fill('[data-clv="addcard"] [data-clv="f-name"]', existing!.name);
  await expect(page.locator('[data-clv="dup"]')).toBeVisible();
  expect(await disabledAt(), "a duplicate name did not block Add").toBe(true);
  await page.click('[data-clv="dup-open"]');
  await page.waitForSelector('[data-clv="profile"]');
  const opened = await page.evaluate(() => ({
    add: !!document.querySelector('[data-clv="addcard"]'),
    who: (document.querySelector('[data-clv="profile"]') as HTMLElement).getAttribute("aria-label") ?? "",
  }));
  expect(opened.add, "OPEN CARD left the add card open behind the pop-up").toBe(false);
  expect(opened.who).toContain(existing!.name);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-clv="profile"]', { state: "detached" });

  /* §11.9's identity clause: the focused element is the SAME NODE before and after typing */
  await page.click(`${scope} [data-clv="herocard"]`);
  await page.waitForSelector('[data-clv="addcard"]');
  await page.click('[data-clv="addcard"] [data-clv="f-name"]');
  await page.evaluate(() => { (window as unknown as { __n1: Element | null }).__n1 = document.activeElement; });
  await page.keyboard.type("Abc");
  const sameNode = await page.evaluate(() => (window as unknown as { __n1: Element | null }).__n1 === document.activeElement);
  expect(sameNode, "typing re-rendered the form — the focused element is a different node").toBe(true);
  await page.keyboard.press("Escape");
  bump(8);
});

test("§11.9 the free cap surfaces IN the card — Add refuses, says why, and writes nothing", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const { execSync } = await import("node:child_process");
  /* ⚠️ THE PRECONDITION IS THE PREMISE: this lock exists because the harness account is FREE at
     34 agents, where `addAgent`'s own cap refuses a sixth. A client cannot flip its plan (the
     rules' billing guard — which is also why harnessPlan.mjs can no longer arrange a Pro window),
     so the cap IS this fixture's write path, and the full after-add choreography is proven on
     the lab over known content instead. If the account ever reads Pro, this case must be
     re-thought, not skipped. */
  const plan = /plan: (\w+)/.exec(execSync("node tests/e2e/harnessPlan.mjs", { encoding: "utf8" }))?.[1];
  expect(plan, "the cap lock's premise: a Free account at the cap").toBe("Free");
  await page.click(`${scope} [data-clv="herocard"]`);
  await page.waitForSelector('[data-clv="addcard"]');
  await page.fill('[data-clv="addcard"] [data-clv="f-name"]', "Zz Probe Agent");
  await page.fill('[data-clv="addcard"] [data-clv="f-agency"]', "Probe & Co");
  await page.click('[data-clv="add-save"]');
  /* the refusal lands in the footer's hint, and the card STAYS — a closed card would read as a
     successful add that silently was not */
  await expect(page.locator('[data-clv="add-hint"]')).toContainText("capped at 5");
  expect(await page.locator('[data-clv="addcard"]').count(), "the card closed on a refused add").toBe(1);
  await page.keyboard.press("Escape");
  const out = execSync("node tests/e2e/cleanupProbeAgent.mjs", { encoding: "utf8" });
  expect(out, "a refused add still wrote the agent").toContain("deleted 0 agent");
  bump(5);
});

test("§11.9 after adding (the lab, over known content) — Not yet queried, centred, ringed", async ({ page }) => {
  /* the lab mounts the REAL page over the fixture with a local addAgent, no sign-in, no account
     writes — the choreography (band, scroll, ring) is the page's own; only the writer is local */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/contact-lab");
  await page.waitForSelector('[data-lab-view="cast"]');
  await page.click('[data-lab-view="cast"]');
  const scope = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope} [data-clv="row"]`);
  await page.click(`${scope} [data-clv="herocard"]`);
  await page.waitForSelector('[data-clv="addcard"]');
  await page.fill('[data-clv="addcard"] [data-clv="f-name"]', "Zz Probe Agent");
  await page.fill('[data-clv="addcard"] [data-clv="f-agency"]', "Probe & Co");
  await page.click('[data-clv="add-save"]');
  await page.waitForSelector('[data-clv="addcard"]', { state: "detached" });
  const row = page.locator(`${scope} [data-clv="row"]`, { hasText: "Zz Probe Agent" }).first();
  await expect(row, "the new row never rendered").toBeVisible();
  /* the ring — the class is the lock (the harness kills animations, and reduced motion shows
     the same ring statically; either way the CLASS is what carries it) */
  const ringed = await row.evaluate((el) => el.classList.contains("clv-row--new"));
  expect(ringed, "the new row carries no ring").toBe(true);
  /* the band: the nearest preceding group band names the standing */
  const band = await row.evaluate((el) => {
    let n: Element | null = el;
    while (n) {
      let p = n.previousElementSibling;
      while (p) { if (p.matches('[data-clv="band"]')) return p.textContent ?? ""; p = p.previousElementSibling; }
      n = n.parentElement;
    }
    return "";
  });
  expect(band, "the new agent is not under Not yet queried").toContain("Not yet queried");
  /* in view, centred: poll until two reads agree, then judge the rect */
  let last = -1;
  for (let i = 0; i < 30; i++) {
    const y = await row.evaluate((el) => el.getBoundingClientRect().top);
    if (Math.abs(y - last) < 1) break;
    last = y;
    await page.waitForTimeout(120);
  }
  const rect = await row.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { mid: (r.top + r.bottom) / 2, h: window.innerHeight };
  });
  expect(Math.abs(rect.mid - rect.h / 2), "the new row is not scrolled to the centre").toBeLessThanOrEqual(260);
  bump(5);
});

test("§11.7's third leg — saving a window that crosses today MOVES the row's group, and moves it back", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  /* a with-the-agent row — under the current manuscript scope the live pool is small, and its
     shape moves with the account's weather, so BOTH candidate shapes are accepted: a row whose
     window is UNSTATED (no date line — weeks 1 then dates it in the past, and the restore is a
     CLEAR back to absence), and a row whose stated window still runs (in Nd — weeks 1 pulls it
     past, and the restore is the exact number). Either way the send is older than a week on
     this fixture, so weeks=1 crosses today. */
  const pick = await page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="row"][data-stand="agent"]`)] as HTMLElement[];
    return rows[0]?.dataset.agentCard ?? null;
  }, scope);
  expect(pick, "population first — no with-the-agent row under this scope").not.toBeNull();
  let orig: string | null = null; // null = the forward save never landed; "" = unstated
  try {
    await page.click(`${scope} [data-agent-card="${pick}"]`);
    await page.waitForSelector('[data-clv="profile"]');
    await page.click('[data-clv="edit"]');
    orig = await page.inputValue('[data-clv="f-weeks"]');
    await page.fill('[data-clv="f-weeks"]', "1");
    await page.click('[data-clv="save"]');
    await page.waitForSelector('[data-clv="savedline"]');
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-clv="profile"]', { state: "detached" });
    const moved = await page.evaluate(
      ({ scope, id }) => (document.querySelector(`${scope} [data-agent-card="${id}"]`) as HTMLElement | null)?.dataset.stand ?? "",
      { scope, id: pick! },
    );
    expect(moved, "the save did not move the row to Your move — the group is not reading the engine").toBe("you");
    bump(2);
  } finally {
    if (orig !== null) {
      /* restore the exact original — a stated number, or a CLEAR back to unstated (the field
         is deleted, which P4's write-half already proved round-trips) */
      await page.click(`${scope} [data-agent-card="${pick}"]`);
      await page.waitForSelector('[data-clv="profile"]');
      await page.click('[data-clv="edit"]');
      await page.fill('[data-clv="f-weeks"]', orig);
      /* a store already holding the original (the forward save never wrote) leaves the form
         clean and Save disabled — nothing to restore, and clicking would hang */
      const dirty = await page.evaluate(() => !(document.querySelector('[data-clv="save"]') as HTMLButtonElement).disabled);
      if (dirty) {
        await page.click('[data-clv="save"]');
        await page.waitForSelector('[data-clv="savedline"]');
      }
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.waitForSelector('[data-clv="profile"]', { state: "detached" });
      const back = await page.evaluate(
        ({ scope, id }) => (document.querySelector(`${scope} [data-agent-card="${id}"]`) as HTMLElement | null)?.dataset.stand ?? "",
        { scope, id: pick! },
      );
      expect(back, "THE RESTORE DID NOT LAND — the account's window is changed").toBe("agent");
      bump(1);
    }
  }
});

/* ══════════════════════════ phase 6 — Housekeeping (§9 / §11.2 / §11.8) ══════════════════════════ */

test("the tray's counts line at (20,74) with the bold gap count, and the toggle persists for the session (§11.2)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const r = await page.evaluate((scope) => {
    const tray = document.querySelector(`${scope} [data-clv="tray"]`) as HTMLElement;
    const line = document.querySelector(`${scope} [data-clv="hk-counts"]`) as HTMLElement | null;
    if (!line) return null;
    const t = tray.getBoundingClientRect(), l = line.getBoundingClientRect();
    return {
      left: Math.round(l.left - t.left), top: Math.round(l.top - t.top),
      bold: line.querySelector("b")?.textContent ?? "",
      text: line.textContent ?? "",
      boldWeight: getComputedStyle(line.querySelector("b")!).fontWeight,
    };
  }, scope);
  expect(r, "no counts line in the tray").not.toBeNull();
  expect(r!.left, "the counts line's x inside the tray").toBe(20);
  expect(Math.abs(r!.top - 74), "the counts line's y inside the tray").toBeLessThanOrEqual(1);
  expect(r!.bold).toMatch(/^\d+ GAPS?$/);
  expect(r!.boldWeight).toBe("700");
  expect(r!.text).toMatch(/\d+ AGENTS? · \d+ OF \d+ COMPLETE/);
  /* the seeded stub-0 fixture row carries the inline box on the REAL page, and no live tag */
  const inline = await page.evaluate((scope) => {
    const row = document.querySelector(`${scope} [data-clv="hk-row"][data-agent="clv-fx-stub0"]`) as HTMLElement | null;
    return row ? { hasInline: !!row.querySelector('[data-clv="hk-inline"]'), live: row.dataset.live ?? null } : null;
  }, scope);
  expect(inline, "the seeded stub-0 agent is not in the rail — re-run tests/e2e/seedContactFixture.mjs").not.toBeNull();
  expect(inline!.hasInline, "ruling (c): the stub-0, no-live-query row carries the inline box").toBe(true);
  expect(inline!.live).toBeNull();
  /* the grouping persists for the SESSION: flip to By agent, reload, still By agent */
  await page.click(`${scope} [data-clv="hk-toggle"] button:nth-child(2)`);
  await page.reload();
  await page.waitForSelector('[data-clv="hk-toggle"]');
  const scope2 = await visiblePage(page, ".agl-wpg");
  const pressed = await page.evaluate(
    (s) => (document.querySelector(`${s} [data-clv="hk-toggle"] button:nth-child(2)`) as HTMLElement).getAttribute("aria-pressed"),
    scope2,
  );
  expect(pressed, "the grouping did not survive the reload").toBe("true");
  bump(8);
});

test("§11.8 — the inline reply box is ABSENT for every agent with a live query (the lab, both populations proved)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/contact-lab");
  await page.waitForSelector('[data-lab-view="cast"]');
  await page.click('[data-lab-view="cast"]');
  const scope = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope} [data-clv="hk-row"]`);
  const sweep = await page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="hk-row"]`)] as HTMLElement[];
    return rows.map((r) => ({
      agent: r.dataset.agent, live: !!r.dataset.live,
      inline: !!r.querySelector('[data-clv="hk-inline"]'),
      addForReply: !!r.querySelector('[data-clv="hk-add"]'),
    }));
  }, scope);
  /* populations FIRST, per branch — the cast carries both stub-0 shapes by construction */
  const inlines = sweep.filter((r) => r.inline);
  const liveRows = sweep.filter((r) => r.live);
  expect(inlines.length, "no inline box anywhere — the allowed branch is unexercised").toBeGreaterThan(0);
  expect(liveRows.length, "no live-query row in the rail — the refused branch is unexercised").toBeGreaterThan(0);
  expect(sweep.some((r) => r.agent === "fx-stub0-live" && r.live), "the live stub-0 subject is missing from the rail").toBe(true);
  for (const r of sweep) {
    expect(r.live && r.inline, `${r.agent} has a live query AND the inline box — the reply note would never be seen (ruling c)`).toBe(false);
  }
  bump(3 + sweep.length);
});

test("§11.8 — CHECKED, REMIND ME and the inline save each remove exactly one gap, and the counts drop with them (the lab)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/contact-lab");
  await page.waitForSelector('[data-lab-view="cast"]');
  await page.click('[data-lab-view="cast"]');
  const scope = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope} [data-clv="hk-row"]`);
  const gaps = () => page.evaluate(
    (s) => parseInt((document.querySelector(`${s} [data-clv="hk-counts"] b`) as HTMLElement).textContent ?? "0", 10),
    scope,
  );
  const rowIn = (sec: string, agent: string) => page.evaluate(
    ({ s, sec, agent }) => !!document.querySelector(`${s} [data-clv="hk-sec"][data-gap="${sec}"] [data-clv="hk-row"][data-agent="${agent}"]`),
    { s: scope, sec, agent },
  );

  const n0 = await gaps();
  /* CHECKED stamps today — the stale row leaves the recheck section, nothing else moves */
  expect(await rowIn("recheck", "fx-stale"), "precondition: the stale wishlist is listed").toBe(true);
  await page.click(`${scope} [data-clv="hk-sec"][data-gap="recheck"] [data-agent="fx-stale"] [data-clv="hk-checked"]`);
  await page.waitForFunction(
    ({ s }) => !document.querySelector(`${s} [data-clv="hk-sec"][data-gap="recheck"] [data-agent="fx-stale"]`),
    { s: scope },
  );
  expect(await gaps(), "CHECKED must remove exactly one gap").toBe(n0 - 1);

  /* REMIND ME 1 NOV sets the dated task — the reopen row goes, the counts drop again */
  expect(await rowIn("reopen", "fx-reopen"), "precondition: the dated closed door is listed").toBe(true);
  const label = await page.textContent(`${scope} [data-clv="hk-sec"][data-gap="reopen"] [data-agent="fx-reopen"] [data-clv="hk-remind"]`);
  expect(label, "the button carries the reopen date").toBe("REMIND ME 1 NOV");
  await page.click(`${scope} [data-clv="hk-sec"][data-gap="reopen"] [data-agent="fx-reopen"] [data-clv="hk-remind"]`);
  await page.waitForFunction(
    ({ s }) => !document.querySelector(`${s} [data-clv="hk-sec"][data-gap="reopen"] [data-agent="fx-reopen"]`),
    { s: scope },
  );
  expect(await gaps(), "REMIND ME must remove exactly one gap").toBe(n0 - 2);

  /* the bare REMIND ME (no reopensOn) opens the editor at the door instead — ruling (b) */
  await page.click(`${scope} [data-clv="hk-sec"][data-gap="reopen"] [data-agent="fx-shut"] [data-clv="hk-remind"]`);
  await page.waitForSelector('[data-clv="profile"].clv-pcard--edit');
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-clv="profile"]', { state: "detached" });

  /* the inline save writes the window — the stub row leaves the reply section */
  expect(await rowIn("reply", "fx-stub0"), "precondition: the stub window is listed").toBe(true);
  await page.fill(`${scope} [data-clv="hk-sec"][data-gap="reply"] [data-agent="fx-stub0"] [data-clv="hk-inline"] input`, "8");
  await page.click(`${scope} [data-clv="hk-sec"][data-gap="reply"] [data-agent="fx-stub0"] [data-clv="hk-save"]`);
  await page.waitForFunction(
    ({ s }) => !document.querySelector(`${s} [data-clv="hk-sec"][data-gap="reply"] [data-agent="fx-stub0"]`),
    { s: scope },
  );
  expect(await gaps(), "the inline save must remove exactly one gap").toBe(n0 - 3);
  bump(9);
});
