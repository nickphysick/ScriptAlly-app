/**
 * THE ACCEPTANCE MATRIX — every in-scope page, both viewports, on the deployed dev build.
 *
 * ⚠️ CROSS-PAGE EQUALITY, NOT CONSTANTS. The standard is "identical to every other page", so the
 * run collects each page's readings and compares them to each other at the end. A constant would
 * pass while all ten drifted together.
 *
 * ⚠️ A WHEEL GESTURE, NOT A `scrollTop` WRITE. A write moves the element you chose; a wheel moves
 * whatever the browser decides is under the pointer, which is the only thing that catches a
 * handler attached to the wrong element.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

const SCROLLING: [string, string][] = [
  /* ⚠️ THE QUERY CENTRE IS IN THE LIST, and it was missing from the first version — the one page
     the same run had just converted. A matrix that omits the page you changed is the "all six
     headers identical" report all over again. */
  ["Query Centre", "/queries"],
  ["Contact list", "/agents"],
  ["Discover", "/agents/discover"],
  ["Manuscripts", "/manuscripts"],
  ["Submission packages", "/manuscripts/packages"],
  ["Analytics", "/queries/analytics"],
  ["To-do", "/todo"],
  ["Calendar", "/todo/calendar"],
  ["Noteboard", "/todo/noteboard"],
  ["Comparable titles", "/manuscripts/comps"],
];

const readHeaderState = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const row = g.querySelector(".wpg-plate") as HTMLElement;
  const wsh = g.querySelector(".wsh") as HTMLElement;
  const inner = g.querySelector(".wsh-row") as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const mark = g.querySelector(".wsh-mark") as HTMLElement | null;
  const title = g.querySelector(".wsh-title") as HTMLElement | null;
  const W = document.documentElement.clientWidth;
  const hb = wsh.getBoundingClientRect(), rb = row.getBoundingClientRect(), sb = sc.getBoundingClientRect();
  const hc = hb.top + hb.height / 2;
  return {
    working: row.classList.contains("wpg-plate--working"),
    rowH: r(rb.height), headerH: r(hb.height),
    /* ⚠️ THE STRIP'S DISTANCE FROM THE WINDOW'S TOP EDGE — the last place a page could still
       disagree about the header, and it did: five different page insets above the grid put this
       at 87.3, 98.3, 101.3, 103.3 and 109.3 while every reading INSIDE the strip matched. */
    headerTop: r(hb.top),
    /* every control in the strip, whatever class it wears */
    btnH: [...new Set([...inner.querySelectorAll("button, a[role='button'], [class*='btn'], [class*='chip']")]
      .filter((el) => el.getBoundingClientRect().height > 0)
      .map((el) => r(el.getBoundingClientRect().height)))].sort((x, y) => x - y),
    /* anything inline with the title — PRO pills, badges — by font size */
    pillFs: [...new Set((title ? [...title.querySelectorAll("*")] : [])
      .filter((el) => el.getBoundingClientRect().height > 0)
      .map((el) => getComputedStyle(el).fontSize))],
    titlePx: title ? getComputedStyle(title).fontSize : "—",
    markW: mark ? r(mark.getBoundingClientRect().width) : -1,
    offCentre: [...inner.children].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.height > 0 && Math.abs(b.top + b.height / 2 - hc) > 0.5;
    }).map((el) => el.className),
    headerL: r(hb.left), headerR: r(W - hb.right),
    scrollL: r(sb.left), scrollR: r(W - sb.right),
    hairL: r(rb.left + parseFloat(getComputedStyle(row, "::after").left || "0")),
    hairR: r(W - (rb.right - parseFloat(getComputedStyle(row, "::after").right || "0"))),
    overflow: sc.scrollHeight - sc.clientHeight,
    /* does anything below the chrome scroll at all? an internal-pane page says yes here */
    innerScrolls: [...g.querySelectorAll("*")].some((el) => {
      const e = el as HTMLElement;
      const oy = getComputedStyle(e).overflowY;
      return (oy === "auto" || oy === "scroll") && e.scrollHeight - e.clientHeight > 2;
    }),
    scrollTop: r(sc.scrollTop),
    gutter: getComputedStyle(document.documentElement).getPropertyValue("--content-gutter").trim(),
    inset: getComputedStyle(document.documentElement).getPropertyValue("--header-inset").trim(),
  };
});

