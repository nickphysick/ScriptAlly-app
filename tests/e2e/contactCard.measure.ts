/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CARD'S GEOMETRY — the one claim that cannot be made anywhere else.
 *
 * ⚠️ A LAYOUT CLAIM IS VERIFIED BY MEASURING A RENDERED PAGE. The unit locks in
 * `contactCard.test.tsx` assert that the wishlist is told `flex: 1; min-height: 0` and that the
 * body clips — which proves the rules were WRITTEN, never that the browser did anything with
 * them. This repo has paid for that distinction more than once: a `flex: 1` chain computing to
 * exactly 0 with every child mounted and styled, a grid growing a hundred phantom tracks through
 * a declaration a lock asserted verbatim, a compensation written as a margin that collapsed away.
 * Every one passed its source lock.
 *
 * ⚠️ IT MEASURES THE LAB, AND THAT IS THE POINT RATHER THAN A COMPROMISE. `#/contact-lab` mounts
 * the REAL `AgentList` with a stubbed db — not a reconstruction — over `contactFixture`'s cast.
 * The harness ACCOUNT cannot serve this claim: measured before this page was rebuilt, its 22
 * agents held ZERO non-empty wishlists, so the overflow being asserted here had no subject and
 * the lock would have gone green having measured a card with nothing in it. The lab also needs no
 * sign-in and writes nothing, which is the amendment's requirement.
 *
 * ⚠️ AND IT ASSERTS ITS PRECONDITIONS FIRST. "The wishlist clears the footer" is trivially true
 * of a wishlist that does not overflow, and "the narrowest three-column width" is a claim about
 * the grid rather than about the card. Both are measured before the claim that rests on them.
 */
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";

const KILL_MOTION = `*, *::before, *::after { transition: none !important; animation: none !important; }`;

/**
 * The two widths. 1101 is one pixel above `agentList.css`'s `max-width: 1100px` two-column step,
 * so it is the NARROWEST viewport at which the three-column rule still holds and therefore the
 * narrowest card that rule produces; 1440 is a width above it, where the 1240 content cap binds
 * and the card is at its widest. A law that holds at exactly one width is a coincidence.
 */
const WIDTHS = [1101, 1440];

/** The fixture's longest wishlist — the instrument. Its card is the only subject here. */
const SUBJECT = "fx-long";

