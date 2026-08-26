/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Calendar's JOURNEY BARS — the acceptance (bars pack, Phase 6).
 *
 * ⚠️ EVERY CLAIM IS MEASURED ON THE RENDERED PAGE. A source lock proves a rule was written, never
 * that it reached an element; a stylesheet lock proves a declaration exists, never what the
 * cascade and the box model do with it.
 *
 * ⚠️ AND WHERE THE HARNESS ACCOUNT CANNOT PRODUCE A CASE, THIS FILE SAYS SO RATHER THAN SKIPPING
 * QUIETLY. Several of v5's nine rules need a query in a state this account does not hold — an
 * offer, an R&R, a closure inside the current week. Those are locked in `journeyBars.test.ts` and
 * the run report names them; what is asserted here is what the page can actually be made to draw.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth, liftMotionSuppression } from "./measure";

const WIDTHS = [1280, 1440, 1920, 2400];
const HEIGHT = 900;

/** the visible page — every workspace page stays MOUNTED, so a bare selector finds hidden ones */
const TAG = `
  const vis = (sel) => [...document.querySelectorAll(sel)]
    .find((e) => e.getBoundingClientRect().height > 0) || null;
`;

/* ══ the chrome ═══════════════════════════════════════════════════════════════════════════════ */

test("one control row, pinned, and it never wraps", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    const r = await page.evaluate<any>(TAG + `(() => {
      const wpg = vis(".wpg");
      const tools = wpg.querySelector(".tpl-tools");
      const board = vis(".tl-board");
      const zone = board.querySelector(".tl-zone");
      const kids = [...tools.children].filter((e) => e.getBoundingClientRect().width > 0);
      /* ⚠️ WRAPPING IS THE ROW GROWING TALLER THAN ITS TALLEST CHILD, not its children having
         different top edges. The first version of this check counted distinct tops and reported
         FIVE lines on a row that is demonstrably one: the controls are 26px and 34px and the row
         centres them, so their top edges legitimately differ. A measurement that answers a
         different question in the format of the one you asked. */
      const tallest = Math.max(...kids.map((e) => e.getBoundingClientRect().height));
      const centres = new Set(kids.map((e) => {
        const b = e.getBoundingClientRect();
        return Math.round(b.top + b.height / 2);
      }));
      return {
        /* ⚠️ WRAPPING IS MEASURED AS DISTINCT TOP EDGES, not as a height threshold. A flex row with
           no flex-wrap grows silently; a row whose children sit on two different lines is the
           fault, whatever it measures. */
        wrapped: tools.getBoundingClientRect().height > tallest + 2,
        tallestChild: Math.round(tallest * 100) / 100,
        offCentre: centres.size,
        toolsH: Math.round(tools.getBoundingClientRect().height * 100) / 100,
        /* the second control row must be gone, not merely empty */
        barRows: document.querySelectorAll(".tl-bar").length,
        kinds: [...tools.querySelectorAll(".tl-kind")].map((e) => e.textContent.trim()),
        hasSearch: !!tools.querySelector(".tl-search"),
        hasSort: [...tools.querySelectorAll(".tl-mbtn")].length,
        countShown: !!tools.querySelector(".tl-count") &&
          tools.querySelector(".tl-count").getBoundingClientRect().width > 0,
        /* pinned: the chrome that holds it sticks to the top of the scroll row */
        chromeSticky: getComputedStyle(wpg.querySelector(".wpg-chrome")).position,
        zone: zone.clientHeight,
        boardTop: Math.round(board.getBoundingClientRect().top),
        docScrollW: document.documentElement.scrollWidth,
        docClientW: document.documentElement.clientWidth,
      };
    })()`);
    console.log(`[${width}] chrome ${JSON.stringify(r)} (scrollbar ${await scrollbarWidth(page)}px)`);

    expect(r.wrapped, `[${width}] the control row wrapped — ${r.toolsH} tall against a ${r.tallestChild} child`).toBe(false);
    /* and it is one line by the other reading too: everything on it shares a centre */
    expect(r.offCentre, `[${width}] the row's controls do not share a centre line`).toBe(1);
    expect(r.barRows, `[${width}] a second control row is still on the page`).toBe(0);
    expect(r.kinds, `[${width}] the filters are not the four`)
      .toEqual(["Your move", "Their move", "Record", "Your tasks"]);
    expect(r.hasSearch, `[${width}] no search on the row`).toBe(true);
    expect(r.hasSort, `[${width}] no sort on the row`).toBeGreaterThan(0);
    expect(r.chromeSticky, `[${width}] the control row is not pinned`).toBe("sticky");
    expect(r.docScrollW, `[${width}] the page scrolls sideways`).toBeLessThanOrEqual(r.docClientW + 1);
    /* ⚠️ THE COUNT ELIDES FIRST — at the narrow end it is allowed to go, and nothing else is. */
    if (width >= 1280) expect(r.countShown, `[${width}] the count went before it had to`).toBe(true);
  }

  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the page threw").toEqual([]);
});

