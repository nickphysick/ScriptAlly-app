import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
test("the Scout's free state fits inside its own card", async ({ page }) => {
  await openRoute(page, "/manuscripts/comps", { width: 1440, height: 1100 });
  const r = await page.evaluate(() => {
    const up = document.querySelector(".ct-upsell") as HTMLElement | null;
    if (!up) return null;
    const card = up.closest(".ct-panel") as HTMLElement;
    const ghost = up.querySelector(".ghost") as HTMLElement;
    const lock = up.querySelector(".lockwrap") as HTMLElement;
    const h3 = up.querySelector("h3") as HTMLElement;
    const p = up.querySelector("p") as HTMLElement;
    const btn = up.querySelector("button") as HTMLElement;
    const c = card.getBoundingClientRect();
    const rect = (e: HTMLElement) => { const b = e.getBoundingClientRect(); return { t: Math.round(b.top - c.top), b: Math.round(b.bottom - c.top), h: Math.round(b.height) }; };
    return {
      cardH: Math.round(c.height), clip: getComputedStyle(card).overflow,
      ghost: rect(ghost), lock: rect(lock), h3: rect(h3), p: rect(p), btn: rect(btn),
      ghostLockOverlap: Math.round(ghost.getBoundingClientRect().bottom - lock.getBoundingClientRect().top),
      /* does the last thing in the card fall past the card's own bottom edge? */
      overflowPx: Math.round(btn.getBoundingClientRect().bottom - c.bottom),
    };
  });
  expect(r, "the free Scout did not render").not.toBeNull();
  console.log(JSON.stringify(r, null, 1));
  /* ⚠️ THE CARD MUST CONTAIN ITS OWN CTA. `.ct-panel` clips, so anything past its bottom edge is
     simply gone — this measured +77 before the fix, with the paragraph cut mid-sentence and the
     upgrade button absent. Nothing in the unit locks could see it: every declaration was valid. */
  expect(r!.overflowPx, "the upgrade button falls outside the card and is clipped away").toBeLessThanOrEqual(0);
  /* ⚠️ A SMALL OVERLAP IS THE VEIL AND IS INTENDED; a large one means the lockwrap has gone out of
     flow again, which is exactly how this broke — an `position: absolute` duplicate contributed no
     height, so the card measured the teaser and hosted something twice its size. */
  expect(r!.ghostLockOverlap, "the lockwrap has left the flow — the card no longer measures its own content")
    .toBeLessThanOrEqual(40);
  /* and the heading must still start below the teaser's top, or it is sitting ON the card rather than under it */
  expect(r!.h3.t, "the heading has climbed above the teaser").toBeGreaterThan(r!.ghost.t);
});
