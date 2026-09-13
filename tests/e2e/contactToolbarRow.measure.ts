/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TOOLBAR IS ONE ROW — ON THE PAGE, NOT IN THE LAB (design authority: design-refs/contact-list-v5.html).
 *
 * ⚠️ THIS LOCK USED TO MEASURE THE LAB, AND THE LAB IS 270px WIDER. `/#/contact-lab` renders the page
 * without the workspace shell, so at a 1440 viewport its toolbar had 1120px — while the real /agents
 * page, behind the shell's 224px panel and inside the grid's gutters, gives it 850. The ref's controls
 * need 1098. The lab passed, aef24f73 reported "the toolbar goes back on one row", and on the page
 * people use at 1440 the view switch was still on a line of its own. The surface census, which runs
 * the real route, is what saw it. A geometry claim is measured where the geometry is — here.
 *
 * ⚠️ THE REF CAPS THE SEARCH: `.search { flex: 1; min-width: 200px; max-width: 320px }`, with
 * `.switch { margin-left: auto }`. The cap arrived here from another page's change: on 2026-09-09
 * `12dd553e` moved `.qcc-tb-search`'s cap onto the Query Centre's grid TRACK, which a flex row does not
 * have, and the field took the whole line. agentList.css restores it for this row.
 *
 * ⚠️ CENTRE LINES, NOT TOPS. `align-items: center` gives controls of different heights different tops on
 * the SAME line — measured, the switch at 277 beside buttons at 281. Controls sharing a line share a
 * centre, and the row states the same claim from its own side: one line means the row is exactly as
 * tall as its tallest control.
 *
 * ⚠️ AND THE ARRANGEMENT, NOT JUST THE LINE COUNT. Everything clustered at the right is also one line —
 * it is what the shell's `.wpg-tally { margin-right: auto }` gives. The ref seats the search beside the
 * count, so the gap between them is the row's own 10px.
 *
 * ONE TEST LOOPING BOTH WIDTHS, SOFT ASSERTIONS: every test password-signs-in, and a hard failure at 1440
 * would hide the 1920 reading.
 */
import { expect, test } from "@playwright/test";
import { openRoute, visiblePage } from "./measure";

test.setTimeout(240_000);

/** the ref's own cap, read off `.search` in contact-list-v5.html */
const SEARCH_MAX = 320;
/** the widths this page is designed and reviewed at */
const WIDTHS = [1440, 1920];

test("the Contact list toolbar is one row on the real page, at the design widths", async ({ page }) => {
  for (const w of WIDTHS) {
    await openRoute(page, "/agents", { width: w, height: 900 });
    await page.waitForFunction(() => [...document.querySelectorAll(".agl-wpg")].some((e) => e.getBoundingClientRect().height > 0), null, { timeout: 25_000 });
    const scope = await visiblePage(page, ".agl-wpg");
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const r = await page.evaluate((sc) => {
      const bar = document.querySelector(`${sc} .agl-toolbar`) as HTMLElement;
      const kids = [...bar.children] as HTMLElement[];
      const rows = kids.map((k) => {
        const b = k.getBoundingClientRect();
        return { cls: String(k.className || k.tagName).split(" ")[0], mid: b.top + b.height / 2, h: Math.round(b.height), w: Math.round(b.width) };
      });
      const mids = rows.map((x) => x.mid).sort((a, b) => a - b);
      let lines = mids.length ? 1 : 0;
      for (let i = 1; i < mids.length; i++) if (mids[i] - mids[i - 1] > 3) lines++;
      const search = bar.querySelector(".qcc-tb-search") as HTMLElement;
      const sw = bar.querySelector(".qvs") as HTMLElement;
      const tally = bar.querySelector(".wpg-tally") as HTMLElement;
      const bb = bar.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(bar).columnGap) || 0;
      return {
        rows: rows.map((x) => `${x.cls}@${Math.round(x.mid)}/${x.w}`),
        count: rows.length, lines,
        barH: Math.round(bb.height), tallest: Math.max(...rows.map((x) => x.h)),
        barW: Math.round(bb.width), need: Math.round(rows.reduce((n, x) => n + x.w, 0) + gap * Math.max(0, rows.length - 1)),
        searchW: Math.round(search.getBoundingClientRect().width),
        switchRight: Math.round(sw.getBoundingClientRect().right), barRight: Math.round(bb.right),
        tallyRight: Math.round(tally.getBoundingClientRect().right), searchLeft: Math.round(search.getBoundingClientRect().left),
      };
    }, scope);
    // eslint-disable-next-line no-console
    console.log(`[toolbar ${w}] lines=${r.lines} barH=${r.barH} tallest=${r.tallest} · room=${r.barW} need=${r.need} · search=${r.searchW} countToSearchGap=${r.searchLeft - r.tallyRight} switchRight=${r.switchRight} barRight=${r.barRight}`);
    // eslint-disable-next-line no-console
    console.log(`[toolbar ${w}] children: ${r.rows.join("  ")}`);

    /* the population first — an empty toolbar would satisfy every claim below */
    expect.soft(r.count, `${w}: the toolbar rendered too few controls to be measuring anything`).toBeGreaterThan(4);
    expect.soft(r.lines, `${w}: the toolbar wrapped onto ${r.lines} lines (room ${r.barW}px, controls need ${r.need}px)`).toBe(1);
    expect.soft(r.barH - r.tallest, `${w}: the toolbar is taller than its tallest control — it has wrapped`).toBeLessThanOrEqual(1);
    expect.soft(r.searchW, `${w}: the search is over the ref's ${SEARCH_MAX}px cap`).toBeLessThanOrEqual(SEARCH_MAX);
    expect.soft(Math.abs(r.switchRight - r.barRight), `${w}: the view switch is not flush with the row's right edge`).toBeLessThanOrEqual(1);
    expect.soft(r.searchLeft - r.tallyRight, `${w}: the search is not beside the count — the free space is in the wrong place`).toBeLessThanOrEqual(12);
  }
});
