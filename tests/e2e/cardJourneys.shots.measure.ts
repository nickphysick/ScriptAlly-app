/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1 — THE BUILD'S SHOTS of the 39 reference screens (design-refs/card-journeys-v1/screens), named as the
 * reference names them, at 1440 × 900 and 2x: "whole-page" screens are the window, the rest are the journey's panel.
 * tests/e2e/rar21compare.mjs then sets each beside its reference with a pixel diff.
 *
 * The app's own queries stand in for the reference's people. Saves are made where a screen needs one (the finish, the
 * card after); the emulator run imports a fresh snapshot and exports nothing.
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/cardJourneys.shots.measure.ts --project=measure`.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { C, openCardWithDoor, pressDoor } from "./cardJourneysLib";
import { openApp } from "./pageHeaderV2Lib";

const OUT = "reports/card-journeys-v1/after";
const settle = (page: Page, ms = 600) => page.waitForTimeout(ms);
test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

async function whole(page: Page, name: string) { mkdirSync(OUT, { recursive: true }); await settle(page, 500); await page.screenshot({ path: `${OUT}/${name}.png` }); }
async function panel(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true }); await settle(page, 500);
  await page.locator('[data-side-panel][data-rar="panel"]').first().screenshot({ path: `${OUT}/${name}.png` });
}
const click = async (page: Page, sel: string, ms = 800) => { await page.locator(sel).first().click(); await settle(page, ms); };
const saved = (page: Page) => page.locator('[data-cj="root"][data-step="done"]').waitFor({ timeout: 45_000 }).then(() => settle(page, 900));
const reviewAgain = (page: Page) => page.locator('[data-cj="root"][data-step="log"]').waitFor({ timeout: 45_000 }).then(() => settle(page, 700));

test("shots · Mark sent", async ({ page }) => {
  test.setTimeout(300_000);
  const id = (await openCardWithDoor(page, "send", ["Partial Requested"]))!;
  await whole(page, "01-send-card-before-whole-page");
  await pressDoor(page, id, "send");
  await whole(page, "02-send-journey-over-card-whole-page");
  await panel(page, "03-send-what-went");
  await page.locator(C("body")).evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await panel(page, "04-send-what-went-scrolled");
  await click(page, C("went-ask"));
  await panel(page, "05-send-when");
  await click(page, `${C("sent-at")}[data-k="earlier"]`);
  await panel(page, "06-send-when-calendar");
  await click(page, `${C("sent-at")}[data-k="today"]`);
  await panel(page, "07-send-reply-time");
  await click(page, `${C("slider")} .sa-wk-unkbtn`, 500);
  await panel(page, "08-send-reply-time-unknown");
  await click(page, `${C("slider")} .sa-wk-unkbtn`, 500);
  await click(page, C("go"));
  await panel(page, "09-send-review");
  await click(page, C("save"), 100); await saved(page);
  await panel(page, "10-send-logged");
  await click(page, C("done-btn"), 1200);
  await whole(page, "11-send-card-after-whole-page");
});

test("shots · Close", async ({ page }) => {
  test.setTimeout(300_000);
  const id = (await openCardWithDoor(page, "close"))!;
  await whole(page, "12-close-card-before-whole-page");
  await pressDoor(page, id, "close");
  await panel(page, "13-close-why");
  await click(page, `${C("why")}[data-k="passed"]`, 1000);
  await panel(page, "14-close-hand-over-pass");
  await page.keyboard.press("Escape"); await settle(page, 400);
  await page.locator('[data-rar="leave-discard"]').click({ timeout: 2000 }).catch(() => {}); await settle(page, 900);
  await pressDoor(page, id, "close");
  await click(page, `${C("why")}[data-k="noreply"]`, 1000);
  await panel(page, "15-close-review-no-reply");
  await click(page, C("save"), 100); await saved(page);
  await panel(page, "16-close-closed-no-reply");
  await click(page, C("undo"), 100); await reviewAgain(page);
  await click(page, `${C("step")}[data-k="why"]`);
  await click(page, `${C("why")}[data-k="withdraw"]`);
  await panel(page, "18-close-when-withdrawn");
  await click(page, `${C("when")}[data-k="today"]`, 1000);
  await panel(page, "19-close-review-withdrawn");
  await click(page, C("save"), 100); await saved(page);
  await panel(page, "20-close-closed-withdrawn");
  await click(page, C("done-btn"), 1200);
  await whole(page, "17-close-card-after-whole-page");
});

test("shots · Answer an offer", async ({ page }) => {
  test.setTimeout(300_000);
  const id = (await openCardWithDoor(page, "offer"))!;
  await whole(page, "21-offer-card-before-whole-page");
  await pressDoor(page, id, "offer");
  await panel(page, "22-offer-answer");
  await click(page, `${C("answer")}[data-k="yes"]`);
  await panel(page, "23-offer-when");
  await click(page, `${C("when")}[data-k="today"]`);
  await panel(page, "24-offer-others");
  await click(page, `${C("others")}[data-k="task"]`, 1000);
  await panel(page, "25-offer-review-accepted");
  await click(page, C("save"), 100); await saved(page);
  await panel(page, "26-offer-signed");
  await click(page, C("undo"), 100); await reviewAgain(page);
  await click(page, `${C("step")}[data-k="answer"]`);
  /* the When step is still answered: the journey goes straight back to the review */
  await click(page, `${C("answer")}[data-k="no"]`, 1000);
  await panel(page, "28-offer-review-declined");
  await click(page, C("save"), 100); await saved(page);
  await panel(page, "29-offer-declined");
  await click(page, C("undo"), 100); await reviewAgain(page);
  await click(page, `${C("step")}[data-k="answer"]`);
  await click(page, `${C("answer")}[data-k="yes"]`);
  await click(page, `${C("others")}[data-k="task"]`, 1000);
  await click(page, C("save"), 100); await saved(page);
  await click(page, C("done-btn"), 1200);
  await whole(page, "27-offer-card-after-accepted-whole-page");
});

test("shots · Reopen", async ({ page }) => {
  test.setTimeout(300_000);
  const id = (await openCardWithDoor(page, "reopen"))!;
  await whole(page, "30-reopen-card-before-whole-page");
  await pressDoor(page, id, "reopen");
  await panel(page, "31-reopen-why");
  await click(page, `${C("why")}[data-k="replied"]`, 1000);
  await panel(page, "32-reopen-hand-over-reply");
  await page.keyboard.press("Escape"); await settle(page, 400);
  await page.locator('[data-rar="leave-discard"]').click({ timeout: 2000 }).catch(() => {}); await settle(page, 900);
  await pressDoor(page, id, "reopen");
  await click(page, `${C("why")}[data-k="soon"]`);
  await panel(page, "33-reopen-nudge");
  await click(page, `${C("slider")} .sa-wk-unkbtn`, 500);
  await panel(page, "34-reopen-nudge-no-reminder");
  await click(page, `${C("slider")} .sa-wk-unkbtn`, 500);
  await click(page, C("go"), 1000);
  await panel(page, "35-reopen-review");
  await click(page, C("save"), 100); await saved(page);
  await panel(page, "36-reopen-reopened");
  await click(page, C("done-btn"), 1200);
  await whole(page, "37-reopen-card-after-whole-page");
});

test("shots · from the Dashboard, and the discard bar", async ({ page }) => {
  test.setTimeout(240_000);
  await openApp(page, "/dashboard", { width: 1440, height: 900 });
  await page.locator('[data-d2="next-top"] [data-d2="open-task"], [data-d2="next-top"] [data-d2="open-task-alt"]').filter({ visible: true }).first().click();
  await settle(page, 1200);
  await whole(page, "38-send-from-dashboard-whole-page");
  await page.keyboard.press("Escape"); await settle(page, 800);
  const id = (await openCardWithDoor(page, "close"))!;
  await pressDoor(page, id, "close");
  await click(page, `${C("why")}[data-k="withdraw"]`);
  await page.keyboard.press("Escape"); await settle(page, 700);
  await panel(page, "39-discard-bar");
});