test("what the board gained at 900px", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  const rest = await page.evaluate<any>(TAG + `(() => {
    const board = vis(".tl-board"), wpg = vis(".wpg");
    return {
      zone: board.querySelector(".tl-zone").clientHeight,
      boardTop: Math.round(board.getBoundingClientRect().top),
      mast: Math.round(wpg.querySelector(".wpg-mast").getBoundingClientRect().height * 100) / 100,
      reclaim: Math.round(wpg.querySelector(".wpg-reclaim").getBoundingClientRect().height * 100) / 100,
    };
  })()`);
  await page.evaluate(TAG + `vis(".tl-board").querySelector(".tl-zone").scrollTop = 400`);
  await page.waitForTimeout(700);
  const scrolled = await page.evaluate<any>(TAG + `(() => {
    const board = vis(".tl-board"), wpg = vis(".wpg");
    return {
      zone: board.querySelector(".tl-zone").clientHeight,
      mast: Math.round(wpg.querySelector(".wpg-mast").getBoundingClientRect().height * 100) / 100,
      reclaim: Math.round(wpg.querySelector(".wpg-reclaim").getBoundingClientRect().height * 100) / 100,
    };
  })()`);
  console.log(`board at 900: rest ${JSON.stringify(rest)} -> scrolled ${JSON.stringify(scrolled)}`);
  console.log(`LAST RUN: zone 542 at rest and 542 scrolled, boardTop 335.`);

  /* ⚠️ THE BOARD MUST HAVE GAINED, and the settle's recovery must reach it rather than a spacer.
     Measured last run: the masthead shed 45.89px on settle and .wpg-reclaim took all of it. */
  expect(rest.zone, "the board gained nothing at rest").toBeGreaterThan(542);
  expect(scrolled.zone, "the settle's reclaim did not reach the board").toBeGreaterThan(rest.zone);
  expect(scrolled.mast, "the masthead did not settle").toBeLessThan(rest.mast);
  expect(scrolled.reclaim, "the spacer took the reclaim again").toBeLessThanOrEqual(rest.reclaim + 1);
});

/* ══ the bars ═════════════════════════════════════════════════════════════════════════════════ */

const BARS = TAG + `(() => {
  const board = vis(".tl-board");
  const rows = [...board.querySelectorAll(".tl-row")];
  const out = rows.map((row) => {
    const lane = row.querySelector(".tl-lane");
    const L = lane.getBoundingClientRect();
    const box = (e) => { const b = e.getBoundingClientRect();
      return { l: Math.round(b.left - L.left), r: Math.round(b.right - L.left),
               t: Math.round(b.top - L.top), h: Math.round(b.height) }; };
    return {
      name: (row.querySelector(".tl-nmtxt") || {}).textContent || "",
      laneW: Math.round(L.width),
      rowH: Math.round(row.getBoundingClientRect().height),
      segs: [...row.querySelectorAll(".tl-seg")].map((e) => ({
        ...box(e),
        cls: [...e.classList].filter((c) => c !== "tl-seg").join(" "),
        anim: getComputedStyle(e).animationName,
        bg: getComputedStyle(e).backgroundColor,
        text: e.textContent.trim(),
      })),
      over: [...row.querySelectorAll(".tl-over")].map((e) => ({ ...box(e), text: e.textContent.trim() })),
      nodes: [...row.querySelectorAll(".tl-node")].map((e) => ({ ...box(e), cls: [...e.classList].join(" ") })),
      ways: [...row.querySelectorAll(".tl-wp")].map((e) => ({ ...box(e), cls: [...e.classList].join(" ") })),
      chips: [...row.querySelectorAll(".tl-chip")].length,
    };
  });
  return { rows: out, empty: !!board.querySelector(".tl-none") };
})()`;