async function openCast(page: import("@playwright/test").Page, width: number) {
  await assertLocalBundleIsDev();
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator('[data-lab-view="cast"]').click();
  await page.addStyleTag({ content: KILL_MOTION });
  await expect(page.locator(`[data-agent-card="${SUBJECT}"]`)).toBeVisible({ timeout: 30_000 });
  /* ⚠️ WAIT FOR THE FONTS, NOT JUST FOR THE ELEMENT. Playfair and JetBrains Mono arrive over the
     network, and every height on this card is text-driven — so a measurement taken before they
     land is a measurement of the fallback face. It cost one intermittent red here: the 1101px
     case failed once in a cold browser and passed in isolation and in every later run, which is
     the signature of a first-run font swap rather than of a layout fault. A flaky lock is worse
     than no lock, because the next reader learns to re-run it. */
  await page.evaluate(() => document.fonts.ready);
  /* one frame for the grid to settle after the swap, before anything is read */
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

test.describe("the wishlist never paints through the footer", () => {
  for (const width of WIDTHS) {
    test(`at ${width}px — three columns, an overflowing wishlist, and it still clears`, async ({ page }) => {
      await openCast(page, width);

      const read = await page.evaluate((subject) => {
        const grid = document.querySelector(".agl-grid") as HTMLElement | null;
        const scene = document.querySelector(`[data-agent-card="${subject}"]`) as HTMLElement | null;
        if (!grid || !scene) return null;
        const box = (el: Element | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, h: r.height, w: r.width };
        };
        const mswl = scene.querySelector(".agl-mswl") as HTMLElement | null;
        const wrap = scene.querySelector(".agl-mswlwrap") as HTMLElement | null;
        return {
          columns: getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
          card: box(scene.querySelector(".agl-acard")),
          scene: box(scene),
          rotor: box(scene.querySelector(".agl-rotor")),
          wish: box(scene.querySelector(".agl-wish")),
          wrap: box(wrap),
          mswl: box(mswl),
          foot: box(scene.querySelector(".agl-foot")),
          body: box(scene.querySelector(".agl-body")),
          bodyClips: scene.querySelector(".agl-body") ? getComputedStyle(scene.querySelector(".agl-body")!).overflow : "",
          scrollH: mswl?.scrollHeight ?? 0,
          clientH: mswl?.clientHeight ?? 0,
          faded: !!wrap?.classList.contains("agl-more"),
        };
      }, SUBJECT);

      expect(read, "the cast did not render — the lab's fixture view is the subject").not.toBeNull();
      const r = read!;
      // eslint-disable-next-line no-console
      console.log(`[${width}] cols=${r.columns} card=${r.card!.w.toFixed(1)}×${r.card!.h.toFixed(1)} ` +
        `wishlist ${r.mswl!.h.toFixed(1)} of ${r.scrollH} · fade=${r.faded} ` +
        `wish.bottom=${r.wish!.bottom.toFixed(1)} foot.top=${r.foot!.top.toFixed(1)}`);

      /* ── PRECONDITION 1: the grid really is three columns here ─────────────────────────── */
      expect(r.columns, "the three-column rule does not hold at this width, so this is not the card it produces").toBe(3);

      /* ── PRECONDITION 2: this wishlist really is overflowing ───────────────────────────────
         Without it the claim below is satisfied by a card with two lines in it, which is exactly
         the fixture-monoculture fault the whole cast exists to prevent. */
      expect(r.scrollH, "the longest fixture wishlist stopped overflowing the narrowest card — the instrument is blunt and every assertion under it is vacuous").toBeGreaterThan(r.clientH + 2);

      /* ── THE CLAIM ─────────────────────────────────────────────────────────────────────── */
      expect(r.wish!.bottom, "the wishlist box painted through the footer").toBeLessThanOrEqual(r.foot!.top + 0.5);
      expect(r.mswl!.bottom, "the wishlist TEXT painted through the footer").toBeLessThanOrEqual(r.foot!.top + 0.5);

      /* the card fills its track exactly — it neither overflows the row nor leaves it short */
      expect(Math.abs(r.card!.h - r.rotor!.h), "the card is no longer the height of its track").toBeLessThan(1);
      expect(r.card!.bottom, "the card grew past its own scene").toBeLessThanOrEqual(r.scene!.bottom + 0.5);

      /* the second line of defence is really in place on the rendered page */
      expect(r.bodyClips, "the body stopped clipping — a mistake in the wishlist would now be published rather than contained").toContain("hidden");

      /* and the fade is showing, because there IS more to read — one answer, two consumers */
      expect(r.faded, "the wishlist overflows and no fade is drawn, so nothing tells the reader there is more").toBe(true);
    });
  }
});

test.describe("a wishlist that fits draws no fade", () => {
  /* ⚠️ THE NEGATIVE CASE, and without it the fade assertion above passes on a card that fades
     unconditionally — which is what a single-length fixture would have shipped. */
  test("the two-line wishlist has no overflow and no fade", async ({ page }) => {
    await openCast(page, 1440);
    const r = await page.evaluate(() => {
      const scene = document.querySelector('[data-agent-card="fx-two"]') as HTMLElement | null;
      const mswl = scene?.querySelector(".agl-mswl") as HTMLElement | null;
      const wrap = scene?.querySelector(".agl-mswlwrap");
      return mswl ? { scrollH: mswl.scrollHeight, clientH: mswl.clientHeight, faded: !!wrap?.classList.contains("agl-more") } : null;
    });
    expect(r, "the two-line case did not render").not.toBeNull();
    // eslint-disable-next-line no-console
    console.log(`[fx-two] ${r!.clientH} of ${r!.scrollH} · fade=${r!.faded}`);
    expect(r!.scrollH, "the short wishlist is overflowing too, so the fixture no longer contains a negative case").toBeLessThanOrEqual(r!.clientH + 2);
    expect(r!.faded, "a fade was drawn over a wishlist with nothing more to read").toBe(false);
  });
});

