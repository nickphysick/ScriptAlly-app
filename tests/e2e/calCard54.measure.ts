import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ THE CARD, THE LEAD-IN AND THE TEXT (v54, Phase 3).
 *
 * ⚠️ THIS FILE REPLACES `calV40Cards.measure.ts`, WHICH ASSERTED THE OPPOSITE. Its two cases were
 * "exactly one card per relationship" and "marks RIDE on their card, and the words start clear of
 * them" — the second is precisely what v54 forbids, and its population guard ("cards carrying at
 * least one mark") is that retired law stated as a requirement, so it failed the moment marks
 * became a lead-in. The first law survives and is asserted below at every range rather than at
 * one; the second is replaced by its inverse, that no mark sits on a card at all. Retired in the
 * same commit rather than left green against a board it no longer describes.
 *
 * Three claims that only hold together: a card is the current wait, the history before it is a
 * lead-in that never touches it, and the words sit at ONE inset because nothing on the card can
 * push them. Measured before this phase, the board rendered text at TWELVE distinct insets — no
 * two rows began their sentence in the same place — because each card placed its words after
 * whichever mark happened to ride on it.
 */
const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
  const cards = [...document.querySelectorAll(".tl-p")].filter(vis) as HTMLElement[];
  const marks = [...document.querySelectorAll(".tl-mk2")].filter(vis) as HTMLElement[];
  const box = (e: HTMLElement) => { const r = e.getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
  return cards.map((c) => {
    const cb = box(c);
    const content = c.querySelector(".tl-content") as HTMLElement | null;
    const frame = c.querySelector(".tl-frame") as HTMLElement | null;
    const kid = content ? ([...content.children].filter(vis)[0] as HTMLElement | undefined) : undefined;
    /* a mark is "on" this card when its centre lies within the card's box on the card's own line */
    const on = marks.filter((m) => { const mb = box(m);
      return mb.cy > cb.t - 30 && mb.cy < cb.b + 30 && mb.cx > cb.l + 0.6 && mb.cx < cb.r - 0.6; });
    /* every mark on this card's LINE, so the lead-in claim can be made about the right ones */
    const line = marks.filter((m) => { const mb = box(m);
      return mb.cy > cb.t - 30 && mb.cy < cb.b + 30; });
    const maskOf = (e: HTMLElement | null) => {
      if (!e) return "none";
      const cs = getComputedStyle(e);
      const wk = (cs as unknown as Record<string, string>).webkitMaskImage;
      return cs.maskImage !== "none" ? cs.maskImage : (wk && wk !== "none" ? wk : "none");
    };
    return {
      rel: c.dataset.rel || "", fadeL: c.classList.contains("fadeL"), fadeR: c.classList.contains("fadeR"),
      cardL: cb.l, cardR: cb.r,
      inset: kid ? Math.round((box(kid).l - cb.l) * 10) / 10 : null,
      onCard: on.length,
      pastEdge: line.filter((m) => box(m).r > cb.l + 0.6).length,
      contentMask: maskOf(content), cardMask: maskOf(c), frameMask: maskOf(frame),
      contentOpacity: content ? getComputedStyle(content).opacity : null,
      hasFrame: !!frame, hasContent: !!content,
      tier: c.dataset.tier || "none",
      hasWords: !!c.querySelector(".tl-line") && vis(c.querySelector(".tl-line") as Element),
    };
  });
});

