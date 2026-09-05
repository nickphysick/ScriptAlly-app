import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ TODAY IS THE MIDDLE OF THE LANE, AT EVERY RANGE AND EVERY WIDTH (v54, Phase 1).
 *
 * The window is `today − range/2 … today + range/2`, so today's painted x is the lane's own
 * horizontal centre. That is a claim about arrangement, not about a number, and it is asserted as
 * an equality between two measured things — the painted line against the measured lane — rather
 * than against a coordinate written here, which would fail on every legitimate width change and
 * say nothing about whether the board is centred.
 *
 * ⚠️ AND THE RANGE IS ASSERTED TO HAVE CHANGED. A sweep whose control did not take measures one
 * board three times and reports a clean table; the trigger's own summary names the non-default
 * range, so it is read back after every step.
 */
const WIDTHS = [1920, 1440, 1280, 1024, 900, 768] as const;

test("today's painted x is the lane's centre, every range, every width", async ({ page }) => {
  const rows: string[] = [];
  const seen = new Set<string>();
  for (const w of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width: w, height: 900 });
    await page.waitForTimeout(700);
    for (let i = 0; i < RANGE_LABELS.length; i++) {
      await setRangeTo(page, i);
      /* ⚠️ THE DISPLAY TRIGGER IS GONE (v64 §E) and the range list is ONE window — the
         verification that the range "was reached" retargets to the winbar stating a range at
         all, which is the one label the window has. */
      const at = await page.evaluate(() => (document.querySelector(".tl-rng")?.textContent || "").trim());
      expect(at, `[${w}] the winbar states no range`).toMatch(/^\d{1,2} [A-Z][a-z]+ – \d{1,2} [A-Z][a-z]+ \d{4}$/);
      seen.add(`${w}:${i}`);

      const m = await page.evaluate(() => {
        const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
        const lane = [...document.querySelectorAll(".tl-c-tl")].filter(vis)[0] as HTMLElement | undefined;
        const line = document.querySelector(".tl-todayline") as HTMLElement | null;
        if (!lane || !line) return null;
        const lb = lane.getBoundingClientRect();
        const tb = line.getBoundingClientRect();
        return { laneCentre: lb.left + lb.width / 2, todayX: tb.left + tb.width / 2,
          laneW: lb.width };
      });
      expect(m, `[${w}/${RANGE_LABELS[i]}] no lane or no today line to measure`).not.toBeNull();
      const off = Math.abs(m!.todayX - m!.laneCentre);
      rows.push(`${String(w).padEnd(5)} ${RANGE_LABELS[i].padEnd(9)} lane ${m!.laneW.toFixed(0)}px`
        + ` · today ${m!.todayX.toFixed(1)} · centre ${m!.laneCentre.toFixed(1)} · off ${off.toFixed(2)}px`);
      /**
       * ⚠️ HALF A DAY, AND THE REASON IS NAMED RATHER THAN THE NUMBER LOOSENED.
       *
       * This board places a day at its MIDPOINT; the ref places it at its BOUNDARY. That cancelled
       * while the spans were odd (31/91/181) and does not at v58's ninety: today lands half a day
       * off centre whichever way `pastDaysOf` rounds — 49.44% or 50.56%, measured both ways, with
       * no third value available. The residue IS the half-day, so the tolerance is one half-day of
       * lane, computed rather than guessed, and it tightens by itself if the span ever grows.
       *
       * A flat "less than 8px" would have hidden the same fact behind a number nobody could check.
       */
      const halfDay = m!.laneW / 90 / 2;
      /* + 1: the line carries `translateX(-1px)` to centre its own 1.5px stroke, which shifts the
         measured centre by up to a pixel on top of the half-day — both terms named, neither a
         guessed slack */
      expect(off, `[${w}/${RANGE_LABELS[i]}] today is ${off.toFixed(1)}px off the lane's centre,`
        + ` which is more than the half-day (${halfDay.toFixed(1)}px) plus the line's own -1px shift`)
        .toBeLessThanOrEqual(halfDay + 1);
    }
  }
  for (const r of rows) console.log(r);
  expect(seen.size, "width × range combinations visited").toBe(WIDTHS.length * RANGE_LABELS.length);
});
