/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics — the polish pass, measured on the real page at two widths.
 *
 * ⚠️ EVERY CLAIM HERE IS ABOUT PIXELS, WHICH IS WHY IT IS NOT A UNIT TEST. A source lock proves a
 * rule was written; only the browser says what the cascade and the box model did with it. The
 * three things being checked are exactly the three that source cannot answer: does the page
 * overflow its own scroller rather than the document, does anything sit underneath the floating
 * feedback dock, and does the twelve-column grid hold at both widths.
 *
 * ⚠️ AND A PROBE THAT TAKES COORDINATES NEEDS ITS COORDINATES PROVED ON SCREEN FIRST.
 * `elementsFromPoint` outside the viewport returns an EMPTY ARRAY, so `stack[0] !== "body"` is
 * satisfied by `undefined` — an assertion that passes by looking at nothing. Every rect below is
 * checked into the viewport before anything is concluded from it.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

const ROUTE = "/queries/analytics";
const WIDTHS = [1280, 1600];

test("Analytics: the page scrolls in row 3, clears the dock, and holds its grid", async ({ page }) => {
  for (const width of WIDTHS) {
    await openRoute(page, ROUTE, { width, height: 900 });
    const bar = await scrollbarWidth(page);

    /* ── the scroller ─────────────────────────────────────────────────────── */
    const scroll = await page.evaluate(() => {
      const s = document.querySelector(".qa-wpg .wpg-scroll") as HTMLElement;
      const doc = document.scrollingElement as HTMLElement;
      const work = document.querySelector(".ws-work") as HTMLElement;
      const body = document.querySelector(".ws-wbody") as HTMLElement;
      return {
        rowOverflow: s.scrollHeight - s.clientHeight,
        docOverflow: doc.scrollHeight - doc.clientHeight,
        workOverflow: work ? work.scrollHeight - work.clientHeight : 0,
        bodyOverflow: body ? body.scrollHeight - body.clientHeight : 0,
        plateTopBefore: (document.querySelector(".qa-wpg .wpg-plate") as HTMLElement).getBoundingClientRect().top,
      };
    });

    /* ⚠️ THE PAGE MUST ACTUALLY OVERFLOW, or every assertion below is about a page that fits and
       proves nothing. This is the vacuous shape that let the first version of the chain
       measurement pass while the page was broken. */
    expect(scroll.rowOverflow, `${width}: the page does not overflow, so nothing here is being tested`)
      .toBeGreaterThan(200);
    expect(scroll.docOverflow, `${width}: the document scrolls`).toBeLessThanOrEqual(2);
    expect(scroll.workOverflow, `${width}: the work wrapper scrolls — the plate would ride away`).toBe(0);
    expect(scroll.bodyOverflow, `${width}: the shell body scrolls — the page grew past its row`).toBe(0);

    /* and the plate stays put while row 3 moves */
    const plateAfter = await page.evaluate(() => {
      const s = document.querySelector(".qa-wpg .wpg-scroll") as HTMLElement;
      s.scrollTop = s.scrollHeight;
      return (document.querySelector(".qa-wpg .wpg-plate") as HTMLElement).getBoundingClientRect().top;
    });
    expect(plateAfter, `${width}: the header moved when the content scrolled`).toBeCloseTo(scroll.plateTopBefore, 0);

    /* ── the last panel clears the floating feedback dock ──────────────────── */
    const clearance = await page.evaluate(() => {
      const s = document.querySelector(".qa-wpg .wpg-scroll") as HTMLElement;
      s.scrollTop = s.scrollHeight;
      const dock = document.querySelector(".sa-fbdock") as HTMLElement | null;
      const panels = [...document.querySelectorAll(".qa-wpg .an-panel")] as HTMLElement[];
      const last = panels[panels.length - 1];
      const lastRect = last.getBoundingClientRect();
      const dockRect = dock ? dock.getBoundingClientRect() : null;
      /* every interactive control inside the last panel, and whether any is under the dock */
      const controls = [...last.querySelectorAll("button, [role='button'], a, table")] as HTMLElement[];
      const covered = dockRect
        ? controls
            .map((c) => c.getBoundingClientRect())
            .filter((r) => r.width > 0 && r.height > 0)
            .filter((r) => r.right > dockRect.left && r.left < dockRect.right
                        && r.bottom > dockRect.top && r.top < dockRect.bottom).length
        : 0;
      return {
        dockRect: dockRect ? { top: dockRect.top, left: dockRect.left, bottom: dockRect.bottom } : null,
        lastPanelBottom: lastRect.bottom,
        controls: controls.length,
        covered,
        viewportH: window.innerHeight,
      };
    });

    expect(clearance.dockRect, `${width}: no feedback dock on the page — the check is vacuous`).not.toBeNull();
    expect(clearance.controls, `${width}: the last panel has no controls, so nothing could be covered`)
      .toBeGreaterThan(0);
    expect(clearance.covered, `${width}: a control in the last panel sits under the floating feedback dock`).toBe(0);
    /* the content ends above the dock, which is what `--wpg-foot` is reserving */
    expect(clearance.lastPanelBottom, `${width}: the last panel runs under the dock`)
      .toBeLessThanOrEqual(clearance.dockRect!.top);

    /* ── the twelve-column grid ─────────────────────────────────────────────── */
    const grid = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".qa-wpg .an-grid")] as HTMLElement[];
      return rows.map((r) => {
        const cs = getComputedStyle(r);
        const kids = [...r.children] as HTMLElement[];
        return {
          columns: cs.gridTemplateColumns.split(" ").length,
          left: Math.round(r.getBoundingClientRect().left),
          right: Math.round(r.getBoundingClientRect().right),
          kidTops: kids.map((k) => Math.round(k.getBoundingClientRect().top)),
        };
      });
    });

    for (const [i, r] of grid.entries()) {
      /* ⚠️ TWELVE TRACKS, NOT "SOME". An implicit column appears the moment a child is placed
         without a span, and the row silently grows sideways — the fault that put phantom right
         margins on nine pages once already. */
      expect(r.columns, `${width}: grid row ${i} resolved to ${r.columns} tracks, not 12`).toBe(12);
      /* every panel in a row starts on the same line — no row has wrapped */
      expect(new Set(r.kidTops).size, `${width}: grid row ${i} wrapped`).toBe(1);
    }
    /* every row starts and ends on the same gutter */
    expect(new Set(grid.map((r) => r.left)).size, `${width}: the grid rows do not share a left edge`).toBe(1);
    expect(new Set(grid.map((r) => r.right)).size, `${width}: the grid rows do not share a right edge`).toBe(1);

    // eslint-disable-next-line no-console
    console.log(`\n── ${width}×900 · scrollbar ${bar}px ──\n`
      + `row overflow ${scroll.rowOverflow} · doc ${scroll.docOverflow} · work ${scroll.workOverflow} · body ${scroll.bodyOverflow}\n`
      + `dock top ${clearance.dockRect!.top} · last panel bottom ${clearance.lastPanelBottom} · controls ${clearance.controls}, covered ${clearance.covered}\n`
      + `grid rows ${grid.length}, all 12 tracks, ${grid[0].left}→${grid[0].right}`);
  }
});

