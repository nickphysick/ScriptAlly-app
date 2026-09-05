/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drawer-3 correction — WHAT IS PAINTED at the desk's top edge, asked of the browser rather than
 * derived from rects. The bounds lock is green while the strip is invisible, so the lock is
 * asserting the wrong property: `getBoundingClientRect` describes a box, not what covers it.
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

test("paint at the desk's top edge — Nudge, 1440", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator('[data-qcc-id="cor-move-b"]').click();
  await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
  await page.locator(".qpn .tl-more").first().waitFor();
  await page.locator(".qpn-act", { hasText: "Nudge" }).first().click();
  await page.locator(".qcd-card .qrd-mail").waitFor();
  /* the frame AFTER open — place() runs in a layout effect, and a measurement taken on the same
     frame reads a .ws-window that may not have laid out yet (the brief's own suspicion) */
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  const r = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>(".qcd-card")!;
    const c = card.getBoundingClientRect();
    const cs = getComputedStyle(card);
    const stripH = parseFloat(cs.borderTopWidth);
    const h3 = card.querySelector<HTMLElement>("h3");
    const spot = card.querySelector<HTMLElement>(".qcd-spot");
    const scroll = card.querySelector<HTMLElement>(".qcd-scroll");
    const name = (el: Element | null) =>
      el ? `${el.tagName.toLowerCase()}.${(el.className || "").toString().trim().split(/\s+/).slice(0, 3).join(".")}` : "NONE";

    const at = (x: number, y: number) => ({
      xy: [Math.round(x), Math.round(y)],
      el: name(document.elementFromPoint(x, y)),
      inCard: (() => { const e = document.elementFromPoint(x, y); return !!e && card.contains(e); })(),
      stack: document.elementsFromPoint(x, y).slice(0, 4).map(name),
    });

    const chain: unknown[] = [];
    let el: HTMLElement | null = card;
    while (el && el !== document.documentElement) {
      const s = getComputedStyle(el);
      chain.push({
        el: name(el),
        overflow: `${s.overflowX}/${s.overflowY}`,
        clipPath: s.clipPath, transform: s.transform === "none" ? "none" : "SET",
        contain: s.contain, zIndex: s.zIndex, position: s.position,
        filter: s.filter === "none" ? "none" : "SET",
        top: Math.round(el.getBoundingClientRect().top),
      });
      el = el.parentElement;
    }

    return {
      card: { top: c.top, left: c.left, right: c.right, bottom: c.bottom },
      borderTopWidth: cs.borderTopWidth, borderTopColor: cs.borderTopColor,
      cardOverflow: `${cs.overflowX}/${cs.overflowY}`,
      scrollTop: scroll?.scrollTop ?? null,
      scrollPadTop: scroll ? getComputedStyle(scroll).paddingTop : null,
      /* the three probes the brief asks for */
      atStrip: at(c.left + c.width / 2, c.top + stripH / 2),
      atH3: h3 ? at(h3.getBoundingClientRect().left + 8, h3.getBoundingClientRect().top + 2) : null,
      atSpot: spot ? at(spot.getBoundingClientRect().left + spot.getBoundingClientRect().width / 2,
                        spot.getBoundingClientRect().top + 3) : null,
      h3Top: h3 ? h3.getBoundingClientRect().top : null,
      spotRect: spot ? (() => { const s2 = spot.getBoundingClientRect(); return { top: s2.top, left: s2.left, right: s2.right, bottom: s2.bottom }; })() : null,
      /* what sits ABOVE the card's top edge in the viewport — the covering suspect */
      justAbove: at(c.left + c.width / 2, c.top - 6),
      chain,
    };
  });
  console.log("PAINT " + JSON.stringify(r, null, 1));
});
