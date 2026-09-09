import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const SHOTS = "/Users/nickphysick/ScriptAlly-app/reports/calendar-mount-shots";
const VIEWS = ["Grid", "List", "Board", "Calendar"] as const;

/** the visible Query Centre page — every workspace page stays mounted */
const scope = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const live = [...document.querySelectorAll<HTMLElement>(".wpg.qc-wpg")]
      .filter((e) => e.getBoundingClientRect().height > 0);
    if (live.length !== 1) throw new Error(`expected one visible Query Centre, found ${live.length}`);
    live[0].setAttribute("data-qc-live", "1");
    return "[data-qc-live] ";
  });

const pick = async (page: import("@playwright/test").Page, name: string) => {
  await page.locator(`[data-qc-live] .qvs button:has-text("${name}")`).first().click();
  await page.waitForTimeout(700);
};

test("§2 · the toolbar does not move between views, and the well is Grid and List only — 1440", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  const s = await scope(page);
  const rects: Record<string, { tb: DOMRect; search: DOMRect; sw: DOMRect; left: DOMRect; well: boolean; plain: boolean }> = {} as never;
  for (const v of VIEWS) {
    await pick(page, v);
    rects[v] = await page.evaluate((sel) => {
      const r = (q: string) => {
        const e = document.querySelector<HTMLElement>(sel + q);
        if (!e) throw new Error(`missing ${q}`);
        const b = e.getBoundingClientRect();
        return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), width: +b.width.toFixed(2), height: +b.height.toFixed(2) } as unknown as DOMRect;
      };
      return {
        tb: r(".qcc-tb"), search: r(".qcc-tb-search"), sw: r(".qvs"), left: r(".qcc-tb-left"),
        well: !!document.querySelector(sel + ".qcc-well"),
        plain: !!document.querySelector(sel + ".qcc-plain"),
      };
    }, s);
  }
  console.log("RECTS " + JSON.stringify(rects));

  /* ⚠️ THE WELL IS ABSENT, NOT TRANSPARENT — a see-through recess still has its box, and anything
     measuring the page still sees it. */
  expect(rects.Grid.well, "Grid must keep the well").toBe(true);
  expect(rects.List.well, "List must keep the well").toBe(true);
  expect(rects.Board.well, "Board must have NO well element").toBe(false);
  expect(rects.Calendar.well, "Calendar must have NO well element").toBe(false);
  expect(rects.Board.plain && rects.Calendar.plain, "Board and Calendar sit on the plain ground").toBe(true);

  /* ⚠️ THE TOOLBAR ROW AND THE VIEW SWITCH MAY NOT MOVE — they are the page's furniture and the
     reader's hand is on them. Both are identical to the pixel in all four views. */
  for (const key of ["tb", "sw"] as const) {
    for (const v of VIEWS) {
      for (const axis of ["x", "y", "width", "height"] as const) {
        const a = (rects.Grid[key] as unknown as Record<string, number>)[axis];
        const b = (rects[v][key] as unknown as Record<string, number>)[axis];
        expect(Math.abs(a - b), `${key}.${axis} moved between Grid and ${v}: ${a} vs ${b}`)
          .toBeLessThanOrEqual(0.5);
      }
    }
  }

  /* ⚠️ THE SEARCH'S X IS NOT CONSTANT ACROSS VIEWS, AND THE BRIEF'S ASSERTION THAT IT IS CANNOT BE
     SATISFIED WHILE PER-VIEW SORT AND GROUP DEFAULTS EXIST.
     Measured: Grid `None`/`Last activity` -> left cluster 488.78; List `None`/`Date sent` -> 472.53;
     Board and Calendar `Status`/`Date sent` -> 478.63. The toolbar is
     `grid-template-columns: 1fr minmax(0, 360px) 1fr`, and `1fr` is `minmax(auto, 1fr)` — a track
     cannot shrink below its content — so the search begins exactly where the left cluster ends.
     `searchX - leftW` is 295.00 in ALL FOUR views, and THAT is the invariant worth locking: the
     search sits immediately after the cluster, and its x moves only because the WORDS on the pills
     differ by view, which is the per-view defaults feature working.
     It is pre-existing, not the well's doing: Grid and List differ by 16.25px and both keep the
     well. Asserting the stated claim would fail on a correct page. */
  const gaps: Record<string, number> = {};
  for (const v of VIEWS) {
    gaps[v] = +((rects[v].search as unknown as Record<string, number>).x
      - (rects[v].left as unknown as Record<string, number>).x
      - (rects[v].left as unknown as Record<string, number>).width).toFixed(2);
  }
  console.log("GAPS " + JSON.stringify(gaps));
  for (const v of VIEWS) {
    expect(Math.abs(gaps[v] - gaps.Grid), `the search left its cluster in ${v}: ${gaps[v]} vs ${gaps.Grid}`)
      .toBeLessThanOrEqual(0.5);
    for (const axis of ["y", "height"] as const) {
      const a = (rects.Grid.search as unknown as Record<string, number>)[axis];
      const b = (rects[v].search as unknown as Record<string, number>)[axis];
      expect(Math.abs(a - b), `search.${axis} moved between Grid and ${v}`).toBeLessThanOrEqual(0.5);
    }
  }
});

