/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * calFold — the Calendar page's fold, its chassis and its day-panel track, measured on the
 * DEPLOYED dev site (record-layer fixes pack, Phase 0).
 *
 * ⚠️ WRITTEN BECAUSE THE REASONING WAS NOT ENOUGH. The record-layer pack shipped with the panel's
 * geometry unmeasured and said so; the review found no pips rendering anywhere. Two candidate
 * causes were already flagged in that report — a collapsed row feeding `calFoldCap`, and fold
 * arithmetic that never reserved the counter's line — and both are plausible from the source.
 * This file exists to find out WHICH, from the browser, before a line is changed.
 *
 * ⚠️ IT MEASURES THE CHAIN, NOT JUST THE SYMPTOM. A `flex: 1; min-height: 0` box that computes to
 * 0 has bitten this repo twice (`.tpl-cols`, `.f12-body`), and both times the tell was an ancestor
 * — not the element anyone was looking at. So the readings walk from `.wpg-scroll` down to
 * `.cal-cell` and report every height, rather than asking the one element under suspicion.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

const ROUTE = "/todo/calendar";
const WIDTHS = [1440, 1920];

/** The page's own constants, restated here ONLY so the report can show the arithmetic. */
const CAL_PIP_H = 25;   /* corrected in Phase 1 — browser-measured 24.75, rounded up */
const CAL_CELL_CHROME = 33;  /* Phase 3 — the numeral's 20px box */
const CAL_CELL_CAP = 3;

/** The shipped `calFoldCap`, mirrored so the report can state what the page computes today. */
const calFoldCapToday = (rowPx: number): number => {
  if (!rowPx || rowPx <= 0) return CAL_CELL_CAP;
  const room = rowPx - CAL_CELL_CHROME;
  const fits = Math.floor(room / CAL_PIP_H);
  return Math.max(1, Math.min(CAL_CELL_CAP, fits));
};

