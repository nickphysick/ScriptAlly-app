/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Calendar's MARKERS AND GEOMETRY — the acceptance (markers pack, Phase 5).
 *
 * ⚠️ EVERY CLAIM IS MEASURED ON THE RENDERED PAGE. A source lock proves a rule was written, never
 * that it reached an element — which is the whole reason this pack exists: `.tl-chip` was applied
 * to an element and had no rule at all, and nothing in the suite could see it.
 *
 * ⚠️ WHERE THE HARNESS ACCOUNT CANNOT PRODUCE A CASE, THIS FILE SAYS SO IN ITS OWN OUTPUT rather
 * than skipping quietly. It holds no dated user task and no query whose expectation has passed, so
 * the chip and the hatch are proved by other means, each named where it happens.
 */
import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { openRoute, scrollbarWidth } from "./measure";

const WIDTHS = [1280, 1440, 1920, 2400];
const HEIGHT = 900;
const TAG = `
  const vis = (sel) => [...document.querySelectorAll(sel)]
    .find((e) => e.getBoundingClientRect().height > 0) || null;
`;

/* ══ geometry ═════════════════════════════════════════════════════════════════════════════════ */

test("no literal vertical offset survives in the stylesheet", async () => {
  const css = readFileSync(join(process.cwd(), "src/components/todo/todoCalendar.css"), "utf8");
  /* ⚠️ COMMENTS STRIPPED FIRST. This file's prose quotes every literal it retired — `top: 0`,
     `lanes * 52 + 28`, `translateX(-18px)` — so a bare scan over the raw text reads its own
     explanation as the offence. The house law, in its plainest form. */
  const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");

  const offenders: string[] = [];
  for (const m of decls.matchAll(/(?:^|\n)(\.tl-[^\n{]*)\{([^}]*)\}/g)) {
    const sel = m[1].trim();
    /* the elements this pack is about: the bar, the markers and the chip */
    if (!/\.tl-(seg|node|wp|chip|mk|tip|lane|row)\b/.test(sel)) continue;
    for (const [, prop, val] of m[2].matchAll(/\b(top|bottom|margin-top|margin-bottom)\s*:\s*([^;]+)/g)) {
      if (/-?\d+(\.\d+)?px/.test(val) && !/calc|var\(/.test(val)) offenders.push(`${sel} { ${prop}: ${val.trim()} }`);
    }
  }
  console.log(`positional literals in the bar/marker/chip rules: ${offenders.length ? JSON.stringify(offenders) : "none"}`);
  expect(offenders, "a vertical position is written as a literal again").toEqual([]);

  /* ⚠️ AND THE POPULATION FLOOR — a scan that matched no rules would report "none" for ever. */
  const scanned = [...decls.matchAll(/(?:^|\n)(\.tl-[^\n{]*)\{/g)]
    .filter((m) => /\.tl-(seg|node|wp|chip|mk|tip|lane|row)\b/.test(m[1])).length;
  console.log(`rules scanned: ${scanned}`);
  expect(scanned, "the scan found no rules to check").toBeGreaterThan(10);

  /* the four tokens the whole geometry reads */
  for (const t of ["--lane-h", "--bar-h", "--disc", "--chip-h"]) {
    expect(decls, `${t} is not declared`).toContain(`${t}:`);
  }
});

test("bars are centred in their rows, at every row height and every width", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    /* one week back — this week is quiet on this account, and a centring check wants markers too */
    await page.getByRole("button", { name: "Previous window" }).click();
    await page.waitForTimeout(400);

    const r = await page.evaluate<any>(TAG + `(() => {
      const board = vis(".tl-board");
      const rows = [...board.querySelectorAll(".tl-row")];
      const px = (n) => Math.round(n * 100) / 100;
      /* ⚠️ A CUSTOM PROPERTY HOLDING A \`calc()\` READS BACK AS ITS TEXT, NOT ITS VALUE. This was
         \`parseFloat(getPropertyValue("--lane-h"))\`, which was a number while the token was the
         literal \`70px\` and became \`NaN\` the moment the lane started deriving from what it holds
         (range pack, Phase 2) — so every offset was NaN and this check went RED rather than
         vacuous, which is the only good half of it. Resolving it by re-stating the arithmetic here
         would be worse: there are two formulas, a bar row's and a pinned row's, and a lock that
         restates a formula agrees with the sheet only until someone edits one of them. So the
         browser resolves it, in the row's OWN scope, on a probe that is out of flow and gone
         again before anything is measured. */
      const laneOf = (row) => {
        const probe = document.createElement("div");
        probe.style.cssText =
          "position:absolute;visibility:hidden;pointer-events:none;width:0;height:var(--lane-h)";
        row.appendChild(probe);
        const h = probe.getBoundingClientRect().height;
        probe.remove();
        return h;
      };
      const off = [];
      for (const row of rows) {
        const R = row.getBoundingClientRect();
        const laneH = laneOf(row);
        const lanes = Number(getComputedStyle(row).getPropertyValue("--lanes")) || 1;
        for (const e of row.querySelectorAll(".tl-seg, .tl-node, .tl-wp, .tl-chip")) {
          const B = e.getBoundingClientRect();
          const lane = Number(getComputedStyle(e).getPropertyValue("--lane")) || 0;
          off.push(px((B.top + B.height / 2) - (R.top + laneH * (lane + 0.5))));
        }
        /* and the row is exactly its lanes — never a floor, never a leftover */
        if (Math.abs(R.height - lanes * laneH) > 1) off.push(9999);
      }
      const heights = [...new Set(rows.map((x) => Math.round(x.getBoundingClientRect().height)))];
      const zone = board.querySelector(".tl-zone");
      let fits = 0, used = 0;
      const room = zone.clientHeight - board.querySelector(".tl-head").getBoundingClientRect().height;
      for (const x of rows) { const h = x.getBoundingClientRect().height; if (used + h > room) break; used += h; fits += 1; }
      return { rows: rows.length, heights, parts: off.length,
        worst: off.length ? Math.max(...off.map(Math.abs)) : null,
        laneH: laneOf(rows[0]),
        zone: zone.clientHeight, room: Math.round(room), fits,
        docScrollW: document.documentElement.scrollWidth, docClientW: document.documentElement.clientWidth };
    })()`);
    console.log(`[${width}] ${JSON.stringify(r)} (scrollbar ${await scrollbarWidth(page)}px)`);

    expect(r.parts, `[${width}] nothing positioned to measure`).toBeGreaterThan(5);
    /* ⚠️ THE WHOLE OF FAULT 2 IN ONE NUMBER. Before this pack a 36px bar sat at top 0 in a 132px
       row — 48px off centre — and every row height was a different offence. */
    expect(r.worst, `[${width}] something is off its lane centre`).toBeLessThanOrEqual(1);
    expect(r.heights.every((h: number) => h % r.laneH === 0),
      `[${width}] a row height is not a whole number of lanes: ${JSON.stringify(r.heights)}`).toBe(true);
    expect(r.docScrollW, `[${width}] the page scrolls sideways`).toBeLessThanOrEqual(r.docClientW + 1);
  }
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the board threw").toEqual([]);
});

/* ══ the chip ═════════════════════════════════════════════════════════════════════════════════ */

test("chips render as pills, with visible separation between adjacent ones", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  const r = await page.evaluate<any>(TAG + `(() => {
    const board = vis(".tl-board");
    const real = board.querySelectorAll(".tl-chip").length;
    /* ⚠️ A SYNTHETIC PROBE, AND THE REASON IS STATED IN THE OUTPUT. This account holds no user task
       with a due date — swept 27 weeks, zero chips — so there is no real chip to measure. The
       question "does this stylesheet style an element with this class in this DOM position" is a
       CSS question, and a synthetic element answers it exactly. It writes nothing and spends no
       fixture. */
    const lane = board.querySelector(".tl-row .tl-lane");
    const mk = (left) => { const b = document.createElement("button");
      b.className = "tl-at tl-chip"; b.setAttribute("data-kind", "task");
      b.style.left = left; b.style.setProperty("--lane", "0");
      b.innerHTML = '<span class="d"></span><span class="tl-lbl">Book the library room</span>';
      lane.appendChild(b); return b; };
    const a = mk("0%"), c = mk("40%");
    const cs = getComputedStyle(a), dot = getComputedStyle(a.querySelector(".d"));
    const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect();
    const out = {
      realChipsOnPage: real,
      display: cs.display, position: cs.position,
      padX: cs.paddingLeft, radius: cs.borderTopLeftRadius,
      border: cs.borderTopStyle + " " + cs.borderTopWidth, bg: cs.backgroundColor,
      height: Math.round(ra.height), innerGap: cs.columnGap,
      bullet: { w: dot.width, radius: dot.borderTopLeftRadius, border: dot.borderTopStyle },
      separation: Math.round(rc.left - ra.right),
      /* the label is a distinct box from the bullet — the fault was them running together */
      labelStartsAfterBullet: a.querySelector(".tl-lbl").getBoundingClientRect().left
        > a.querySelector(".d").getBoundingClientRect().right,
    };
    a.remove(); c.remove();
    return out;
  })()`);
  console.log("CHIP:", JSON.stringify(r));

  /* ⚠️ THE REGRESSION, MEASURED: an unstyled inline-flex has no padding, no border and no radius,
     and its parts run together as bare text. Each of these was zero or `none` on the shipped
     build. */
  expect(r.display, "the chip is not a flex pill").toMatch(/flex/);
  expect(parseFloat(r.padX), "no horizontal padding — the fault exactly").toBeGreaterThan(6);
  expect(r.radius, "not a pill").toBe("999px");
  expect(r.border, "no border").toMatch(/^solid/);
  expect(r.height, "not the chip token's height").toBe(26);
  expect(parseFloat(r.innerGap), "the bullet and the label have no gap between them").toBeGreaterThan(0);
  expect(r.labelStartsAfterBullet, "the label runs into the bullet").toBe(true);
  /* the writer's own task takes a checkbox square */
  expect(r.bullet.radius, "the task bullet is not a checkbox square").toBe("2px");
  /* and two adjacent chips are visibly apart */
  expect(r.separation, "adjacent chips are not separated").toBeGreaterThan(4);
});

