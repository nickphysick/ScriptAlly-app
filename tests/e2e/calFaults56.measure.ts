import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/** ⚠️ EVERY CASE ASSERTS ITS POPULATION AND PRINTS IT. See `calGhost56` for why. */

/**
 * ⚠️ THE TINT IS GONE IN v58, AND THIS CASE ASSERTS THAT RATHER THAN LAPSING.
 *
 * Lateness used to be painted across the card's face from the due date to today. v58 removes it
 * outright: the card face carries no fill or pattern for lateness at all, and lateness is said in
 * two places instead, both from the ref and both outside the face — the card wobbles occasionally,
 * and the row carries a strip down its left edge.
 *
 * The old case asserted "no card is tinted without saying it is overdue", over a population of
 * tinted cards. That population is now zero by design, so the case would have gone vacuously green
 * had its population guard not been there. It is replaced by the claim v58 actually makes.
 */
test("⚠️ no card face carries a lateness fill, and overdue is said by the wobble and the strip", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  /* ⚠️ THE HARNESS SUPPRESSES ANIMATION FOR STABLE GEOMETRY, so asking whether the wobble is
     RUNNING under suppression asks a question the harness has already answered "no" to. Lifted
     before the reading — the same trap that once reported a live takeover as a dead one. */
  await liftMotionSuppression(page);
  await page.waitForTimeout(900);
  let owedCards = 0, strips = 0, tints = 0, rows = 0;
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const c = await page.evaluate(`(() => {
      const vis = (e) => e.getBoundingClientRect().width > 0;
      const cards = [...document.querySelectorAll(".tl-p")].filter(vis);
      const owed = cards.filter((x) => x.classList.contains("owed"));
      return {
        rows: [...document.querySelectorAll(".tl-rrow")].filter((r) => r.getBoundingClientRect().height > 0).length,
        owed: owed.length,
        /* the row strip is a pseudo-element, so its presence is the class that draws it */
        strips: [...document.querySelectorAll(".tl-rrow.owes")].filter((r) => r.getBoundingClientRect().height > 0).length,
        tints: [...document.querySelectorAll(".tl-late")].filter(vis).length,
        /* and every owed card must actually be running the wobble */
        noWob: owed.filter((x) => getComputedStyle(x).animationName === "none").map((x) => x.dataset.rel || ""),
        /* while a card that is NOT owed must not be */
        wobNotOwed: cards.filter((x) => !x.classList.contains("owed")
          && getComputedStyle(x).animationName !== "none").map((x) => x.dataset.rel || ""),
      };
    })()`) as unknown as any;
    rows += c.rows; owedCards += c.owed; strips += c.strips; tints += c.tints;
    expect(c.noWob, `[${RANGE_LABELS[i]}] an overdue card is not wobbling`).toEqual([]);
    expect(c.wobNotOwed, `[${RANGE_LABELS[i]}] a card that is not overdue is wobbling`).toEqual([]);
  }
  console.log(`across the sweep — rows ${rows} · overdue cards ${owedCards} · owed strips ${strips} · tints ${tints}`);
  /* ⚠️ POPULATION: with no overdue card, "only overdue cards wobble" is true of nothing. */
  expect(owedCards, "no overdue card on the board, so the wobble rule was not tested").toBeGreaterThan(3);
  expect(strips, "no row carries the owed strip, so the ref's row mark is not drawn").toBeGreaterThan(0);
  expect(tints, "a lateness tint still paints on a card face — v58 removes it").toBe(0);
});

test("⚠️ the overdue span is today minus the due date", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const seen: string[] = [];
  const bad: string[] = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const rows = await page.evaluate(`(() => {
      const vis = (e) => e.getBoundingClientRect().width > 0;
      return [...document.querySelectorAll(".tl-p")].filter(vis).map((c) => ({
        rel: c.dataset.rel || "", due: c.dataset.dueat || "",
        days: c.dataset.days || "", from: c.dataset.from || "",
        /* v63 §D: the fact and its measuring tail are TWO spans — read the tail alone, or the
           date's own digits concatenate into the span ("…Apr 2024" + "29 months" = "202429") */
        words: ((c.querySelector(".tl-feb") || {}).textContent || "").trim(),
      }));
    })()`) as unknown as { rel: string; due: string; days: string; words: string }[];
    for (const r of rows) {
      /* the sentence carries the date and the span; `dueAt` is the unclamped day the tint uses.
         Today sits at the window's own centre, so the span in days is `todayAt - dueAt`. */
      const m = /^(\d+)\s*(day|days|week|weeks|month|months)\s+overdue$/i.exec(r.words);
      if (!m || !r.due || !r.days) continue;
      const todayAt = Number(r.days) / 2;
      const late = todayAt - Number(r.due);
      const n = Number(m[1]);
      const unit = m[2].toLowerCase();
      const expected = unit.startsWith("day") ? Math.round(late)
        : unit.startsWith("week") ? Math.round(late / 7) : Math.round(late / 30.44);
      seen.push(`${r.rel} ${n} ${unit} (late ${late.toFixed(1)}d)`);
      /* one unit of slack: the span coarsens by rounding, and the window's own half-day offset */
      if (Math.abs(n - expected) > 1) bad.push(`${r.rel}: says ${n} ${unit}, date implies ${expected}`);
    }
  }
  console.log(`overdue sentences read: ${seen.length}`);
  for (const s of seen.slice(0, 8)) console.log(`  ${s}`);
  /* ⚠️ POPULATION: no overdue sentence means the span rule was not exercised at all */
  expect(seen.length, "no card states an overdue span, so the rule was not tested").toBeGreaterThan(2);
  expect(bad, "an overdue span disagrees with the date it stands beside").toEqual([]);
});

