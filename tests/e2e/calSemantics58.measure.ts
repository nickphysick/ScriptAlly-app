import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * v58 SEMANTICS: the chip goes imperative only once the writer-owed date has passed, an overdue
 * wait ends at today, and the action cap stands on its own date.
 */
const DEEDS = ["Send the partial", "Send the full", "Send the revision", "Answer them", "Nudge due"];

const read = (page: import("@playwright/test").Page) => page.evaluate(`(() => {
  const vis = (e) => e.getBoundingClientRect().width > 0;
  const lane = [...document.querySelectorAll(".tl-rrow .tl-c-tl")].find(vis);
  const lb = lane ? lane.getBoundingClientRect() : null;
  const caps = [...document.querySelectorAll(".tl-cap")].filter(vis);
  const cards = [...document.querySelectorAll(".tl-p")].filter(vis);
  const rows = [...document.querySelectorAll(".tl-rrow")].filter((r) => r.getBoundingClientRect().height > 0);
  return {
    laneW: lb ? lb.width : 0, laneX: lb ? lb.left : 0,
    cards: cards.map((c) => {
      const ch = c.querySelector(".tl-fchip");
      const b = c.getBoundingClientRect();
      return {
        rel: c.dataset.rel || "", chip: ch ? (ch.textContent || "").trim() : "",
        owed: c.classList.contains("owed"),
        days: Number(c.dataset.days || "0"),
        rightPct: lb ? ((b.right - lb.left) / lb.width) * 100 : 0,
        hasCap: caps.some((x) => x.dataset.caprel === c.dataset.rel),
        hasMark: !!c.querySelector(".tl-tmark"),
      };
    }),
    caps: caps.map((c) => {
      const b = c.getBoundingClientRect();
      return { rel: c.dataset.caprel || "", centre: b.left + b.width / 2,
        left: b.left, right: b.right, w: b.width };
    }),
    stripRows: rows.filter((r) => r.classList.contains("owes")).length,
    owedRows: rows.filter((r) => [...r.querySelectorAll(".tl-p")]
      .some((c) => c.classList.contains("owed"))).length,
  };
})()`) as Promise<any>;

test("the chip is imperative exactly when the writer's date has passed", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  let imperative = 0, standing = 0;
  const wrong: string[] = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const r = await read(page);
    for (const c of r.cards) {
      const imp = DEEDS.indexOf(c.chip) >= 0;
      if (imp) imperative += 1; else standing += 1;
      if (imp !== c.owed) wrong.push(`${c.rel}: chip "${c.chip}" but owed=${c.owed}`);
    }
  }
  console.log(`chips across the sweep — imperative ${imperative} · standing ${standing}`);
  /* ⚠️ BOTH SIDES, OR THE BICONDITIONAL IS HALF-TESTED. A board with no standing chip cannot show
     that a date still ahead keeps its status word, which is the half this pack came to fix. */
  expect(imperative, "no imperative chip on the board, so that half was not tested").toBeGreaterThan(2);
  expect(standing, "no standing chip on the board, so that half was not tested").toBeGreaterThan(2);
  expect(wrong, "a chip's mood disagrees with whether the writer's date has passed").toEqual([]);
});

test("⚠️ an overdue wait ends at today, with no mark and no cap", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  let owed = 0;
  const past: string[] = [], furnished: string[] = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const r = await read(page);
    for (const c of r.cards.filter((x: any) => x.owed)) {
      owed += 1;
      /* today is the lane's own centre in every range */
      if (c.rightPct > 51) past.push(`${c.rel} ends at ${c.rightPct.toFixed(1)}% of the lane`);
      if (c.hasCap || c.hasMark) furnished.push(`${c.rel} cap=${c.hasCap} mark=${c.hasMark}`);
    }
  }
  console.log(`overdue cards across the sweep: ${owed}`);
  expect(owed, "no overdue card, so the rule was not tested").toBeGreaterThan(3);
  expect(past, "an overdue wait runs past today").toEqual([]);
  expect(furnished, "an overdue wait carries a terminal mark or an action cap").toEqual([]);
});

test("⚠️ every cap stands on its own date, inside the lane", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  await setRangeTo(page, 1);
  await page.waitForTimeout(500);
  const r = await read(page);
  console.log(`caps ${r.caps.length} across a ${Math.round(r.laneW)}px lane`);
  /* ⚠️ POPULATION FIRST — every cap sitting at the lane's left edge is exactly what a board with
     no caps looks like to a check that only reads the ones it finds. */
  expect(r.caps.length, "no cap renders, so placement was not tested").toBeGreaterThan(2);
  /**
   * ⚠️ THE CAP'S CENTRE IS ITS CARD'S END EDGE, TO THE PIXEL.
   *
   * A cap names the deed that becomes available on the day its card ends, and it is centred on
   * that day — so the two coincide exactly. Anything looser fails to catch the fault this replaces:
   * with every cap pinned to the lane's left edge they still had TWO distinct centres (their widths
   * differ), so "they are not all in one place" passed over a board where none was on its date.
   * A distinctness check is not a placement check.
   */
  /* ⚠️ A CARD CAN BE SEVERAL PIECES, AND THEY ALL SHARE ONE `data-rel`. Taking "the card" as the
     first match compares the cap against whichever piece happened to come first in the DOM — a
     true reading of the wrong subject, and it reported every cap as 362.6px off its date. The
     card's END is the furthest right edge among its pieces. */
  const byRel = new Map<string, any>();
  for (const c of r.cards as any[]) {
    const prev = byRel.get(c.rel);
    if (!prev || c.rightPct > prev.rightPct) byRel.set(c.rel, c);
  }
  const centres = r.caps.map((c: any) => Math.round(c.centre - r.laneX));
  console.log(`  cap centres in the lane: ${centres.join(", ")}`);
  const offDate = r.caps.map((c: any) => {
    const card = byRel.get(c.rel);
    if (!card) return null;
    const endX = r.laneX + (card.rightPct / 100) * r.laneW;
    const d = Math.abs(c.centre - endX);
    return d > 1 ? `${c.rel}: cap centre ${Math.round(c.centre - r.laneX)}, card end ${Math.round(endX - r.laneX)} (off by ${d.toFixed(1)}px)` : null;
  }).filter(Boolean);
  expect(offDate, "a cap is not centred on the date its card ends").toEqual([]);
  const outside = r.caps.filter((c: any) => c.left < r.laneX - 0.5 || c.right > r.laneX + r.laneW + 0.5);
  expect(outside.map((c: any) => c.rel), "a cap is drawn outside the lane").toEqual([]);
});

test("the owed strip is on owed rows and no others", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const r = await read(page);
  console.log(`rows with the owed strip ${r.stripRows} · rows holding an overdue card ${r.owedRows}`);
  expect(r.owedRows, "no overdue row, so the strip rule was not tested").toBeGreaterThan(0);
  expect(r.stripRows, "the strip count does not match the overdue-row count").toBe(r.owedRows);
});
