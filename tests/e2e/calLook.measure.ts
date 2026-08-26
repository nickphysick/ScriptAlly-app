/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Calendar's WEEK TIMELINE — the acceptance (calendar timeline pack, Phase 5).
 *
 * ⚠️ EVERY CLAIM HERE IS MEASURED ON THE RENDERED PAGE, which is the whole reason this file was
 * rewritten rather than retargeted. The month grid's laws were asserted by reading the page's
 * SOURCE and its stylesheet — roughly forty assertions proving that rules had been WRITTEN, never
 * that they reached an element. A source lock survives a relocation and cannot see a cascade; a
 * layout claim belongs on a rendered page.
 *
 * ⚠️ AND IT IS READ-ONLY. Nothing here presses a control that writes. The completion path is
 * checked from the other end — the toast's own Undo — and only ever against a card this harness
 * created, which is why that case is deliberately absent until such a card exists.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

const WIDTHS = [1280, 1440, 1920, 2400];
const HEIGHT = 900;
const px = (n: number) => Math.round(n * 100) / 100;

/** the visible grid — every workspace page stays MOUNTED, so a bare selector can find a hidden one */
const TAG = `
  const vis = (sel) => [...document.querySelectorAll(sel)]
    .find((e) => e.getBoundingClientRect().height > 0) || null;
`;

