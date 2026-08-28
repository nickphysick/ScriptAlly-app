/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SHELF CAROUSEL — a11y verified in a browser, and the height at which it scrolls ═══════
 *
 * ⚠️ THE KEYBOARD AND FOCUS CLAIMS ARE MADE HERE, NOT IN A UNIT TEST. `carouselDeck.test.ts` proves
 * the ARRANGEMENT — exactly one slot focusable, no wrap-around — but this repo has no jsdom, so
 * "arrow keys page" and "a hidden tile is not reachable by Tab" are claims only a real browser can
 * answer. Verified, not assumed.
 *
 * ⚠️ AND THE STAGE IS A FIXED `tileH + 108` ON A PAGE THAT SCROLLS. This sweep reports the viewport
 * height at which the shelf starts to overflow, rather than asserting a target: a threshold tuned
 * to today's tile fails the next deliberate change as though it were a regression.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const ROW = ".msv-wpg .wpg-scroll";

test("the shelf carousel: keyboard, focus containment, and where it starts scrolling", async ({ page }) => {
  await openRoute(page, "/manuscripts", { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  /* ── the deck is on the page at all ── */
  const shape = await page.evaluate(() => {
    const car = document.querySelector(".msv-wpg .mcar") as HTMLElement | null;
    if (!car) return { error: "no carousel" };
    const tiles = [...car.querySelectorAll(".mcar-tile")] as HTMLElement[];
    return {
      tiles: tiles.length,
      roles: tiles.map((t) => (t.className.match(/mcar-(focus|peek-left|peek-right|hidden|ghost)/g) ?? []).join("+")),
      /* ⚠️ EVERY TILE IS A BUTTON. A clickable div is unreachable and announces nothing. */
      tagNames: [...new Set(tiles.map((t) => t.tagName))],
      /* ⚠️ THE A11Y CLAIM: only the forward tile is in the tab order. */
      tabbable: tiles.filter((t) => t.tabIndex === 0).length,
      ariaHidden: tiles.filter((t) => t.getAttribute("aria-hidden") === "true").length,
      dots: [...car.querySelectorAll(".mcar-dot")].map((d) => d.getAttribute("aria-label")),
      chevrons: [...car.querySelectorAll(".mcar-chev")].map((c) => c.getAttribute("aria-label")),
      stageH: Math.round(car.getBoundingClientRect().height),
    };
  });
  console.log("SHAPE " + JSON.stringify(shape));
  expect((shape as { error?: string }).error).toBeUndefined();
  const s = shape as unknown as { tiles: number; tabbable: number; tagNames: string[] };
  expect(s.tagNames, "a tile is not a button").toEqual(["BUTTON"]);
  expect(s.tabbable, "more than one tile is in the tab order").toBe(1);

  /* ── arrow keys page ── */
  const paged = await page.evaluate(async () => {
    const car = document.querySelector(".msv-wpg .mcar") as HTMLElement;
    const focusTitle = () =>
      (car.querySelector(".mcar-focus .mcar-title") as HTMLElement | null)?.textContent
      ?? (car.querySelector(".mcar-focus.mcar-ghost") ? "GHOST" : null);
    const before = focusTitle();
    (car.querySelector(".mcar-focus") as HTMLElement).focus();
    car.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await new Promise((r) => setTimeout(r, 260));
    const after = focusTitle();
    car.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await new Promise((r) => setTimeout(r, 260));
    return { before, after, back: focusTitle() };
  });
  console.log("KEYS " + JSON.stringify(paged));
  expect(paged.after, "ArrowRight did not page the deck").not.toBe(paged.before);
  expect(paged.back, "ArrowLeft did not page back").toBe(paged.before);

  /* ── reduced motion is a swap ── */
  await page.emulateMedia({ reducedMotion: "reduce" });
  const rm = await page.evaluate(() =>
    getComputedStyle(document.querySelector(".msv-wpg .mcar-tile") as Element).transitionDuration);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const normal = await page.evaluate(() =>
    getComputedStyle(document.querySelector(".msv-wpg .mcar-tile") as Element).transitionDuration);
  console.log("MOTION " + JSON.stringify({ reduce: rm, noPreference: normal }));
  /**
   * ⚠️ THIS CANNOT PROVE MY RULE, AND SAYING SO IS THE POINT. Under emulated reduced motion Chromium
   * forces transitions to `1e-05s` at the engine level — no `1e-05` exists anywhere in `src` — so a
   * near-zero reading here would be identical whether or not `.mcar-tile { transition: none }` were
   * written at all. What this DOES establish is the pair: real motion by default, effectively none
   * under the preference.
   *
   * ⚠️ THE RULE ITSELF IS PROVED BY THE SOURCE LOCK, `manuscriptCarouselTokens.test.ts` — that the
   * declaration exists AND is ordered after the transition it cancels, which is the half that has
   * actually gone wrong in this repo before (a media query confers no specificity).
   */
  const seconds = (v: string) => parseFloat(v);
  expect(seconds(rm), `reduced motion still animates (${rm})`).toBeLessThan(0.01);
  expect(seconds(normal), "the transition is gone even without the preference").toBeGreaterThan(0.1);

  /* ── the height at which the shelf starts scrolling ── */
  const heights: { h: number; overflow: number }[] = [];
  for (const h of [1100, 1000, 950, 900, 850, 800, 760, 720, 680]) {
    await page.setViewportSize({ width: 1440, height: h });
    await page.waitForTimeout(220);
    const o = await page.evaluate((sel) => {
      const r = document.querySelector(sel) as HTMLElement | null;
      return r ? r.scrollHeight - r.clientHeight : -1;
    }, ROW);
    heights.push({ h, overflow: o });
  }
  const firstScrolling = heights.filter((x) => x.overflow > 4).sort((a, b) => b.h - a.h)[0] ?? null;
  console.log("HEIGHTS " + JSON.stringify({ heights, startsScrollingAt: firstScrolling?.h ?? null }));
  /* Reported, not asserted — a threshold tuned to today's tile fails the next deliberate change. */
  expect(heights.length).toBe(9);
});
