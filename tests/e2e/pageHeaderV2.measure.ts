/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * pageHeaderV2 — the cases. The probes, the mock reader and the judges are in pageHeaderV2Lib.ts,
 * a plain module: importing a `.measure.ts` executes its `test()` calls in the importer.
 */
import { expect, test } from "@playwright/test";
import { Ledger } from "./shellV3Lib";
import { BAR_ROUTES, SIZES, judgeFull, openApp, readBar, readFull, readMockHeader, readQuick, readTops, switchAndCompare, scrollAndRead } from "./pageHeaderV2Lib";

test.describe.configure({ timeout: Number(process.env.PH_TIMEOUT ?? 600_000) });

/* ── §1 · the bar, on every route ── */
for (const vp of SIZES) {
  test(`§1 · the bar at ${vp.width}`, async ({ page }) => {
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
      L.check("§1 bar · background = the sidebar's", ctx, r.barBg === r.sideBg && !/rgba\([^)]*,\s*0\)$/.test(r.barBg), `bar ${r.barBg} side ${r.sideBg}`);
      L.check("§1 bar · no radius", ctx, r.radii.every((x) => parseFloat(x) === 0), r.radii.join("/"));
      L.check("§1 bar · the sidebar has a 1px right hairline", ctx, r.sideRule, r.sideShadow);
      L.check("§1 bar · toggle at left + 24", ctx, r.toggleL != null && Math.abs(r.toggleL - 24) <= 1, `${r.toggleL}`);
      L.check("§1 bar · Help at right − 24", ctx, r.helpR != null && Math.abs(r.helpR - 24) <= 1, `${r.helpR}`);
      L.check("§1 bar · the page name is visible, one line", ctx, r.nameShown && r.nameLines === 1, `${JSON.stringify(r.eyebrow)} / ${JSON.stringify(r.nameText)} lines ${r.nameLines}`);
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
  /* an outside press on something inert — the bar's page name; a press on the page could open a row */
  await page.locator('[data-shell="pagename"]').click();
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
    if (r) judgeFull(L, r, ctx, mock);
    L.write();
    expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(15);
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
    L.check("§4 · the full header was found", ctx, !!r, JSON.stringify(r));
    if (r) judgeFull(L, r, ctx, mock);
    const counts = await page.evaluate(() => [...document.querySelectorAll('[data-clv="tiles"]')].find((e) => e.getBoundingClientRect().height > 0)?.getBoundingClientRect().top ?? NaN);
    if (r) L.check("§4 · the count cards start at the rule + 24", ctx, Math.abs(counts - (r.rule + 24)) <= 1, `counts ${counts.toFixed(1)} rule ${r.rule.toFixed(1)}`);
    const art = await page.evaluate(() => { const i = [...document.querySelectorAll<HTMLImageElement>('[data-probe="art"] img')].find((e) => e.getBoundingClientRect().height > 0); return i ? [i.currentSrc, i.naturalWidth] : null; });
    L.check("§4 · the art is the hawk alone, cropped at full resolution", ctx, !!art && /contact-hawk\.webp/.test(art[0] as string) && art[1] === 389, JSON.stringify(art));
    L.write();
    expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(mock ? 20 : 17);
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
    for (const k of ["header", "eyebrow", "title"] as const) {
      L.check(`§4.4 · the ${k}'s top is the same on both`, ctx, Number.isFinite(q[k]) && Math.abs(q[k] - c[k]) <= 0.5, `qc ${q[k].toFixed(1)} contact ${c[k].toFixed(1)}`);
      L.check(`§4.4 · the ${k}'s top is the same on Comparable titles`, ctx, Number.isFinite(q[k]) && Math.abs(q[k] - m[k]) <= 0.5, `qc ${q[k].toFixed(1)} comps ${m[k].toFixed(1)}`);
      L.check(`§4.4 · the ${k}'s top is the same on Submission packages`, ctx, Number.isFinite(q[k]) && Math.abs(q[k] - pk[k]) <= 0.5, `qc ${q[k].toFixed(1)} packages ${pk[k].toFixed(1)}`);
    }
    L.check("§4.4 · the Contact list's eyebrow is its sidebar section", ctx, (c.eyebrowText ?? "").replace(/\s+/g, " ").trim().toUpperCase() === "AGENTS / CONTACT LIST", `${c.eyebrowText}`);
    L.check("§4.4 · Submission packages' eyebrow is its sidebar section", ctx, (pk.eyebrowText ?? "").replace(/\s+/g, " ").trim().toUpperCase() === "MATERIALS / SUBMISSION PACKAGES", `${pk.eyebrowText}`);
    L.check("§4.4 · Comparable titles' eyebrow is its sidebar section", ctx, (m.eyebrowText ?? "").replace(/\s+/g, " ").trim().toUpperCase() === "MATERIALS / COMPARABLE TITLES", `${m.eyebrowText}`);
  }
  L.write();
  expect(L.rows.length).toBe(SIZES.length * 12);
  expect(L.failures().map((f) => `${f.lock} · ${f.size} — ${f.detail}`)).toEqual([]);
});

