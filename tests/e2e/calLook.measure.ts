/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * calLook — a LOOK at the deployed Calendar, not a check of it.
 *
 * ⚠️ THE ACCEPTANCE RUN ASKS WHETHER THE THINGS I CHANGED ARE RIGHT. This one exists to catch what
 * I did not think to assert: the states a reviewer actually meets — a day whose record is open, the
 * layer switched off, the collapsed width, an empty day. Screenshots, no assertions.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/calendar";
const shot = (name: string) => `reports/calendar-fixes/look-${name}.png`;

test("calendar — a look at it", async ({ page }) => {
  /* 1 — the month, both widths */
  for (const width of [1440, 1920]) {
    await openRoute(page, ROUTE, { width, height: 900 });
    await page.screenshot({ path: shot(`month-${width}`) });
  }

  await openRoute(page, ROUTE, { width: 1440, height: 900 });

  /* 2 — a day that has record entries: 18 August carries the holding replies */
  const day18 = page.locator(".cal-cell", { has: page.locator(".cal-dn", { hasText: /^18$/ }) }).first();
  await day18.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("day-with-record") });

  /* 3 — a record row expanded in place */
  const rec = page.locator(".cal-recmain").first();
  if (await rec.count()) {
    await rec.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: shot("record-expanded") });
  }

  /* 4 — an empty day: 26 August has nothing */
  const day26 = page.locator(".cal-cell", { has: page.locator(".cal-dn", { hasText: /^26$/ }) }).first();
  await day26.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("empty-day") });

  /* 5 — `Upcoming only`: the record and the done cards both gone, grid starting at today's week.
     ⚠️ THE RECORD CHIP IT USED TO CLICK IS RETIRED (finishing pack, Phase 3) — the view segment
     replaced it, and `Upcoming only` is the state that used to be "record off" plus the done
     cards dropped. */
  await page.locator(".cal-segb", { hasText: /Upcoming only/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("upcoming-only") });
  await page.locator(".cal-segb", { hasText: /Done & upcoming/i }).click();

  /* 6 — the collapsed width */
  await openRoute(page, ROUTE, { width: 1000, height: 900 });
  await page.screenshot({ path: shot("collapsed-1000"), fullPage: true });

  console.log("shots written to reports/calendar-fixes/look-*.png");
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE FINISHING PACK — Step 0's two measured questions, then Phase 7's acceptance.

   ⚠️ THIS FILE WAS "SCREENSHOTS, NO ASSERTIONS" AND NOW CARRIES BOTH. The finishing pack's
   territory names it as the calendar's harness file, so the acceptance lands here rather than in a
   new file outside the fence. The look test above is untouched and keeps its own purpose.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Step 0 item 5 — FOOT-MARGIN PARITY.
 *
 * ⚠️ THE CHASSIS PACK FIXED THE 21px BUT ITS MARGIN-PARITY ADDENDUM WAS NEVER EVIDENCED. This
 * establishes the three numbers so the claim is a measurement rather than an assumption.
 *
 * ⚠️ ALL THREE PAGES FILL — NONE OF THEM SCROLLS — so the foot gap is simply where the ink stops.
 * Probed and confirmed: the only page-level scroller on any of the three is the sidebar `nav.ws-nav`;
 * everything else that scrolls is an inner pane. A first attempt scrolled `.wpg-scroll` to its
 * bottom first and changed nothing, because there is nothing there to scroll.
 *
 * ⚠️ AND IT COUNTS ONLY INK THAT LANDS INSIDE THE VIEWPORT. A naive "lowest box" walk descends into
 * those inner panes and reports their OVERFLOWED content: `/queries` read 1959px — a true number
 * about a pane's scroll extent, and nothing whatever to do with a foot margin. The bottom-most box
 * that is actually on screen is the gap a reader sees.
 *
 * ⚠️ AND IT WALKS FROM A VISIBLE `.ws-main`, NEVER `querySelector` BY CLASS. Every workspace page
 * stays mounted; a bare query can return a hidden page's zero-sized copy.
 */
