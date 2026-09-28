/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * quietBar — Q1–Q9 of the quiet-bar brief (ref design-refs/shell/quiet-bar-v1.html). Rendered, fonts
 * loaded, at 1280 and 1440, on every workspace route. Ledgers land in reports/app-shell-v3/.
 */
import { expect, test } from "@playwright/test";
import { Ledger } from "./shellV3Lib";
import { BAR_ROUTES, openApp } from "./pageHeaderV2Lib";
import { liftMotionSuppression } from "./measure";
import { readBar, scrollTo, suppressMotion, tagScroller, titleGoneAt, transparent } from "./quietBarLib";

test.describe.configure({ timeout: Number(process.env.QB_TIMEOUT ?? 900_000) });
const SIZES = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }] as const;
const near = (a: number, b: number, t: number) => Number.isFinite(a) && Math.abs(a - b) <= t;

for (const vp of SIZES) {
  test(`Q1–Q5, Q7 · the quiet bar on every route at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`qb-bar-${vp.width}`);
    const tally = { titled: 0, untitled: 0, fixedTitle: 0, still: 0 };
    for (const route of BAR_ROUTES) {
      await openApp(page, route, vp);
      await page.evaluate(() => document.fonts.ready);
      await suppressMotion(page);
      const ctx = { route, size: `${vp.width}`, state: "rest" };
      const sc = await tagScroller(page);
      if (sc) await scrollTo(page, 0);
      const rest = await readBar(page);
      L.check("Q1 · the bar was found", ctx, !!rest, "");
      if (!rest) continue;
      L.check("Q1 · at rest the bar's ground is the page's", ctx, rest.barBg === rest.groundBg && !transparent(rest.barBg), `bar ${rest.barBg} ground ${rest.groundBg}`);
      L.check("Q2 · at rest no hairline and no shadow", ctx, rest.shadow === "none" && rest.hairline === 0, `shadow ${rest.shadow} hairline ${rest.hairline}`);
      L.check("Q2 · at rest the name is hidden and aria-hidden", ctx, !!rest.name && rest.name.opacity === 0 && rest.name.ariaHidden === "true" && rest.name.pe === "none", JSON.stringify(rest.name));
      if (!sc || sc.max < 3) { tally.still++; continue; }
      await scrollTo(page, 3);
      const s3 = await readBar(page);
      const c3 = { ...ctx, state: "scrollTop 3" };
      L.check("Q1 · scrolled, the bar's ground is still the page's", c3, !!s3 && s3.barBg === s3.groundBg, `bar ${s3?.barBg} ground ${s3?.groundBg}`);
      L.check("Q3 · at 3 the hairline is visible and there is no shadow", c3, !!s3 && s3.hairline === 1 && s3.shadow === "none", `hairline ${s3?.hairline} shadow ${s3?.shadow}`);
      if (!sc.hasTitle) {
        tally.untitled++;
        L.check("Q5 · with no marked title, the name shows at 3", c3, !!s3?.name && s3.name.opacity === 1 && s3.name.ariaHidden === null, JSON.stringify(s3?.name));
        continue;
      }
      /* precondition: at 3 the title is still below the bar's bottom, or "still hidden" asserts nothing */
      const below = !!s3 && s3.titleBottom !== null && s3.titleBottom > s3.barBottom;
      L.check("Q3 · precondition: at 3 the title is still below the bar", c3, below, `title ${s3?.titleBottom} bar ${s3?.barBottom}`);
      L.check("Q3 · at 3 the name is still hidden", c3, !!s3?.name && s3.name.opacity === 0 && s3.name.ariaHidden === "true", JSON.stringify(s3?.name));
      if (!sc.titleInScroller) {
        /* Calendar / Noteboard: the zone scrolls below a header that stays put — the title never goes behind the bar */
        tally.fixedTitle++;
        await scrollTo(page, sc.max);
        const deep = await readBar(page);
        L.check("Q4 · a title that never scrolls behind the bar never names the bar", { ...ctx, state: "zone at its end" }, !!deep?.name && deep.name.opacity === 0 && deep.titleBottom! > deep.barBottom, JSON.stringify(deep?.name));
        continue;
      }
      const gone = await titleGoneAt(page);
      if (gone === null || gone > sc.max) { L.check("Q4 · precondition: the page scrolls far enough to take the title behind the bar", ctx, false, `needs ${gone} max ${sc.max}`); continue; }
      tally.titled++;
      await scrollTo(page, gone - 2);
      const before = await readBar(page);
      L.check("Q4 · just short of it, the name is still hidden", { ...ctx, state: `scrollTop ${gone - 2}` }, !!before?.name && before.name.opacity === 0 && before.titleBottom! > before.barBottom, `${JSON.stringify(before?.name)} title ${before?.titleBottom} bar ${before?.barBottom}`);
      await scrollTo(page, gone);
      const named = await readBar(page);
      const cn = { ...ctx, state: `scrollTop ${gone}` };
      L.check("Q4 · once the title's bottom is at or above the bar's, the name shows", cn, !!named?.name && named.name.opacity === 1 && named.name.ariaHidden === null && named.titleBottom! <= named.barBottom, `${JSON.stringify(named?.name)} title ${named?.titleBottom} bar ${named?.barBottom}`);
      /* Q7 · nothing in the bar moved sideways between rest and named */
      const moved = Object.entries(rest.controls).filter(([k, b]) => {
        const a = (named?.controls as Record<string, { x: number; w: number } | null>)[k];
        return !b || !a || !near(a.x, b.x, 0.5) || !near(a.w, b.w, 0.5);
      }).map(([k]) => k);
      L.check("Q7 · no control in the bar moved when the name appeared", cn, moved.length === 0 && Object.keys(rest.controls).length >= 6, `moved ${JSON.stringify(moved)} of ${Object.keys(rest.controls).length}`);
      await scrollTo(page, 0);
      const back = await readBar(page);
      L.check("Q4 · back at 0, the bar is at rest again", { ...ctx, state: "back to 0" }, !!back?.name && back.name.opacity === 0 && back.name.ariaHidden === "true" && back.hairline === 0, `${JSON.stringify(back?.name)} hairline ${back?.hairline}`);
    }
    const all = { route: "*", size: `${vp.width}`, state: "tally" };
    L.check("population · each branch entered", all, tally.titled >= 5 && tally.untitled >= 1 && tally.fixedTitle >= 1, JSON.stringify(tally));
    L.write();
    console.log(`QB tally ${vp.width}: ${JSON.stringify(tally)}`);
    expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(BAR_ROUTES.length * 3 + 30);
    expect(L.failures().map((f) => `${f.lock} · ${f.route} ${f.state} — ${f.detail}`)).toEqual([]);
  });
}

test("Q6 · a route change starts the new page's bar at rest", async ({ page }) => {
  const L = new Ledger("qb-route");
  for (const vp of SIZES) {
    const ctx = { route: "/queries → /agents", size: `${vp.width}`, state: "after nav" };
    await openApp(page, "/queries", vp);
    await suppressMotion(page);
    const sc = await tagScroller(page);
    await scrollTo(page, Math.min(800, sc?.max ?? 0));
    const deep = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-probe="navrow"]')].find((e) => e.getBoundingClientRect().height > 0)?.dataset.scrolled);
    L.check("Q6 · precondition: the Query Centre's bar is awake", ctx, deep === "true", `${deep}`);
    await page.locator("#ws-sidebar a, #ws-sidebar button").filter({ hasText: "Contact list" }).first().click();
    await page.waitForURL(/\/agents/);
    await page.waitForTimeout(400);
    const r = await readBar(page);
    L.check("Q6 · the new page's bar is at rest", ctx, !!r && r.hairline === 0 && !!r.name && r.name.opacity === 0 && r.name.ariaHidden === "true", `hairline ${r?.hairline} ${JSON.stringify(r?.name)}`);
  }
  L.write();
  expect(L.rows.length).toBe(4);
  expect(L.failures().map((f) => `${f.lock} · ${f.size} — ${f.detail}`)).toEqual([]);
});

test("Q9 · reduced motion makes both changes instant", async ({ browser }) => {
  const L = new Ledger("qb-motion");
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    const ctx = await browser.newContext({ reducedMotion, storageState: "tests/e2e/.auth/state.json" });
    const page = await ctx.newPage();
    await openApp(page, "/queries", { width: 1440, height: 900 });
    /* ⚠️ THE HARNESS KILLS MOTION ON EVERY PAGE IT OPENS — read with that lifted, or both answers are its */
    await liftMotionSuppression(page);
    const r = await readBar(page);
    const c = { route: "/queries", size: "1440", state: reducedMotion };
    if (reducedMotion === "reduce") {
      /* ⚠️ "INSTANT" IS THE SHELL'S 0.01ms, not 0s: its one reduced-motion rule sets that, `!important`, on
         everything under `.ws-app` — the value the app has always meant by "no motion" */
      const instant = (d: string) => d.split(",").every((x) => parseFloat(x) <= 0.00001);
      L.check("Q9 · reduce: the hairline's transition is instant", c, !!r && instant(r.hairlineDur), `${r?.hairlineDur}`);
      L.check("Q9 · reduce: the name's transition is instant", c, !!r?.name && instant(r.name.dur), `${r?.name?.dur}`);
    } else {
      L.check("Q9 · no preference: the hairline fades over 0.25s", c, r?.hairlineDur === "0.25s", `${r?.hairlineDur}`);
      L.check("Q9 · no preference: the name moves over 0.28s", c, !!r?.name && r.name.dur.split(",").every((d) => d.trim() === "0.28s"), `${r?.name?.dur}`);
    }
    await ctx.close();
  }
  L.write();
  expect(L.rows.length).toBe(4);
  expect(L.failures().map((f) => `${f.lock} · ${f.state} — ${f.detail}`)).toEqual([]);
});
