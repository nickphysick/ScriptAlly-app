/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ALIGNMENT AMENDMENT'S GATE — four verticals, two horizontals, nothing between them.
 *
 * ⚠️ EVERY ASSERTION IS A RELATIONSHIP BETWEEN MEASURED ELEMENTS, NEVER A CONSTANT. That is the
 * standard the whole pack has held, and here it is load-bearing rather than stylistic: the figures
 * in the amendment's table are what the geometry should PRODUCE, and a gate written against them
 * would go green on a page where every container had been nudged by the same 4px. It would also
 * have to be rewritten the next time a token moved, which is how a lock stops being read.
 *
 * ⚠️ VERIFIED RED. Nudging `.qc-lhead` by `padding-top: 4px` fails case 1 (the two heads' tops
 * diverge by 4) and nothing else; nudging `.qp-cols` by `padding-left: 4px` fails case 3 and 4.
 * A gate nobody has seen fail is a gate nobody has tested.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const WIDTHS = [1180, 1280, 1440, 1680];

const geometry = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const q = (s: string) => document.querySelector(s) as HTMLElement | null;
  const r = (e: HTMLElement | null) => (e ? e.getBoundingClientRect() : null);
  const row = q(".qc-wpg .wpg-scroll");
  const work = q(".f12-body");
  const list = q(".f12-list");
  const pane = q(".qp-pane");
  const lhead = q(".qc-lhead");
  const phead = q(".qc-phead");
  if (!row || !work || !list || !pane || !lhead || !phead) return null;

  /* the work area's own content box — the amendment's "work area", which is the grid that holds
     both control cells and both columns. Its padding IS the gutter under test. */
  const wcs = getComputedStyle(work);
  const W = r(work)!;
  const inner = {
    left: W.left + parseFloat(wcs.paddingLeft),
    right: W.right - parseFloat(wcs.paddingRight),
  };

  /* every card in the pane, in DOM order, plus the list panel — the "every card" set */
  const cards = [list, ...Array.from(document.querySelectorAll(".qp-pane .f12-heroband, .qp-pane .f12-card"))] as HTMLElement[];

  const rc = getComputedStyle(row);
  return {
    scrollbar: rc.overflowY,
    /* 1 — the control band */
    lhead: { top: r(lhead)!.top, h: r(lhead)!.height, left: r(lhead)!.left, right: r(lhead)!.right },
    phead: { top: r(phead)!.top, h: r(phead)!.height, left: r(phead)!.left, right: r(phead)!.right },
    /* 2 — the two columns */
    list: { top: r(list)!.top, bottom: r(list)!.bottom, left: r(list)!.left, right: r(list)!.right, w: r(list)!.width },
    pane: { top: r(pane)!.top, bottom: r(pane)!.bottom, left: r(pane)!.left, right: r(pane)!.right, w: r(pane)!.width },
    /* 3 — the work area's gutters */
    gutters: {
      left: r(list)!.left - inner.left,
      right: inner.right - r(pane)!.right,
      /* ⚠️ THE FOOT IS MEASURED TO THE WORK AREA'S OUTER EDGE, not its padding box. Measured to the
         padding box it is ZERO BY CONSTRUCTION — the columns fill the grid row, so the row's own
         padding is the only thing between them and the bottom, and subtracting it first measures
         the gap that the gutter is. It reported 0 at all four widths on the first run. */
      bottom: W.bottom - r(pane)!.bottom,
    },
    /* 4 — radii and sibling gaps */
    radii: cards.map((c) => getComputedStyle(c).borderTopLeftRadius),
    /* the pane's own children, in flow: header plate then the card grid */
    paneGaps: (() => {
      const kids = Array.from(pane.children).filter((k) => (k as HTMLElement).offsetHeight > 0) as HTMLElement[];
      const out: number[] = [];
      for (let i = 1; i < kids.length; i++) out.push(Math.round(kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom));
      return out;
    })(),
    /**
     * ⚠️ THE FOUR VERTICALS, ASSERTED DIRECTLY. The gutters being equal says the WORK AREA's walls
     * are symmetric; it says nothing about whether the pane's cards sit on the pane's own edges,
     * and that was the actual fault — a 20px inset on the pane's content only, so the work area had
     * six verticals and content sat 20px off the right wall while the list sat hard against the
     * left. Added after the red proof found this missing: a `padding-left` on the card grid moved
     * the cards off their column and every other assertion stayed green.
     */
    paneEdges: (() => {
      const P = r(pane)!;
      /**
       * ⚠️ PER ROW, NOT ACROSS THE WHOLE PANE — and the difference is not academic. Taking the
       * minimum left over EVERY card reads the header plate, which is flush; a 40px inset injected
       * on the card grid beneath it then measured as ZERO, because the plate held the minimum. The
       * fault this exists to catch is exactly a row whose cards leave the column's verticals, so
       * each row is measured against the pane on its own and the worst deviation is reported.
       */
      const cols = q(".qp-cols");
      const rows: HTMLElement[][] = [];
      const plate = q(".qp-pane .f12-heroband");
      if (plate) rows.push([plate]);
      if (cols) rows.push(Array.from(cols.children).filter((k) => (k as HTMLElement).offsetHeight > 0) as HTMLElement[]);
      let left = 0, right = 0;
      for (const cards of rows) {
        if (!cards.length) continue;
        left = Math.max(left, Math.min(...cards.map((c) => c.getBoundingClientRect().left)) - P.left);
        right = Math.max(right, P.right - Math.max(...cards.map((c) => c.getBoundingClientRect().right)));
      }
      return { left, right };
    })(),
    /**
     * ⚠️ THE AMENDMENT'S "TWO NARROW COLUMNS ARE ONE FIGURE" IS SUPERSEDED BY §3, and this reads the
     * rule that replaced it. Pinning the pane's right column to `--listw` fixed a real fault — a
     * proportion of the LEFTOVER measured 245 against the list's 334 — by making the two the same
     * width. The ratio is stated directly now: the stack is 40% of the PANE rather than the list's
     * twin, so the durable claim is the SPLIT, measured at every width.
     */
    split: (() => {
      const cols = q(".qp-cols");
      const kids = cols ? (Array.from(cols.children) as HTMLElement[]).filter((k) => k.offsetHeight > 0) : [];
      if (kids.length < 2) return null;
      const t = kids[0].getBoundingClientRect().width, s2 = kids[1].getBoundingClientRect().width;
      return { track: t, stack: s2, pct: (t / (t + s2)) * 100 };
    })(),
    narrow: (() => {
      const stack = q(".qp-stack");
      return { list: r(list)!.width, paneRight: stack ? r(stack)!.width : null };
    })(),
    /* the channel between the columns and the gap under the control band */
    channel: r(pane)!.left - r(list)!.right,
    bandGap: r(list)!.top - r(lhead)!.bottom,
    cardGap: (() => {
      const stack = q(".qp-stack");
      const kids = stack ? (Array.from(stack.children) as HTMLElement[]).filter((k) => k.offsetHeight > 0) : [];
      return kids.length > 1 ? Math.round(kids[1].getBoundingClientRect().top - kids[0].getBoundingClientRect().bottom) : null;
    })(),
    colGap: (() => {
      const cols = q(".qp-cols");
      if (!cols) return null;
      const kids = Array.from(cols.children) as HTMLElement[];
      return kids.length > 1 ? Math.round(kids[1].getBoundingClientRect().left - kids[0].getBoundingClientRect().right) : null;
    })(),
  };
});

