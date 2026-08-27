/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE AT BOTH ENDS OF ITS CONTENT RANGE ════════════════════════════════════════
 *
 * ⚠️ THE POPULATED CASE IS THE TALL ONE, AND EVERY FIXTURE IN THE HARNESS IS POPULATED. The
 * profile's overflow has fallen 307 → 100 → 33px across three amendments, and a page that
 * overflows by LESS than its chrome sheds when it settles cannot settle stably — Noteboard cycled
 * 37 times at 47px. So the case worth measuring is the one nobody had: a book with nothing in it.
 *
 * ⚠️ AND IT IS TWO CASES BECAUSE ONE WOULD BE A MONOCULTURE. A sweep whose every subject is in one
 * state exercises one branch and reports a green about the rest. The two fixtures are chosen to sit
 * in DIFFERENT scroll regimes, and the run asserts that both regimes were actually entered — a
 * fixture that drifted into one state would otherwise go quietly green.
 *
 * ⚠️ TYPE IS STRUCTURAL, NOT CONTENT-DEPENDENT. Manuscripts is Type A whether or not today's
 * content overflows, exactly as Calendar is. So the empty case's claim is NOT "it sticks" — there
 * is nothing to scroll — but that it RESTS correctly: at the row's top edge, unstuck, indistinguish-
 * able from a page that simply has no reason to move. A clamped header and a resting one differ
 * only when there is scroll, which is why the populated case has to exist alongside it.
 *
 * The empty fixture is seeded and removed by `tests/e2e/seedEmptyManuscript.mjs`.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const ROW = ".msv-wpg .wpg-scroll";
const EMPTY_ID = "seed-ms-empty";

interface Reading {
  scrollTop: number; overflow: number; rowOverflowY: string; stuck: boolean;
  position: string; chromeTop: number; rowTop: number; chromeAboveTabs: number | null;
  title: string | null; nested: number; stickies: string[];
}

const read = (page: import("@playwright/test").Page) => page.evaluate((sel): Reading | null => {
  const row = document.querySelector(sel) as HTMLElement | null;
  const chrome = document.querySelector(".msv-wpg .wpg-chrome") as HTMLElement | null;
  if (!row || !chrome) return null;
  const cs = getComputedStyle(chrome);
  const tabs = document.querySelector(".msv-wpg .msp-tabs") as HTMLElement | null;
  return {
    scrollTop: row.scrollTop,
    overflow: row.scrollHeight - row.clientHeight,
    rowOverflowY: getComputedStyle(row).overflowY,
    stuck: chrome.className.includes("wpg-chrome--stuck"),
    position: cs.position,
    chromeTop: Math.round(chrome.getBoundingClientRect().top),
    rowTop: Math.round(row.getBoundingClientRect().top),
    /* The figure three amendments have been reducing — REPORTED, never asserted against a target:
       a threshold tuned to today's content fails the next deliberate reduction as a regression. */
    chromeAboveTabs: tabs
      ? Math.round(tabs.getBoundingClientRect().top - row.getBoundingClientRect().top + row.scrollTop)
      : null,
    title: document.querySelector(".msv-wpg .msv-platetitle")?.textContent?.trim() ?? null,
    nested: [...row.querySelectorAll("*")].filter((e) => {
      const o = getComputedStyle(e as HTMLElement).overflowY;
      return (o === "auto" || o === "scroll")
        && (e as HTMLElement).scrollHeight > (e as HTMLElement).clientHeight + 4;
    }).length,
    stickies: [...row.querySelectorAll("*")]
      .filter((e) => getComputedStyle(e as HTMLElement).position === "sticky")
      .map((e) => (e as HTMLElement).className.toString().slice(0, 40)),
  };
}, ROW);

/** The downward pass, in small steps — oscillation only shows near the threshold. */
const sweep = (page: import("@playwright/test").Page) => page.evaluate(async (sel) => {
  const row = document.querySelector(sel) as HTMLElement;
  const chrome = document.querySelector(".msv-wpg .wpg-chrome") as HTMLElement;
  const stuckNow = () => chrome.className.includes("wpg-chrome--stuck");
  row.scrollTop = 0;
  await new Promise((r) => setTimeout(r, 400));
  let last = stuckNow();
  let n = 0;
  const at: number[] = [];
  for (let y = 0; y <= row.scrollHeight - row.clientHeight; y += 6) {
    row.scrollTop = y;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const now = stuckNow();
    if (now !== last) { n++; at.push(y); last = now; }
  }
  return { flips: n, at, maxScroll: row.scrollHeight - row.clientHeight };
}, ROW);

/**
 * ⚠️ ONE TEST, BOTH FIXTURES — because module state does not survive between Playwright tests.
 * The first version collected each case into a shared array and asserted over it in a third test;
 * that array was empty, so the guard against a one-state sweep reported `0` and proved nothing.
 * A cross-case claim has to be made inside the case that can see both.
 */