test("⚠️ a card with no future named end terminates at today", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  let noEnd = 0, withEnd = 0;
  const late: string[] = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const r = await page.evaluate(`(() => {
      const vis = (e) => e.getBoundingClientRect().width > 0;
      const lane = [...document.querySelectorAll(".tl-c-tl")].filter(vis)[0];
      const lb = lane.getBoundingClientRect();
      const lineEl = document.querySelector(".tl-todayline");
      const out = { noEnd: [], withEnd: 0, laneW: Math.round(lb.width), laneX: Math.round(lb.left),
        todayX: lineEl ? Math.round(lineEl.getBoundingClientRect().left - lb.left) : null };
      for (const c of [...document.querySelectorAll(".tl-p")].filter(vis)) {
        const ne = c.dataset.namedend;
        const b = c.getBoundingClientRect();
        if (ne !== undefined && ne !== "" && ne !== "none" && Number(ne) > 0) { out.withEnd++; continue; }
        out.noEnd.push({ rel: c.dataset.rel, right: Math.round(b.right - lb.left) });
      }
      return out;
    })()`) as unknown as any;
    withEnd += r.withEnd; noEnd += r.noEnd.length;
    /* ⚠️ TODAY FROM THE RENDERED LINE, never `laneW / 2`. The window splits (days−1)/2 : rest, so
       the true line sits half a day left of the arithmetic centre — 4px at 1440 — and this case
       spent a pack calling two correct cards late by exactly that. */
    const todayX = r.todayX ?? r.laneW / 2;
    for (const c of r.noEnd) {
      if (Math.abs(c.right - todayX) > 2) late.push(`${c.rel}: ends ${c.right} of ${r.laneW}, today ${todayX}`);
    }
  }
  console.log(`cards — with a future end ${withEnd} · with none ${noEnd}`);
  /* ⚠️ BOTH POPULATIONS. A board where every card has a future end cannot test this at all. */
  expect(noEnd, "no card lacks a future end, so termination-at-today was not tested").toBeGreaterThan(3);
  expect(withEnd, "no card has a future end, so the board is not showing both kinds").toBeGreaterThan(3);
  expect(late, "a card with no future end runs past today").toEqual([]);
});

test("⚠️ no row CAN paint over the rail — the fault is structural now, and the structure is asserted", async ({ page }) => {
  /* ⚠️ RETARGETED: v60 Law 4 moved the rail OUTSIDE the scroller (`.tl-rows`), whose own box
     clips everything it scrolls — so a card cannot reach the rail's pixels at any scroll
     position. The old case demanded overlapping populations that can no longer exist; the honest
     claim is the construction, plus one scrolled sample proving the clip. */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const rail = g.querySelector<HTMLElement>(".tl-rail")!;
    const rows = g.querySelector<HTMLElement>(".tl-rows")!;
    rows.scrollTop = 400;
    const rb = rail.getBoundingClientRect();
    const cards = [...g.querySelectorAll<HTMLElement>(".tl-p")].filter((c) => c.getBoundingClientRect().height > 1);
    /* ⚠️ PAINT, NOT RECTS. A scrolled card's rect still reports its unclipped box, so a box test
       "found" intrusion on a correctly clipped board. Hit-test points inside the rail instead. */
    const y = (rb.top + rb.bottom) / 2;
    const hits = [0.25, 0.5, 0.75].map((f) => {
      const x = rb.left + rb.width * f;
      const top = document.elementsFromPoint(x, y)[0] as HTMLElement | undefined;
      return top ? (top === rail || rail.contains(top) ? "rail" : String(top.className).slice(0, 24)) : "none";
    });
    return {
      railInsideRows: rows.contains(rail),
      rowsClip: getComputedStyle(rows).overflowY,
      scrolled: rows.scrollTop,
      cards: cards.length, hits,
    };
  });
  expect(r.railInsideRows, "the rail moved back inside the scroller").toBe(false);
  expect(["auto", "scroll"]).toContain(r.rowsClip);
  expect(r.cards, "no cards").toBeGreaterThan(3);
  if (r.scrolled === 0) console.log("board does not overflow at 900 — the hit test ran unscrolled");
  for (const h of r.hits) expect(h, `something paints over the rail: ${h}`).toBe("rail");
});
