/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * pageHeaderV2 — the cases. The probes, the mock reader and the judges are in pageHeaderV2Lib.ts,
 * a plain module: importing a `.measure.ts` executes its `test()` calls in the importer.
 */
import { expect, test } from "@playwright/test";
import { Ledger } from "./shellV3Lib";
import { BAR_ROUTES, DRAWN, KEY, MOCK, SIZES, judgeFull, openApp, readBar, readFull, readMockHeader, switchAndCompare, visiblePageText, scrollAndRead } from "./pageHeaderV2Lib";

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