test("the week board — seven columns, sticky chrome, clamped bands", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    const sb = await scrollbarWidth(page);

    const r = await page.evaluate<any>(TAG + `(() => {
      const board = vis(".tl-board");
      if (!board) return { missing: true };
      const zone = board.querySelector(".tl-zone");
      const head = board.querySelector(".tl-head");
      const pin = board.querySelector(".tl-row--pin");
      const rows = [...board.querySelectorAll(".tl-row")];
      const cells = [...(rows[0]?.querySelectorAll(".tl-cell") ?? [])];
      const w = (e) => e.getBoundingClientRect().width;
      const widths = cells.map((c) => Math.round(w(c) * 100) / 100);
      const hz = getComputedStyle(zone).overflowX;
      /* ⚠️ A BAND'S EDGE IS MEASURED AGAINST ITS OWN LANE, never against the zone. The lane starts
         after the 210px row-head column, so a band clamped hard left sits at 214 from the zone —
         a reading that looks like a 214px gap and is a 4px inset. Measure the box the thing is
         positioned in. */
      const bands = [...board.querySelectorAll(".tl-band")].map((b) => {
        const lane = b.closest(".tl-lane").getBoundingClientRect();
        const r = b.getBoundingClientRect();
        return {
          openl: b.classList.contains("openl"),
          openr: b.classList.contains("openr"),
          passed: b.classList.contains("passed"),
          left: Math.round(r.left - lane.left),
          right: Math.round(lane.right - r.right),
        };
      });
      /* every chip and band must lie inside the lane it was positioned in */
      let spill = 0;
      for (const row of rows) {
        const lane = row.querySelector(".tl-lane");
        if (!lane) continue;
        const L = lane.getBoundingClientRect();
        for (const c of row.querySelectorAll(".tl-chip, .tl-band")) {
          const b = c.getBoundingClientRect();
          if (b.right > L.right + 1 || b.left < L.left - 1) spill += 1;
        }
      }
      /* and nothing may sit outside its ROW's box either — a lane overflow is an invisible one */
      let clipped = 0;
      for (const row of rows) {
        const R = row.getBoundingClientRect();
        for (const c of row.querySelectorAll(".tl-chip, .tl-band")) {
          const b = c.getBoundingClientRect();
          if (b.bottom > R.bottom + 1 || b.top < R.top - 1) clipped += 1;
        }
      }
      return {
        cols: cells.length,
        widths,
        spread: widths.length ? Math.round((Math.max(...widths) - Math.min(...widths)) * 100) / 100 : -1,
        overflowX: hz,
        zoneScrollW: zone.scrollWidth, zoneClientW: zone.clientWidth,
        docScrollW: document.documentElement.scrollWidth,
        docClientW: document.documentElement.clientWidth,
        headSticky: getComputedStyle(head).position,
        headTop: getComputedStyle(head).top,
        pinSticky: pin ? getComputedStyle(pin).position : null,
        pinTop: pin ? getComputedStyle(pin).top : null,
        headH: Math.round(head.getBoundingClientRect().height),
        headClips: [...head.children].some((c) => {
          const b = c.getBoundingClientRect(), H = head.getBoundingClientRect();
          return b.bottom > H.bottom + 0.5 || b.top < H.top - 0.5;
        }),
        rows: rows.length,
        bands, spill, clipped,
        boardBottom: Math.round(board.getBoundingClientRect().bottom),
        viewportH: window.innerHeight,
      };
    })()`);

    console.log(`[${width}] scrollbar ${sb}px  ${JSON.stringify(r)}`);
    expect(r.missing, `[${width}] no board`).toBeFalsy();

    /* seven columns, filling, equal */
    expect(r.cols, `[${width}] not seven day columns`).toBe(7);
    expect(r.spread, `[${width}] the seven columns are not equal`).toBeLessThanOrEqual(1);

    /* ⚠️ NO HORIZONTAL SCROLL — asserted on the zone AND the document. The zone declares
       `overflow-x: hidden`, so a scrollWidth check there could pass over content the browser is
       simply clipping; the document check is what catches a board that pushed the page wide. */
    expect(r.overflowX, `[${width}] the zone may scroll sideways`).toBe("hidden");
    expect(r.docScrollW, `[${width}] the PAGE scrolls sideways`).toBeLessThanOrEqual(r.docClientW + 1);

    /* the board is inside the viewport — a page that scrolls as a document is the fault the
       Tasks viewport lock exists for */
    expect(r.boardBottom, `[${width}] the board runs past the fold`).toBeLessThanOrEqual(r.viewportH + 1);

    /* sticky chrome, and the pinned row's offset IS the header's height */
    expect(r.headSticky, `[${width}] the day header is not sticky`).toBe("sticky");
    expect(r.headTop, `[${width}] the day header sticks below 0`).toBe("0px");
    if (r.pinSticky) {
      expect(r.pinSticky, `[${width}] Your tasks is not sticky`).toBe("sticky");
      /* ⚠️ THE OFFSET IS COMPARED WITH THE MEASURED HEADER, never with the token's literal. A
         number that encodes another element's height is right until that height moves — and this
         assertion caught exactly that on its first run: a 36px offset under a 46px header, so the
         pinned row slid ten pixels beneath the day names. */
      expect(Math.abs(parseFloat(r.pinTop) - r.headH), `[${width}] pin offset ${r.pinTop} vs header ${r.headH}`)
        .toBeLessThanOrEqual(2);
      /* ⚠️ AND THE HEADER MUST NOT CLIP ITS OWN CONTENTS — a fixed height on a text container is
         only safe while somebody is measuring it. */
      expect(r.headClips, `[${width}] the day header clips its contents`).toBe(false);
    }

    /* nothing escapes its lane, and nothing is drawn outside its row */
    expect(r.spill, `[${width}] chips or bands outside their lane`).toBe(0);
    expect(r.clipped, `[${width}] chips or bands outside their row`).toBe(0);

    /* bands clamp at both edges — a marked edge must actually BE at the edge */
    for (const b of r.bands) {
      if (b.openl) expect(b.left, `[${width}] openLeft band not at the left edge`).toBeLessThanOrEqual(12);
      if (b.openr) expect(b.right, `[${width}] openRight band not at the right edge`).toBeLessThanOrEqual(12);
    }
  }

  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the board threw").toEqual([]);
});

