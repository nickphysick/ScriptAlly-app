/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics — the fixed-viewport chain, measured on a real page.
 *
 * ⚠️ THE QUESTION THIS EXISTS TO SETTLE, AND IT CANNOT BE REASONED OUT. `/queries/analytics` was
 * the one grid page whose `StagePage` slot was `layout="flow"` — `display: block`, no `flex: 1` —
 * while every sibling passed `fill` or `fillColumn`. Under it `.qa-wrap` asks for `height: 100%`
 * against that slot, and `.qa-wpg` says `flex: 1; min-height: 0`. That is the exact shape this
 * codebase has watched compute wrongly twice (`.tpl-cols`, `.f12-body`), and both times it hid
 * behind content that happened to size the container.
 *
 * ⚠️ AND THE FIRST VERSION OF THIS FILE PASSED WHILE THE PAGE WAS BROKEN, which is why the tall
 * probe below is the point of it. Measured on the empty page at 1600×900: grid 439px, row 3 the
 * scroller, page scroll 0 — every assertion green, and the reading was a coincidence of the
 * content being short. Injecting 3000px showed what was really there: `.qa-wrap` 3469px, row 3's
 * own scrollable range ZERO, and the shell's `.ws-wbody` absorbing 2659px — the pinned plate
 * scrolling away with the content, on a page whose whole design is that it does not.
 *
 * THE RULE THIS RECORDS: a scroll assertion on a page that does not currently overflow asserts
 * nothing. Make it overflow, then ask which element took the scroll.
 *
 * ⚠️ IT RUNS AGAINST WHATEVER `SA_E2E_BASE_URL` NAMES. The suite's default is the deployed dev
 * site, deliberately; this was written against a local server while the page is unshipped, and
 * that difference is stated here rather than left for a reader to infer. Re-run it against the
 * deployed site once the page is live.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

const ROUTE = "/queries/analytics";
const PROBE_ID = "an-tall-probe";
const PROBE_PX = 3000;

test("Analytics: row 3 is the scroller, at rest and under content that overflows it", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 1600, height: 900 }]) {
    await openRoute(page, ROUTE, viewport);

    const rest = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const box = (el: HTMLElement | null) =>
        el ? { h: el.offsetHeight, scrollH: el.scrollHeight, clientH: el.clientHeight } : null;
      const scroller = q(".qa-wpg .wpg-scroll");
      const strip = q(".an-strip");
      return {
        viewportH: window.innerHeight,
        work: box(q(".ws-work")),
        wrap: box(q(".qa-wrap")),
        grid: box(q(".qa-wpg")),
        plate: box(q(".qa-wpg .wpg-plate")),
        scroll: box(scroller),
        /* ⚠️ THE RECT IS CHECKED BEFORE ANYTHING IS CONCLUDED FROM IT. A measurement of an element
           the browser never laid out on screen is not a measurement. */
        stripRect: strip ? strip.getBoundingClientRect().toJSON() : null,
        footPad: scroller ? getComputedStyle(scroller).paddingBottom : null,
        dockRect: (() => { const d = q(".sa-fbdock"); return d ? d.getBoundingClientRect().toJSON() : null; })(),
      };
    });

    const bar = await scrollbarWidth(page);
    // eslint-disable-next-line no-console
    console.log(`\n── ${viewport.width}×${viewport.height} · scrollbar ${bar}px · REST ──\n${JSON.stringify(rest, null, 2)}`);

    /* ⚠️ THE WRAPPER FILLS THE SLOT RATHER THAN ITS CONTENT — the whole difference `layout="fill"`
       makes, and the reading that separates a working chain from one that merely looks like one.
       Content-sized is the fault; equal to the work wrapper is correct. */
    expect(rest.wrap, "no `.qa-wrap` — the page did not render").not.toBeNull();
    expect(rest.wrap!.h, "the page wrapper is content-sized, not filling the fixed-viewport work wrapper")
      .toBe(rest.work!.h);
    expect(rest.grid!.h, "the grid measures nothing — the height chain stopped resolving above it")
      .toBeGreaterThan(200);
    expect(rest.scroll!.clientH, "row 3 has no height — nothing on the page can scroll").toBeGreaterThan(100);

    /* the plate sits OUTSIDE the scrollport: the two rows partition the grid */
    expect(rest.plate!.h + rest.scroll!.h, "the plate is inside the scroller — the chrome is not pinned")
      .toBeLessThanOrEqual(rest.grid!.h + 2);

    /* the page's own contribution to the scroller's foot, clearing the floating feedback dock */
    expect(rest.footPad, "the feedback-dock clearance is not being contributed").toBe("132px");

    /* ⚠️ NOW MAKE IT OVERFLOW, AND ASK WHICH ELEMENT TOOK THE SCROLL. Everything above is true of
       a broken page too. */
    const tall = await page.evaluate(({ id, px }) => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const scroller = q(".qa-wpg .wpg-scroll")!;
      const probe = document.createElement("div");
      probe.id = id;
      probe.style.height = `${px}px`;
      scroller.appendChild(probe);
      const work = q(".ws-work");
      const body = q(".ws-wbody");
      const doc = document.scrollingElement as HTMLElement;
      const reading = {
        wrap: q(".qa-wrap")!.offsetHeight,
        rowCanScroll: scroller.scrollHeight - scroller.clientHeight,
        workCanScroll: work ? work.scrollHeight - work.clientHeight : null,
        bodyCanScroll: body ? body.scrollHeight - body.clientHeight : null,
        docCanScroll: doc.scrollHeight - doc.clientHeight,
        plateBottom: q(".qa-wpg .wpg-plate")!.getBoundingClientRect().bottom,
      };
      probe.remove();
      return reading;
    }, { id: PROBE_ID, px: PROBE_PX });

    // eslint-disable-next-line no-console
    console.log(`── ${viewport.width}×${viewport.height} · +${PROBE_PX}px ──\n${JSON.stringify(tall, null, 2)}`);

    expect(tall.rowCanScroll, "row 3 did not take the overflow — something above it grew instead")
      .toBeGreaterThan(PROBE_PX / 2);
    expect(tall.workCanScroll, "the work wrapper scrolls, so the plate rides away with the content").toBe(0);
    expect(tall.bodyCanScroll, "the shell's body scrolls — the page grew past its row").toBe(0);
    expect(tall.docCanScroll, "the document scrolls — this page is not fixed-viewport at all").toBeLessThanOrEqual(2);
    expect(tall.wrap, "the wrapper grew with its content instead of holding the row's height").toBe(rest.work!.h);
  }
});
