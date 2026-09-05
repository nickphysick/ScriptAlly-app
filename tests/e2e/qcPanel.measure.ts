import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
test.setTimeout(300_000);
test("the Query Centre's panel — computed ground and bottom gap", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1920, height: 1000 });
  await page.waitForTimeout(1200);
  console.log("QC:", JSON.stringify(await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const cards = [...document.querySelectorAll(".f12-card")].filter(vis) as HTMLElement[];
    if (!cards.length) return { cards: 0 };
    const cs = getComputedStyle(cards[0]);
    const lowest = cards.reduce((a, b) => (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a));
    // the sheet the panels sit in
    const sheet = (document.querySelector(".wpg-scroll") ?? document.querySelector(".f12-root")) as HTMLElement | null;
    const sb = sheet?.getBoundingClientRect();
    return {
      cards: cards.length,
      background: cs.backgroundColor, border: cs.borderTopWidth + " " + cs.borderTopColor,
      radius: cs.borderRadius, shadow: cs.boxShadow,
      insideQpCols: !!cards[0].closest(".qp-cols"),
      lowestBottom: Math.round(lowest.getBoundingClientRect().bottom),
      sheetBottom: sb ? Math.round(sb.bottom) : null,
      bottomGap: sb ? Math.round(sb.bottom - lowest.getBoundingClientRect().bottom) : null,
      viewportH: window.innerHeight,
    };
  }), null, 2));
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await page.waitForTimeout(800);
  console.log("TODO:", JSON.stringify(await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    const card = g(".tdk-w"); const split = g(".tdw-split"); const scroll = g(".wpg-scroll");
    if (!card || !scroll) return null;
    return {
      cardBottom: Math.round(card.getBoundingClientRect().bottom),
      cardHeight: Math.round(card.getBoundingClientRect().height),
      splitBottom: split ? Math.round(split.getBoundingClientRect().bottom) : null,
      sheetBottom: Math.round(scroll.getBoundingClientRect().bottom),
      bottomGap: Math.round(scroll.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom),
      paneH: Math.round((g(".tdw-work")?.getBoundingClientRect().height) ?? 0),
      headH: Math.round((g(".tdk-head")?.getBoundingClientRect().height) ?? 0),
    };
  }), null, 2));

  /* ⚠️ THE TWO GAPS ARE ASSERTED AGAINST EACH OTHER, NEVER AGAINST 32. A literal would go green the
     day the Query Centre's own gap moved, which is the exact drift this item exists to close. */
  const qc = await (async () => { await openRoute(page, "/queries", { width: 1920, height: 1000 }); await page.waitForTimeout(1000);
    return page.evaluate(() => {
      const vis = (e: Element) => e.getBoundingClientRect().height > 0;
      const cards = [...document.querySelectorAll(".f12-card")].filter(vis) as HTMLElement[];
      const sheet = document.querySelector(".wpg-scroll") as HTMLElement | null;
      if (!cards.length || !sheet) return null;
      const low = cards.reduce((a, b) => (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a));
      return Math.round(sheet.getBoundingClientRect().bottom - low.getBoundingClientRect().bottom);
    }); })();
  /* ⚠️ RE-ANCHORED AND DE-VACUATED (drawer round, Phase 7). This case had been passing as
     `null === null`: `.tdk-w` was retired from /todo rounds ago and `.f12-card` from /queries by
     the log-sheet stream's rebuild, so BOTH halves returned null and the equality held over
     nothing — the exact silent-green the presumed-vacuous rule exists for, found by probing the
     populations. The recon's `.ws` suspicion was confirmed too (no such match), but the vacuity
     was the real finding. The To-do half now reads `.tlc`, the live list card. */
  const todo = await (async () => { await openRoute(page, "/todo", { width: 1920, height: 1000 }); await page.waitForTimeout(800);
    return page.evaluate(() => {
      const vis = (e: Element) => e.getBoundingClientRect().height > 0;
      const card = [...document.querySelectorAll(".tlc")].find(vis) as HTMLElement | undefined;
      const sheet = [...document.querySelectorAll(".wpg-scroll")].find(vis) as HTMLElement | undefined;
      if (!card || !sheet) return null;
      return Math.round(sheet.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom);
    }); })();
  console.log(`BOTTOM GAP — Query Centre ${qc}px · To-do ${todo}px`);
  /* ⚠️ THE POPULATIONS ARE ASSERTED, SO ABSENCE IS LOUD. The To-do reading must exist. The Query
     Centre's card class is MID-REBUILD by the log-sheet stream — until their round names it, this
     case is RED BY DESIGN with this message rather than green over nothing: a parity claim with
     one leg is not a claim, and the silent form of that is what this repair replaces. Re-anchor
     the `.f12-card` selector to their new card when their round lands; the law (the two pages'
     bottom rhythm agrees) is unchanged. */
  expect(todo, "the To-do half is unmeasurable — .tlc or .wpg-scroll missing").not.toBeNull();
  expect(qc, "the Query Centre half is unmeasurable — its card class is mid-rebuild (log-sheet stream); re-anchor .f12-card to the new card when their round lands").not.toBeNull();
  expect(todo, `the two pages' bottom gaps differ (QC ${qc}, To-do ${todo})`).toBe(qc);
});
