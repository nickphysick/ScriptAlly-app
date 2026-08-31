/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BOARD BELOW 1280 (v37, Phase 9) — measured before anything is changed.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const TAG = `
  const vis = (sel) => [...document.querySelectorAll(sel)]
    .find((e) => e.getBoundingClientRect().height > 0) || null;
`;

test("what the board does as it narrows", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });

  const rows: string[] = [];
  const readings: any[] = [];
  for (const w of [1440, 1280, 1180, 1024, 900, 768]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(500);
    const r = await page.evaluate(TAG + `(() => {
      const row = vis(".tl-rrow");
      if (!row) return { fatal: "no row" };
      const nm = row.querySelector(".tl-c-nm");
      const ac = row.querySelector(".tl-c-ac");
      const tl = row.querySelector(".tl-c-tl");
      const bx = (e) => e ? Math.round(e.getBoundingClientRect().width) : null;
      const bars = [...document.querySelectorAll(".tl-p")].filter((b) => b.getBoundingClientRect().width > 0);
      const on = (e) => !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0;
      let both = 0, one = 0, bare = 0;
      for (const b of bars) {
        const txt = b.querySelector(".tl-txt"), t2 = b.querySelector(".tl-t2");
        if (!on(txt)) bare += 1; else if (on(t2)) both += 1; else one += 1;
      }
      /* does anything overlap anything else in the row's three columns */
      const boxes = [nm, ac, tl].filter(Boolean).map((e) => e.getBoundingClientRect());
      let overlap = 0;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        if (boxes[i].right > boxes[j].left + 1 && boxes[j].right > boxes[i].left + 1) overlap += 1;
      }
      /* the rail's ticks and month labels, and whether any two collide */
      const ticks = [...document.querySelectorAll(".tl-dt")].filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => e.getBoundingClientRect()).sort((a, b) => a.left - b.left);
      let tickClash = 0;
      for (let i = 1; i < ticks.length; i++) if (ticks[i].left < ticks[i - 1].right + 2) tickClash += 1;
      return {
        name: bx(nm), action: bx(ac), lane: bx(tl),
        docScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        both, one, bare, overlap, tickClash, ticks: ticks.length,
      };
    })()`) as any;
    expect(r.fatal, `${w}px: ${r.fatal}`).toBeUndefined();
    readings.push({ w, ...r });
    rows.push(`  ${String(w).padEnd(5)} name ${String(r.name).padStart(4)} · action ${String(r.action).padStart(4)}`
      + ` · lane ${String(r.lane).padStart(4)}   text both ${r.both} / one ${r.one} / bare ${r.bare}`
      + `   overlap ${r.overlap} · ticks ${r.ticks} (${r.tickClash} clashing)`
      + (r.docScroll ? " · ⚠️ HORIZONTAL SCROLL" : ""));
  }
  console.log("the board as it narrows:");
  for (const r of rows) console.log(r);

  const firstBelow = readings.find((r) => r.lane != null && r.lane < 320);
  console.log(firstBelow
    ? `  ⚠️ the timeline lane falls below 320px at ${firstBelow.w}px (lane ${firstBelow.lane})`
    : `  the timeline lane never falls below 320px down to 768`);

  /* ⚠️ THE ACCEPTANCE, and it is asserted rather than only reported: whatever the columns do, the
     lane must keep 320px, nothing may overlap, and the page must never scroll sideways. */
  const thin = readings.filter((r) => r.lane != null && r.lane < 320)
    .map((r) => `${r.w}px → lane ${r.lane}`);
  expect(thin, `the timeline lane went under 320px: ${thin.join(", ")}`).toEqual([]);
  const lapped = readings.filter((r) => r.overlap > 0).map((r) => `${r.w}px`);
  expect(lapped, `columns overlap at: ${lapped.join(", ")}`).toEqual([]);
  const scrolled = readings.filter((r) => r.docScroll).map((r) => `${r.w}px`);
  expect(scrolled, `the page scrolls sideways at: ${scrolled.join(", ")}`).toEqual([]);
});
