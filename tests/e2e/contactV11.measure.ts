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
import { harnessDb } from "./harnessDocs";
import { collection, deleteField, doc, getDoc, getDocs, query as fsQuery, updateDoc, where } from "firebase/firestore";

let asserts = 0;
let ran = 0;
const bump = (n = 1) => { asserts += n; };
/** The add card's door since v12 P1 (3 Oct): "+ Add an agent" opens the centred card DIRECTLY —
 * the quick-add drop and the Paste-a-link pill are retired (the go-ahead's ask 2). */
const openAddCard = async (page: import("@playwright/test").Page, scope: string) => {
  await page.click(`${scope} [data-probe="page-header"] .ph-primary`);
};

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
        /* ⚠️ RETARGETED (page header v2 §4): the column's CONTENT top — its box starts at the shared
           header's rule and its first 24px are the gap below it, which the rail takes as a margin */
        railTop: Math.round(rr.top), mainTop: Math.round(mr.top + parseFloat(getComputedStyle(main as HTMLElement).paddingTop)),
      };
    }, scope);

    expect(g, "the centred group is not on the page").not.toBeNull();
    bump();
    if (!g) return;
    expect(g.railW, "the rail's track is not 340px").toBe(340);
    expect(g.gapPx, "the gap between the column and the rail").toBe(28);
    expect(g.groupW, "the group overran the 1480 measure").toBeLessThanOrEqual(1480);
    /* the rail starts level with the page column's content — both at the shared header's rule + 24 */
    expect(Math.abs(g.railTop - g.mainTop), "the rail does not start level with the column's content").toBeLessThanOrEqual(1);
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

/* ⚠️ RETIRED BY PAGE HEADER v2 §4, each by name: `heroRead`, "the hero, side by side at 1440 / 1920
   — card clear of the text, art on the column's edge, the peek kept", and "the hero stacks at 1280 —
   one-line title beside the sentence, the cards above the list, the same edge rules". Their subject
   — the v11 hero, the blank card placed inside the Archivist's drawing by `heroLayout` — is deleted;
   the page opens with the shared full header, measured in pageHeaderV2.measure.ts §4. The one claim
   that outlives it, that the three count cards sit as a row between the header and the list, is
   restated below. */

/* ⚠️ RETIRED BY v12 P2–P3 (3 Oct), each by name: "the count cards at 1280/1440: a row of three
   below the header's rule, above the list" and "the count cards filter — populations proved
   non-zero first, OR on multi-select, dim on the rest". Their subject — the CountCards row and
   its pool narrowing (cardSel, matchesCards, the OR) — left the LIST with the card index: the
   first thing below the rule is the A–Z strip (§10.2, and pageHeaderV2 §4's retargeted row),
   and the strip SCROLLS rather than filters, so there is no pool behaviour to restate.
   `CountCards` survives only in the empty state's exhibit, on a fixture, until P5. */

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
        label: b.querySelector("b")?.textContent, n: b.querySelector("small")?.textContent ?? null,
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
  /* v12 P2 (3 Oct): the page opens on the card index — the first divider is a LETTER tab and
     its <small> states the section's population ("2 agents"), where the v11 standing band led
     with "Your move". */
  expect(r.bands[0]?.label ?? "", "the default grouping's first band is a letter").toMatch(/^[A-Z]$/);
  expect(r.bands[0]?.n ?? "", "the divider's count small").toMatch(/^\d+ agents?$/);
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
  /* the fifth target was the retired hero's card; the shared header's title stands in (v2 §4) */
  for (const sel of ["h2", '[data-clv="band"]', '[data-clv="row"]', '[data-clv="tray"]', '[data-probe="page-header"] [data-probe="title"]'] as const) {
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
  /* v12 P2 (3 Oct): the count cards are gone — Find is the cheapest chip-raiser left */
  await page.fill(`${scope} [data-clv="find"] input`, "an");
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

/* ⚠️ RETIRED BY v12 P3 (3 Oct), by name: "narrow rows at 1280 — two lines, the fit beneath its
   hairline". Its subject — the v11 two-deck fold (three tracks, the fit row under its hairline)
   — is retired by the dossier re-cut: the mock's m4 keeps ONE row of four columns on tighter
   floors at the narrow container, measured in §10.5's 1280 leg. */

/* v12 P2 (3 Oct): the dividers no longer pin at the scroller's top — they pin BELOW the index
   strip, and the claim is measured as two boxes meeting (the band's top IS the pinned strip
   wrapper's bottom), never a restated constant. */
test("the bands stick BELOW the pinned index strip with the page-coloured shadow", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const r = await page.evaluate(async (scope) => {
    const scroller = document.querySelector(`${scope} .wpg-scroll`) as HTMLElement;
    const wrap = document.querySelector(`${scope} [data-clv="idxwrap"]`) as HTMLElement | null;
    const bands = [...document.querySelectorAll(`${scope} [data-clv="band"]`)] as HTMLElement[];
    if (!wrap || bands.length < 2) return null;
    const second = bands[1];
    /* scroll until the SECOND band's group is in play, then the FIRST should be gone and the
       second pinned flush under the strip's own wrapper */
    scroller.scrollTop = second.offsetTop + 80;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const st = scroller.getBoundingClientRect().top;
    const w = wrap.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    return {
      stripPinned: Math.abs(w.top - st) <= 2,
      pinned: Math.abs(b.top - w.bottom) <= 2,
      sticky: getComputedStyle(second).position === "sticky",
      detail: `strip ${w.top.toFixed(1)}–${w.bottom.toFixed(1)} band ${b.top.toFixed(1)} scroller ${st.toFixed(1)}`,
    };
  }, scope);
  expect(r, "no strip or fewer than two bands — the pinned claim is unreachable").not.toBeNull();
  expect(r!.sticky).toBe(true);
  expect(r!.stripPinned, `the strip wrapper does not pin at the scroller's top — ${r!.detail}`).toBe(true);
  expect(r!.pinned, `the band does not pin flush under the strip — ${r!.detail}`).toBe(true);
  bump(4);
});

/* ══════════════════════════ phase 4 — the agent pop-up (§11.6 / §11.7) ══════════════════════════ */

/* ⚠️ REWRITTEN AGAINST THE AGENT CARD (Agent card v1 P3, 5 Oct). The pop-up and its edit face are
   deleted; the agent card is the only agent editor, so these cases keep their v11 laws and drive the
   card's editor (`data-ae`). The old "520 wide, and the picker wears the portal dress" case RETIRES:
   the editor's width and height are agentCardV1.measure.ts's (by the mock's ruler), and the country
   is quick picks plus a searchable list on `:root` tokens, so there is no portal dress left to wear.
   Recorded in tests/e2e/RETIRED-agent-card-v1.md. */

const ED = '[data-ac="card"] [data-ae-mode="edit"]';
const ADD = '[data-ac="card"] [data-ae-mode="new"]';
const weeksText = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (document.querySelector('[data-ae="weeks"] b')?.textContent ?? "").trim());
const toWork = async (page: import("@playwright/test").Page) => {
  await page.click('[data-ac="card"] [data-ae="tabs"] [data-tab="work"]');
  await page.waitForSelector('[data-ac="card"] [data-sec="work"].on');
};

