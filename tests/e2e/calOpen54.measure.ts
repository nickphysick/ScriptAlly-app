import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ CLIP AND OPEN (v54, Phase 4) — the replacement for v40's four-rung ladder.
 *
 * v40 answered "the words do not fit" by removing some: the detail, then the words, then the card
 * became a disc. That is a decision made for the reader, on every card whose dates happen to be
 * close together — sixteen of twenty-three at six months. v54 keeps the words, clips them with a
 * soft edge and opens the card on hover to exactly what they need.
 */
const census = (page: Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
  const cards = [...document.querySelectorAll(".tl-p")].filter(vis) as HTMLElement[];
  const lane = (c: HTMLElement) => c.parentElement!.getBoundingClientRect();
  return cards.map((c) => {
    const b = c.getBoundingClientRect();
    const line = c.querySelector(".tl-line") as HTMLElement | null;
    const track = c.querySelector(".tl-track") as HTMLElement | null;
    const pill = c.querySelector(".tl-pill") as HTMLElement | null;
    const cs = getComputedStyle(c);
    const maskOf = (e: HTMLElement | null) => {
      if (!e) return "none";
      const s2 = getComputedStyle(e);
      const wk = (s2 as unknown as Record<string, string>).webkitMaskImage;
      return s2.maskImage !== "none" ? s2.maskImage : (wk && wk !== "none" ? wk : "none");
    };
    const inset = parseFloat(cs.getPropertyValue(
      c.classList.contains("fadeL") ? "--card-fade-inset" : "--tl-text-inset")) || 0;
    const fadePad = c.classList.contains("fadeR")
      ? parseFloat(cs.getPropertyValue("--card-fade")) || 0 : 0;
    /* ⚠️ THE WIDER OF THE TWO, NOT THEIR SUM. v55 stacks the pill above the headline, so their
       widths no longer add — the sum overstated every card by roughly a pill and reported cards
       opening 142px past their own words. This mirrors the page's own arithmetic, which is why
       `data-need` is published and compared against it below rather than trusted on its own. */
    const needed = pill && track
      ? inset + Math.max(pill.getBoundingClientRect().width, track.scrollWidth) + 12 + fadePad : 0;
    return { rel: c.dataset.rel || "", tight: c.hasAttribute("data-tight"),
      noDetail: c.hasAttribute("data-nodetail"),
      w: b.width, left: b.left, right: b.right,
      laneW: lane(c).width, laneL: lane(c).left, laneR: lane(c).right,
      needed,
      /* ⚠️ THE PASS'S OWN PRE-DROP NUMBER. Recomputing `needed` after a drop measures a track that
         has already lost its detail, so a justified drop reads as unjustified. */
      needFull: Number(c.dataset.needfull || "NaN"),
      exp: c.style.getPropertyValue("--exp"), hx: c.style.getPropertyValue("--hx"),
      /* ⚠️ THE CLIP IS READ WHERE IT LIVES — on `.tl-content`, not on the line. v55 moved it up a
         level because the content is two rows now and a mask on the line alone would soften the
         headline while leaving the pill above it hard-cut. Either element may legitimately be the
         one carrying it; what the claim is about is whether a clipped card clips. */
      lineMask: maskOf((c.querySelector(".tl-content") as HTMLElement | null) || line) };
  });
});

test("a card whose words fit is neither clipped nor openable", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1920, height: 900 });
  await page.waitForTimeout(800);
  const all: Awaited<ReturnType<typeof census>> = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) { await setRangeTo(page, i); all.push(...await census(page)); }
  const fits = all.filter((r) => r.needed <= r.w + 1);
  const tights = all.filter((r) => r.tight);
  console.log(`cards ${all.length} · fitting ${fits.length} · tight ${tights.length}`
    + ` · detail dropped ${all.filter((r) => r.noDetail).length}`);
  /* ⚠️ BOTH POPULATIONS, because a board where everything fits proves nothing about clipping and a
     board where nothing does proves nothing about the quiet case. */
  expect(fits.length, "no card's words fit, so the quiet case was not tested").toBeGreaterThan(2);
  expect(tights.length, "no card is tight, so the clip was not tested").toBeGreaterThan(2);
  expect(fits.filter((r) => r.tight).map((r) => `${r.rel}: needs ${r.needed.toFixed(0)} has ${r.w.toFixed(0)}`),
    "a card whose words fit is marked tight").toEqual([]);
  expect(fits.filter((r) => r.lineMask !== "none").map((r) => r.rel),
    "a card whose words fit carries a clip mask").toEqual([]);
  expect(tights.filter((r) => r.lineMask === "none").map((r) => r.rel),
    "a tight card does not clip its words").toEqual([]);
});

