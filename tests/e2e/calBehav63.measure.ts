/**
 * v63 G — behaviours. Every claim is DRIVEN: a state change nobody performed is not a behaviour.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";
const board = async (page: import("@playwright/test").Page) => page.evaluate(() => {
  const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
    .find((e) => e.getBoundingClientRect().height > 0)!;
  return {
    groups: g.querySelectorAll(".tl-grp").length,
    bars: g.querySelectorAll(".tl-gdiv").length,
    rows: g.querySelectorAll(".tl-rrow").length,
    chevrons: [...g.querySelectorAll<HTMLElement>(".tl-gchev")].map((c) => c.textContent?.trim()),
    expanded: [...g.querySelectorAll<HTMLElement>(".tl-gdiv")].map((d) => d.getAttribute("aria-expanded")),
    /* v64 §B: the window's one label is the winbar's range headline */
    window: document.querySelector(".tl-rng")?.textContent?.trim()
      ?? document.querySelector(".tl-axis .railnav")?.textContent?.trim() ?? null,
    toast: document.querySelector(".tl-acttoast")?.textContent?.trim() ?? null,
    sticky: (() => { const d = g.querySelector<HTMLElement>(".tl-gdiv");
      return d ? { pos: getComputedStyle(d).position, top: getComputedStyle(d).top } : null; })(),
  };
});

test.describe("v63 · G — behaviours", () => {
  test("⚠️ (g1) a group bar collapses its group, and the chevron says which way", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const before = await board(page);
    expect(before.bars, "no group bars to press").toBeGreaterThan(1);
    expect(before.rows, "no rows to fold away").toBeGreaterThan(4);
    expect(before.expanded.every((v) => v === "true"), "a group started collapsed").toBe(true);

    await page.locator(".tl-gdiv").first().click();
    await page.waitForTimeout(200);
    const after = await board(page);
    /* ⚠️ THE ROW COUNT IS THE CLAIM, not the chevron. A chevron that flips over a group that did
       not fold is a control that reports its own state and does nothing — which is exactly the
       fault this board has retired twice. */
    expect(after.rows, "the group did not fold").toBeLessThan(before.rows);
    expect(after.bars, "the bar disappeared with its rows").toBe(before.bars);
    expect(after.expanded[0], "the bar does not say it is collapsed").toBe("false");
    expect(after.chevrons[0], "the chevron did not change").not.toBe(before.chevrons[0]);

    /* and back — a collapse that cannot be undone is a deletion */
    await page.locator(".tl-gdiv").first().click();
    await page.waitForTimeout(200);
    const back = await board(page);
    expect(back.rows, "the group did not come back").toBe(before.rows);
  });

  test("⚠️ (g2) the group bar sticks to the top of the scroller", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const b = await board(page);
    expect(b.sticky?.pos, "the group bar does not stick").toBe("sticky");
    /* ⚠️ `top: 0` BECAUSE NOTHING IS ABOVE IT INSIDE THE SCROLLER. A sticky on a page that cannot
       scroll CLAMPS rather than idling, so a guessed offset for chrome that is not there would
       push the bar down on every page that does not scroll. */
    expect(b.sticky?.top, `the bar's offset is ${b.sticky?.top}`).toBe("0px");
  });

  test("⚠️ (g3) dragging the empty lane moves the window by whole weeks", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const before = await board(page);
    expect(before.window, "no window label to compare").toBeTruthy();
    /* grab a patch of empty lane — below the last row, so no card can claim the press */
    const box = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
        .find((e) => e.getBoundingClientRect().height > 0)!;
      const lane = g.querySelector<HTMLElement>(".tl-c-tl")!.getBoundingClientRect();
      return { x: lane.left + lane.width * 0.55, y: lane.top + 8, w: lane.width };
    });
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    /* a fifth of the lane — several weeks at any range, so the step cannot be lost in the carry */
    await page.mouse.move(box.x - box.w * 0.2, box.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const after = await board(page);
    console.log(`window: "${before.window}" → "${after.window}"`);
    expect(after.window, "the drag did not move the window").not.toBe(before.window);
  });

  test("⚠️ (g4) an action button answers with a toast, and claims nothing else", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    /* ⚠️ HOVER THE ROW FIRST — the button is `pointer-events: none` at rest BY DESIGN, so a click
       waits the full timeout on an element that is deliberately unreachable. `force: true` would
       dispatch at coordinates the row's own hover has since moved, which this repo has already paid
       for once; making the element actionable is the honest fix, and it exercises the reveal too. */
    const btn = page.locator(".tl-actbtn").first();
    expect(await btn.count(), "no action button to press").toBeGreaterThan(0);
    const rowBox = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
        .find((e) => e.getBoundingClientRect().height > 0)!;
      const r = g.querySelector<HTMLElement>(".tl-actbtn")!.closest<HTMLElement>(".tl-rrow")!
        .getBoundingClientRect();
      return { x: r.left + 60, y: r.top + r.height / 2 };
    });
    await page.mouse.move(rowBox.x, rowBox.y);
    await page.waitForTimeout(260);
    await btn.click();
    await page.waitForTimeout(200);
    const b = await board(page);
    expect(b.toast, "no toast answered the press").toBeTruthy();
    /* ⚠️ THE TOAST SAYS WHAT WAS PRESSED, NEVER THAT THE WORK IS DONE. What the deed does belongs
       to the flow it opens; "Marked done" over a flow the writer has not completed is a
       fabricated confirmation. */
    expect(b.toast, `the toast claims completion: "${b.toast}"`)
      .not.toMatch(/\b(done|sent|recorded|saved|marked|complete)\b/i);
  });

  test("⚠️ (g5) and nothing else was added — no row hover ground, no label motion", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const sheet = readFileSync("src/components/todo/todoCalendar.css", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(sheet, "a row hover background came back")
      .not.toMatch(/(?:^|\n)\s*\.tl-rrow:hover\s*\{[^}]*background/);
    const anim = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
        .find((e) => e.getBoundingClientRect().height > 0)!;
      return [...new Set([...g.querySelectorAll<HTMLElement>(".tl-actlab, .tl-actbtn")]
        .map((e) => getComputedStyle(e).animationName))];
    });
    expect(anim, `a label or button animates: ${JSON.stringify(anim)}`).toEqual(["none"]);
  });
});
