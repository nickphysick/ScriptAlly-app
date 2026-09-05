/**
 * v58 — the cap and the mark. ⚠️ RETIRED BY v63 §E, AS ITS INVERSE.
 *
 * Three cases asserted that a cap and a terminal mark travel as a pair, that a card running to
 * today carries neither, and that the mark's shape and the cap's tone say whose date it is. They
 * were right about the surface they were written for. §E replaced the whole apparatus: an action is
 * one mark standing on its own date — a ring at rest, a label and a button on the row's hover — and
 * the cap went with the side-strip flag it belonged to.
 *
 * ⚠️ THE CLAIM THAT SURVIVES IS "WHOSE DATE IT IS", and it survives in a better place: the action's
 * GLYPH says it (hourglass the agency's window, flag the writer's own deadline, bell a reminder),
 * which `calAct63` asserts per kind. This file's job is now to notice the cap coming back.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("⚠️ the cap is retired and the action mark replaced it (v58 → v63 §E)", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0);
    if (!g) return null;
    return {
      rows: g.querySelectorAll(".tl-rrow").length,
      caps: document.querySelectorAll(".tl-cap").length,
      acts: g.querySelectorAll(".tl-act").length,
      /* the terminal mark SURVIVES — it sits on a card's end edge and is not the retired cap */
      tmarks: g.querySelectorAll(".tl-tmark").length,
    };
  });
  expect(r, "the calendar did not render").not.toBeNull();
  expect(r!.rows, "no rows, so the absence below proves nothing").toBeGreaterThan(4);
  expect(r!.caps, "the cap came back").toBe(0);
  /* ⚠️ A SWAP, NOT A DELETION. Asserting only the absence would pass on a board that had lost both,
     which is the failure this whole family of retirements has to avoid. */
  expect(r!.acts, "the cap went and no action mark took its place").toBeGreaterThan(3);
});
