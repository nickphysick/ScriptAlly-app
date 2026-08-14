/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE POLISH PACK'S GATES, measured on the deployed dev build.
 *
 * ⚠️ THE THINGS HERE ARE THE ONES SOURCE CANNOT ANSWER: what a box measures, whether two columns
 * are symmetrically inset, whether a click collapses something, whether the page scrolls. Every
 * gate that IS answerable from source — the shared derivations, the button rule, the copy — is
 * locked in `src/lib/queryCentrePolish.test.ts` and its siblings, and is not repeated here.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("gate — the two columns are symmetrically inset, and both end on the same line", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const g = await page.evaluate(() => {
    const row = document.querySelector(".qc-wpg .wpg-scroll") as HTMLElement | null;
    const list = document.querySelector(".f12-list") as HTMLElement | null;
    const pane = document.querySelector(".qp-pane") as HTMLElement | null;
    const lhead = document.querySelector(".qc-lhead") as HTMLElement | null;
    const phead = document.querySelector(".qc-phead") as HTMLElement | null;
    if (!row || !list || !pane) return null;
    const cs = getComputedStyle(row);
    const box = row.getBoundingClientRect();
    const inner = {
      left: box.left + parseFloat(cs.paddingLeft),
      right: box.right - parseFloat(cs.paddingRight),
    };
    const L = list.getBoundingClientRect(), P = pane.getBoundingClientRect();
    return {
      leftGutter: Math.round(L.left - inner.left),
      rightGutter: Math.round(inner.right - P.right),
      channel: Math.round(P.left - L.right),
      bottomDelta: Math.round(P.bottom - L.bottom),
      /* the control cells must sit over their own columns, to the pixel — that is what §1's grid
         buys, and a hand-matched padding would be off by the channel */
      headLeftDelta: lhead ? Math.round(lhead.getBoundingClientRect().left - L.left) : null,
      paneHeadLeftDelta: phead ? Math.round(phead.getBoundingClientRect().left - P.left) : null,
    };
  });
  expect(g, "the split is missing").not.toBeNull();
  console.log(JSON.stringify(g, null, 1));
  expect(Math.abs(g!.leftGutter - g!.rightGutter), `the columns are not symmetrically inset: L ${g!.leftGutter} / R ${g!.rightGutter}`).toBeLessThanOrEqual(1);
  expect(Math.abs(g!.bottomDelta), `the two columns end on different lines: ${g!.bottomDelta}px apart`).toBeLessThanOrEqual(1);
  expect(g!.channel, "the channel between the columns went").toBeGreaterThan(8);
  /* ⚠️ THE CELLS ARE OVER THEIR COLUMNS BECAUSE THEY SHARE THE GRID, not because two paddings were
     matched — so the offsets are within the cells' own 2px padding, on both sides. */
  expect(Math.abs(g!.headLeftDelta ?? 99), "the list's control cell is not over the list").toBeLessThanOrEqual(3);
  expect(Math.abs(g!.paneHeadLeftDelta ?? 99), "the pane's control cell is not over the pane").toBeLessThanOrEqual(3);
});

test("gate — both panes scroll internally and the page itself never does", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const s = await page.evaluate(() => {
    const row = document.querySelector(".qc-wpg .wpg-scroll") as HTMLElement | null;
    const rows = document.querySelector(".f12-rows") as HTMLElement | null;
    const pane = document.querySelector(".qp-pane") as HTMLElement | null;
    const over = (el: HTMLElement | null) => (el ? { max: el.scrollHeight - el.clientHeight, oy: getComputedStyle(el).overflowY } : null);
    return { page: over(row), list: over(rows), pane: over(pane), doc: document.documentElement.scrollHeight - document.documentElement.clientHeight };
  });
  console.log(JSON.stringify(s, null, 1));
  expect(s.page!.max, `the page scrolled by ${s.page!.max}px — this is a fill page`).toBeLessThanOrEqual(1);
  expect(s.doc, `the document scrolled by ${s.doc}px`).toBeLessThanOrEqual(1);
  expect(s.list!.oy, "the list stopped scrolling internally").toBe("auto");
});

