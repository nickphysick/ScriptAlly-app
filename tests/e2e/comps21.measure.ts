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

test("the header is static, inside the sheet, and the only h1", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const grid = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
    const head = document.querySelector(".ct-pagehead") as HTMLElement | null;
    const chrome = grid?.querySelector(".wpg-chrome") as HTMLElement | null;
    if (!grid || !head) return null;
    const cs = getComputedStyle(head);
    const h = head.getBoundingClientRect();
    const row = document.querySelector(".ct-toprow") as HTMLElement | null;
    return {
      /* ⚠️ SCOPED TO THIS PAGE'S ROOT, NOT THE DOCUMENT. Workspace pages stay MOUNTED in this app —
         they toggle `display` rather than unmounting — so `document.querySelectorAll("h1")` counts
         every other route's heading too and reads 9 on a page with one. The claim is about this
         page; the selector has to be as well. */
      pageH1: document.querySelectorAll(".ctpage h1").length,
      docH1: document.querySelectorAll("h1").length,
      pos: cs.position, bg: cs.backgroundColor, shadow: cs.boxShadow,
      headL: Math.round(h.left), headTop: Math.round(h.top),
      rowL: row ? Math.round(row.getBoundingClientRect().left) : -1,
      chromeShown: chrome ? getComputedStyle(chrome).display : "absent",
      title: (head.querySelector("h1")?.textContent ?? "").trim(),
      titleColour: head.querySelector("h1") ? getComputedStyle(head.querySelector("h1")!).color : "",
    };
  });
  expect(r, "the page header did not render").not.toBeNull();
  console.log(`  header pos=${r!.pos} bg=${r!.bg} shadow=${r!.shadow}`);
  console.log(`  h1 on page=${r!.pageH1} (document total ${r!.docH1}) "${r!.title}" · chrome display=${r!.chromeShown} · head x${r!.headL} row x${r!.rowL}`);
  expect(r!.pos, "the page header is positioned — it must be static content").toBe("static");
  expect(r!.bg, "the header has a fill; it must not").toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(r!.shadow, "the header has a shadow; it must not").toBe("none");
  expect(r!.chromeShown, "the shared sticky slab still renders").toBe("none");
  expect(r!.pageH1, "this page does not have exactly one h1").toBe(1);
  /* inside the sheet: the header shares the content column's left edge, not the masthead's */
  expect(Math.abs(r!.headL - r!.rowL), "the header is not on the sheet's measure").toBeLessThanOrEqual(1);
});

test("nothing sticks when the page scrolls", async ({ page }) => {
  /* ⚠️ A SHORT VIEWPORT, DELIBERATELY. The harness account has an empty shelf, so at 1440x700 the
     page does not overflow and `scrollTop` stays 0 — and a scroll test on a page that cannot scroll
     proves nothing while looking like a pass. 420px guarantees overflow whatever the shelf holds. */
  await openRoute(page, ROUTE, { width: 1440, height: 420 });
  const r = await page.evaluate(async () => {
    /* ⚠️ SCOPED TO THIS PAGE'S ROOT. Workspace pages stay MOUNTED, so several `.wpg-scroll`
       elements exist at once and a bare query returns whichever is first in the document — a hidden
       one, with no overflow, whose `scrollTop` stays 0 for ever. The unscoped version reported "the
       page does not scroll" about a scroller with 1091px of overflow. */
    const sc = document.querySelector(".ctpage .wpg-scroll") as HTMLElement;
    const head = document.querySelector(".ctpage .ct-pagehead") as HTMLElement;
    const before = head.getBoundingClientRect().top;
    sc.scrollTop = 300;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = head.getBoundingClientRect().top;
    return { before: Math.round(before), after: Math.round(after), moved: Math.round(before - after), scrolled: sc.scrollTop };
  });
  console.log(`  header top ${r.before} → ${r.after} (moved ${r.moved}px for ${r.scrolled}px of scroll)`);
  expect(r.scrolled, "the page did not scroll — the test proves nothing").toBeGreaterThan(0);
  /* it must travel with the content: a sticky header would move 0 and clamp at the top */
  expect(r.moved, "the header did not move with the content — something is still sticky")
    .toBeGreaterThanOrEqual(r.scrolled - 2);
});

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