/**
 * THE DRIFT — the behaviour the small window exists for.
 *
 * ⚠️ THE WINDOW IS ~64px OF A ~337px WISHLIST, BY DESIGN AND BY THE REF'S OWN PROPORTIONS, so the
 * drift is not a flourish: it is the only thing that makes the rest of a long wishlist readable
 * without opening anything. A geometric lock that proved the box clears the footer and stopped
 * there would be satisfied by a card that clips 80% of its content and never moves.
 *
 * ⚠️ AND BOTH MOTION MODES ARE MEASURED. A check that only asserts the drift runs passes on a
 * build where reduced motion has quietly become "the words are unreachable"; a check that only
 * asserts reduced motion is still cannot tell a suppressed animation from a dead one.
 */
test.describe("the wishlist drifts to reveal the rest", () => {
  test("hover drifts it down, and leaving returns it", async ({ page }) => {
    await openCast(page, 1440);
    const card = page.locator(`[data-agent-card="${SUBJECT}"]`);
    const top = () => page.evaluate((s) => (document.querySelector(`[data-agent-card="${s}"] .agl-mswl`) as HTMLElement).scrollTop, SUBJECT);

    expect(await top(), "the wishlist did not start at the top").toBe(0);

    await card.hover();
    /* the hold is 420ms — poll past it rather than sleeping exactly on the boundary */
    await expect.poll(top, { timeout: 6_000, message: "the wishlist never drifted — a long wishlist is then unreadable without opening the agent" })
      .toBeGreaterThan(20);
    const drifted = await top();

    await page.mouse.move(5, 5);
    await expect.poll(top, { timeout: 6_000, message: "the wishlist never came back — the next reader finds it mid-scroll" })
      .toBeLessThan(2);
    // eslint-disable-next-line no-console
    console.log(`[drift] hover reached ${drifted.toFixed(0)}px`);
  });

  /**
   * ⚠️ THE WHEEL IS MEASURED UNDER REDUCED MOTION, AND THAT IS THE ISOLATION RATHER THAN A
   * CONVENIENCE. Asserted with the drift live, "the wheel moved it" is satisfied by the DRIFT
   * moving it — the assertion passes without the wheel doing anything, which is the composed-result
   * fault in miniature. With the drift suppressed nothing else can move the box, so the reading is
   * the wheel's alone; and this is also the case that matters most, because a preference about
   * ANIMATION must never become a reduction in what can be read.
   *
   * ⚠️ AND THE POINTER GOES OVER THE WISHLIST, NOT THE CARD. Hovering the card centres on the
   * genres section and the wheel then scrolls the page instead — which is how this test first
   * failed, reporting a real-looking bug in correct code.
   */
  test("under reduced motion it does not drift, and the wheel still reads it", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openCast(page, 1440);
    const wish = page.locator(`[data-agent-card="${SUBJECT}"] .agl-mswl`);
    const top = () => page.evaluate((s) => (document.querySelector(`[data-agent-card="${s}"] .agl-mswl`) as HTMLElement).scrollTop, SUBJECT);

    await page.locator(`[data-agent-card="${SUBJECT}"]`).hover();
    await page.waitForTimeout(1_200); // comfortably past the 420ms hold
    expect(await top(), "the wishlist drifted under a reduced-motion preference").toBe(0);

    await wish.hover();
    await page.mouse.wheel(0, 80);
    await expect.poll(top, { timeout: 4_000, message: "reduced motion made the rest of the wishlist unreachable — the drift was suppressed AND the scroller went with it" })
      .toBeGreaterThan(0);
  });
});