test("⚠️ AND THE DETAIL DROPS ONLY WHERE THERE IS NOWHERE TO OPEN TO", async ({ page }) => {
  /* the one case: the opened card would be wider than the lane itself. Anything narrower can open,
     so removing words from it is a decision made for the reader. */
  await openRoute(page, "/todo/calendar", { width: 1024, height: 900 });
  await page.waitForTimeout(800);
  const all: Awaited<ReturnType<typeof census>> = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) { await setRangeTo(page, i); all.push(...await census(page)); }
  const dropped = all.filter((r) => r.noDetail);
  console.log(`cards ${all.length} · detail dropped ${dropped.length}`
    + ` · lane ${all[0]?.laneW.toFixed(0)}px`);
  expect(all.length, "cards measured").toBeGreaterThan(8);
  /* every drop must be justified: what it needed WITH the detail exceeded the lane */
  expect(dropped.filter((r) => r.needFull <= r.laneW)
    .map((r) => `${r.rel}: needed ${r.needFull} with its detail, in a ${r.laneW.toFixed(0)}px lane`),
    "a card dropped its detail while it still had somewhere to open to").toEqual([]);

  /**
   * ⚠️ AND NOTHING DROPS ON THIS FIXTURE, WHICH IS REPORTED AND THEN DRIVEN.
   *
   * The narrowest lane the board allows is 434px (at 1024; below that the board keeps a minimum
   * and the page scrolls instead), and the widest content on the harness account needs about
   * 406px. So the drop branch never fires, and the assertion above — "no card dropped its detail
   * while it had somewhere to open to" — is satisfied by nothing dropping at all. A census cannot
   * say whether the branch works; only making a card need more than its lane can.
   *
   * The detail is lengthened on one card and the board is resized by a pixel, which is what makes
   * the fit pass run again (its `ResizeObserver` watches the board, so nothing short of a real
   * size change re-runs it).
   */
  /* ⚠️ THE LANE IS NARROWED THROUGH AN INJECTED STYLESHEET, not by editing the DOM. The first
     attempt lengthened one card's detail text and resized the board to make the fit pass run
     again — and the resize re-renders React, which rewrites `.tl-cdt` from its own props and wiped
     the injected text before anything measured it. A stylesheet rule survives a re-render; the
     element's contents do not. */
  await page.addStyleTag({ content: ".tl-c-tl { max-width: 250px !important; }" });
  /* ⚠️ A REAL WIDTH CHANGE, NOT A PIXEL. The fit pass is re-run by a `ResizeObserver` on the
     BOARD, and the board keeps a minimum width — so 1024→1025 changed the viewport and not the
     board, the pass never re-measured, and it went on deciding against a 434px lane while the
     lanes were 250. It published `data-lane: 434` beside a parent measuring 250, which is the only
     reason that was visible at all. */
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(500);
  const driven = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const cards = ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis);
    const dropped = cards.filter((c) => c.hasAttribute("data-nodetail"));
    const lane = cards[0]?.parentElement?.getBoundingClientRect().width ?? 0;
    const shown = (c: HTMLElement, sel: string) => {
      const e = c.querySelector(sel) as HTMLElement | null;
      return !!e && e.getBoundingClientRect().width > 0;
    };
    return { lane, cards: cards.length, dropped: dropped.length,
      passLane: cards[0]?.dataset.lane, withDetail: cards.filter((c) => c.dataset.hasdetail === "1").length,
      detailStillPainted: dropped.filter((c) => shown(c, ".tl-cdt")).length,
      lostPill: dropped.filter((c) => !shown(c, ".tl-pill")).length,
      lostHeadline: dropped.filter((c) => !shown(c, ".tl-hl")).length };
  });
  console.log(`  driven: lane ${driven.lane.toFixed(0)}px (pass saw ${driven.passLane}) ·`
    + ` ${driven.withDetail} of ${driven.cards} carry a detail · ${driven.dropped} dropped it`);
  /* ⚠️ THE PASS MUST HAVE SEEN THE NARROW LANE, or the case is measuring a board it never
     re-measured — which is exactly what happened first time. */
  expect(Number(driven.passLane), "the fit pass never re-measured the narrowed lane").toBeLessThan(300);
  expect(driven.withDetail, "no card carries a detail to drop").toBeGreaterThan(0);
  expect(driven.dropped, "no card dropped its detail even in a 250px lane").toBeGreaterThan(0);
  expect(driven.detailStillPainted, "a dropped detail is still painted").toBe(0);
  /* ⚠️ AND THE TWO THAT NEVER DROP ARE ASSERTED PRESENT, because "the detail went" is only correct
     if the things a card exists to say survived it. */
  expect(driven.lostPill, "the pill dropped with the detail").toBe(0);
  expect(driven.lostHeadline, "the headline dropped with the detail").toBe(0);
});

