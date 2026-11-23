/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 — THE BUILD'S SHOTS of the reference's 42 screens (design-refs/record-a-response-v2/screens), at
 * 1440 × 900 and 2x, written to reports/record-a-response-v2/after/<the reference's own file name>.png for
 * tests/e2e/rar2compare.mjs. Panel screens are the panel; "whole-page" screens are the window.
 *
 * ⚠️ EVERY RECORD IS UNDONE IN THE SAME RUN, before anything navigates (the recorded screen's own Undo).
 * ⚠️ "Something else" as a reply (screens 37, 38) is not built (it needs a ruling): those two are not captured, and the
 *    sheet says so.
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/recordResponse2.shots.measure.ts --project=measure`.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const OUT = "reports/record-a-response-v2/after";
const VP = { width: 1440, height: 900 };
test.use({ deviceScaleFactor: 2 });
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const R = (k: string) => `[data-rar="root"] [data-rar="${k}"]`;
const shot = async (page: Page, name: string) => {
  mkdirSync(OUT, { recursive: true });
  await settle(page, 650);
  await page.locator('[data-rar="panel"]').screenshot({ path: `${OUT}/${name}.png`, animations: "disabled" });
};
const whole = async (page: Page, name: string) => { mkdirSync(OUT, { recursive: true }); await settle(page, 650); await page.screenshot({ path: `${OUT}/${name}.png`, animations: "disabled" }); };
const taken: string[] = [];
const done = (n: string) => taken.push(n);

async function openFromDashboard(page: Page) {
  await openApp(page, "/dashboard", VP);
  await page.locator("[data-d2='record']").filter({ visible: true }).first().click();
  await page.locator('[data-rar="root"]').waitFor({ timeout: 10_000 });
  await settle(page);
}
/** pick a query by its status on "Who replied?" (the first waiting one at that status) */
async function pickStatus(page: Page, status: string): Promise<string> {
  const row = page.locator(`${R("who-row")}[data-status="${status}"]`).first();
  await row.waitFor({ timeout: 10_000 });
  const id = (await row.getAttribute("data-id")) ?? "";
  await row.click(); await settle(page);
  return id;
}
const kind = (page: Page, k: string) => page.locator(`${R("kind")}[data-k="${k}"]`).click();
const today = (page: Page) => page.locator(`${R("when-opt")}[data-k="today"]`).click();
const click = (page: Page, k: string) => page.locator(R(k)).first().click();
async function recordThenUndo(page: Page, name: string) {
  await click(page, "record");
  await page.locator('[data-rar="root"][data-step="done"]').waitFor({ timeout: 15_000 });
  await shot(page, name); done(name);
  await click(page, "undo");
  await page.locator('[data-rar="root"][data-step="check"]').waitFor({ timeout: 15_000 });
  await settle(page, 800);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(VP);
  page.on("console", (m) => { if (m.type() === "error" && /record a response|FirebaseError|permission/i.test(m.text())) console.log(`[page error] ${m.text().slice(0, 400)}`); });
});

test("S1 · who, reply, when, a partial not yet sent", async ({ page }) => {
  await openFromDashboard(page);
  /* Phase 6 — the head: the Archivist's head at 48px, clipped to a circle, no ring; the head and the track one navy block
     (no hairline between them: the track sits inside the head's own painted element) */
  const head = await page.evaluate(() => {
    const img = document.querySelector<HTMLImageElement>('[data-rar="art"]')!;
    const cs = getComputedStyle(img), top = img.closest(".laq-top")!;
    return { src: img.getAttribute("src"), w: Math.round(img.getBoundingClientRect().width), h: Math.round(img.getBoundingClientRect().height), loaded: img.complete && img.naturalWidth > 0,
      radius: cs.borderTopLeftRadius, ring: cs.boxShadow, trackInTop: !!top.querySelector('[data-rar="track"]'), topBg: getComputedStyle(top).backgroundColor,
      headBg: getComputedStyle(document.querySelector('[data-rar="head"]')!).backgroundColor };
  });
  mkdirSync("reports/record-a-response-v2/ledger", { recursive: true });
  (await import("node:fs")).writeFileSync("reports/record-a-response-v2/ledger/H1-head.json", JSON.stringify(head, null, 1));
  expect(head.src).toBe("/images/archivist-head.png");
  expect(head.loaded).toBe(true);
  expect([head.w, head.h]).toEqual([48, 48]);
  expect(head.radius).toBe("50%");
  expect(head.ring).toBe("none");
  expect(head.trackInTop).toBe(true);
  await whole(page, "01-whole-page-dashboard"); done("01");
  await shot(page, "02-who-replied"); done("02");
  await page.keyboard.type("Ashworth"); await settle(page);
  await shot(page, "03-who-replied-search-closed"); done("03");
  await page.keyboard.press("Escape"); await settle(page);
  await pickStatus(page, "Queried");
  await shot(page, "04-reply-from-queried"); done("04");
  await click(page, "more"); await settle(page);
  await shot(page, "05-reply-another-kind"); done("05");
  await kind(page, "pr"); await settle(page);
  await shot(page, "06-when"); done("06");
  await page.locator(`${R("when-opt")}[data-k="earlier"]`).click(); await settle(page);
  await shot(page, "07-when-calendar"); done("07");
  await today(page); await settle(page);
  await shot(page, "08-asked-partial"); done("08");
  await page.locator(`${R("tile")}[data-k="other"] > button`).click();
  await page.locator(`${R("extra")}[data-k="Author bio"]`).click(); await settle(page);
  await shot(page, "09-asked-partial-extras"); done("09");
  await click(page, "asked-go"); await settle(page);
  await shot(page, "10-sent-question"); done("10");
  await page.locator(`${R("opt-row")}[data-k="no"] > button`).click(); await settle(page);
  await shot(page, "11-sent-not-yet-slider"); done("11");
  await page.locator(`${R("slider")}[data-k="byDays"] .sa-wk-unkbtn`).click(); await settle(page);
  await shot(page, "12-sent-not-yet-no-date"); done("12");
  await click(page, "sent-go"); await settle(page);
  await shot(page, "13-review-partial-not-sent"); done("13");
  await recordThenUndo(page, "14-recorded-partial-not-sent");
});

test("S2 · a partial that has gone: reply time, what went, the review, a note", async ({ page }) => {
  await openFromDashboard(page);
  await pickStatus(page, "Queried");
  await kind(page, "pr"); await today(page); await settle(page);
  await page.locator(`${R("tile")}[data-k="syn"] > button`).click();
  await page.locator(`${R("tile")}[data-k="other"] > button`).click();
  await page.locator(`${R("extra")}[data-k="Author bio"]`).click();
  await click(page, "asked-go"); await settle(page);
  await page.locator(`${R("opt-row")}[data-k="yes"] > button`).click(); await settle(page);
  await shot(page, "15-sent-yes-reply-time-slider"); done("15");
  await page.locator(`${R("slider")}[data-k="wk"] .sa-wk-unkbtn`).click(); await settle(page);
  await shot(page, "16-sent-yes-unknown"); done("16");
  await page.locator(`${R("slider")}[data-k="wk"] .sa-wk-unkbtn`).click(); await settle(page);
  await click(page, "sent-go"); await settle(page);
  await shot(page, "17-what-went"); done("17");
  await page.locator(R("body")).evaluate((b) => { b.scrollTop = b.scrollHeight; }); await settle(page);
  await shot(page, "18-what-went-scrolled"); done("18");
  await click(page, "went-ask"); await settle(page);
  await shot(page, "19-review-partial-sent"); done("19");
  const tile = page.locator('[data-rar="preview"] button[aria-expanded]').first();
  if (await tile.count()) { await tile.hover(); await settle(page); await shot(page, "20-review-materials-tile-open"); done("20"); await page.mouse.move(10, 10); }
  await click(page, "add-note"); await settle(page, 300);
  await page.keyboard.type("Sent from the café. Check the formatting came through.");
  await page.locator('[data-rar="notes"] button:has-text("Add note")').click(); await settle(page);
  await shot(page, "21-review-with-note"); done("21");
  await recordThenUndo(page, "22-recorded-partial-sent");
});

test("S3 · a full request, its asked screen and the review", async ({ page }) => {
  await openFromDashboard(page);
  await pickStatus(page, "Queried");
  await kind(page, "fr"); await today(page); await settle(page);
  await shot(page, "31-asked-full"); done("31");
  await click(page, "asked-go"); await settle(page);
  await page.locator(`${R("opt-row")}[data-k="no"] > button`).click();
  await click(page, "sent-go"); await settle(page);
  await shot(page, "23-review-full"); done("23");
  await recordThenUndo(page, "24-recorded-full");
});

test("S4 · revise and resubmit, an offer (from a full sent)", async ({ page }) => {
  await openFromDashboard(page);
  await pickStatus(page, "Full Sent");
  await kind(page, "rr"); await today(page); await settle(page);
  await page.locator(R("words")).fill("I love the voice and the first act. The middle loses pace after the ferry, and I’d want the reason for leaving made clearer before I take it further.");
  await settle(page);
  await shot(page, "32-their-words-rr"); done("32");
  await click(page, "words-go"); await settle(page);
  await page.locator(`${R("opt-row")}[data-k="yes"] > button`).click(); await settle(page);
  await shot(page, "33-rr-will-you-revise"); done("33");
  await click(page, "next-go"); await settle(page);
  await shot(page, "25-review-revise-resubmit"); done("25");
  await recordThenUndo(page, "26-recorded-revise-resubmit");
  /* the offer, from the same query: back to the reply */
  await page.locator(`${R("step")}[data-k="reply"]`).click(); await settle(page);
  await kind(page, "of"); await settle(page);
  if (await page.locator(`${R("when-opt")}[data-k="today"]`).count()) await today(page);
  await settle(page);
  await shot(page, "34-offer-answer-slider"); done("34");
  await click(page, "by-go"); await settle(page);
  await shot(page, "35-offer-tell-others"); done("35");
  await page.locator(`${R("others")}[data-k="task"]`).click(); await settle(page);
  await shot(page, "27-review-offer"); done("27");
  await recordThenUndo(page, "28-recorded-offer");
});

test("S5 · a pass", async ({ page }) => {
  await openFromDashboard(page);
  await pickStatus(page, "Queried");
  await kind(page, "no"); await today(page); await settle(page);
  await page.locator(R("words")).fill("Thank you for letting me read this. There’s a lot to admire, but I didn’t connect with it as strongly as I’d need to.");
  await settle(page);
  await shot(page, "36-their-words-pass"); done("36");
  await click(page, "words-go"); await settle(page);
  await shot(page, "29-review-pass"); done("29");
  await recordThenUndo(page, "30-recorded-pass");
});

test("S6 · whole pages: from a card, the discard bar, closed on the same page, the top bar on Queries", async ({ page }) => {
  await openApp(page, "/queries?q=cv25-q-03", VP);
  await page.locator("[data-qp='panel']").waitFor({ timeout: 15_000 }).catch(() => {});
  await settle(page, 600);
  const b = page.locator("[data-qp='panel'] button").filter({ hasText: /^\s*(Record a response|Priya replied)\s*$/ }).filter({ visible: true }).first();
  await b.click(); await page.locator('[data-rar="root"]').waitFor({ timeout: 10_000 });
  await whole(page, "39-whole-page-from-a-card"); done("39");
  await kind(page, "pr"); await settle(page);
  await click(page, "close"); await settle(page);
  await shot(page, "40-discard-bar"); done("40");
  await click(page, "leave-discard"); await settle(page, 900);
  await whole(page, "41-closed-same-page"); done("41");
  await openApp(page, "/queries", VP);
  await page.locator("[data-shell='capture'][data-placement='bar'] .ws-capr").filter({ visible: true }).first().click(); await settle(page, 300);
  await page.locator("[data-cap='record']").filter({ visible: true }).first().click();
  await page.locator('[data-rar="root"]').waitFor({ timeout: 10_000 });
  await whole(page, "42-whole-page-top-bar-queries"); done("42");
  expect(taken.length).toBeGreaterThan(0);
});
