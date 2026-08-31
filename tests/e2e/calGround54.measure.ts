import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ THE GROUND AND THE TODAY LINE (v54, Phase 2).
 *
 * Four claims, each about the composed page rather than about a declaration:
 * the line is where today is; it is in front of every card; nothing tints the past; no row reaches
 * into the rail.
 *
 * ⚠️ THE Z-ORDER CLAIM IS ASSERTED BY STACKING, NOT BY APPEARANCE. A card and the line can look
 * right because the card happens to be short of today; what is being locked is that the line WINS
 * where they meet, which only a hit test at a shared point can answer — and the point has to be
 * proved on screen first, because `elementsFromPoint` outside the viewport returns an empty array
 * and satisfies any "the top element is not X" assertion by returning nothing at all.
 */
test("today's line is where today is, and in front of every card", async ({ page }) => {
  /* ⚠️ A TALL VIEWPORT, BECAUSE THE POPULATION IS ROWS ON SCREEN. At 900 only three or four rows
     are above the fold and barely any of them cross today, so the stacking claim was made about
     one card or none — and a hit test needs its point PROVED on screen, since `elementsFromPoint`
     outside the viewport returns an empty array and satisfies the assertion by returning nothing. */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 1400 });
  await page.waitForTimeout(900);
  /* ⚠️ AND THE BOARD IS SCROLLED, because the rows below the scrollport are exactly the ones a
     stacking claim has not been made about. Two on-screen crossing cards is a real population and
     a thin one; walking the board brings the rest into the viewport where the hit test can reach
     them. */
  const got = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0
      || (e as HTMLElement).getBoundingClientRect().height > 0;
    const line = document.querySelector(".tl-todayline") as HTMLElement | null;
    if (!line) return null;
    /**
     * ⚠️ THE LINE IS `pointer-events: none`, SO A HIT TEST CANNOT SEE IT — and the probe read
     * "line absent" on both cards it could reach, which looks exactly like the line losing.
     * `elementsFromPoint` omits such elements BY DESIGN; this repo already records the same trap
     * on the marketing hero's burst. Paint order and hit testing are different properties, so the
     * probe turns hit testing on for the measurement and turns it off again: the stacking being
     * asserted is untouched by it, and the alternative — reading a computed `z-index` — proves the
     * declaration took and never that anything was painted.
     */
    const hadPE = line.style.pointerEvents;
    line.style.pointerEvents = "auto";
    const lb = line.getBoundingClientRect();
    const cs = getComputedStyle(line);
    /* the line is drawn, and drawn in the pinned colour */
    const ink = { w: cs.borderLeftWidth, colour: cs.borderLeftColor, z: cs.zIndex };
    /* every card whose span contains today's x — the only ones the claim is about */
    const cards = ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis);
    const zone = document.querySelector(".tpl-zone") as HTMLElement | null;
    void zone;
    const crossing = cards.filter((c) => {
      const b = c.getBoundingClientRect();
      return b.left < lb.left - 1 && b.right > lb.left + 1;
    });
    /* hit-test at each crossing card's own vertical middle, on the line's x */
    const beaten = crossing.map((c) => {
      const b = c.getBoundingClientRect();
      const y = b.top + b.height / 2;
      const onScreen = y > 0 && y < window.innerHeight && lb.left > 0 && lb.left < window.innerWidth;
      if (!onScreen) return { rel: c.dataset.rel || "", onScreen, top: "" };
      const stack = document.elementsFromPoint(lb.left + 0.5, y) as HTMLElement[];
      const li = stack.indexOf(line), ci = stack.indexOf(c);
      return { rel: c.dataset.rel || "", onScreen,
        top: li === -1 ? "line absent" : ci === -1 ? "card absent" : li < ci ? "line" : "card" };
    });
    line.style.pointerEvents = hadPE;
    return { ink, cards: cards.length, crossing: crossing.length, beaten,
      vh: window.innerHeight, lineX: lb.left,
      ys: crossing.slice(0, 6).map((c) => Math.round(c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2)) };
  });
  expect(got, "no today line on the board").not.toBeNull();
  const g = got!;
  /* walk the board so every crossing card gets its turn inside the viewport */
  const extra: { rel: string; onScreen: boolean; top: string }[] = [];
  for (const y of [400, 800, 1200, 1600, 2000]) {
    await page.evaluate((to) => {
      const z = document.querySelector(".tpl-zone") as HTMLElement | null;
      if (z) z.scrollTop = to; else window.scrollTo(0, to);
    }, y);
    await page.waitForTimeout(220);
    const more = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
      const line = document.querySelector(".tl-todayline") as HTMLElement | null;
      if (!line) return [];
      const had = line.style.pointerEvents; line.style.pointerEvents = "auto";
      const lb = line.getBoundingClientRect();
      const out = ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis)
        .filter((c) => { const b = c.getBoundingClientRect(); return b.left < lb.left - 1 && b.right > lb.left + 1; })
        .map((c) => {
          const b = c.getBoundingClientRect(); const cy = b.top + b.height / 2;
          /* ⚠️ "ON SCREEN" MEANS INSIDE THE CLIPPING ANCESTOR, not inside the window. A card whose
             centre is in the viewport but under the pinned masthead — or below the board's own
             scrollport — hit-tests to `div.ws-main`, the shell, and the probe reported "line
             absent" about a point that was never on the board. One card in eleven, and it read
             exactly like something painting over the today line. */
          const zone = document.querySelector(".tpl-zone") as HTMLElement | null;
          const zb = zone ? zone.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
          const inside = cy > Math.max(4, zb.top + 2) && cy < Math.min(window.innerHeight - 4, zb.bottom - 2);
          if (!inside) return { rel: c.dataset.rel || "", onScreen: false, top: "" };
          const st = document.elementsFromPoint(lb.left + 0.5, cy) as HTMLElement[];
          const li = st.indexOf(line), ci = st.indexOf(c);
          const name = (e?: HTMLElement) => e ? `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 26)}` : "-";
          return { rel: c.dataset.rel || "", onScreen: true,
            top: li === -1 ? `line absent — top is ${name(st[0])}`
              : ci === -1 ? "card absent" : li < ci ? "line" : `card (top ${name(st[0])})` };
        });
      line.style.pointerEvents = had;
      return out;
    });
    extra.push(...more);
  }
  for (const e of extra) if (e.onScreen && !g.beaten.some((b) => b.rel === e.rel && b.onScreen)) g.beaten.push(e);
  console.log(`today line: ${g.ink.w} ${g.ink.colour} z${g.ink.z} · cards ${g.cards} · crossing today ${g.crossing}`);
  console.log(`  viewport h ${g.vh} · line x ${g.lineX.toFixed(0)} · crossing card mid-ys ${g.ys.join(",")}`);
  console.log(`  stacked: ${g.beaten.filter((b) => b.onScreen).map((b) => `${b.rel}=${b.top}`).join(" · ")}`);
  expect(g.ink.colour, "the today line is not the pinned tone").toBe("rgb(230, 195, 180)");
  /* ⚠️ THE WIDTH IS NOT ASSERTED HERE, AND THAT IS THE DOCUMENTED LIMIT OF THE INSTRUMENT. A
     sub-pixel border's USED value rounds at DPR 1: declared 1.5px, Chromium reports 1px. What a
     rendered page can say is that the line is PAINTED and painted in the pinned tone; the 1.5px
     is a fact about the stylesheet and is locked in `calendarTokens.test.ts`, where it can be
     read as written. Asserting it here would fail on a correct board forever. */
  expect(parseFloat(g.ink.w), "the today line paints no border at all").toBeGreaterThan(0.5);
  expect(Number(g.ink.z), "the line does not clear a hovered card's z").toBeGreaterThanOrEqual(60);

  /* ⚠️ POPULATION FIRST — "no card beats the line" is satisfied by a board where none crosses it. */
  const tested = g.beaten.filter((b) => b.onScreen);
  expect(tested.length, "no card on screen crosses today, so nothing was stacked").toBeGreaterThan(1);
  expect(tested.filter((b) => b.top !== "line").map((b) => `${b.rel}: ${b.top}`),
    "a card paints over the today line").toEqual([]);
});