test("finishing Step 0 — foot-margin parity across the three pages", async ({ page }) => {
  const ROUTES = ["/queries", "/todo", "/todo/calendar"];
  const rows: string[] = [];

  for (const route of ROUTES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const px = (n: number) => Math.round(n * 100) / 100;
      const vis = (sel: string) =>
        Array.from(document.querySelectorAll(sel))
          .find((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;

      const main = vis(".ws-main");
      if (!main) return null;
      const mb = main.getBoundingClientRect();
      const cs = getComputedStyle(main);
      const vh = window.innerHeight;

      /* the bottom-most painted box that is ON SCREEN — what the reader's eye stops at */
      let lowest = -Infinity, lowestTag = "";
      for (const el of Array.from(main.querySelectorAll("*")) as HTMLElement[]) {
        const b = el.getBoundingClientRect();
        if (b.height < 2 || b.width < 2) continue;
        if (b.bottom > vh + 0.5) continue;            // clipped away or below the fold
        const s2 = getComputedStyle(el);
        if (s2.visibility === "hidden" || s2.display === "none") continue;
        if (b.bottom > lowest) {
          lowest = b.bottom;
          lowestTag = `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(/\s+/)[0]}`;
        }
      }
      const win = vis(".ws-window") ?? vis(".ws-winwrap");
      const wb = win?.getBoundingClientRect();
      return {
        winBottom: wb ? px(wb.bottom) : null,
        winGap: wb ? px(vh - wb.bottom) : null,
        winTag: win ? `${win.tagName.toLowerCase()}.${(win.className||"").toString().split(/\s+/)[0]}` : null,
        vh,
        pageScrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight,
        mainBottom: px(mb.bottom),
        mainPadB: cs.paddingBottom,
        lowestInk: px(lowest), lowestTag,
        footGap: px(vh - lowest),
      };
    });
    if (!r) { rows.push(`  ${route.padEnd(16)}  no visible .ws-main`); continue; }
    rows.push(
      `  ${route.padEnd(16)} vh ${r.vh}  main-bottom ${String(r.mainBottom).padStart(6)} (pad-b ${r.mainPadB})  ` +
      `WINDOW ${r.winTag} ends ${String(r.winBottom).padStart(6)} -> CHASSIS FOOT ${String(r.winGap).padStart(5)}   ` +
      `| lowest ink ${String(r.lowestInk).padStart(7)} ${r.lowestTag.padEnd(16)} gap ${String(r.footGap).padStart(6)}`,
    );
  }
  console.log("\n──── foot-margin parity @1440×900 (all three FILL) ────\n" + rows.join("\n"));
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   PHASE 7 — THE ACCEPTANCE. Peek, modes, kinds, ghosts, overlay, cushion.

   ⚠️ EVERY PROBE ASSERTS ITS PRECONDITION BEFORE ITS CLAIM. A peek check on a month with no
   populated cell, a ghost check with nothing carried, a `+N` reconciliation with no folded day —
   each of those passes by measuring nothing. The population is asserted first, every time.

   ⚠️ AND IT RUNS AGAINST A LOCAL `vite preview`, not the deployed site: this pack is UNDEPLOYED,
   because another session's uncommitted source is in the tree. Pass SA_E2E_BASE_URL explicitly.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const WIDTHS = [1000, 1440, 1920];
/** PEEK_DELAY_MS is 450; wait past it rather than racing it. */
const PEEK_WAIT = 750;

/** Lift the harness's motion suppression — a peek that never animates in still has to APPEAR. */
async function calState(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const px = (n: number) => Math.round(n * 100) / 100;
    const grid = document.querySelector(".cal-grid") as HTMLElement | null;
    if (!grid) return null;
    const cells = Array.from(grid.querySelectorAll(".cal-cell")) as HTMLElement[];
    const dow = grid.firstElementChild as HTMLElement;
    return {
      rows: Math.round(cells.length / 7),
      cellCount: cells.length,
      foldShort: grid.getAttribute("data-fold-short"),
      firstDay: (cells[0]?.querySelector(".cal-dn")?.textContent ?? "").trim(),
      leadCells: cells.filter((c) => c.classList.contains("lead")).length,
      recordPips: grid.querySelectorAll(".cal-pip.cal-rec").length,
      ghostPips: grid.querySelectorAll(".cal-pip.cal-ghost").length,
      donePips: cells.reduce((n, c) => n + c.querySelectorAll(".cal-pip.struck").length, 0),
      /* per populated cell: does it overflow, and does the chip reconcile with shown + overflow */
      cellsData: cells.map((c) => ({
        day: (c.querySelector(".cal-dn")?.textContent ?? "").trim(),
        chip: Number(c.querySelector(".cal-c2")?.textContent ?? 0),
        pips: c.querySelectorAll(".cal-pip").length,
        ghosts: c.querySelectorAll(".cal-pip.cal-ghost").length,
        more: Number((c.querySelector(".cal-more2")?.textContent ?? "0").replace(/\D/g, "")),
        over: c.scrollHeight > c.clientHeight + 1,
        sh: c.scrollHeight, ch: c.clientHeight,
      })).filter((c) => c.pips > 0 || c.chip > 0),
      dowH: dow.offsetHeight,
      gridH: grid.clientHeight,
      rowPx: px((grid.clientHeight - dow.offsetHeight) / Math.max(1, Math.round(cells.length / 7))),
    };
  });
}

