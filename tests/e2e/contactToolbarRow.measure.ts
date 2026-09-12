/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TOOLBAR IS ONE ROW (design authority: design-refs/contact-list-v5.html).
 *
 * ⚠️ THE REF PUTS EVERY CONTROL ON ONE LINE and caps the search: `.search { flex: 1;
 * min-width: 200px; max-width: 320px }`, `.switch { margin-left: auto }`, `.toolbar { gap: 10px }`.
 * The cap is the load-bearing half — an uncapped flex child with `width: 100%` claims the whole
 * row and folds everything after it onto lines of its own.
 *
 * ⚠️ AND IT ARRIVED FROM ANOTHER PAGE, AS THE PORTAL DID. `.qcc-tb-search` is the QUERY CENTRE's
 * shared field; on 2026-09-09, `12dd553e` ("toolbar: the row was wrapping, and the two
 * declarations that did it were mine") moved its cap off the field and onto the grid TRACK that
 * holds it there — correct for a grid, and this page's toolbar is a FLEX row with no track. The
 * field went from `width: 360px; max-width: 100%` to `width: 100%`, and took the row with it.
 *
 * ⚠️ SO THE ASSERTION IS `offsetTop`, NOT A COUNT OF CHILDREN. Counting elements says the toolbar
 * mounted, which it did — it mounted perfectly, on three rows. Only the rendered geometry can tell
 * one row from three, which is the same lesson the portalled drawer taught: every gate was green,
 * the page mounted, and the layout was wrong in a way only a computed read catches.
 */
import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

/** The ref's own cap, read off `.search` in contact-list-v5.html. */
const SEARCH_MAX = 320;
/** The widths this page is designed and reviewed at. */
const WIDTHS = [1440, 1920];

for (const w of WIDTHS) {
  test(`the toolbar is one row at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/#/contact-lab");
    await page.locator('[data-lab-view="cast"]').click();
    await expect(page.locator('[data-agent-card="fx-long"]')).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const r = await page.evaluate(() => {
      const bar = document.querySelector(".agl-toolbar") as HTMLElement;
      const kids = [...bar.children] as HTMLElement[];
      const rows = kids.map((k) => {
        const b = k.getBoundingClientRect();
        return {
          cls: (k.className || k.tagName).toString().split(" ")[0],
          top: Math.round(b.top),
          h: Math.round(b.height),
          /* ⚠️ THE CENTRE, NOT THE TOP. `align-items: center` gives children of different heights
             different `top`s ON THE SAME LINE — measured, the switch at 277 beside buttons at 281,
             four pixels apart and both on row three. Raw tops would call a correct toolbar wrapped.
             Items sharing a flex line share a centre line, so that is what identifies a row. */
          mid: Math.round(b.top + b.height / 2),
          w: Math.round(b.width),
        };
      });
      const search = bar.querySelector(".qcc-tb-search") as HTMLElement;
      const sw = bar.querySelector(".qvs") as HTMLElement;
      const bb = bar.getBoundingClientRect();
      return {
        rows,
        /* ⚠️ DISTINCT `offsetTop`s ARE THE WHOLE CLAIM — one value means one row. */
        distinctMids: [...new Set(rows.map((x) => x.mid))].sort((a, b) => a - b),
        tallest: Math.max(...rows.map((x) => x.h)),
        barH: Math.round(bb.height),
        searchW: Math.round(search.getBoundingClientRect().width),
        /* ⚠️ THE ARRANGEMENT, NOT JUST THE ROW COUNT. Everything after the count clustered at the
           right is ALSO one row, and is what the shell's `.wpg-tally { margin-right: auto }` gives
           — measured, a 480px hole between the count and the search at 1920. The ref seats the
           search beside the count, so the gap between them is the row's own 10px. */
        tallyRight: Math.round((bar.querySelector(".wpg-tally") as HTMLElement).getBoundingClientRect().right),
        searchLeft: Math.round(search.getBoundingClientRect().left),
        switchRight: sw ? Math.round(sw.getBoundingClientRect().right) : -1,
        barRight: Math.round(bb.right),
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[toolbar ${w}] countToSearchGap=${r.searchLeft - r.tallyRight} rowCentres=${JSON.stringify(r.distinctMids)} barH=${r.barH} tallestChild=${r.tallest} search=${r.searchW} switchRight=${r.switchRight} barRight=${r.barRight}`);
    // eslint-disable-next-line no-console
    console.log(`[toolbar ${w}] children: ${r.rows.map((x) => `${x.cls}@${x.mid}/${x.w}px`).join("  ")}`);

    /* the population first — an empty toolbar would satisfy every claim below */
    expect(r.rows.length, "the toolbar rendered too few controls to be measuring anything").toBeGreaterThan(4);
    expect(r.distinctMids.length, `the toolbar wrapped onto ${r.distinctMids.length} rows`).toBe(1);
    /* ⚠️ AND THE SAME CLAIM FROM THE CONTAINER'S SIDE: one row means the bar is exactly as tall as
       its tallest control. A wrapped bar is the sum of its lines plus the gaps between them. */
    expect(r.barH - r.tallest, "the toolbar is taller than its tallest control — it has wrapped").toBeLessThanOrEqual(1);
    expect(r.searchW, `the search is over the ref's ${SEARCH_MAX}px cap`).toBeLessThanOrEqual(SEARCH_MAX);
    /* ⚠️ AND THE SWITCH IS PUSHED RIGHT — `margin-left: auto` in the ref. Without it the controls
       bunch left and the row is "one row" while looking nothing like the design. */
    expect(Math.abs(r.switchRight - r.barRight), "the view switch is not flush with the row's right edge").toBeLessThanOrEqual(1);
    /* the search sits BESIDE the count — one gap, not a hole the free space fell into */
    expect(r.searchLeft - r.tallyRight, "the search is not beside the count — the free space is in the wrong place").toBeLessThanOrEqual(12);
  });
}
