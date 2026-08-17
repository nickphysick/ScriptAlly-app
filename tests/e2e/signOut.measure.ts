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

    /**
     * ⚠️⚠️ ON SCREEN, NOT MERELY IN THE DOM — THIS IS THE ASSERTION THAT WAS MISSING.
     *
     * The first version of this file passed while the menu was rendering EIGHT PIXELS BELOW THE
     * BOTTOM OF THE VIEWPORT: `toBeVisible()` asks for a non-empty box and no `display:none`, and
     * an off-screen element satisfies both. It reported Sign out at y1159 in a 900px-tall window
     * and called it proof. The user saw nothing but a flickering scrollbar.
     *
     * So the rect is checked against the viewport before anything else is believed — the general
     * form of the rule this repo already carries for `elementsFromPoint`: a probe that takes
     * coordinates needs those coordinates proved on screen first.
     */
    const fit = await menu.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return {
        rect: { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) },
        viewport: { w: window.innerWidth, h: window.innerHeight },
        position: getComputedStyle(el).position,
        /* Does the document scroll because of it? That growth WAS the only visible symptom. */
        docOverflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      };
    });
    console.log("MENU FIT:", JSON.stringify(fit));

    expect(fit.rect.top, "the menu starts above the top of the window").toBeGreaterThanOrEqual(0);
    expect(fit.rect.bottom, "the menu runs off the BOTTOM of the window — the original fault")
      .toBeLessThanOrEqual(fit.viewport.h);
    expect(fit.rect.left, "the menu runs off the left of the window").toBeGreaterThanOrEqual(0);
    expect(fit.rect.right, "the menu runs off the right of the window").toBeLessThanOrEqual(fit.viewport.w);

    /* Fixed, and therefore independent of every `overflow:hidden` in the shell chain. */
    expect(fit.position, "the menu is not fixed — it is resolving against an ancestor again").toBe("fixed");

    /**
     * ⚠️ NO ANCESTOR MAY CLIP OR HIDE IT. Walked from the menu to <body>: the portal target is
     * body, so this should be a two-step walk — if it is not, the portal has been lost.
     */
    const chain = await menu.evaluate((el) => {
      const out: { tag: string; cls: string; overflow: string; display: string; transform: string }[] = [];
      for (let n = el.parentElement; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        out.push({
          tag: n.tagName.toLowerCase(),
          cls: n.className?.toString().slice(0, 40) ?? "",
          overflow: `${cs.overflowX}/${cs.overflowY}`,
          display: cs.display,
          transform: cs.transform,
        });
      }
      return out;
    });
    console.log("ANCESTORS:", JSON.stringify(chain, null, 2));

    expect(chain[0].tag, "the menu is no longer portalled to document.body").toBe("body");
    for (const a of chain) {
      expect(a.display, `an ancestor (${a.tag}.${a.cls}) is display:none`).not.toBe("none");
      expect(a.overflow, `an ancestor (${a.tag}.${a.cls}) would clip the menu`).not.toContain("hidden");
    }

    /** Anchored to the row, not to a viewport corner. */
    const rowBox = await row.boundingBox();
    expect(rowBox, "the trigger has no box").toBeTruthy();
    expect(
      Math.abs(fit.rect.left - Math.round(rowBox!.x)),
      "the menu is not aligned to the rail row — it has drifted to a viewport edge",
    ).toBeLessThanOrEqual(24);

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