test("the bar composes — kinds, show, sort, search, and a live count", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });

  const read = () => page.evaluate<any>(TAG + `(() => {
    const bar = vis(".tl-bar");
    const board = vis(".tl-board");
    return {
      count: bar.querySelector(".tl-count").textContent.trim(),
      kinds: [...bar.querySelectorAll(".tl-kind")].map((b) => [b.textContent.trim(), b.getAttribute("data-on")]),
      menus: [...bar.querySelectorAll(".tl-mbtn")].map((b) => b.textContent.trim()),
      rows: board.querySelectorAll(".tl-row").length,
      chips: board.querySelectorAll(".tl-chip").length,
      bands: board.querySelectorAll(".tl-band").length,
    };
  })()`);

  const before = await read();
  console.log("rest:", JSON.stringify(before));
  expect(before.kinds.map((k: string[]) => k[0])).toEqual(["Your turn", "Waiting", "On the record", "Your tasks", "Carried"]);
  expect(before.menus[0]).toMatch(/Active only/);
  expect(before.menus[1]).toMatch(/Soonest/);
  /* ⚠️ THE COUNT IS A CENSUS, NOT A SAMPLE — it is compared against what is RENDERED, so a filter
     nobody cleared cannot satisfy it. */
  const stated = Number(/·\s*(\d+)\s+item/.exec(before.count)?.[1] ?? -1);
  expect(stated, `count line "${before.count}" states no item figure`).toBeGreaterThanOrEqual(0);
  expect(stated, `count ${stated} vs rendered ${before.chips + before.bands}`).toBe(before.chips + before.bands);

  /* switching a kind off removes exactly that kind, and the count follows */
  await page.getByRole("button", { name: "On the record", exact: true }).click();
  const off = await read();
  console.log("record off:", JSON.stringify(off));
  expect(off.kinds.find((k: string[]) => k[0] === "On the record")![1]).toBe("false");
  const offStated = Number(/·\s*(\d+)\s+item/.exec(off.count)?.[1] ?? -1);
  expect(offStated, "the count did not follow the filter").toBe(off.chips + off.bands);
  expect(off.chips + off.bands, "switching a kind off added items").toBeLessThanOrEqual(before.chips + before.bands);
  await page.getByRole("button", { name: "On the record", exact: true }).click();

  /* Everything is a superset of Active only — a show mode may narrow, never invent */
  await page.getByRole("button", { name: "Which rows" }).click();
  await page.getByRole("button", { name: "Everything", exact: true }).click();
  const all = await read();
  console.log("everything:", JSON.stringify(all));
  expect(all.rows, "Everything showed fewer rows than Active only").toBeGreaterThanOrEqual(before.rows);
  await page.getByRole("button", { name: "Which rows" }).click();
  await page.getByRole("button", { name: "Active only", exact: true }).click();

  /* sort reorders and never changes the population */
  const names = () => page.evaluate<any>(TAG + `[...vis(".tl-board").querySelectorAll(".tl-nmtxt")].map((e) => e.textContent.trim())`);
  const soonest = await names();
  await page.getByRole("button", { name: "Sort" }).click();
  await page.getByRole("button", { name: "Agent name", exact: true }).click();
  const byName = await names();
  console.log("soonest:", JSON.stringify(soonest), "\nby name:", JSON.stringify(byName));
  expect([...byName].sort(), "sorting changed the population").toEqual([...soonest].sort());

  /* search narrows, and clearing restores */
  await page.locator(".tl-search").fill("zzzzz-nothing-matches");
  const none = await read();
  expect(none.chips + none.bands, "a search matching nothing left items on the board").toBe(0);
  await page.locator(".tl-search").fill("");
  const back = await read();
  expect(back.chips + back.bands, "clearing the search did not restore the board").toBe(before.chips + before.bands);

  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the bar threw").toEqual([]);
});