test("Escape and the backdrop return a CLEAN editor to the quick view, ask on a dirty one, and never discard in silence (§11.6)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.click(`${scope} [data-clv="row"]`);
  await page.waitForSelector('[data-ac="card"]');
  await page.click('[data-ac="card"] [data-ac="edit"]');
  await page.waitForSelector(ED);
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-ac="card"] [data-ac="head"]'), "the first Escape did not return a clean editor to the quick view").toBeVisible();
  expect(await page.locator(ED).count(), "the first Escape left the editor open").toBe(0);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });

  /* the backdrop: a clean editor goes back to the view; a dirty one ASKS and keeps the draft */
  await page.click(`${scope} [data-clv="row"]`);
  await page.waitForSelector('[data-ac="card"]');
  await page.click('[data-ac="card"] [data-ac="edit"]');
  await page.waitForSelector(ED);
  await page.mouse.click(30, 450); // well outside the centred card
  await expect(page.locator('[data-ac="card"] [data-ac="head"]'), "the backdrop did not return a clean editor to the view").toBeVisible();
  await page.click('[data-ac="card"] [data-ac="edit"]');
  await page.waitForSelector(ED);
  await page.fill('[data-ac="card"] [data-ae="name"]', "Zz draft only");
  await page.mouse.click(30, 450);
  await expect(page.locator('[data-ac="card"] [data-ae="ask"]'), "the backdrop discarded a dirty draft").toBeVisible();
  expect(await page.inputValue('[data-ac="card"] [data-ae="name"]'), "the draft went with the backdrop click").toBe("Zz draft only");
  await page.click('[data-ac="card"] [data-ae="discard"]');
  await page.waitForSelector('[data-ac="card"] [data-ac="head"]');
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  bump(6);
});

test("§11.7 — the reply-time note is live as the draft changes, names the engine's dates, and Discard writes nothing", async ({ page }) => {
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
    await page.waitForSelector('[data-ac="card"]');
    await page.click('[data-ac="card"] [data-ac="edit"]');
    await page.waitForSelector(ED);
    await toWork(page);
    const orig = await weeksText(page);
    /* + from Unknown goes to 6, from a window it adds a week; at 26 the minus takes one */
    const plus = page.locator('[data-ac="card"] [data-ae="weeks"] [data-d="1"]');
    if (await plus.isEnabled()) await plus.click();
    else await page.click('[data-ac="card"] [data-ae="weeks"] [data-d="-1"]');
    const note = await page.evaluate(() => ({
      also: (document.querySelector('[data-ae="also-work"]') as HTMLElement | null)?.textContent ?? "",
      sum: (document.querySelector('[data-ae="sum"]') as HTMLElement | null)?.textContent ?? "",
    }));
    generic = note.also;
    summary = note.sum;
    if (/Query Centre and Birds-eye view:.*→/.test(note.also)) {
      perQuery = note.also; before = orig; touchedId = id;
      break;
    }
    await page.click('[data-ac="card"] [data-ae="cancel"]');
    await page.click('[data-ac="card"] [data-ae="discard"]');
    await page.waitForSelector('[data-ac="card"] [data-ac="head"]');
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  }
  expect(generic, "the reply note never appeared at all").toContain("To-do list and Dashboard");
  expect(generic).toContain("Analytics");
  expect(summary, "the foot does not count what else moves").toMatch(/also changes \d+ things? elsewhere/);
  expect(perQuery, "no candidate produced a per-query engine line — the dry run is not reaching the queries").toContain("reply expected");
  /* the engine's from → to, en-GB — and "no date" is one of its honest answers (an agency with
     no stated window has no expected date until one is set), so either side may say it, and at
     least one side must be a real date or the line said nothing */
  expect(perQuery).toMatch(/(\d{1,2} [A-Z][a-z]{2}|no date) → (\d{1,2} [A-Z][a-z]{2}|no date)/);
  expect(perQuery).toMatch(/\d{1,2} [A-Z][a-z]{2}/);
  /* Discard writes NOTHING: reopen and the stored value is the original */
  await page.click('[data-ac="card"] [data-ae="cancel"]');
  await page.click('[data-ac="card"] [data-ae="discard"]');
  await page.waitForSelector('[data-ac="card"] [data-ac="head"]');
  await page.click('[data-ac="card"] [data-ac="edit"]');
  await page.waitForSelector(ED);
  await toWork(page);
  const after = await weeksText(page);
  expect(after, `Discard wrote a draft value to ${touchedId} — the account has been changed`).toBe(before);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"] [data-ac="head"]');
  await page.keyboard.press("Escape");
  bump(7);
});

test("§11.7 write half — save says what else moved, and the fixture agent is restored in the same run", async ({ page }) => {
  const ID = "clv-fx-never";
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const fx = `${scope} [data-agent-card="${ID}"]`;
  expect(await page.locator(fx).count(), "the fixture agent is not on this account — run tests/e2e/seedContactFixture.mjs").toBe(1);
  const { db, uid } = await harnessDb();
  const ref = doc(db, "users", uid, "agents", ID);
  expect("responseTimeWeeks" in ((await getDoc(ref)).data() ?? {}), "precondition: the fixture's reply time is deliberately absent (ruling c)").toBe(false);
  try {
    await page.click(fx);
    await page.waitForSelector('[data-ac="card"]');
    await page.click('[data-ac="card"] [data-ac="edit"]');
    await page.waitForSelector(ED);
    await toWork(page);
    expect(await weeksText(page)).toBe("Unknown");
    await page.click('[data-ac="card"] [data-ae="weeks"] [data-d="1"]');
    expect(await weeksText(page), "the first + goes to 6").toBe("6 weeks");
    await page.click('[data-ac="card"] [data-ae="save"]');
    /* the save returns the card to its quick view — wait for THAT, then read its foot */
    await page.waitForSelector('[data-ac="card"] [data-ac="head"]', { timeout: 15_000 });
    await page.waitForSelector('[data-ac="card"] [data-ac="foot"].on');
    /* ⚠️ THE ACCOUNT IS NOW CHANGED — the restore is in `finally` */
    const saved = await page.textContent('[data-ac="card"] [data-ac="foot"]');
    expect(saved, "the saved line is missing — the write may have failed with the account half-changed").toContain("Saved.");
    /* (Agent card v1 P4: the v11 line listed surfaces; the card's — the mock's — counts the expected
       dates the dry run moved, and this fixture is never queried, so it moves none and says so) */
    expect(saved, "the saved line claimed a date moved on an agent with no query").not.toContain("expected-reply date");
    expect(await page.textContent('[data-ac="card"] [data-ac="where"]'), "the view does not show the saved window").toContain("Replies in about 6 weeks");
    expect((await getDoc(ref)).data()?.responseTimeWeeks, "the window did not reach the store").toBe(6);
    await page.keyboard.press("Escape");
    bump(6);
  } finally {
    /* ⚠️ THE CARD HAS NO ROAD BACK TO UNKNOWN (decision 9), so the restore is the store's: the field
       DELETED, not zeroed — absence is the fixture (clv-fx-never is never queried, so no deadline
       moved with it) */
    await updateDoc(ref, { responseTimeWeeks: deleteField() });
    expect("responseTimeWeeks" in ((await getDoc(ref)).data() ?? {}), "THE FIXTURE WAS NOT RESTORED — clv-fx-never now carries a reply window it must not have").toBe(false);
    bump(1);
  }
});

/* ══════════════════════════ phase 5 — the add card (§8 / §11.9) ══════════════════════════ */

/* ⚠️ REWRITTEN AGAINST THE AGENT CARD (P3): the add card is the card's editor opened empty. The v11
   law "a name AND an agency" is the card's "a name OR an agency" (§5 — and the rules have always
   accepted either), so the disabled-until clause is rewritten, not weakened: a record with neither
   still cannot be added. */
