import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ THE CONTENT LADDER — full · headline · pill · stub (v40, Phase 4).
 *
 * v40's cards are wide: a relationship spans months rather than the stretch between two status
 * changes. Card width therefore stopped predicting whether the words fit, and what decides it is
 * the room LEFT after the marks — a 400px card whose last mark sits at 380 has twenty pixels for
 * its sentence. Measured before the ladder existed: one card drew nothing at all and its
 * neighbour's text ran off its own right edge, both comfortably over 300px wide.
 *
 * ⚠️ AND THE CENSUS IS PRINTED, because a sweep where every card is at one rung proves nothing
 * about the other three and passes. The tally is asserted to hold each of the top three, and the
 * distinct values are logged so a fixture drifting into a monoculture is visible rather than
 * silently green.
 */
const census = (page: Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
  const cards = [...document.querySelectorAll(".tl-p")].filter(vis) as HTMLElement[];
  return cards.map((c) => {
    const cb = c.getBoundingClientRect();
    const pill = c.querySelector(".tl-pill") as HTMLElement | null;
    const line = c.querySelector(".tl-line") as HTMLElement | null;
    const det = c.querySelector(".tl-cdt") as HTMLElement | null;
    const hl = c.querySelector(".tl-hl") as HTMLElement | null;
    const drawn = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().width > 0;
    return { tier: c.dataset.tier || "none", w: cb.width, h: cb.height,
      rel: c.dataset.rel || "", noroom: c.hasAttribute("data-noroom"),
      pill: drawn(pill), line: drawn(line), detail: drawn(det), head: drawn(hl),
      over: line?.dataset.over ?? null, fits: !!line?.classList.contains("fits") };
  });
});

const WIDTHS = [1440, 1024, 900] as const;

test("every rung is reached, and each shows exactly what its name says", async ({ page }) => {
  const seen: Record<string, number> = {};
  const rows: Awaited<ReturnType<typeof census>> = [];
  const visited = new Set<string>();
  for (const w of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width: w, height: 900 });
    await page.waitForTimeout(700);
    for (const i of [0, 1, 2]) {
      await setRangeTo(page, i);
      /**
       * ⚠️ THE RANGE IS ASSERTED, NOT ASSUMED — a walk that did not land measures one range three
       * times and reports a census. It happened between two runs of this very case: the headline
       * rung fell from 40 to 9 with nothing changed, because focus went elsewhere and every
       * iteration re-read the same board. A sweep that cannot say which subjects it visited is a
       * sample wearing a census's clothes.
       */
      const at = await page.evaluate(() => {
        const on = [...document.querySelectorAll(".tl-mbtn")]
          .find((b) => (b.textContent || "").startsWith("Display"));
        return (on?.textContent || "").trim();
      });
      /* ⚠️ THE RANGE IS ASSERTED FROM THE TRIGGER'S OWN SUMMARY, which names the non-default
         choices — so the assertion reads what a reader reads. The default range names nothing,
         which is itself the reading for index 1. */
      const want = i === 1 ? "Display ▾" : `Display · ${RANGE_LABELS[i]} ▾`;
      expect(at, `range ${i} was not reached at ${w}`).toBe(want);
      visited.add(`${w}:${i}`);
      const got = await census(page);
      for (const r of got) seen[r.tier] = (seen[r.tier] ?? 0) + 1;
      rows.push(...got);
    }
  }
  console.log(`ladder census across ${WIDTHS.join("/")} × three ranges: ${JSON.stringify(seen)}`);
  expect(visited.size, "width × range combinations actually visited").toBe(WIDTHS.length * 3);

  /* ⚠️ POPULATION PER RUNG, not overall — an overall floor is satisfied by one rung repeated. */
  for (const tier of ["full", "headline", "pill"]) {
    expect(seen[tier] ?? 0, `no card ever reached the ${tier} rung`).toBeGreaterThan(3);
  }
  expect(seen.none ?? 0, "cards with no tier at all").toBe(0);

  /* each rung shows what its name says, and nothing below it */
  const wrong = rows.filter((r) => {
    if (r.tier === "full") return !r.pill || !r.head;
    if (r.tier === "headline") return !r.pill || !r.head || r.detail;
    if (r.tier === "pill") return r.line || (!r.pill && !r.noroom);
    if (r.tier === "stub") return r.line || r.detail;
    return true;
  }).map((r) => `${r.rel} [${r.tier}] pill=${r.pill} head=${r.head} detail=${r.detail} line=${r.line}`);
  expect([...new Set(wrong)], "a rung showing something it should not").toEqual([]);
});