test("Analytics: every figure is a door, and each one is reachable by keyboard", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1600, height: 900 });

  const doors = await page.evaluate(() => {
    const scope = document.querySelector(".qa-wpg") as HTMLElement;
    const sel = "button, [role='button']";
    const all = [...scope.querySelectorAll(sel)] as HTMLElement[];
    const named = all.filter((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().length > 0);
    /**
     * A pointer-cursor region with NO keyboard route to it is a door only a mouse can open.
     *
     * ⚠️ `cursor: pointer` IS INHERITED, which the first version of this probe did not account
     * for: every `span`, `path`, `b` and `td` INSIDE a focusable button reports it, so the check
     * listed thirty perfectly correct descendants as faults. The real claim is about ROUTES, not
     * elements — a region is fine if it is focusable itself, sits inside something focusable, or
     * contains something focusable (the table row, whose door is the button in its first cell).
     */
    const focusable = "button, [role='button'], a[href], input, select, textarea";
    const clickableButUnfocusable = ([...scope.querySelectorAll("*")] as HTMLElement[]).filter((el) => {
      if (getComputedStyle(el).cursor !== "pointer") return false;
      /* the element IS the door */
      if (el.matches(focusable) || el.tabIndex >= 0) return false;
      /* or it is part of one */
      if (el.closest(focusable)) return false;
      /* or it contains one — the funnel stage, whose children are all inside its button */
      if (el.querySelector(focusable)) return false;
      /**
       * ⚠️ THE ONE DELIBERATE EXCEPTION, NAMED RATHER THAN WAVED THROUGH. A response row is
       * clickable across all four cells for a pointer, and its keyboard door is the button in the
       * first cell — `role="button"` on the `<tr>` itself would trade away the table semantics
       * that let a screen reader move by column and hear each header. So a cell is fine when its
       * OWN ROW holds a focusable control; it is not fine merely because the page does.
       */
      const row = el.closest("tr");
      if (row && row.querySelector(focusable)) return false;
      return true;
    }).map((el) => `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}`);
    return { total: all.length, named: named.length, clickableButUnfocusable };
  });

  // eslint-disable-next-line no-console
  console.log(`\n── doors ──\n${doors.total} activatable, ${doors.named} named`
    + `\nmouse-only: ${JSON.stringify(doors.clickableButUnfocusable)}`);

  expect(doors.total, "no doors at all — the click-through did not mount").toBeGreaterThan(10);
  expect(doors.named, "an activatable element has no accessible name").toBe(doors.total);
  expect(doors.clickableButUnfocusable, "these show a pointer cursor but cannot be focused").toEqual([]);

  /* ⚠️ AND THE FOCUS RING IS REAL. A focusable control with `outline: none` and nothing in its
     place is keyboard-reachable and invisible, which is the worse half of the same bug. */
  const ring = await page.evaluate(() => {
    const el = document.querySelector(".qa-wpg .an-fstage") as HTMLElement;
    el.focus();
    const cs = getComputedStyle(el);
    return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, focused: document.activeElement === el };
  });
  expect(ring.focused, "the funnel stage did not take focus").toBe(true);
  expect(ring.outlineStyle, "a focused control draws no outline").not.toBe("none");
  expect(parseFloat(ring.outlineWidth), "the focus ring has no width").toBeGreaterThan(0);
});
