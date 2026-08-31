import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ THE GHOST'S PAINT, AND THE COUNT ON THIS ACCOUNT (v40, Phase 7).
 *
 * A relationship silent past `GHOST_AFTER_DAYS` with nothing scheduled has ended in every sense
 * except that nobody wrote it down. The board stops drawing it as live work — and it must NOT be
 * drawn as a recorded closure, because an agency's silence is not a decision anyone made.
 *
 * ⚠️ THE COUNT IS REPORTED, NOT ASSERTED AT A TARGET. How many ghosts a board holds is a fact
 * about the fixture rather than about the page; asserting a number would fail the day the harness
 * account changed and would say nothing about whether the treatment is right. What IS asserted is
 * that the census ran and that a ghost, where one exists, is distinguishable from a closed card.
 */
test("the ghost count on this account, and how far the longest silence has run", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const out = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const cards = [...document.querySelectorAll(".tl-p")].filter(vis) as HTMLElement[];
    const tally: Record<string, number> = {};
    for (const c of cards)
      for (const k of ["out", "req", "quiet", "ghost", "closedp", "remind", "decide"])
        if (c.classList.contains(k)) tally[k] = (tally[k] ?? 0) + 1;
    const days = cards
      .filter((c) => c.classList.contains("quiet") || c.classList.contains("ghost"))
      .map((c) => Number((/Quiet for (\d+) day/.exec(c.textContent || "") || [])[1] ?? 0));
    return { cards: cards.length, tally, longest: days.length ? Math.max(...days) : 0 };
  });
  console.log(`cards ${out.cards} · families ${JSON.stringify(out.tally)} · ghosts ${out.tally.ghost ?? 0}`
    + ` · longest silence on this account ${out.longest} days (threshold 180)`);
  expect(out.cards, "cards drawn").toBeGreaterThan(8);
  /* ⚠️ AND THE CENSUS IS PRINTED SO A MONOCULTURE IS VISIBLE. Every card at one family would pass
     a count and prove nothing about the treatment. */
  expect(Object.keys(out.tally).length, "every card is in one family").toBeGreaterThan(2);
});

test("⚠️ a ghost is drawn as OVER without being drawn as CLOSED", async ({ page }) => {
  /**
   * ⚠️ DRIVEN, BECAUSE THE FIXTURE CANNOT REACH IT. The longest silence on the harness account is
   * 42 days against a 180-day threshold, so no census can say anything about this treatment — the
   * same split the stub rung needed. When the state begins is arithmetic and is locked in
   * `journeyBars.test.ts`; what it LOOKS like is paint, and only a rendered page can answer it.
   *
   * The claim is a comparison rather than a value: a ghost must differ from BOTH a live card and a
   * closed one. Pinning its border colour would be a lock that fails on every legitimate restyle;
   * "it is not the same as either of its neighbours" survives one and still catches a ghost
   * silently taking the closed treatment.
   */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const got = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const cards = [...document.querySelectorAll(".tl-p")].filter(vis) as HTMLElement[];
    /* ⚠️ A REPRESENTATIVE LIVE CARD, NOT THE FIRST `out` ONE. The first is hollow — a stretch past
       its own named end — so it already paints transparent with a dashed border, and comparing a
       ghost against it would have reported "different" for the wrong reason, or "the same" and
       looked like a real fault. The subject of a comparison has to be typical of what it stands
       for. */
    const live = cards.find((c) => c.classList.contains("out")
      && !c.classList.contains("hollow") && !c.classList.contains("closedp")) as HTMLElement | undefined;
    const subject = cards.find((c) => c.classList.contains("quiet")) as HTMLElement | undefined;
    if (!live || !subject) return null;
    /* ⚠️ THE FRAME, NOT THE CARD (v54). The card is geometry now and paints nothing; background,
       border and shadow moved to its `.tl-frame` child, so reading the card's own computed style
       returns the same transparent nothing for every state and "a ghost is drawn exactly like a
       live card" became true of every pair on the board. */
    const read = (el: HTMLElement) => {
      const cs = getComputedStyle(el.querySelector(".tl-frame") as HTMLElement ?? el);
      return { bg: cs.backgroundColor, style: cs.borderTopStyle, colour: cs.borderTopColor,
        shadow: cs.boxShadow };
    };
    const quiet = read(subject);
    subject.classList.remove("quiet"); subject.classList.add("ghost");
    const ghost = read(subject);
    subject.classList.remove("ghost"); subject.classList.add("closedp");
    const closed = read(subject);
    subject.classList.remove("closedp"); subject.classList.add("quiet");
    return { live: read(live), quiet, ghost, closed };
  });
  expect(got, "no live card and no quiet card to compare against").not.toBeNull();
  const g = got!;
  console.log(`live   ${JSON.stringify(g.live)}\nquiet  ${JSON.stringify(g.quiet)}`
    + `\nghost  ${JSON.stringify(g.ghost)}\nclosed ${JSON.stringify(g.closed)}`);
  /* it has stopped being live work */
  expect(JSON.stringify(g.ghost), "a ghost is drawn exactly like a live card").not.toBe(JSON.stringify(g.live));
  expect(g.live.style, "the live comparison card is not solid — it is not representative").toBe("solid");
  expect(g.ghost.style, "a ghost keeps a solid border, so it still reads as live work").toBe("dashed");
  /* and it is not a recorded closure */
  expect(JSON.stringify(g.ghost), "a ghost is indistinguishable from a recorded closure")
    .not.toBe(JSON.stringify(g.closed));
  expect(g.ghost.colour, "a ghost took the closed card's line colour").not.toBe(g.closed.colour);
});
