/**
 * Comparable titles v2.1 — the header and top row, measured.
 *
 * ⚠️ THE STICKY CHECK IS THE POINT. "The plate is gone" is a claim about BEHAVIOUR, and a source
 * lock cannot see it: the rule that made it sticky lives in shared chrome this page does not edit.
 * So the page is scrolled and the header's own top is read before and after.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const ROUTE = "/manuscripts/comps";

/**
 * ⚠️ TWO CASES ARE DELETED HERE, AND THEY ASSERTED A DECISION THAT HAS BEEN REVERSED.
 *
 * "the header is static, inside the sheet, and the only h1" and "nothing sticks when the page
 * scrolls" both measured this page's own header — a `.ct-pagehead` drawn in the sheet while the
 * grid was mounted `masthead={null}`. Comparable titles takes the SHARED masthead again (Nick's
 * call), so its chrome is the sticky slab and it settles on scroll like the other four scrolling
 * pages. Both cases now assert the opposite of what the page does.
 *
 * ⚠️ DELETED RATHER THAN INVERTED, because the shared masthead already has its own locks and they
 * cover this page with no carve-out: `mastheadMatrix` for both postures, `contentGeometry` for the
 * constant left offset, `stickyRow` for the slab and the settle. Rewriting them here would give one
 * guarantee two homes.
 *
 * The two cases below are this page's OWN work — the top row — and are untouched.
 */
test("the top row shares one height and the actions sit at the foot", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const tile = document.querySelector(".ct-mstile") as HTMLElement | null;
    const card = document.querySelector(".ct-toprow .ct-qline") as HTMLElement | null;
    const ctl = document.querySelector(".ct-qline-ctl") as HTMLElement | null;
    const slot = document.querySelector(".ct-qslot") as HTMLElement | null;
    if (!tile || !card || !ctl) return null;
    const t = tile.getBoundingClientRect(), c = card.getBoundingClientRect(), k = ctl.getBoundingClientRect();
    return {
      tileH: Math.round(t.height), cardH: Math.round(c.height), tileW: Math.round(t.width),
      sameRow: Math.abs(t.top - c.top) < 4,
      footGap: Math.round(c.bottom - k.bottom),
      slot: slot ? { w: Math.round(slot.getBoundingClientRect().width), h: Math.round(slot.getBoundingClientRect().height) } : null,
    };
  });
  expect(r, "the top row did not render").not.toBeNull();
  console.log(`  tile ${r!.tileW}×${r!.tileH} · card ${r!.cardH} · foot gap ${r!.footGap} · slot ${JSON.stringify(r!.slot)}`);
  expect(r!.sameRow, "the columns are not on one row").toBe(true);
  expect(Math.abs(r!.tileH - r!.cardH), "the columns do not share a height — align-items regressed").toBeLessThanOrEqual(2);
  expect(r!.tileW, "the tile is not its 320px track").toBe(320);
  expect(r!.slot, "the illustration slot is missing at desktop").not.toBeNull();
  expect(r!.slot!.w).toBe(156); expect(r!.slot!.h).toBe(118);
  /* the actions are pinned to the foot: a small, padding-sized gap, not half a card */
  expect(r!.footGap, "the actions float in the frame instead of sitting at its foot").toBeLessThanOrEqual(30);
});

test("under 980px the row stacks, tile first, and the slot hides", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 900, height: 900 });
  const r = await page.evaluate(() => {
    const tile = document.querySelector(".ct-mstile") as HTMLElement | null;
    const card = document.querySelector(".ct-toprow .ct-qline") as HTMLElement | null;
    const slot = document.querySelector(".ct-qslot") as HTMLElement | null;
    if (!tile || !card) return null;
    const t = tile.getBoundingClientRect(), c = card.getBoundingClientRect();
    return { stacked: c.top >= t.bottom - 2, tileFirst: t.top < c.top, slotDisplay: slot ? getComputedStyle(slot).display : "absent" };
  });
  expect(r, "the top row did not render at 900px").not.toBeNull();
  console.log(`  stacked=${r!.stacked} tileFirst=${r!.tileFirst} slot=${r!.slotDisplay}`);
  expect(r!.stacked, "the row did not stack").toBe(true);
  expect(r!.tileFirst, "the tile is not first when stacked").toBe(true);
  expect(r!.slotDisplay, "the slot squashes instead of hiding").toBe("none");
});