test("select fills the band and writes nothing; a carded chip opens the workspace; Escape returns", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  for (const width of [1440, 2400]) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });

    /* ── selecting a BAND: the band below fills, and the board is untouched ─────────────── */
    const band = page.locator(".tl-board .tl-band").first();
    const hasBand = await band.count();
    if (hasBand) {
      /* ⚠️ THE CENSUS AND THE GEOMETRY, NOT THE MARKUP. A first version compared
         `innerHTML.length` before and after and went red by exactly four characters — the ` sel`
         class it had just asked for. "Byte-identical" was the wrong claim; what selecting must not
         do is add, remove or MOVE anything. */
      const census = () => page.evaluate<any>(TAG + `(() => {
        const board = vis(".tl-board");
        return [...board.querySelectorAll(".tl-chip, .tl-band")].map((e) => {
          const b = e.getBoundingClientRect();
          return [e.textContent.trim(), Math.round(b.left), Math.round(b.top), Math.round(b.width)].join("|");
        });
      })()`);
      const before = await census();
      await band.click();
      const sel = await page.evaluate<any>(TAG + `(() => {
        const fx = vis(".tl-below");
        const board = vis(".tl-board");
        return {
          band: !!fx,
          head: fx ? fx.querySelector(".tl-fxh").textContent.trim() : null,
          facts: fx ? [...fx.querySelectorAll(".tl-fact .k")].map((e) => e.textContent.trim()) : [],
          ringed: board.querySelectorAll(".tl-band.sel, .tl-chip.sel").length,
        };
      })()`);
      console.log(`[${width}] band selected:`, JSON.stringify(sel));
      expect(sel.band, `[${width}] selecting a band filled nothing`).toBe(true);
      expect(sel.ringed, `[${width}] the selection is not ringed exactly once`).toBe(1);
      /* ⚠️ NOTHING IS WRITTEN AND NOTHING MOVES — every chip and band is still there, still
         saying the same thing, still in the same place. A stronger claim than "no request was
         made", and it needs no network probe to make it. */
      expect(await census(), `[${width}] selecting moved or changed something on the board`).toEqual(before);
      expect(sel.head, `[${width}] the band states no headline`).toBeTruthy();
    }

    /* ── acting: a chip carrying a card opens the workspace ───────────────────────────────── */
    const carded = page.locator('.tl-board .tl-chip[data-kind="turn"], .tl-board .tl-chip[data-kind="task"]').first();
    if (!(await carded.count())) { console.log(`[${width}] no carded chip on the board — act path not exercised`); continue; }
    await carded.click();

    const ws = await page.evaluate<any>(TAG + `(() => {
      const split = vis(".tl-split");
      if (!split) return { missing: true };
      const col = split.querySelector(".tl-col");
      const two = split.querySelector(".tl-two");
      const kids = two ? [...two.children] : [];
      const w = (e) => Math.round(e.getBoundingClientRect().width * 100) / 100;
      const rows = [...col.querySelectorAll(".tl-crow")];
      return {
        boardGone: !vis(".tl-board"),
        colRows: rows.length,
        on: rows.filter((r) => r.classList.contains("on")).length,
        off: rows.filter((r) => r.classList.contains("off")).length,
        do: two ? w(two.querySelector(".tl-do")) : -1,
        read: two ? w(two.querySelector(".tl-read")) : -1,
        know: two && two.querySelector(".tl-know") ? w(two.querySelector(".tl-know")) : -1,
        cols: getComputedStyle(two).gridTemplateColumns,
        rightEdge: Math.round(split.getBoundingClientRect().right),
        wsRight: Math.round(split.querySelector(".tl-ws").getBoundingClientRect().right),
        scrim: document.querySelectorAll(".cal-panescrim, [aria-modal='true']").length,
        kidCount: kids.length,
      };
    })()`);
    console.log(`[${width}] workspace:`, JSON.stringify(ws));
    expect(ws.missing, `[${width}] the workspace did not open`).toBeFalsy();
    expect(ws.boardGone, `[${width}] the full board is still on screen beside the workspace`).toBe(true);
    /* every agent still listed, all but one dimmed */
    expect(ws.colRows, `[${width}] the collapsed column lists nobody`).toBeGreaterThan(0);
    expect(ws.on, `[${width}] not exactly one row is marked`).toBe(1);
    expect(ws.on + ws.off, `[${width}] a row is neither marked nor dimmed`).toBe(ws.colRows);
    /* ⚠️ NOTHING FLOATS — no scrim, no modal, nothing over the page */
    expect(ws.scrim, `[${width}] something modal is on screen`).toBe(0);
    /* the pane is fixed at 430 and the conversation takes the slack */
    expect(ws.do, `[${width}] the pane is not 430 wide`).toBe(430);
    expect(ws.read, `[${width}] the conversation is narrower than its floor`).toBeGreaterThanOrEqual(320);
    /* ⚠️ NO DEAD GROUND AT 2400: the workspace must reach the split's right edge, which is the
       fault this width was chosen to expose — a capped, left-aligned workspace leaves a band of
       empty desk beside it. */
    expect(Math.abs(ws.rightEdge - ws.wsRight), `[${width}] dead ground to the right of the workspace`)
      .toBeLessThanOrEqual(2);

    /* ── Escape returns to the week ───────────────────────────────────────────────────────── */
    await page.keyboard.press("Escape");
    const back = await page.evaluate<any>(TAG + `({ board: !!vis(".tl-board"), split: !!vis(".tl-split") })`);
    console.log(`[${width}] after Escape:`, JSON.stringify(back));
    expect(back.board, `[${width}] Escape did not return to the week`).toBe(true);
    expect(back.split, `[${width}] the workspace survived Escape`).toBe(false);
  }

  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the workspace threw").toEqual([]);
});

