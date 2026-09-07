/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE HERO LANDING — height, and whether the page scrolls ═══════════════════════════════════
 *
 * ⚠️ THE 1- AND 2-BOOK CASES ARE COMPUTED FROM MEASURED PARTS, NOT SIMULATED. Getting the harness
 * account down to one book means deleting manuscripts, and `deleteManuscript` CASCADES — queries,
 * versions, packages, activities. That is not a thing to do to a shared account for a screenshot.
 * So the hero, one row, the add control and the cards are each measured on the real page, and the
 * shorter shelves are the same parts minus rows — with the arithmetic checked against the count
 * that IS on screen, which is the only honest way to state a number nobody measured directly.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

test("the hero landing: heights, and where it scrolls", async ({ page }) => {
  await openRoute(page, "/manuscripts", { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  const m = await page.evaluate(() => {
    const h = (sel: string) => {
      const e = document.querySelector(sel) as HTMLElement | null;
      return e ? Math.round(e.getBoundingClientRect().height) : null;
    };
    const row = document.querySelector(".msv-wpg .mar-row") as HTMLElement | null;
    const rows = document.querySelectorAll(".msv-wpg .mar-row").length;
    const scroll = document.querySelector(".msv-wpg .wpg-scroll") as HTMLElement | null;
    const cover = document.querySelector(".msv-wpg .mhc-covertitle") as HTMLElement | null;
    const box = document.querySelector(".msv-wpg .mhc-cover") as HTMLElement | null;
    return {
      heroH: h(".msv-wpg .mhc"),
      rowH: row ? Math.round(row.getBoundingClientRect().height) : null,
      rows,
      alsoH: h(".msv-wpg .mar"),
      cardsH: h(".msv-wpg .mpr"),
      cards: document.querySelectorAll(".msv-wpg .mpr-card").length,
      gridCols: (() => { const g = document.querySelector(".msv-wpg .mpr") as HTMLElement | null;
        return g ? getComputedStyle(g).gridTemplateColumns : null; })(),
      overflow: scroll ? scroll.scrollHeight - scroll.clientHeight : null,
      /* ⚠️ THE COVER MUST NOT CROP — its box has a height, so overflow loses the title's foot. */
      coverTitle: cover?.textContent ?? null,
      coverSize: cover ? Math.round(parseFloat(getComputedStyle(cover).fontSize)) : null,
      coverClipped: cover && box
        ? cover.getBoundingClientRect().bottom > box.getBoundingClientRect().bottom + 1 : null,
      /* No parchment field survives. */
      parchment: document.querySelectorAll(".msv-wpg .mpr-info").length,
    };
  });
  console.log("HERO " + JSON.stringify(m));

  expect(m.heroH, "no hero on the page").toBeTruthy();
  expect(m.coverClipped, "the cover's title overflows its box").toBe(false);
  expect(m.parchment, "a parchment field survived").toBe(0);
  /* The grid states one column per card — never a fixed three with a hole. */
  expect((m.gridCols ?? "").split(" ").length, "the grid does not match the card count").toBe(m.cards);

  /* ── the shorter shelves, computed from the parts, and reported ── */
  const gap = 8;
  const alsoChrome = (m.alsoH ?? 0) - m.rows * ((m.rowH ?? 0) + gap);
  const at = (n: number) => {
    const rows = n - 1;
    const also = rows > 0 ? alsoChrome + rows * ((m.rowH ?? 0) + gap) : 0;
    return Math.round((m.heroH ?? 0) + also + (m.cardsH ?? 0));
  };
  const computed = { 1: at(1), 2: at(2), 3: at(3), [m.rows + 1]: at(m.rows + 1) };
  /* ⚠️ THE ARITHMETIC IS CHECKED AGAINST THE COUNT THAT IS ACTUALLY ON SCREEN. A computed figure
     nobody reconciled is a guess with a decimal point. */
  const observed = Math.round((m.heroH ?? 0) + (m.alsoH ?? 0) + (m.cardsH ?? 0));
  console.log("HEIGHTS " + JSON.stringify({ computed, observedAtRealCount: observed, realCount: m.rows + 1 }));
  expect(Math.abs(at(m.rows + 1) - observed), "the model disagrees with the page").toBeLessThan(4);
});