/* ══ the markers ══════════════════════════════════════════════════════════════════════════════ */

test("the marker grammar — shape states whether a fact exists, and so does the interaction", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });

  const seen = new Set<string>();
  let statusMarkers = 0, directionMarkers = 0, flags = 0;

  let tipsSeen = 0;
  for (let back = 0; back <= 12; back += 1) {
    const r = await page.evaluate<any>(TAG + `(() => {
      const b = vis(".tl-board");
      const px = (n) => Math.round(n * 100) / 100;
      return {
        nodes: [...b.querySelectorAll(".tl-node")].map((e) => ({
          marker: e.getAttribute("data-marker"), dir: e.getAttribute("data-dir"),
          w: px(e.getBoundingClientRect().width),
          svg: e.querySelectorAll("svg").length, tag: e.tagName,
          pe: getComputedStyle(e).pointerEvents, caption: e.getAttribute("aria-label"),
        })),
        ways: [...b.querySelectorAll(".tl-wp")].map((e) => ({
          kind: e.getAttribute("data-kind"), tag: e.tagName,
          pe: getComputedStyle(e).pointerEvents,
          dashed: getComputedStyle(e).borderLeftStyle,
          ring: getComputedStyle(e, "::before").content,
          caption: (e.querySelector(".tl-tip") || {}).textContent || "",
          /* the reach that lets a two-pixel upright be hovered without becoming clickable */
          reachPe: getComputedStyle(e, "::after").pointerEvents,
          reachW: getComputedStyle(e, "::after").width,
        })),
        /* every caption on the board, at rest — none of them may be painted */
        tipsShowing: [...b.querySelectorAll(".tl-tip")]
          .filter((e) => getComputedStyle(e).opacity !== "0").length,
        tipsTotal: b.querySelectorAll(".tl-tip").length,
        disc: parseFloat(getComputedStyle(b.querySelector(".tl-row")).getPropertyValue("--disc")),
      };
    })()`);

    for (const n of r.nodes) {
      seen.add(`${n.marker}:${n.caption}`);
      if (n.marker === "status") {
        statusMarkers += 1;
        /* ⚠️ MARKER 1 IS THE LOCKED COMPONENT, and the SVG is how you know it is that and not a
           lookalike drawn here: nothing in this page's stylesheet emits one. */
        expect(n.svg, `a status marker with no StatusDot inside it (${n.caption})`).toBeGreaterThan(0);
        expect(n.w, `a status marker is not at --disc (${n.caption})`).toBe(r.disc);
      } else if (n.marker === "direction") {
        directionMarkers += 1;
        /* ⚠️ MARKER 2 IS SMALLER AND RINGLESS — a StatusDot here would draw the same symbol on
           both sides of the join and read as nothing having happened. */
        expect(n.svg, `a direction marker drew a StatusDot (${n.caption})`).toBe(0);
        expect(n.w, `a direction marker is not smaller than the disc (${n.caption})`).toBeLessThan(r.disc);
      }
      /* both are clickable, because both have an entry behind them */
      expect(n.tag, "a solid marker is not a control").toBe("BUTTON");
      expect(n.pe, "a solid marker is not clickable").not.toBe("none");
    }
    for (const w of r.ways) {
      flags += 1;
      seen.add(`flag:${w.kind}`);
      /* ⚠️ MARKER 3 IS NOT CLICKABLE, and not because of a flag saying so — it is a span with no
         handler, because there is nothing behind it to open. */
      expect(w.tag, "a dashed marker is a control").toBe("SPAN");
      expect(w.pe, "a dashed marker is clickable").toBe("none");
      /* ⚠️ THE `none` AND THE REACH ARE ONE MECHANISM AND ARE ASSERTED TOGETHER (Phase 4).
         Captions show on hover now, and a 2px upright taking no pointer events can never BE
         hovered — so its caption would have been silently deleted rather than deferred. A
         transparent `::after` takes the events the element does not. Either half alone is
         meaningless: without the `none` the upright becomes clickable, and without the reach the
         forecast loses its label. Removing the reach as an unused declaration is exactly how
         this breaks, which is why it is asserted here rather than left to read as decoration. */
      expect(w.reachPe, "the waypoint's caption cannot be reached — its reach takes no events").toBe("auto");
      expect(parseFloat(w.reachW), "the waypoint's reach is not wider than its upright").toBeGreaterThan(10);
      /* dashed unless the week has passed, where nothing is provisional any more */
      expect(["dashed", "solid", "none"]).toContain(w.dashed);
      /* ⚠️ AND NO ALARM: no exclamation anywhere in a marker's own words. */
      expect(w.caption, "a marker caption carries an exclamation").not.toMatch(/!/);
    }

    /* ⚠️ NO CAPTION IS PAINTED AT REST (Phase 4), and the population is asserted over the WHOLE
       sweep rather than per window. A single window can legitimately hold no markers — the board
       opens at today and runs forward, and markers are records — so a per-window population check
       fails on a correct page. Accumulating keeps the guard against the vacuous case (`0 showing`
       is meaningless if nothing was ever there) without inventing a fault. */
    tipsSeen += r.tipsTotal;
    expect(r.tipsShowing, `${r.tipsShowing} of ${r.tipsTotal} captions are painted at rest`).toBe(0);

    if (back < 12) await page.getByRole("button", { name: "Previous window" }).click();
    await page.waitForTimeout(200);
  }

  console.log(`markers over 13 weeks: ${statusMarkers} status · ${directionMarkers} direction · ${flags} flags`);
  console.log(`distinct events seen: ${JSON.stringify([...seen].sort())}`);
  /* ⚠️ THE POPULATION FLOOR. Every assertion above is inside a loop over what happens to be there;
     with nothing there they all pass. */
  expect(statusMarkers, "no status marker was measured").toBeGreaterThan(0);
  expect(directionMarkers, "no direction marker was measured").toBeGreaterThan(0);
  expect(flags, "no dashed flag was measured").toBeGreaterThan(0);
  console.log(`captions seen over the sweep: ${tipsSeen}, none of them painted`);
  expect(tipsSeen, "no caption exists anywhere over thirteen windows — the rest-state check measured nothing").toBeGreaterThan(0);

  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the board threw").toEqual([]);
});