test("one card per relationship, marks before it, text at one inset — every range", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  const seen = new Set<string>();
  const insets = new Set<string>();
  let totalCards = 0, bothFades = 0, stubs = 0, marksSeen = 0;
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    const rows = await read(page);
    seen.add(RANGE_LABELS[i]);
    totalCards += rows.length;
    bothFades += rows.filter((r) => r.fadeL && r.fadeR).length;
    expect(rows.length, `[${RANGE_LABELS[i]}] no cards drawn`).toBeGreaterThan(8);

    /* one card per relationship */
    const per = new Map<string, number>();
    for (const r of rows) if (r.rel) per.set(r.rel, (per.get(r.rel) ?? 0) + 1);
    expect([...per.entries()].filter(([, n]) => n > 1).map(([k]) => k),
      `[${RANGE_LABELS[i]}] a relationship drawn as more than one card`).toEqual([]);

    /**
     * ⚠️ THE LEAD-IN MUST EXIST, OR "NO MARK SITS ON A CARD" IS SATISFIED BY DRAWING NONE.
     *
     * Proved, not supposed: restoring the card to the window's edge — the v40 model — makes every
     * mark fall inside a card, so the lead-in filter drops all of them and the board renders zero
     * marks. Both mark assertions below then pass over an empty set, and the lock reports a clean
     * result about a board that has lost its whole history. The population is asserted per range,
     * because a range can legitimately hold fewer and none is never legitimate.
     */
    const drawnMarks = await page.evaluate(() =>
      [...document.querySelectorAll(".tl-mk2")].filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0).length);
    const leadRuns = await page.evaluate(() =>
      [...document.querySelectorAll(".tl-leadin")].filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0).length);
    marksSeen += drawnMarks;
    expect(drawnMarks, `[${RANGE_LABELS[i]}] the board drew no lead-in marks at all`).toBeGreaterThan(2);
    expect(leadRuns, `[${RANGE_LABELS[i]}] no dotted run to a card's leading edge`).toBeGreaterThan(0);

    /* every mark's painted right edge is left of its card's leading edge */
    expect(rows.filter((r) => r.onCard > 0).map((r) => `${r.rel}: ${r.onCard} marks on the card`),
      `[${RANGE_LABELS[i]}] a mark sits on a card`).toEqual([]);
    expect(rows.filter((r) => r.pastEdge > 0).map((r) => `${r.rel}: ${r.pastEdge} marks past the leading edge`),
      `[${RANGE_LABELS[i]}] a mark reaches past its card's leading edge`).toEqual([]);

    /* ⚠️ ONE ASSERTION ACROSS ALL ROWS, which is what makes it fail on sight. The pair is the
       claim: a card whose left edge is dissolving takes the wider inset, every other card the
       pinned one, and NOTHING else is permitted. A per-card check would pass on a board with
       twelve different insets so long as each was "reasonable". */
    /* ⚠️ A STUB IS CARVED OUT, AND THE CARVE-OUT IS PROVED RATHER THAN ASSERTED. A stub is a 54px
       disc holding a centred 18px dot and NO words — its "inset" is a centring offset, so it
       reported 18 and looked like a third text inset. A carve-out that merely named the tier would
       exempt whatever else someone later filed under it; this one requires the stub to have no
       words, which is the only reason it is exempt. */
    for (const r of rows.filter((x) => x.tier === "stub")) {
      expect(r.hasWords, `[${RANGE_LABELS[i]}] ${r.rel} is a stub and draws words`).toBe(false);
      stubs += 1;
    }
    for (const r of rows.filter((x) => x.tier !== "stub")) {
      if (r.inset != null) insets.add(`${r.fadeL ? "fadeL" : "flat"}:${r.inset}`);
    }
  }
  console.log(`ranges ${[...seen].join("/")} · cards ${totalCards} · both-ends-cut ${bothFades} · stubs (no words) ${stubs} · lead-in marks ${marksSeen}`);
  console.log(`insets across the whole sweep: ${[...insets].sort().join(" · ")}`);
  expect(seen.size, "ranges visited").toBe(RANGE_LABELS.length);
  /* ⚠️ THE SET IS ASSERTED AGAINST THE TWO PINNED VALUES, not against itself. Filtering the
     expectation by what was measured would make the assertion "the insets are the insets" — green
     over any board at all, which is the vacuous shape this repo already records. Both must be
     present, so a board that lost one is a failure rather than a narrower pass. */
  expect([...insets].sort(), "the board draws its text at other than the two pinned insets")
    .toEqual(["fadeL:42", "flat:13"]);
});