test("the add card (§11.9): a name OR an agency, the duplicate blocks with its way through, typing keeps the node", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await openAddCard(page, scope);
  await page.waitForSelector(ADD);
  const disabledAt = async () => page.evaluate(() => (document.querySelector('[data-ae="save"]') as HTMLButtonElement).disabled);
  expect(await disabledAt(), "Add enabled on an empty form").toBe(true);
  await page.fill(`${ADD} [data-ae="name"]`, "Zz Probe Agent");
  expect(await disabledAt(), "a name alone must be enough").toBe(false);

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
  await page.fill(`${ADD} [data-ae="name"]`, existing!.name);
  await expect(page.locator('[data-ac="card"] [data-ae="dup"]')).toBeVisible();
  expect(await disabledAt(), "a duplicate name did not block Add").toBe(true);
  await page.click('[data-ac="card"] [data-ae="dup-open"]');
  await page.waitForSelector('[data-ac="card"] #ac-name');
  const opened = await page.evaluate(() => ({
    add: !!document.querySelector('[data-ae-mode="new"]'),
    who: (document.querySelector('[data-ac="card"] #ac-name') as HTMLElement | null)?.textContent ?? "",
  }));
  expect(opened.add, "Open them instead left the add card open behind the card").toBe(false);
  expect(opened.who).toContain(existing!.name);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });

  /* §11.9's identity clause: the focused element is the SAME NODE before and after typing */
  await openAddCard(page, scope);
  await page.waitForSelector(ADD);
  await page.click(`${ADD} [data-ae="name"]`);
  await page.evaluate(() => { (window as unknown as { __n1: Element | null }).__n1 = document.activeElement; });
  await page.keyboard.type("Abc");
  const sameNode = await page.evaluate(() => (window as unknown as { __n1: Element | null }).__n1 === document.activeElement);
  expect(sameNode, "typing re-rendered the form — the focused element is a different node").toBe(true);
  /* the card is dirty now: Escape asks, and Discard closes it having written nothing */
  await page.keyboard.press("Escape");
  await page.click('[data-ac="card"] [data-ae="discard"]');
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
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
  await openAddCard(page, scope);
  await page.waitForSelector(ADD);
  await page.fill(`${ADD} [data-ae="name"]`, "Zz Probe Agent");
  await page.fill(`${ADD} [data-ae="agency"]`, "Probe & Co");
  await page.keyboard.press("Tab");
  await page.click('[data-ac="card"] [data-ae="save"]');
  /* the refusal lands in the foot, and the card STAYS — a closed card would read as a successful
     add that silently was not */
  await expect(page.locator('[data-ac="card"] [data-ae="sum-bad"]')).toContainText("capped at 5");
  expect(await page.locator(ADD).count(), "the card closed on a refused add").toBe(1);
  await page.click('[data-ac="card"] [data-ae="cancel"]');
  await page.click('[data-ac="card"] [data-ae="discard"]');
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  const out = execSync("node tests/e2e/cleanupProbeAgent.mjs", { encoding: "utf8" });
  expect(out, "a refused add still wrote the agent").toContain("deleted 0 agent");
  bump(5);
});

test("§11.9 after adding (the lab, over known content) — under its letter, centred, ringed", async ({ page }) => {
  /* the lab mounts the REAL page over the fixture with a local addAgent, no sign-in, no account
     writes — the choreography (band, scroll, ring) is the page's own; only the writer is local */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/contact-lab");
  await page.waitForSelector('[data-lab-view="cast"]');
  await page.click('[data-lab-view="cast"]');
  const scope = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope} [data-clv="row"]`);
  await openAddCard(page, scope);
  await page.waitForSelector(ADD);
  await page.fill(`${ADD} [data-ae="name"]`, "Zz Probe Agent");
  await page.fill(`${ADD} [data-ae="agency"]`, "Probe & Co");
  await page.keyboard.press("Tab");
  await page.click('[data-ac="card"] [data-ae="save"]');
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  const row = page.locator(`${scope} [data-clv="row"]`, { hasText: "Zz Probe Agent" }).first();
  await expect(row, "the new row never rendered").toBeVisible();
  /* the ring — the class is the lock (the harness kills animations, and reduced motion shows
     the same ring statically; either way the CLASS is what carries it) */
  const ringed = await row.evaluate((el) => el.classList.contains("clv-row--new"));
  expect(ringed, "the new row carries no ring").toBe(true);
  /* v12 P2 (3 Oct): the page opens on the card index, so the nearest preceding divider names
     the agent's SURNAME INITIAL — "Zz Probe Agent"'s surname is "Agent", the A divider. */
  const band = await row.evaluate((el) => {
    let n: Element | null = el;
    while (n) {
      let p = n.previousElementSibling;
      while (p) { if (p.matches('[data-clv="band"]')) return p.getAttribute("data-letter") ?? ""; p = p.previousElementSibling; }
      n = n.parentElement;
    }
    return "";
  });
  expect(band, "the new agent is not under its surname's letter").toBe("A");
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
  /* a with-the-agent row whose send is older than a week on this fixture, so a one-week window
     crosses today and the row moves to Your move */
  const pick = await page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="row"][data-stand="agent"]`)] as HTMLElement[];
    return rows[0]?.dataset.agentCard ?? null;
  }, scope);
  expect(pick, "population first — no with-the-agent row under this scope").not.toBeNull();
  if (!pick) return;
  /* ⚠️ SNAPSHOT EVERYTHING THE SAVE CAN TOUCH, before it runs: the agent's window, and the
     deadline the fan-out rewrites on each of its queries (computeAgentDeadlineWrites) */
  const { db, uid } = await harnessDb();
  const aRef = doc(db, "users", uid, "agents", pick);
  const agentBefore = (await getDoc(aRef)).data() ?? {};
  const qBefore = (await getDocs(fsQuery(collection(db, "users", uid, "queries"), where("agentId", "==", pick)))).docs
    .map((d) => ({ ref: d.ref, data: d.data() }));
  let wrote = false;
  try {
    await page.click(`${scope} [data-agent-card="${pick}"]`);
    await page.waitForSelector('[data-ac="card"]');
    await page.click('[data-ac="card"] [data-ac="edit"]');
    await page.waitForSelector(ED);
    await toWork(page);
    /* to ONE week: from Unknown the first + is 6, then the minus walks down */
    if ((await weeksText(page)) === "Unknown") await page.click('[data-ac="card"] [data-ae="weeks"] [data-d="1"]');
    for (let i = 0; i < 30; i++) {
      const minus = page.locator('[data-ac="card"] [data-ae="weeks"] [data-d="-1"]');
      if (await minus.isDisabled()) break;
      await minus.click();
    }
    expect(await weeksText(page)).toBe("1 week");
    wrote = true;
    await page.click('[data-ac="card"] [data-ae="save"]');
    await page.waitForSelector('[data-ac="card"] [data-ac="head"]', { timeout: 15_000 });
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-ac="card"]', { state: "detached" });
    const moved = await page.evaluate(
      ({ scope, id }) => (document.querySelector(`${scope} [data-agent-card="${id}"]`) as HTMLElement | null)?.dataset.stand ?? "",
      { scope, id: pick },
    );
    expect(moved, "the save did not move the row to Your move — the group is not reading the engine").toBe("you");
    bump(2);
  } finally {
    if (wrote) {
      /* ⚠️ RESTORED THROUGH THE STORE: the card has no road back to Unknown (decision 9), and the
         save fanned new deadlines out to this agent's queries — every one goes back as it was */
      await updateDoc(aRef, { responseTimeWeeks: "responseTimeWeeks" in agentBefore ? agentBefore.responseTimeWeeks : deleteField() });
      for (const q of qBefore) {
        await updateDoc(q.ref, { responseDeadline: "responseDeadline" in q.data ? q.data.responseDeadline : deleteField() });
      }
      await expect.poll(() => page.evaluate(
        ({ scope, id }) => (document.querySelector(`${scope} [data-agent-card="${id}"]`) as HTMLElement | null)?.dataset.stand ?? "",
        { scope, id: pick },
      ), { message: "THE RESTORE DID NOT LAND — the account's window is changed", timeout: 15_000 }).toBe("agent");
      const now = (await getDoc(aRef)).data() ?? {};
      expect(JSON.stringify(now.responseTimeWeeks ?? null), "THE AGENT'S WINDOW WAS NOT RESTORED").toBe(JSON.stringify(agentBefore.responseTimeWeeks ?? null));
      bump(2);
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
  /* (P3: the card's editor, on the Submissions tab, the door focused) */
  await page.waitForSelector('[data-ac="card"] [data-ae-mode="edit"] [data-sec="work"].on');
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest("[data-ae]")?.getAttribute("data-ae")), { message: "the bare REMIND ME did not land at the door" }).toBe("door");
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"] [data-ac="head"]'); // leaving a clean editor lands on the card's quick view
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });

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

