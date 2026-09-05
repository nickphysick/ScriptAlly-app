/**
 * v39 — the faded edge. ⚠️ RETIRED BY v63 §D CORRECTION 1, AS ITS INVERSE.
 *
 * It asserted that a dissolving edge fades to the board's own ground on every colour of card, and
 * it was right about the surface it was written for. The dissolve is DELETED: a gradient over a cut
 * edge was dimming the card's own band, dot and words in order to state a fact about the WINDOW. A
 * card that begins before the window or ends after it is cut by the board's clip — no border and no
 * radius on the cut side, and nothing painted over the top.
 *
 * ⚠️ A LOCK WHOSE SUBJECT HAS BEEN DELETED IS UNPROVED, NOT PASSING. Deleting the file leaves
 * nothing to notice the overlay coming back; keeping the original case leaves a probe that finds no
 * element and reports no offence. The honest form asserts the retirement, on the rendered page,
 * with the population asserted first.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("⚠️ no card carries a fade overlay, a gradient or a mask (v39 → v63 §D)", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0);
    if (!g) return null;
    const cards = [...g.querySelectorAll<HTMLElement>(".tl-p")];
    const painted: string[] = [];
    for (const c of cards) {
      for (const e of [c, ...c.querySelectorAll<HTMLElement>("*")]) {
        const cs = getComputedStyle(e);
        const m = cs.maskImage ?? "none";
        const wm = (cs as unknown as Record<string, string>).webkitMaskImage ?? "none";
        if (/gradient/.test(cs.backgroundImage) || (m !== "none" && m !== "") || (wm !== "none" && wm !== ""))
          painted.push(e.className || e.tagName);
      }
    }
    return { cards: cards.length, fov: document.querySelectorAll(".tl-fov").length, painted: [...new Set(painted)] };
  });
  expect(r, "the calendar did not render").not.toBeNull();
  /* ⚠️ THE POPULATION FIRST — "no fades" is trivially true of a board that drew no cards. */
  expect(r!.cards, "no cards, so the absence below proves nothing").toBeGreaterThan(4);
  expect(r!.fov, "the fade overlay came back").toBe(0);
  /* ⚠️ ASKED OF WHAT IS PAINTED, NOT OF A CLASS NAME. A class check passes the day somebody paints
     a gradient on a different element; this leaves nothing to rename around. */
  expect(r!.painted, `a card carries a gradient or a mask: ${JSON.stringify(r!.painted)}`).toEqual([]);
});