test("a tight card opens to what its words need, and its start does not move", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  /* ⚠️ v58 has ONE window; the index that used to pick a wider range is 0 now. See `setRangeTo`. */
  await setRangeTo(page, 0);
  const before = await census(page);
  const subjects = before.filter((r) => r.tight).slice(0, 5);
  expect(subjects.length, "no tight card to open").toBeGreaterThan(1);
  const results: string[] = [];
  for (const s of subjects) {
    const got = await page.evaluate(async (rel) => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
      const c = ([...document.querySelectorAll(".tl-p")] as HTMLElement[])
        .filter(vis).find((x) => x.dataset.rel === rel);
      if (!c) return null;
      const lane = c.parentElement!.getBoundingClientRect();
      const rest = c.getBoundingClientRect();
      c.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
      c.classList.add("tl-force-open");
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const open = c.getBoundingClientRect();
      /* ⚠️ THE INK IS MEASURED WHILE THE CARD IS OPEN — it was measured after the class came off,
         where `.tl-line` is `flex: 1 1 auto` inside a card that has shrunk back and reports zero
         width. One card in five then looked as though it had opened 250px past its own words. A
         measurement has to be taken in the state it is asserting about. */
      const content0 = c.querySelector(".tl-content") as HTMLElement | null;
      const track0 = c.querySelector(".tl-track") as HTMLElement | null;
      const kids0 = content0 ? ([...content0.children] as HTMLElement[])
        .filter((k) => k.getBoundingClientRect().width > 0) : [];
      const inkOpen = kids0.length
        ? Math.max(...kids0.map((k) => k.getBoundingClientRect().left
            + (k.classList.contains("tl-line") && track0 ? track0.scrollWidth : k.getBoundingClientRect().width)))
        : open.left;
      c.classList.remove("tl-force-open");
      /* ⚠️ THE CONTENT'S OWN PAINTED EXTENT, NOT `--exp`. Comparing the opened width against
         `--exp` compares the card with the value that set it — one call, two readings of one
         number — and it passed with 40px added to that very property. What the claim is about is
         whether the WORDS now fit, so the words are measured: from the content's left edge to the
         right edge of the last thing in it, plus the air it pays on the right. */
      const kids = kids0; const track = track0; const inkR = inkOpen;
      return { kidCount: kids.length,
        lineW: (() => { const l = c.querySelector(".tl-line") as HTMLElement | null;
          return l ? `${Math.round(l.getBoundingClientRect().left)}+${track ? track.scrollWidth : 0}` : "none"; })(),
        restL: rest.left, restR: rest.right, openL: open.left, openR: open.right,
        openW: open.width, exp: parseFloat(c.style.getPropertyValue("--exp")) || 0,
        inkRight: inkR, laneL: lane.left, laneR: lane.right };
    }, s.rel);
    expect(got, `${s.rel} vanished`).not.toBeNull();
    const g = got!;
    results.push(`${s.rel}: inkR ${g.inkRight.toFixed(0)} slack ${(g.openR - g.inkRight).toFixed(0)} | ${g.restL.toFixed(0)}→${g.openL.toFixed(0)} w ${g.openW.toFixed(0)} (needs ${g.exp.toFixed(0)}) right ${g.openR.toFixed(0)} lane ends ${g.laneR.toFixed(0)}`);
    /* ⚠️ IT OPENS TO WHAT THE WORDS NEED — measured as ink, and the card must end past the last
       word (the right margin and any fade padding) but not by more than that air. */
    const slack = g.openR - g.inkRight;
    console.log(`  ${s.rel}: openL ${g.openL.toFixed(0)} openR ${g.openR.toFixed(0)} w ${g.openW.toFixed(0)}`
      + ` exp ${g.exp} inkR ${g.inkRight.toFixed(0)} slack ${slack.toFixed(0)} kids ${g.kidCount} line ${g.lineW}`);
    expect(slack, `${s.rel} opened SHORT of its own words by ${(-slack).toFixed(0)}px`).toBeGreaterThan(-1);
    expect(slack, `${s.rel} opened ${slack.toFixed(0)}px past its own words`).toBeLessThan(50);
    /* ⚠️ AND ITS START DOES NOT MOVE — unless opening rightwards would run past the lane, in which
       case it slides left by the minimum and its RIGHT edge lands inside. One of the two holds for
       every card; asserting only the first would forbid a legitimate slide. */
    /* ⚠️ AND A SLIDE MUST BE THE MINIMUM ONE. "Its right edge is inside the lane" permits sliding
       any distance at all — proved: shifting every opened card 60px further left passed. The
       minimum slide is the one that puts the card's right edge ON the lane's edge, so that is what
       is asserted. */
    const stayed = Math.abs(g.openL - g.restL) < 1.5;
    const slid = g.openL < g.restL - 1.5 && Math.abs(g.openR - g.laneR) < 2;
    expect(stayed || slid,
      `${s.rel} moved its start by ${(g.restL - g.openL).toFixed(0)}px and ended ${(g.laneR - g.openR).toFixed(0)}px short of the lane`)
      .toBe(true);
  }
  for (const r of results) console.log(r);
});
