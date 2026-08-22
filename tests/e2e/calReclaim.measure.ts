/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * calReclaim — the cell's own budget, measured on the CORRECTED chassis (reclaim pack, Phase 0).
 *
 * ⚠️ THE CHASSIS FIX DID NOT CAUSE THIS; IT REVEALED IT. `.ws-main` had claimed `height: 100vh`
 * from an origin 41.75px down the viewport, so the calendar had been drawing into 42px that did
 * not exist. With that removed the row is honestly 7px shorter, and the cell no longer affords the
 * two pills plus a counter that `CAL_CELL_FLOOR = 2` guarantees.
 *
 * ⚠️ SO THIS MEASURES THE BUDGET, NOT THE SYMPTOM. Every term that spends the cell's height is
 * reported separately — padding, the numeral row, the numeral's own line box, the today-disc, the
 * pill including its margin, the counter including its padding — because the question is which of
 * them is slack and which is load-bearing. The today-disc in particular may set the floor on the
 * numeral row, and that is measured rather than assumed.
 *
 * ⚠️ AND IT WALKS FROM A CELL, NEVER QUERYING BY CLASS ACROSS THE DOCUMENT. Every workspace page
 * stays mounted; a bare `querySelector` can return a hidden page's zero-sized copy, which has
 * already produced one false finding and one unclickable-button hunt in this repo.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/calendar";
const WIDTHS = [1000, 1280, 1440, 1920];

/** The cell's budget at one width — every term that spends height, measured. */
export async function cellBudget(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const px = (n: number) => Math.round(n * 100) / 100;
    const grid = document.querySelector(".cal-grid") as HTMLElement | null;
    if (!grid) return null;
    const dow = grid.firstElementChild as HTMLElement;
    const cells = Array.from(grid.querySelectorAll(".cal-cell")) as HTMLElement[];

    /* a populated cell tells us what a real stack costs; an empty one tells us the chrome */
    const populated = cells.filter((c) => c.querySelectorAll(".cal-pip").length > 0);
    const sample = populated[0] ?? cells[8];
    const cs = getComputedStyle(sample);
    const d = sample.querySelector(".cal-d") as HTMLElement | null;
    const dn = sample.querySelector(".cal-dn") as HTMLElement | null;
    const pip = sample.querySelector(".cal-pip") as HTMLElement | null;
    const more = document.querySelector(".cal-cell .cal-more2") as HTMLElement | null;

    /* ⚠️ THE TODAY-DISC MAY SET THE FLOOR — measure it rather than assume the numeral row is slack */
    const todayDn = document.querySelector(".cal-cell.today .cal-dn") as HTMLElement | null;
    const tdCs = todayDn ? getComputedStyle(todayDn) : null;

    const pipCs = pip ? getComputedStyle(pip) : null;
    const moreCs = more ? getComputedStyle(more) : null;
    const pipFlow = pip && pipCs
      ? px(pip.getBoundingClientRect().height + parseFloat(pipCs.marginTop)) : 0;
    const moreH = more ? px(more.getBoundingClientRect().height) : 0;

    const padT = parseFloat(cs.paddingTop), padB = parseFloat(cs.paddingBottom);
    const dH = d ? px(d.getBoundingClientRect().height) : 0;
    const avail = px(sample.clientHeight - padT - padB - dH);
    const need2 = px(2 * pipFlow + moreH);

    return {
      vh: window.innerHeight,
      rowPx: px((grid.clientHeight - dow.offsetHeight) / 6),
      gridH: grid.clientHeight, dowH: dow.offsetHeight,
      cellH: sample.clientHeight,
      padT, padB,
      calD: dH,
      numeralBox: dn ? { h: px(dn.getBoundingClientRect().height), w: px(dn.getBoundingClientRect().width),
                         line: getComputedStyle(dn).lineHeight, font: getComputedStyle(dn).fontSize } : null,
      todayDisc: todayDn && tdCs
        ? { h: px(todayDn.getBoundingClientRect().height), w: px(todayDn.getBoundingClientRect().width),
            radius: tdCs.borderRadius, bg: tdCs.backgroundColor } : null,
      pipFlow, pipH: pip ? px(pip.getBoundingClientRect().height) : 0,
      pipMargin: pipCs ? pipCs.marginTop : null,
      moreH, morePad: moreCs ? moreCs.padding : null,
      avail, need2, cushion: px(avail - need2),
      /* the symptom, per named day */
      overflowing: cells
        .map((c) => ({
          day: (c.querySelector(".cal-dn")?.textContent ?? "").trim(),
          pips: c.querySelectorAll(".cal-pip").length,
          more: !!c.querySelector(".cal-more2"),
          sh: c.scrollHeight, ch: c.clientHeight,
          over: c.scrollHeight > c.clientHeight + 1,
        }))
        .filter((c) => c.pips > 0),
    };
  });
}

test("calendar — the cell's budget on the corrected chassis", async ({ page }) => {
  const lines: string[] = [];
  for (const width of WIDTHS) {
    await openRoute(page, ROUTE, { width, height: 900 });
    const b = await cellBudget(page);
    expect(b, `@${width}: no grid`).not.toBeNull();
    const r = b!;
    lines.push(`\n──────── ${width} × 900 ────────`);
    lines.push(`  grid ${r.gridH} · DOW ${r.dowH} · rowPx ${r.rowPx} · cell clientH ${r.cellH}`);
    lines.push(`  cell padding      ${r.padT} / ${r.padB}   (${r.padT + r.padB}px of the budget)`);
    lines.push(`  .cal-d row        ${r.calD}px   numeral box ${JSON.stringify(r.numeralBox)}`);
    lines.push(`  today-disc        ${JSON.stringify(r.todayDisc)}`);
    lines.push(`  pill              ${r.pipH} + margin ${r.pipMargin} = ${r.pipFlow} flow`);
    lines.push(`  counter           ${r.moreH}  (padding ${r.morePad})`);
    lines.push(`  AVAILABLE ${r.avail}  ·  2 pills + counter NEEDS ${r.need2}  ·  CUSHION ${r.cushion}`);
    const bad = r.overflowing.filter((c) => c.over);
    lines.push(`  overflowing cells: ${bad.length ? bad.map((c) => `day ${c.day} (${c.sh}/${c.ch})`).join(", ") : "none"}`);
  }
  console.log(lines.join("\n"));
});
