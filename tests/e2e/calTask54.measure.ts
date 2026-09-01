import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ A TASK IS ONE POINT, DRAWN ONCE (v54, Phase 7).
 *
 * It was a pill — the shape this board uses for whose-move-it-is on a card, a state holding over a
 * span — so a task read as a fifth kind of card while carrying no duration to justify one. It is
 * an outlined mark at its day, its name beside it and the day beneath.
 */
test("a task is a point: outlined mark, Playfair name, mono day — and no pill", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const got = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const chips = ([...document.querySelectorAll(".tl-tchip")] as HTMLElement[]).filter(vis);
    return chips.map((c) => {
      const cs = getComputedStyle(c);
      const mk = c.querySelector(".tl-tmk") as HTMLElement | null;
      const nm = c.querySelector(".tl-tname") as HTMLElement | null;
      const du = c.querySelector(".tl-tdue") as HTMLElement | null;
      const mb = mk?.getBoundingClientRect();
      return { label: (nm?.textContent || "").trim().slice(0, 20),
        chipRadius: cs.borderTopLeftRadius, chipBorder: cs.borderTopWidth,
        chipBg: cs.backgroundColor,
        mark: mb ? `${Math.round(mb.width)}x${Math.round(mb.height)}` : "none",
        markBorder: mk ? getComputedStyle(mk).borderTopWidth : "",
        nameFont: nm ? getComputedStyle(nm).fontFamily.split(",")[0] : "",
        dueFont: du ? getComputedStyle(du).fontFamily.split(",")[0] : "",
        due: (du?.textContent || "").trim() };
    });
  });
  console.log(`task points ${got.length}`);
  for (const g of got) console.log(`  "${g.label}" mark ${g.mark} border ${g.markBorder}`
    + ` · name ${g.nameFont} · day "${g.due}" in ${g.dueFont}`
    + ` · chip radius ${g.chipRadius} border ${g.chipBorder} bg ${g.chipBg}`);
  expect(got.length, "no task on the board, so nothing was checked").toBeGreaterThan(0);
  for (const g of got) {
    /* ⚠️ NEVER A PILL — asserted on the chip's own painted shape rather than on a class name. */
    expect(parseFloat(g.chipRadius), `"${g.label}" is still drawn as a pill`).toBeLessThan(20);
    expect(parseFloat(g.chipBorder), `"${g.label}" still carries a chip border`).toBe(0);
    expect(g.chipBg, `"${g.label}" still carries a chip fill`).toBe("rgba(0, 0, 0, 0)");
    /* the point itself */
    expect(g.mark, `"${g.label}" has no 20px mark`).toBe("20x20");
    /* ⚠️ THE WIDTH IS NOT PINNED HERE. A sub-pixel border's used value rounds at DPR 1 — declared
       1.5px, Chromium reports 1px — so a rendered check can say the mark IS outlined and the
       1.5px is asserted in `calendarTokens.test.ts` where it can be read as written. The same
       split the today line needed. */
    expect(parseFloat(g.markBorder), `"${g.label}"'s mark is not outlined`).toBeGreaterThan(0);
    expect(g.nameFont, `"${g.label}" is not set in Playfair`).toContain("Playfair");
    expect(g.dueFont, `"${g.label}"'s day is not mono`).toContain("JetBrains");
    /* ⚠️ A DAY, NEVER A DURATION — a span is what a card states and a task does not have one. */
    expect(g.due, `"${g.label}" states a duration rather than a day`)
      .not.toMatch(/\b\d+\s*(day|week|month)/i);
    expect(g.due.length, `"${g.label}" states no day`).toBeGreaterThan(2);
  }
});