test("gate — the group rules render, overdue leads, and closed folds", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const groups = await page.evaluate(() =>
    [...document.querySelectorAll(".qc-gh")].map((h) => ({
      label: (h.querySelector("span")?.textContent || "").trim(),
      foldable: h.classList.contains("qc-gh-fold"),
      overdue: h.classList.contains("qc-gh-od"),
    })));
  console.log(JSON.stringify(groups, null, 1));
  expect(groups.length, "no group rules rendered — the list is still flat").toBeGreaterThan(0);
  const order = ["OVERDUE", "WAITING", "YOUR MOVE", "CLOSED"];
  const seen = groups.map((g) => g.label.split(" ·")[0]);
  /* ⚠️ ORDER, NOT PRESENCE. A seeded account need not have all four; what must hold is that the
     ones present are in the pack's order, with overdue first and closed last. */
  const idx = seen.map((l) => order.indexOf(l));
  expect(idx.every((n) => n >= 0), `an unknown group rule rendered: ${seen.join(", ")}`).toBe(true);
  expect([...idx].sort((a, b) => a - b), `the groups are out of order: ${seen.join(", ")}`).toEqual(idx);
  /* only CLOSED may fold */
  for (const g of groups) if (g.foldable) expect(g.label, "a group other than CLOSED grew a fold").toContain("CLOSED");
});

/**
 * ⚠️ ENGAGE FIRST, AND THIS IS A FINDING RATHER THAN A TEST DETAIL. The FIRST `pointerdown` anywhere
 * in the content collapses the header (measured here: 146 → 52), and that ~94px shift moves whatever
 * was under the cursor. If the first click lands on a SMALL control, `pointerdown` and `pointerup`
 * land on different elements, so the browser fires `click` on their common ancestor and the control
 * never receives it — measured exactly that way: `pointerdown` on the expand button's svg,
 * `pointerup` on a note bubble, `click` on the card.
 *
 * The collapse is settled, shipped and out of this pack's scope, so the test engages first the way a
 * writer's second click does. Reported to Nick as an observation about the live page.
 */
const engage = async (page: import("@playwright/test").Page) => {
  await page.locator(".f12-row").first().click();
  await page.waitForTimeout(450);
};

test("gate — Notes expands, measures, and collapses on an outside click", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await engage(page);
  const before = await page.evaluate(() => {
    const stack = document.querySelector(".qp-stack") as HTMLElement | null;
    return stack ? Math.round(stack.getBoundingClientRect().height) : null;
  });
  expect(before, "the right stack is missing").not.toBeNull();

  await page.locator(".qp-cardexp").click();
  const open = await page.evaluate(() => {
    const stack = document.querySelector(".qp-stack") as HTMLElement | null;
    const notes = document.querySelector(".qp-notes-open") as HTMLElement | null;
    const sent = document.querySelector(".qp-stack--open > .f12-card:first-child") as HTMLElement | null;
    return {
      stack: stack ? Math.round(stack.getBoundingClientRect().height) : null,
      notes: notes ? Math.round(notes.getBoundingClientRect().height) : null,
      sentHidden: sent ? getComputedStyle(sent).display === "none" : null,
      lifted: notes ? getComputedStyle(notes).boxShadow : null,
    };
  });
  console.log(`closed stack ${before}  →  open stack ${open.stack} / notes ${open.notes}`);
  expect(open.sentHidden, "What you sent did not hide beneath it").toBe(true);
  /* ⚠️ THE POINT OF THE MEASUREMENT: the column is the same height open as closed, so nothing below
     it reflows and the pane does not jump. */
  expect(Math.abs((open.stack ?? 0) - (before ?? 0)), `the column jumped by ${Math.abs((open.stack ?? 0) - (before ?? 0))}px on expand`).toBeLessThanOrEqual(2);
  expect(open.lifted, "the open card took no deeper cast").not.toBe("none");

  /* an outside click collapses it */
  await page.locator(".f12-heroband").click({ position: { x: 5, y: 5 } });
  const after = await page.evaluate(() => ({
    open: !!document.querySelector(".qp-stack--open"),
    sentBack: !!document.querySelector(".qp-stack > .f12-card"),
  }));
  expect(after.open, "an outside click did not collapse it").toBe(false);
  expect(after.sentBack, "What you sent did not come back").toBe(true);
});

test("gate — switching query closes the expansion", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await engage(page);
  await page.locator(".qp-cardexp").click();
  expect(await page.evaluate(() => !!document.querySelector(".qp-stack--open")), "it did not open").toBe(true);
  /* pick a different row — any row that is not the selected one */
  await page.locator(".f12-row:not(.f12-sel)").first().click();
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => !!document.querySelector(".qp-stack--open")),
    "the expansion survived a query change — a different query's notes would be shown at full height").toBe(false);
});