test("⚠️ a card cut at BOTH ends still paints its words at full opacity", async ({ page }) => {
  /**
   * ⚠️ THE MASK IS THE FRAME'S AND MUST NEVER REACH THE TEXT. A mask erases everything inside the
   * element it is set on; it was set on the CARD, which is the element containing the words, so a
   * clipped card dissolved its own sentence with its fill. Measured before this phase: 22 of 23
   * cards masked and 14 rows with text inside a dissolving zone, 26px of ink on thirteen of them.
   *
   * The claim is composed and is about the DOM's shape, not about a declaration: the frame carries
   * a mask, the content carries none, and no element between the content and the card carries one
   * either — which is the only way "the words are not dissolved" can be true for every word rather
   * than for the ones a probe happened to sample.
   */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  /* ⚠️ EVERY RANGE, BECAUSE AN UNCUT CARD DOES NOT EXIST AT EVERY RANGE. At Month every wait on
     the fixture predates a 31-day window and every card is live, so all 22 are cut at both ends
     and the "not cut" half of the claim has nothing to stand on. A wider window brings waits
     inside it. The population guard below is what turned that into a failure rather than a pass. */
  const rows: Awaited<ReturnType<typeof read>> = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    rows.push(...await read(page));
  }
  const both = rows.filter((r) => r.fadeL && r.fadeR);
  console.log(`cards ${rows.length} · cut at both ends ${both.length}`
    + ` · frames masked ${rows.filter((r) => r.frameMask !== "none").length}`
    + ` · contents masked ${rows.filter((r) => r.contentMask !== "none").length}`
    + ` · cards masked ${rows.filter((r) => r.cardMask !== "none").length}`);
  /* ⚠️ POPULATION FIRST — the claim is about cards cut at both ends, and a board with none of them
     satisfies "no such card dissolves its text" by having nothing to dissolve. */
  expect(both.length, "no card is cut at both ends, so nothing was checked").toBeGreaterThan(3);
  expect(rows.every((r) => r.hasFrame && r.hasContent), "a card has no frame/content split").toBe(true);
  expect(both.filter((r) => r.frameMask === "none").map((r) => r.rel),
    "a card cut at both ends has no mask on its frame").toEqual([]);
  /**
   * ⚠️ AND THE OTHER HALF, WHICH THIS LOCK DID NOT HAVE AND WHICH IS HOW IT MISSED A REAL BUG.
   *
   * It asserted only that a CUT card is masked. An unbounded `str.replace` had put the fade rules
   * on a bare `.tl-frame` selector, so every frame on the board was masked at both ends whatever
   * its fade state — and the lock reported "frames masked 22" out of 22, which reads as complete
   * coverage rather than as the fault it was. A mask is a claim that an edge is CUT; on a card
   * that is not cut it dissolves an edge that is simply there.
   */
  const uncut = rows.filter((r) => !r.fadeL && !r.fadeR);
  console.log(`  uncut cards on this fixture: ${uncut.length}`);
  /**
   * ⚠️ AND THE FIXTURE HAS NONE, WHICH IS REPORTED RATHER THAN PAPERED OVER. A card is `fadeR`
   * whenever the relationship is still running, and every relationship on the harness account is
   * — the `Closed` tab reads 0. So an uncut card needs a closed relationship whose named end falls
   * inside the window, and there is not one at any range: 64 cards, 0 uncut. A census can say
   * nothing about this half, so the state is DRIVEN on a real card and the paint is read back.
   */
  const driven = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const c = [...document.querySelectorAll(".tl-p")].filter(vis)[0] as HTMLElement | undefined;
    const f = c?.querySelector(".tl-frame") as HTMLElement | null;
    if (!c || !f) return null;
    const had = [...c.classList];
    const maskOf = () => { const cs = getComputedStyle(f);
      const wk = (cs as unknown as Record<string, string>).webkitMaskImage;
      return cs.maskImage !== "none" ? cs.maskImage : (wk && wk !== "none" ? wk : "none"); };
    const cut = maskOf();
    c.classList.remove("fadeL", "fadeR");
    const flat = maskOf();
    c.className = had.join(" ");
    return { cut, flat };
  });
  expect(driven, "no card to drive").not.toBeNull();
  console.log(`  driven: cut mask ${driven!.cut.slice(0, 26)}… · uncut mask ${driven!.flat}`);
  expect(driven!.cut, "a cut card carries no mask").not.toBe("none");
  expect(driven!.flat, "a card that is not cut still dissolves its own edge").toBe("none");
  expect(rows.filter((r) => r.contentMask !== "none").map((r) => `${r.rel}: ${r.contentMask.slice(0, 40)}`),
    "the words carry a mask").toEqual([]);
  expect(rows.filter((r) => r.cardMask !== "none").map((r) => `${r.rel}: ${r.cardMask.slice(0, 40)}`),
    "the CARD carries a mask, so it reaches the words it contains").toEqual([]);
  expect([...new Set(rows.map((r) => r.contentOpacity))], "the words are not at full opacity").toEqual(["1"]);
});
