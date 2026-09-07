/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DASHBOARD'S THREE COLUMNS, on a rendered page (dashboard redesign, Phase 2).
 *
 * ⚠️ THIS CLAIM CANNOT BE MADE IN A SOURCE LOCK. "The three column bottoms agree" is a fact about
 * three boxes; a stylesheet can only say that one rule declares `align-items: stretch`, and this
 * repo has measured the gap between those two more than once — a `flex: 1` chain computing to
 * EXACTLY 0 with every child mounted and styled correctly, a grid growing a hundred phantom tracks
 * while each declaration read fine. The unit locks say the rules were written; this says the page
 * laid out.
 *
 * ⚠️ AND THE THIRD CASE IS THE BLEND TRAP, WHICH IS THE ONE THAT FAILS SILENTLY. The three stat
 * illustrations composite with `mix-blend-mode: multiply` to drop their white field, and a blend is
 * killed by a `transform` on ANY ancestor — the artwork's white square simply returns, with the
 * rule applying cleanly and nothing to point at. Phase 2 rewrote every ancestor those marks have,
 * so the property is measured rather than assumed. If a layout change ever needs to nudge one of
 * them, it uses `position: relative; top` — never a transform.
 */
import { expect, test } from "@playwright/test";
import { openRoute } from "./measure";

const WIDTHS = [1440, 1920, 2520];

/** Every width the law is claimed at, so a pass at one cannot stand in for the others. */
async function openDash(page: import("@playwright/test").Page, width: number) {
  await openRoute(page, "/dashboard", { width, height: 1000 });
  await expect(page.locator(".os-content").first()).toBeVisible({ timeout: 30_000 });
  /* the entrance stagger sets a transform on every card and self-clears; measure after it, or the
     blend probe reads a transform that is real, correct and about to disappear */
  await page.waitForTimeout(1200);
}

test.describe("P2 · the three columns", () => {
  test("P2.1 · the three column bottoms agree, at every width", async ({ page }) => {
    const seen: string[] = [];
    for (const width of WIDTHS) {
      await openDash(page, width);
      const r = await page.evaluate(() => {
        const b = (s: string) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), w: +r.width.toFixed(1) };
        };
        return { L: b(".os-colL"), M: b(".os-colM"), R: b(".os-colR") };
      });
      expect(r.L, "the LEFT column must exist — Phase 2 introduced it").not.toBeNull();
      expect(r.M, "the CENTRE column must exist").not.toBeNull();
      expect(r.R, "the RIGHT column must exist").not.toBeNull();
      const bots = [r.L!.bottom, r.M!.bottom, r.R!.bottom];
      seen.push(`${width}: L ${r.L!.w}w →${r.L!.bottom} · M ${r.M!.w}w →${r.M!.bottom} · R ${r.R!.w}w →${r.R!.bottom}`);
      expect(Math.max(...bots) - Math.min(...bots), `column bottoms disagree at ${width}`).toBeLessThanOrEqual(1);
    }
    // eslint-disable-next-line no-console
    console.log(`[P2.1] ${seen.join("\n        ")}`);
  });

  /**
   * ⚠️ THE FEED FLEXES TO ITS COLUMN AND NEVER SETS IT — and the honest way to say that is to make
   * the feed taller and check nothing moved. Asserting `flex: 1 1 auto` in the stylesheet proves the
   * declaration exists, not that the column won the argument.
   */
  test("P2.2 · the activity feed's content height never reaches the row", async ({ page }) => {
    await openDash(page, 1600);
    const before = await page.evaluate(() =>
      (document.querySelector(".os-colM") as HTMLElement).getBoundingClientRect().bottom);

    const grew = await page.evaluate(() => {
      const body = document.querySelector(".os-actv .os-afeed, .os-actv [id='os-actv-body']") as HTMLElement | null;
      if (!body) return false;
      for (let i = 0; i < 60; i++) {
        const d = document.createElement("div");
        d.style.height = "40px"; d.dataset.saProbe = "1";
        body.appendChild(d);
      }
      return true;
    });
    expect(grew, "the activity body must be findable — this case measures nothing without it").toBe(true);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const after = await page.evaluate(() =>
      (document.querySelector(".os-colM") as HTMLElement).getBoundingClientRect().bottom);
    // eslint-disable-next-line no-console
    console.log(`[P2.2] centre column bottom ${before.toFixed(1)} → ${after.toFixed(1)} after +2400px of feed`);
    expect(Math.abs(after - before), "2400px of feed moved the centre column").toBeLessThanOrEqual(1);
    await page.evaluate(() => document.querySelectorAll("[data-sa-probe]").forEach((n) => n.remove()));
  });

  /**
   * ⚠️ THE BLEND TRAP. A `transform` on any ancestor isolates the blend group and the artwork's
   * white field returns — silently. Measured from the mark UPWARDS to the document, so a transform
   * introduced three levels above still fails here.
   */
  test("P2.3 · no ancestor of a stat illustration carries a transform", async ({ page }) => {
    for (const width of WIDTHS) {
      await openDash(page, width);
      const r = await page.evaluate(() => {
        const marks = [...document.querySelectorAll(".os-greet .os-mark-il")] as HTMLElement[];
        const bad: string[] = [];
        for (const m of marks) {
          for (let el: HTMLElement | null = m.parentElement; el; el = el.parentElement) {
            const t = getComputedStyle(el).transform;
            if (t && t !== "none") bad.push(`${el.tagName.toLowerCase()}.${el.className || "(none)"} → ${t}`);
          }
        }
        return {
          marks: marks.length,
          blend: marks.map((m) => getComputedStyle(m.querySelector("img")!).mixBlendMode),
          bad: [...new Set(bad)],
        };
      });
      /* ⚠️ THE POPULATION FIRST. Zero marks yields zero offending ancestors and passes having
         measured nothing — the vacuous shape this repo records against every negative check. */
      expect(r.marks, `no stat illustrations found at ${width}`).toBe(3);
      // eslint-disable-next-line no-console
      console.log(`[P2.3] ${width}: marks=${r.marks} blend=${r.blend.join("/")} transforms=${r.bad.length}`);
      expect(r.bad, `a transformed ancestor at ${width} kills the blend`).toEqual([]);
      /* ⚠️ TWO MULTIPLY, ONE NORMAL — a property of the ARTWORK, not an inconsistency. Two marks are
         DRAWN on a white field that `multiply` removes; the plane is PAINTED on a watercolour wash
         and multiplying it would darken the wash. `.os-cic.plane img` states the exception and this
         asserts the split, so a future edit that blends all three fails rather than passing on a
         looser `every`. */
      expect(r.blend.filter((b) => b === "multiply").length, "the drawn marks stopped compositing").toBe(2);
      expect(r.blend.filter((b) => b === "normal").length, "the painted mark started compositing").toBe(1);
    }
  });
});
