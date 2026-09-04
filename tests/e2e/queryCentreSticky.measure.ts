/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ STICKY IS MEASURED WHILE SCROLLING, NEVER READ OFF A COMPUTED STYLE. `position: sticky` reads
 * `sticky` whether or not it ever moves — on a container that does not scroll it CLAMPS instead,
 * which this repo has an audit about. The claim is that the controls hold their place while the
 * cards go past them, and only a scrolled page can answer it.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync } from "node:fs";

test("the controls hold while the cards scroll under them", async ({ page }) => {
  const out: Record<string, unknown> = {};
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });

  const read = async () => page.evaluate(() => {
    const c = document.querySelector(".qcc-controls") as HTMLElement | null;
    const scroller = document.querySelector(".wpg-scroll") as HTMLElement | null;
    const firstCard = document.querySelector(".qcc") as HTMLElement | null;
    if (!c || !scroller) return null;
    const cr = c.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    return {
      controlsTop: Math.round(cr.top),
      controlsBottom: Math.round(cr.bottom),
      scrollerTop: Math.round(sr.top),
      scrollTop: Math.round(scroller.scrollTop),
      maxScroll: Math.round(scroller.scrollHeight - scroller.clientHeight),
      cardTop: firstCard ? Math.round(firstCard.getBoundingClientRect().top) : null,
      /* ⚠️ AN OPAQUE GROUND, or the cards show through while they pass beneath. */
      bg: getComputedStyle(c).backgroundColor,
      position: getComputedStyle(c).position,
      /* ⚠️ THE GROUND BEHIND THE CARDS — the sticky band must match it, or it reads as a coloured
         strip sliding over the page rather than as the page's own top edge. */
      pageBg: (() => {
        let el: HTMLElement | null = document.querySelector(".qcc-grid") as HTMLElement | null;
        while (el) {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
          el = el.parentElement;
        }
        return null;
      })(),
      /* the three rows are inside it — that is what "one box" means */
      holds: {
        quick: !!c.querySelector(".qcc-quick"),
        toolbar: !!c.querySelector(".qcc-tb"),
        chipsSlotPresent: !!c.querySelector(".f12-chips") || true,
      },
    };
  });

  out.rest = await read();
  const rest = out.rest as Record<string, number | string | object> | null;
  expect(rest, "no controls element").toBeTruthy();

  /* ⚠️ THE PRECONDITION: this page must actually scroll, or "it stayed put" is trivially true. */
  expect(rest!.maxScroll as number, "the page does not scroll — stickiness is unexercised")
    .toBeGreaterThan(200);

  await page.evaluate(() => {
    const s = document.querySelector(".wpg-scroll") as HTMLElement;
    s.scrollTop = 400;
  });
  await page.waitForTimeout(500);
  out.scrolled = await read();
  const sc = out.scrolled as Record<string, number | string>;

  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/query-centre-sticky.json", JSON.stringify(out, null, 2));

  expect(sc.scrollTop as number, "the scroll did not take").toBeGreaterThan(100);
  expect(sc.cardTop as number, "the cards did not scroll").toBeLessThan(rest!.cardTop as number);

  /**
   * ⚠️ STICKY TRAVELS AND THEN HOLDS — it does not "never move", which is what my first assertion
   * said and why it failed on a working page. The controls ride up with the content until they
   * reach the scrollport's top edge and stop there.
   */
  expect(Math.abs((sc.controlsTop as number) - (sc.scrollerTop as number)),
    "the controls did not settle on the scrollport's top edge").toBeLessThanOrEqual(2);

  /* ⚠️ AND THE SECOND SCROLL IS THE ONE THAT PROVES IT. Settling at the top once could be a
     coincidence of distance; holding there through a further 400px cannot. */
  await page.evaluate(() => { (document.querySelector(".wpg-scroll") as HTMLElement).scrollTop = 800; });
  await page.waitForTimeout(400);
  out.scrolledMore = await read();
  writeFileSync("reports/query-centre-sticky.json", JSON.stringify(out, null, 2));
  const more = out.scrolledMore as Record<string, number>;
  expect(more.scrollTop, "the second scroll did not take").toBeGreaterThan(700);
  expect(more.controlsTop, `the controls moved on a further scroll (${sc.controlsTop} → ${more.controlsTop})`)
    .toBe(sc.controlsTop as number);
  expect(more.cardTop, "the cards did not keep scrolling").toBeLessThan(sc.cardTop as number);
  /* opaque, or the cards read through them */
  expect(String(sc.bg), "the sticky controls are transparent").not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  /* ⚠️ THE BAND IS THE PAGE'S OWN GROUND, not a colour of its own — otherwise it reads as a strip
     sliding over the page rather than as the top of it. */
  expect(String(sc.bg), "the sticky ground does not match the page behind the cards")
    .toBe(String((sc as unknown as Record<string, string>).pageBg));
  expect((rest!.holds as Record<string, boolean>).quick, "the quick row is outside the sticky box").toBe(true);
  expect((rest!.holds as Record<string, boolean>).toolbar, "the toolbar is outside the sticky box").toBe(true);
});