test("the responsive steps — Know drops at 1500, everything stacks at 1080", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  const carded = page.locator('.tl-board .tl-chip[data-kind="turn"], .tl-board .tl-chip[data-kind="task"]').first();
  if (!(await carded.count())) { console.log("no carded chip — responsive steps not exercised"); return; }
  await carded.click();

  for (const width of [1920, 1440, 1200, 1000]) {
    await page.setViewportSize({ width, height: HEIGHT });
    await page.waitForTimeout(250);
    const r = await page.evaluate<any>(TAG + `(() => {
      const two = vis(".tl-two");
      const know = two.querySelector(".tl-know");
      const kcs = getComputedStyle(know);
      const boxes = [...know.querySelectorAll(".tl-box")].map((b) => Math.round(b.getBoundingClientRect().top));
      return {
        cols: getComputedStyle(two).gridTemplateColumns,
        knowCols: kcs.gridTemplateColumns,
        knowDisplay: kcs.display,
        knowRowsDistinct: new Set(boxes).size,
        boxCount: boxes.length,
        docScrollW: document.documentElement.scrollWidth,
        docClientW: document.documentElement.clientWidth,
      };
    })()`);
    console.log(`[${width}] ${JSON.stringify(r)}`);
    expect(r.docScrollW, `[${width}] the page scrolls sideways`).toBeLessThanOrEqual(r.docClientW + 1);
    const track = r.cols.split(" ").filter(Boolean).length;
    if (width >= 1500) expect(track, `[${width}] the workspace is not three columns`).toBe(3);
    else if (width > 1080) expect(track, `[${width}] Know did not drop beneath`).toBe(2);
    else expect(track, `[${width}] the workspace did not stack`).toBe(1);
    if (width <= 1080 && r.boxCount > 1) {
      expect(r.knowCols.split(" ").filter(Boolean).length, `[${width}] Know is not two-up`).toBe(2);
    }
  }
});

test("/todo is unchanged — the board still renders its own chrome", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await openRoute(page, "/todo", { width: 1440, height: HEIGHT });
  /* ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED, so a document-wide query answers about whichever page
     comes first in the DOM — and the first version of this probe did exactly that: it read
     `document.querySelector(".wsh-title")` and reported "Query Centre" while standing on /todo,
     then counted 35 timeline elements belonging to the Calendar's own mounted copy. A probe that
     answers a question you did not ask, in the format of the one you did. Scope to the VISIBLE
     grid, and take everything else from inside it. */
  const r = await page.evaluate<any>(TAG + `(() => {
    const wpg = vis(".wpg");
    if (!wpg) return { missing: true };
    return {
      title: wpg.querySelector(".wsh-title")?.textContent?.trim() ?? null,
      /* .l-body, NOT ONLY .tpl-zone. The To-do LIST has a scroller of its own — it is the second
         selector in TasksPageLayout's own settleOn — and asserting the Calendar's primitive here
         would be requiring one page to be built like another. What the law wants is that /todo
         still has A scroller, whichever one it has always had.
         (No backticks in this comment: it lives inside a template literal, and one would close
         the string. It did, and the whole file stopped parsing.) */
      zones: wpg.querySelectorAll(".tpl-zone, .l-body").length,
      /* the timeline's classes must not have leaked into the page that is actually on screen */
      timeline: wpg.querySelectorAll(".tl-board, .tl-grid, .tl-chip").length,
      /* and the Calendar's own copy is still mounted and still hidden, which is the shell working */
      calendarMountedHidden: [...document.querySelectorAll(".tl-board")]
        .every((e) => e.getBoundingClientRect().height === 0),
      docScrollW: document.documentElement.scrollWidth,
      docClientW: document.documentElement.clientWidth,
    };
  })()`);
  console.log("/todo:", JSON.stringify(r));
  expect(r.missing, "no visible workspace grid on /todo").toBeFalsy();
  expect(r.title, "the To-do page lost its title").toBeTruthy();
  expect(r.title, "not the To-do list").toBe("To-do list");
  expect(r.zones, "the To-do page lost its scroll zone").toBeGreaterThan(0);
  expect(r.timeline, "the timeline's classes leaked into the visible page").toBe(0);
  expect(r.calendarMountedHidden, "the Calendar's board is drawing on another page").toBe(true);
  expect(r.docScrollW).toBeLessThanOrEqual(r.docClientW + 1);
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "/todo threw").toEqual([]);
});

/**
 * ⚠️ THE RUN'S OWN EYES. Every claim above is a number, and a number cannot see two elements
 * rendering as one run, a chip overlapping a name, or a colour that reads as grey. This repo has
 * paid for that distinction — a source line and a usage line rendered as "TextIn 1 package" through
 * eleven passing assertions — so a phase that never renders an image ships that class of fault.
 */
