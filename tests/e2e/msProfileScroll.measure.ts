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
  expect(rest!.overflow, "nothing overflows — 'unstuck at rest' would pass for the wrong reason")
    .toBeGreaterThan(60);
  expect(rest!.nested, "something inside the row opens a second scrollport").toBe(0);

  /* ── AT REST: sticky, but idle — not clamped ── */
  expect(rest!.scrollTop).toBe(0);
  expect(rest!.position, "the slab is not sticky at all").toBe("sticky");
  expect(rest!.stuck, "the header is stuck at scroll-top — it is clamping, not idling").toBe(false);
  expect(Math.abs(rest!.chromeTop - rest!.rowTop), "the slab is not sitting at the row's top edge")
    .toBeLessThan(6);

  /* ── AFTER SCROLLING: it sticks ── */
  await page.evaluate((sel) => { (document.querySelector(sel) as HTMLElement).scrollTop = 260; }, ROW);
  await page.waitForTimeout(350);
  const moved = await read();
  expect(moved!.scrollTop, "the row did not move").toBeGreaterThan(100);
  expect(moved!.stuck, "the header never sticks — sticky is present and doing nothing").toBe(true);

  /* ── AND BACK: it releases, so the state follows the scroll rather than latching ── */
  await page.evaluate((sel) => { (document.querySelector(sel) as HTMLElement).scrollTop = 0; }, ROW);
  await page.waitForTimeout(350);
  const back = await read();
  expect(back!.stuck, "the header latched — it stuck once and never released").toBe(false);

  console.log(JSON.stringify({ rest, moved, back }, null, 1));
});
