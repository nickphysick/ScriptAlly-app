/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ITEM 1 — why does a row show through the stuck group band? Three candidate causes and the page
 * decides between them: an ABSENT fill, a TRANSLUCENT one, or an opaque band that simply does not
 * reserve the space a scrolled-to row needs (`scroll-padding-top`).
 */
import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

test.setTimeout(300_000);

test("item 1 — what is actually wrong with the sticky band", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);

  /* scroll the list far enough that the second group's head is stuck */
  await page.evaluate(() => {
    const sc = document.querySelector(".tpl-zone") as HTMLElement | null;
    /* ⚠️ MID-LIST, NOT THE BOTTOM. At the bottom the last band is at its natural rest and nothing
       passes it — which is a reading about a band that is not stuck. */
    if (sc) sc.scrollTop = Math.round(sc.scrollHeight * 0.45);
  });
  await page.waitForTimeout(400);

  const out = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const heads = [...document.querySelectorAll(".tdg-shd")].filter(vis) as HTMLElement[];
    const sc = document.querySelector(".tpl-zone") as HTMLElement | null;
    const read = (h: HTMLElement) => {
      const cs = getComputedStyle(h);
      const r = h.getBoundingClientRect();
      /* ⚠️ THE PROBE'S POINT MUST BE ON SCREEN or elementsFromPoint returns [] and every
         assertion over it passes vacuously. Checked before it is asked. */
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const onScreen = y > 0 && y < innerHeight && x > 0 && x < innerWidth;
      return {
        text: (h.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30),
        bg: cs.backgroundColor,
        opacity: cs.opacity,
        zIndex: cs.zIndex,
        position: cs.position,
        rect: { top: Math.round(r.top), h: Math.round(r.height), left: Math.round(r.left), w: Math.round(r.width) },
        onScreen,
        /* what is actually painted at the band's centre — the band, or a row through it? */
        stack: onScreen ? [...document.elementsFromPoint(x, y)].slice(0, 3).map((e) => e.className || e.tagName) : [],
        /* and at the band's very top edge, where a row arriving would collide */
        stackTop: onScreen ? [...document.elementsFromPoint(x, r.top + 2)].slice(0, 3).map((e) => e.className || e.tagName) : [],
      };
    };
    /* ⚠️ A VERTICAL STRIP THROUGH THE STUCK BAND — the decisive reading. If a row is painted
       ABOVE the band while the band is stuck, the gap is transparent and rows show through it. */
    const strip: Record<string, string> = {};
    if (heads[0]) {
      const r = heads[0].getBoundingClientRect();
      const x = r.left + r.width / 2;
      for (const dy of [-20, -12, -6, -2, 2, r.height / 2, r.height - 2, r.height + 2, r.height + 6]) {
        const y = r.top + dy;
        if (y < 0 || y > innerHeight) { strip[String(Math.round(dy))] = "OFFSCREEN"; continue; }
        const top = document.elementsFromPoint(x, y)[0];
        strip[String(Math.round(dy))] = (top?.className || top?.tagName || "none").toString().slice(0, 34);
      }
    }
    return {
      strip,
      scroller: sc ? {
        cls: sc.className,
        scrollPaddingTop: getComputedStyle(sc).scrollPaddingTop,
        scrollTop: Math.round(sc.scrollTop),
      } : null,
      heads: heads.map(read),
    };
  });
  console.log(JSON.stringify(out, null, 2));
  await page.screenshot({ path: "reports/pane/sticky-band.png", clip: { x: 360, y: 230, width: 540, height: 500 } });
});