test("nothing tints the past, and no row reaches into the rail", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const got = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
    const line = document.querySelector(".tl-todayline") as HTMLElement | null;
    const rail = document.querySelector(".tl-rail") as HTMLElement | null;
    if (!line || !rail) return null;
    const tx = line.getBoundingClientRect().left;
    /* ⚠️ A WASH IS A PAINTED THING, so it is looked for as one: any element inside a lane whose
       own background is not transparent and whose box lies wholly left of today. Asking whether a
       named class exists would pass the day somebody paints the same wash under another name. */
    const washes: string[] = [];
    for (const lane of [...document.querySelectorAll(".tl-c-tl")].filter(vis)) {
      for (const el of [lane, ...lane.querySelectorAll("*")] as HTMLElement[]) {
        const b = el.getBoundingClientRect();
        if (b.width < 8 || b.right > tx - 1) continue;
        const cs = getComputedStyle(el);
        const painted = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none";
        /* ⚠️ THE CLAIM IS ABOUT THE LANE'S GROUND, NOT ABOUT WHAT A CARD CONTAINS. A card that
           ended before today is wholly left of today, and its pill is painted by design — the
           first version of this excluded `.tl-p` itself and caught its three pills instead,
           reporting a correct board as carrying three washes. Anything with a card above it is a
           card's business. */
        if (painted && !el.closest(".tl-p") && !el.classList.contains("tl-mk2")) {
          washes.push(`${el.className || el.tagName} ${cs.backgroundColor} / ${cs.backgroundImage.slice(0, 30)}`);
        }
      }
      /**
       * ⚠️ A PSEUDO-ELEMENT IS NOT IN `querySelectorAll`, AND IT IS HOW THE WASH WAS DRAWN.
       * `.tl-c-tl::before` is what painted the past, so the sweep above cannot see it at all and
       * this is the only reader of it. Both halves of a background are asked for: the first
       * version checked `backgroundImage` alone, and a red proof that reinstated the wash as a
       * flat `background:` COLOUR sailed through it and the lock reported zero — vacuous, over the
       * exact rule it was written to forbid.
       */
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(lane, pseudo);
        if (ps.content === "none") continue;
        const painted = ps.backgroundColor !== "rgba(0, 0, 0, 0)" || ps.backgroundImage !== "none";
        if (painted) washes.push(`lane ${pseudo} ${ps.backgroundColor} / ${ps.backgroundImage.slice(0, 30)}`);
      }
    }
    const rb = rail.getBoundingClientRect();
    const overlap = ([...document.querySelectorAll(".tl-rrow")] as HTMLElement[])
      .filter(vis)
      .filter((r) => { const b = r.getBoundingClientRect(); return b.top < rb.bottom - 0.6 && b.bottom > rb.top + 0.6; })
      .map((r) => r.getAttribute("data-rowkey") || "row");
    return { lanes: [...document.querySelectorAll(".tl-c-tl")].filter(vis).length,
      washes: [...new Set(washes)], overlap, railZ: getComputedStyle(rail).zIndex,
      railIsolation: getComputedStyle(rail).isolation };
  });
  expect(got, "no board to measure").not.toBeNull();
  const g = got!;
  console.log(`lanes ${g.lanes} · washes left of today ${g.washes.length} · rows overlapping the rail ${g.overlap.length}`
    + ` · rail z${g.railZ} isolation ${g.railIsolation}`);
  expect(g.lanes, "lanes measured").toBeGreaterThan(5);
  for (const w of g.washes) console.log("   WASH " + w);
  expect(g.washes, "something paints a wash left of today").toEqual([]);
  expect(g.overlap, "a row overlaps the rail").toEqual([]);
  /* the rail's own context, so no row can reach into it whatever it sets */
  expect(g.railIsolation, "the rail has no stacking context of its own").toBe("isolate");
});