/** a genuine wheel over the content — not a scrollTop write */
async function wheelOverContent(page: Page) {
  /* ⚠️ THE VISIBLE SCROLLER, NOT `.first()`. Every page stays mounted, so the first `.wpg-scroll`
     in the document belongs to whichever slot renders earliest — a hidden one, whose box is empty,
     so the wheel went nowhere and every page reported `wheelWorked: false`. */
  const handle = page.locator(".wpg-scroll").filter({ has: page.locator(":scope") });
  const n = await handle.count();
  let box: { x: number; y: number; width: number; height: number } | null = null;
  for (let i = 0; i < n; i += 1) {
    const b = await handle.nth(i).boundingBox();
    if (b && b.height > 0 && b.width > 0) { box = b; break; }
  }
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(400);
}

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`MATRIX ${vp.width}x${vp.height}`, async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    let sbw = -1;
    for (const [label, route] of SCROLLING) {
      await openRoute(page, route, vp);
      if (sbw < 0) sbw = await scrollbarWidth(page);
      const rest = await readHeaderState(page);
      if (!rest) { rows.push({ page: label, ERROR: "no visible .wpg" }); continue; }
      await wheelOverContent(page);
      const work = await readHeaderState(page);
      // back to the top
      await page.evaluate(() => { const g=[...document.querySelectorAll(".wpg")].find(x=>x.getBoundingClientRect().height>0)!; (g.querySelector(".wpg-scroll") as HTMLElement).scrollTop = 0; });
      await page.waitForTimeout(300);
      const back = await readHeaderState(page);
      rows.push({
        page: label, canScroll: rest.overflow > 0,
        restH: rest.rowH, restTitle: rest.titlePx, restMark: rest.markW,
        restHdrL: rest.headerL, restHdrR: rest.headerR,
        wheelWorked: work!.scrollTop > 2, workedStrip: work!.working,
        workH: work!.rowH, workTitle: work!.titlePx, workMark: work!.markW,
        workHdrL: work!.headerL, workHdrR: work!.headerR,
        hairL: work!.hairL, hairR: work!.hairR,
        restTop: rest.headerTop, workTop: work!.headerTop,
        restCardH: rest.headerH, workCardH: work!.headerH,
        restBtn: rest.btnH.join("|") || "—", workBtn: work!.btnH.join("|") || "—",
        restPill: rest.pillFs.join("|") || "—", workPill: work!.pillFs.join("|") || "—",
        backToRest: !back!.working,
        offCentre: rest.offCentre.length + work!.offCentre.length,
        overflowRest: rest.overflow, overflowWork: work!.overflow,
        innerScrolls: rest.innerScrolls,
      });
    }
    console.log(`\n══ MATRIX ${vp.width}x${vp.height} · scrollbar ${sbw}px (${sbw >= 10 ? "CLASSIC" : "OVERLAY"})`);
    console.table(rows);
    /* ⚠️ GEOMETRY IS ASSERTED OVER *EVERY* PAGE; BEHAVIOUR ONLY OVER THE ONES THAT SCROLL. The
       first version compared everything across `scrollers` alone, which quietly excused any page
       whose content happened not to overflow — including the three Tasks pages, whose viewport
       lock means they never scroll BY DESIGN (§4). Their headers must still be the same object as
       everyone else's, and that is now checked. */
    const all = rows.filter((r) => !r.ERROR);
    const scrollers = all.filter((r) => r.canScroll);
    /* ⚠️ COMPARE LIKE WITH LIKE ON THE TITLE. "No description → the title steps up" is a stated
       rule, so a page that passes none renders 35px rather than 33 by design. Grouping by that is
       not a weakening: every other reading must still be identical across ALL pages, and within
       each title group the sizes must agree. */
    for (const key of ["restH", "restHdrL", "restHdrR"] as const) {
      const vals = [...new Set(all.map((r) => String(r[key])))];
      expect(vals, `${key} differs across pages: ${JSON.stringify(all.map((r) => [r.page, r[key]]))}`).toHaveLength(1);
    }
    for (const key of ["workH", "workMark", "workHdrL", "workHdrR", "hairL", "hairR"] as const) {
      const vals = [...new Set(scrollers.map((r) => String(r[key])))];
      expect(vals, `${key} differs across pages: ${JSON.stringify(scrollers.map((r) => [r.page, r[key]]))}`).toHaveLength(1);
    }
    /* ⚠️ THE MARK HAS TWO LEGITIMATE SIZES AND NEITHER IS A PAGE'S CHOICE, exactly like the title.
       `markHasArt` is a RULE: artwork present → 64px and bare, absent → the 38px monoline glyph on
       its plate, decided by whether the drawing exists rather than by a prop. Two of the nine marks
       are drawn today, so two pages read 64 — and as artwork lands, more will, with no call site
       edited. What must be identical is the WORKING mark, and `workMark` above asserts all nine
       collapse to the same 30. */
    for (const w of [...new Set(all.map((r) => r.restMark))]) {
      expect([38, 64], `an unexpected rest mark ${w} — only the 38px glyph and the 64px illustration are legitimate`).toContain(w);
    }

    /* ══ §1 — THE STRIP IS THE SAME OBJECT ON EVERY PAGE ══════════════════════════════════════
       ⚠️ THE HEIGHT IS THE TOKEN, NEVER THE CONTENT. 96 at rest on every page including the
       title-only ones — a page with no description centres its title in the same 96 rather than
       shrinking the card — and 52 working on every page that has a working state. */
    for (const r of all) {
      expect(r.restCardH, `${r.page}: the resting card is not 96 — its height is following its content`).toBe(96);
    }
    for (const r of scrollers) {
      expect(r.workCardH, `${r.page}: the working strip is not 52`).toBe(52);
    }
    /* ⚠️ AND IT SITS AT THE SAME PLACE ON THE PAGE. Cross-page equality in BOTH states — a page
       inset above the grid moves the strip without changing anything measurable inside it. */
    const topSame = (key: "restTop" | "workTop", set: typeof all) => {
      const vals = [...new Set(set.map((x) => String(x[key])))];
      expect(vals, `${key} differs across pages — a page-level inset above the grid: ${JSON.stringify(set.map((x) => [x.page, x[key]]))}`).toHaveLength(1);
    };
    topSame("restTop", all);
    /* ⚠️ THE WORKING TOP IS COMPARED ACROSS THE SCROLLERS ONLY, and that is not a weakening. A
       page with no working state reports its RESTING position under `workTop`, which is 18px
       lower by construction — the plate gap the strip gives back when it condenses. Comparing all
       ten flagged a split of exactly 87.3 / 69.3, i.e. exactly `--wsh-plate-gap`, which is the
       mechanism working rather than a page disagreeing. `restTop` is still checked across all ten,
       and that is the reading a page inset actually moves. */
    topSame("workTop", scrollers);
    /* ⚠️ EVERY CONTROL IN THE STRIP IS 30px WORKING, whatever class its page gave it. `.pkgw-btn`
       measured 30 here for a whole pass while being a second implementation that had simply been
       written its own working height — the check is the value, the fix was removing the copy. */
    for (const r of scrollers.filter((x) => x.workBtn !== "—")) {
      expect(r.workBtn, `${r.page}: a control in the working strip is not 30px`).toBe("30");
    }
    for (const r of all.filter((x) => x.restBtn !== "—")) {
      expect(r.restBtn, `${r.page}: a control in the resting strip is not 38px`).toBe("38");
    }
    /* ⚠️ NOTHING INLINE WITH THE TITLE KEEPS ITS REST SIZE. Discover's PRO pill held 8.5px in both
       states — it had never been written a scrolled rule, and nothing said one was missing. */
    for (const r of scrollers.filter((x) => x.restPill !== "—")) {
      expect(r.workPill, `${r.page}: something inline with the title kept its resting size through the collapse`).not.toBe(r.restPill);
    }
    const pills = [...new Set(scrollers.filter((x) => x.workPill !== "—").map((x) => String(x.workPill)))];
    expect(pills.length, `pills scale to different sizes across pages: ${JSON.stringify(scrollers.map((x) => [x.page, x.workPill]))}`).toBeLessThan(2);

    /* ⚠️ THE TASKS VIEWPORT LOCK: the frame is a window and NEVER scrolls — all scrolling belongs
       to the internal `.tpl-zone`s. It leaked once: `.tpl-cols` says `flex: 1; min-height: 0`,
       written when its parent was a flex column, and under the grid its parent was a plain block —
       so it sized to content and stacked a second scroller outside the zone that owns them. */
    for (const r of all.filter((x) => ["To-do", "Calendar", "Noteboard"].includes(String(x.page)))) {
      expect(r.overflowRest, `${r.page}: the Tasks frame scrolled — the viewport lock has leaked and there are now two scrollers`).toBe(0);
      expect(r.workedStrip, `${r.page}: an internal-pane page stripped — it has no scroll of its own to strip on`).toBe(false);
    }
    for (const size of [...new Set(all.map((r) => r.restTitle))]) {
      expect([33, 35], `an unexpected rest title size ${size} — only the 33px default and the 35px solo step are legitimate`)
        .toContain(parseInt(String(size), 10));
    }
    expect([...new Set(scrollers.map((r) => String(r.workTitle)))],
      `the WORKING title differs across pages — the solo step applies at rest only: ${JSON.stringify(scrollers.map((r) => [r.page, r.workTitle]))}`)
      .toHaveLength(1);
    for (const r of scrollers) {
      expect(r.wheelWorked, `${r.page}: the wheel did not move .wpg-scroll — the handler may be on the wrong element`).toBe(true);
      expect(r.workedStrip, `${r.page}: scrolled but did not strip`).toBe(true);
      expect(r.backToRest, `${r.page}: did not return to the resting card at the top`).toBe(true);
      expect(r.overflowWork, `${r.page}: stripping changed max scroll — the invariance padding is not working`).toBe(r.overflowRest);
      expect(r.offCentre, `${r.page}: children off the header's centre`).toBe(0);
    }
  });
}
