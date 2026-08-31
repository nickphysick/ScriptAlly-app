import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";
/* ⚠️ THE STOPS ARE SPLICED FROM THE CONTROL, NEVER RETYPED — and this list was WRONG. The 1-week
   and 2-week stops were deleted in v35 (Porcelain, Phase 2), so every run since has driven indices
   3 and 4 against a three-stop control, where they clamp: two of five iterations silently measured
   the six-month board twice and reported it as "2 weeks" and "1 month". Green the whole time, over
   a census that was two-fifths a monoculture. */
const STOPS = [...RANGE_LABELS];
test("Phase 3 — five ranges, four density tiers", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);

  /* ⚠️ BY ROLE, NOT BY CLASS — the pack's own probe rule. */
  /* ⚠️ THE RANGE SLIDER IS RETIRED (v40, Phase 6): the range is one row of the ONE `Display`
     popover now. The helper is shared — every file that drove the old control held its own copy,
     and all of them went red together the day it changed. */

  for (let i = 0; i < STOPS.length; i++) {
    await setRangeTo(page, i);
    const m = await page.evaluate(() => {
      /* ⚠️ THE VISIBLE BOARD, NOT THE FIRST `.tl` IN THE DOCUMENT. Every workspace page stays
         mounted, so a bare querySelector can answer for a page the reader cannot see — the fault
         this repo records against `.tpl-wpg` and against duplicate section ids. */
      const all = Array.from(document.querySelectorAll(".tl")) as HTMLElement[];
      const tl = all.find((e) => e.getBoundingClientRect().height > 0) ?? all[0];
      const cs = getComputedStyle(tl);
      const seg = document.querySelector(".tl-seg") as HTMLElement | null;
      const lbl = document.querySelector(".tl-seg .tl-lbl") as HTMLElement | null;
      return {
        tlCount: all.length,
        dense: (tl.className.match(/dense(\d)/) ?? [])[1] ?? null,
        days: cs.getPropertyValue("--tl-days").trim(),
        cols: cs.getPropertyValue("--tl-cols").trim(),
        clear: cs.getPropertyValue("--clear").trim(),
        headers: document.querySelectorAll(".tl-dh").length,
        weekdayInitials: document.querySelectorAll(".tl-dw").length,
        bounds: document.querySelectorAll(".tl-cell.bound").length,
        /* ⚠️ WHO hid it, not whether it is hidden. `barFit` hides a label by adding `.narrow` to
           the BAR; a tier hid it by setting `display: none` on the label itself. Only the second
           is the fault this pack retired, and only this distinction can tell them apart. */
        barText: !lbl ? (seg ? "no-label" : "no-bar")
          : getComputedStyle(lbl).display === "none" && !seg!.classList.contains("narrow")
            ? "tier-hidden" : getComputedStyle(lbl).display,
        rowSays: document.querySelectorAll(".tl-rowsay").length,
        /* retired in the grouped pack — counted so its return is a failure, not a surprise */
        spine: document.querySelectorAll(".tl-spine").length,
      };
    });
    console.log(`${STOPS[i].padEnd(9)} ${JSON.stringify(m)}`);
    expect(m.days, `${STOPS[i]}: the board's span is wrong`).toBe(
      String([7, 14, 31, 91, 182][i]));
    expect(m.dense, `${STOPS[i]}: wrong density tier`).toBe(String([1, 2, 2, 3, 4][i]));
    expect(Number(m.cols), `${STOPS[i]}: column count`).toBe([7, 14, 31, 13, 7][i]);
    /* ⚠️ THE CLEARANCE IS NOT ASSERTED, AND ITS ABSENCE IS THE ASSERTION. It is still
       `journeyBars.GAP = 0.34` — a third of a day — and migrating it to pixels is a change to the
       bar derivation rather than to the stylesheet. The token is deliberately NOT declared, so this
       checks it stays undeclared rather than pretending the migration happened. */
    expect(m.clear, `${STOPS[i]}: --clear is declared but nothing reads it`).toBe("");
    /* ⚠️ THE TODAY SPINE IS RETIRED (grouped pack, Phase 2). This counted it and never asserted
       it, so its removal would have been silent here. Counting without asserting is the shape
       that lets a deletion look like a clean run. */
    expect(m.spine, `${STOPS[i]}: the today spine is back`).toBe(0);
    /* ⚠️ THE HEAD SPEAKS AT EVERY RANGE (grouped pack, Phase 5). This file used to watch the
       sentence ARRIVE at three months, because the head's words were the bar's label lifted up
       where a bar was too small to carry them. The head has its own sentence now. */
    expect(m.rowSays, `${STOPS[i]}: no row head says anything`).toBeGreaterThan(0);
    /* weekday initials drop at a month and beyond */
    if (i >= 2) expect(m.weekdayInitials, `${STOPS[i]}: weekday initials should have dropped`).toBe(0);
    /**
     * ⚠️ THE RANGE NO LONGER DECIDES WHETHER A BAR SPEAKS (density pack, Phase 1), so this stops
     * asserting that it does. It required `display: none` at three months and beyond, which was
     * the tier's guess; `barFit` measures instead — long form, then short, then bare — and a wide
     * bar at six months may legitimately carry words.
     *
     * ⚠️ THE LAW THAT SURVIVES IS THE ONE WORTH KEEPING: whatever is shown is one of the bar's
     * OWN two forms, never a truncation. That is asserted in `tlBarCopy.measure.ts` across every
     * range, so this file states the retirement rather than restating the claim.
     */
    expect(m.barText, `${STOPS[i]}: a range is deciding whether a bar speaks again`)
      .not.toBe("tier-hidden");
  }
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 3)) : "none");
  expect(errs).toEqual([]);
});