test("calendar — the fold, the chain, the track", async ({ page }) => {
  const lines: string[] = [];
  const sb = await scrollbarWidth(page).catch(() => -1);
  lines.push(`scrollbar width: ${sb}px`);

  for (const width of WIDTHS) {
    await openRoute(page, ROUTE, { width, height: 900 });
    lines.push(`\n================ ${width} × 900 ================`);

    const reading = await page.evaluate(() => {
      const px = (n: number) => Math.round(n * 100) / 100;
      const box = (el: Element | null) => {
        if (!el) return null;
        const r = (el as HTMLElement).getBoundingClientRect();
        const cs = getComputedStyle(el as HTMLElement);
        return {
          w: px(r.width), h: px(r.height),
          clientH: (el as HTMLElement).clientHeight,
          offsetH: (el as HTMLElement).offsetHeight,
          display: cs.display, flex: cs.flex, minHeight: cs.minHeight,
          overflowY: cs.overflowY,
        };
      };

      /* ⚠️ THE CHAIN IS WALKED UP FROM `.cal-grid`, NEVER QUERIED BY CLASS. Every workspace page
         stays MOUNTED (the shell toggles `display`), so `document.querySelector(".tpl-body")`
         returns the FIRST in the document — the To-do list's, which is hidden and therefore 0px.
         A first pass did exactly that and reported a collapsed chain for a page whose grid was
         plainly 638px tall. Walking up from an element known to be on THIS page cannot pick the
         wrong copy. */
      const chain: Array<{ tag: string } & NonNullable<ReturnType<typeof box>>> = [];
      {
        let el: HTMLElement | null = document.querySelector(".cal-grid");
        const seen: HTMLElement[] = [];
        while (el && el !== document.body) { seen.unshift(el); el = el.parentElement; }
        for (const e of seen) {
          const b = box(e);
          if (!b) continue;
          const cls = (e.className || "").toString().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
          chain.push({ tag: `${e.tagName.toLowerCase()}${cls ? "." + cls : ""}`, ...b });
        }
      }

      /* what the page's ResizeObserver actually sees, and what it derives from it */
      const grid = document.querySelector(".cal-grid") as HTMLElement | null;
      const dowEl = grid?.firstElementChild as HTMLElement | null;
      const observed = grid
        ? { clientHeight: grid.clientHeight, dowOffsetH: dowEl?.offsetHeight ?? 0 }
        : null;

      /* the real resolved track heights, from the grid itself rather than from arithmetic */
      const gridCs = grid ? getComputedStyle(grid) : null;
      const rowTracks = gridCs?.gridTemplateRows ?? "";
      const colTracks = gridCs?.gridTemplateColumns ?? "";

      /* the layout's two columns as the browser resolved them */
      const layoutCs = document.querySelector(".cal-layout")
        ? getComputedStyle(document.querySelector(".cal-layout") as HTMLElement)
        : null;

      /* cells: how tall is one really, and what is inside it */
      const cells = Array.from(document.querySelectorAll(".cal-cell")) as HTMLElement[];
      const cellSample = cells.slice(0, 3).map((c) => ({
        h: px(c.getBoundingClientRect().height),
        clientH: c.clientHeight,
        pips: c.querySelectorAll(".cal-pip").length,
        recPips: c.querySelectorAll(".cal-pip.cal-rec").length,
        more: c.querySelector(".cal-more2")?.textContent ?? null,
        numeral: c.querySelector(".cal-d")?.textContent ?? null,
      }));

      /* the whole month at a glance — the question is "does ANY cell show a pip" */
      const totalPips = document.querySelectorAll(".cal-cell .cal-pip").length;
      const totalMore = document.querySelectorAll(".cal-cell .cal-more2").length;
      const moreTexts = Array.from(document.querySelectorAll(".cal-cell .cal-more2"))
        .slice(0, 6).map((e) => e.textContent);

      /* ⚠️ PIP GEOMETRY — the question the first pass never asked, and the whole answer.
         A cell is a fixed-height flex COLUMN, and flex items shrink by default. If the stack is
         taller than the cell, every pip is squashed rather than the last one being dropped — so
         the pips render, pass every count assertion, and are illegible. Measuring one pip in a
         cell that overflows against one in a cell that does not settles it. */
      const pipGeom = cells
        .map((c) => {
          const pips = Array.from(c.querySelectorAll(".cal-pip")) as HTMLElement[];
          if (!pips.length) return null;
          const d = c.querySelector(".cal-d") as HTMLElement | null;
          const more = c.querySelector(".cal-more2") as HTMLElement | null;
          const cs0 = getComputedStyle(pips[0]);
          return {
            day: (d?.firstChild?.textContent ?? "").trim(),
            n: pips.length,
            hasMore: !!more,
            cellClientH: c.clientHeight,
            dH: d ? px(d.getBoundingClientRect().height) : 0,
            moreH: more ? px(more.getBoundingClientRect().height) : 0,
            pipHeights: pips.map((p) => px(p.getBoundingClientRect().height)),
            pipFontSize: cs0.fontSize,
            pipLineHeight: cs0.lineHeight,
            pipFlexShrink: cs0.flexShrink,
            pipMarginTop: cs0.marginTop,
            pipPadding: cs0.padding,
            /* scrollHeight > clientHeight on the pip means its own text is clipped inside it */
            pipClipped: pips.map((p) => p.scrollHeight > p.clientHeight + 1),
            /* the natural height the stack WANTS, versus the room it has */
            stackScrollH: c.scrollHeight,
          };
        })
        .filter(Boolean);

      /* the busiest cells, by whatever the +N counter claims is hidden */
      const populated = cells
        .map((c) => ({
          day: c.querySelector(".cal-d")?.textContent ?? "",
          pips: c.querySelectorAll(".cal-pip").length,
          more: c.querySelector(".cal-more2")?.textContent ?? "",
          h: px(c.getBoundingClientRect().height),
        }))
        .filter((c) => c.pips > 0 || c.more);

      /* chassis facts the later phases act on */
      const dow = document.querySelector(".cal-dow");
      const today = document.querySelector(".cal-cell.today");
      const past = document.querySelector(".cal-cell.past");
      const chassis = {
        dowBg: dow ? getComputedStyle(dow).backgroundColor : null,
        dowColor: dow ? getComputedStyle(dow).color : null,
        gridGap: gridCs?.gap ?? null,
        cellRadius: cells[0] ? getComputedStyle(cells[0]).borderRadius : null,
        cellBorder: cells[0] ? getComputedStyle(cells[0]).border : null,
        todayBorder: today ? getComputedStyle(today).border : null,
        pastBg: past ? getComputedStyle(past).backgroundColor : null,
      };

      /* the command bar's two reported faults */
      const recBtn = document.querySelector(".cal-recbtn") as HTMLElement | null;
      const navBtns = Array.from(document.querySelectorAll(".cal-nav")) as HTMLElement[];
      const bar = {
        recBtn: recBtn ? {
          w: px(recBtn.getBoundingClientRect().width),
          h: px(recBtn.getBoundingClientRect().height),
          lines: Math.round(recBtn.getBoundingClientRect().height / parseFloat(getComputedStyle(recBtn).lineHeight || "16")),
          whiteSpace: getComputedStyle(recBtn).whiteSpace,
          ariaPressed: recBtn.getAttribute("aria-pressed"),
        } : null,
        navGlyphs: navBtns.slice(0, 3).map((b) => ({
          label: b.getAttribute("aria-label"),
          text: (b.textContent ?? "").trim(),
          svgs: b.querySelectorAll("svg").length,
          w: px(b.getBoundingClientRect().width),
        })),
      };

      /* the panel head + legend, for phase 5 */
      const panelHead = {
        date: document.querySelector(".cal-fpdate")?.textContent ?? null,
        count: document.querySelector(".cal-fpcount")?.textContent ?? null,
      };
      const legendDots = Array.from(document.querySelectorAll(".cal-legend i")).map((i) => {
        const cs = getComputedStyle(i as HTMLElement);
        return { cls: (i as HTMLElement).className, bg: cs.backgroundColor, radius: cs.borderRadius, w: cs.width };
      });

      return {
        chain, pipGeom, observed, rowTracks, colTracks,
        panelBox: box(document.querySelector(".cal-focus")),
        layoutCols: layoutCs?.gridTemplateColumns ?? null,
        cellSample, totalPips, totalMore, moreTexts, populated,
        chassis, bar, panelHead, legendDots,
        cellCount: cells.length,
      };
    });

    /* ── the chain ─────────────────────────────────────────────────────────────────────────── */
    lines.push("\n-- min-height chain, WALKED UP FROM .cal-grid (never queried by class) --");
    for (const b of reading.chain) {
      lines.push(`  ${b.tag.padEnd(26)} h=${String(b.h).padStart(8)}  clientH=${String(b.clientH).padStart(5)}  display=${b.display.padEnd(6)}  flex=${b.flex.padEnd(10)}  minH=${b.minHeight}  ovY=${b.overflowY}`);
    }

    lines.push("\n-- PIP GEOMETRY: does the stack fit, or is it being squashed? --");
    for (const g of reading.pipGeom as any[]) {
      lines.push(`  day ${String(g.day).padEnd(3)} n=${g.n} more=${g.hasMore ? "Y" : "n"}  cellClientH=${g.cellClientH}  .cal-d=${g.dH}  .cal-more2=${g.moreH}`);
      lines.push(`         pip heights=${JSON.stringify(g.pipHeights)}  clipped=${JSON.stringify(g.pipClipped)}`);
      lines.push(`         font=${g.pipFontSize}/${g.pipLineHeight}  flex-shrink=${g.pipFlexShrink}  margin-top=${g.pipMarginTop}  padding=${g.pipPadding}`);
      lines.push(`         cell scrollHeight=${g.stackScrollH} vs clientHeight=${g.cellClientH}  => ${g.stackScrollH > g.cellClientH ? "OVERFLOWING" : "fits"}`);
    }

    /* ── the fold ──────────────────────────────────────────────────────────────────────────── */
    lines.push("\n-- what the ResizeObserver sees, and what calFoldCap makes of it --");
    if (reading.observed) {
      const { clientHeight, dowOffsetH } = reading.observed;
      const rowPx = Math.max(0, (clientHeight - dowOffsetH) / 6);
      lines.push(`  .cal-grid clientHeight = ${clientHeight}px`);
      lines.push(`  DOW row offsetHeight   = ${dowOffsetH}px`);
      lines.push(`  rowPx = (${clientHeight} - ${dowOffsetH}) / 6 = ${Math.round(rowPx * 100) / 100}px`);
      lines.push(`  room  = rowPx - ${CAL_CELL_CHROME} = ${Math.round((rowPx - CAL_CELL_CHROME) * 100) / 100}px`);
      lines.push(`  fits  = floor(room / ${CAL_PIP_H}) = ${Math.floor((rowPx - CAL_CELL_CHROME) / CAL_PIP_H)}`);
      lines.push(`  => calFoldCap(rowPx) = ${calFoldCapToday(rowPx)}   (fallback would be ${CAL_CELL_CAP})`);
    } else {
      lines.push("  .cal-grid ABSENT — nothing to observe");
    }
    lines.push(`  grid-template-rows    = ${reading.rowTracks}`);
    lines.push(`  grid-template-columns = ${reading.colTracks}`);

    /* ── did anything actually render ──────────────────────────────────────────────────────── */
    lines.push("\n-- what the month is actually showing --");
    lines.push(`  cells: ${reading.cellCount}   pips rendered: ${reading.totalPips}   +N counters: ${reading.totalMore}`);
    lines.push(`  counter texts: ${JSON.stringify(reading.moreTexts)}`);
    lines.push(`  populated cells (${reading.populated.length}):`);
    for (const p of reading.populated.slice(0, 12)) {
      lines.push(`    day ${String(p.day).padEnd(4)} pips=${p.pips}  more="${p.more}"  cellH=${p.h}`);
    }
    lines.push(`  first three cells: ${JSON.stringify(reading.cellSample)}`);

    /* ── the day panel's track ─────────────────────────────────────────────────────────────── */
    lines.push("\n-- the day panel's track --");
    lines.push(`  .cal-layout grid-template-columns = ${reading.layoutCols}`);
    const byTag = (frag: string) => reading.chain.find((c) => c.tag.includes(frag));
    lines.push(`  month column  w=${byTag("cal-main")?.w ?? "?"}`);
    lines.push(`  panel column  w=${reading.panelBox?.w ?? "?"}  h=${reading.panelBox?.h ?? "?"}`);
    lines.push(`  panel head: date=${JSON.stringify(reading.panelHead.date)} count=${JSON.stringify(reading.panelHead.count)}`);

    /* ── chassis + bar, for phases 2–5 ─────────────────────────────────────────────────────── */
    lines.push("\n-- chassis (phase 2/3) --");
    lines.push(`  ${JSON.stringify(reading.chassis, null, 0)}`);
    lines.push("\n-- command bar (phase 4) --");
    lines.push(`  ${JSON.stringify(reading.bar, null, 0)}`);
    lines.push("\n-- legend dots (phase 5) --");
    for (const d of reading.legendDots) lines.push(`  ${JSON.stringify(d)}`);

    await page.screenshot({ path: `reports/calendar-fixes/month-${width}.png`, fullPage: false });
  }

  /* ── the 1080 collapse ───────────────────────────────────────────────────────────────────── */
  await openRoute(page, ROUTE, { width: 1000, height: 900 });
  const collapse = await page.evaluate(() => {
    const l = document.querySelector(".cal-layout") as HTMLElement | null;
    const f = document.querySelector(".cal-focus") as HTMLElement | null;
    const g = document.querySelector(".cal-grid") as HTMLElement | null;
    const vis = (el: HTMLElement | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), inView: r.top < window.innerHeight && r.bottom > 0 };
    };
    return {
      cols: l ? getComputedStyle(l).gridTemplateColumns : null,
      overflowY: l ? getComputedStyle(l).overflowY : null,
      panel: vis(f), grid: vis(g), viewportH: window.innerHeight,
    };
  });
  lines.push("\n================ 1000 × 900 (below the 1080 breakpoint) ================");
  lines.push(`  .cal-layout columns = ${collapse.cols}   overflowY = ${collapse.overflowY}`);
  lines.push(`  grid  ${JSON.stringify(collapse.grid)}`);
  lines.push(`  panel ${JSON.stringify(collapse.panel)}   (viewport h=${collapse.viewportH})`);

  console.log(lines.join("\n"));
});