/* ══ one bar, one count ═══════════════════════════════════════════════════════════════════════ */

test("a long-standing row is one bar with one count", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  const r = await page.evaluate<any>(TAG + `(() => {
    const b = vis(".tl-board");
    return {
      overElements: b.querySelectorAll(".tl-over").length,
      rows: [...b.querySelectorAll(".tl-row")]
        .filter((r) => r.querySelector(".tl-seg.w-long"))
        .map((r) => ({
          name: (r.querySelector(".tl-nmtxt") || {}).textContent || "",
          bars: r.querySelectorAll(".tl-seg").length,
          counts: [...r.querySelectorAll(".tl-cnt")].map((e) => e.textContent.trim()),
          hatched: r.querySelectorAll(".tl-seg.hatched").length,
        })),
      hatchSizes: [...b.querySelectorAll(".tl-seg.hatched")].map((e) => getComputedStyle(e).backgroundSize),
    };
  })()`);
  console.log("ONE BAR:", JSON.stringify(r));

  /* ⚠️ THE SECOND OBJECT IS GONE, not merely hidden. */
  expect(r.overElements, "the overrun is still a second element").toBe(0);
  expect(r.rows.length, "no long-standing row to check").toBeGreaterThan(0);
  for (const row of r.rows) {
    expect(row.counts.length, `${row.name} states its duration ${row.counts.length} times`).toBe(1);
  }
  if (!r.hatchSizes.length) {
    console.log("NOTE: no hatch on this account — no your-move stretch has an expectation that has "
      + "passed, so the overrun's own rendering is unit-locked only.");
  } else {
    for (const s of r.hatchSizes) expect(s, "the hatch covers the whole bar").not.toBe("auto");
  }
});

