/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Does the goals card render a sage band today? The source comment says it does not.
 * Asked of the browser, because a comment is not evidence.
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

test("goals card — band, mark box, structure", async ({ page }) => {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await page.waitForTimeout(1200);
  const out = await page.evaluate(() => {
    const card = document.querySelector(".os-goal") as HTMLElement | null;
    if (!card) return { error: "no .os-goal" };
    const kids = Array.from(card.children).map((k) => {
      const el = k as HTMLElement;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(), cls: el.className,
        bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 90),
        h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10,
        x: Math.round(r.x * 10) / 10, pad: cs.padding, radius: cs.borderRadius,
        borderBottom: cs.borderBottom,
      };
    });
    const cardR = card.getBoundingClientRect();
    const mark = card.querySelector(".os-goalmark, .os-mark-il") as HTMLElement | null;
    const markCs = mark ? getComputedStyle(mark) : null;
    return {
      cardBg: getComputedStyle(card).backgroundColor,
      cardPad: getComputedStyle(card).padding,
      cardBox: { x: Math.round(cardR.x), w: Math.round(cardR.width), h: Math.round(cardR.height) },
      kids,
      mark: mark ? {
        cls: mark.className, bg: markCs!.backgroundColor, border: markCs!.border,
        radius: markCs!.borderRadius,
        box: (() => { const r = mark.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      } : null,
      html: card.outerHTML.replace(/\s+/g, " ").slice(0, 700),
    };
  });
  console.log("\n" + JSON.stringify(out, null, 2));
});
