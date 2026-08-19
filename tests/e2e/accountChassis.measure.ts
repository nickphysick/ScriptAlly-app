/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings chassis — MEASURED, because every claim in Phase 2 is a layout claim.
 *
 * ⚠️ "THE PAGE MUST NOT SCROLL" IS NOT READABLE FROM CSS. It is the product of a flex chain
 * running through StagePage, the stage and three of this page's own boxes; a rule saying
 * `overflow-y: auto` proves a declaration exists, not that the box it names is the one that
 * moves. Same for the 500/660 column: `minmax(0, var(--acct-col))` is a track, and what the
 * browser resolves it to is the only number worth reporting.
 *
 *   npm run build:dev && npx vite preview --port 4173 &
 *   SA_E2E_BASE_URL=http://localhost:4173 npx playwright test accountChassis
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { ACCOUNT_ROUTES } from "../../src/lib/accountRoutes";

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

test("the content column resolves to 500, and 660 on Plan & billing only", async ({ page }) => {
  const widths: Record<string, number> = {};
  for (const r of ACCOUNT_ROUTES) {
    await openRoute(page, r.path, { width: 1440, height: 900 });
    const col = await box(page, ".acct-col");
    widths[r.id] = col!.w;
  }
  console.log("\nCOLUMN WIDTHS @1440\n" + JSON.stringify(widths, null, 2));
  for (const r of ACCOUNT_ROUTES) {
    expect(widths[r.id], `${r.id} column`).toBe(r.id === "plan" ? 660 : 500);
  }
});

test("the rail sticks to the top of the plane while the content scrolls under it", async ({ page }) => {
  await openRoute(page, "/account/data", { width: 1440, height: 900 });
  const before = await box(page, ".acct-rail");
  /* ⚠️ SCROLL TO THE PLANE'S OWN MAXIMUM, NOT TO A ROUND NUMBER. An arbitrary 400 was more than
     this section has to give (it overflows by 66), so `scrollTop` clamped and the check read as
     "the plane never scrolled" on a plane that scrolls correctly — a test asserting an input the
     page cannot produce. The max is derived from the element. */
  const scrolled = await page.evaluate(() => {
    const p = document.querySelector(".acct-plane") as HTMLElement;
    p.scrollTop = p.scrollHeight;
    return { top: p.scrollTop, max: p.scrollHeight - p.clientHeight };
  });
  await page.waitForTimeout(300);
  const after = await box(page, ".acct-rail");
  console.log(`rail y before ${before!.y} · after scrollTop=${scrolled.top}/${scrolled.max} → ${after!.y} (position: ${after!.position})`);

  expect(scrolled.max, "the section must overflow, or this proves nothing").toBeGreaterThan(0);
  expect(scrolled.top, "the plane must have scrolled to its own maximum").toBe(scrolled.max);
  expect(after!.position).toBe("sticky");
  expect(Math.abs(after!.y - before!.y), "the rail must hold its place").toBeLessThanOrEqual(2);
});

test("below 900px the rail sits ABOVE the content, not beside it", async ({ page }) => {
  await openRoute(page, "/account/profile", { width: 800, height: 900 });
  const rail = await box(page, ".acct-rail");
  const col = await box(page, ".acct-col");
  console.log(`@800  rail y=${rail!.y} h=${rail!.h} · col y=${col!.y}`);

  expect(rail!.y + rail!.h, "the rail must end before the content begins").toBeLessThanOrEqual(col!.y + 1);
  expect(rail!.position, "and it must stop sticking").toBe("static");

  /* No horizontal overflow at the narrow width — the classic cost of a two-column grid that did
     not actually collapse. */
  const overflow = await page.evaluate(() => {
    const p = document.querySelector(".acct-plane") as HTMLElement;
    return p.scrollWidth - p.clientWidth;
  });
  expect(overflow, "the plane must not scroll sideways").toBeLessThanOrEqual(1);
});

test("the band's fill is clipped by the frame — it never reaches the card's outer edge", async ({ page }) => {
  await openRoute(page, "/account/preferences", { width: 1440, height: 900 });
  const geom = await page.evaluate(() => {
    const band = document.querySelector(".acct-band") as HTMLElement;
    const frame = band.parentElement as HTMLElement;
    const panel = frame.parentElement as HTMLElement;
    const b = band.getBoundingClientRect(), f = frame.getBoundingClientRect(), p = panel.getBoundingClientRect();
    return {
      bandLeft: b.left, frameLeft: f.left, panelLeft: p.left,
      rim: Math.round(f.left - p.left),
      frameOverflow: getComputedStyle(frame).overflow,
      bandRadius: getComputedStyle(band).borderTopLeftRadius,
      bandMargin: getComputedStyle(band).marginLeft,
    };
  });
  console.log(JSON.stringify(geom, null, 2));

  /* The rim is the panel's own padding; the band starts at the FRAME, inside it. */
  expect(geom.rim, "the panel's even padding is the rim").toBeGreaterThan(0);
  expect(Math.round(geom.bandLeft - geom.frameLeft), "the band starts at the frame edge").toBeLessThanOrEqual(1);
  expect(geom.frameOverflow, "the frame is the clipping context").toBe("hidden");
  /* And the band relies on that clip rather than faking it with its own radius/margin — the ref's
     `border-radius: 8px 8px 0 0; margin: 6px 6px 0` workaround. */
  expect(geom.bandRadius).toBe("0px");
  expect(geom.bandMargin).toBe("0px");
});