/* ═════════════ Query actions v1 follow-through — the log doors open the drawer IN PLACE ═════════════ */

test("Log query opens the query drawer on this page — no navigation, the agent carried (both doors)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  /* door 1: the row's mini on a never-queried, open-door agent */
  const row = page.locator(`${scope} [data-clv="row"]`, { has: page.locator('[data-clv="mini-log"]') }).first();
  const who = (await row.locator(".clv-rwho b").textContent())?.trim() ?? "";
  expect(who.length, "population first — no row offers Log query").toBeGreaterThan(0);
  await row.locator('[data-clv="mini-log"]').click();
  /* the drawer ROOT is a boxless wrapper — wait for ATTACHMENT; the content assertions carry visibility */
  await page.waitForSelector("[data-qad-root].is-open", { state: "attached" });
  const after = await page.evaluate(() => ({
    path: window.location.pathname,
    drawer: (document.querySelector("[data-qad-root]") as HTMLElement).textContent ?? "",
  }));
  expect(after.path, "the log door NAVIGATED — the drawer must open in place (query actions v1: every page finishes in the drawer)").toBe("/agents");
  expect(after.drawer, "the agent did not carry into the drawer").toContain(who);
  /* the drawer's own dismissal layers (Escape steps back one; ✕ raises the discard bar) are its
     suite's business — nothing is committed here, so a reload is the honest reset between doors */
  await page.reload();
  /* the reload rebuilt the DOM, so visiblePage's tag went with it — let the app come back
     through its splash, then re-derive the scope */
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".agl-wpg")].some((e) => e.getBoundingClientRect().height > 0));
  const scope2 = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope2} [data-clv="row"]`);
  /* door 2: the agent card's Log a query — the card yields to the drawer (one asking surface at a
     time). Retargeted (Agent card v1 P5): it no longer CLOSES, it DOCKS — mounted, so it comes back
     where it was, but stepped aside: out of reach and out of sight (lock 7 holds the rest) */
  await page.click(`${scope2} [data-clv="row"][data-stand="none"][data-door="open"]`);
  await page.waitForSelector('[data-ac="card"]');
  await page.click('[data-ac="card"] [data-ac="primary"][data-act="log"]');
  await page.waitForSelector("[data-qad-root].is-open", { state: "attached" });
  expect(await page.evaluate(() => window.location.pathname)).toBe("/agents");
  await expect(page.locator('[data-ac="overlay"].is-docked'), "the card stayed up behind the drawer — two asking surfaces at once").toHaveCount(1, { timeout: 5_000 });
  await expect(page.locator('[data-ac="card"]'), "a docked card is still on screen").toBeHidden();
  bump(5);
});


/* ══════════════════════════ v12 P1 — the hero (§10.1), the pills, and the quick-add's absence ══════════════════════════ */

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }] as const) {
  test(`v12 §10.1 — the hero at ${vp.width}: the QC's height, the painting on the column's edge, never over the text`, async ({ page }) => {
    await openRoute(page, "/queries", vp);
    const qcH = await page.evaluate(() => {
      const h = [...document.querySelectorAll(".ph--full")].find((e) => e.getBoundingClientRect().height > 0);
      return h ? h.getBoundingClientRect().height : null;
    });
    expect(qcH, "no QC full header to compare against").not.toBeNull();
    await openRoute(page, "/agents", vp);
    const scope = await visiblePage(page, ".agl-wpg");
    const r = await page.evaluate((scope) => {
      const hd = [...document.querySelectorAll(`${scope} .ph--full`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      if (!hd) return null;
      const img = hd.querySelector<HTMLImageElement>(".ph-art img");
      const title = hd.querySelector('[data-probe="title"]');
      const sub = hd.querySelector('[data-probe="intro"]');
      const group = document.querySelector(`${scope} .clv-group`) as HTMLElement;
      const ir = img?.getBoundingClientRect(); const ar = img?.closest(".ph-art")?.getBoundingClientRect();
      const tr = title?.getBoundingClientRect(); const sr = sub?.getBoundingClientRect();
      const overlaps = (a?: DOMRect, b?: DOMRect) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      return {
        h: hd.getBoundingClientRect().height,
        src: img?.currentSrc ?? "", nat: img?.naturalWidth ?? 0,
        boxRight: ar?.right ?? NaN, colRight: group.getBoundingClientRect().right,
        overTitle: overlaps(ir, tr as DOMRect), overSub: overlaps(ir, sr as DOMRect),
        primary: hd.querySelector(".ph-primary")?.textContent?.trim() ?? "",
        secondary: hd.querySelector(".ph-secondary")?.textContent?.trim() ?? "",
      };
    }, scope);
    expect(r, "no full header on /agents").not.toBeNull();
    expect(Math.abs(r!.h - (qcH as number)), `hero height ${r!.h} against the QC's ${qcH}`).toBeLessThanOrEqual(4);
    expect(r!.src, "the art is not the full painting").toContain("contact-list-hero-archivist-full");
    expect(r!.nat, "the painting's natural width").toBe(1141);
    expect(Math.abs(r!.boxRight - r!.colRight), "the art box's right edge is not the column's").toBeLessThanOrEqual(1.5);
    expect(r!.overTitle, "the art passed behind the title").toBe(false);
    expect(r!.overSub, "the art passed behind the subline").toBe(false);
    expect(r!.primary).toContain("+ Add an agent");
    expect(r!.secondary, "the secondary pill is Discover (the paste pill is retired)").toContain("Discover agents");
    bump(8);
  });
}

test("v12 P1 — + Add an agent opens the centred card directly; no quick-add exists; Discover navigates", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.click(`${scope} [data-probe="page-header"] .ph-primary`);
  /* (P3: the add card is the agent card's editor, opened empty) */
  await page.waitForSelector('[data-ac="card"] [data-ae-mode="new"]');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("data-ae") ?? ""),
    { message: "the card opens name-focused" }).toBe("name");
  expect(await page.locator('[data-clv="quickadd"]').count(), "the quick-add drop came back").toBe(0);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  await page.click(`${scope} [data-probe="page-header"] .ph-secondary`);
  await page.waitForURL(/\/agents\/discover/);
  bump(3);
});

