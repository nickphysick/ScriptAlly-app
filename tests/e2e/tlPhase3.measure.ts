import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const STOPS = ["1 week", "2 weeks", "1 month", "3 months", "6 months"];
test("Phase 3 — five ranges, four density tiers", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);

  /* ⚠️ BY ROLE, NOT BY CLASS — the pack's own probe rule. */
  const slider = page.getByRole("slider", { name: /range/i });
  expect(await slider.count(), "no range control found by role").toBe(1);

  for (let i = 0; i < STOPS.length; i++) {
    await slider.fill(String(i));
    await page.waitForTimeout(700);
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
        barText: lbl ? getComputedStyle(lbl).display : (seg ? "no-label" : "no-bar"),
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
    /* bar text leaves at 3 months, and the row head takes the sentence */
    if (i >= 3 && m.barText !== "no-bar" && m.barText !== "no-label") {
      expect(m.barText, `${STOPS[i]}: bar text did not leave`).toBe("none");
    }
  }
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 3)) : "none");
  expect(errs).toEqual([]);
});
