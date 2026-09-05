/**
 * v55 — the fades. ⚠️ THREE CASES RETIRED BY v63 §D CORRECTION 1; ONE KEPT, BECAUSE IT WAS NEVER
 * ABOUT THE FADE.
 *
 * The three that go asserted that a card's fades follow its DATES rather than its classes, that a
 * card ending inside the window carries no mask, and that a card's right edge is its resolved end.
 * The fade overlay is deleted — a gradient over a cut edge dimmed the card's own band, dot and
 * words to state a fact about the window — so all three probe an element nothing renders.
 *
 * ⚠️ THE FOURTH IS KEPT VERBATIM AND IS THE POINT OF NOT DELETING THE FILE. "No relationship row is
 * missing its card, and none is zero-width" is a claim about the BOARD, not about the fade: it
 * catches a row whose bar failed to build, which no amount of rebuilding the card's edges makes
 * less true. Retiring a file wholesale is how a live claim disappears inside a dead one.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("⚠️ a card's cut edges follow its DATES, and nothing is painted over them (v55 → v63 §D)", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0);
    if (!g) return null;
    const cards = [...g.querySelectorAll<HTMLElement>(".tl-p")];
    return {
      n: cards.length,
      fov: document.querySelectorAll(".tl-fov").length,
      /* ⚠️ RETARGETED BY v64 §F: only the ONGOING edge (`fadeR`, at today) is borderless now.
         A window cut (`fadeL`/`clipR`) keeps its hairline — the card is a whole object stopping
         6px short of the lane. The fade-overlay half of the claim is unchanged. */
      wrong: cards.filter((c) => {
        const f = c.querySelector<HTMLElement>(".tl-frame"); if (!f) return true;
        const cs = getComputedStyle(f);
        const today = c.classList.contains("fadeR");
        return cs.borderLeftWidth !== "1px" || cs.borderRightWidth !== (today ? "0px" : "1px");
      }).map((c) => c.querySelector(".tl-fnm")?.textContent?.trim() ?? "?"),
    };
  });
  expect(r, "the calendar did not render").not.toBeNull();
  expect(r!.n, "no cards to check").toBeGreaterThan(4);
  expect(r!.fov, "the fade overlay came back").toBe(0);
  expect(r!.wrong, `a card's edges do not follow its cuts: ${JSON.stringify(r!.wrong)}`).toEqual([]);
});

test("no relationship row is missing its card, and none is zero-width", async ({ page }) => {
  /* ⚠️ KEPT FROM v55 VERBATIM IN CLAIM. This is about the BOARD, not the fade: it catches a row
     whose bar failed to build. Nothing about the card's edges makes it less true. */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0);
    if (!g) return null;
    const rows = [...g.querySelectorAll<HTMLElement>(".tl-rrow")];
    return {
      rows: rows.length,
      empty: rows.filter((row) => !row.querySelector(".tl-p")).length,
      thin: rows.flatMap((row) => [...row.querySelectorAll<HTMLElement>(".tl-p")])
        .filter((c) => c.getBoundingClientRect().width < 2).length,
    };
  });
  expect(r, "the calendar did not render").not.toBeNull();
  expect(r!.rows, "no rows").toBeGreaterThan(4);
  expect(r!.empty, `${r!.empty} rows drew no card`).toBe(0);
  expect(r!.thin, `${r!.thin} cards are zero-width`).toBe(0);
});