/* ══════════════════════════ v12 P2 — the index strip (§10.2) and the re-dressed head (§10.3) ══════════════════════════ */

test("v12 §10.2 — 27 cells; every cell's count IS its section's rows; a click lands the divider 8px under the strip, marked", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope} [data-clv="idx"]`);

  /* ── the census: strip cells against the dividers against the rows — three derivations of one
     partition, compared to each other, never to literals. Per-branch population asserted: a run
     with no lettered cells, or no letterless ones, proves nothing about the split. ── */
  const census = await page.evaluate((scope) => {
    const cells = [...document.querySelectorAll(`${scope} [data-clv="ixtab"]`)] as HTMLElement[];
    const all = document.querySelector(`${scope} [data-clv="ixall"]`) as HTMLElement | null;
    const bands = [...document.querySelectorAll(`${scope} [data-clv="band"]`)] as HTMLElement[];
    const perBand = bands.map((b) => {
      let n = 0;
      for (let el = b.nextElementSibling; el && !el.matches('[data-clv="band"]'); el = el.nextElementSibling) {
        if (el.matches("[data-agent-card]")) n += 1;
      }
      /* v12 P3: the divider's <i> became the RULE; the count is the <small>'s leading number */
      return { letter: b.dataset.letter ?? "", band: parseInt(b.querySelector("small")?.textContent ?? "", 10), rows: n };
    });
    const perCell = cells.map((c) => ({
      letter: c.dataset.letter ?? "",
      has: c.classList.contains("has"),
      disabled: (c as HTMLButtonElement).disabled,
      n: Number(c.querySelector("i")?.textContent ?? "0"),
    }));
    const rowCount = document.querySelectorAll(`${scope} [data-agent-card]`).length;
    return { cells: perCell, bands: perBand, allText: (all?.textContent ?? "").trim(), rowCount };
  }, scope);

  expect(census.cells.length, "26 letter cells").toBe(26);
  expect(census.allText).toBe(`All · ${census.rowCount}`);
  const lettered = census.cells.filter((c) => c.has);
  const bare = census.cells.filter((c) => !c.has);
  expect(lettered.length, "per-branch population: some cells carry agents").toBeGreaterThan(2);
  expect(bare.length, "per-branch population: some cells are empty").toBeGreaterThan(2);
  for (const c of bare) expect(c.disabled, `the bare ${c.letter} cell is inert`).toBe(true);
  /* cell count == divider count == rows under the divider, letter by letter */
  expect(census.bands.map((b) => b.letter)).toEqual(lettered.map((c) => c.letter));
  for (const b of census.bands) {
    const cell = lettered.find((c) => c.letter === b.letter)!;
    expect(cell?.n, `the ${b.letter} cell's count is its divider's`).toBe(b.band);
    expect(b.rows, `the ${b.letter} divider's count is its rows`).toBe(b.band);
  }
  /* the cells' sum is the tally's shown count */
  expect(lettered.reduce((s, c) => s + c.n, 0)).toBe(census.rowCount);
  bump(8 + bare.length + census.bands.length * 2);

  /* ── the click: pick a late letter; the divider lands 8px under the pinned strip and the cell
     marks in the bands' own ink. ⚠️ THE SETTLE MUST SEE THE SCROLL *LEAVE* FIRST: a smooth
     scroll has a startup standstill, and "three equal scrollTop reads" is satisfied by a scroll
     that has not begun — measured, gap 526.5 with the cell un-marked, a reading taken mid-
     flight. So: departed from the starting value, THEN three stable reads. ── */
  /* ⚠️ THE TARGET IS THE SECOND DIVIDER, NOT THE LAST: the landing position is 96px below the
     scrollport's top, and the LAST band has too little content beneath it to get there — the
     scroller hits its end and the band rests mid-viewport (measured: gap 526.5 on a correct
     page). The second divider has every later group below it, so it can always land. */
  const target = census.bands[1].letter;
  const startTop = await page.evaluate((scope) => (document.querySelector(`${scope} .wpg-scroll`) as HTMLElement).scrollTop, scope);
  await page.click(`${scope} [data-clv="ixtab"][data-letter="${target}"]`);
  await page.waitForFunction(([scope, startTop]) => {
    const sc = document.querySelector(`${scope} .wpg-scroll`) as HTMLElement;
    const w = window as unknown as { __clvLast?: number; __clvHold?: number };
    if (sc.scrollTop === startTop) { w.__clvHold = 0; w.__clvLast = sc.scrollTop; return false; }
    const same = w.__clvLast === sc.scrollTop;
    w.__clvHold = same ? (w.__clvHold ?? 0) + 1 : 0;
    w.__clvLast = sc.scrollTop;
    return same && (w.__clvHold ?? 0) >= 3;
  }, [scope, startTop] as const, { timeout: 10000 });
  const landed = await page.evaluate(([scope, target]) => {
    const wrap = document.querySelector(`${scope} [data-clv="idxwrap"]`) as HTMLElement;
    const band = document.querySelector(`${scope} [data-clv="band"][data-letter="${target}"]`) as HTMLElement;
    const cell = document.querySelector(`${scope} [data-clv="ixtab"][data-letter="${target}"]`) as HTMLElement;
    /* v12 P3: the divider is ground-coloured now, so the marked cell's ink anchors on the row
       DISCS — another reader of the same --clv-btn, never a literal */
    const disc = document.querySelector(`${scope} .clv-ini`) as HTMLElement;
    const discBg = getComputedStyle(disc).backgroundColor;
    const cellBg = getComputedStyle(cell).backgroundColor;
    return {
      gap: band.getBoundingClientRect().top - wrap.getBoundingClientRect().bottom,
      marked: cell.classList.contains("on"),
      inkMatch: cellBg === discBg,
      detail: `gap ${(band.getBoundingClientRect().top - wrap.getBoundingClientRect().bottom).toFixed(1)} cell ${cellBg} disc ${discBg}`,
    };
  }, [scope, target] as const);
  expect(Math.abs(landed.gap - 8), `the divider lands 8px under the strip — ${landed.detail}`).toBeLessThanOrEqual(2);
  expect(landed.marked, "the picked cell is marked").toBe(true);
  expect(landed.inkMatch, `the marked cell wears the discs' own ink — ${landed.detail}`).toBe(true);

  /* ── All clears the mark and returns to the top of the list. The SAME settle as the landing:
     the derivation re-marks letters PASSING the strip mid-scroll (by design — it is a scroll-spy),
     so the mark is only judged once the scroll has departed and come to rest, plus one rAF pair
     for the derivation's final read to land in state. ── */
  const landedTop = await page.evaluate((scope) => (document.querySelector(`${scope} .wpg-scroll`) as HTMLElement).scrollTop, scope);
  await page.evaluate(() => { const w = window as unknown as { __clvLast?: number; __clvHold?: number }; delete w.__clvLast; delete w.__clvHold; });
  await page.click(`${scope} [data-clv="ixall"]`);
  await page.waitForFunction(([scope, from]) => {
    const sc = document.querySelector(`${scope} .wpg-scroll`) as HTMLElement;
    const w = window as unknown as { __clvLast?: number; __clvHold?: number };
    if (sc.scrollTop === from) { w.__clvHold = 0; w.__clvLast = sc.scrollTop; return false; }
    const same = w.__clvLast === sc.scrollTop;
    w.__clvHold = same ? (w.__clvHold ?? 0) + 1 : 0;
    w.__clvLast = sc.scrollTop;
    return same && (w.__clvHold ?? 0) >= 3;
  }, [scope, landedTop] as const, { timeout: 10000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const cleared = await page.evaluate((scope) => ({
    marked: !!document.querySelector(`${scope} [data-clv="ixtab"].on`),
  }), scope);
  expect(cleared.marked, "All clears the marked cell").toBe(false);
  bump(4);
});