test("§4.5 · the switcher on the Contact list", async ({ page }) => {
  const L = new Ledger("v2-switcher-agents");
  await switchAndCompare(page, L, "/agents");
  L.write();
  expect(L.rows.length).toBeGreaterThanOrEqual(3);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

test("§4.6 · the quick-add card", async ({ page }) => {
  const L = new Ledger("v2-quickadd");
  const ctx = { route: "/agents", size: "1440", state: "quick-add" };
  await openApp(page, "/agents", { width: 1440, height: 900 });
  const add = page.locator('[data-probe="page-header"] .ph-primary').filter({ hasText: "+ Add an agent" }).first();
  const paste = page.locator('[data-probe="page-header"] .ph-secondary').filter({ hasText: "Paste a link" }).first();
  const before = await readQuick(page);
  L.check("§4.6 · closed at rest", ctx, !before.qa, JSON.stringify(before.qa));
  await add.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(150);
  const open = await readQuick(page);
  L.check("§4.6 · + Add an agent opens it", ctx, !!open.qa, "");
  L.check("§4.6 · 340 wide, 10 below the actions, on their left", ctx, !!open.qa && !!open.acts && Math.abs(open.qa.w - 340) <= 0.5 && Math.abs(open.qa.t - (open.acts.b + 10)) <= 1 && Math.abs(open.qa.l - open.acts.l) <= 1,
    JSON.stringify({ qa: open.qa, acts: open.acts }));
  L.check("§4.6 · its header is anthracite and says Add new agent", ctx, open.head?.bg === "rgb(42, 58, 82)" && open.head?.text === "Add new agent", JSON.stringify(open.head));
  L.check("§4.6 · it is painted over the page, not under the count cards", ctx, open.onTop, "");
  L.check("§4.6 · the count cards did not move", ctx, !!before.tiles && !!open.tiles && Math.abs(before.tiles.t - open.tiles.t) <= 0.5, `${before.tiles?.t} → ${open.tiles?.t}`);
  await page.locator('[data-shell="pagename"]').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(150);
  L.check("§4.6 · an outside press closes it", ctx, !(await readQuick(page)).qa, "");
  await add.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(100); await add.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(150);
  L.check("§4.6 · + Add an agent toggles it shut", ctx, !(await readQuick(page)).qa, "");
  await add.click({ timeout: 5000 }).catch(() => {}); await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  L.check("§4.6 · Escape closes it", ctx, !(await readQuick(page)).qa, "");
  await add.click({ timeout: 5000 }).catch(() => {}); await page.locator('[data-clv="quickadd"] .clv-qa-go').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400);
  let q = await readQuick(page);
  L.check("§4.6 · clicking into it opens the add card, name focused", ctx, q.addCard && !q.qa && q.focused === "f-name", JSON.stringify(q));
  await page.locator('[data-clv="addcard"] [data-clv="close"]').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300);
  await add.click({ timeout: 5000 }).catch(() => {}); await page.locator('[data-clv="quickadd"] .clv-qa-ln button').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400);
  q = await readQuick(page);
  L.check("§4.6 · Fill in opens the add card, link focused", ctx, q.addCard && !q.qa && q.focused === "f-link", JSON.stringify(q));
  await page.locator('[data-clv="addcard"] [data-clv="close"]').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300);
  await paste.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400);
  q = await readQuick(page);
  L.check("§4.6 · Paste a link opens the add card, link focused", ctx, q.addCard && q.focused === "f-link", JSON.stringify(q));
  await page.locator('[data-clv="addcard"] [data-clv="close"]').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300);
  L.write();
  expect(L.rows.length).toBe(12);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});
