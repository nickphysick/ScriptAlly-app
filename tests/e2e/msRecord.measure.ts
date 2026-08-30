/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ MANUSCRIPTS: THE SHELF, THE RECORD, AND THE WAY BACK ══════════════════════════════════════
 *
 * ⚠️ THE SAME ROUND TRIP QUERY CENTRE NEEDED, RUN HERE BEFORE THE FAULT ARRIVES rather than after.
 * That page opened straight into a record and the back link could not get out — two faults sharing
 * one mechanism, each leg individually green while the page was unusable, because what failed was
 * the TRANSITION out. This page has always had the param and never had the auto-select, so this is
 * the check that keeps it that way.
 *
 * ⚠️ AND THE GEOMETRY IS HERE RATHER THAN IN A SOURCE LOCK. "The pager sits at the far end of the
 * bar, opposite the departure" is a claim about a band; `indexOf` cannot see one. The source lock
 * (`manuscriptPager.test.tsx`) asserts what is MOUNTED and in which slot; this asserts where the two
 * controls land relative to each other and that neither overlaps the name between them.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const g = [...document.querySelectorAll(".wpg.msv-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  const box = (sel: string) => {
    const el = g.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) };
  };
  return {
    masthead: !!g.querySelector(".wsh"),
    tiles: g.querySelectorAll(".mcar-tile:not(.mcar-ghost)").length,
    dossier: !!g.querySelector(".msv-doss"),
    back: box(".wpg-barback"),
    who: (g.querySelector(".wpg-barwho") as HTMLElement)?.innerText?.trim() ?? null,
    whoBox: box(".wpg-barwho"),
    pager: box(".msp-pager"),
    pos: (g.querySelector(".msp-pagerpos") as HTMLElement)?.innerText?.trim() ?? null,
    barBox: box(".wpg-bar"),
    m: new URLSearchParams(location.search).get("m"),
    occluded: (() => {
      const bar = g.querySelector(".wpg-bar") as HTMLElement | null;
      const body = g.querySelector(".msv-doss") as HTMLElement | null;
      if (!bar || !body) return null;
      return +(bar.getBoundingClientRect().bottom - body.getBoundingClientRect().top).toFixed(1);
    })(),
  };
});

for (const width of [1280, 1440, 1920, 2560]) {
  test(`⚠️ SHELF → RECORD → SHELF, AND THE BAR CARRIES BOTH CONTROLS — ${width}`, async ({ page }) => {
    await openRoute(page, "/manuscripts", { width, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(1000);

    /* ── arriving with no param shows the shelf ── */
    const a = await read(page);
    expect(a.m, `arriving at /manuscripts opened a book implicitly (?m=${a.m})`).toBeNull();
    expect(a.tiles, "the shelf rendered no manuscripts").toBeGreaterThan(1);
    expect(a.masthead, "the shelf has no masthead").toBe(true);
    expect(a.dossier, "a dossier rendered on the shelf").toBe(false);

    /* ── a tile opens the record ── */
    await page.locator(".mcar-tile:not(.mcar-ghost)").first().click();
    await page.waitForTimeout(1100);
    const b = await read(page);
    expect(b.m, "opening a book did not set ?m=").toBeTruthy();
    expect(b.masthead, "the record still draws a masthead").toBe(false);
    expect(b.dossier, "the record did not render its dossier").toBe(true);
    expect(b.back, "the record's bar has no back-link").toBeTruthy();
    expect(b.who, "the record's bar states no title").toBeTruthy();

    /**
     * ⚠️ THE BAR MUST NOT EAT THE TOP OF THE RECORD. `.wpg-bar` carries `margin-bottom: -46px` so
     * that on a GRID it overlays a masthead scrolling out beneath it. A record has no masthead and
     * opens at `scrollTop: 0` with the bar already shown, so the same declaration simply steals the
     * first 46px — measured at 30px of occluded content on both record pages before it was fixed.
     *
     * ⚠️ AND IT IS AN OVERLAP, WHICH IS WHY NEITHER PAGE'S EXISTING LOCKS SAW IT. The bar measured
     * correctly and the body measured correctly; only the relationship between them was wrong.
     */
    expect(b.occluded, `the bar covers ${b.occluded}px of the record at rest`).toBeLessThanOrEqual(0);

    /**
     * ⚠️ THE PAGER IS AT THE FAR END, THE DEPARTURE AT THE NEAR ONE, AND THE NAME BETWEEN THEM.
     * `ManuscriptPager`'s own note warned that a departure among the operations is how a reader
     * presses one meaning and gets the other — two chevrons in one band. The separation is the
     * guard, so it is asserted as a separation rather than trusted to the stylesheet.
     */
    expect(b.pager, "the pager is not in the record's bar").toBeTruthy();
    expect(b.pos, "the pager states no shelf position").toMatch(/^\d+ \/ \d+$/);
    expect(b.back!.r, "the departure is not at the near end").toBeLessThan(b.whoBox!.l);
    expect(b.pager!.l, "the pager is not past the name it pages away from").toBeGreaterThan(b.whoBox!.l);
    expect(b.whoBox!.r, "the name runs into the pager").toBeLessThanOrEqual(b.pager!.l);
    /* both inside the band — a control hanging out of a 46px bar is off screen, not "at the end" */
    expect(b.pager!.r, "the pager overhangs the bar's right edge").toBeLessThanOrEqual(b.barBox!.r);

    /* ── and the back link returns to the shelf ── */
    await page.locator(".wpg-barback").click();
    await page.waitForTimeout(1100);
    const c = await read(page);
    expect(c.m, `\`← All manuscripts\` left ?m=${c.m} in the URL`).toBeNull();
    expect(c.tiles, "the back link did not return to the shelf").toBeGreaterThan(1);
    expect(c.dossier, "the dossier survived the back link").toBe(false);
    expect(c.masthead, "the shelf's masthead did not come back").toBe(true);

    console.log(`   ${width}: shelf ${a.tiles} books · record ${b.who} (?m=${b.m}, pager ${b.pos}) · back to ${c.tiles} books · clearance ${-b.occluded!}px`);
  });
}