test("finishing Phase 7 — peek, modes, kinds, ghosts, overlay, cushion", async ({ page }) => {
  const log: string[] = [];

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    const base = await calState(page);
    expect(base, `@${width}: no calendar grid`).not.toBeNull();
    const b = base!;

    /* ── the standing constraints, at every width ─────────────────────────── */
    expect(b.cellCount, `@${width}: the default month is not six rows`).toBe(42);
    expect(b.foldShort, `@${width}: the fold reports the floor unsatisfiable`).toBeNull();
    const populated = b.cellsData.filter((c) => c.pips > 0);
    expect(populated.length, `@${width}: no populated cell — every claim below is vacuous`)
      .toBeGreaterThan(0);
    for (const c of populated) {
      expect(c.over, `@${width} day ${c.day} overflows (${c.sh}/${c.ch})`).toBe(false);
    }
    /* ⚠️ THE CHIP RECONCILES WITH WHAT IS DRAWN — shown + overflow, ghosts included */
    for (const c of b.cellsData.filter((x) => x.chip > 0)) {
      expect(c.pips - c.ghosts + c.more, `@${width} day ${c.day}: chip ${c.chip} != shown + ${c.more}`)
        .toBe(c.chip);
    }

    /* ── ghosts ──────────────────────────────────────────────────────────── */
    /* ⚠️ A FIRST VERSION GUARDED THIS WITH `if (count > 0)` AND REPORTED ZERO GHOSTS AT EVERY
       WIDTH — passing by measuring nothing, which is the precondition gap this file's own header
       warns about. The cause was not a bug: the four carried items on this account have origins in
       JUNE and JULY (17 Jun, 13 Jun, 22 Jun, 22 Jul), all outside August's grid, so August is
       exactly the "otherwise the age line carries it alone" case. So the check now does two
       things: it asserts the AUGUST half (carried items exist and their panel lines state the
       gap), then NAVIGATES BACK to find the origins and asserts the ghosts are there. */
    /* ⚠️ TODAY'S LABELS COME FROM THE PEEK, NOT THE CELL — and the first version's failure is the
       reason. Read off the cell, the list is CAPPED: at 1000 today shows two pills and a counter,
       so pairing a ghost against it reported "Nudge due has no live pill on today" about a pill
       that was simply folded. The peek is the uncapped set, rendered through the same `pillLabel`,
       which is precisely what it exists for — so this verifies the peek and the pairing together. */
    /* ⚠️ THE POINTER IS MOVED TO A MEASURED POINT, NEVER `locator.hover()`. Every workspace page
       stays MOUNTED, so `.cal-cell.today` matches a hidden page's zero-sized copy as well as the
       real one, and Playwright waited on that copy's actionability until the test timed out — a
       seven-minute hang that looked like a broken peek. The coordinates come from the VISIBLE
       grid, walked from an element proved on screen. */
    const todayPoint = await page.evaluate(() => {
      const grid = Array.from(document.querySelectorAll(".cal-grid"))
        .find((g) => (g as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;
      const cell = grid?.querySelector(".cal-cell.today") as HTMLElement | null;
      if (!cell) return null;
      const r = cell.getBoundingClientRect();
      if (r.height < 2 || r.bottom > window.innerHeight) return null;
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    expect(todayPoint, `@${width}: today's cell is not on screen — the peek probe would prove nothing`)
      .not.toBeNull();
    /* ⚠️ TWO MOVES, NOT ONE — the peek arms on `mouseenter`, which fires only when the pointer
       CROSSES the element's boundary. A single move that happens to land inside from an unknown
       previous position may not cross anything, and the probe then reports "no peek opened" about
       a peek that was never asked for. Approach, then land. */
    await page.mouse.move(todayPoint!.x - 60, todayPoint!.y - 60);
    await page.waitForTimeout(80);
    await page.mouse.move(todayPoint!.x, todayPoint!.y);
    await page.waitForTimeout(PEEK_WAIT);
    const peekLabels = await page.evaluate(() => {
      const pk = document.querySelector(".cal-peek") as HTMLElement | null;
      if (!pk) return null;
      const r = pk.getBoundingClientRect();
      const grid = (Array.from(document.querySelectorAll(".cal-grid"))
        .find((g) => (g as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement).getBoundingClientRect();
      const vgrid = Array.from(document.querySelectorAll(".cal-grid"))
        .find((g) => (g as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement;
      const cell = (vgrid.querySelector(".cal-cell.today") as HTMLElement).getBoundingClientRect();
      return {
        labels: Array.from(pk.querySelectorAll(".cal-pip:not(.cal-ghost)")).map((p) => (p.textContent ?? "").trim()),
        day: (pk.querySelector(".cal-pkday")?.textContent ?? "").trim(),
        pointerEvents: getComputedStyle(pk).pointerEvents,
        widthRatio: Math.round((r.width / cell.width) * 100) / 100,
        insideGrid: r.left >= grid.left - 0.5 && r.right <= grid.right + 0.5
          && r.top >= grid.top - 0.5 && r.bottom <= grid.bottom + 0.5,
      };
    });
    expect(peekLabels, `@${width}: no peek opened on today after ${PEEK_WAIT}ms`).not.toBeNull();
    const pk = peekLabels!;
    log.push(`  @${width} peek: ${pk.labels.length} unfolded · ${pk.day} · ×${pk.widthRatio} · in-grid ${pk.insideGrid} · pe ${pk.pointerEvents}`);
    /* ⚠️ THE PEEK IS UNCAPPED — it must hold at least what the cell drew, and no counter */
    expect(pk.labels.length, `@${width}: the peek is empty`).toBeGreaterThan(0);
    expect(await page.locator(".cal-peek .cal-more2").count(), `@${width}: the peek drew a counter`).toBe(0);
    expect(pk.pointerEvents, `@${width}: the peek takes pointer events — it would flicker`).toBe("none");
    expect(pk.widthRatio, `@${width}: the peek is not ~1.6× the cell`).toBeGreaterThan(1.2);
    expect(pk.insideGrid, `@${width}: the peek escaped the grid's bounds`).toBe(true);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(200);
    expect(await page.locator(".cal-peek").count(), `@${width}: the peek survived mouse-leave`).toBe(0);

    const carried = await page.evaluate(() => ({
      origLines: Array.from(document.querySelectorAll(".cal-fporig")).map((e) => (e.textContent ?? "").trim()),
    }));
    const todayLabels = pk.labels;
    expect(carried.origLines.length, `@${width}: nothing is carried — every ghost claim below is vacuous`)
      .toBeGreaterThan(0);
    /* ⚠️ THE COPY LAW, ON REAL DATA: fact, no verdict, no "overdue" */
    for (const line of carried.origLines) {
      expect(line, `@${width}: a provenance line judges: ${line}`)
        .not.toMatch(/overdue|late|slow|still|already|only|just|urgent|should|behind/i);
      expect(line).toMatch(/^Your turn · Since \d+ \w+( · \d+ days? waiting)?$/);
    }
    /* no ghost may ever sit on today itself */
    expect(await page.locator(".cal-cell.today .cal-pip.cal-ghost").count(),
      `@${width}: a ghost rendered on today`).toBe(0);

    /* walk back until a month holds an origin — up to three, which covers this account's data */
    let ghostMonth: { month: string; count: number; labels: string[]; dashed: string[]; arrows: string[] } | null = null;
    for (let back = 1; back <= 3 && !ghostMonth; back++) {
      await page.locator('.cal-nav[aria-label="Previous"]').click();
      await page.waitForTimeout(400);
      const g = await page.evaluate(() => {
        const grid = document.querySelector(".cal-grid") as HTMLElement;
        const ghosts = Array.from(grid.querySelectorAll(".cal-pip.cal-ghost")) as HTMLElement[];
        return {
          month: grid.getAttribute("aria-label") ?? "",
          count: ghosts.length,
          labels: ghosts.map((x) => (x.querySelector(".cal-ghtxt")?.textContent ?? "").trim()),
          dashed: ghosts.map((x) => getComputedStyle(x).borderStyle),
          arrows: ghosts.map((x) => (x.querySelector(".cal-ghfwd")?.textContent ?? "").trim()),
        };
      });
      if (g.count > 0) ghostMonth = g;
    }
    expect(ghostMonth, `@${width}: no ghost in any of the three months behind today, though ${carried.origLines.length} items are carried`)
      .not.toBeNull();
    const gm = ghostMonth!;
    log.push(`  @${width} ghosts: ${gm.count} in ${gm.month} — ${JSON.stringify(gm.labels)}`);
    for (const st of gm.dashed) expect(st, `@${width}: a ghost is not dashed`).toBe("dashed");
    for (const a of gm.arrows) expect(a, `@${width}: a ghost has no tail arrow`).toBe("↦");
    /* ⚠️ THE PAIR IS THE CLAIM: every ghost's words match a live pill standing on today. Today is
       not in this month's grid, so the pairing is asserted across the two views by LABEL — which
       is exactly what "the ghost's words ARE the live pill's words" means. */
    expect(todayLabels.length, `@${width}: today has no live pills to pair against`).toBeGreaterThan(0);
    for (const l of gm.labels) {
      expect(todayLabels, `@${width}: ghost "${l}" has no live pill on today`).toContain(l);
    }
    /* and the month it came from does not overflow either */
    const gs = (await calState(page))!;
    for (const c of gs.cellsData.filter((x) => x.pips > 0)) {
      expect(c.over, `@${width} ghost-month day ${c.day} overflows`).toBe(false);
    }
    expect(gs.foldShort, `@${width}: the ghost month reports a shortfall`).toBeNull();

    /* back to today for the rest of the run */
    await page.locator(".cal-today").click();
    await page.waitForTimeout(400);

    /* ── Upcoming only ───────────────────────────────────────────────────── */
    await page.locator(".cal-segb", { hasText: /Upcoming only/i }).click();
    await page.waitForTimeout(350);
    const up = (await calState(page))!;
    log.push(`  @${width} upcoming: rows ${up.rows}  first ${up.firstDay}  lead ${up.leadCells}  record ${up.recordPips}  done ${up.donePips}  foldShort ${up.foldShort ?? "none"}`);
    expect(up.rows, `@${width}: Upcoming only did not shorten the grid`).toBeLessThan(6);
    expect(up.rows).toBeGreaterThan(0);
    expect(up.recordPips, `@${width}: Upcoming only still draws record entries`).toBe(0);
    expect(up.donePips, `@${width}: Upcoming only still draws done cards`).toBe(0);
    /* ⚠️ WHOLE WEEKS: the first row starts on a Monday, and its pre-today days are DIMMED */
    expect(up.cellCount % 7, `@${width}: Upcoming only broke a week`).toBe(0);
    expect(up.leadCells, `@${width}: no dimmed lead-in — the mode deleted the days instead`)
      .toBeGreaterThan(0);
    expect(up.foldShort, `@${width}: the shorter grid reports a shortfall`).toBeNull();
    for (const c of up.cellsData.filter((x) => x.pips > 0)) {
      expect(c.over, `@${width} upcoming day ${c.day} overflows`).toBe(false);
    }

    await page.locator(".cal-segb", { hasText: /Done & upcoming/i }).click();
    await page.waitForTimeout(350);
    const back = (await calState(page))!;
    expect(back.cellCount, `@${width}: Done & upcoming did not restore six rows`).toBe(42);
    expect(back.recordPips, `@${width}: the record did not come back`).toBe(b.recordPips);

    /* ── kind filters, composing with both modes ─────────────────────────── */
    /* ⚠️ THE KIND TO SWITCH OFF IS DERIVED FROM THE DATA, NEVER NAMED. A first version hard-coded
       "Agent responses" and went red — not because filtering was broken, but because this month
       contains none: its record reads Query sent / Partial sent / Closed. That is the precondition
       gap in its purest form, and I wrote it three paragraphs under my own warning about it. So
       this walks every kind, toggles it, and records which ones actually move the count. */
    await page.locator(".cal-kbtn").click();
    await page.waitForTimeout(200);
    const rows = page.locator(".cal-krow");
    expect(await rows.count(), `@${width}: the kind checklist has no rows`).toBe(6);

    const totalPips = (st: NonNullable<Awaited<ReturnType<typeof calState>>>) =>
      st.cellsData.reduce((n, c) => n + c.pips, 0);
    const beforePips = totalPips(b);
    const moved: string[] = [];
    for (let i = 0; i < 6; i++) {
      const label = (await rows.nth(i).textContent() ?? "").trim();
      await rows.nth(i).click();
      await page.waitForTimeout(260);
      const off = (await calState(page))!;
      const delta = beforePips - totalPips(off);
      if (delta > 0) {
        moved.push(`${label} −${delta}`);
        /* ⚠️ AND THE `+N` STILL RECONCILES UNDER FILTERING — the whole point of the kinds being
           the last word inside the one reading function. */
        for (const c of off.cellsData.filter((x) => x.chip > 0)) {
          expect(c.pips - c.ghosts + c.more, `@${width} filtered day ${c.day}: +N does not reconcile`)
            .toBe(c.chip);
        }
        expect(off.foldShort, `@${width}: filtering produced a shortfall`).toBeNull();
        for (const c of off.cellsData.filter((x) => x.pips > 0)) {
          expect(c.over, `@${width} filtered day ${c.day} overflows`).toBe(false);
        }
      }
      await rows.nth(i).click();          // back on
      await page.waitForTimeout(200);
    }
    log.push(`  @${width} kinds that moved the month: ${moved.length ? moved.join(", ") : "NONE"}`);
    expect(moved.length, `@${width}: no kind changed anything — the control is inert, or the month is empty`)
      .toBeGreaterThan(0);

    /* every kind restored, so the month is back where it started */
    await page.locator(".cal-kall").click();
    await page.waitForTimeout(300);
    const restored = (await calState(page))!;
    expect(restored.recordPips, `@${width}: "Show every kind" did not restore the record`).toBe(b.recordPips);
    expect(totalPips(restored), `@${width}: "Show every kind" did not restore the pips`).toBe(beforePips);

    /* ⚠️ AND THE KINDS COMPOSE WITH THE MODE rather than overlapping it: in `Upcoming only` the
       record is already gone, so a kind that only claims record labels can take nothing more. */
    await page.locator(".cal-segb", { hasText: /Upcoming only/i }).click();
    await page.waitForTimeout(300);
    const upFiltered = (await calState(page))!;
    expect(upFiltered.recordPips, `@${width}: the mode's own rule stopped applying under filtering`).toBe(0);
    await page.locator(".cal-segb", { hasText: /Done & upcoming/i }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
  }

  console.log("\n──── Phase 7 ────\n" + log.join("\n"));
});

/**
 * Phase 7, part two — reduced motion, the overlay, the cushion, and the foot margin.
 *
 * ⚠️ NO COMPLETION IS PERFORMED HERE, DELIBERATELY, and the report says so rather than implying
 * the check ran. Completing a carried item is a real WRITE to the dev harness account, and this
 * app's only reversal is the toast's Undo — which is the very thing the standing harness gap says
 * is unverified end-to-end. Making a write I cannot reliably reverse unattended, to prove a claim
 * about reversal, is the wrong trade at 3am.
 */
test("finishing Phase 7b — reduced motion, overlay, cushion, foot margin", async ({ page }) => {
  const log: string[] = [];

  /* ── reduced motion: the peek still APPEARS, only the scale animation goes ─────────── */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const rmPoint = await page.evaluate(() => {
    const grid = Array.from(document.querySelectorAll(".cal-grid"))
      .find((g) => (g as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement;
    const cell = Array.from(grid.querySelectorAll(".cal-cell"))
      .find((c) => c.querySelectorAll(".cal-pip").length > 0) as HTMLElement | undefined;
    if (!cell) return null;
    const r = cell.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  expect(rmPoint, "no populated cell under reduced motion — the check would be vacuous").not.toBeNull();
  await page.mouse.move(rmPoint!.x - 60, rmPoint!.y - 60);
  await page.waitForTimeout(80);
  await page.mouse.move(rmPoint!.x, rmPoint!.y);
  await page.waitForTimeout(PEEK_WAIT);
  const rm = await page.evaluate(() => {
    const pk = document.querySelector(".cal-peek") as HTMLElement | null;
    if (!pk) return null;
    return { anim: getComputedStyle(pk).animationName, pips: pk.querySelectorAll(".cal-pip").length };
  });
  expect(rm, "reduced motion suppressed the peek entirely — it should only lose the scale").not.toBeNull();
  expect(rm!.anim, "the scale animation still runs under reduced motion").toBe("none");
  expect(rm!.pips, "the reduced-motion peek is empty").toBeGreaterThan(0);
  log.push(`  reduced motion: peek present, ${rm!.pips} pips, animation ${rm!.anim}`);
  await page.emulateMedia({ reducedMotion: null });

  /* ── the overlay ──────────────────────────────────────────────────────────────────── */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const before = await page.evaluate(() => {
    const grid = Array.from(document.querySelectorAll(".cal-grid"))
      .find((g) => (g as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement;
    const sel = grid.querySelector(".cal-cell.sel, .cal-cell[aria-selected='true']") as HTMLElement | null;
    /* ⚠️ THE PANEL ROW OPENS THE FLOW, NOT THE GRID PILL — the locked click grammar is that a
       card pill SELECTS its day and asks for its row, and the row is what opens the sheet. A first
       version clicked a pip and reported "the overlay did not open" about a page behaving exactly
       as its own lock requires. */
    const row = Array.from(document.querySelectorAll(".cal-fprow"))
      .find((b) => !(b as HTMLButtonElement).disabled) as HTMLElement | undefined;
    const r = row?.getBoundingClientRect();
    return {
      selDay: (sel?.querySelector(".cal-dn")?.textContent ?? "").trim(),
      point: r && r.height > 2 ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null,
    };
  });
  expect(before.point, "no enabled panel row to open — the overlay check would be vacuous").not.toBeNull();
  await page.mouse.click(before.point!.x, before.point!.y);
  await page.waitForTimeout(700);
  const ov = await page.evaluate(() => {
    const ff = document.querySelector(".cal-flow .tdb-ff") as HTMLElement | null;
    const sheet = document.querySelector(".cal-flow .tdb-ffsheet") as HTMLElement | null;
    const body = document.querySelector(".cal-flow .tdb-ffbody") as HTMLElement | null;
    if (!ff || !sheet) return null;
    const s = sheet.getBoundingClientRect();
    return {
      role: ff.getAttribute("role"), modal: ff.getAttribute("aria-modal"),
      width: Math.round(s.width),
      centred: Math.abs((s.left + s.width / 2) - window.innerWidth / 2) < 3,
      onScreen: s.top >= 0 && s.bottom <= window.innerHeight + 1,
      scrolls: body ? getComputedStyle(body).overflowY : null,
      scrimAlpha: getComputedStyle(ff).backgroundColor,
    };
  });
  expect(ov, "the overlay did not open").not.toBeNull();
  log.push(`  overlay: ${ov!.width}px · centred ${ov!.centred} · on-screen ${ov!.onScreen} · ${ov!.role}/${ov!.modal} · body ${ov!.scrolls}`);
  expect(ov!.role).toBe("dialog");
  expect(ov!.modal).toBe("true");
  /* ⚠️ 430 IS THE SCOPED WIDTH — if this reads ~860 the page rule lost the cascade to todo.css */
  expect(ov!.width, "the sheet is not the calendar's scoped 430 — the cascade was lost").toBe(430);
  expect(ov!.centred, "the sheet is not centred").toBe(true);
  expect(ov!.onScreen, "the sheet hangs off the viewport").toBe(true);
  expect(ov!.scrolls, "the sheet body is not its own scroll region").toBe("auto");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => {
    const grid = Array.from(document.querySelectorAll(".cal-grid"))
      .find((g) => (g as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement;
    const sel = grid.querySelector(".cal-cell.sel, .cal-cell[aria-selected='true']") as HTMLElement | null;
    return {
      open: document.querySelectorAll(".cal-flow .tdb-ff").length,
      selDay: (sel?.querySelector(".cal-dn")?.textContent ?? "").trim(),
    };
  });
  expect(after.open, "Escape did not close the overlay").toBe(0);
  /* ⚠️ THE DAY IS STILL SELECTED — closing nulls the card and nothing else */
  expect(after.selDay, "closing lost the selected day").toBe(before.selDay);
  log.push(`  overlay closed on Escape · day still selected: ${after.selDay || "(none)"}`);

  /* ── what could NOT be verified, stated rather than skipped ───────────────────────── */
  /* ⚠️ POINTER INTERACTION *INSIDE* `FocusFlow` IS UNVERIFIABLE IN THIS HARNESS, and that is the
     STANDING GAP this session has already reported once, not a new finding. Measured again here:
     `elementsFromPoint` over the sheet's OWN footer button returns `["body", "html"]`, the sheet
     receives no click events at all, and neither the × nor a scrim click does anything — while the
     scrim is measured `position: fixed`, `visibility: visible`, `pointer-events: auto`, `z-index:
     50`, 0,0,1440×900, and the sheet PAINTS correctly (see reports/calendar-finishing/).
     ⚠️ SO IT IS NOT REPORTED AS A DEFECT. A harness that cannot click into an overlay and an app
     whose overlay cannot be clicked produce the identical measurement, and asserting either would
     be stating something I have not established. What IS established: the overlay opens from a
     panel row, its geometry is right, and ESCAPE closes it — keyboard reaches it even though the
     synthetic pointer does not, which is itself evidence the component is alive and listening.
     ⚠️ AND ONE THING WAS LEARNED WHILE PROBING IT, worth keeping: `FocusFlow` mounts `useOverlay`
     with `onScrimClick: () => { if (!reduce) setNudged(true) }` — a scrim click NUDGES the sheet
     rather than closing it, deliberately, because it can hold staged answers a stray click would
     discard. The pack asked for "escape and scrim-click close"; the app's own recorded decision is
     escape-and-×, and a recorded decision is not overturned by a pack. Flagged, not changed. */

  /* ── cushion + foot margin, at every width ────────────────────────────────────────── */
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    const m = await page.evaluate(() => {
      const px = (n: number) => Math.round(n * 100) / 100;
      const vis = (s: string) => Array.from(document.querySelectorAll(s))
        .find((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;
      const grid = vis(".cal-grid")!;
      const cells = Array.from(grid.querySelectorAll(".cal-cell")) as HTMLElement[];
      const sample = cells.find((c) => c.querySelectorAll(".cal-pip").length > 0) ?? cells[8];
      const cs = getComputedStyle(sample);
      const d = sample.querySelector(".cal-d") as HTMLElement | null;
      const pip = sample.querySelector(".cal-pip") as HTMLElement | null;
      const more = grid.querySelector(".cal-more2") as HTMLElement | null;
      const pcs = pip ? getComputedStyle(pip) : null;
      const pipFlow = pip && pcs ? px(pip.getBoundingClientRect().height + parseFloat(pcs.marginTop)) : 0;
      const moreH = more ? px(more.getBoundingClientRect().height) : 11;
      const avail = px(sample.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
        - (d?.getBoundingClientRect().height ?? 0));
      const win = vis(".ws-window") ?? vis(".ws-winwrap");
      return {
        cushion: px(avail - (2 * pipFlow + moreH)),
        foldShort: grid.getAttribute("data-fold-short"),
        chassisFoot: win ? px(window.innerHeight - win.getBoundingClientRect().bottom) : null,
      };
    });
    log.push(`  @${width} cushion ${m.cushion} · foldShort ${m.foldShort ?? "none"} · chassis foot ${m.chassisFoot}`);
    expect(m.cushion, `@${width}: cushion below 4px`).toBeGreaterThanOrEqual(4);
    expect(m.foldShort, `@${width}: the fold reports the floor unsatisfiable`).toBeNull();
    /* ⚠️ THE SAME 20px Step 0 measured on /queries and /todo — parity, not a calendar value */
    expect(m.chassisFoot, `@${width}: the chassis foot no longer matches the other pages' 20px`).toBe(20);
  }

  console.log("\n──── Phase 7b ────\n" + log.join("\n"));
});
