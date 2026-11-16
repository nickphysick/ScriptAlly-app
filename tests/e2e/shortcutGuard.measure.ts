/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shortcut guard (16 Nov) — the closed "How it works" dialog (Dash105How) must not count as an open modal.
 * Report: reports/shortcut-guard-v1/REPORT.md.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/shortcutGuard.measure.ts --project=measure`.
 *
 * The bug: Dash105How is portalled to <body> and stays mounted while closed, and it carried aria-modal="true" while
 * closed. shortcuts.ts modalOpen() counted it (it has a box: opacity 0, 520 wide), so shortcutBlocked() was true on
 * every page and M — and every other plain-key shortcut — did nothing.
 *
 * What M does on this line: the harness account holds seven manuscripts, so M opens the manuscript menu
 * (BarSwitcher's `[role="menu"][aria-label="Your manuscripts"]`, `data-open="true"`).
 *
 * ⚠️ EVERY POPULATION IS COUNTED BEFORE IT IS ASSERTED ON: the How dialog is proved to be in the DOM (and closed)
 * before anything is said about it, so a check cannot pass against an empty page.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

test.setTimeout(300_000);

const VP = { width: 1512, height: 982 };
const PAGES = ["/dashboard", "/queries", "/materials/letters"];
const MENU = '[role="menu"][aria-label="Your manuscripts"][data-open="true"]';
const HOW = '[data-d105h="modal"]';
/** SG_MUTATE=dialog puts aria-modal="true" back on the closed dialog in-page (the dialog fix removed): SG1's attribute
 *  check must go red, and M must still work — the guard rule alone holds on the rendered page. */
const MUTATE = process.env.SG_MUTATE ?? "";

/** The census: every aria-modal / open-dialog element in the DOM, and what the guard makes of it. */
async function census(page: Page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>('[aria-modal], dialog')];
    return els.map((e) => ({
      el: `${e.tagName}.${String(e.className).split(" ").slice(0, 2).join(".")}${e.dataset.d105h ? `[d105h=${e.dataset.d105h}]` : ""}`,
      ariaModal: e.getAttribute("aria-modal"),
      dialogOpen: e.tagName === "DIALOG" ? (e as HTMLDialogElement).open : undefined,
      width: Math.round(e.getBoundingClientRect().width),
      hiddenOrInert: !!e.closest('[inert], [aria-hidden="true"]'),
      /* the guard before this pass */
      oldCounts: (e.matches('[aria-modal="true"], dialog[open]')) && e.getBoundingClientRect().width > 0,
      /* the guard after it */
      newCounts: (e.matches('[aria-modal="true"], dialog[open]')) && e.getBoundingClientRect().width > 0 && !e.closest('[inert], [aria-hidden="true"]'),
    }));
  });
}

async function settle(page: Page) {
  /* nothing focused: a field would stand M down for the right reason and hide the wrong one */
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

async function closeMenu(page: Page) {
  if (await page.locator(MENU).count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  await expect(page.locator(MENU)).toHaveCount(0);
}

test.describe("Shortcut guard — the closed How it works dialog", () => {
  test("SG1 with How it works never opened, M opens the manuscript menu on the Dashboard, Queries and Letters", async ({ page }) => {
    for (const route of PAGES) {
      await openRoute(page, route, VP);
      await settle(page);
      if (MUTATE === "dialog") {
        /* the dialog fix removed, in-page: the closed dialog declares aria-modal again (it stays inert and aria-hidden) */
        const n = await page.evaluate(() => { const els = [...document.querySelectorAll('[data-d105h="modal"]:not(.on)')]; els.forEach((e) => e.setAttribute("aria-modal", "true")); return els.length; });
        console.log(`[SG] MUTATION ON: dialog (${n} closed dialog(s) given aria-modal="true")`);
      }
      const c = await census(page);
      console.log(`[SG1] ${route} census`, JSON.stringify(c));
      const how = page.locator(HOW);
      const n = await how.count();
      console.log(`[SG1] ${route} How dialogs in the DOM: ${n}`);
      expect(n, `the How dialog is mounted on ${route} (the population)`).toBeGreaterThanOrEqual(1);
      for (let j = 0; j < n; j++) {
        expect(await how.nth(j).getAttribute("class"), "closed").not.toContain(" on");
        expect.soft(await how.nth(j).getAttribute("aria-modal"), `closed How dialog #${j} carries no aria-modal on ${route}`).toBeNull();
      }
      await expect(page.locator(MENU)).toHaveCount(0);
      await page.keyboard.press("m");
      await page.waitForTimeout(500);
      const open = await page.locator(MENU).count();
      console.log(`[SG1] ${route} after M: menus open ${open}`);
      expect.soft(open, `M opens the manuscript menu on ${route}`).toBe(1);
      await closeMenu(page);
    }
  });

  test("SG2 on the Dashboard: How it works open blocks M; closed with Escape, M works again", async ({ page }) => {
    await openRoute(page, "/dashboard", VP);
    const opener = page.locator('[data-d2="fw-how"]:visible');
    await expect(opener, "the founding card's How it works link (the population)").toHaveCount(1);
    await opener.click();
    await page.waitForTimeout(500);
    const openHow = page.locator(`${HOW}.on`);
    await expect(openHow, "How it works is open").toHaveCount(1);
    expect(await openHow.getAttribute("aria-modal"), "open, it is a modal").toBe("true");
    console.log("[SG2] open census", JSON.stringify(await census(page)));

    await page.keyboard.press("m");
    await page.waitForTimeout(500);
    expect(await page.locator(MENU).count(), "M stands down over the open dialog").toBe(0);
    await expect(openHow, "and the dialog stays open").toHaveCount(1);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await expect(page.locator(`${HOW}.on`), "Escape closes it").toHaveCount(0);
    await expect(page.locator(HOW), "closed, it is still mounted").not.toHaveCount(0);
    await settle(page);
    await page.keyboard.press("m");
    await page.waitForTimeout(500);
    const open = await page.locator(MENU).count();
    console.log("[SG2] after Escape then M: menus open", open);
    expect(open, "M works again").toBe(1);
  });
});
