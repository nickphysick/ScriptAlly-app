/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE THREE VIEWS, on a rendered page.
 *
 * ⚠️ "THE OPEN DRAWER SURVIVES A VIEW CHANGE" IS NOT SETTLEABLE IN SOURCE. It is a claim about
 * what a remount does, and a component that looks correct can still lose its subject the moment
 * the renderer beneath it swaps. The same goes for the popover escaping the List's horizontal
 * scroller: `document.body` in a portal call is a declaration; whether the panel is on screen and
 * unclipped at the bottom of a list is a measurement.
 */
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";

const KILL_MOTION = `*, *::before, *::after { transition: none !important; animation: none !important; }`;

async function openCast(page: import("@playwright/test").Page, width = 1440) {
  await assertLocalBundleIsDev();
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator('[data-lab-view="cast"]').click();
  await page.addStyleTag({ content: KILL_MOTION });
  await expect(page.locator('[data-agent-card="fx-long"]')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const toView = async (page: import("@playwright/test").Page, label: string) => {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
};

test.describe("the view switch", () => {
  test("each view draws the same seven agents, and says so in the URL", async ({ page }) => {
    await openCast(page);

    const counts: Record<string, number> = {};
    counts.grid = await page.locator("[data-agent-card]").count();
    const url0 = page.url();

    await toView(page, "List");
    counts.list = await page.locator(".agl-lrow").count();
    const urlList = page.url();

    await toView(page, "Board");
    counts.board = await page.locator(".agl-bcard").count();
    const urlBoard = page.url();

    await toView(page, "Grid");
    const urlBack = page.url();

    // eslint-disable-next-line no-console
    console.log(`[views] grid=${counts.grid} list=${counts.list} board=${counts.board}`);
    // eslint-disable-next-line no-console
    console.log(`[urls] list=${urlList.split("?")[1] ?? "—"} board=${urlBoard.split("?")[1] ?? "—"} back=${urlBack.split("?")[1] ?? "—"}`);

    expect(counts.grid, "the grid rendered nothing").toBeGreaterThan(3);
    /* ⚠️ THE SAME SET, THREE RENDERERS. Filter, search and sort are applied before the view is
       consulted, so a differing count means one view is dropping agents. */
    expect(counts.list, "the list and the grid disagree about how many agents there are").toBe(counts.grid);
    expect(counts.board, "the board and the grid disagree about how many agents there are").toBe(counts.grid);

    expect(urlList, "the list view is not in the URL — it cannot be linked to or gone back to").toContain("view=list");
    expect(urlBoard).toContain("view=board");
    expect(urlBack, "the grid left a redundant parameter behind rather than clearing it").not.toContain("view=");
    expect(url0).not.toContain("view=");
  });

  /* ⚠️ THE OPEN DRAWER SURVIVES A VIEW CHANGE. Switching the renderer must not close the record
     you were reading — the view is how the set is drawn, not what you are looking at. */
  test("an open drawer survives the switch, on the same agent", async ({ page }) => {
    await openCast(page);
    await page.locator('[data-agent-card="fx-long"] .agl-body').click();
    await expect(page.locator(".slo")).toBeVisible({ timeout: 4_000 });
    const before = await page.evaluate(() => document.querySelector(".slo .agl-dname")?.textContent ?? "");

    /* ⚠️ DISPATCHED ON THE ELEMENT, because the drawer legitimately covers the toolbar — an open
       drawer overlays the page, and a pointer click is correctly intercepted by its scrim. This
       is the sanctioned way past a REAL overlay for a measurement: it lands on the element itself
       and cannot arrive somewhere else, which `force: true` cannot promise. */
    const switchTo = async (label: string) => {
      await page.getByRole("button", { name: label, exact: true }).evaluate((el) => (el as HTMLElement).click());
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    };

    await switchTo("List");
    const afterList = await page.evaluate(() => ({
      open: document.querySelector(".slo")?.getAttribute("data-on") === "true",
      name: document.querySelector(".slo .agl-dname")?.textContent ?? "",
      rows: document.querySelectorAll(".agl-lrow").length,
    }));
    await switchTo("Board");
    const afterBoard = await page.evaluate(() => ({
      open: document.querySelector(".slo")?.getAttribute("data-on") === "true",
      name: document.querySelector(".slo .agl-dname")?.textContent ?? "",
    }));
    // eslint-disable-next-line no-console
    console.log(`[drawer survives] "${before}" → list:"${afterList.name}"(${afterList.open}) → board:"${afterBoard.name}"(${afterBoard.open})`);

    expect(before).toBeTruthy();
    expect(afterList.open, "the drawer closed when the view changed").toBe(true);
    expect(afterList.name, "the drawer changed agent when the view changed").toBe(before);
    expect(afterBoard.open).toBe(true);
    expect(afterBoard.name).toBe(before);
  });
});

test.describe("the peek's popover", () => {
  /* ⚠️ THE FOURTH CONTAINER, MEASURED. `document.body` in a portal call is a declaration; whether
     the panel is unclipped and on screen at the BOTTOM of a list is a measurement, and the bottom
     is where a hand-rolled `rect.bottom + 8` fails. */
  test("opens from a list row, escapes the scroller, and shows the peek's own rows", async ({ page }) => {
    await openCast(page);
    await toView(page, "List");

    const rows = page.locator(".agl-lrow");
    const n = await rows.count();
    await rows.nth(n - 1).locator("[data-peek-trigger]").click();

    const pop = page.locator(".agl-peekpop");
    await expect(pop).toBeVisible({ timeout: 4_000 });

    const read = await page.evaluate(() => {
      const p = document.querySelector(".agl-peekpop") as HTMLElement;
      const wrap = document.querySelector(".agl-listwrap") as HTMLElement;
      const r = p.getBoundingClientRect();
      return {
        parentIsBody: p.parentElement === document.body,
        insideScroller: wrap.contains(p),
        rows: p.querySelectorAll(".agl-prow").length,
        controls: p.querySelectorAll("input, textarea, select").length,
        onScreen: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
        bottom: r.bottom, vh: window.innerHeight,
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[popover] body=${read.parentIsBody} inScroller=${read.insideScroller} rows=${read.rows} controls=${read.controls} bottom=${read.bottom.toFixed(0)}/${read.vh}`);

    expect(read.parentIsBody, "the popover is not portalled — the list's scroller clips both axes").toBe(true);
    expect(read.insideScroller, "the popover is inside the horizontal scroller that would clip it").toBe(false);
    expect(read.rows, "the peek's rows did not render in the popover").toBeGreaterThan(3);
    expect(read.controls, "a form control reached the read-only peek").toBe(0);
    expect(read.onScreen, "the LAST row's popover hangs off the viewport — the measured flip is not being applied").toBe(true);
  });
});
