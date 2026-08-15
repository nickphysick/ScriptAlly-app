/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CALENDAR SHEET'S WIDTH — measured, because Phase 6's second viewport was specified as that
 * number and a guessed one would make every reading at it a reading of nothing in particular.
 *
 * ⚠️ AND IT IS THE RUN THAT FOUND THE INERT BUG. A real click on the journey's advance is
 * intercepted: `document.elementsFromPoint()` at the button's own centre returns `[body, html]`,
 * because `<div id="root">` carries `inert`. `useOverlay`'s `sealBackground()` seals `#root` on the
 * stated premise that "overlays here portal to `document.body`" — and `FocusFlow` does NOT portal;
 * `ToDoPage.tsx` mounts it inline, inside `#root`. So the takeover seals itself along with the page
 * behind it, and every control in all five journeys is unreachable by pointer and by keyboard.
 *
 * ⚠️ WHICH IS WHY THIS WALKS BY `el.click()`. That dispatches ON the element and bypasses
 * hit-testing — NOT the app's own handler, which fires correctly and advances the journey. Stated
 * loudly rather than hidden in a helper: this harness is routing around a live bug, and the day the
 * bug is fixed these calls should go back to being ordinary clicks. A measurement tool that quietly
 * forces its way past a blocker reports a page nobody can use as though it worked.
 *
 * ⚠️ IT NEVER PRESSES A COMMIT CONTROL. The walk stops at the `When` step, where the calendar lives;
 * `Record it as sent` sits beside it and is not touched. A measurement pass that recorded a send
 * against the harness account's real queries would be changing the data it is describing.
 */
import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";

test.setTimeout(240_000);

/** Dispatch on the element itself — see the header for why this is not an ordinary click. */
const press = (page: import("@playwright/test").Page, re: string) => page.evaluate((src) => {
  const rx = new RegExp(src, "i");
  const b = [...document.querySelectorAll(".tdb-ff button")]
    .find((x) => rx.test(x.textContent ?? "")) as HTMLElement | undefined;
  if (!b) return false;
  b.click();
  return true;
}, re);

test("the Calendar sheet, measured", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);

  await page.locator(".tdg-row").filter({ hasText: /^Send/ }).first().click();
  await page.waitForTimeout(400);
  await page.locator(".tdw-cbprim").first().click();
  await page.waitForTimeout(1000);

  /* the sealed-root diagnosis, reported every run so it cannot quietly stop being true */
  const sealed = await page.evaluate(() => {
    const b = [...document.querySelectorAll(".tdb-ff button")].find((x) => /log it/i.test(x.textContent ?? ""));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const stack = (document as unknown as { elementsFromPoint(x: number, y: number): Element[] })
      .elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      .map((e) => `${e.tagName.toLowerCase()}.${(e.getAttribute("class") ?? "—").split(" ")[0]}`);
    const inert = [...document.querySelectorAll("[inert]")]
      .map((e) => `${e.tagName.toLowerCase()}#${e.id || "—"}`);
    return { stackAtAdvance: stack, inertOnPage: inert };
  });
  console.log("SEALED-ROOT CHECK:", JSON.stringify(sealed));

  console.log("advance to the When step:", await press(page, "log it"));
  await page.waitForTimeout(1000);
  console.log("open the calendar:", await press(page, "Another date"));
  await page.waitForTimeout(900);

  const m = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".cal")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { w: Math.round(b.width), h: Math.round(b.height), computedWidth: cs.width, position: cs.position };
  });
  console.log("CALENDAR SHEET:", JSON.stringify(m));
  if (m) {
    await page.locator(".cal").first()
      .screenshot({ path: resolve(process.cwd(), "reports/card-conformance/journey-calendar.png") })
      .catch(() => {});
  }
});