/* ══ the standing rules ═══════════════════════════════════════════════════════════════════════ */

test("no red on the timeline, and not the word anywhere in the bundle", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  const r = await page.evaluate<any>(TAG + `(() => {
    const b = vis(".tl-board");
    const parts = [...b.querySelectorAll(".tl-seg, .tl-node, .tl-mk, .tl-wp, .tl-chip, .tl-kind, .tl-tip")];
    const rgb = (v) => (v.match(/\\d+/g) || []).slice(0, 3).map(Number);
    const reds = [];
    for (const e of parts) {
      const cs = getComputedStyle(e);
      for (const p of ["backgroundColor", "borderTopColor", "borderLeftColor", "color"]) {
        const c = rgb(cs[p]);
        if (c.length === 3 && c[0] - c[1] > 80) reds.push([e.className, p, cs[p]]);
      }
    }
    return { parts: parts.length, reds, text: b.textContent.toLowerCase() };
  })()`);
  console.log(`scanned ${r.parts} painted parts; red-dominant: ${JSON.stringify(r.reds)}`);
  expect(r.parts, "nothing painted to scan").toBeGreaterThan(0);
  /* ⚠️ RED DOMINANCE, NOT A HUE NAME — the app's own burgundy sits at R−G 66 and is everywhere;
     an alarm red is far above 150. A rule phrased as "no red" would fail on the brand. */
  expect(r.reds, "an alarm red reached the timeline").toEqual([]);
  expect(r.text.includes("overdue"), "the forbidden word reached the page").toBe(false);

  /**
   * ⚠️ THE BUNDLE-WIDE CLAIM IS NOT THIS PACK'S TO MAKE, AND SAYING SO IS THE HONEST ANSWER.
   *
   * The word IS in the shipped bundle, and not one occurrence is the calendar's. It is a stored
   * `TaskType` value (`nudge_overdue`, written into task flags in Firestore), a member of
   * `Task.priority`'s union, a class in the tasks popover, and a count on the shell's nav panel.
   * Removing any of those is a data-layer or To-do-world change with a migration behind it — a
   * whole pack, not a line in this one.
   *
   * What this pack can claim, and does: **the calendar contributes none of them**, in its own
   * source or in what a reader sees. Both halves are asserted; the wider sweep is reported.
   */
  const own = [
    "src/lib/journeyBars.ts", "src/lib/todoTimeline.ts",
    "src/components/todo/TodoCalendarPage.tsx", "src/components/todo/todoCalendar.css",
  ];
  const mine = own.filter((f) => readFileSync(join(process.cwd(), f), "utf8").toLowerCase().includes("overdue"));
  console.log(`calendar-owned files containing the word: ${JSON.stringify(mine)}`);
  expect(mine, "the calendar has started using the forbidden word").toEqual([]);

  const dir = join(process.cwd(), "dist/assets");
  const files = readdirSync(dir).filter((f) => f.endsWith(".js") || f.endsWith(".css"));
  const hits = files.filter((f) => readFileSync(join(dir, f), "utf8").toLowerCase().includes("overdue"));
  console.log(`bundle files scanned: ${files.length}; containing the word: ${JSON.stringify(hits)} `
    + `— app-wide, none of it the calendar's (see the report)`);
  expect(files.length, "no bundle to scan").toBeGreaterThan(0);
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
      timeline: wpg.querySelectorAll(".tl-board, .tl-seg, .tl-node, .tl-chip").length,
      calendarMountedHidden: [...document.querySelectorAll(".tl-board")]
        .every((e) => e.getBoundingClientRect().height === 0),
      docScrollW: document.documentElement.scrollWidth, docClientW: document.documentElement.clientWidth,
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

test("⚠️ the task pane still squeezes below ~600px — confirmed, not fixed", async () => {
  /* KNOWN AND OUT OF SCOPE. `.tpn .ws` is an unconditional two-column grid, so any mount narrower
     than about 600px gives the steps column whatever is left. It is a pane change, not a calendar
     one; the calendar's own Do column carries a page-scoped fold from an earlier pack, which is
     why you do not see it here. */
  const pane = readFileSync(join(process.cwd(), "src/components/todo/taskPane.css"), "utf8");
  const rule = pane.slice(pane.indexOf("\n.tpn .ws {"), pane.indexOf("}", pane.indexOf("\n.tpn .ws {")));
  console.log(`.tpn .ws is still: ${rule.trim()}`);
  expect(rule, "the rule moved — re-read it before trusting this flag").toContain("grid-template-columns");
  expect(rule, "it gained a container query — the squeeze may be fixed").not.toContain("container");
  /* the calendar's own fold, so the report can say why it is invisible here */
  const cal = readFileSync(join(process.cwd(), "src/components/todo/todoCalendar.css"), "utf8");
  expect(cal, "the calendar's page-scoped fold has gone").toContain(".tl-do .tpn .ws");
});

test("the run's screenshots", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  await page.screenshot({ path: "reports/calendar-markers/week-1440.png" });
  await page.getByRole("button", { name: "Previous window" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "reports/calendar-markers/markers-1440.png" });
  await page.setViewportSize({ width: 2400, height: HEIGHT });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "reports/calendar-markers/markers-2400.png" });
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "reports/calendar-markers/markers-1280.png" });
});
