/**
 * §4 — the Tracking scroller is held clear of its header.
 *
 * ⚠️ IT ONLY FAILS WHERE IT SCROLLS. At 1440×900 this card's content fits and there is no scroller
 * at all, so the first probe found nothing and proved nothing; the fault needs a viewport short
 * enough to force one. Measured before: the scroller's top edge and the sage band's bottom at the
 * same y (430), with the stat strip flush against the band.
 *
 *   npx playwright test --project=measure qcClip
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
test("§4 — content starts clear of the sage band, and an anchored scroll clears it too", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 620 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(500);
  for (const top of [0, 40]) {
    const r = await page.evaluate((t) => {
      const card = [...document.querySelectorAll<HTMLElement>(".f12-card")].find((c) => c.querySelector(".tl-ev"));
      if (!card) return null;
      const head = card.querySelector<HTMLElement>(".f12-chh")!;
      /* whatever actually scrolls inside this card */
      const scroller = [...card.querySelectorAll<HTMLElement>("*")].find((e) => e.scrollHeight > e.clientHeight + 4 && ["auto", "scroll"].includes(getComputedStyle(e).overflowY));
      if (scroller) scroller.scrollTop = t;
      const ev = card.querySelector<HTMLElement>(".tl-ev")!;
      const mark = ev.querySelector<HTMLElement>(".tl-evmark") ?? ev;
      return {
        scrollTop: scroller ? Math.round(scroller.scrollTop) : -1,
        scroller: scroller ? String(scroller.className).slice(0, 40) : "(none)",
        scrollerTop: scroller ? Math.round(scroller.getBoundingClientRect().top) : -1,
        headBottom: Math.round(head.getBoundingClientRect().bottom),
        headPos: getComputedStyle(head).position,
        evTop: Math.round(ev.getBoundingClientRect().top),
        markTop: Math.round(mark.getBoundingClientRect().top),
        scrollMargin: getComputedStyle(ev).scrollMarginTop,
        padTop: scroller ? getComputedStyle(scroller).paddingTop : "",
      };
    }, top);
    console.log(`at scrollTop ${top}: ${JSON.stringify(r)}`);
    await page.screenshot({ path: `reports/qc/clip-${top}.png`, clip: { x: 700, y: 400, width: 620, height: 220 } });
    expect(r, "the Tracking card has no timeline to read").not.toBeNull();
    /* ⚠️ THE SCROLLER MUST EXIST, or every reading below is about a card that cannot show the fault */
    expect(r!.scroller, "no scroller — the viewport is too tall for this to prove anything").not.toBe("(none)");
    expect(r!.padTop, "the scroller sits flush against the band").not.toBe("0px");
    /* the two figures are one figure — the rest position and an anchored scroll clear the same band */
    expect(r!.scrollMargin, "an anchored scroll would park an event under the band").toBe(r!.padTop);
    if (top === 0) {
      expect(r!.evTop - r!.headBottom, `the first event begins ${r!.evTop - r!.headBottom}px below the band`).toBeGreaterThanOrEqual(10);
    }
  }
});
