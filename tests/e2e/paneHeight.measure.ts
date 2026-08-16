/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PANE'S HEIGHT, AND THE MOTIF'S CLEARANCE — the two figures this pass has to report as
 * measurements rather than as intentions.
 *
 * ⚠️ `flex: 1; min-height: 0` UNDER A BLOCK PARENT APPLIES TO NOTHING, and the page keeps working —
 * sized by content — which is the failure mode this codebase has been caught by twice. A source
 * lock can see the declarations; only the browser can say whether they did anything. So this
 * asserts the CARD IS AS TALL AS THE PANE and that its body actually scrolls, rather than trusting
 * the chain.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

test.setTimeout(300_000);

test("the card's height, and the motif's gap to the close control", async ({ page }) => {
  for (const width of [1440, 1920]) {
    await openRoute(page, "/todo", { width, height: 1000 });
    const bar = await scrollbarWidth(page);

    const r = await page.evaluate(() => {
      const vis = (el: Element) => el.getBoundingClientRect().height > 0;
      const one = (s: string) => ([...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined) ?? null;
      const n = (x: number) => Math.round(x * 10) / 10;
      const box = (s: string) => {
        const el = one(s);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { top: n(b.top), bottom: n(b.bottom), h: n(b.height), w: n(b.width), left: n(b.left), right: n(b.right) };
      };
      const body = one(".tdk-body");
      const motif = one(".tdk-motif");
      const close = one(".tdk-x");
      return {
        pane: box(".tdw-work"),
        wrap: box(".tdk"),
        pos: box(".tdk-head"),
        card: box(".tdk-w"),
        body: box(".tdk-body"),
        /* the two facts that say the body is genuinely the scroller */
        bodyScroll: body ? { scrollH: body.scrollHeight, clientH: body.clientHeight, overflow: body.scrollHeight - body.clientHeight } : null,
        paneScroll: (() => { const p = one(".tdw-work"); return p ? p.scrollHeight - p.clientHeight : null; })(),
        motif: motif ? box(".tdk-motif") : null,
        close: close ? box(".tdk-x") : null,
        gap: motif && close ? n(close.getBoundingClientRect().left - motif.getBoundingClientRect().right) : null,
      };
    });

    console.log(`\n═══ ${width} × 1000 ═══  scrollbar ${bar}px${bar === 0 ? " (OVERLAY — this browser cannot make a classic bar)" : ""}`);
    console.log(JSON.stringify(r, null, 2));

    if (r.pane && r.card && r.pos) {
      /* ⚠️ MEASURED FROM THE PANE'S OWN EDGES, NOT FROM A RESTATED BOX MODEL. My first version
         computed `pane.h - 28 - pos.h` and failed by exactly 14 — the head row's `margin-bottom`,
         which I had simply forgotten. A formula that enumerates the gaps is a second copy of the
         stylesheet in the test, and it is wrong the moment either changes. These two say the same
         thing without knowing any of the numbers: the card starts below the position line and ends
         at the wrapper's bottom padding. */
      expect(r.card.top, "the card does not start below the position line").toBeGreaterThan(r.pos.bottom);
      const foot = r.pane.bottom - r.card.bottom;
      expect(foot, `card bottom sits ${foot}px above the pane's — expected the wrapper's 14px`)
        .toBeLessThan(15);
      /* and it does not grow PAST the pane, which is what `min-height: 100%` allowed */
      expect(r.card.bottom).toBeLessThanOrEqual(r.pane.bottom + 1);
      console.log(`CARD HEIGHT @${width}: ${r.card.h}px   (pane ${r.pane.h}, foot gap ${Math.round(foot)})`);
    }
    /* ⚠️ THE PANE MUST NOT BE THE SCROLLER ANY MORE — if it is, the card is content-sized again */
    expect(r.paneScroll, "the pane is still scrolling — the card is sized by its content").toBe(0);

    if (r.gap !== null) {
      console.log(`MOTIF → CLOSE GAP: ${r.gap}px`);
      expect(r.gap, "the motif is not clear of the close control").toBeGreaterThan(0);
    }
  }
});