test("⚠️ A TASK RENDERS ONE ELEMENT PER DATE IT OCCUPIES — one, plus one per roll", async ({ page }) => {
  /**
   * ⚠️ NOT "EQUALS ONE", AND NOT "ALWAYS TWO". A task that has not been rolled is one mark on its
   * day. A task that HAS been rolled shows a dashed ghost at the date it was originally due and a
   * live mark at the date it now falls on, because those are two facts and a reader needs both:
   * where it started and where it stands. The count is `1 + rolls`, and what is forbidden is two
   * marks of the SAME kind on one row — that is one task drawn twice.
   *
   * v54 built the pair deliberately and its lock permitting it was right; a lock demanding exactly
   * one element would have deleted the ghost.
   */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  let checked = 0;
  const shapes = new Map<string, number>();
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    const got = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
      const perTask = new Map<string, { live: number; ghost: number; dates: Set<string> }>();
      for (const row of ([...document.querySelectorAll(".tl-rrow")] as HTMLElement[]).filter(vis)) {
        const key = row.getAttribute("data-rowkey") || "";
        for (const c of ([...row.querySelectorAll(".tl-tchip")] as HTMLElement[]).filter(vis)) {
          const id = `${key}::${(c.querySelector(".tl-tname")?.textContent || "").trim()}`;
          const rec = perTask.get(id) ?? { live: 0, ghost: 0, dates: new Set<string>() };
          if (c.classList.contains("ghost")) rec.ghost += 1; else rec.live += 1;
          rec.dates.add((c.querySelector(".tl-tdue")?.textContent || "").trim());
          perTask.set(id, rec);
        }
      }
      return [...perTask.entries()].map(([id, r]) => ({ id, live: r.live, ghost: r.ghost, dates: r.dates.size }));
    });
    for (const t of got) {
      checked += 1;
      const shape = `${t.live} live + ${t.ghost} ghost`;
      shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
      /* one mark of each kind at most: a second LIVE mark is the same task drawn twice */
      expect(t.live, `[${RANGE_LABELS[i]}] ${t.id} draws ${t.live} live marks`).toBeLessThanOrEqual(1);
      expect(t.ghost, `[${RANGE_LABELS[i]}] ${t.id} draws ${t.ghost} origin marks`).toBeLessThanOrEqual(1);
      expect(t.live + t.ghost, `[${RANGE_LABELS[i]}] ${t.id} draws no mark at all`).toBeGreaterThan(0);
      /* ⚠️ AND EACH MARK IS ON ITS OWN DATE. Two marks sharing one date is one task drawn twice
         however they are classed — which is the fault a count alone cannot see. */
      expect(t.dates, `[${RANGE_LABELS[i]}] ${t.id} draws ${t.live + t.ghost} marks on ${t.dates} date(s)`)
        .toBe(t.live + t.ghost);
    }
  }
  console.log(`task/range pairs checked ${checked} · shapes ${JSON.stringify([...shapes])}`);
  expect(checked, "no task marks were checked at any range").toBeGreaterThan(0);
  /* ⚠️ THE CENSUS IS A MONOCULTURE ON THIS FIXTURE AND IS REPORTED AS ONE. Both tasks on the
     harness account have been rolled, so every pair is "1 live + 1 ghost" and the unrolled shape —
     one mark, no ghost — is never exercised. The rule permits it and nothing here proves it. */
  if (shapes.size === 1) {
    console.log(`  ⚠️ one shape only: ${[...shapes.keys()][0]} — the other is unexercised on this fixture`);
  }
});

/**
 * ⚠️ THE GHOSTS (v54, Phase 7) — a named date past the card's end.
 *
 * Three conditions, each removing a way of drawing a ring that means nothing: the date must be
 * NAMED, it must fall INSIDE the window, and it must be PAST the card's end. The third is what
 * makes the clearance structural — a ring is only ever emitted beyond where its card stops, so it
 * cannot overlap one, and it is never nudged clear of a card it would otherwise sit on, which
 * would state a day it is not drawn on.
 */
test("a ghost is a named date past its card, clear of it, and only inside the window", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  const seen: { ghosts: number; ranges: string[]; clashes: string[]; outside: string[] } =
    { ghosts: 0, ranges: [], clashes: [], outside: [] };
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    const got = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
      const rings = ([...document.querySelectorAll(".tl-ghost")] as HTMLElement[]).filter(vis);
      const cards = ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis);
      const clash: string[] = []; const outside: string[] = [];
      for (const g of rings) {
        const gb = g.getBoundingClientRect();
        /* ⚠️ THE LANE, NAMED — NOT "the ring's parent". The ring became a CHILD of its card in v56
           §1 (so that it follows the card's painted width when a clipped card opens), and this
           then asked whether the ring sits inside the CARD — which it deliberately never does: it
           stands past the card's right edge, which is the whole point of it. Eleven true readings
           of the wrong container, reported as the ring escaping the board. */
        const laneEl = g.closest(".tl-c-tl") as HTMLElement | null;
        const lane = (laneEl ?? g.parentElement!).getBoundingClientRect();
        if (gb.left < lane.left - 0.5 || gb.right > lane.right + 0.5) {
          outside.push(`ring ${gb.left.toFixed(0)}..${gb.right.toFixed(0)} outside lane ${lane.left.toFixed(0)}..${lane.right.toFixed(0)}`);
        }
        for (const c of cards) {
          const cb = c.getBoundingClientRect();
          const sameLine = gb.top + gb.height / 2 > cb.top - 4 && gb.top + gb.height / 2 < cb.bottom + 4;
          if (sameLine && gb.left < cb.right - 1 && gb.right > cb.left + 1) {
            clash.push(`${c.dataset.rel}: ring ${gb.left.toFixed(0)}..${gb.right.toFixed(0)} over card ${cb.left.toFixed(0)}..${cb.right.toFixed(0)}`);
          }
        }
      }
      return { rings: rings.length, due: rings.filter((r) => r.classList.contains("due")).length,
        clash, outside };
    });
    seen.ghosts += got.rings;
    seen.ranges.push(`${RANGE_LABELS[i]}:${got.rings}(${got.due} due)`);
    seen.clashes.push(...got.clash);
    seen.outside.push(...got.outside);
  }
  console.log(`ghost rings by range: ${seen.ranges.join(" · ")}`);
  /* ⚠️ THE COUNT IS REPORTED, and a board with none is a fact about the fixture rather than about
     the feature — but the placement claims below are then untested, so that is said outright. */
  expect(seen.clashes, "a ghost ring overlaps a card on its own line").toEqual([]);
  expect(seen.outside, "a ghost ring is drawn outside its lane").toEqual([]);
  if (seen.ghosts === 0) {
    console.log("  no ghost on this fixture at any range — placement is unmeasured, not proven");
  }
});
