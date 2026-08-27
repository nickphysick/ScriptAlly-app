import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const read = (page: any) => page.evaluate(() => {
  const px = (n: number) => Math.round(n * 100) / 100;
  /* ⚠️ THE VISIBLE BOARD, NOT THE FIRST ONE IN THE DOCUMENT — every workspace page stays mounted. */
  const vis = <T extends Element>(sel: string): T =>
    ([...document.querySelectorAll(sel)] as unknown as HTMLElement[])
      .find((e) => e.getBoundingClientRect().height > 0) as unknown as T;
  const tl = vis<HTMLElement>(".tl");
  const board = vis<HTMLElement>(".tl-board");
  /* ⚠️ A BAR ROW, NAMED — NOT "the first row that is not the header". This claim is about the lane
     a JOURNEY BAR sits in (44px bar + 13px padding either side = 70). `.tl-row--pin` is the pinned
     "Your tasks" row, whose occupants are chips, so its lane is a different and equally correct
     40 — and `:not(.tl-head)` happily matched it. It passed for as long as the harness account had
     no tasks due, and went red the day it had one: a probe whose SUBJECT depends on the fixture,
     which is the shape this repo records against `.first()` and against defaults that silently
     choose what you are measuring. The failure read as a layout regression and was a selector. */
  const row = tl.querySelector(".tl-row:not(.tl-head):not(.tl-row--pin)") as HTMLElement;
  const cs = getComputedStyle(row);
  const spine = tl.querySelector(".tl-spine") as HTMLElement | null;
  const bar = tl.querySelector(".tl-seg") as HTMLElement | null;
  const todayCell = tl.querySelector(".tl-cell.today") as HTMLElement | null;
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
    groundToken: getComputedStyle(board).getPropertyValue("--board-ground").trim(),
    headW: getComputedStyle(tl).getPropertyValue("--tl-head-w").trim(),
    bounds: tl.querySelectorAll(".tl-cell.bound").length,
    spineX: spine ? px(spine.getBoundingClientRect().left + spine.getBoundingClientRect().width / 2) : null,
    todayMid: todayCell ? px(todayCell.getBoundingClientRect().left + todayCell.getBoundingClientRect().width / 2) : null,
    spineTall: spine ? px(spine.getBoundingClientRect().height) : null,
    boardTall: px(board.getBoundingClientRect().height),
  };
});
test("Phase 2 — weight, ground, boundaries, and no spine", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  /**
   * ⚠️ 1100 AND 960 ARE HERE FOR THE HEAD-WIDTH CHANGE, and without them this file proves nothing
   * about the pack's own rule. `--tl-head-w` steps 260 → 200 at 1200 and → 150 at 1000, so at the
   * four acceptance widths it never moves — anything positioned by a constant 210 would pass all
   * four and be wrong on a narrow laptop. The two extra widths are where the token earns its keep,
   * and they stay after the spine's removal because `.tl-grid` still reads the same token.
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
    /**
     * ⚠️ THE GROUND IS `--board-ground` NOW, AND THIS LOCK WAS RED FOR TWO PACKS BEFORE ANYONE
     * LOOKED. It pinned `rgb(247, 244, 238)` — `--ws-ground`, the app's content-area colour, which
     * the board borrowed while its bars were white and needed to differ from it. The settled pack
     * gave the board the ref's own `--board-ground` (#eae2d6) and did NOT run this file, which is
     * the discipline the density pack restates at the top: run every owned lock in the phase that
     * changes what it reads.
     *
     * ⚠️ THE LAW SURVIVES AND IS WHAT IS ASSERTED — the board has a ground of its OWN and does not
     * borrow one from the shell. Pinning the value is what made it a maintenance cost; pinning the
     * TOKEN is what makes it a claim.
     */
    expect(m.ground, `[${width}] the board does not paint its own ground token`).toBe("rgb(234, 226, 214)");
    expect(m.groundToken, `[${width}] the board's ground is not a token of its own`).toBe("#eae2d6");
    expect(m.bounds, `[${width}] no week boundary rules`).toBeGreaterThan(0);
    /* ⚠️ THE SPINE IS RETIRED, AND THIS ASSERTS THE RETIREMENT (grouped pack, Phase 2). It used
       to sit on today's column centre and this file proved it did so at six widths, which was the
       right check for as long as the element existed. Today is where the board STARTS, so a line
       marking it restated the layout; the ref draws none either. The honest replacement is that it
       is gone — a check retargeted to some other property of a deleted element would go green for
       the wrong reason forever. */
    expect(m.spineX, `[${width}] the today spine is back`).toBeNull();
    expect(m.spineTall, `[${width}] the today spine is back`).toBeNull();
  }
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 3)) : "none");
  expect(errs).toEqual([]);
});