test("v12 §10.3 — the head: dashed-underlined title, a quiet un-underlined tally, and the controls drop under as a piece", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope} [data-clv="ctl"]`);
  const head = await page.evaluate((scope) => {
    const ttl = document.querySelector(`${scope} [data-clv="ctl"] .clv-ttlu`) as HTMLElement | null;
    const em = document.querySelector(`${scope} [data-clv="tally"]`) as HTMLElement | null;
    const group = document.querySelector(`${scope} [data-clv="btn-group"]`) as HTMLElement | null;
    if (!ttl || !em || !group) return null;
    const ts = getComputedStyle(ttl); const es = getComputedStyle(em);
    return {
      ttlUnderline: `${ts.borderBottomStyle} ${ts.borderBottomWidth}`,
      emUnderline: es.borderBottomStyle,
      emFont: es.fontFamily,
      emSize: es.fontSize,
      groupValue: (group.querySelector("i")?.textContent ?? "").trim(),
      h2Size: getComputedStyle(ttl.closest("h2") as HTMLElement).fontSize,
    };
  }, scope);
  expect(head, "the head's three parts render").not.toBeNull();
  expect(head!.ttlUnderline, "the title carries the dashed underline").toBe("dashed 1px");
  expect(head!.emUnderline, "the tally carries NO underline (§10.3)").toBe("none");
  expect(head!.emFont, "the tally is serif").toContain("Source Serif 4");
  expect(head!.emSize).toBe("15px");
  expect(head!.h2Size, "the title steps to the mock's 25").toBe("25px");
  expect(head!.groupValue, "the Group chip states its value").toBe("letter");
  bump(7);

  /* at the narrow column the controls drop UNDER the title as one piece — never over it. The
     geometric claim is overlap-freedom plus which side of the title's baseline the group sits;
     whether 1280 wraps is REPORTED (it depends on the column, not the viewport). */
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(250);
  const narrow = await page.evaluate((scope) => {
    const h2 = document.querySelector(`${scope} [data-clv="ctl"] h2`) as HTMLElement;
    const grp = document.querySelector(`${scope} [data-clv="ctlg"]`) as HTMLElement;
    const a = h2.getBoundingClientRect(); const b = grp.getBoundingClientRect();
    const overlap = a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
    return { overlap, wrapped: b.top >= a.bottom - 1, h2: `${a.left.toFixed(0)},${a.top.toFixed(0)}–${a.right.toFixed(0)},${a.bottom.toFixed(0)}`, grp: `${b.left.toFixed(0)},${b.top.toFixed(0)}–${b.right.toFixed(0)},${b.bottom.toFixed(0)}` };
  }, scope);
  // eslint-disable-next-line no-console
  console.log(`[v12 §10.3] 1280: wrapped=${narrow.wrapped} h2 ${narrow.h2} ctlg ${narrow.grp}`);
  expect(narrow.overlap, `the controls never overlap the title — h2 ${narrow.h2} ctlg ${narrow.grp}`).toBe(false);
  bump(2);
});

/* ══════════════════════════ v12 P3 — the dividers (§10.4) and the dossier rows (§10.5) ══════════════════════════ */

test("v12 §10.4 — the divider: a slate tab SITTING on the rule, the count right, on the ground", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const r = await page.evaluate((scope) => {
    const bands = [...document.querySelectorAll(`${scope} [data-clv="band"][data-letter]`)] as HTMLElement[];
    const main = document.querySelector(`${scope} .clv-main`) as HTMLElement;
    const tokens = getComputedStyle(main);
    /* resolve the two slate tokens where they apply, never a literal on both sides */
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;background:${tokens.getPropertyValue("--clv-slate-pale")};color:${tokens.getPropertyValue("--clv-slate-ink")}`;
    main.appendChild(probe);
    const slatePale = getComputedStyle(probe).backgroundColor;
    const slateInk = getComputedStyle(probe).color;
    probe.remove();
    const read = bands.map((band) => {
      const b = band.querySelector("b") as HTMLElement;
      const i = band.querySelector("i") as HTMLElement;
      const small = band.querySelector("small") as HTMLElement;
      const bb = b.getBoundingClientRect(); const ib = i.getBoundingClientRect();
      const sb = small.getBoundingClientRect(); const db = band.getBoundingClientRect();
      const bs = getComputedStyle(b);
      return {
        tabBg: bs.backgroundColor, tabInk: bs.color, tabRadius: bs.borderRadius,
        dip: Math.round((bb.bottom - db.bottom) * 10) / 10,
        ruleH: ib.height, ruleSpans: ib.left > bb.right && ib.right < sb.left,
        countRight: Math.abs(sb.right - db.right) <= 1,
        count: (small.textContent ?? "").trim(),
      };
    });
    return { slatePale, slateInk, read };
  }, scope);
  expect(r.read.length, "population first").toBeGreaterThan(2);
  /* ⚠️ THE TOKEN ITSELF IS A PRECONDITION: an undeclared --clv-slate-pale resolves the probe to
     transparent, and a transparent tab then MATCHES it — two nothings agreeing (found 3 Oct:
     mutation F stayed green because the family was declared nowhere). */
  expect(r.slatePale, "--clv-slate-pale resolves to a colour").not.toBe("rgba(0, 0, 0, 0)");
  expect(r.slateInk, "--clv-slate-ink resolves to a colour").not.toBe("rgba(0, 0, 0, 0)");
  for (const d of r.read) {
    expect(d.tabBg, "the tab wears the slate family's pale").toBe(r.slatePale);
    expect(d.tabInk, "the tab's letter is slate ink").toBe(r.slateInk);
    expect(d.tabRadius, "top corners only — a TAB, not a pill").toBe("7px 7px 0px 0px");
    expect(d.dip, "the tab dips 7px to SIT on the rule").toBe(7);
    expect(d.ruleH, "the rule is a hairline").toBeLessThanOrEqual(1.5);
    expect(d.ruleSpans, "the rule runs from the tab to the count").toBe(true);
    expect(d.countRight, "the count sits on the divider's right edge").toBe(true);
    expect(d.count).toMatch(/^\d+ agents?$/);
  }
  bump(1 + r.read.length * 7);
});