test("the run's screenshots", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.screenshot({ path: "reports/calendar-timeline/week-1440.png" });
  await page.setViewportSize({ width: 2400, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "reports/calendar-timeline/week-2400.png" });

  await page.setViewportSize({ width: 1920, height: 900 });
  await page.waitForTimeout(300);
  const band = page.locator(".tl-board .tl-band").first();
  if (await band.count()) {
    await band.click();
    await page.screenshot({ path: "reports/calendar-timeline/select-1920.png" });
  }
  const carded = page.locator('.tl-board .tl-chip[data-kind="turn"], .tl-board .tl-chip[data-kind="task"]').first();
  if (await carded.count()) {
    await carded.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "reports/calendar-timeline/workspace-1920.png" });
    await page.setViewportSize({ width: 2400, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "reports/calendar-timeline/workspace-2400.png" });
  }
});

/**
 * ⚠️ A CENSUS, NOT A THRESHOLD. It reports how many rows the board holds before it starts
 * scrolling, at each supported width, and asserts only that the figure is sane — because the
 * honest answer depends on how many lanes each row packed into, which depends on the writer's
 * data. A hard number here would be a rule invented about somebody else's querying.
 */
test("rows at volume — how many fit before the board scrolls", async ({ page }) => {
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    const r = await page.evaluate<any>(TAG + `(() => {
      const board = vis(".tl-board");
      const zone = board.querySelector(".tl-zone");
      const head = board.querySelector(".tl-head");
      const rows = [...board.querySelectorAll(".tl-row")];
      const hs = rows.map((e) => Math.round(e.getBoundingClientRect().height));
      const room = zone.clientHeight - head.getBoundingClientRect().height;
      let fit = 0, used = 0;
      for (const h of hs) { if (used + h > room) break; used += h; fit += 1; }
      return {
        rows: hs.length,
        heights: hs,
        lanes: rows.map((e) => e.querySelectorAll(".tl-chip, .tl-band").length),
        zoneH: Math.round(zone.clientHeight),
        roomBelowHead: Math.round(room),
        fitsWithoutScrolling: fit,
        scrolls: zone.scrollHeight > zone.clientHeight + 1,
        overflowBy: Math.max(0, zone.scrollHeight - zone.clientHeight),
      };
    })()`);
    console.log(`[${width}] volume ${JSON.stringify(r)}`);
    expect(r.rows, `[${width}] no rows`).toBeGreaterThan(0);
    /* the pinned row is always there, so at least one row must fit or the board shows nothing */
    expect(r.fitsWithoutScrolling, `[${width}] not one row fits`).toBeGreaterThan(0);

    /* ⚠️ THE MASTHEAD SETTLES WHEN THE BOARD SCROLLS — the claim the Phase 3 commit made about a
       SHARED mechanism, which is exactly the kind that is true in source and false on the page.
       The board is a `.tpl-zone`, which `TasksPageLayout` already names in its `settleOn`, and
       `primaryScroller()` requires EXACTLY ONE live scroller among those selectors — so this is
       also the check that the page has not grown a second one.

       ⚠️ WHAT IS ASSERTED IS THE CHROME SHRINKING, NOT THE BOARD GROWING. A first version required
       the scrollport to gain the reclaimed height and went red: the settle deliberately hands that
       height to a SPACER so the column's total never changes, which is the whole reason the
       reader's place does not jump. Asking for the opposite is asking the mechanism to fail. */
    if (r.scrolls) {
      const mast = () => page.evaluate<any>(TAG + `(() => {
        const wpg = vis(".wpg");
        const m = wpg && wpg.querySelector(".wpg-mast");
        const zone = vis(".tl-board").querySelector(".tl-zone");
        return {
          mastH: m ? Math.round(m.getBoundingClientRect().height) : -1,
          zoneH: Math.round(zone.clientHeight),
          top: Math.round(zone.scrollTop),
        };
      })()`);
      const rest = await mast();
      await page.evaluate(TAG + `vis(".tl-board").querySelector(".tl-zone").scrollTop = 400`);
      await page.waitForTimeout(700);
      const after = await mast();
      console.log(`[${width}] settle: rest ${JSON.stringify(rest)} -> ${JSON.stringify(after)}`);
      expect(after.top, `[${width}] the board did not scroll`).toBeGreaterThan(2);
      expect(after.mastH, `[${width}] the masthead did not settle when the board scrolled`)
        .toBeLessThan(rest.mastH);
    }
  }
});
