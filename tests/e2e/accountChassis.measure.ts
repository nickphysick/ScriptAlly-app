/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The settings page's ONE scroll region — the last claim of the old chassis that outlived it.
 *
 * ⚠️ THIS FILE LOST FOUR CASES AND `accountLayout.measure.ts` LOST SIXTEEN, and none of them
 * FAILED — their SUBJECTS were retired by the settings-mode pack. Recorded rather than deleted
 * quietly, because "a suite went from 21 cases to 1" is the sort of thing that reads as coverage
 * being dropped:
 *
 *   · "the content column resolves to 500, and 660 on Plan & billing only" — the per-section width
 *     is gone; one 760px column for every section (`settingsMode.measure.ts`).
 *   · "the rail sticks to the top of the plane" / "below 900px the rail sits ABOVE the content" —
 *     the rail is not on this page at all. It is a layer in the SHELL's 224px panel slot, and its
 *     claims are measured there.
 *   · "the band's fill is clipped by the frame" — there is no band. `SectionCard`'s sage header and
 *     `MountPanel`'s inner clipping frame are both retired; a flat card has nothing to clip.
 *   · every `accountLayout` case — the account header, its plate, its facts strip, the two-column
 *     body, the section-card floor, the rail column's depth, the aside, and the three illustration
 *     slots. All retired.
 *
 * ⚠️ TWO OF THOSE CLAIMS HAVE STRONGER SUCCESSORS RATHER THAN NONE. "Identity appears ONCE" is now
 * swept across all seven sections by route, instead of being checked as header-versus-card on one.
 * And the two illustration-overlap cases are superseded by "no illustration exists in the settings
 * scope at all" — the fault made impossible rather than proved absent, which is the house
 * preference and is why those cases have nothing left to find.
 *
 * ⚠️ WHAT SURVIVES IS THE ONE CLAIM THE REBUILD DID NOT TOUCH, and it is not readable from CSS: the
 * page must not scroll in two places. That is the product of a flex chain running through StagePage,
 * the stage and two of this page's own boxes; a rule saying `overflow-y: auto` proves a declaration
 * exists, not that the box it names is the one that moves.
 *
 *   npm run build:dev && npx vite preview --port 4199 --host 127.0.0.1 &
 *   SA_E2E_BASE_URL=http://127.0.0.1:4199 npx playwright test accountChassis
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const box = (page: import("@playwright/test").Page, sel: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top),
      scrollH: el.scrollHeight, clientH: el.clientHeight,
      overflowY: cs.overflowY, position: cs.position,
    };
  }, sel);

test("the plane is the only scroll region — the page itself does not move", async ({ page }) => {
  await openRoute(page, "/account/data", { width: 1440, height: 900 });

  const plane = await box(page, ".acct-plane");
  const pageBox = await box(page, ".acct-page");
  expect(plane, ".acct-plane must exist").not.toBeNull();

  /* The page box must not itself overflow: its scrollHeight and clientHeight agree, so there is
     nothing for it to scroll. The plane is allowed to overflow — that is its job. */
  const stageScroll = await page.evaluate(() => {
    const st = document.getElementById("app-stage-scroll");
    return st ? { scrollH: st.scrollHeight, clientH: st.clientHeight, max: st.scrollHeight - st.clientHeight } : null;
  });
  console.log("page   ", JSON.stringify(pageBox));
  console.log("plane  ", JSON.stringify(plane));
  console.log("stage  ", JSON.stringify(stageScroll));

  expect(plane!.overflowY).toBe("auto");
  expect(pageBox!.scrollH - pageBox!.clientH, "the page box must have no scroll of its own").toBeLessThanOrEqual(1);
  expect(stageScroll!.max, "the stage must not scroll — the plane absorbs it").toBeLessThanOrEqual(1);

  /* And the plane must genuinely be scrollable on the tallest section, or the assertion above is
     satisfied by a page with nothing in it. */
  expect(plane!.scrollH, "Your data must overflow the plane").toBeGreaterThan(plane!.clientH);
});