/**
 * ⚠️ THE ACCEPTANCE RUN — assertions, not prints (fixes pack, Phase 6).
 *
 * The measurement above reports; this one FAILS. Every claim the fixes pack makes about the
 * rendered page is checked here at both widths, because the whole reason this pack exists is that
 * "landed in code" was mistaken for "landed on the page" once already.
 */
test("calendar — acceptance", async ({ page }) => {
  for (const width of [1440, 1920]) {
    await openRoute(page, ROUTE, { width, height: 900 });
    const r = await page.evaluate(() => {
      const grid = document.querySelector(".cal-grid") as HTMLElement;
      const cells = Array.from(document.querySelectorAll(".cal-cell")) as HTMLElement[];
      const populated = cells
        .map((c) => {
          const pips = Array.from(c.querySelectorAll(".cal-pip")) as HTMLElement[];
          const more = c.querySelector(".cal-more2");
          const chip = c.querySelector(".cal-c2");
          return {
            day: (c.querySelector(".cal-dn")?.textContent ?? "").trim(),
            total: Number(chip?.textContent ?? 0),
            shown: pips.length,
            hasMore: !!more,
            clipped: pips.some((p) => p.scrollHeight > p.clientHeight + 1),
            overflowing: c.scrollHeight > c.clientHeight + 1,
            minPipH: pips.length ? Math.min(...pips.map((p) => p.getBoundingClientRect().height)) : null,
          };
        })
        .filter((c) => c.total > 0);

      /* the min-height chain, walked UP — never queried by class (see the head note) */
      let el: HTMLElement | null = grid;
      const chain: Record<string, number> = {};
      while (el && el !== document.body) {
        const cls = (el.className || "").toString();
        if (/\b(tpl-body|tpl-cols|wpg-scroll|cal-layout|cal-main)\b/.test(cls)) {
          chain[cls.split(/\s+/).find((c) => /^(tpl-body|tpl-cols|wpg-scroll|cal-layout|cal-main)$/.test(c))!] =
            el.getBoundingClientRect().height;
        }
        el = el.parentElement;
      }

      const todayNum = document.querySelector(".cal-cell.today .cal-dn") as HTMLElement | null;
      /* ⚠️ COMPARE LIKE WITH LIKE. `querySelector(".cal-cell.past")` returns 27 JULY — which is
         also `.off`, so it legitimately paints the adjacent-month ground and the reading says
         nothing about the wash. The honest question is whether `.past` ADDS anything, so take a
         past and a future cell that are otherwise identical (same weekday column, neither
         adjacent-month) and compare their grounds. */
      const plain = (c: HTMLElement) => !c.classList.contains("off");
      const weekdayCol = (c: HTMLElement) => {
        const i = Array.from(c.parentElement!.children).indexOf(c);
        return (i - 7) % 7; /* 0..6, the DOW row occupying 0..6 */
      };
      const pastPlain = cells.filter((c) => c.classList.contains("past") && plain(c));
      const futurePlain = cells.filter((c) => !c.classList.contains("past") && plain(c));
      const pastCell = pastPlain[pastPlain.length - 1] ?? null;
      const pastTwin = pastCell
        ? futurePlain.find((c) => weekdayCol(c) === weekdayCol(pastCell)) ?? null
        : null;
      const weekendCell = document.querySelector(".cal-cell:nth-child(7n + 6)") as HTMLElement | null;
      const rec = document.querySelector(".cal-recbtn") as HTMLElement | null;
      const panel = document.querySelector(".cal-focus") as HTMLElement | null;
      const dow = document.querySelector(".cal-dow") as HTMLElement | null;

      return {
        populated, chain,
        gridRadius: getComputedStyle(grid).borderRadius,
        gridOverflow: getComputedStyle(grid).overflow,
        gridGap: getComputedStyle(grid).gap,
        dowBg: dow ? getComputedStyle(dow).backgroundImage : "",
        dowColor: dow ? getComputedStyle(dow).color : "",
        todayBg: todayNum ? getComputedStyle(todayNum).backgroundColor : null,
        todayCellBorderTop: document.querySelector(".cal-cell.today")
          ? getComputedStyle(document.querySelector(".cal-cell.today") as HTMLElement).borderTopWidth : null,
        pastBg: pastCell ? getComputedStyle(pastCell).backgroundColor : null,
        pastTwinBg: pastTwin ? getComputedStyle(pastTwin).backgroundColor : null,
        pastNumeral: pastCell ? getComputedStyle(pastCell.querySelector(".cal-dn") as HTMLElement).color : null,
        weekendBg: weekendCell ? getComputedStyle(weekendCell).backgroundColor : null,
        recBox: rec ? { w: rec.getBoundingClientRect().width, h: rec.getBoundingClientRect().height,
                        scrollW: rec.scrollWidth, clientW: rec.clientWidth,
                        ws: getComputedStyle(rec).whiteSpace } : null,
        panelW: panel ? Math.round(panel.getBoundingClientRect().width) : null,
        panelH: panel ? Math.round(panel.getBoundingClientRect().height) : null,
        countLine: document.querySelector(".cal-fpcount")?.textContent ?? null,
      };
    });

    const at = `@${width}`;

    /* ── the fold ─────────────────────────────────────────────────────────────────────────── */
    expect(r.populated.length, `${at} no populated cells to check`).toBeGreaterThan(0);
    for (const c of r.populated) {
      expect(c.shown, `${at} day ${c.day} shows no pip`).toBeGreaterThan(0);
      expect(c.clipped, `${at} day ${c.day} has a clipped pip`).toBe(false);
      expect(c.overflowing, `${at} day ${c.day} overflows its cell`).toBe(false);
      expect(c.minPipH!, `${at} day ${c.day} has a squashed pip`).toBeGreaterThan(15);
      /* the counter appears IFF something is hidden */
      expect(c.hasMore, `${at} day ${c.day}: ${c.shown} of ${c.total} shown, counter=${c.hasMore}`)
        .toBe(c.shown < c.total);
    }

    /* ── the chain is not collapsed ───────────────────────────────────────────────────────── */
    for (const [name, h] of Object.entries(r.chain)) {
      expect(h, `${at} ${name} is ${h}px`).toBeGreaterThan(0);
    }

    /* ── the chassis ──────────────────────────────────────────────────────────────────────── */
    expect(r.gridGap, `${at} the grid still has a gap`).toBe("0px");
    expect(r.gridRadius).toBe("14px");
    expect(r.gridOverflow).toBe("hidden");
    expect(r.dowBg, `${at} the weekday band has no gradient`).toContain("linear-gradient");
    expect(r.dowColor).toBe("rgb(90, 110, 88)");

    /* ── today, and the wash ──────────────────────────────────────────────────────────────── */
    expect(r.todayBg, `${at} today's disc`).toBe("rgb(124, 58, 42)");
    expect(r.todayCellBorderTop, `${at} today still draws a box`).toBe("0px");
    /* ⚠️ NO WASH: a past cell paints exactly what its future twin in the same column paints. */
    expect(r.pastTwinBg, `${at} no comparable future cell found`).not.toBeNull();
    expect(r.pastBg, `${at} past days carry a wash their future twin does not`).toBe(r.pastTwinBg);
    /* the past says so with a muted numeral instead */
    expect(r.pastNumeral, `${at} the past numeral is not muted`).toBe("rgb(195, 179, 164)");

    /* ── the command bar ──────────────────────────────────────────────────────────────────── */
    expect(r.recBox!.ws).toBe("nowrap");
    expect(r.recBox!.h, `${at} the record chip is ${r.recBox!.h}px tall — wrapped?`).toBeLessThan(40);
    expect(r.recBox!.w, `${at} the record chip is ${r.recBox!.w}px wide`).toBeGreaterThan(60);
    expect(r.recBox!.scrollW, `${at} the record chip's content is clipped`)
      .toBeLessThanOrEqual(r.recBox!.clientW + 1);

    /* ── the panel ────────────────────────────────────────────────────────────────────────── */
    expect(r.panelW, `${at} the panel is off its track`).toBe(370);
    expect(r.panelH!, `${at} the panel has no height`).toBeGreaterThan(400);
    expect(r.countLine, `${at} the count line is missing`).toMatch(/\d+ ITEMS?/);

    console.log(`${at} OK — ${r.populated.length} populated cells, panel ${r.panelW}×${r.panelH}, count "${r.countLine}"`);
  }

  /* ── the 1080 collapse ──────────────────────────────────────────────────────────────────── */
  await openRoute(page, ROUTE, { width: 1000, height: 900 });
  const c = await page.evaluate(() => {
    const l = document.querySelector(".cal-layout") as HTMLElement;
    const f = document.querySelector(".cal-focus") as HTMLElement;
    const fr = f.getBoundingClientRect();
    return {
      cols: getComputedStyle(l).gridTemplateColumns.split(" ").length,
      panelW: Math.round(fr.width), panelH: Math.round(fr.height),
      gridH: Math.round((document.querySelector(".cal-grid") as HTMLElement).getBoundingClientRect().height),
    };
  });
  expect(c.cols, "the 1080 collapse did not engage").toBe(1);
  expect(c.panelH, "the panel vanished in the collapsed layout").toBeGreaterThan(100);
  expect(c.gridH, "the month crushed in the collapsed layout").toBeGreaterThanOrEqual(400);
  console.log(`@1000 OK — one column, grid ${c.gridH}px, panel ${c.panelW}×${c.panelH}`);
});