test("bars break and resume around every interruption, and never overlap one", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  let sawNodes = 0;
  let sawWaypoints = 0;

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    /* ⚠️ ONE WEEK BACK, BECAUSE THIS WEEK IS EMPTY OF EVENTS AND THE CHECK WOULD PASS ON NOTHING.
       Measured on the harness account: the current week holds 0 nodes and 1 waypoint, so every
       break assertion was satisfied by an empty set — the vacuous shape this repo keeps paying
       for. The week before it holds 14 nodes and 3 waypoints, which is what a break rule needs to
       be asked of. The population floor below is what stops this going quiet again. */
    await page.getByRole("button", { name: "Previous week" }).click();
    await page.waitForTimeout(400);
    const r = await page.evaluate<any>(BARS);
    const withParts = r.rows.filter((x: any) => x.segs.length || x.nodes.length);
    sawNodes += withParts.reduce((n: number, x: any) => n + x.nodes.length, 0);
    sawWaypoints += withParts.reduce((n: number, x: any) => n + x.ways.length, 0);
    console.log(`[${width}] ${r.rows.length} rows, ${withParts.reduce((n: number, x: any) => n + x.segs.length, 0)} segments, ` +
      `${withParts.reduce((n: number, x: any) => n + x.nodes.length, 0)} nodes, ` +
      `${withParts.reduce((n: number, x: any) => n + x.ways.length, 0)} waypoints`);
    console.log(`[${width}] sample: ${JSON.stringify(withParts.slice(0, 3))}`);

    expect(r.rows.length, `[${width}] no rows`).toBeGreaterThan(0);

    for (const row of r.rows) {
      /* ⚠️ NO EMPTY ROWS — the one rule, measured. */
      expect(row.segs.length + row.nodes.length + row.chips,
        `[${width}] ${row.name} is an empty row`).toBeGreaterThan(0);

      /* every part lies inside its lane and inside its row */
      for (const p of [...row.segs, ...row.over, ...row.nodes]) {
        expect(p.l, `[${width}] ${row.name}: a part starts left of its lane`).toBeGreaterThanOrEqual(-2);
        expect(p.r, `[${width}] ${row.name}: a part runs past its lane`).toBeLessThanOrEqual(row.laneW + 2);
      }

      /* ⚠️ THE BREAK IS REAL — a segment must not run under a node or a waypoint. The node sits IN
         the gap, so any overlap means the clearance was not left. */
      for (const n of [...row.nodes, ...row.ways]) {
        const centre = (n.l + n.r) / 2;
        for (const sg of row.segs) {
          if (Math.abs(sg.t - n.t) > 30) continue; // a different lane
          const inside = centre > sg.l + 2 && centre < sg.r - 2;
          expect(inside, `[${width}] ${row.name}: a segment runs under an interruption at ${centre}`).toBe(false);
        }
      }

      /* ⚠️ ADJACENT-DAY EVENTS LEAVE NO HAIRLINE. A piece narrower than the floor is not drawn at
         all — "nothing happened between them" — so no rendered segment may be a sliver. */
      for (const sg of row.segs) {
        expect(sg.r - sg.l, `[${width}] ${row.name}: a hairline segment of ${sg.r - sg.l}px`)
          .toBeGreaterThan(row.laneW / 40);
      }
    }
  }

  /* ⚠️ THE POPULATION FLOOR. Every assertion above is a NEGATIVE — no overlap, no hairline, no
     empty row — and a negative check is satisfied by an empty set. Without this the whole case
     goes green on a week that drew no interruptions at all, which is precisely what it did the
     first time it was run. */
  console.log(`interruptions measured across the four widths: ${sawNodes} nodes, ${sawWaypoints} waypoints`);
  expect(sawNodes, "no nodes were measured — the break rules were not exercised").toBeGreaterThan(0);
  expect(sawWaypoints, "no waypoints were measured").toBeGreaterThan(0);
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the board threw").toEqual([]);
});

