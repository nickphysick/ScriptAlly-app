/**
 * COLLAPSE ON ENGAGEMENT — the gate.
 *
 * THE RULE: the header collapses when the user starts working. On a scrolling page, scrolling is
 * the signal. On a fill page, the first click inside the content area is.
 *
 * ⚠️ THE FILL SET IS READ FROM THE DOM, NOT FROM A LIST OF PAGE NAMES. `fill` is a prop, and the
 * brief's list of "the five fill pages" named Comparable titles, which does not pass it, while
 * omitting Manuscripts, which does. A named list would have tested the wrong five and passed.
 * `.wpg--fill` is the page saying so itself.
 *
 * ⚠️ NO TRANSITION SUPPRESSION HERE, AND THAT IS DELIBERATE. Every case below CHANGES STATE, and a
 * suppressed transition freezes a computed reading at its start value — the house trap. The states
 * are read after the .22s has demonstrably finished.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

const PAGES: [string, string][] = [
  ["Query Centre", "/queries"],
  ["Contact list", "/agents"],
  ["Discover", "/agents/discover"],
  ["Manuscripts", "/manuscripts"],
  ["Submission packages", "/manuscripts/packages"],
  ["Analytics", "/queries/analytics"],
  ["To-do", "/todo"],
  ["Calendar", "/todo/calendar"],
  ["Noteboard", "/todo/noteboard"],
  ["Comparable titles", "/manuscripts/comps"],
];

/** the visible grid's state — every page stays mounted, so the first in the document is a hidden one */
const state = (page: Page) => page.evaluate(() => {
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const wsh = g.querySelector(".wsh") as HTMLElement;
  const plate = g.querySelector(".wpg-plate") as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  return {
    fill: g.classList.contains("wpg--fill"),
    working: g.classList.contains("wpg--working"),
    restorable: plate.classList.contains("wpg-plate--restorable"),
    cardH: Math.round(wsh.getBoundingClientRect().height),
    cursor: getComputedStyle(plate).cursor,
    canScroll: sc.scrollHeight - sc.clientHeight > 2,
    /* the panes must keep their own scroll through every state change */
    innerScrolls: [...g.querySelectorAll("*")].some((el) => {
      const e = el as HTMLElement;
      const oy = getComputedStyle(e).overflowY;
      return (oy === "auto" || oy === "scroll") && e.scrollHeight - e.clientHeight > 2;
    }),
  };
});

/**
 * A click in the content area — and specifically in the scroll row's own GUTTER.
 *
 * ⚠️ NOT THE MIDDLE OF THE ROW, and the first version was: it landed on a manuscript card, opened
 * the dossier, and the dossier sets `condensedByMode`. The band then correctly refused to restore —
 * the page really was in a journey — and the run reported "clicking the band did not restore the
 * card" about behaviour that was right. The gutter is inside the work area and on top of nothing,
 * so what it tests is engagement alone.
 */
const clickContent = async (page: Page) => {
  const box = await page.locator(".wpg-scroll").filter({ visible: true }).first().boundingBox();
  if (!box) throw new Error("no visible scroll row");
  await page.mouse.click(box.x + 3, box.y + 6);
  await page.waitForTimeout(400);
};

test("collapse on engagement, every page", async ({ page }) => {
  const rows: Record<string, unknown>[] = [];
  for (const [label, route] of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    const rest = await state(page);
    if (!rest) { rows.push({ page: label, ERROR: "no grid" }); continue; }

    await clickContent(page);
    const clicked = await state(page);

    /* the band restores — a click on row 1 while collapsed */
    let restored = clicked!.working;
    if (clicked!.restorable) {
      const plate = await page.locator(".wpg-plate").filter({ visible: true }).first().boundingBox();
      await page.mouse.click(plate!.x + plate!.width / 2, plate!.y + plate!.height / 2);
      await page.waitForTimeout(400);
      restored = (await state(page))!.working;
    }

    /* ⚠️ A REAL NAVIGATION AWAY AND BACK. These pages never unmount, so this is the only thing that
       exercises the visit reset — a component test cannot reach it. */
    await clickContent(page);
    const beforeLeaving = (await state(page))!.working;
    await openRoute(page, route === "/todo" ? "/agents" : "/todo", { width: 1440, height: 900 });
    await openRoute(page, route, { width: 1440, height: 900 });
    await page.waitForTimeout(300);
    const afterReturn = await state(page);

    rows.push({
      page: label,
      fill: rest.fill,
      canScroll: rest.canScroll,
      restH: rest.cardH,
      restWorking: rest.working,
      afterClick: clicked!.working,
      cursor: clicked!.cursor,
      restorable: clicked!.restorable,
      afterBandClick: restored,
      leftWorking: beforeLeaving,
      onReturn: afterReturn!.working,
      panesScroll: clicked!.innerScrolls,
    });
  }
  console.log("\n══ COLLAPSE ON ENGAGEMENT ══");
  console.table(rows);

  const all = rows.filter((r) => !r.ERROR);
  const fills = all.filter((r) => r.fill);
  const scrollers = all.filter((r) => !r.fill);
  expect(fills.length, "no page reports `fill` — the reading is broken, not the pages").toBeGreaterThan(0);

  /* ⚠️ EVERY PAGE OPENS ON THE CARD. The front door is the same on all of them. */
  for (const r of all) {
    expect(r.restWorking, `${r.page}: it opens in the working state — the card is the front door`).toBe(false);
    expect(r.restH, `${r.page}: the resting header is not 128`).toBe(128);
  }

  for (const r of fills) {
    expect(r.afterClick, `${r.page}: a click in the content area did not collapse the header`).toBe(true);
    expect(r.restorable, `${r.page}: the collapsed band offers no way back`).toBe(true);
    expect(r.cursor, `${r.page}: the band is clickable with no pointer to say so`).toBe("pointer");
    expect(r.afterBandClick, `${r.page}: clicking the band did not restore the card`).toBe(false);
    expect(r.leftWorking, `${r.page}: it did not re-collapse before navigating away`).toBe(true);
    expect(r.onReturn, `${r.page}: it came back still collapsed — a fresh arrival gets the card`).toBe(false);
  }

  /* ⚠️ SCROLLING PAGES ARE UNAFFECTED — still sentinel-driven. A click must not strip one, because
     at `scrollTop 0` the sentinel says it is resting and would overwrite it on the next frame. */
  for (const r of scrollers) {
    expect(r.afterClick, `${r.page}: a click collapsed a scrolling page — it is sentinel-driven and would fight the click`).toBe(false);
    expect(r.restorable, `${r.page}: a scrolling page offers a band restore its sentinel would overwrite`).toBe(false);
  }
});
