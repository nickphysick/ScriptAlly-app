import { test } from "@playwright/test";
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
});
