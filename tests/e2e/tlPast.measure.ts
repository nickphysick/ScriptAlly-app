import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 6 — every range opens a slice before today, and markers land in it.
 *
 * ⚠️ THIS IS ALSO THE FIX FOR THE ACCEPTANCE GAP. Last run the marker-size row of the table came
 * back `null` at all twenty stops because the board opened at today and ran forward, while a
 * marker is a RECORD and records are in the past. So the sweep had to page back to see one. With
 * a past slice the markers are simply there — asserted NON-NULL rather than guarded, which is the
 * whole point: a guarded check that skips is a check that says nothing and does not admit it.
 */
const STOPS = ["1 week", "2 weeks", "1 month", "3 months", "6 months"];
const WANT_PAST = [2, 3, 7, 23, 46];

test("Phase 6 — the past slice, at every range", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const slider = page.getByRole("slider", { name: /range/i });

  for (let i = 0; i < STOPS.length; i++) {
    await slider.fill(String(i));
    await page.waitForTimeout(650);
    const m = await page.evaluate(() => {
      const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
      const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
      const heads = [...tl.querySelectorAll(".tl-dh")] as HTMLElement[];
      const past = heads.filter((h) => h.classList.contains("past"));
      const cells = [...tl.querySelectorAll(".tl-row:not(.tl-head) .tl-cell")] as HTMLElement[];
      const pastCell = cells.find((c) => c.classList.contains("past"));
      const aheadCell = cells.find((c) => !c.classList.contains("past") && !c.classList.contains("today"));
      return {
        heads: heads.length,
        pastHeads: past.length,
        todayHeads: heads.filter((h) => h.classList.contains("today")).length,
        /* ⚠️ THE MUTING IS READ OFF THE RENDER, not off the class — a class proves the markup, an
           opacity proves the rule reached it. */
        pastDim: past.length ? getComputedStyle(past[0]).opacity : null,
        aheadDim: heads.length > past.length
          ? getComputedStyle(heads[heads.length - 1]).opacity : null,
        pastBg: pastCell ? getComputedStyle(pastCell).backgroundColor : null,
        aheadBg: aheadCell ? getComputedStyle(aheadCell).backgroundColor : null,
        markers: tl.querySelectorAll(".tl-node").length,
      };
    });
    const say = `${STOPS[i].padEnd(9)} ${m.pastHeads}/${m.heads} past columns · today ${m.todayHeads}` +
      ` · dim ${m.pastDim} vs ${m.aheadDim} · ${m.markers} markers`;
    console.log(`  ${say}`);

    /* ⚠️ THE PAST SLICE IS COUNTED IN COLUMNS, WHICH IS DAYS ONLY AT DAY GRAIN. At week and month
       grain a column is a whole week or month, so the expectation is the DAYS converted, not the
       days themselves — the mistake this check exists to catch is a slice measured in the wrong
       unit and looking plausible. */
    expect(m.heads, `${say} — no columns`).toBeGreaterThan(0);
    expect(m.pastHeads, `${say} — nothing before today`).toBeGreaterThan(0);
    expect(m.pastHeads, `${say} — the past slice is the whole board`).toBeLessThan(m.heads);
    expect(m.todayHeads, `${say} — today is not on the board`).toBe(1);

    /* ⚠️ MUTED, AND MEASURED — and the forward header is measured too, or "0.55" would pass on a
       board where every header is dimmed. */
    expect(Number(m.pastDim), `${say} — a past header is not muted`).toBeLessThan(1);
    expect(Number(m.aheadDim), `${say} — a forward header is muted too`).toBe(1);
    expect(m.pastBg, `${say} — a past cell takes no deeper ground`).not.toBe(m.aheadBg);

    /* ⚠️ NON-NULL, NOT GUARDED. This is the assertion that silently skipped twenty times. */
    expect(m.markers, `${say} — no marker in view, so the past slice bought nothing`).toBeGreaterThan(0);
  }

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
