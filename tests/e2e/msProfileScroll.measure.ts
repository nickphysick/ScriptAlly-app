/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE SCROLLS AS A PAGE, AND ITS HEADER IS AT REST UNTIL IT DOES ═══════════════
 *
 * Manuscripts stopped being a `fill` page: the scroll row genuinely scrolls now, and the shared
 * grid pins and settles the masthead slab. This is the half of that claim no source check can make.
 *
 * ⚠️ `position: sticky` ON A NON-SCROLLING ANCESTOR DOES NOT IDLE — IT CLAMPS, permanently, at the
 * top. So "the CSS is present" proves nothing at all: a clamped header and a working one are the
 * same stylesheet. The only honest evidence is that the header is UNSTUCK at scroll-top on a real
 * render and becomes stuck after scrolling, on the same page in the same session.
 *
 * ⚠️ AND THE PRECONDITION IS ASSERTED BEFORE THE CLAIM. A row that cannot scroll would satisfy
 * "unstuck at rest" for the wrong reason and then never stick — which reads as a pass. So the
 * overflow is measured first: if there is nothing to scroll, the test says so rather than going
 * quietly green.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const ROW = ".msv-wpg .wpg-scroll";

test("the manuscripts page scrolls as a page, and its header rests before it sticks", async ({ page }) => {
  await openRoute(page, "/manuscripts", { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  // Open the first manuscript so the profile — not the library grid — is what is measured.
  const card = page.locator(".mlib-card, .mlib-open, [data-manuscript]").first();
  if (await card.count()) { await card.click(); await page.waitForTimeout(400); }

  const read = () => page.evaluate((sel) => {
    const row = document.querySelector(sel) as HTMLElement | null;
    const chrome = document.querySelector(".msv-wpg .wpg-chrome") as HTMLElement | null;
    if (!row || !chrome) return null;
    const cs = getComputedStyle(chrome);
    return {
      scrollTop: row.scrollTop,
      overflow: row.scrollHeight - row.clientHeight,
      rowOverflowY: getComputedStyle(row).overflowY,
      stuck: chrome.className.includes("wpg-chrome--stuck"),
      position: cs.position,
      top: cs.top,
      chromeTop: Math.round(chrome.getBoundingClientRect().top),
      rowTop: Math.round(row.getBoundingClientRect().top),
      // A nested scroller inside the row would mean the page still is not the thing that scrolls.
      /* The chrome above the tab rail — masthead slab plus anything between it and the tabs. This
         is the figure three amendments have been reducing; it is reported rather than asserted,
         because a target number would be a value tuned to today's content. */
      chromeAboveTabs: (() => {
        const tabs = document.querySelector(".msv-wpg .msp-tabs") as HTMLElement | null;
        if (!tabs) return null;
        return Math.round(tabs.getBoundingClientRect().top - row.getBoundingClientRect().top + row.scrollTop);
      })(),
      /* Every element inside the row that is `position: sticky` — both must idle at rest. */
      stickies: [...row.querySelectorAll("*")]
        .filter((e) => getComputedStyle(e as HTMLElement).position === "sticky")
        .map((e) => (e as HTMLElement).className.toString().slice(0, 40)),
      nested: [...row.querySelectorAll("*")].filter((e) => {
        const o = getComputedStyle(e as HTMLElement).overflowY;
        return (o === "auto" || o === "scroll") && (e as HTMLElement).scrollHeight > (e as HTMLElement).clientHeight + 4;
      }).length,
    };
  }, ROW);

  const rest = await read();
  expect(rest, "the scroll row or the chrome is not on the page").not.toBeNull();

  /* ── PRECONDITION: there is something to scroll, and the row is the thing that does it ── */
  expect(rest!.rowOverflowY, "the row is not a scroller").toMatch(/auto|scroll/);
  /**
   * ⚠️ THE FLOOR IS "SOMETHING SCROLLS", NOT A COMFORTABLE MARGIN, and the number is REPORTED rather
   * than asserted against a target. Three amendments have taken chrome off this page — the card and
   * its clip, the banner, the shelf bar, the control row — and the overflow has fallen 307 → 100 →
   * 33px. A threshold tuned to any one of those figures would have failed the next reduction as if
   * it were a regression, when a shorter page is the goal.
   *
   * ⚠️ WHAT MATTERS AT 33px IS NOT THE FIGURE BUT THE SWEEP BELOW. Settling RECLAIMS height, and on
   * a page overflowing by less than the settle reclaims, the reclaim destroys the scroll the settled
   * state derives from and the header cycles — Noteboard did it 37 times at 47px of overflow. This
   * page is now UNDER that figure, so the flip count is the only thing that answers it.
   */
  expect(rest!.overflow, "nothing overflows at all — every reading below would be vacuous")
    .toBeGreaterThan(4);
  expect(rest!.nested, "something inside the row opens a second scrollport").toBe(0);

  /* ── AT REST: sticky, but idle — not clamped ── */
  expect(rest!.scrollTop).toBe(0);
  expect(rest!.position, "the slab is not sticky at all").toBe("sticky");
  expect(rest!.stuck, "the header is stuck at scroll-top — it is clamping, not idling").toBe(false);
  expect(Math.abs(rest!.chromeTop - rest!.rowTop), "the slab is not sitting at the row's top edge")
    .toBeLessThan(6);

  /* ── AFTER SCROLLING: it sticks ── */
  /**
   * ⚠️ SCROLL TO THE ROW'S OWN MAXIMUM, NOT TO A LITERAL. Amendment 2 took ~190px out of the hero
   * (the banner) and removed the shelf bar, so the overflow fell from 307px to 89: a hard 260 in
   * this test clamped to 89 and read as "the row did not move". A number that was reachable when it
   * was written is a number that silently stops being reachable — the fault this repo records as an
   * offset encoding another element's height.
   */
  const max = rest!.overflow;
  await page.evaluate(([sel, y]) => {
    (document.querySelector(sel as string) as HTMLElement).scrollTop = y as number;
  }, [ROW, max] as const);
  await page.waitForTimeout(350);
  const moved = await read();
  /**
   * ⚠️ THE MAGNITUDE WAS A LITERAL AND THE PAGE SHRANK PAST IT — the exact fault the comment above
   * warns about, committed three lines below the warning. `> 20` was safe at 307px of overflow and
   * at 100; it is unreachable at 21, because the settle's scroll-anchoring pass lands the row at 12.
   * Measured red at the pre-amendment-4 commit too (overflow 14), so this had been failing before
   * this pack touched the page — a shorter page reading as a regression, which is what a threshold
   * tuned to yesterday's content always eventually does.
   *
   * The honest claim is that the row MOVED. Where it comes to rest is anchoring answering the
   * settle, and `msProfileEmpty.measure.ts` records that variance over repeated trials rather than
   * asserting on it: the same code returned 5, 0 and 12 on three consecutive attempts.
   */
  expect(moved!.scrollTop, "the row did not move").toBeGreaterThan(4);
  expect(moved!.stuck, "the header never sticks — sticky is present and doing nothing").toBe(true);

  /**
   * ⚠️ AND IT MUST NOT OSCILLATE. Settling RECLAIMS height; on a page that overflows by less than
   * the settle reclaims, the reclaim destroys the scroll the settled state is derived from, the
   * header releases, the height comes back, and it cycles. This repo has measured exactly that on
   * Noteboard — 37 flips on one downward pass at 47px of overflow against a 166px chrome — and this
   * page's overflow has just fallen from 307px to a figure in the same neighbourhood.
   *
   * Walked in small steps rather than jumped, because the oscillation only appears while the scroll
   * position sits near the threshold.
   */
  const flips = await page.evaluate(async (sel) => {
    const row = document.querySelector(sel) as HTMLElement;
    const chrome = document.querySelector(".msv-wpg .wpg-chrome") as HTMLElement;
    const stuckNow = () => chrome.className.includes("wpg-chrome--stuck");
    row.scrollTop = 0;
    await new Promise((r) => setTimeout(r, 400));
    let last = stuckNow();
    let n = 0;
    const seen: number[] = [];
    for (let y = 0; y <= row.scrollHeight - row.clientHeight; y += 6) {
      row.scrollTop = y;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const now = stuckNow();
      if (now !== last) { n++; seen.push(y); last = now; }
    }
    return { flips: n, at: seen, maxScroll: row.scrollHeight - row.clientHeight };
  }, ROW);
  /* One flip on a downward pass is the whole of correct behaviour: unstuck, then stuck, then held. */
  expect(flips.flips, `the header oscillated (${flips.flips} flips at ${flips.at.join(", ")})`)
    .toBeLessThanOrEqual(1);

  /* ── AND BACK: it releases, so the state follows the scroll rather than latching ── */
  await page.evaluate((sel) => { (document.querySelector(sel) as HTMLElement).scrollTop = 0; }, ROW);
  await page.waitForTimeout(350);
  const back = await read();
  expect(back!.stuck, "the header latched — it stuck once and never released").toBe(false);

  console.log(JSON.stringify({ rest, moved, back, flips }, null, 1));
});