test("⚠️ the marquee is the full rung's alone", async ({ page }) => {
  /* Below `full` a card is not overflowing — it has DROPPED something, and sliding what remains
     moves a complete phrase for no reason while the part the reader is missing stays missing. */
  await openRoute(page, "/todo/calendar", { width: 1024, height: 900 });
  await page.waitForTimeout(800);
  const rows = await census(page);
  const below = rows.filter((r) => r.tier !== "full" && r.tier !== "none");
  expect(below.length, "cards below the full rung").toBeGreaterThan(3);
  expect(below.filter((r) => r.over != null).map((r) => `${r.rel} [${r.tier}] over=${r.over}`),
    "a card below the full rung was marked as overflowing").toEqual([]);
});

test("⚠️ the stub PAINTS a disc, and nothing on this fixture ever reaches it", async ({ page }) => {
  /**
   * ⚠️ REPORTED, NOT PAPERED OVER: no relationship on the harness account draws a card under 60px
   * at any width the board allows. The lane stops narrowing below 900 — the board has a minimum
   * and the page scrolls instead — so the narrowest card measured anywhere is 93px. A census can
   * therefore say nothing about this rung, and a case that merely counted rungs would pass while
   * the bottom of the ladder had never once run.
   *
   * ⚠️ SO THE CLAIM IS SPLIT AT THE JOIN THAT MAKES BOTH HALVES PROVABLE. Which rung a set of
   * widths lands on is arithmetic and is locked in `cardTier.test.ts`, where a 44px card can be
   * stated. What a stub LOOKS like is paint, and only a rendered page can answer it — so the tier
   * is applied to a real card here and the disc is measured. Driving the WIDTH instead does not
   * work and the failure is quiet: the fit pass is re-run by a `ResizeObserver` on the BOARD, so a
   * card narrowed in the page is never re-tiered and the case reads as the rule not firing.
   */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  const before = await census(page);
  const narrowest = Math.min(...before.map((r) => r.w));
  console.log(`narrowest card on the fixture: ${narrowest.toFixed(0)}px (stub threshold 60)`);
  expect(before.filter((r) => r.tier === "stub").length,
    "the fixture produced a stub after all — this case can become a census").toBe(0);

  const got = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    /* ⚠️ A CARD WHOSE EDGES ARE NOT DISSOLVING. `.tl-p.fadeL` / `.fadeR` square the corners on a
       clipped edge — a rounded corner in the middle of a fade is a visible arc — so a card fading
       at both ends computes a radius of 0 with every rule applying correctly. Taking the first
       card in the DOM handed the case exactly that, and a 54px card clipped at BOTH edges is a
       combination the board cannot produce: a relationship running past both ends of the window
       fills the lane. The subject has to be one a stub could really be. */
    const c = [...document.querySelectorAll(".tl-p")].filter(vis)
      .find((e) => !e.classList.contains("fadeL") && !e.classList.contains("fadeR")) as HTMLElement;
    if (!c) return { w: 0, h: 0, r: "no unclipped card", line: true, dot: 0, dotR: "" };
    /* ⚠️ AND THE OTHER ATTRIBUTES THE REAL PASS WOULD HAVE SET GO WITH IT. `data-noroom` is the
       fit pass's answer for a `pill` card whose marks leave no space on either side; the stub
       branch clears it before it returns, so the two can never coexist in the app. Forcing a tier
       by hand does not run that branch, so a card that was `pill` + `noroom` kept the attribute
       and its dot rendered `display: none` — 0px wide, reported as the stub's dot being wrong. A
       driven state has to be the WHOLE state, or it measures a combination the app cannot be in. */
    c.dataset.tier = "stub";
    c.removeAttribute("data-noroom");
    return new Promise<{ w: number; h: number; r: string; line: boolean; dot: number; dotR: string }>((res) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const b = c.getBoundingClientRect();
        const pill = c.querySelector(".tl-pill") as HTMLElement | null;
        const line = c.querySelector(".tl-line") as HTMLElement | null;
        res({ w: b.width, h: b.height, r: getComputedStyle(c).borderRadius,
          line: !!line && line.getBoundingClientRect().width > 0,
          dot: pill ? Math.round(pill.getBoundingClientRect().width) : 0,
          dotR: pill ? getComputedStyle(pill).borderRadius : "" });
      }));
    });
  });
  console.log(`stub paints ${got.w.toFixed(0)}×${got.h.toFixed(0)} radius ${got.r} · dot ${got.dot} radius ${got.dotR} · words ${got.line}`);
  /* a disc at the card height, holding an 18px dot and no words */
  expect(Math.abs(got.w - got.h), "the stub is not square").toBeLessThan(1.5);
  expect(got.r.startsWith("999") || parseFloat(got.r) >= got.w / 2 - 1, `stub radius ${got.r}`).toBe(true);
  expect(got.dot, "the stub's dot").toBe(18);
  expect(got.dotR.startsWith("999") || parseFloat(got.dotR) >= 9 - 0.5, `dot radius ${got.dotR}`).toBe(true);
  expect(got.line, "a stub drew words").toBe(false);
});