test("the book profile rests and settles at both ends of its content range", async ({ page }) => {
  const seen: {
    name: string; overflow: number; chromeAboveTabs: number | null; flips: number;
    at: number[]; title: string | null; reached: number; stuckWhenScrolled: boolean | null;
    releases: boolean | null;
  }[] = [];

  for (const c of [
    { name: "populated", route: "/manuscripts" },
    { name: "empty", route: `/manuscripts?m=${EMPTY_ID}` },
  ]) {
    await openRoute(page, c.route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);

    /* The populated case still arrives on the shelf, so a book has to be opened. The empty case
       navigates straight to its own dossier by param — which the view-as-a-route change bought. */
    if (c.name === "populated") {
      const card = page.locator(".mlib-card, .mlib-open, [data-manuscript]").first();
      if (await card.count()) { await card.click(); await page.waitForTimeout(500); }
    }

    const rest = await read(page);
    expect(rest, `${c.name}: the scroll row or the chrome is not on the page`).not.toBeNull();
    expect(rest!.rowOverflowY, `${c.name}: the row is not a scroller`).toMatch(/auto|scroll/);
    expect(rest!.nested, `${c.name}: something inside the row opens a second scrollport`).toBe(0);

    /* ── AT REST, whatever the content: the slab sits at the row's top edge and is not stuck ── */
    expect(rest!.scrollTop, `${c.name}: did not start at the top`).toBe(0);
    expect(rest!.position, `${c.name}: the slab is not sticky at all`).toBe("sticky");
    expect(rest!.stuck, `${c.name}: stuck at scroll-top — clamping, not idling`).toBe(false);
    expect(Math.abs(rest!.chromeTop - rest!.rowTop), `${c.name}: the slab is not at the row's top edge`)
      .toBeLessThan(6);

    const flip = await sweep(page);
    let reached = 0;
    let stuckWhenScrolled: boolean | null = null;
    let releases: boolean | null = null;
    let restMax = rest!.overflow;
    let settledMaxOut: number | null = null;

    /**
     * ⚠️ REPEATED TRIALS, BECAUSE ONE READING OF THIS WAS NOT REPRODUCIBLE. The same code returned
     * a settled scrollTop of 7, then 21, then 0 on three consecutive runs — so a single reading is
     * not evidence of anything, and an assertion tuned until it passed would have been tuned onto
     * noise. What is stable is whether the header STICKS and whether it RELEASES; where the row
     * comes to rest afterwards is the browser's scroll-anchoring pass answering the settle, and it
     * is recorded rather than claimed.
     */
    const trials: { set: number; landed: number; stuck: boolean; max: number }[] = [];
    if (rest!.overflow > 4) {
      for (let t = 0; t < 3; t++) {
        await page.evaluate((sel) => { (document.querySelector(sel) as HTMLElement).scrollTop = 0; }, ROW);
        await page.waitForTimeout(400);
        const target = (await read(page))!.overflow;
        await page.evaluate(([sel, y]) => {
          (document.querySelector(sel as string) as HTMLElement).scrollTop = y as number;
        }, [ROW, target] as const);
        await page.waitForTimeout(400);
        const after = await read(page);
        trials.push({ set: target, landed: after!.scrollTop, stuck: after!.stuck, max: after!.overflow });
      }
      reached = Math.max(...trials.map((t) => t.landed));
      stuckWhenScrolled = trials.some((t) => t.stuck);
      settledMaxOut = trials[trials.length - 1].max;
      restMax = rest!.overflow;

      /**
       * ⚠️ THE CLAIM IS THAT SCROLLING STICKS THE HEADER AT LEAST ONCE, across three attempts.
       * Requiring all three would encode the anchoring noise above into the assertion.
       */
      expect(stuckWhenScrolled, `${c.name}: scrolling never stuck the header in three attempts`)
        .toBe(true);

      await page.evaluate((sel) => { (document.querySelector(sel) as HTMLElement).scrollTop = 0; }, ROW);
      await page.waitForTimeout(400);
      releases = !(await read(page))!.stuck;
      expect(releases, `${c.name}: the header latched — it stuck once and never released`).toBe(true);
    } else {
      expect(rest!.stuck, `${c.name}: no scroll, and the header is stuck — that is a clamp`).toBe(false);
    }

    /**
     * ⚠️ THE OSCILLATION CLAIM, AND IT IS THE POINT OF THE EMPTY FIXTURE. Settling RECLAIMS height;
     * on a page overflowing by less than the settle reclaims, the reclaim destroys the scroll the
     * settled state derives from and the header cycles — Noteboard did it 37 times at 47px. The
     * empty book overflows by an order less than that, so this is the sharpest test of the claim
     * that the grid's spacer holds max scroll constant through a settle.
     */
    expect(flip.flips, `${c.name}: the header oscillated (${flip.flips} flips at ${flip.at.join(", ")})`)
      .toBeLessThanOrEqual(1);

    seen.push({
      name: c.name, overflow: rest!.overflow, chromeAboveTabs: rest!.chromeAboveTabs,
      flips: flip.flips, at: flip.at, title: rest!.title, reached, stuckWhenScrolled, releases,
      restMax, settledMax: settledMaxOut, trials,
    });
  }

  /**
   * ⚠️ THE GUARD AGAINST A ONE-STATE SWEEP: the two cases must be two BOOKS. Anything less and every
   * assertion above proves one subject twice — the monoculture that reads as a census.
   *
   * ⚠️ AND THE EMPTY CASE IS PINNED BY NAME, not merely "different from the other one". Without it
   * the fixture could silently stop existing, the param would resolve to nothing, the page would
   * fall back to some other book, and the sweep would go green having measured the populated case
   * twice — which is exactly the drift this whole file was written to catch.
   */
  const [pop, empty] = seen;
  expect(empty.title, "the empty fixture did not render — the sweep measured another book")
    .toBe("Nothing In It Yet");
  expect(pop.title, "the two cases rendered the same manuscript").not.toBe(empty.title);

  /**
   * ⚠️ THE OVERFLOW IS CHROME-DOMINATED, NOT CONTENT-DOMINATED, AND THAT WAS A SURPRISE. I expected
   * the empty book to be the shorter page and asserted it; both measure the SAME overflow at
   * 1440×900, because at this viewport the height comes from the fixed chrome rather than from what
   * the tab pane holds. Reported rather than asserted in either direction — the figure is a fact
   * about today's chrome, and a threshold on it would fail the next deliberate reduction.
   */
  expect(seen.length, "a case did not report").toBe(2);

  console.log(JSON.stringify(seen, null, 1));
});
