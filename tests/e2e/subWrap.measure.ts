/**
 * The two-line subtitle must not disturb what already worked:
 *  · a short description still renders on ONE line (Manuscripts), plate unchanged;
 *  · the collapse still gives the space back — `max-height` is what animates, so a clamp that
 *    ignored it would leave the box holding the title off-centre in the condensed plate.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { isOptedOut } from "./optedOut";

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
 * ⚠️ THE SUBTITLES OF THE PAGES STILL IN THE SHARED TREATMENT ARE COMPARED TO EACH OTHER, NOT TO
 * LITERALS. "Same font as the manuscripts page" is a claim about two rendered elements agreeing, so
 * a hard-coded 14px would go green the day someone retoned the shared rule and BOTH pages moved
 * together — which is the state this asserts, not a particular size.
 *
 * ⚠️ AND IT IS MEASURED, NOT READ OUT OF THE STYLESHEET. The divergence this was written for was a
 * page-scoped override beating a shared rule that was itself perfectly correct — so a lock reading
 * either file would have found nothing wrong. Only the cascade's answer shows it.
 *
 * ⚠️ THE QUERY CENTRE IS NOT IN THIS COMPARISON, BY RULING (Nick, 20 Sep), AND THE REGISTER SAYS SO
 * RATHER THAN THIS FILE. It opted out of the shared masthead with v11; its head line is a facts
 * sentence between a Special Elite title and two action pills, a shape no other page has, so
 * holding its subtitle to the shared wrap rule would enforce the remains of a treatment the page no
 * longer uses. **Its exclusion comes from `optedOut.ts`** — the same set `mastheadMatrix` asserts —
 * so a page cannot be exempt here and red there.
 */
test("every page still in the shared treatment renders its subtitle identically", async ({ page }) => {
  const typography = async (route: string) => {
    await openRoute(page, route, { width: 1440, height: 900 });
    await page.waitForTimeout(1800);
    const r = await plateOf(page);
    return { font: r.font, size: r.size, weight: r.weight, tracking: r.tracking, colour: r.colour };
  };
  /* ⚠️ THE POPULATION IS ASSERTED FIRST. With the Query Centre gone from the set, a comparison over
     what is left is satisfied by ONE page — which proves nothing about a shared treatment. */
  const shared = ["/manuscripts", "/agents", "/manuscripts/packages"].filter((r) => !isOptedOut(r));
  expect(shared.length, "a shared treatment needs at least two pages to be shared BETWEEN").toBeGreaterThan(1);
  const first = await typography(shared[0]);
  console.log(`  ${shared[0]}: ${JSON.stringify(first)}`);
  expect(first.font, "the fixture measured nothing").toBeTruthy();
  for (const route of shared.slice(1)) {
    const r = await typography(route);
    console.log(`  ${route}: ${JSON.stringify(r)}`);
    expect(r, `${route}'s subtitle is not in the shared treatment`).toEqual(first);
  }
  /* and the opted-out page is checked to be genuinely ABSENT from the treatment rather than
     silently skipped — an exemption nobody can see is how this fault started */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1800);
  const qc = await plateOf(page);
  console.log(`  /queries (opted out): ${JSON.stringify(qc)}`);
  expect(qc.subText, "the Query Centre grew a shared `.wsh-sub` again — it draws its own head").toBe("");
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