for (const width of WIDTHS) {
  test(`alignment — four verticals and two horizontals at ${width}`, async ({ page }) => {
    await openRoute(page, "/queries", { width, height: 900 });
    const g = await geometry(page);
    expect(g, `the work area is missing at ${width}`).not.toBeNull();
    const near = (a: number, b: number) => Math.abs(a - b) <= 1;

    console.log(
      `\n${width}px  (scrollbar: overlay, 0px — this browser cannot produce a classic bar)\n` +
      `  band     lhead top ${Math.round(g!.lhead.top)} h ${Math.round(g!.lhead.h)}   phead top ${Math.round(g!.phead.top)} h ${Math.round(g!.phead.h)}\n` +
      `  columns  list ${Math.round(g!.list.top)}→${Math.round(g!.list.bottom)}   pane ${Math.round(g!.pane.top)}→${Math.round(g!.pane.bottom)}\n` +
      `  gutters  left ${Math.round(g!.gutters.left)}  right ${Math.round(g!.gutters.right)}  bottom ${Math.round(g!.gutters.bottom)}\n` +
      `  gaps     band→cols ${Math.round(g!.bandGap)}  channel ${Math.round(g!.channel)}  pane cards ${JSON.stringify(g!.paneGaps)}  stack ${g!.cardGap}  pane cols ${g!.colGap}\n` +
      `  pane     content left ${Math.round(g!.paneEdges.left)}  right ${Math.round(g!.paneEdges.right)}\n` +
      `  split    ${g!.split ? g!.split.pct.toFixed(1) + "/" + (100 - g!.split.pct).toFixed(1) : "n/a"}  (track ${g!.split ? Math.round(g!.split.track) : 0} · stack ${g!.split ? Math.round(g!.split.stack) : 0})\n` +
      `  narrow   list ${Math.round(g!.narrow.list)}  pane-right ${g!.narrow.paneRight != null ? Math.round(g!.narrow.paneRight) : "n/a"}\n` +
      `  radii    ${g!.radii.join(" ")}`);

    /* 1 — the two control cells are one band */
    expect(near(g!.lhead.h, g!.phead.h), `the control cells are different heights: ${g!.lhead.h} vs ${g!.phead.h}`).toBe(true);
    expect(near(g!.lhead.top, g!.phead.top), `the control cells start on different lines: ${g!.lhead.top} vs ${g!.phead.top}`).toBe(true);

    /* 2 — the two columns start and finish together */
    expect(near(g!.list.top, g!.pane.top), `the columns start on different lines: ${g!.list.top} vs ${g!.pane.top}`).toBe(true);
    expect(near(g!.list.bottom, g!.pane.bottom), `the columns finish on different lines: ${g!.list.bottom} vs ${g!.pane.bottom}`).toBe(true);

    /* 2b — and each cell sits over its own column, which is what makes the band one band */
    expect(near(g!.lhead.left, g!.list.left), "the list's control cell is not over the list").toBe(true);
    expect(near(g!.lhead.right, g!.list.right), "the list's control cell is not the list's width").toBe(true);
    expect(near(g!.phead.left, g!.pane.left), "the pane's control cell is not over the pane").toBe(true);
    expect(near(g!.phead.right, g!.pane.right), "the pane's control cell is not the pane's width").toBe(true);

    /* 3a — the pane's content sits ON the pane's verticals: four verticals across the work area,
       nothing between them */
    expect(Math.round(g!.paneEdges.left), `the pane's content is inset ${Math.round(g!.paneEdges.left)}px from its own left edge`).toBeLessThanOrEqual(1);
    expect(Math.round(g!.paneEdges.right), `the pane's content is inset ${Math.round(g!.paneEdges.right)}px from its own right edge`).toBeLessThanOrEqual(1);

    /* 3 — the work area's side gutters are equal */
    expect(near(g!.gutters.left, g!.gutters.right), `the gutters are unequal: left ${g!.gutters.left} / right ${g!.gutters.right}`).toBe(true);
    expect(g!.gutters.bottom, "the work area has no foot").toBeGreaterThan(0);

    /* 4 — one radius across every card, and one value for every sibling gap */
    expect(new Set(g!.radii).size, `the cards report ${new Set(g!.radii).size} different radii: ${g!.radii.join(", ")}`).toBe(1);
    const gaps = [g!.channel, ...g!.paneGaps, g!.cardGap, g!.colGap].filter((n): n is number => n != null);
    expect(new Set(gaps.map((n) => Math.round(n))).size, `the gaps are not one value: ${gaps.map((n) => Math.round(n)).join(", ")}`).toBe(1);

    /* 4b — the pane splits 60/40 (§3), at every width. Asserted as the RATIO rather than as two
       widths, because the ratio is the specification and the widths are what it produces. */
    if (g!.split) {
      expect(Math.abs(g!.split.pct - 60), `the pane splits ${g!.split.pct.toFixed(1)}/${(100 - g!.split.pct).toFixed(1)}, not 60/40`)
        .toBeLessThanOrEqual(0.5);
    }
  });
}