test("v12 §10.5 — the dossier row: four tracks, the 3px strip (ink when past), one italic line, the clamped wishlist", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const read = (w: number) => page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="row"]`)] as HTMLElement[];
    const main = document.querySelector(`${scope} .clv-main`) as HTMLElement;
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;background:${getComputedStyle(main).getPropertyValue("--clv-slate-pale")}`;
    main.appendChild(probe);
    const slatePale = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const inkProbe = document.createElement("div");
    inkProbe.style.cssText = "position:absolute;visibility:hidden;background:var(--clv-ink)";
    main.appendChild(inkProbe);
    const ink = getComputedStyle(inkProbe).backgroundColor;
    inkProbe.remove();
    const strips = rows.map((row) => ({
      late: row.classList.contains("clv-row--late"),
      h: parseFloat(getComputedStyle(row, "::before").height),
      bg: getComputedStyle(row, "::before").backgroundColor,
    }));
    const first = rows[0];
    const cols = getComputedStyle(first).gridTemplateColumns.split(" ");
    const q = first.querySelector(".clv-rq") as HTMLElement;
    const pace = document.querySelectorAll(`${scope} .clv-rloc`).length;
    const italics = [...document.querySelectorAll(`${scope} .clv-ragy`)].map((e) => getComputedStyle(e).fontStyle);
    const minH = Math.min(...rows.map((x) => x.getBoundingClientRect().height));
    return {
      n: rows.length, cols, firstCol: parseFloat(cols[0] ?? "0"),
      qRight: Math.round((first.getBoundingClientRect().right - 18 - q.getBoundingClientRect().right) * 10) / 10,
      strips, slatePale, ink, pace, italics, minH,
      wishes: [...document.querySelectorAll(`${scope} .clv-rwish`)].length,
      tornWish: document.querySelectorAll(`${scope} [data-clv="torn-wish"]`).length,
    };
  }, scope);

  const r = await read(1440);
  expect(r.n, "population first").toBeGreaterThan(10);
  expect(r.slatePale, "--clv-slate-pale resolves to a colour (the two-nothings guard)").not.toBe("rgba(0, 0, 0, 0)");
  expect(r.cols.length, "four tracks at 1440").toBe(4);
  expect(r.firstCol, "the disc track").toBe(30);
  expect(Math.abs(r.qRight), "the query column ends on the row's padding edge").toBeLessThanOrEqual(1);
  expect(r.pace, "the v11 paceBits line is retired").toBe(0);
  expect(r.italics.length, "population: the one italic who line renders").toBeGreaterThan(5);
  for (const f of r.italics) expect(f).toBe("italic");
  /* the 3px strip, BOTH branches entered (the monoculture law) */
  const late = r.strips.filter((s) => s.late);
  const calm = r.strips.filter((s) => !s.late);
  expect(late.length, "per-branch population: some rows are past their date").toBeGreaterThan(0);
  expect(calm.length, "per-branch population: some rows are not").toBeGreaterThan(0);
  for (const sRow of r.strips) {
    expect(sRow.h, "the strip is 3px").toBe(3);
    expect(sRow.bg, sRow.late ? "a past row's strip is INK" : "a calm row's strip is the slate pale").toBe(sRow.late ? r.ink : r.slatePale);
  }
  expect(r.wishes + r.tornWish, "every row carries a wishlist or its torn slip").toBe(r.n);
  bump(10 + r.strips.length * 2 + r.italics.length);

  /* the clamp, under STRESS (the house law: growth must push, never overflow) — inject a long
     wishlist and the box holds at two lines with the clamp visibly engaged */
  const clamp = await page.evaluate((scope) => {
    const w = document.querySelector(`${scope} .clv-rwish`) as HTMLElement | null;
    if (!w) return null;
    w.textContent = "Dark academia with a conscience, locked-room mysteries on moving vehicles, sisters who ruin each other politely, climate grief with jokes, heists where the real theft is emotional, and any book whose narrator lies to the reader for a structurally good reason.";
    const cs = getComputedStyle(w);
    const twoLines = 2 * parseFloat(cs.lineHeight);
    return { h: w.getBoundingClientRect().height, twoLines, clipped: w.scrollHeight > w.clientHeight + 1 };
  }, scope);
  expect(clamp, "no wishlist on the account to stress").not.toBeNull();
  expect(clamp!.h, `the wish holds at two lines (${clamp!.h} vs ${clamp!.twoLines})`).toBeLessThanOrEqual(clamp!.twoLines + 2);
  expect(clamp!.clipped, "the clamp visibly engaged on the injected text").toBe(true);
  bump(3);

  /* 1280: the same four columns on the narrow floors, 86px rows */
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(250);
  const nr = await read(1280);
  expect(nr.cols.length, "still four tracks at 1280 — the v11 two-deck fold is retired").toBe(4);
  expect(nr.firstCol).toBe(30);
  expect(nr.minH, "the narrow row floors at 86").toBeGreaterThanOrEqual(85.5);
  bump(3);
});

/* ══════════════════════════ v12 P4 — Housekeeping's head in the slate (§10.6) ══════════════════════════ */

