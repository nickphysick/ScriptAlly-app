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
    font: sub ? getComputedStyle(sub).fontFamily : "",
    size: sub ? getComputedStyle(sub).fontSize : "",
    weight: sub ? getComputedStyle(sub).fontWeight : "",
    tracking: sub ? getComputedStyle(sub).letterSpacing : "",
    colour: sub ? getComputedStyle(sub).color : "",
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

/**
 * ⚠️ THE TWO SUBTITLES ARE COMPARED TO EACH OTHER, NOT TO LITERALS. "Same font as the manuscripts
 * page" is a claim about two rendered elements agreeing, so a hard-coded 14px would go green the
 * day someone retoned the shared rule and BOTH pages moved together — which is the state this
 * asserts, not a particular size.
 *
 * ⚠️ AND IT IS MEASURED, NOT READ OUT OF THE STYLESHEET. The divergence was a page-scoped override
 * (`.qc-wpg .wsh-sub`, mono 11px, left behind by the retired counts) beating a shared rule that was
 * itself perfectly correct — so a lock reading either file would have found nothing wrong. Only the
 * cascade's answer shows it.
 */
test("both pages' subtitles render identically", async ({ page }) => {
  const typography = async (route: string) => {
    await openRoute(page, route, { width: 1440, height: 900 });
    await page.waitForTimeout(1800);
    const r = await plateOf(page);
    return { font: r.font, size: r.size, weight: r.weight, tracking: r.tracking, colour: r.colour };
  };
  const manuscripts = await typography("/manuscripts");
  const queries = await typography("/queries");
  console.log(`  manuscripts: ${JSON.stringify(manuscripts)}`);
  console.log(`  queries:     ${JSON.stringify(queries)}`);
  expect(manuscripts.font, "the fixture measured nothing").toBeTruthy();
  expect(queries, "Query Centre's subtitle is not in the shared treatment").toEqual(manuscripts);
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
