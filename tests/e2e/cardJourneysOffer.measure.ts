/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1, Phase 4 — ANSWER AN OFFER, on the rendered page at 1440 × 900 (design-refs/card-journeys-v1 21–29):
 *
 *   F1  "What did you tell {First}?" / "{First} offered on {date}." — I accepted, I turned it down; "When did you tell
 *       {First}?"; after I accepted, "Let the other agents know?" with "{n} of your queries are still with other agents."
 *       and two rows, never forced
 *   F2  accepted + the task: the card as it will be is Signed, the task row "Tell the other {n} agents you've signed",
 *       "Log answer"; the finish "Logged. You said yes!" / "Congratulations.", "You're signing with {First}.", the to-do
 *       sentence, stamp "Signed"; Undo restores
 *   F3  turned down: the card reads Withdrawn; "Logged." / "{n} queries still out.", "You turned {First}'s offer down.",
 *       "The query is closed. {n} queries are still with agents.", stamp "Logged"; Undo restores
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/cardJourneysOffer.measure.ts --project=measure`.
 */
import { test, type Page } from "@playwright/test";
import { C, Ledger, cutOff, openCardWithDoor, pressDoor, text, trackOf } from "./cardJourneysLib";

const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const head = (page: Page) => text(page, '[data-cj="root"] .flh-t');
async function save(page: Page) {
  await page.locator(C("save")).click();
  await page.locator('[data-cj="root"][data-step="done"]').waitFor({ timeout: 45_000 });
  await settle(page, 800);
}
async function undo(page: Page, L: Ledger, tag: string) {
  await page.locator(C("undo")).click();
  const back = await page.locator('[data-cj="root"][data-step="log"]').waitFor({ timeout: 45_000 }).then(() => true).catch(() => false);
  L.check(`${tag} · Undo brings back the review`, back, `review ${back}`);
}

test("card journeys v1 · Answer an offer: accepted, with the task", async ({ page }) => {
  test.setTimeout(240_000);
  page.on("console", (m) => { if (m.type() === "error") console.log(`  [console] ${m.text().slice(0, 300)}`); });
  const L = new Ledger("offer-accepted");
  const id = await openCardWithDoor(page, "offer");
  L.check("F1 · subject", !!id, id ?? "none");
  if (!id) { L.done(1); return; }
  await pressDoor(page, id, "offer");
  L.check("F1 · the head", /^An answer for .+\. Let’s log the details\.$/.test(await head(page)), await head(page));
  L.check("F1 · what did you tell", /^What did you tell .+\?$/.test(await text(page, C("q"))) && /^.+ offered on \d{1,2} [A-Z][a-z]{2}\.$/.test(await text(page, C("sub"))), `${await text(page, C("q"))} / ${await text(page, C("sub"))}`);
  const rows = await page.locator(C("answer")).evaluateAll((els) => els.map((e) => e.getAttribute("data-k")));
  L.check("F1 · two answers", rows.join(" ") === "yes no", rows.join(" "));
  await page.locator(`${C("answer")}[data-k="yes"]`).click(); await settle(page, 900);
  L.check("F1 · when did you tell", /^When did you tell .+\?$/.test(await text(page, C("q"))), await text(page, C("q")));
  await page.locator(`${C("when")}[data-k="today"]`).click(); await settle(page, 900);
  const others = await text(page, C("q"));
  if (others === "Let the other agents know?") {
    L.check("F1 · others", /^\d+ of your queries (is|are) still with other agents\.$/.test(await text(page, C("sub"))) && (await page.locator(C("others")).count()) === 2, await text(page, C("sub")));
    L.check("F1 · the track", (await trackOf(page)).join(" ") === "agent:done answer:done when:done others:now log:todo", (await trackOf(page)).join(" "));
    await page.locator(`${C("others")}[data-k="task"]`).click(); await settle(page, 900);
    L.check("F2 · the task row", /^Tell the other \d+ agents? you’ve signed/.test(await text(page, C("task"))), await text(page, C("task")));
  } else L.check("F1 · others not asked: no other query open", others === "Ready to log your answer?", others);
  L.check("F2 · the review", (await text(page, C("q"))) === "Ready to log your answer?", await text(page, C("q")));
  const pv = await page.locator(`${C("preview")} [data-qc154="card"]`).first().getAttribute("data-status");
  L.check("F2 · the card as it will be", pv === "Signed", `preview status ${pv}`);
  L.check("F2 · Log answer", (await text(page, C("save"))).startsWith("Log answer") && (await page.locator(C("add-note")).count()) === 1, await text(page, C("save")));
  L.check("F2 · nothing cut off at 1440 × 900", (await cutOff(page)).length === 0, JSON.stringify(await cutOff(page)));
  await save(page);
  L.check("F2 · the head", (await head(page)) === "Logged. You said yes! Congratulations.", await head(page));
  L.check("F2 · the big line", /^You’re signing with .+\.$/.test(await text(page, C("done-head"))), await text(page, C("done-head")));
  L.check("F2 · the sentence", /^(Telling the other \d+ agents? is on your to-do list for today\.|Your other \d+ quer(y is|ies are) still open\.)$/.test(await text(page, C("done-line"))), await text(page, C("done-line")));
  L.check("F2 · the stamp", (await text(page, C("stamp"))).startsWith("Signed"), await text(page, C("stamp")));
  await undo(page, L, "F2");
  L.done(14);
});

test("card journeys v1 · Answer an offer: turned down", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("offer-declined");
  const id = await openCardWithDoor(page, "offer");
  L.check("F3 · subject", !!id, id ?? "none");
  if (!id) { L.done(1); return; }
  await pressDoor(page, id, "offer");
  await page.locator(`${C("answer")}[data-k="no"]`).click(); await settle(page, 900);
  await page.locator(`${C("when")}[data-k="today"]`).click(); await settle(page, 900);
  L.check("F3 · no Others step", (await trackOf(page)).join(" ") === "agent:done answer:done when:done log:now", (await trackOf(page)).join(" "));
  const pv = await page.locator(`${C("preview")} [data-qc154="card"]`).first().getAttribute("data-status");
  L.check("F3 · the card as it will be", pv === "Withdrawn", `preview status ${pv}`);
  L.check("F3 · nothing cut off at 1440 × 900", (await cutOff(page)).length === 0, JSON.stringify(await cutOff(page)));
  await save(page);
  L.check("F3 · the head", /^Logged\. ?\d+ quer(y|ies) still out\.$/.test(await head(page)), await head(page));
  L.check("F3 · the big line", /^You turned .+’s offer down\.$/.test(await text(page, C("done-head"))), await text(page, C("done-head")));
  L.check("F3 · the sentence", /^The query is closed\. \d+ quer(y is|ies are) still with agents\.$/.test(await text(page, C("done-line"))), await text(page, C("done-line")));
  L.check("F3 · the stamp", (await text(page, C("stamp"))).startsWith("Logged"), await text(page, C("stamp")));
  await undo(page, L, "F3");
  L.done(9);
});