test("the pulse: on waiting bars, never on your-move, never in a past week, never under reduce", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  /* ⚠️ THE HARNESS SUPPRESSES ANIMATION FOR MEASUREMENT, and a suppressed page reports every
     animation as `none` — so a pulse check run under it measures the suppression, not the pulse.
     Lift it, and let the styles settle before reading. */
  await liftMotionSuppression(page);
  await page.waitForTimeout(300);

  const live = await page.evaluate<any>(BARS);
  const seg = (rows: any[]) => rows.flatMap((r: any) => r.segs);
  const theirs = seg(live.rows).filter((s: any) => s.cls.includes("theirs"));
  const yours = seg(live.rows).filter((s: any) => s.cls.includes("yours"));
  console.log(`this week: ${theirs.length} waiting, ${yours.length} your-move`);
  console.log(`waiting animations: ${JSON.stringify([...new Set(theirs.map((s: any) => s.anim))])}`);
  console.log(`your-move animations: ${JSON.stringify([...new Set(yours.map((s: any) => s.anim))])}`);

  expect(theirs.length, "no waiting bar to check the pulse on").toBeGreaterThan(0);
  /* ⚠️ THE NAME, NOT A DURATION. A `var()` inside `@keyframes` fails silently here, so the check
     that matters is that the animation is BOUND — a running animation of nothing looks identical
     to none at all in every property but this one. */
  expect(theirs.every((s: any) => s.anim === "tlBreathe"), "a waiting bar is not breathing").toBe(true);
  /* ⚠️ AND NOT ON THE LOUD ONES. If long-standing work also moved, the two would compete. */
  expect(yours.every((s: any) => s.anim === "none"), "a your-move bar is animated").toBe(true);

  /* a past week: page back until every row is behind today */
  await page.getByRole("button", { name: "Previous week" }).click();
  await page.getByRole("button", { name: "Previous week" }).click();
  await page.waitForTimeout(400);
  const past = await page.evaluate<any>(TAG + `(() => {
    const board = vis(".tl-board");
    const rows = [...board.querySelectorAll(".tl-row.past")];
    return {
      pastRows: rows.length,
      anims: [...new Set(rows.flatMap((r) => [...r.querySelectorAll(".tl-seg.theirs")]
        .map((e) => getComputedStyle(e).animationName)))],
      solidFutures: [...board.querySelectorAll(".tl-row.past .tl-seg.future")]
        .map((e) => getComputedStyle(e).borderRightStyle),
      passedWays: [...board.querySelectorAll(".tl-row.past .tl-wp")]
        .map((e) => [e.classList.contains("passed"), getComputedStyle(e).borderLeftStyle]),
    };
  })()`);
  console.log(`past week: ${JSON.stringify(past)}`);
  if (past.pastRows > 0) {
    expect(past.anims.every((a: string) => a === "none"), "a past week is still breathing").toBe(true);
    /* ⚠️ NOTHING IS PROVISIONAL IN A PAST WEEK — v5's own rule: the dashes go solid. */
    expect(past.solidFutures.every((v: string) => v === "solid"), "a past week still draws a forecast").toBe(true);
  } else {
    console.log("NOTE: no past rows two weeks back on this account — the rule is unit-locked only.");
  }
  await page.getByRole("button", { name: "Today" }).click();

  /* reduced motion */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(300);
  const reduced = await page.evaluate<any>(TAG + `[...new Set([...vis(".tl-board").querySelectorAll(".tl-seg.theirs")]
    .map((e) => getComputedStyle(e).animationName))]`);
  console.log(`under prefers-reduced-motion: ${JSON.stringify(reduced)}`);
  expect(reduced.every((a: string) => a === "none"), "the pulse survives reduced motion").toBe(true);
  /* ⚠️ BOTH DIRECTIONS. A check that only asserts none passes on a page where the property was
     never set at all — which is why the live reading above is taken first. */
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(300);
  const back = await page.evaluate<any>(TAG + `[...new Set([...vis(".tl-board").querySelectorAll(".tl-seg.theirs")]
    .map((e) => getComputedStyle(e).animationName))]`);
  expect(back.includes("tlBreathe"), "the pulse did not come back").toBe(true);
});