test("v12 §10.6 — the slate tray: typewriter title, serif counts, the clipped peek, the mock's toggle", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope} [data-clv="tray"]`);
  const r = await page.evaluate((scope) => {
    const tray = document.querySelector(`${scope} [data-clv="tray"]`) as HTMLElement;
    const main = document.querySelector(`${scope} .clv-main`) as HTMLElement;
    const title = tray.querySelector(".clv-tray-t") as HTMLElement;
    const counts = tray.querySelector('[data-clv="hk-counts"]') as HTMLElement;
    const peek = tray.querySelector(".clv-peek") as HTMLElement;
    const tgl = document.querySelector(`${scope} [data-clv="hk-toggle"]`) as HTMLElement;
    const on = tgl?.querySelector('button[aria-pressed="true"]') as HTMLElement | null;
    const groupChip = document.querySelector(`${scope} [data-clv="btn-group"]`) as HTMLElement;
    /* every expected value resolved from the page's own tokens — never a literal here */
    const probe = document.createElement("i");
    probe.style.cssText = `position:absolute;visibility:hidden;background:${getComputedStyle(main).getPropertyValue("--clv-slate-tray")};font-family:var(--clv-serif)`;
    main.appendChild(probe);
    const slateTray = getComputedStyle(probe).backgroundColor;
    const serif = getComputedStyle(probe).fontFamily;
    probe.remove();
    const typeFirst = getComputedStyle(main).getPropertyValue("--sp-type").split(",")[0].trim().replace(/^"|"$/g, "");
    const trayBox = tray.getBoundingClientRect();
    const peekBox = peek?.getBoundingClientRect();
    return {
      slateTray,
      trayBg: getComputedStyle(tray).backgroundColor,
      trayClips: getComputedStyle(tray).overflow,
      titleFace: getComputedStyle(title).fontFamily,
      typeFirst,
      titleSize: getComputedStyle(title).fontSize,
      countsFace: getComputedStyle(counts).fontFamily,
      serif,
      countsUpper: getComputedStyle(counts).textTransform,
      countsB: counts.querySelector("b") ? getComputedStyle(counts.querySelector("b") as HTMLElement).fontWeight : null,
      peekPast: peekBox ? Math.round((peekBox.right - trayBox.right) * 10) / 10 : null,
      tglW: tgl ? tgl.getBoundingClientRect().width : null,
      tglH: tgl ? tgl.getBoundingClientRect().height : null,
      tglBg: tgl ? getComputedStyle(tgl).backgroundColor : null,
      chipBg: getComputedStyle(groupChip).backgroundColor,
      onBg: on ? getComputedStyle(on).backgroundColor : null,
      onRing: on ? getComputedStyle(on).boxShadow : null,
    };
  }, scope);
  expect(r.slateTray, "--clv-slate-tray resolves (the two-nothings guard)").not.toBe("rgba(0, 0, 0, 0)");
  expect(r.trayBg, "the tray wears the accent family's tray").toBe(r.slateTray);
  expect(r.trayClips, "the tray clips its peek").toBe("hidden");
  expect(r.titleFace, `the title PAINTS in the typewriter (brand.tsx forces headings) — ${r.titleFace}`).toContain(r.typeFirst);
  expect(r.titleSize).toBe("26px");
  expect(r.countsFace, "the counts line is serif").toBe(r.serif);
  expect(r.countsUpper).toBe("uppercase");
  expect(r.countsB, "the figures are bold").toBe("700");
  expect(r.peekPast, "the peek's box runs past the tray's edge — the clip is engaged").not.toBeNull();
  expect(r.peekPast!).toBeGreaterThan(2);
  expect(Math.abs((r.tglW ?? 0) - 306), "the toggle is the mock's 306 wide").toBeLessThanOrEqual(1);
  expect(r.tglH!, "…and ~37 tall").toBeGreaterThanOrEqual(35);
  expect(r.tglH!).toBeLessThanOrEqual(39);
  expect(r.tglBg, "the toggle sits on the head chips' own parchment — two readers, one dress").toBe(r.chipBg);
  expect(r.onBg, "the active segment is white").toBe("rgb(255, 255, 255)");
  expect(r.onRing, "…held by an inset ring").toContain("inset");
  bump(15);
});

/* ══════════════════════════ v12 P5 — the empty state: the ways, the banner, the previews (§10.7) ══════════════════════════ */

test("v12 §10.7 — the three ways in, the anthracite banner, and the two live previews", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  /* the harness account has agents — the LH review aid holds the COUNT at 0, the page's own
     empty branch does the rest (the same door LH7/LH8 use) */
  await page.evaluate(() => {
    (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = 0;
    window.dispatchEvent(new Event("sa:lh-count"));
  });
  await page.waitForSelector(`${scope} [data-clv="ways"]`);

  const r = await page.evaluate((scope) => {
    const grp = document.querySelector(`${scope} .clv-group`) as HTMLElement;
    const probe = document.createElement("i");
    probe.style.cssText = "position:absolute;visibility:hidden;background:var(--clv-btn);border-color:var(--clv-slate-tray)";
    grp.appendChild(probe);
    const btn = getComputedStyle(probe).backgroundColor;
    const slateTray = getComputedStyle(probe).borderColor;
    probe.remove();
    const typeFirst = getComputedStyle(grp).getPropertyValue("--sp-type").split(",")[0].trim().replace(/^"|"$/g, "");
    const ways = [...document.querySelectorAll(`${scope} [data-clv="ways"] .cd`)] as HTMLElement[];
    const pri = ways[0];
    const tpl = document.querySelector(`${scope} [data-clv="way-template"]`) as HTMLAnchorElement | null;
    const ban = document.querySelector(`${scope} [data-clv="eban"]`) as HTMLElement;
    const banBox = ban.getBoundingClientRect();
    const vis = document.querySelector(`${scope} [data-clv="vis"]`) as HTMLElement;
    const pics = [...vis.querySelectorAll(".clv-pic")] as HTMLElement[];
    const pv1 = vis.querySelector(".clv-pv1") as HTMLElement;
    const band = document.querySelector(`${scope} [data-lh="band"]`) as HTMLElement;
    return {
      btn, slateTray, typeFirst,
      n: ways.length,
      icoBg: ways.map((w) => getComputedStyle(w.querySelector(".clv-ico") as HTMLElement).backgroundColor),
      icoSize: (pri.querySelector(".clv-ico") as HTMLElement).getBoundingClientRect().width,
      priGo: getComputedStyle(pri.querySelector(".clv-cdgo") as HTMLElement).backgroundColor,
      otherGo: getComputedStyle(ways[1].querySelector(".clv-cdgo") as HTMLElement).backgroundColor,
      priIsImport: pri.getAttribute("data-clv") === "way-import",
      tplDownload: tpl ? tpl.hasAttribute("download") && (tpl.getAttribute("href") ?? "").endsWith(".xlsx") : false,
      h3Face: getComputedStyle(pri.querySelector("h3") as HTMLElement).fontFamily,
      banBg: getComputedStyle(ban).backgroundColor,
      banFace: getComputedStyle(ban.querySelector("h2") as HTMLElement).fontFamily,
      banCentred: getComputedStyle(ban).textAlign,
      banBox: { w: Math.round(banBox.width), h: Math.round(banBox.height) },
      banInBand: !!band && band.contains(ban),
      visCols: getComputedStyle(vis).gridTemplateColumns.split(" ").length,
      picH: pics.map((p) => Math.round(p.getBoundingClientRect().height)),
      masked: pics.map((p) => (getComputedStyle(p).maskImage ?? "none") !== "none" || ((getComputedStyle(p) as unknown as { webkitMaskImage?: string }).webkitMaskImage ?? "none") !== "none"),
      pvZoom: pv1 ? String((getComputedStyle(pv1) as unknown as { zoom?: string }).zoom ?? "") : "",
      pvRows: pv1 ? pv1.querySelectorAll('[data-clv="row"]').length : 0,
      pvDividers: pv1 ? pv1.querySelectorAll('[data-clv="band"]').length : 0,
      pvQVisible: pv1 ? [...pv1.querySelectorAll(".clv-rq")].filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).length : -1,
      pvWho: band ? band.querySelectorAll(".clv-rwho").length : 0,
      railInPv: !!vis.querySelector(".clv-pv2 .clv-tray"),
    };
  }, scope);

  expect(r.btn, "--clv-btn resolves (the two-nothings guard)").not.toBe("rgba(0, 0, 0, 0)");
  expect(r.n, "three ways in").toBe(3);
  expect(r.priIsImport, "Smart Import leads, recommended").toBe(true);
  expect(r.icoSize, "the 44px icon circle").toBe(44);
  for (const bg of r.icoBg) expect(bg, "the icon circles sit on the accent tray").toBe(r.slateTray);
  expect(r.priGo, "the recommended tile's pill is the ink").toBe(r.btn);
  expect(r.otherGo, "the other pills stay white").toBe("rgb(255, 255, 255)");
  expect(r.tplDownload, "the template tile is a real download of the xlsx").toBe(true);
  expect(r.h3Face, "the tile heading PAINTS machine (brand.tsx forces headings)").toContain(r.typeFirst);
  expect(r.banBg, "the banner is the ink").toBe(r.btn);
  expect(r.banFace, "the banner heading PAINTS machine").toContain(r.typeFirst);
  expect(r.banCentred).toBe("center");
  expect(r.banInBand, "the banner rides INSIDE the exhibition band (LH8's on-screen claim)").toBe(true);
  expect(r.banBox.h, `the banner's band (oracle 188 at its width; ours ${JSON.stringify(r.banBox)})`).toBeGreaterThanOrEqual(150);
  expect(r.banBox.h).toBeLessThanOrEqual(220);
  expect(r.visCols, "two features side by side").toBe(2);
  for (const h of r.picH) expect(h, "each preview window is the mock's 320").toBe(320);
  for (const m of r.masked) expect(m, "the preview's foot dissolves by mask").toBe(true);
  expect(r.pvZoom, "the previews render at the mock's .82").toBe("0.82");
  expect(r.pvRows, "the card-index preview renders real rows").toBeGreaterThanOrEqual(3);
  expect(r.pvDividers, "…under real letter dividers").toBeGreaterThanOrEqual(1);
  expect(r.pvQVisible, "the query column is HIDDEN in the preview").toBe(0);
  expect(r.pvWho, "the band feeds LH8 at least one .clv-rwho").toBeGreaterThanOrEqual(1);
  expect(r.railInPv, "the second feature is the rail, live").toBe(true);
  bump(21 + r.icoBg.length + r.picH.length + r.masked.length);

  /* the doors: Add opens the centred card (Escape closes); the import tile navigates — last */
  await page.click(`${scope} [data-clv="way-add"]`);
  await page.waitForSelector('[data-ac="card"] [data-ae-mode="new"]'); // (P3: the agent card's editor, empty)
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  await page.click(`${scope} [data-clv="way-import"]`);
  await page.waitForURL(/\/import/);
  bump(2);
});