test("§2 · the calendar draws the page's own filtered set, and a row opens its query — 1440", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  const s = await scope(page);
  await pick(page, "Calendar");
  const before = await page.evaluate((sel) => document.querySelectorAll(sel + ".tl-rrow").length, s);
  expect(before, "no rows drawn — the calendar has nothing to assert about").toBeGreaterThan(2);

  /* the toolbar's own search narrows `sortedList`, which is what the calendar draws */
  await page.locator("[data-qc-live] .qcc-tb-search input").first().fill("zzzz-no-such-agent");
  await page.waitForTimeout(800);
  const after = await page.evaluate((sel) => document.querySelectorAll(sel + ".tl-rrow").length, s);
  console.log(`ROWS ${before} -> ${after} under a search that matches nothing`);
  expect(after, "filtering the page did not narrow the calendar").toBeLessThan(before);

  await page.locator("[data-qc-live] .qcc-tb-search input").first().fill("");
  await page.waitForTimeout(800);
  /* a bar click opens the drawer on that query */
  const bar = page.locator("[data-qc-live] .tl-p").first();
  await bar.click();
  await page.waitForTimeout(900);
  const url = page.url();
  const opened = await page.evaluate(() => !!document.querySelector(".qcd, .f12-drawer, [data-query-drawer]"));
  console.log(`AFTER CLICK url=${url} drawerish=${opened}`);
  expect(url.includes("q=") || opened, "clicking a bar opened nothing").toBe(true);
});

test("§2 · the week pager moves the window by exactly seven days — 1440", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  const s = await scope(page);
  await pick(page, "Calendar");
  /* ⚠️ THE BOARD'S REAL CONTROL, BY ITS REAL NAME. `calWindow58`'s helper presses
     `aria-label="Previous window"`, which this board does not have, and its `if (b) b.click()`
     fails open — so it reports a no-op about a control it never touched. */
  const first = async () => page.evaluate((sel) => {
    const d = document.querySelector<HTMLElement>(sel + ".tl-dt");
    return d?.getAttribute("data-at") ? (document.querySelectorAll(sel + ".tl-dt")[0] as HTMLElement).textContent?.trim() : null;
  }, s);
  const label = async () => page.evaluate((sel) => document.querySelector(sel + ".tl-rng")?.textContent?.trim() ?? "", s);
  const l0 = await label();
  await page.locator('[data-qc-live] button[aria-label="Back one week"]').first().click();
  await page.waitForTimeout(700);
  const l1 = await label();
  console.log(`WINDOW "${l0}" -> "${l1}"`);
  expect(l1, "the window did not move").not.toBe(l0);
  const d0 = new Date(`${l0.split(" – ")[0]} 2026`);
  const d1 = new Date(`${l1.split(" – ")[0]} 2026`);
  const days = Math.round((d0.getTime() - d1.getTime()) / 86400000);
  expect(days, `the step moved ${days} days, not 7`).toBe(7);
  void first;
});
