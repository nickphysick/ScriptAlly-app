import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const read = (page: any) => page.evaluate(() => {
  const px = (n: number) => Math.round(n * 100) / 100;
  const row = document.querySelector(".tl-row:not(.tl-head)") as HTMLElement;
  const cs = getComputedStyle(row);
  const board = document.querySelector(".tl-board") as HTMLElement;
  const tl = document.querySelector(".tl") as HTMLElement;
  const spine = document.querySelector(".tl-spine") as HTMLElement | null;
  const bar = document.querySelector(".tl-seg") as HTMLElement | null;
  const todayCell = document.querySelector(".tl-cell.today") as HTMLElement | null;
  return {
    barH: cs.getPropertyValue("--bar-h").trim(), rowPad: cs.getPropertyValue("--row-pad").trim(),
    /* ⚠️ THE RENDERED BOX, NOT THE DECLARATION. `getPropertyValue` on a custom property holding a
       `calc()` hands back the calc STRING — the declaration, unresolved. The row's own height over
       its lane count is the number the browser actually used. */
    laneH: px(row.getBoundingClientRect().height / Math.max(1, Number(cs.getPropertyValue("--lanes")) || 1)),
    lanes: Number(cs.getPropertyValue("--lanes")) || 1,
    disc: cs.getPropertyValue("--disc").trim(), ddot: cs.getPropertyValue("--ddot").trim(),
    barRect: bar ? px(bar.getBoundingClientRect().height) : null,
    ground: getComputedStyle(board).backgroundColor,
    headW: getComputedStyle(tl).getPropertyValue("--tl-head-w").trim(),
    bounds: document.querySelectorAll(".tl-cell.bound").length,
    spineX: spine ? px(spine.getBoundingClientRect().left + spine.getBoundingClientRect().width / 2) : null,
    todayMid: todayCell ? px(todayCell.getBoundingClientRect().left + todayCell.getBoundingClientRect().width / 2) : null,
    spineTall: spine ? px(spine.getBoundingClientRect().height) : null,
    boardTall: px(board.getBoundingClientRect().height),
  };
});
test("Phase 2 — weight, ground, boundaries and the spine", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  /**
   * ⚠️ 1100 AND 960 ARE HERE FOR THE HEAD-WIDTH CHANGE, and without them this file proves nothing
   * about the pack's own rule. `--tl-head-w` steps 210 → 168 at 1200 and → 132 at 1000, so at the
   * four acceptance widths it never moves — a spine positioned by a constant 210 would pass all
   * four and be wrong on a narrow laptop. The two extra widths are where the token earns its keep.
   */
  for (const width of [2400, 1920, 1440, 1280, 1100, 960]) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    await page.waitForTimeout(900);
    const m = await read(page);
    console.log(`[${width}] ${JSON.stringify(m)}`);
    expect(m.barH, `[${width}] bar is not 44`).toBe("44px");
    expect(m.barRect, `[${width}] the bar does not render 44`).toBe(44);
    expect(m.disc, `[${width}] disc is not 34`).toBe("34px");
    expect(m.ddot, `[${width}] the direction dot has no token of its own`).toBe("24px");
    expect(m.laneH, `[${width}] the lane is not bar + padding`).toBe(44 + 13 * 2);
    expect(m.ground, `[${width}] the ground did not drop a shade`).toBe("rgb(247, 244, 238)");
    expect(m.bounds, `[${width}] no week boundary rules`).toBeGreaterThan(0);
    /* ⚠️ THE SPINE SITS ON TODAY'S COLUMN CENTRE — and the head column's width differs at 1280,
       so a spine placed by a constant would drift here and nowhere else. */
    if (m.todayMid !== null) {
      expect(Math.abs((m.spineX ?? 0) - m.todayMid), `[${width}] the spine is off today's centre`).toBeLessThan(2);
    }
    expect(m.spineTall, `[${width}] the spine does not span the board`).toBeGreaterThan(m.boardTall * 0.8);
  }
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 3)) : "none");
  expect(errs).toEqual([]);
});
