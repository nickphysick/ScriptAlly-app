/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sign out — the one thing the unit locks could not prove.
 *
 * ⚠️ THE DEFECT WAS A CHAIN, NOT A COMPONENT. The menu had a Sign out row, AppShell passed the
 * handler, WorkspaceShell rendered the menu — all true, all covered, and a desktop user still could
 * not sign out, because the rail's user row navigated to /account instead of calling the opener.
 * Source locks assert that the row now calls `onOpenAccount`; only a browser can say whether a
 * click on it puts Sign out on the screen.
 *
 * ⚠️ IT OPENS THE MENU AND STOPS. Clicking Sign out would end the session and invalidate the saved
 * storageState every other measurement depends on — so this proves the row is REACHABLE and leaves
 * the last millimetre alone. That is the honest boundary for a suite that runs against a real
 * account, and it is the same boundary `groupSweep` draws before it would write.
 *
 * ⚠️ DESKTOP ONLY, DELIBERATELY. Below 768px the opener lives in `.ws-mobilebar` and always worked;
 * the fault was ≥768px, where that bar is `display:none`. Measuring the width that was broken is
 * the point.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
];

for (const viewport of WIDTHS) {
  test(`the rail's user row opens the account menu at ${viewport.width}`, async ({ page }) => {
    await openRoute(page, "/dashboard", viewport);
    console.log(`\n═══ ${viewport.width}×${viewport.height} ═══  scrollbar ${await scrollbarWidth(page)}px`);

    const row = page.locator(".ws-uacct");
    await expect(row, "the rail's user row is not on the page").toBeVisible();

    /* The menu must be ABSENT first — otherwise "visible after the click" proves nothing, which is
       the vacuous-assertion shape this repo has been caught by before. */
    const menu = page.locator(".am-menu");
    await expect(menu, "the account menu was already open before anything was clicked").toHaveCount(0);

    await row.click();
    await expect(menu, "clicking the rail's user row did not open the account menu").toBeVisible();

    const signOut = menu.getByRole("menuitem", { name: "Sign out" });
    await expect(signOut, "the menu opened without a Sign out row").toBeVisible();

    /* Where it sits, measured rather than assumed: last, and below the hairline. */
    const geometry = await menu.evaluate((el) => {
      const rows = [...el.querySelectorAll<HTMLElement>(".am-row")].map((r) => ({
        label: (r.textContent ?? "").trim(),
        top: Math.round(r.getBoundingClientRect().top),
      }));
      const rule = el.querySelector<HTMLElement>(".am-div");
      return {
        rows,
        ruleTop: rule ? Math.round(rule.getBoundingClientRect().top) : null,
        menuBox: (() => { const b = el.getBoundingClientRect(); return `${Math.round(b.width)}×${Math.round(b.height)}`; })(),
      };
    });
    console.log(JSON.stringify(geometry, null, 2));

    const out = geometry.rows.find((r) => r.label === "Sign out");
    expect(out, "no row labelled Sign out").toBeTruthy();
    expect(
      Math.max(...geometry.rows.map((r) => r.top)),
      "Sign out is not the last row in the menu",
    ).toBe(out!.top);
    expect(geometry.ruleTop, "no hairline separator in the menu").not.toBeNull();
    expect(out!.top, "Sign out sits above the hairline rather than below it").toBeGreaterThan(geometry.ruleTop!);

    /* Settings survives the change — it is the first row, which is what makes losing the row's old
       direct link to /account acceptable. */
    await expect(
      /* ⚠️ `exact`, because "Settings" also matches "Task settings" — the same ambiguity the unit
         lock hit in `indexOf`, in a different dialect. Playwright's strict mode caught it. */
      menu.getByRole("menuitem", { name: "Settings", exact: true }),
      "Settings is no longer reachable from the row that used to navigate there",
    ).toBeVisible();

    console.log("STOPPING BEFORE THE CLICK — pressing Sign out ends the session this suite runs on.");
  });
}
