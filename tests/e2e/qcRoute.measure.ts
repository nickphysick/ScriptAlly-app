/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE PARAM IS THE SELECTION ════════════════════════════════════════════════════════════════
 *
 * ⚠️ THE PAGE OPENED STRAIGHT INTO A RECORD AND THE BACK LINK COULD NOT GET OUT. Two faults, one
 * mechanism: an effect that auto-selected the LAST-VIEWED query from storage whenever nothing was
 * selected, and the same effect never clearing when the param went away — so `← All queries`
 * removed `?q=`, the effect fell through to the restore, and re-selected the query it had just left.
 * Either alone would have hidden the grid; together the link looked inert.
 *
 * ⚠️ THIS IS A ROUND TRIP, NOT THREE SEPARATE CHECKS. Each leg was individually green at some point
 * while the page was broken — arriving with `?q=` worked, clicking a card worked — because what
 * failed was the TRANSITION out. A case that asserts the states without driving between them cannot
 * see that.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const g = [...document.querySelectorAll(".wpg.qc-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  return {
    masthead: !!g.querySelector(".wsh"),
    cards: g.querySelectorAll(".qc-card").length,
    body: !!g.querySelector(".f12-body"),
    back: !!g.querySelector(".wpg-barback"),
    who: (g.querySelector(".wpg-barwho") as HTMLElement)?.innerText?.trim() ?? null,
    q: new URLSearchParams(location.search).get("q"),
  };
});

for (const width of [1280, 1440, 1920, 2560]) {
  test(`⚠️ GRID → RECORD → GRID, AND NOTHING SELECTS IMPLICITLY — ${width}`, async ({ page }) => {
    await openRoute(page, "/queries", { width, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(1000);

    /* ── arriving with no param shows the grid ── */
    const a = await read(page);
    expect(a.q, `arriving at /queries selected a query implicitly (?q=${a.q})`).toBeNull();
    expect(a.cards, "the browsing grid rendered no cards").toBeGreaterThan(3);
    expect(a.masthead, "the grid has no masthead").toBe(true);
    expect(a.body, "the record's two-pane body rendered on the grid").toBe(false);

    /* ── a card opens the record ── */
    await page.locator(".qc-card").first().click();
    await page.waitForTimeout(1100);
    const b = await read(page);
    expect(b.q, "clicking a card did not set ?q=").toBeTruthy();
    expect(b.masthead, "the record still draws a masthead").toBe(false);
    expect(b.body, "the record did not render its two-pane body").toBe(true);
    expect(b.back, "the record's bar has no back-link").toBe(true);
    expect(b.who, "the record's bar states no name").toBeTruthy();

    /* ── and the back link returns to the grid ── */
    await page.locator(".wpg-barback").click();
    await page.waitForTimeout(1100);
    const c = await read(page);
    expect(c.q, `\`← All queries\` left ?q=${c.q} in the URL`).toBeNull();
    expect(c.cards, "the back link did not return to the grid").toBeGreaterThan(3);
    expect(c.body, "the record's body survived the back link").toBe(false);
    expect(c.masthead, "the grid's masthead did not come back").toBe(true);

    console.log(`   ${width}: grid ${a.cards} cards · record ${b.who} (?q=${b.q}) · back to ${c.cards} cards`);
  });
}