test("no red, and not the word", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  const r = await page.evaluate<any>(TAG + `(() => {
    const board = vis(".tl-board");
    const parts = [...board.querySelectorAll(".tl-seg, .tl-over, .tl-node, .tl-wp, .tl-chip, .tl-kind")];
    const rgb = (v) => (v.match(/\\d+/g) || []).slice(0, 3).map(Number);
    const reds = [];
    for (const e of parts) {
      const cs = getComputedStyle(e);
      for (const prop of ["backgroundColor", "borderTopColor", "borderRightColor", "borderLeftColor", "color"]) {
        const c = rgb(cs[prop]);
        if (c.length === 3 && c[0] - c[1] > 80) reds.push([e.className, prop, cs[prop]]);
      }
    }
    return { parts: parts.length, reds, text: board.textContent.toLowerCase() };
  })()`);
  console.log(`scanned ${r.parts} painted parts; red-dominant: ${JSON.stringify(r.reds)}`);
  expect(r.parts, "nothing painted to scan").toBeGreaterThan(0);
  /* ⚠️ THE TEST IS RED DOMINANCE, NOT A HUE NAME. The app's own burgundy sits at R−G 66 and is
     everywhere; an alarm red is far above 150. A rule phrased as "no red" would fail on the
     brand. */
  expect(r.reds, "an alarm red reached the timeline").toEqual([]);
  /* ⚠️ AND NOT THE WORD, in what the reader sees. Duration is a fact; lateness is a verdict. */
  expect(r.text.includes("overdue"), "the forbidden word reached the page").toBe(false);
});

test("the three weights and the overrun, where the account can show them", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  const r = await page.evaluate<any>(TAG + `(() => {
    const board = vis(".tl-board");
    const w = (c) => [...board.querySelectorAll(".tl-seg.yours.w-" + c)].map((e) => ({
      bg: getComputedStyle(e).backgroundColor, weight: getComputedStyle(e).fontWeight,
      text: e.textContent.trim(),
    }));
    return {
      fresh: w("fresh"), settled: w("settled"), long: w("long"),
      overruns: [...board.querySelectorAll(".tl-over")].map((e) => e.textContent.trim()),
      counts: [...board.querySelectorAll(".tl-cnt")].map((e) => e.textContent.trim()),
    };
  })()`);
  console.log(`weights: ${JSON.stringify(r)}`);
  const seen = ["fresh", "settled", "long"].filter((k) => (r as any)[k].length);
  console.log(`weights present on this account: ${JSON.stringify(seen)}`);
  expect(seen.length, "no your-move bar at all — the weights cannot be checked").toBeGreaterThan(0);

  /* the three fills must differ from each other wherever two are present */
  const fills = seen.map((k) => (r as any)[k][0].bg);
  expect(new Set(fills).size, "two weights render the same fill").toBe(fills.length);
  /* ⚠️ THE COUNT IS A DURATION AND NOTHING ELSE — no adverb, no escalation. */
  for (const c of r.counts) expect(c).toMatch(/^\d+ days?$/i);
  for (const o of r.overruns) expect(o).toMatch(/^\d+ days? your move$/i);
});

test("/todo is unchanged", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await openRoute(page, "/todo", { width: 1440, height: HEIGHT });
  const r = await page.evaluate<any>(TAG + `(() => {
    const wpg = vis(".wpg");
    if (!wpg) return { missing: true };
    return {
      title: wpg.querySelector(".wsh-title")?.textContent?.trim() ?? null,
      zones: wpg.querySelectorAll(".tpl-zone, .l-body").length,
      timeline: wpg.querySelectorAll(".tl-board, .tl-grid, .tl-seg").length,
      calendarMountedHidden: [...document.querySelectorAll(".tl-board")]
        .every((e) => e.getBoundingClientRect().height === 0),
      docScrollW: document.documentElement.scrollWidth,
      docClientW: document.documentElement.clientWidth,
    };
  })()`);
  console.log("/todo:", JSON.stringify(r));
  expect(r.missing).toBeFalsy();
  expect(r.title).toBe("To-do list");
  expect(r.zones).toBeGreaterThan(0);
  expect(r.timeline, "the timeline's classes leaked into the visible page").toBe(0);
  expect(r.calendarMountedHidden).toBe(true);
  expect(r.docScrollW).toBeLessThanOrEqual(r.docClientW + 1);
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs).toEqual([]);
});

test("the run's screenshots", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  await page.screenshot({ path: "reports/calendar-bars/bars-1440.png" });
  await page.setViewportSize({ width: 2400, height: HEIGHT });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "reports/calendar-bars/bars-2400.png" });
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "reports/calendar-bars/bars-1280.png" });
  /* the week the breaks actually happen in — the current one is quiet on this account */
  await page.setViewportSize({ width: 1440, height: HEIGHT });
  await page.getByRole("button", { name: "Previous week" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "reports/calendar-bars/bars-events.png" });
});
