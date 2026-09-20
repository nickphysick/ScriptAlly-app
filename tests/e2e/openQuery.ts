/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE WAY TO OPEN A QUERY ON THE QUERY CENTRE, AND ONE PLACE THAT KNOWS HOW.
 *
 * ⚠️ WHY THIS EXISTS. Six measurements each carried their own copy of the route in —
 * `[data-qcc-id="…"]` to click the card, `.qpn-tab` for its tab, `.qpn-act` for its action — and
 * when v11 replaced the card grid with a list and a docked card, all six waited out a 90-second
 * click on a selector that matches nothing. They were not broken pages: the desks and the timeline
 * rungs they measure are still live, and only the way in had changed. One function means the NEXT
 * change to that route breaks one file loudly instead of six quietly. It is the same lesson
 * `tests/e2e/todoOpen.ts` already carries for the To-do page, arrived at the same way.
 *
 * ⚠️ AND IT IS SCOPED TO THE VISIBLE PAGE. Every workspace page stays mounted and the shell toggles
 * `display`, so a bare selector routinely resolves inside a page nobody can see — a locator that
 * then waits the whole test timeout for a zero-sized element to become "stable".
 *
 * ⚠️ TWO HOSTS, ONE CONTRACT. Above `DOCK_MIN_COLUMN` (900px of main column) the query opens in the
 * card DOCKED beside the list; below it, in the drawer that slides over. Both render the same tab
 * bodies — `QcOpenCard` hands the page's Tracking/Agent/Notes content straight through — so a
 * caller asks for a query and gets a host, rather than asking for a card or a drawer.
 */
import { expect, type Page } from "@playwright/test";

/** The docked card, or the drawer, whichever is on screen. */
export type QueryHost = { root: string; docked: boolean };

/** Open a seeded query by id and return the selector of whichever host took it. */
export async function openQueryById(page: Page, id: string): Promise<QueryHost> {
  const row = page.locator(`.qcv-page [data-qcv="row"][data-id="${id}"]`);
  await expect(row, `no row for ${id} — is it on the current manuscript scope and filter?`).toBeVisible({ timeout: 20_000 });
  await row.click();
  /* the docked card and the drawer are mutually exclusive; wait for whichever arrives */
  const docked = page.locator('.qcv-page [data-qcv="open"]');
  const drawer = page.locator(".qpn");
  await expect
    .poll(async () => (await docked.count()) > 0 || (await drawer.count()) > 0, { timeout: 20_000, message: `${id} opened neither the docked card nor the drawer` })
    .toBe(true);
  const isDocked = (await docked.count()) > 0;
  return { root: isDocked ? '.qcv-page [data-qcv="open"]' : ".qpn", docked: isDocked };
}

/** Select one of the three tabs inside whichever host is open. */
export async function openTab(page: Page, host: QueryHost, tab: "Tracking" | "Agent" | "Notes"): Promise<void> {
  /* the docked card's tabs are `role="tab"`; the drawer's are `.qpn-tab`. Both are named buttons,
     so the accessible name is the one thing that does not change between the two hosts. */
  const btn = page.locator(`${host.root} [role="tab"], ${host.root} .qpn-tab`).filter({ hasText: new RegExp(`^${tab}`) }).first();
  await expect(btn, `${tab} tab is not offered by the open query`).toBeVisible({ timeout: 10_000 });
  await btn.click();
}

/**
 * Press an action on the open query, wherever it lives.
 *
 * ⚠️ THE PRIMARY AND THE ⋯ MENU ARE ONE SURFACE TO A CALLER, AND WERE NOT IN THE DRAWER. v11 gives
 * the card a single primary — `primaryActionLabel`: "Record a response", "Mark partial sent",
 * "Mark full sent", "Record your resubmission", "Record your decision" — and puts everything else
 * behind ⋯ ("Nudge the agent", "Snooze the nudge", …). The drawer offered several `.qpn-act`
 * buttons side by side, so a suite written against it asks for "Nudge" and would now have to know
 * that the answer moved into a menu. It asks here instead.
 *
 * ⚠️ AND THE PRIMARY'S WORDING CHANGED WITH IT — "Record a response", not "Record response". A
 * caller's pattern should be loose enough to survive that ("Record .*response"), because the label
 * is copy and this is not a copy lock.
 */
export async function pressAction(page: Page, host: QueryHost, label: RegExp): Promise<void> {
  const primary = page.locator(`${host.root} [data-qcv="open-action"], ${host.root} .qpn-act`).filter({ hasText: label }).first();
  if (await primary.count()) { await primary.click(); return; }
  /* not the primary — open ⋯ and look there before giving up */
  const more = page.locator(`${host.root} [data-qcv="open-more"]`).first();
  if (await more.count()) {
    await more.click();
    const item = page.locator('[role="menu"] button, [role="menuitem"]').filter({ hasText: label }).first();
    if (await item.count()) { await item.click(); return; }
    await page.keyboard.press("Escape");
  }
  const offered = await page.locator(`${host.root} [data-qcv="open-action"], ${host.root} .qpn-act`).allTextContents();
  expect(false, `no action matching ${label} on the open query — it offers [${offered.join(" | ")}] and a ⋯ menu`).toBe(true);
}
