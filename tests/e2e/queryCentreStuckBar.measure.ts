/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CORRECTION 1 — the sticky controls obey the collapsed masthead.
 *
 * ⚠️ THE CLAIM IS AN EQUALITY BETWEEN TWO MEASURED BOXES, not an offset value. "The controls sit
 * 46px down" is satisfied by a bar that is not there; "the bar's bottom edge IS the controls' top
 * edge" cannot be, and it survives the bar changing height.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync } from "node:fs";

const WIDTHS = [1440, 2560];

test("the controls stick beneath the collapsed bar, not over it", async ({ page }) => {
  const out: Record<string, unknown> = {};
  mkdirSync("reports", { recursive: true });

  for (const width of WIDTHS) {
    await openRoute(page, "/queries", { width, height: 900 });
    await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });

    const read = () => page.evaluate(() => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const box = (e: HTMLElement | null) => {
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { top: Math.round(r.top * 10) / 10, bottom: Math.round(r.bottom * 10) / 10, h: Math.round(r.height) };
      };
      const bar = q(".wpg-bar");
      const barShown = !!bar && getComputedStyle(bar).opacity !== "0" && bar.getBoundingClientRect().height > 0;
      const cards = [...document.querySelectorAll<HTMLElement>(".qcc")];
      const controls = q(".qcc-controls");
      const cb = controls?.getBoundingClientRect();
      /**
       * ⚠️ THE FIRST FULLY-CLEAR CARD, not the first that pokes out. My first version picked the
       * first card whose BOTTOM was below the controls — satisfied by a card almost entirely behind
       * them — and then asserted its band was clear, which it could not be. Cards passing BEHIND a
       * sticky block is what sticky is; the claim is that there is a card wholly below it.
       */
      const firstClear = cards.find((c) => cb && c.getBoundingClientRect().top >= cb.bottom - 1) ?? null;
      /* and the count obscured at REST, which must be zero — nothing hidden before you scroll */
      const obscuredAtRest = cb
        ? cards.filter((c) => {
            const r = c.getBoundingClientRect();
            return r.top < cb.bottom && r.bottom > cb.top;
          }).length
        : -1;
      return {
        barShown,
        bar: box(bar),
        controls: box(controls),
        stuckH: getComputedStyle(document.documentElement).getPropertyValue("--wpg-stuck-h").trim()
          || getComputedStyle(q(".wpg") as HTMLElement).getPropertyValue("--wpg-stuck-h").trim(),
        masthead: box(q(".wsh")),
        mastheadShown: !!q(".wsh") && (q(".wsh") as HTMLElement).getBoundingClientRect().height > 0,
        firstClearBandTop: firstClear
          ? Math.round((firstClear.querySelector(".qcc-band") as HTMLElement).getBoundingClientRect().top * 10) / 10
          : null,
        obscuredAtRest,
        scrollTop: Math.round((q(".wpg-scroll") as HTMLElement)?.scrollTop ?? 0),
      };
    });

    out[`rest@${width}`] = await read();
    await page.evaluate(() => { (document.querySelector(".wpg-scroll") as HTMLElement).scrollTop = 900; });
    await page.waitForTimeout(700);
    out[`scrolled@${width}`] = await read();
    await page.evaluate(() => { (document.querySelector(".wpg-scroll") as HTMLElement).scrollTop = 0; });
    await page.waitForTimeout(700);
    out[`back@${width}`] = await read();
    writeFileSync("reports/query-centre-stuckbar.json", JSON.stringify(out, null, 2));
  }

  for (const width of WIDTHS) {
    const s = out[`scrolled@${width}`] as Record<string, never>;
    const rest = out[`rest@${width}`] as Record<string, never>;
    const back = out[`back@${width}`] as Record<string, never>;
    const w = `@${width}`;

    /* the precondition: the page must have actually scrolled, or every claim below is vacuous */
    expect(s.scrollTop as unknown as number, `${w} the page did not scroll`).toBeGreaterThan(400);

    expect(s.barShown as unknown as boolean, `${w} the collapsed bar is not visible after scrolling`).toBe(true);
    const bar = s.bar as unknown as { bottom: number };
    const ctl = s.controls as unknown as { top: number; bottom: number };
    expect(bar, `${w} no bar box`).toBeTruthy();
    expect(ctl, `${w} no controls box`).toBeTruthy();

    /* ⚠️ THE EQUALITY. Not "the controls are 46px down" — that passes with no bar at all. */
    expect(Math.abs(bar.bottom - ctl.top),
      `${w} the controls do not meet the bar's bottom edge (bar ${bar.bottom}, controls ${ctl.top})`)
      .toBeLessThanOrEqual(1);

    /* ⚠️ A CARD EXISTS WHOLLY BELOW THEM, and its band is clear. Cards passing behind a sticky
       block is what sticky is; a page where NONE is clear is a page reading through its own chrome. */
    expect(s.firstClearBandTop as unknown as number | null,
      `${w} no card sits wholly below the controls`).not.toBeNull();
    expect(s.firstClearBandTop as unknown as number,
      `${w} the first clear card's band is under the controls`).toBeGreaterThanOrEqual(ctl.bottom - 1);

    /* ⚠️ AND NOTHING IS OBSCURED BEFORE YOU SCROLL. That was the reported fault — controls pinned
       at the very top with the first row clipped under them from the moment the page loaded. */
    expect(rest.obscuredAtRest as unknown as number,
      `${w} ${rest.obscuredAtRest} cards are behind the controls at rest`).toBe(0);

    /* scrolling back restores the full masthead */
    expect(back.mastheadShown as unknown as boolean, `${w} the masthead did not come back`).toBe(true);
    expect((back.scrollTop as unknown as number), `${w} did not return to the top`).toBeLessThanOrEqual(2);
    /* and at rest the controls are NOT pinned to the bar's line */
    expect((rest.controls as unknown as { top: number }).top,
      `${w} the controls are pinned at rest`).toBeGreaterThan((rest.bar as unknown as { bottom: number } | null)?.bottom ?? 0);
  }
});
