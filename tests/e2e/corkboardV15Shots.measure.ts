/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corkboard v15 — the report's screenshots, at 1280 × 800 and 1512 × 982, beside the ref's screens
 * (design-refs/corkboard-v15/screens/). Pictures, not locks: the locks are corkboardV15.measure.ts. Every pop-up is
 * closed with Cancel or Escape; nothing here writes except the fixtures.
 *
 *   npm run e2e:emu -- tests/e2e/corkboardV15Shots.measure.ts --project=measure
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DIR, N, PREFIX, SIZES, act, desk, note, only, open as open0, seeder, settle, waitNotes } from "./cb15Lib";

const OUT = `${DIR}/shots`;
const SNAP = `${DIR}/prefs-snap-shots.json`;
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(OUT, { recursive: true }); seeder("snap", SNAP); });
test.afterAll(() => { seeder("clean"); seeder("restore", SNAP); });

/* every open waits for the seeded count: the app's persistent cache can paint the previous fixture for a moment */
let expect = 14;
const open = async (page: Page, vp: { width: number; height: number }) => { await open0(page, vp); await waitNotes(page, expect); };
const seed = (set: "everyday" | "few" | "none" | "busy") => { seeder(set); expect = { everyday: 14, few: 3, none: 0, busy: 60 }[set]; };
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${OUT}/${name}-${w}.png` });
const scrollTo = async (page: Page, sel: string) => {
  await page.evaluate((s) => {
    const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
    el?.scrollIntoView({ block: "start" });
  }, sel);
  await settle(page, 500);
};
const esc = async (page: Page) => { await page.keyboard.press("Escape"); await settle(page, 400); };

test("shots", async ({ page }) => {
  test.setTimeout(600_000);
  await only(page);
  for (const vp of SIZES) {
    const w = vp.width;
    seed("everyday");
    await open(page, vp);
    await shot(page, "01-everyday", w);
    await note(page, N(1)).hover();
    await shot(page, "02-hover-actions", w);
    await note(page, N(1)).locator('[data-act="more"]').click();
    await settle(page, 300);
    await shot(page, "03-more-menu", w);
    await esc(page);
    await note(page, N(1)).hover();
    await note(page, N(1)).locator('[data-act="colour"]').click();
    await settle(page, 300);
    await shot(page, "04-change-colour", w);
    await esc(page);
    await act(page, N(9), "task");
    await settle(page, 400);
    await shot(page, "05-turn-into-a-task", w);
    await esc(page);
    await page.locator('.cb15 [data-wsnh="header"]:visible [data-cb2="add-task"]').first().click();
    await settle(page, 400);
    await shot(page, "06-add-a-task", w);
    await esc(page);
    await page.locator('.cb15 [data-wsnh="header"]:visible [data-cb2="new-note"]').first().click();
    await settle(page, 300);
    await page.locator('.cb15-dlg [data-cb15="add-link"]').click();
    await settle(page, 300);
    await shot(page, "07-new-note-link-finder", w);
    await esc(page); await esc(page);
    await note(page, N(1)).click({ position: { x: 40, y: 60 } });
    await settle(page, 400);
    await shot(page, "09-your-note-edit", w);
    await esc(page);
    await page.locator('.cb15 [data-wsnh-page="corkboard"]:visible [data-fig="onTodo"]').click();
    await settle(page, 900);
    await shot(page, "10-figure-filter-to-do", w);
    await page.locator('.cb15 [data-wsnh-page="corkboard"]:visible [data-fig="onTodo"]').click();
    await settle(page, 600);
    await scrollTo(page, '.cb15 [data-cb15="about-head"]');
    await shot(page, "11a-who-your-notes-are-about", w);
    await desk(page).locator('[data-about="cv25-agent-06"]').click();
    await settle(page, 1200);
    await shot(page, "11-about-one-agent", w);
    await desk(page).locator('[data-about="cv25-agent-06"]').click().catch(() => desk(page).locator('[data-clear="about"]').click());
    await settle(page, 600);
    await desk(page).locator('[data-cb15="find"]').fill("letter");
    await settle(page, 500);
    await shot(page, "12-find", w);
    await desk(page).locator('[data-cb15="find"]').fill("zzqqxx");
    await settle(page, 500);
    await shot(page, "13-no-notes-match", w);
    await desk(page).locator('[data-cb15="find"]').fill("");
    await desk(page).locator('[data-cb15="new-stack"]').click();
    await settle(page, 400);
    await shot(page, "14-start-a-stack", w);
    await esc(page);
    await scrollTo(page, '.cb15 [data-cb15="sec-rest"]');
    await shot(page, "19-everyday-wall", w);
    seeder("started", "ideas");
    await open(page, vp);
    await desk(page).locator('[data-view="piles"]').click();
    await settle(page, 900);
    await shot(page, "15-stacks", w);
    await desk(page).locator(`.cb15-pile[data-open="${PREFIX}tag-agents"]`).click();
    await settle(page, 900);
    await shot(page, "16-stack-open", w);
    await desk(page).locator('[data-cb15="all-stacks"]').click();
    await settle(page, 600);
    await desk(page).locator(`.cb15-pile[data-open="${PREFIX}tag-ideas"]`).click();
    await settle(page, 900);
    await shot(page, "16b-empty-stack", w);
    seed("few");
    await open(page, vp);
    await shot(page, "17-just-started", w);
    await scrollTo(page, '.cb15 [data-cb15="how-head"]');
    await shot(page, "17b-just-started-how", w);
    seed("none");
    await open(page, vp);
    await shot(page, "18-day-one", w);
    seed("busy");
    await open(page, vp);
    await shot(page, "20-sixty-notes", w);
    await scrollTo(page, '.cb15 [data-cb15="sec-rest"]');
    await shot(page, "20b-sixty-notes-wall", w);
  }
});