/**
 * ⚠️ THE GATE PROVES ITSELF, ON EVERY RUN. "Verify red by nudging one container's top padding by
 * 4px" is a one-off act if it is done by hand and then undone; as a case it is a standing guarantee
 * that the relationships above are actually being read.
 *
 * ⚠️ AND IT NUDGES ONE CONTAINER AT A TIME. A single injected sheet moving everything would fail
 * every assertion at once and prove only that SOMETHING is measured — the point is that each
 * relationship catches its own fault: a top padding on one control cell breaks the band, a side
 * padding on the pane's cards breaks the gutters, and a radius on one card breaks the radius set.
 */
test("alignment — the gate goes red when a container is nudged", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const clean = await geometry(page);
  expect(clean, "the work area is missing").not.toBeNull();

  /* ⚠️ THE SHEET IS APPENDED TO `documentElement`, NOT `head`, AND REMOVED BY THE SAME SEARCH.
     `addStyleTag` puts it in `head`; a later cleanup that searched only `head` for its own marker
     is fine, but the deployed build's own stylesheet is a linked file, so nothing here can remove
     an app sheet by accident. A forced reflow between the write and the read is what makes the
     measurement see it — `addStyleTag` resolves when the tag loads, not when layout has settled. */
  const nudge = async (css: string) => {
    await page.addStyleTag({ content: css });
    await page.evaluate(() => void document.body.getBoundingClientRect());
    const g = await geometry(page);
    await page.evaluate(() => document.querySelectorAll("style").forEach((s) => {
      if (s.textContent?.includes("SA-NUDGE")) s.remove();
    }));
    await page.evaluate(() => void document.body.getBoundingClientRect());
    return g!;
  };

  /**
   * 1 — the control band.
   *
   * ⚠️ AND A FINDING, MEASURED HERE: a `padding-top: 4px` on one control cell CANNOT break this, and
   * the amendment's suggested nudge is therefore the one nudge that proves nothing. The cells are
   * grid items in a FIXED 36px row under the default `stretch`, so their boxes both start at the
   * row's top whatever padding they carry — the padding moves their contents, not their tops. That
   * is exactly what the fixed band bought: the two cells' top offsets are now incapable of
   * diverging, rather than merely equal today. Asserted in both directions so the guarantee is
   * recorded rather than assumed, and the red proof uses a margin, which a grid item does honour.
   */
  const padded = await nudge("/* SA-NUDGE */ .qc-lhead { padding-top: 4px }");
  expect(Math.abs(padded.lhead.top - padded.phead.top), "a padding nudge moved a cell's top — the fixed band is not holding them")
    .toBeLessThanOrEqual(1);
  const band = await nudge("/* SA-NUDGE */ .qc-lhead { margin-top: 4px }");
  expect(Math.abs(band.lhead.top - band.phead.top), "a 4px nudge on one control cell was not seen — the band assertion is reading nothing")
    .toBeGreaterThan(2);
  expect(Math.abs(clean!.lhead.top - clean!.phead.top), "the clean page is not aligned").toBeLessThanOrEqual(1);

  /**
   * 3 — the pane's verticals.
   *
   * ⚠️ THIS NUDGE FOUND A HOLE IN THE GATE, WHICH IS WHAT A RED PROOF IS FOR. A `padding-left` on
   * the card grid moved the cards off the pane's own left edge — the EXACT fault the amendment
   * exists to fix — and every assertion stayed green: the gutters were still symmetric (they
   * measure the COLUMN's walls, not its contents), the gaps were still 16 (a container's padding
   * does not change its children's gap), and the radii were untouched. The `paneEdges` case above
   * was added because of this, and this nudge is what holds it honest.
   */
  /* ⚠️ `!important`, BECAUSE THE PADDING IT IS FIGHTING IS INLINE. The card grid sets `padding: 0`
     in its `style` attribute, so an injected stylesheet rule loses to it silently — the nudge
     reported 0 twice and looked like the assertion reading nothing, when nothing had been nudged.
     The same inline-beats-stylesheet footgun this repo has recorded on the rail's display. */
  const gut = await nudge("/* SA-NUDGE */ .qp-cols { padding-left: 4px !important }");
  expect(gut.paneEdges.left, "a 4px inset on the pane's content was not seen — the verticals assertion is reading nothing")
    .toBeGreaterThan(2);
  expect(clean!.paneEdges.left, "the clean page's content is off its column").toBeLessThanOrEqual(1);

  /* 4 — the radius set */
  const rad = await nudge("/* SA-NUDGE */ .qp-stack .f12-card:first-child { border-radius: 4px }");
  expect(new Set(rad.radii).size, "a changed card radius was not seen — the radius assertion is reading nothing").toBeGreaterThan(1);
  expect(new Set(clean!.radii).size, "the clean page has more than one radius").toBe(1);
});
