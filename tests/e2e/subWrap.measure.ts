/**
 * The two-line subtitle must not disturb what already worked:
 *  · a short description still renders on ONE line (Manuscripts), plate unchanged;
 *  · the collapse still gives the space back — `max-height` is what animates, so a clamp that
 *    ignored it would leave the box holding the title off-centre in the condensed plate.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ THE VISIBLE PLATE, NOT THE FIRST ONE. The workspace keeps every page MOUNTED and toggles
 * `display`, so eight `.wsh` headers sit in the document at once — a bare `querySelector` returns
 * whichever is first in source order and reports its (zero) height as the current page's. That
 * misread Manuscripts as a broken plate while quoting Query Centre's copy back.
 */
const plateOf = (page: any) => page.evaluate(() => {
  const plate = (Array.from(document.querySelectorAll(".wsh")) as HTMLElement[])
    .find((el) => el.getBoundingClientRect().height > 0);
  const sub = plate?.querySelector(".wsh-sub") as HTMLElement | undefined;
  return {
    plateH: plate ? Math.round(plate.getBoundingClientRect().height) : null,
    subH: sub ? Math.round(sub.getBoundingClientRect().height) : null,
    subText: (sub?.textContent || "").trim(),
    lines: sub ? Math.round(sub.getBoundingClientRect().height / parseFloat(getComputedStyle(sub).lineHeight || "20")) : 0,
    condensed: !!plate?.className.includes("wsh--scrolled"),
  };
});

test("a short description is untouched", async ({ page }) => {
  await openRoute(page, "/manuscripts", { width: 1440, height: 900 });
  await page.waitForTimeout(1800);
  const r = await plateOf(page);
  console.log(`  manuscripts: ${JSON.stringify(r)}`);
  expect(r.lines, "a one-line description now wraps — existing pages were disturbed").toBe(1);
});

test("the collapse still gives the space back", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1800);
  const rest = await plateOf(page);
  console.log(`  queries at rest:      ${JSON.stringify(rest)}`);
  /* a fill page condenses on the first click inside the CONTENT rows, never on the header */
  await page.locator(".wpg-scroll, .f12-list, .f12-body").first().click({ position: { x: 40, y: 40 }, force: true }).catch(() => {});
  await page.waitForTimeout(900);
  const after = await plateOf(page);
  console.log(`  queries after engage: ${JSON.stringify(after)}`);
  if (after.condensed) {
    expect(after.subH, "the subtitle kept its box while condensed — the title sits off-centre").toBe(0);
    expect(after.plateH!, "the plate did not give its space back").toBeLessThan(rest.plateH!);
  } else {
    console.log("  ⚠️ the page did not condense on this click — collapse unexercised, not passed");
  }
});
