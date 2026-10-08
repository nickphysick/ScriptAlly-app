/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * pageHeaderV2 — the cases. The probes, the mock reader and the judges are in pageHeaderV2Lib.ts,
 * a plain module: importing a `.measure.ts` executes its `test()` calls in the importer.
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { Ledger } from "./shellV3Lib";

/** An outside press on something inert: the bar's own empty middle, between the toggle and the
 *  switcher. (The page name was the target until the quiet bar made it `pointer-events: none` at
 *  rest; the spacer has no height, so it is never "visible" to a locator.) */
async function pressBarGap(page: Page) {
  const at = await page.evaluate(() => {
    const bar = [...document.querySelectorAll<HTMLElement>('[data-probe="navrow"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    /* RE-POINTED (ink shell v1): the toggle and the switcher left the bar; its spacer is the inert gap */
    const g = bar.querySelector('[data-shell="spacer"]')!.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    return { x: g.left + g.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.click(at.x, at.y);
}
import { BAND_ROUTES, OWN_HEADER_ROUTES, PLATE_ROUTES } from "./plateRoutes";
import { BAR_ROUTES, LIVING_ROUTES, SIZES, judgeFull, openApp, readBar, readFull, readMockHeader, readQuick, readTops, switchAndCompare, scrollAndRead } from "./pageHeaderV2Lib";
import { retired } from "./inkRetired";

test.describe.configure({ timeout: Number(process.env.PH_TIMEOUT ?? 600_000) });

/* ── §1 · the bar, on every route ── */
for (const vp of SIZES) {
  test(`§1 · the bar at ${vp.width}`, async ({ page }) => {
    test.skip(true, retired("page header v2's light bar (page ground, toggle at +24, page name at rest, switcher in the bar)", "INK1, INK5, INK10"));
    const L = new Ledger(`v2-bar-${vp.width}`);
    let scrolledEnough = 0;
    for (const route of BAR_ROUTES) {
      await openApp(page, route, vp);
      const ctx = { route, size: `${vp.width}`, state: "expanded" };
      const r = await readBar(page);
      L.check("§1 bar · found", ctx, !!r, JSON.stringify(r));
      if (!r) continue;
      L.check("§1 bar · box: left = main, right = window, 64 tall", ctx,
        Math.abs(r.barL - r.mainL) <= 0.5 && Math.abs(r.barR - r.winR) <= 0.5 && Math.abs(r.barH - 64) <= 0.5,
        `l ${r.barL}/${r.mainL} r ${r.barR}/${r.winR} h ${r.barH}`);
      /* ⚠️ RETARGETED BY THE QUIET BAR: the bar is the PAGE GROUND now, reversing page header v2's "the
         sidebar's colour" — the claim is still an equality of two computed backgrounds, never a literal */
      L.check("§1 bar · background = the page ground", ctx, r.barBg === r.groundBg && !/rgba\([^)]*,\s*0\)$/.test(r.barBg), `bar ${r.barBg} ground ${r.groundBg}`);
      L.check("§1 bar · no radius", ctx, r.radii.every((x) => parseFloat(x) === 0), r.radii.join("/"));
      L.check("§1 bar · the sidebar has a 1px right hairline", ctx, r.sideRule, r.sideShadow);
      L.check("§1 bar · toggle at left + 24", ctx, r.toggleL != null && Math.abs(r.toggleL - 24) <= 1, `${r.toggleL}`);
      L.check("§1 bar · Help at right − 24", ctx, r.helpR != null && Math.abs(r.helpR - 24) <= 1, `${r.helpR}`);
      /* ⚠️ RETARGETED BY THE QUIET BAR: at rest the name is laid out (one line, so it arrives without
         moving anything) and HIDDEN; its arrival is quietBar.measure.ts Q4. ⚠️ AND BY LIVING HEADERS v3: on
         the six living routes the bar carries the page's crumb from first paint, so there it is SHOWN. */
      if (LIVING_ROUTES.includes(route)) L.check("§1 bar · (living) the crumb is laid out on one line, and shown at rest", ctx, !r.nameHidden && r.nameLines === 1, `${JSON.stringify(r.eyebrow)} / ${JSON.stringify(r.nameText)} lines ${r.nameLines} hidden ${r.nameHidden}`);
      else L.check("§1 bar · the page name is laid out on one line, and hidden at rest", ctx, r.nameHidden && r.nameLines === 1, `${JSON.stringify(r.eyebrow)} / ${JSON.stringify(r.nameText)} lines ${r.nameLines} hidden ${r.nameHidden}`);
      L.check("§1 bar · exactly one visible switcher, none in the sidebar", ctx, r.switchers === 1 && r.inSidebar === 0, `visible ${r.switchers} sidebar ${r.inSidebar}`);
      L.check("§1 bar · no item overlaps another", ctx, r.items >= 5 && r.overlaps.length === 0, `items ${r.items} overlaps ${JSON.stringify(r.overlaps)}`);
      const s = await scrollAndRead(page, 800);
      if (s.scrolled >= 800) scrolledEnough++;
      L.check("§1 bar · its top is unchanged after the page scrolls", ctx, Math.abs(s.after - s.before) <= 0.5, `scrolled ${s.scrolled}: ${s.before} → ${s.after}`);
    }
    L.check("§1 bar · at least one route scrolled the full 800", { route: "*", size: `${vp.width}`, state: "expanded" }, scrolledEnough > 0, `${scrolledEnough} routes`);
    L.write();
    expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(BAR_ROUTES.length * 11);
    expect(L.failures().map((f) => `${f.lock} · ${f.route} — ${f.detail}`)).toEqual([]);
  });
}

test("§4.5 · the switcher", async ({ page }) => {
  const L = new Ledger("v2-switcher");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "switcher" };
  await switchAndCompare(page, L, "/manuscripts/comps");
  await openApp(page, "/manuscripts/comps", { width: 1440, height: 900 });
  const btn = page.locator('[data-shell="switcher"] > button').first();
  const menu = page.locator(".ws-ms-menu");
  await btn.click();
  L.check("§4.5 · a click opens the menu", ctx, await menu.isVisible(), "");
  const n = await page.locator(".ws-ms-it").count();
  L.check("§4.5 · one row per manuscript, and more than one to choose", ctx, n > 1, `${n} rows`);
  /* an outside press on something inert — the bar's spacer (the page name is `pointer-events: none` at rest
     since the quiet bar); a press on the page could open a row */
  await pressBarGap(page);
  await page.waitForTimeout(150);
  L.check("§4.5 · an outside press closes it", ctx, !(await menu.isVisible()), "");
  await btn.click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  L.check("§4.5 · Escape closes it", ctx, !(await menu.isVisible()), "");
  await btn.click();
  await page.locator(".ws-ms-add").click();
  const opened = await page.getByRole("heading", { name: "Add manuscript" }).first().waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
  L.check("§4.5 · + Add a manuscript opens the add flow", ctx, opened, "");
  L.write();
  expect(L.rows.length).toBe(8);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

for (const vp of SIZES) {
  test(`§2 · the Query Centre's full header at ${vp.width}`, async ({ page, browser }) => {
    const L = new Ledger(`v2-full-qc-${vp.width}`);
    const mp = await browser.newPage();
    const mock = vp.width === 1920 ? undefined : await readMockHeader(mp, vp);
    if (mock) L.check("§2 · the mock rendered with its fonts", { route: "mock", size: `${vp.width}`, state: "expanded" }, mock.fonts, JSON.stringify(mock));
    await mp.close();
    await openApp(page, "/queries", vp);
    const r = await readFull(page, '[data-qcv="rail"]');
    const ctx = { route: "/queries", size: `${vp.width}`, state: "expanded" };
    L.check("§2 · the full header was found", ctx, !!r, JSON.stringify(r));
    /* ⚠️ RETARGETED BY THE PLATE (4 Oct): the Query Centre's full header is a plate, so the open
       header's geometry (the 18 below the bar, the 55% text block, art standing on the rule, the rail
       at the rule + 24) is not its geometry — plateHeader.measure.ts PH1–PH4 own it. What stays here is
       that it is the shared header and that it IS a plate. */
    /* ⚠️ RETARGETED BY THE BAND (v126, registered by Contact list v13): the plate is retired and the
       Query Centre's full header is the band, whose geometry is QC126-3's. What stays here is that it
       is the shared header and that it IS the register's band. */
    const plate = PLATE_ROUTES.includes("/queries");
    const band = BAND_ROUTES.includes("/queries");
    if (plate) {
      const isPlate = await page.evaluate(() => !![...document.querySelectorAll('[data-probe="page-header"][data-plate]')].find((e) => e.getBoundingClientRect().height > 0));
      L.check("§2 · (plate) the Query Centre's header is a plate — its geometry is PH1–PH4's", ctx, isPlate, `plate ${isPlate}`);
    } else if (band) {
      const isBand = await page.evaluate(() => !![...document.querySelectorAll('[data-probe="page-header"][data-band]')].find((e) => e.getBoundingClientRect().height > 0));
      L.check("§2 · (band) the Query Centre's header is the band — its geometry is QC126-3's", ctx, isBand, `band ${isBand}`);
    } else if (r) judgeFull(L, r, ctx, mock);
    L.write();
    expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(plate || band ? 2 : 15);
    expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
  });
}


for (const vp of SIZES) {
  test(`§4 · the Contact list's full header at ${vp.width}`, async ({ page, browser }) => {
    const L = new Ledger(`v2-full-agents-${vp.width}`);
    const mp = await browser.newPage();
    const mock = vp.width === 1920 ? undefined : await readMockHeader(mp, vp);
    if (mock) L.check("§2 · the mock rendered with its fonts", { route: "mock", size: `${vp.width}`, state: "expanded" }, mock.fonts, JSON.stringify(mock));
    await mp.close();
    await openApp(page, "/agents", vp);
    const r = await readFull(page, ".clv-rail");
    const ctx = { route: "/agents", size: `${vp.width}`, state: "expanded" };
    /* (the shared full header is looked for only where the page has one — an own-header route has none, by design) */
    if (!OWN_HEADER_ROUTES.includes("/agents")) L.check("§4 · the full header was found", ctx, !!r, JSON.stringify(r));
    /* ⚠️ RETARGETED BY THE BAND (Contact list v13 §2): the Contact list's full header is the band, so
       the open header's geometry (18 below the bar, art standing on the rule, the panel at the rule +
       24) is not its geometry — contactV13 CL13-1 and CL13-2 own it. What stays here is that it is
       the shared header, that it IS the register's band, and that the disc holds the Archivist. */
    const band = BAND_ROUTES.includes("/agents");
    /* ⚠️ RETARGETED BY CONTACT LIST v15 §2: the header is page-local (OWN_HEADER_ROUTES), an open header the shared
       component cannot draw — its geometry is contactV15 CL15-1/CL15-2's. What stays here is that it IS its own
       header and that no shared header renders over the list. */
    const own = OWN_HEADER_ROUTES.includes("/agents");
    if (own) {
      const o = await page.evaluate(() => ({
        own: !![...document.querySelectorAll("[data-own-header]")].find((e) => e.getBoundingClientRect().height > 0),
        shared: [...document.querySelectorAll('[data-probe="page-header"]')].filter((e) => e.getBoundingClientRect().height > 0).length,
      }));
      L.check("§4 · (own) the Contact list's header is its own — its geometry is CL15-1's", ctx, o.own && o.shared === 0, JSON.stringify(o));
    } else if (band) {
      const b = await page.evaluate(() => {
        const hd = [...document.querySelectorAll('[data-probe="page-header"][data-band]')].find((e) => e.getBoundingClientRect().height > 0);
        const img = hd?.querySelector<HTMLImageElement>(".ph-bdisc img") ?? null;
        return { band: !!hd, src: img?.currentSrc ?? null, nat: img?.naturalWidth ?? 0 };
      });
      L.check("§4 · (band) the Contact list's header is the band — its geometry is CL13-1's", ctx, b.band, JSON.stringify(b));
      L.check("§4 · (band) the disc holds the Archivist at native resolution", ctx, /\/images\/contact-archivist\.png/.test(b.src ?? "") && b.nat === 800, JSON.stringify(b));
    } else {
      if (r) judgeFull(L, r, ctx, mock);
      const counts = await page.evaluate(() => [...document.querySelectorAll('[data-clv="idxwrap"]')].find((e) => e.getBoundingClientRect().height > 0)?.getBoundingClientRect().top ?? NaN);
      if (r) L.check("§4 · the index strip starts at the rule + 24", ctx, Math.abs(counts - (r.rule + 24)) <= 1, `strip ${counts.toFixed(1)} rule ${r.rule.toFixed(1)}`);
    }
    L.write();
    expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(own ? (mock ? 2 : 1) : band ? 3 : (mock ? 18 : 17));
    expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
  });
}

/* ── §2 · Comparable titles' full header (comps v2, 27 Sep) — WITHOUT_ART until Nick supplies it ── */
for (const vp of SIZES) {
  test(`§2 · Comparable titles' full header at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`v2-full-comps-${vp.width}`);
    await openApp(page, "/manuscripts/comps", vp);
    const r = await readFull(page, '[data-cpv="rail"]');
    const ctx = { route: "/manuscripts/comps", size: `${vp.width}`, state: "expanded" };
    L.check("§2 · the full header was found", ctx, !!r, JSON.stringify(r));
    /* no mock: this file's mock is the Contact list's header; comps is held to its own mock in
       compsMat.measure.ts */
    if (r) judgeFull(L, r, ctx, undefined, { withArt: false });
    L.write();
    expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
    expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(12);
  });
}

/* ── §2 · Submission packages' full header (packages v2, 27 Sep) — WITH its padded archivist (D8) ── */
for (const vp of SIZES) {
  test(`§2 · Submission packages' full header at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`v2-full-packages-${vp.width}`);
    await openApp(page, "/manuscripts/packages", vp);
    const r = await readFull(page, '[data-ppv="rail"]');
    const ctx = { route: "/manuscripts/packages", size: `${vp.width}`, state: "expanded" };
    L.check("§2 · the full header was found", ctx, !!r, JSON.stringify(r));
    /* the page is held to its own mock in pkgMat.measure.ts */
    if (r) judgeFull(L, r, ctx, undefined, { withArt: true });
    L.write();
    expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
    expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(12);
  });
}

test("§4.4 · the full headers are one header", async ({ page }) => {
  const L = new Ledger("v2-consistency");
  for (const vp of SIZES) {
    await openApp(page, "/queries", vp); const q = await readTops(page);
    await openApp(page, "/agents", vp); const c = await readTops(page);
    await openApp(page, "/manuscripts/comps", vp); const m = await readTops(page);
    await openApp(page, "/manuscripts/packages", vp); const pk = await readTops(page);
    const ctx = { route: "/queries vs /agents vs /manuscripts/comps vs /manuscripts/packages", size: `${vp.width}`, state: "expanded" };
    /* ⚠️ RETARGETED BY LIVING HEADERS v3 (1 Oct): all four full headers are living, so they are ONE header
       again — the header's and the title's tops agree across all four, and none carries an eyebrow (the
       section is the bar's crumb; livingHeadersV3.measure LH5 holds its words). */
    /* ⚠️ RETARGETED BY THE PLATE (4 Oct): the Query Centre's header is a plate 74px below the bar, so
       it no longer opens at the open headers' height by design. The three open headers are held to EACH
       OTHER (the Contact list the anchor), and the Query Centre is held to being the register's plate. */
    /* ⚠️ RETARGETED BY THE BAND (v13): the Query Centre and the Contact list both open on the band, so
       the OPEN headers left are Comparable titles and Submission packages, held to each other; each
       framed route is held to being its register's band or plate. */
    const qcPlate = PLATE_ROUTES.includes("/queries");
    const framed = (route: string) => PLATE_ROUTES.includes(route) || BAND_ROUTES.includes(route) || OWN_HEADER_ROUTES.includes(route);
    const open = ([["the Query Centre", "/queries", q], ["the Contact list", "/agents", c], ["Comparable titles", "/manuscripts/comps", m], ["Submission packages", "/manuscripts/packages", pk]] as [string, string, typeof q][])
      .filter(([, route]) => !framed(route));
    const [anchorName, , anchor] = open[0];
    const others = open.slice(1).map(([nm, , o]) => [nm, o]) as [string, typeof q][];
    for (const k of ["header", "title"] as const) {
      for (const [nm, o] of others) {
        L.check(`§4.4 · the ${k}'s top is ${anchorName}'s on ${nm}`, ctx, Number.isFinite(anchor[k]) && Math.abs(anchor[k] - o[k]) <= 0.5, `${anchorName} ${anchor[k].toFixed(1)} ${nm} ${o[k].toFixed(1)}`);
      }
    }
    if (qcPlate) {
      await openApp(page, "/queries", vp);
      const isPlate = await page.evaluate(() => !![...document.querySelectorAll('[data-probe="page-header"][data-plate]')].find((e) => e.getBoundingClientRect().height > 0));
      L.check("§4.4 · (plate) the Query Centre is exempt because it is the register's plate", ctx, isPlate && PLATE_ROUTES.length === 1, `plate ${isPlate} register ${JSON.stringify(PLATE_ROUTES)}`);
    }
    for (const route of BAND_ROUTES) {
      await openApp(page, route, vp);
      const isBand = await page.evaluate(() => !![...document.querySelectorAll('[data-probe="page-header"][data-band]')].find((e) => e.getBoundingClientRect().height > 0));
      L.check(`§4.4 · (band) ${route} is exempt because it is the register's band`, ctx, isBand, `band ${isBand}`);
    }
    for (const route of OWN_HEADER_ROUTES) {
      await openApp(page, route, vp);
      const isOwn = await page.evaluate(() => !![...document.querySelectorAll("[data-own-header]")].find((e) => e.getBoundingClientRect().height > 0));
      L.check(`§4.4 · (own) ${route} is exempt because its header is the page's own`, ctx, isOwn, `own ${isOwn}`);
    }
    L.check("§4.4 · no full header carries an eyebrow", ctx, [q, c, m, pk].every((x) => !Number.isFinite(x.eyebrow) && !x.eyebrowText), JSON.stringify([q, c, m, pk].map((x) => x.eyebrowText)));
  }
  L.write();
  /* 7 per size since living headers v3: header and title against the Query Centre on three pages, and the
     one no-eyebrow row — an exact count, not a floor */
  /* with the Query Centre a plate (4 Oct): the header and title tops of the two other open headers against
     the Contact list (4), the no-eyebrow row, and the plate row — 6 per size; 7 without a plate */
  /* v13: per size, 2 × (open headers − 1) tops, the no-eyebrow row, a plate row if any, and one row per
     band route — counted from the registers, so a register change cannot leave this stale */
  /* framed among THESE four only: a band route that is not one of them (Analytics v17) adds its own band
     row through the loop above and takes no open header away */
  const FOUR = ["/queries", "/agents", "/manuscripts/comps", "/manuscripts/packages"];
  const openN = FOUR.filter((r) => !PLATE_ROUTES.includes(r) && !BAND_ROUTES.includes(r) && !OWN_HEADER_ROUTES.includes(r)).length;
  expect(L.rows.length).toBe(SIZES.length * (2 * (openN - 1) + 1 + (PLATE_ROUTES.includes("/queries") ? 1 : 0) + BAND_ROUTES.length + OWN_HEADER_ROUTES.length));
  expect(L.failures().map((f) => `${f.lock} · ${f.size} — ${f.detail}`)).toEqual([]);
});

test("§4.5 · the switcher on the Contact list", async ({ page }) => {
  const L = new Ledger("v2-switcher-agents");
  await switchAndCompare(page, L, "/agents");
  L.write();
  expect(L.rows.length).toBeGreaterThanOrEqual(3);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

test("§4.6 · the add door (v12 P1: the quick-add drop and the paste pill are retired)", async ({ page }) => {
  /* ⚠️ RETARGETED 3 Oct (Contact list v12, go-ahead ask 2). The 340px quick-add card and the
     "Paste a link" secondary were page header v2's; v12's hero opens the CENTRED add card
     directly from the anthracite pill, and the link door lives inside that card. The old
     twelve-row ledger described a mechanism that no longer exists; what survives of its law —
     one add behaviour, name-focused, nothing dropped over the page — is asserted here. */
  const L = new Ledger("v2-quickadd");
  const ctx = { route: "/agents", size: "1440", state: "add-door" };
  await openApp(page, "/agents", { width: 1440, height: 900 });
  /* v15 §2: the Contact list's header is its own (OWN_HEADER_ROUTES) — its buttons are `[data-cl15]` */
  const add = page.locator('[data-cl15="add"]').filter({ visible: true }).first();
  L.check("§4.6 · no quick-add card exists at rest", ctx, (await page.locator('[data-clv="quickadd"]').count()) === 0, "");
  /* ⚠️ read the VISIBLE header's pill — every page stays mounted, and `.first()` answers for a
     hidden page's copy (the house hidden-copy law; the old row survived it only via hasText) */
  const secondaryText = await page.evaluate(() => {
    const hd = [...document.querySelectorAll('[data-cl15="header"]')].find((e) => e.getBoundingClientRect().height > 0);
    return hd?.querySelector('[data-cl15="discover"]')?.textContent ?? "";
  });
  L.check("§4.6 · no Paste-a-link pill — the secondary is Discover", ctx, secondaryText.includes("Discover agents"), secondaryText);
  await add.click({ timeout: 5000 }).catch(() => {});
  /* (Agent card v1 P3: the add card is the agent card's editor, opened empty, name focused) */
  await page.waitForSelector('[data-ac="card"] [data-ae-mode="new"]', { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-ae") === "name", undefined, { timeout: 3000 }).catch(() => {});
  const q = await page.evaluate(() => ({
    addCard: !!document.querySelector('[data-ac="card"] [data-ae-mode="new"]'),
    quick: !!document.querySelector('[data-clv="quickadd"]'),
    focused: (document.activeElement as HTMLElement | null)?.getAttribute("data-ae") ?? "",
  }));
  L.check("§4.6 · + Add an agent opens the centred card directly, name focused", ctx, q.addCard && q.focused === "name", JSON.stringify(q));
  L.check("§4.6 · and drops no quick-add on the way", ctx, !q.quick, "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  L.check("§4.6 · Escape closes the card", ctx, (await page.locator('[data-ac="card"]').count()) === 0, "");
  L.write();
  expect(L.rows.length).toBe(5);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});
