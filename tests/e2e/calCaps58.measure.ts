import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * v58 ACTION CAPS AND TERMINAL MARKS.
 *
 * A card that ends on a dated future moment inside the window carries a mark on its end edge and a
 * cap centred on that date naming the deed. A card that runs to today — still running, or overdue —
 * carries neither, because today is not a dated future moment.
 */
const census = (page: import("@playwright/test").Page) => page.evaluate(`(() => {
  const vis = (e) => e.getBoundingClientRect().width > 0;
  const caps = [...document.querySelectorAll(".tl-cap")].filter(vis);
  const marks = [...document.querySelectorAll(".tl-tmark")].filter(vis);
  const cards = [...document.querySelectorAll(".tl-p")].filter(vis);
  const lane = [...document.querySelectorAll(".tl-c-tl")].filter(vis)[0];
  const lb = lane ? lane.getBoundingClientRect() : null;
  const capRels = caps.map((c) => c.dataset.caprel || "").sort();
  const markRels = marks.map((m) => m.dataset.caprel || "").sort();
  const words = {}, srcs = {};
  const outside = [];
  for (const c of caps) {
    const w = (c.textContent || "").trim();
    words[w] = (words[w] || 0) + 1;
    srcs[c.dataset.cap || "?"] = (srcs[c.dataset.cap || "?"] || 0) + 1;
    if (lb) {
      const b = c.getBoundingClientRect();
      if (b.left < lb.left - 0.5 || b.right > lb.right + 0.5) {
        outside.push((c.dataset.caprel || "") + " " + Math.round(b.left) + ".." + Math.round(b.right));
      }
    }
  }
  /* a card with no future named end: it runs to today, or it is overdue, or it is closed */
  const running = cards.filter((c) => {
    const ne = c.dataset.namedend;
    return ne === undefined || ne === "" || ne === "none";
  }).map((c) => c.dataset.rel || "");
  const runningWithCap = running.filter((r) => capRels.indexOf(r) >= 0);
  const runningWithMark = running.filter((r) => markRels.indexOf(r) >= 0);
  /* duplicates: exactly one cap and one mark per relationship that has them */
  const dupCap = capRels.filter((r, i) => capRels.indexOf(r) !== i);
  const dupMark = markRels.filter((r, i) => markRels.indexOf(r) !== i);
  return {
    cards: cards.length, caps: caps.length, marks: marks.length,
    words: words, srcs: srcs, outside: outside,
    capOnly: capRels.filter((r) => markRels.indexOf(r) < 0),
    markOnly: markRels.filter((r) => capRels.indexOf(r) < 0),
    dupCap: dupCap, dupMark: dupMark,
    running: running.length, runningWithCap: runningWithCap, runningWithMark: runningWithMark,
  };
})()`) as Promise<any>;

test("a cap and a mark travel as a pair — exactly one each, or neither", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const seen: string[] = [];
  const allSrcs: Record<string, number> = {};
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const c = await census(page);
    seen.push(`${RANGE_LABELS[i]}: ${c.caps} caps / ${c.marks} marks of ${c.cards} cards`);
    for (const k of Object.keys(c.srcs)) allSrcs[k] = (allSrcs[k] ?? 0) + c.srcs[k];

    /* ⚠️ POPULATION FIRST. "no card wears a cap without a mark" is satisfied by a board with no
       caps at all — which is what this board had before the caps existed. */
    expect(c.caps, `[${RANGE_LABELS[i]}] no cap renders, so the pairing was not tested`)
      .toBeGreaterThan(0);
    expect(c.capOnly, `[${RANGE_LABELS[i]}] a cap with no terminal mark`).toEqual([]);
    expect(c.markOnly, `[${RANGE_LABELS[i]}] a terminal mark with no cap`).toEqual([]);
    expect(c.dupCap, `[${RANGE_LABELS[i]}] two caps on one relationship`).toEqual([]);
    expect(c.dupMark, `[${RANGE_LABELS[i]}] two marks on one relationship`).toEqual([]);
    /* ⚠️ AND THE CAP STAYS INSIDE THE WINDOW — the ref clamps it, and a cap outside the lane names
       a day the board is not showing. */
    expect(c.outside, `[${RANGE_LABELS[i]}] a cap is drawn outside the lane`).toEqual([]);
  }
  console.log(seen.join(" · "));
  console.log(`cap kinds across the sweep: ${JSON.stringify(allSrcs)}`);
  /* ⚠️ THE CENSUS IS PRINTED SO A MONOCULTURE IS VISIBLE. `sendBy` — a writer's own deadline —
     is UNEXERCISED on this fixture: the one row that carries a future send-by also carries a close
     event in its history, and a card past a closure correctly draws neither cap nor mark. Stated
     rather than glossed: two of the three cap kinds are proved here, and the third is not. */
  expect(allSrcs.window ?? 0, "no agency-window cap, so that kind is untested").toBeGreaterThan(0);
  expect(allSrcs.reminder ?? 0, "no reminder cap, so that kind is untested").toBeGreaterThan(0);
});

test("⚠️ a card that runs to today carries neither cap nor mark", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  let running = 0;
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const c = await census(page);
    running += c.running;
    expect(c.runningWithCap, `[${RANGE_LABELS[i]}] a card with no future end carries a cap`).toEqual([]);
    expect(c.runningWithMark, `[${RANGE_LABELS[i]}] a card with no future end carries a mark`).toEqual([]);
  }
  console.log(`cards with no future named end, across the sweep: ${running}`);
  /* ⚠️ POPULATION: a board where every card has a future end cannot test this at all. */
  expect(running, "no card runs to today, so the exclusion was not tested").toBeGreaterThan(3);
});

test("the mark's shape and the cap's tone say whose date it is", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  await setRangeTo(page, 1);
  await page.waitForTimeout(400);
  const r = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().width > 0;
    return [...document.querySelectorAll(".tl-cap")].filter(vis).map((c) => {
      const cs = getComputedStyle(c);
      const m = [...document.querySelectorAll(".tl-tmark")]
        .find((x) => x.dataset.caprel === c.dataset.caprel);
      const ms = m ? getComputedStyle(m) : null;
      return { rel: c.dataset.caprel, src: c.dataset.cap,
        mine: c.classList.contains("mine"),
        capBg: cs.backgroundColor,
        markShape: m ? (m.classList.contains("you") ? "diamond" : "ring") : "(none)",
        markRadius: ms ? ms.borderTopLeftRadius : "" };
    });
  })()`) as unknown as any[];
  console.log(`caps ${r.length}: ${r.map((x) => `${x.src}→${x.markShape}`).join(", ")}`);
  expect(r.length, "no cap, so the tone rule was not tested").toBeGreaterThan(2);
  /* an agency's date is a ring and a neutral cap; the writer's is a diamond and the writer's tone */
  const wrong = r.filter((x) => (x.src === "sendBy") !== x.mine
    || (x.src === "sendBy") !== (x.markShape === "diamond"));
  expect(wrong.map((x) => `${x.rel} src=${x.src} mine=${x.mine} mark=${x.markShape}`),
    "a cap's tone or its mark's shape disagrees with whose date it is").toEqual([]);
});
